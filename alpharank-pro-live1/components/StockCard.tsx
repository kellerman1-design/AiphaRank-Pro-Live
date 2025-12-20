
import React from 'react';
import { StockResult, Recommendation } from '../types';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Activity, Target, Zap, AlertTriangle, Trophy } from 'lucide-react';

interface Props {
  data: StockResult;
  onClick: () => void;
  rank: number;
}

const StockCard: React.FC<Props> = ({ data, onClick, rank }) => {
  const getRecommendationColor = (rec: Recommendation) => {
    switch (rec) {
      case Recommendation.STRONG_BUY: return 'text-accent-green border-accent-green bg-green-900/20';
      case Recommendation.BUY: return 'text-emerald-400 border-emerald-400 bg-emerald-900/10';
      case Recommendation.HOLD: return 'text-yellow-400 border-yellow-400 bg-yellow-900/10';
      case Recommendation.SELL: return 'text-accent-red border-accent-red bg-red-900/10';
    }
  };

  const scoreColor = data.totalScore >= 7 ? 'text-accent-green' : data.totalScore >= 4.5 ? 'text-yellow-400' : 'text-accent-red';

  // "Prime Setup" Logic
  const entryPrice = data.riskAnalysis.entryPrice;
  const currentPrice = data.currentPrice;
  const diff = Math.abs(currentPrice - entryPrice);
  const percentDiff = entryPrice > 0 ? diff / entryPrice : 0;
  // High score AND price is very close to ideal entry (within 2%)
  const isPrimeSetup = data.totalScore >= 8 && percentDiff <= 0.02;

  // "Model Beat" (Alpha+) Logic
  const isAlphaPlus = data.backtest && data.backtest.totalReturn > data.backtest.actualReturn;

  // Other Signals
  const isSqueeze = data.technicalData.squeezeOn;
  const rsiDiv = data.technicalData.rsiDivergence;

  return (
    <div 
      onClick={onClick}
      className={`group relative bg-gray-850 border rounded-xl p-5 hover:shadow-lg hover:shadow-gray-900/50 transition-all cursor-pointer flex flex-col justify-between ${isPrimeSetup ? 'border-yellow-500/50 shadow-yellow-900/20' : 'border-gray-700 hover:border-gray-500'}`}
    >
      <div className="absolute top-4 right-4 text-gray-600 font-mono text-sm">#{rank}</div>
      
      {/* Indicator Badge Stack - Top Right */}
      <div className="absolute -top-3 -right-3 z-10 flex flex-row items-center gap-1">
        {isPrimeSetup && (
          <div className="bg-gray-900 border border-yellow-500 text-yellow-400 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1 animate-pulse">
             <Target size={12} /> Prime
          </div>
        )}

        {isAlphaPlus && (
          <div className="bg-gray-900 border border-purple-500 text-purple-400 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
             <Trophy size={12} className="fill-current" /> Alpha+
          </div>
        )}
        
        {isSqueeze && (
          <div className="bg-gray-900 border border-orange-500 text-orange-400 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
             <Zap size={12} className="fill-current" /> Squeeze
          </div>
        )}

        {rsiDiv === 'BULLISH' && (
          <div className="bg-gray-900 border border-blue-500 text-blue-400 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
             <Activity size={12} /> RSI Div+
          </div>
        )}
        
        {rsiDiv === 'BEARISH' && (
          <div className="bg-gray-900 border border-red-500 text-red-400 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
             <AlertTriangle size={12} /> RSI Div-
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-2xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
            {data.ticker}
          </h3>
          <span className={`px-2 py-1 rounded text-xs font-bold border ${getRecommendationColor(data.recommendation)} uppercase tracking-wider`}>
            {data.recommendation}
          </span>
        </div>

        <div className="flex items-end gap-3 mb-6">
          <span className="text-3xl font-light text-white">${data.currentPrice.toFixed(2)}</span>
          <span className={`flex items-center text-sm font-medium mb-1 ${data.changePercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {data.changePercent >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
            {Math.abs(data.changePercent).toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-gray-700 pt-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Score</p>
          <div className="flex items-center gap-2">
            <Activity size={18} className={scoreColor} />
            <span className={`text-2xl font-mono font-bold ${scoreColor}`}>
              {data.totalScore}
              <span className="text-sm text-gray-500">/10</span>
            </span>
          </div>
        </div>
        
        <div>
           <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Key Signal</p>
           <p className="text-sm text-gray-300 truncate">
             {data.indicators.find(i => i.score >= 8)?.name || "Neutral"}
           </p>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">
        <ChevronRight />
      </div>
    </div>
  );
};

export default React.memo(StockCard);
