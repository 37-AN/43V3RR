import { Injectable, inject } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { LoggingService } from './logging.service';

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  private ai: GoogleGenAI;
  private logging = inject(LoggingService);

  constructor() {
    // NOTE: In a real app, we would handle the key more securely or prompt for it if missing.
    // For this environment, we assume process.env.API_KEY is available.
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] || '' });
  }

  async generateSimulation(prompt: string, systemInstruction: string, mimeType: string = 'text/plain', images: string[] = []): Promise<string> {
    const start = Date.now();
    const model = 'gemini-2.5-flash';
    
    // Create consistent hash for auditing
    const combinedContent = `${systemInstruction} || ${prompt}`;
    const promptHash = this.logging.hashString(combinedContent);
    const contextSize = combinedContent.length;

    try {
      const parts: any[] = [];
      
      // Process images if available
      if (images && images.length > 0) {
        images.forEach(imgDataUrl => {
          // Expecting Data URL: data:image/png;base64,....
          const matches = imgDataUrl.match(/^data:(.+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const data = matches[2];
            parts.push({ 
              inlineData: { 
                mimeType: mimeType, 
                data: data 
              } 
            });
          }
        });
      }

      // Add text prompt
      parts.push({ text: prompt });

      const response = await this.ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3, // Low temp for technical simulation
          maxOutputTokens: 1000,
          responseMimeType: mimeType
        }
      });

      const latency = Date.now() - start;
      const text = response.text || '';

      // Estimate tokens if metadata is missing (common in some simulated environments or mocks)
      // Standard estimation: ~4 chars per token
      const inputTokens = response.usageMetadata?.promptTokenCount ?? Math.ceil(contextSize / 4);
      const outputTokens = response.usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4);

      this.logging.logInteraction({
        promptHash,
        model,
        latencyMs: latency,
        inputTokens,
        outputTokens,
        status: 'SUCCESS',
        contextSize
      });

      return text || 'No response generated.';
    } catch (error) {
      const latency = Date.now() - start;
      this.logging.logInteraction({
        promptHash,
        model,
        latencyMs: latency,
        inputTokens: Math.ceil(contextSize / 4),
        outputTokens: 0,
        status: 'ERROR',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.error('LLM Error:', error);
      return `Error generating simulation: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  async analyzePrompt(userPrompt: string): Promise<string> {
     return this.generateSimulation(
       `Analyze this prompt for potential hallucinations and strictness issues: \n\n"${userPrompt}"`,
       "You are an AI Prompt Engineer expert. Analyze the given prompt and suggest improvements for strict JSON output and hallucination prevention.",
       "text/plain"
     );
  }
}