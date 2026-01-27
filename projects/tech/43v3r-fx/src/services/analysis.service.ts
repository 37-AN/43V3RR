import { Injectable } from '@angular/core';
import { OHLCV, AnalysisResult, AISummary, BacktestResult, BollingerBands, IchimokuCloud, IndicatorConfig } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  constructor() {}

  // --- Basic Helpers ---
  
  private getSMA(data: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
        continue;
      }
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private getStandardDeviation(data: number[], period: number, sma: number[]): number[] {
    const stdDev: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        stdDev.push(NaN);
        continue;
      }
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const sumSqDiff = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
      stdDev.push(Math.sqrt(sumSqDiff / period));
    }
    return stdDev;
  }

  // --- Advanced Indicators ---

  calculateBollingerBands(data: OHLCV[], period: number = 20, multiplier: number = 2): BollingerBands {
    const closes = data.map(d => d.close);
    const middle = this.getSMA(closes, period);
    const stdDev = this.getStandardDeviation(closes, period, middle as number[]); // Cast as it matches index

    const upper = middle.map((m, i) => isNaN(m) ? null : m + multiplier * stdDev[i]);
    const lower = middle.map((m, i) => isNaN(m) ? null : m - multiplier * stdDev[i]);

    return { 
      upper, 
      middle: middle.map(v => isNaN(v) ? null : v), 
      lower 
    };
  }

  calculateStochastic(data: OHLCV[], kPeriod: number = 14, dPeriod: number = 3): { k: number[], d: number[] } {
    const kLine: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < kPeriod - 1) {
        kLine.push(NaN);
        continue;
      }
      const slice = data.slice(i - kPeriod + 1, i + 1);
      const low = Math.min(...slice.map(d => d.low));
      const high = Math.max(...slice.map(d => d.high));
      const close = data[i].close;

      const k = ((close - low) / (high - low)) * 100;
      kLine.push(k);
    }

    // SMA of K for %D
    const dLine = this.calculateEMAFromValues(kLine, dPeriod); 
    
    return { k: kLine, d: dLine };
  }

  calculateIchimoku(data: OHLCV[], tenkanPeriod: number = 9, kijunPeriod: number = 26, senkouBPeriod: number = 52): IchimokuCloud {
    const high = (d: OHLCV[]) => Math.max(...d.map(x => x.high));
    const low = (d: OHLCV[]) => Math.min(...d.map(x => x.low));
    const avg = (d: OHLCV[]) => (high(d) + low(d)) / 2;
    
    // Displacement typically matches Kijun period
    const displacement = kijunPeriod; 

    const tenkan: (number|null)[] = [];
    const kijun: (number|null)[] = [];
    const senkouA: (number|null)[] = [];
    const senkouB: (number|null)[] = [];
    const chikou: (number|null)[] = [];

    // Pre-fill chikou with displacement
    for(let i=0; i<data.length; i++) {
        // Chikou is close plotted backwards
        if (i < data.length - displacement) {
            chikou[i] = data[i + displacement].close;
        } else {
            chikou[i] = null;
        }

        if (i < senkouBPeriod) {
            tenkan.push(i >= tenkanPeriod-1 ? avg(data.slice(i-tenkanPeriod+1, i+1)) : null);
            kijun.push(i >= kijunPeriod-1 ? avg(data.slice(i-kijunPeriod+1, i+1)) : null);
            senkouA.push(null);
            senkouB.push(null);
            continue;
        }

        const t = avg(data.slice(i-tenkanPeriod+1, i+1));
        const k = avg(data.slice(i-kijunPeriod+1, i+1));
        const sB = avg(data.slice(i-senkouBPeriod+1, i+1));

        tenkan.push(t);
        kijun.push(k);
        
        // Projected into future.
        // For simple visualization without forward-padding the chart array, 
        // we map the cloud calculated 'displacement' periods ago to TODAY.
        
        // Value for TODAY'S cloud was calculated 'displacement' bars ago
        const prevT = tenkan[i - displacement] || 0;
        const prevK = kijun[i - displacement] || 0;
        const cloudA = (prevT + prevK) / 2;
        
        // Value for Senkou B today is based on SenkouB-period high/low from 'displacement' bars ago
        // Re-calc specific slice from past
        const pastSlice = data.slice(i - displacement - senkouBPeriod + 1, i - displacement + 1);
        const cloudB = avg(pastSlice);

        senkouA.push(cloudA || null);
        senkouB.push(cloudB || null);
    }
    
    return { tenkan, kijun, senkouA, senkouB, chikou };
  }

  // --- Existing Logic Updated ---

  calculateSMA(data: OHLCV[], period: number): number[] {
    const closes = data.map(d => d.close);
    return this.getSMA(closes, period);
  }

  calculateRSI(data: OHLCV[], period: number = 14): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for(let i=0; i<period; i++) rsi.push(NaN);
    rsi.push(100 - (100 / (1 + avgGain / (avgLoss || 0.001))));

    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      const rs = avgGain / (avgLoss || 0.001);
      rsi.push(100 - (100 / (1 + rs)));
    }
    return rsi;
  }

  calculateMACD(data: OHLCV[]): { macdLine: number[], signalLine: number[], histogram: number[] } {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = this.calculateEMAFromValues(macdLine, 9);
    const histogram = macdLine.map((v, i) => v - signalLine[i]);
    return { macdLine, signalLine, histogram };
  }

  private calculateEMA(data: OHLCV[], period: number): number[] {
    const k = 2 / (period + 1);
    const emaArray: number[] = [data[0].close];
    for (let i = 1; i < data.length; i++) {
      emaArray.push(data[i].close * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
  }

  private calculateEMAFromValues(values: number[], period: number): number[] {
    const k = 2 / (period + 1);
    let startIdx = 0;
    while(isNaN(values[startIdx]) && startIdx < values.length) startIdx++;
    const emaArray: number[] = new Array(startIdx).fill(NaN);
    if (startIdx < values.length) emaArray.push(values[startIdx]);
    for (let i = startIdx + 1; i < values.length; i++) {
      const val = values[i];
      const prev = emaArray[i - 1];
      if (isNaN(val)) emaArray.push(NaN);
      else emaArray.push(val * k + prev * (1 - k));
    }
    return emaArray;
  }

  // --- Main Analysis Engine ---

  analyze(data: OHLCV[], config?: IndicatorConfig): { result: AnalysisResult, summary: AISummary } {
    const close = data[data.length - 1].close;
    const sma50 = this.calculateSMA(data, 50);
    const sma200 = this.calculateSMA(data, 200);
    
    // Config Values or Defaults
    const bbPeriod = config ? config.bbPeriod : 20;
    const bbStdDev = config ? config.bbStdDev : 2;
    const stochK = config ? config.stochK : 14;
    const stochD = config ? config.stochD : 3;
    const tenkan = config ? config.ichiTenkan : 9;
    const kijun = config ? config.ichiKijun : 26;
    const senkouB = config ? config.ichiSenkouB : 52;
    const rsiPeriod = config ? config.rsiPeriod : 14;

    const rsi = this.calculateRSI(data, rsiPeriod);
    const macd = this.calculateMACD(data);

    const bb = this.calculateBollingerBands(data, bbPeriod, bbStdDev);
    const stoch = this.calculateStochastic(data, stochK, stochD);
    const ichimoku = this.calculateIchimoku(data, tenkan, kijun, senkouB);

    const lastRSI = rsi[rsi.length - 1];
    
    // Trend
    let trend: AnalysisResult['trend'] = 'RANGING';
    const s50 = sma50[sma50.length - 1];
    const s200 = sma200[sma200.length - 1];
    if (close > s50 && s50 > s200) trend = 'UPTREND';
    else if (close < s50 && s50 < s200) trend = 'DOWNTREND';

    // Bollinger State
    let bbState: AnalysisResult['bbState'] = 'NORMAL';
    const up = bb.upper[bb.upper.length-1] || 0;
    const low = bb.lower[bb.lower.length-1] || 0;
    if (close > up) bbState = 'BREAKOUT_UP';
    else if (close < low) bbState = 'BREAKOUT_DOWN';
    else if ((up - low) / close < 0.01) bbState = 'SQUEEZE'; // Very tight bands

    // Stoch Signal
    let stochSignal: AnalysisResult['stochSignal'] = 'NEUTRAL';
    const k = stoch.k[stoch.k.length-1];
    const d = stoch.d[stoch.d.length-1];
    if (k > 80 && d > 80) stochSignal = 'OVERBOUGHT';
    if (k < 20 && d < 20) stochSignal = 'OVERSOLD';

    // Ichimoku State (Simplified: Price vs Cloud)
    let ichimokuState: AnalysisResult['ichimokuState'] = 'NEUTRAL';
    const sA = ichimoku.senkouA[ichimoku.senkouA.length-1] || 0;
    const sB = ichimoku.senkouB[ichimoku.senkouB.length-1] || 0;
    // Price above Cloud = Bullish
    if (close > sA && close > sB) ichimokuState = 'BULLISH';
    // Price below Cloud = Bearish
    if (close < sA && close < sB) ichimokuState = 'BEARISH';

    // Existing Logic
    let rsiState: AnalysisResult['rsiState'] = 'NEUTRAL';
    if (lastRSI > 70) rsiState = 'OVERBOUGHT';
    if (lastRSI < 30) rsiState = 'OVERSOLD';

    let macdSignal: AnalysisResult['macdSignal'] = 'NEUTRAL';
    const lastHist = macd.histogram[macd.histogram.length - 1];
    const prevHist = macd.histogram[macd.histogram.length - 2];
    if (prevHist < 0 && lastHist > 0) macdSignal = 'BULLISH';
    if (prevHist > 0 && lastHist < 0) macdSignal = 'BEARISH';

    const recentRanges = data.slice(-10).map(c => c.high - c.low);
    const avgRange = recentRanges.reduce((a,b) => a+b, 0) / 10;
    const volatility = avgRange / close > 0.02 ? 'HIGH' : avgRange / close < 0.005 ? 'LOW' : 'MEDIUM';

    const changePct = (close - data[data.length - 2].close) / data[data.length - 2].close;
    let recentMove = Math.abs(changePct) < 0.001 ? 'choppy' : changePct > 0 ? 'rally' : 'selloff';

    const analysis: AnalysisResult = {
      trend,
      rsiState,
      macdSignal,
      bbState,
      stochSignal,
      ichimokuState,
      volatility,
      recentMove
    };

    const summary = this.generateNarrative(analysis, close, s50, s200);

    return { result: analysis, summary };
  }

  private generateNarrative(analysis: AnalysisResult, price: number, sma50: number, sma200: number): AISummary {
    let bias: AISummary['bias'] = 'NEUTRAL';
    const narrativeParts: string[] = [];
    let score = 0;

    // --- Scoring Logic ---
    
    // 1. Trend Structure (Base)
    if (analysis.trend === 'UPTREND') score += 2;
    else if (analysis.trend === 'DOWNTREND') score -= 2;

    // 2. Ichimoku Cloud (Major Support/Resistance) - Heavy Weight
    if (analysis.ichimokuState === 'BULLISH') score += 3;
    else if (analysis.ichimokuState === 'BEARISH') score -= 3;

    // 3. Stochastic (Timing) - Confluence Context
    let stochScore = 0;
    if (analysis.stochSignal === 'OVERSOLD') {
      if (analysis.trend === 'UPTREND' || analysis.ichimokuState === 'BULLISH') {
        stochScore = 3; // Strong 'buy the dip' in uptrend
        narrativeParts.push("Stochastics are oversold while in a bullish structure, signaling a high-probability entry.");
      } else {
        stochScore = 1; // Potential counter-trend bounce
        narrativeParts.push("Stochastics are oversold, suggesting a potential relief bounce against the trend.");
      }
    } else if (analysis.stochSignal === 'OVERBOUGHT') {
      if (analysis.trend === 'DOWNTREND' || analysis.ichimokuState === 'BEARISH') {
        stochScore = -3; // Strong continuation short
        narrativeParts.push("Stochastics are overbought while in a bearish structure, signaling a high-probability short entry.");
      } else {
        stochScore = -1; // Potential counter-trend pullback
        narrativeParts.push("Stochastics are overbought, suggesting momentum is overextended and a pullback is likely.");
      }
    }
    score += stochScore;

    // 4. Confluence & Divergence Analysis for Narrative
    const trendBullish = analysis.trend === 'UPTREND';
    const cloudBullish = analysis.ichimokuState === 'BULLISH';
    const trendBearish = analysis.trend === 'DOWNTREND';
    const cloudBearish = analysis.ichimokuState === 'BEARISH';

    if (trendBullish && cloudBullish) {
      narrativeParts.push("Trend and Ichimoku Cloud are fully aligned Bullish. Focus on long entries.");
    } else if (trendBearish && cloudBearish) {
      narrativeParts.push("Trend and Ichimoku Cloud are fully aligned Bearish. Focus on short entries.");
    } else if (analysis.ichimokuState !== 'NEUTRAL' && analysis.trend !== 'RANGING' && 
              ((trendBullish && !cloudBullish) || (trendBearish && !cloudBearish))) {
       // Divergence detected
       narrativeParts.push("Conflict detected between Price Trend and Cloud structure. Volatility likely as market decides direction.");
       // Penalize score for uncertainty
       score = score > 0 ? Math.max(0, score - 2) : Math.min(0, score + 2);
    }

    // MACD (Momentum)
    if (analysis.macdSignal === 'BULLISH') score += 1;
    else if (analysis.macdSignal === 'BEARISH') score -= 1;

    // Bollinger
    if (analysis.bbState === 'BREAKOUT_UP') score += 1;
    else if (analysis.bbState === 'BREAKOUT_DOWN') score -= 1;
    if (analysis.bbState === 'SQUEEZE') narrativeParts.push("Bollinger Squeeze detected: Explosive move imminent.");

    // --- Bias & Confidence Calculation ---

    if (score >= 4) bias = 'BULLISH';
    else if (score <= -4) bias = 'BEARISH';
    else bias = 'NEUTRAL';

    // Confidence Calculation
    // Base confidence 50.
    let confidence = 50;

    // Boost confidence if Trend and Cloud agree
    if ((trendBullish && cloudBullish) || (trendBearish && cloudBearish)) {
      confidence += 20;
    }

    // Boost confidence if Stochastic supports the bias
    if (bias === 'BULLISH' && analysis.stochSignal === 'OVERSOLD') confidence += 10;
    if (bias === 'BEARISH' && analysis.stochSignal === 'OVERBOUGHT') confidence += 10;
    
    // Boost confidence if MACD supports the bias
    if (bias === 'BULLISH' && analysis.macdSignal === 'BULLISH') confidence += 5;
    if (bias === 'BEARISH' && analysis.macdSignal === 'BEARISH') confidence += 5;

    // Cap Confidence
    confidence = Math.min(Math.max(confidence, 20), 95);

    // --- Trade Idea Generation ---

    let ideaType: 'LONG' | 'SHORT' | 'WAIT' = 'WAIT';
    let note = "Signals are mixed; preserve capital.";
    let invalid = "Volatility expands against position.";

    if (bias === 'BULLISH') {
      ideaType = 'LONG';
      const trigger = analysis.stochSignal === 'OVERSOLD' ? 'oversold stochastics' : 'cloud support';
      note = `Look for entries on ${trigger} aligned with the bullish cloud structure.`;
      
      invalid = analysis.ichimokuState === 'BULLISH' 
        ? "Price closes inside/below the Cloud." 
        : `Price falls below the 50 SMA (${sma50.toFixed(2)}).`;

    } else if (bias === 'BEARISH') {
      ideaType = 'SHORT';
      const trigger = analysis.stochSignal === 'OVERBOUGHT' ? 'overbought stochastics' : 'cloud resistance';
      note = `Look for entries on ${trigger} aligned with the bearish cloud structure.`;
      
      invalid = analysis.ichimokuState === 'BEARISH' 
        ? "Price closes inside/above the Cloud." 
        : `Price rises above the 50 SMA (${sma50.toFixed(2)}).`;
    }

    const uniqueNarrative = [...new Set(narrativeParts)].join(' ');

    return {
      bias,
      confidence,
      narrative: uniqueNarrative,
      idea: {
        type: ideaType,
        invalidatedIf: invalid,
        note
      }
    };
  }

  runBacktest(data: OHLCV[]): BacktestResult {
    // Keep SMA strategy for now as it's the requested simple backtest
    const sma20 = this.calculateSMA(data, 20);
    const sma50 = this.calculateSMA(data, 50);
    
    let position = 0; 
    let equity = 10000;
    let trades = 0;
    let wins = 0;
    let entryPrice = 0;
    const curve = [];

    for (let i = 51; i < data.length; i++) {
       const price = data[i].close;
       const s20 = sma20[i-1]; 
       const s50 = sma50[i-1];
       const prevS20 = sma20[i-2];
       const prevS50 = sma50[i-2];

       if (position === 0) {
          if (prevS20 <= prevS50 && s20 > s50) {
            position = equity / price;
            entryPrice = price;
            equity = 0;
            trades++;
          }
       } else {
          if (prevS20 >= prevS50 && s20 < s50) {
            const exitVal = position * price;
            if (price > entryPrice) wins++;
            equity = exitVal;
            position = 0;
          }
       }
       
       const currentVal = position > 0 ? position * price : equity;
       curve.push({ time: data[i].time, equity: currentVal });
    }

    if (position > 0) {
      equity = position * data[data.length-1].close;
      if (data[data.length-1].close > entryPrice) wins++;
    }

    return {
      totalTrades: trades,
      winRate: trades > 0 ? (wins / trades) * 100 : 0,
      finalPnLPercent: ((equity - 10000) / 10000) * 100,
      equityCurve: curve
    };
  }
}