
import React from 'react';
import { StockResult } from '../types';
import { TrendingUp, TrendingDown, Target, Activity, Zap, AlertTriangle, Trophy, ArrowUpRight, Layers } from 'lucide-react';

interface Props {
  data: StockResult[];
  onSelect: (stock: StockResult) => void;
}

const MarketHeatmap: React.FC<Props> = ({ data, onSelect }) => {
  // Sort by score desc
  const sorted = [...data].sort((a, b) => b.totalScore - a.totalScore);
  
  const getBlockStyles = (score: number) => {
      if (score >= 9) return 'bg-green-600 border-green-400/50 hover:bg-green-500';
      if (score >= 8) return 'bg-emerald-600 border-emerald-400/50 hover:bg-emerald-500';
      if (score >= 7) return 'bg-teal-700 border-teal-500/50 hover:bg-teal-600';
      if (score >= 6) return 'bg-cyan-800 border-cyan-600/50 hover:bg-cyan-700';
      if (score >= 5) return 'bg-gray-700 border-gray-600 hover:bg-gray-600';
      if (score >= 4) return 'bg-yellow-900/80 border-yellow-700 hover:bg-yellow-800';
      return 'bg-red-900/80 border-red-700 hover:bg-red-800';
  };

  const isAlphaPlus = (stock: StockResult) => {
      return stock.backtest && stock.backtest.totalReturn > stock.backtest.actualReturn;
  };

  if (data.length === 0) return null;

  return (
    <div className="mb-8 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-between items-end mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Market Opportunities <span className="text-xs text-gray-500 font-normal bg-gray-800 px-2 py-1 rounded-full">{data.length} Scanned</span>
            </h3>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest hidden sm:block">
                Size = Equal • Color = Tech Score
            </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {sorted.map(stock => {
                // FIX: Rely solely on the result from the analysis engine for consistency
                const prime = stock.isPrimeSetup;
                const alpha = isAlphaPlus(stock);
                const trendEntry = stock.isTrendEntry && !prime;
                const isSqueeze = stock.technicalData.squeezeOn;
                const rsiDiv = stock.technicalData.rsiDivergence;

                return (
                    <div 
                        key={stock.ticker}
                        onClick={() => onSelect(stock)}
                        className={`${getBlockStyles(stock.totalScore)} relative aspect-[4/3] sm:aspect-square flex flex-col justify-between p-3 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:z-10 rounded-xl border shadow-lg group overflow-hidden`}
                        title={`${stock.ticker}: Score ${stock.totalScore}`}
                    >
                        {/* Background Effects */}
                        {prime && (
                            <div className="absolute -right-4 -top-4 w-12 h-12 bg-yellow-400/30 blur-xl rounded-full pointer-events-none animate-pulse"></div>
                        )}
                        {isSqueeze && (
                            <div className="absolute inset-0 bg-orange-500/10 animate-pulse pointer-events-none"></div>
                        )}

                        <div className="flex justify-between items-start z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-white/20 shadow-sm">
                                    <img 
                                        src={`https://financialmodelingprep.com/image-stock/${stock.ticker}.png`} 
                                        alt=""
                                        className="w-full h-full object-contain p-0.5"
                                        onError={(e) => {
                                            e.currentTarget.parentElement?.classList.add('hidden');
                                        }}
                                    />
                                </div>
                                <span className="text-white font-black text-lg sm:text-xl font-mono tracking-tighter drop-shadow-md">
                                    {stock.ticker}
                                </span>
                            </div>
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm font-mono text-xs font-bold text-white border border-white/10">
                                {stock.totalScore}
                            </span>
                        </div>

                        <div className="z-10">
                            <div className="text-white font-bold text-lg leading-none mb-1">
                                ${stock.currentPrice.toFixed(2)}
                            </div>
                            <div className={`flex items-center text-xs font-medium ${stock.changePercent >= 0 ? 'text-green-100' : 'text-red-100'}`}>
                                {stock.changePercent >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                {Math.abs(stock.changePercent).toFixed(2)}%
                            </div>
                        </div>

                        {/* Badges Footer */}
                        <div className="flex flex-wrap gap-1 mt-2 z-10">
                            {isSqueeze && (
                                <span className="bg-orange-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md border border-orange-400/50">
                                    <Zap size={8} className="fill-current" /> SQUEEZE
                                </span>
                            )}
                            {rsiDiv && (
                                <span className={`text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md border ${rsiDiv === 'BULLISH' ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400'}`}>
                                    <Activity size={8} /> DIV
                                </span>
                            )}
                            {prime && (
                                <span className="bg-yellow-400 text-black text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                    <Target size={8} /> Prime
                                </span>
                            )}
                            {trendEntry && !isSqueeze && (
                                <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                    <ArrowUpRight size={8} /> Trend
                                </span>
                            )}
                            {alpha && (
                                <span className="bg-purple-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                                    <Trophy size={8} className="fill-current" /> Alpha+
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default MarketHeatmap;
