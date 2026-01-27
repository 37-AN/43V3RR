export type MarketType = 'CRYPTO' | 'FOREX';

export interface OHLCV {
  time: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnalysisResult {
  trend: 'UPTREND' | 'DOWNTREND' | 'RANGING';
  rsiState: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  macdSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  // New Indicator Signals
  bbState: 'BREAKOUT_UP' | 'BREAKOUT_DOWN' | 'SQUEEZE' | 'NORMAL';
  stochSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  ichimokuState: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  recentMove: string;
}

export interface NewsItem {
  title: string;
  source?: string;
}

export interface CalendarEvent {
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  time?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface AISummary {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  narrative: string;
  // RAG / Fundamental Fields
  newsHighlights?: NewsItem[];
  upcomingEvents?: CalendarEvent[];
  sources?: GroundingSource[];
  
  idea: {
    type: 'LONG' | 'SHORT' | 'WAIT';
    invalidatedIf: string;
    note: string;
  };
}

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  finalPnLPercent: number;
  equityCurve: { time: number; equity: number }[];
}

export interface AssetOption {
  symbol: string;
  name: string;
  type: MarketType;
}

export const ASSETS: AssetOption[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin (USDT)', type: 'CRYPTO' },
  { symbol: 'ETHUSDT', name: 'Ethereum (USDT)', type: 'CRYPTO' },
  { symbol: 'SOLUSDT', name: 'Solana (USDT)', type: 'CRYPTO' },
  { symbol: 'EURUSD', name: 'Euro / USD', type: 'FOREX' },
  { symbol: 'GBPUSD', name: 'GBP / USD', type: 'FOREX' },
  { symbol: 'USDJPY', name: 'USD / JPY', type: 'FOREX' }
];

export const TIMEFRAMES = [
  { label: '15m', value: '15m', apiValue: '15m' }, // Crypto
  { label: '1h', value: '1h', apiValue: '1h' },    // Crypto
  { label: '4h', value: '4h', apiValue: '4h' },    // Crypto
  { label: '1D', value: '1d', apiValue: '1d' },    // Both
];

// Indicator Data Structures for Charting
export interface BollingerBands {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export interface IchimokuCloud {
  tenkan: (number | null)[]; // Conversion Line
  kijun: (number | null)[];  // Base Line
  senkouA: (number | null)[]; // Leading Span A
  senkouB: (number | null)[]; // Leading Span B
  chikou: (number | null)[]; // Lagging Span
}

export interface IndicatorConfig {
  showSMA: boolean;
  showBollinger: boolean;
  showIchimoku: boolean;
  showStochastic: boolean;
  bbPeriod: number;
  bbStdDev: number;
  stochK: number;
  stochD: number;
  // Ichimoku params
  ichiTenkan: number;
  ichiKijun: number;
  ichiSenkouB: number;
  // RSI
  rsiPeriod: number;
}