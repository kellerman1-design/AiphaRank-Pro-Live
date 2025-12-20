
import React, { useMemo } from 'react';
import { StockResult } from '../types';
import { TrendingUp, TrendingDown, Layers, ArrowRight, PlayCircle, StopCircle, Zap, Database, Check, Loader } from 'lucide-react';

interface Props {
  data: StockResult[];
  onSelectStock: (stock: StockResult) => void;
  onStartScan?: () => void;
  onStopScan?: () => void;
  isScanning?: boolean;
  scanProgress?: number;
  currentScanningTicker?: string;
  isFastScanMode?: boolean;
}

interface SectorData {
  name: string;
  totalScore: number;
  totalChange: number;
  count: number;
  stocks: StockResult[];
}

const SectorHeatmap: React.FC<Props> = ({ 
    data, 
    onSelectStock, 
    onStartScan, 
    onStopScan, 
    isScanning, 
    scanProgress, 
    currentScanningTicker,
    isFastScanMode 
}) => {
  
  const sectors = useMemo(() => {
    const sectorMap = new Map<string, SectorData>();

    // Aggregate Data
    data.forEach(stock => {
      const sectorName = stock.sector || 'Unknown';
      
      if (!sectorMap.has(sectorName)) {
        sectorMap.set(sectorName, { name: sectorName, totalScore: 0, totalChange: 0, count: 0, stocks: [] });
      }
      
      const sector = sectorMap.get(sectorName)!;
      sector.totalScore += stock.totalScore;
      sector.totalChange += stock.changePercent;
      sector.count += 1;
      sector.stocks.push(stock);
    });

    // Calculate Averages and Sort
    return Array.from(sectorMap.values()).map(s => ({
      ...s,
      avgScore: s.totalScore / s.count,
      avgChange: s.totalChange / s.count,
      // Sort stocks within sector by score desc
      stocks: s.stocks.sort((a, b) => b.totalScore - a.totalScore)
    })).sort((a, b) => b.avgScore - a.avgScore); // Sort sectors by score desc

  }, [data]);

  const getBlockStyles = (score: number) => {
      if (score >= 8) return 'bg-emerald-900/40 border-emerald-500/50 hover:bg-emerald-900/60';
      if (score >= 6) return 'bg-blue-900/40 border-blue-500/50 hover:bg-blue-900/60';
      if (score >= 4.5) return 'bg-gray-800/60 border-gray-600 hover:bg-gray-700/60';
      return 'bg-red-900/40 border-red-500/50 hover:bg-red-900/60';
  };

  const getScoreColor = (score: number) => {
      if (score >= 7) return 'text-emerald-400';
      if (score >= 4.5) return 'text-blue-400';
      return 'text-red-400';
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                <Layers className="text-purple-500" size={32} />
                Sector Rotation Map
            </h2>
            
            {/* Integrated Scanner Controls */}
            <div className="flex flex-col items-center gap-3 mt-6 mb-8">
                 {!isScanning ? (
                     <button 
                        onClick={onStartScan}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-full shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95 text-sm"
                     >
                        <PlayCircle size={20} />
                        Update Sector Data
                     </button>
                 ) : (
                     <button 
                        onClick={onStopScan}
                        className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold py-2 px-6 rounded-full transition-all text-sm"
                     >
                        <StopCircle size={18} />
                        Stop Scan
                     </button>
                 )}

                 {isScanning && (
                     <div className="w-full max-w-md mx-auto">
                         <div className={`text-[10px] uppercase font-black px-2 py-0.5 rounded flex items-center justify-center gap-1 mb-2 transition-all ${isFastScanMode ? 'bg-purple-500/20 text-purple-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'}`}>
                            {isFastScanMode ? <Zap size={10} className="fill-current"/> : <Database size={10}/>}
                            {isFastScanMode ? 'Optimized Fast Scan' : 'Full Sector Re-Sync'}
                         </div>
                         <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                            <div className="bg-blue-500 h-1 rounded-full transition-all duration-300" style={{width: `${scanProgress}%`}}></div>
                         </div>
                         <div className="flex justify-between items-center mt-1.5">
                            <span className="text-[10px] text-gray-500 font-mono">Status: {currentScanningTicker}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{scanProgress}%</span>
                         </div>
                     </div>
                 )}

                 {!isScanning && currentScanningTicker === "Complete" && (
                     <div className="text-[10px] text-green-400 font-mono bg-green-900/10 border border-green-900/30 px-3 py-1 rounded-full flex items-center gap-1">
                        <Check size={12} /> Sector Matrix Fully Calculated
                     </div>
                 )}
            </div>

            <p className="text-gray-400 max-w-2xl mx-auto text-sm">
                Identify which industries are currently leading the market.
                Focus your trading in strong sectors (Green/Blue) and avoid weak ones (Red).
            </p>
        </div>

        {data.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-800 rounded-2xl">
                <Layers className="mx-auto text-gray-700 mb-4" size={48} />
                <p className="text-gray-500">No data available for Sector Analysis.</p>
                <p className="text-xs text-gray-600 mt-1">Run the Update above to populate sector data.</p>
                {isScanning && <Loader className="animate-spin text-blue-600 mx-auto mt-4" size={24} />}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sectors.map(sector => (
                    <div 
                        key={sector.name}
                        className={`rounded-2xl border p-5 transition-all duration-300 ${getBlockStyles(sector.avgScore)} shadow-xl backdrop-blur-sm`}
                    >
                        <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/10">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">{sector.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-400 font-mono bg-black/30 px-2 py-0.5 rounded">
                                        {sector.count} Stocks
                                    </span>
                                    <span className={`text-xs font-bold flex items-center ${sector.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {sector.avgChange >= 0 ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
                                        {Math.abs(sector.avgChange).toFixed(2)}% Avg
                                    </span>
                                </div>
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] uppercase text-gray-400 font-bold block">Sector Score</span>
                                <div className={`text-2xl font-black font-mono ${getScoreColor(sector.avgScore)}`}>
                                    {sector.avgScore.toFixed(1)}
                                </div>
                            </div>
                        </div>

                        {/* Top Movers in Sector */}
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Top Leaders</p>
                            <div className="space-y-2">
                                {sector.stocks.slice(0, 3).map(stock => (
                                    <div 
                                        key={stock.ticker}
                                        onClick={() => onSelectStock(stock)}
                                        className="flex justify-between items-center bg-black/20 hover:bg-black/40 p-2 rounded cursor-pointer transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-sm text-gray-200 group-hover:text-blue-400 transition-colors">
                                                {stock.ticker}
                                            </span>
                                            <span className={`text-[10px] ${stock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold ${getScoreColor(stock.totalScore)}`}>
                                                {stock.totalScore}
                                            </span>
                                            <ArrowRight size={12} className="text-gray-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default SectorHeatmap;
