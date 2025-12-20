
export interface StockCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number; // Added official VWAP from FMP
}

export enum Recommendation {
  STRONG_BUY = "Strong Buy",
  BUY = "Buy",
  HOLD = "Hold",
  SELL = "Sell"
}

export interface IndicatorScore {
  name: string;
  score: number; // 1-10
  weight: number; // 0-1 (e.g., 0.3 for 30%)
  value: string | number;
  description: string;
  bullishCriteria: boolean;
  criteria: string; // Explanation for the score
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export interface KeltnerChannels {
  upper: number;
  middle: number;
  lower: number;
}

export interface TechnicalAnalysis {
  rsi: number;
  sma150: number;
  vwma: number; // Volume Weighted Moving Average (or Official VWAP if EOD)
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  adx: {
    adx: number;
    pdi: number; // +DI
    ndi: number; // -DI
  };
  bollinger: BollingerBands;
  keltner?: KeltnerChannels; 
  squeezeOn: boolean; 
  rsiDivergence: 'BULLISH' | 'BEARISH' | null; // New: RSI Divergence
  relativeStrength: number; // New: RS vs SPY ratio (e.g. 1.10 = 10% better than SPY)
  sar: number; 
  atr: number; 
  volumeAvg20: number;
  lastVolume: number;
  supportLevel: number;
  resistanceLevel: number;
  isCupHandle: boolean;
  isElliottImpulse: boolean;
  isDoubleBottom: boolean; // New Pattern
  isInvHeadShoulders: boolean; // New Pattern
  fibLevel: number | null;
  weeklyTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; 
}

export interface RiskAnalysis {
  stopLoss: number;
  takeProfit: number;
  entryPrice: number;
  entrySource: string;
  riskRewardRatio: number;
  thesis: string;
  slSource: string;
  tpSource: string;
  targets: { price: number; ratio: number; label: string }[];
}

export interface ScoreHistoryItem {
  date: string;
  score: number;
}

export interface PatternPoint {
  date: string;
  price: number;
  label?: string; // Metadata for the point (e.g., "Wave 3", "Handle")
}

export interface BacktestTrade {
  entryDate: string;
  entryPrice: number;
  exitDate?: string;
  exitPrice?: number;
  pnlPercent: number;
  reason: 'Target' | 'Stop' | 'Signal' | 'Open';
  type: 'Long';
}

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  actualReturn: number; // New: Actual Buy & Hold return for the same period
  trades: BacktestTrade[];
  equityCurve: { date: string; equity: number }[];
  currentStatus: 'Long' | 'Cash';
}

export interface StockResult {
  ticker: string;
  companyName?: string; // Full Company Name
  sector?: string; // Industry Sector
  currentPrice: number;
  marketCap?: number; // Market Capitalization
  beta?: number; // Market Volatility relative to SPY
  changePercent: number;
  totalScore: number;
  recommendation: Recommendation;
  indicators: IndicatorScore[];
  technicalData: TechnicalAnalysis;
  riskAnalysis: RiskAnalysis;
  history: StockCandle[];
  scoreHistory: ScoreHistoryItem[];
  analysisTimestamp?: number;
  patternOverlay?: PatternPoint[]; 
  backtest?: BacktestResult; 
}

export interface StockAlert {
  id: string;
  ticker: string;
  targetPrice?: number;
  targetScore?: number;
  condition: 'above' | 'below';
  createdAt: string;
  active: boolean;
  triggered?: boolean;
}

export interface Position {
  ticker: string;
  avgEntryPrice: number;
  quantity: number;
  entryDate?: string;
  notes?: string; 
}

export interface TradeAdvice {
  action: 'HOLD' | 'BUY MORE' | 'SELL / TRIM' | 'CUT LOSS' | 'TAKE PROFIT';
  reason: string;
  suggestedStop: number;
  suggestedTarget: number;
  pnlPercentage: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
  watchlist: string[];
  positions: Position[];
}

export type Timeframe = 'daily' | 'weekly';