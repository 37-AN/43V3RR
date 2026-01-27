import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { AISummary, AnalysisResult, MarketType, GroundingSource } from '../models';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private readonly MODEL_NAME = 'gemini-2.5-flash';

  constructor() {
    this.initClient();
  }

  private initClient() {
    try {
      // Access API Key from process.env as per Applet environment requirements
      const apiKey = process.env['API_KEY'];

      if (apiKey) {
        this.ai = new GoogleGenAI({ apiKey });
      } else {
        console.warn('Gemini API Key missing. Falling back to heuristic analysis.');
      }
    } catch (e) {
      console.warn('Error initializing Gemini Client', e);
    }
  }

  isAvailable(): boolean {
    return !!this.ai;
  }

  private getDateContext() {
    const now = new Date();
    const day = now.getDay();
    // Calculate start of week (Monday) and end of week (Sunday)
    const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1); 
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diffToMon);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return {
      today: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      weekRange: `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    };
  }

  async generateHybridAnalysis(
    symbol: string, 
    assetName: string,
    type: MarketType, 
    timeframe: string, 
    currentPrice: number, 
    technical: AnalysisResult,
    heuristicSummary: AISummary
  ): Promise<AISummary> {
    if (!this.ai) return heuristicSummary;

    const dateCtx = this.getDateContext();
    
    // Improve Search Terms: Remove (...) from name, e.g., "Bitcoin (USDT)" -> "Bitcoin"
    const queryName = assetName.includes('(') ? assetName.split('(')[0].trim() : assetName;
    const searchTerm = type === 'CRYPTO' ? queryName : symbol; // Crypto news is better by name, Forex by Pair
    
    // Tailor search instructions with specific dates for better Grounding
    const searchInstructions = type === 'CRYPTO'
      ? `Search for: "${searchTerm} price news ${dateCtx.today}", "crypto market sentiment this week", "${searchTerm} major token unlocks", "latest ${searchTerm} protocol updates".`
      : `Search for: "${searchTerm} forex news ${dateCtx.today}", "economic calendar high impact events ${dateCtx.weekRange}", "central bank rate decisions", "${searchTerm} geopolitical analysis".`;

    const prompt = `
      You are an expert financial analyst. The current date is ${dateCtx.today}.
      Perform a comprehensive analysis (RAG) for the asset ${assetName} (${symbol}).

      CONTEXT - TECHNICAL ANALYSIS (Calculated Locally):
      - Trend: ${technical.trend}
      - Ichimoku Cloud: ${technical.ichimokuState}
      - Stochastic Oscillator: ${technical.stochSignal}
      - RSI: ${technical.rsiState}
      - MACD: ${technical.macdSignal}
      - Bollinger Bands: ${technical.bbState}
      - Current Price: ${currentPrice}
      - Timeframe: ${timeframe}

      TASK:
      1. **Execute Google Search**: ${searchInstructions}
      2. **Synthesize**: Combine the technical signals with the retrieved fundamental news and calendar events.
      3. **Analyze Confluence**: 
         - Does the news justify the technical levels (e.g. Overbought Stochastics)?
         - Are upcoming events (CPI, NFP, Upgrades) likely to invalidate the current Trend?
      4. **Output**: Generate a strictly formatted JSON object with the fields below.

      JSON SCHEMA:
      {
         "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
         "confidence": number (0-100),
         "narrative": "A concise paragraph integrating technicals (specifically citing Ichimoku/Stoch) and retrieved news.",
         "newsHighlights": [ { "title": "Headline", "source": "Source Name" } ] (Max 3),
         "upcomingEvents": [ { "event": "Event Name", "impact": "HIGH"|"MEDIUM"|"LOW", "time": "Day/Time" } ] (Max 3, focus on events in ${dateCtx.weekRange}),
         "idea": { "type": "LONG"|"SHORT"|"WAIT", "invalidatedIf": "Short condition", "note": "Short rationale" }
      }

      IMPORTANT:
      - Return ONLY the JSON object. 
      - Ensure 'impact' in upcomingEvents is strictly one of: HIGH, MEDIUM, LOW.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: this.MODEL_NAME,
        contents: prompt,
        config: {
          temperature: 0.2,
          tools: [{ googleSearch: {} }] // Enable Grounding/RAG
        }
      });

      const text = response.text || '';
      
      // Robust JSON extraction
      let cleanJson = text;
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');
      
      if (startIndex !== -1 && endIndex !== -1) {
        cleanJson = text.substring(startIndex, endIndex + 1);
      } else {
         console.warn('Gemini response might not be JSON:', text);
      }
      
      let parsed: any;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        console.error('Failed to parse Gemini JSON', text);
        return heuristicSummary;
      }

      // Extract Grounding Metadata (Sources)
      const sources: GroundingSource[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) {
            sources.push({
              title: chunk.web.title,
              url: chunk.web.uri
            });
          }
        });
      }

      // Merge Gemini result with strict types
      return {
        bias: ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.bias) ? parsed.bias : heuristicSummary.bias,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : heuristicSummary.confidence,
        narrative: parsed.narrative || heuristicSummary.narrative,
        newsHighlights: Array.isArray(parsed.newsHighlights) ? parsed.newsHighlights : [],
        upcomingEvents: Array.isArray(parsed.upcomingEvents) ? parsed.upcomingEvents : [],
        sources: sources.slice(0, 5), // Limit sources
        idea: {
          type: ['LONG', 'SHORT', 'WAIT'].includes(parsed.idea?.type) ? parsed.idea.type : heuristicSummary.idea.type,
          invalidatedIf: parsed.idea?.invalidatedIf || heuristicSummary.idea.invalidatedIf,
          note: parsed.idea?.note || heuristicSummary.idea.note
        }
      };

    } catch (err) {
      console.error('Gemini RAG Error', err);
      // Fallback gracefully
      return heuristicSummary;
    }
  }
}