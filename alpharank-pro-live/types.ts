
export interface StockCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number; 
}

export enum Recommendation {
  STRONG_BUY = "Strong Buy",
  BUY = "Buy",
  HOLD = "Hold",
  SELL = "Sell"
}

export interface IndicatorScore {
  name: string;
  score: number; 
  weight: number; 
  value: string | number;
  description: string;
  bullishCriteria: boolean;
  criteria: string; 
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
  vwma: number; 
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  adx: {
    adx: number;
    pdi: number; 
    ndi: number; 
  };
  bollinger: BollingerBands;
  keltner?: KeltnerChannels; 
  squeezeOn: boolean; 
  rsiDivergence: 'BULLISH' | 'BEARISH' | null; 
  relativeStrength: number; 
  sar: number; 
  atr: number; 
  volumeAvg20: number;
  lastVolume: number;
  supportLevel: number;
  resistanceLevel: number;
  isCupHandle: boolean;
  isElliottImpulse: boolean;
  isDoubleBottom: boolean; 
  isInvHeadShoulders: boolean; 
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
  label?: string; 
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
  actualReturn: number; 
  alphaReturn: number; 
  maxDrawdown: number; 
  drawdownAvoided: number; 
  trades: BacktestTrade[];
  equityCurve: { 
    date: string; 
    equity: number; 
    bhEquity?: number; 
    isPrime?: boolean; 
    isEntry?: boolean; 
    isTrendEntry?: boolean; 
    entryReason?: string;
    exitReason?: string; 
  }[];
  currentStatus: 'Long' | 'Cash';
}

export interface StockResult {
  ticker: string;
  companyName?: string; 
  sector?: string; 
  currentPrice: number;
  marketCap?: number; 
  beta?: number; 
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
  isTrendEntry?: boolean; 
  isPrimeSetup?: boolean;
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

export interface RealizedTrade {
  id: string;
  ticker: string;
  sellDate: string;
  sellPrice: number;
  buyPrice: number;
  quantity: number;
  pnl: number; // Profit or Loss amount
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
  realizedTrades?: RealizedTrade[];
  syncKey?: string;
  portfolioStats?: {
    cashBalance: number;
    equityInvested: number;
  };
}

export interface MacroEvent {
  id: string;
  date: string;
  event: string;
  impact: 'High' | 'Medium' | 'Low';
  details: string;
}

export interface DivergenceMonitor {
  dollarTrend: { status: 'Bullish' | 'Bearish' | 'Neutral', value: number, impact: 'Headwind' | 'Tailwind' | 'Neutral' };
  yieldPressure: { status: 'High' | 'Low' | 'Stable', value: number, impact: 'Risk-Off' | 'Risk-On' | 'Neutral' };
  smartMoney: { status: 'Accumulation' | 'Distribution' | 'Neutral', score: number };
  nhnlIndex: { status: 'Expanding' | 'Contracting' | 'Diverging', value: number };
}

export type Timeframe = 'daily' | 'weekly';
