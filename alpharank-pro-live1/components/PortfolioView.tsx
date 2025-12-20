
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, RefreshCw, Briefcase, TrendingUp, TrendingDown, Target, ShieldAlert, ArrowRight, BookOpen } from 'lucide-react';
import { userService } from '../services/userService';
import { fetchStockData, fetchOfficialSMA, fetchMarketCap } from '../services/stockService';
import { analyzeStock, generateTradeAdvice } from '../services/analysisEngine';
import { Position, StockResult, TradeAdvice } from '../types';

const PORTFOLIO_CACHE_KEY = 'alpharank_portfolio_data';

interface Props {
  onSelectStock: (stock: StockResult) => void;
}

const PortfolioView: React.FC<Props> = ({ onSelectStock }) => {
  // Lazy initialize positions from storage
  const [positions, setPositions] = useState<Position[]>(() => {
      const user = userService.getCurrentUser();
      return user?.positions || [];
  });
  
  // Initialize market data from localStorage if available
  const [marketData, setMarketData] = useState<Record<string, { result: StockResult, advice: TradeAdvice }>>(() => {
      try {
          const cached = localStorage.getItem(PORTFOLIO_CACHE_KEY);
          if (cached) {
              return JSON.parse(cached);
          }
      } catch (e) {
          console.warn("Failed to load portfolio cache", e);
      }
      return {};
  });

  const [loading, setLoading] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [expandedJournal, setExpandedJournal] = useState<string | null>(null);

  // Persist marketData to localStorage whenever it changes
  useEffect(() => {
      try {
          localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify(marketData));
      } catch (e) {
          console.warn("Failed to save portfolio cache", e);
      }
  }, [marketData]);

  // Fetch market data logic
  const fetchPortfolioData = useCallback(async (forceRefresh = false) => {
    if (positions.length === 0) return;
    
    setLoading(true);
    const newData: Record<string, { result: StockResult, advice: TradeAdvice }> = {};
    let hasUpdates = false;

    // Get today's date string for comparison
    const todayStr = new Date().toDateString();

    for (const pos of positions) {
      try {
        const existingData = marketData[pos.ticker];
        
        // If we have data from today AND not forcing refresh, re-use it but update advice
        let isDataFromToday = false;
        if (existingData && existingData.result.analysisTimestamp) {
            const dataDate = new Date(existingData.result.analysisTimestamp).toDateString();
            if (dataDate === todayStr) {
                isDataFromToday = true;
            }
        }

        if (isDataFromToday && !forceRefresh) {
           const newAdvice = generateTradeAdvice(existingData.result, pos);
           if (JSON.stringify(newAdvice) !== JSON.stringify(existingData.advice)) {
               newData[pos.ticker] = { result: existingData.result, advice: newAdvice };
               hasUpdates = true;
           } else {
               newData[pos.ticker] = existingData;
           }
           continue; 
        }

        // Fetch fresh data
        const history = await fetchStockData(pos.ticker);
        const sma = await fetchOfficialSMA(pos.ticker);
        const mCap = await fetchMarketCap(pos.ticker);
        const result = analyzeStock(pos.ticker, history, sma, mCap);
        const advice = generateTradeAdvice(result, pos);
        
        newData[pos.ticker] = { result, advice };
        hasUpdates = true;
        
        // Slight delay is managed by the Queue in stockService now, but a small pause here helps UI responsiveness
        if (positions.length > 5) await new Promise(r => setTimeout(r, 50)); 

      } catch (e) {
        console.error(`Failed to load data for ${pos.ticker}`, e);
        if (marketData[pos.ticker]) {
            newData[pos.ticker] = marketData[pos.ticker];
        }
      }
    }
    
    if (hasUpdates || forceRefresh) {
        setMarketData(prev => ({ ...prev, ...newData }));
    }
    setLoading(false);
  }, [positions, marketData]); 

  // Force Refresh on Mount
  useEffect(() => {
     fetchPortfolioData(true);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      const updatedData = { ...marketData };
      let changed = false;
      
      positions.forEach(pos => {
          if (updatedData[pos.ticker]) {
              const newAdvice = generateTradeAdvice(updatedData[pos.ticker].result, pos);
              if (JSON.stringify(newAdvice) !== JSON.stringify(updatedData[pos.ticker].advice)) {
                  updatedData[pos.ticker] = {
                      ...updatedData[pos.ticker],
                      advice: newAdvice
                  };
                  changed = true;
              }
          }
      });

      if (changed) {
          setMarketData(updatedData);
      }
  }, [positions]); 

  const handleAddPosition = async () => {
    if (!newTicker) return;
    const tickerUpper = newTicker.toUpperCase();
    
    if (positions.find(p => p.ticker === tickerUpper)) {
        setNewTicker('');
        setIsAdding(false);
        return;
    }

    const newPos: Position = {
        ticker: tickerUpper,
        avgEntryPrice: 0,
        quantity: 0,
        entryDate: new Date().toISOString(),
        notes: ''
    };

    const updated = [newPos, ...positions];
    setPositions(updated);
    userService.updatePosition(newPos);
    
    setLoading(true);
    try {
        const history = await fetchStockData(tickerUpper);
        const sma = await fetchOfficialSMA(tickerUpper);
        const mCap = await fetchMarketCap(tickerUpper);
        const result = analyzeStock(tickerUpper, history, sma, mCap);
        const advice = generateTradeAdvice(result, newPos);
        setMarketData(prev => ({ ...prev, [tickerUpper]: { result, advice } }));
    } catch(e) {
        console.error("Error fetching new ticker");
    } finally {
        setLoading(false);
        setNewTicker('');
        setIsAdding(false);
    }
  };

  const handleUpdatePosition = (ticker: string, field: keyof Position, value: string | number) => {
    const updatedPositions = positions.map(p => {
        if (p.ticker === ticker) {
            return { ...p, [field]: value };
        }
        return p;
    });
    setPositions(updatedPositions);
    
    const updatedPos = updatedPositions.find(p => p.ticker === ticker);
    if (updatedPos) userService.updatePosition(updatedPos);
  };

  const handleRemovePosition = (ticker: string) => {
    userService.removePosition(ticker);
    setPositions(positions.filter(p => p.ticker !== ticker));
    
    setMarketData(prev => {
        const next = { ...prev };
        delete next[ticker];
        return next;
    });
  };

  const totalInvested = positions.reduce((sum, p) => sum + (p.avgEntryPrice * p.quantity), 0);
  const totalValue = positions.reduce((sum, p) => {
      const currentPrice = marketData[p.ticker]?.result.currentPrice || p.avgEntryPrice;
      return sum + (currentPrice * p.quantity);
  }, 0);
  const totalPnL = totalValue - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Summary Card */}
      <div className="bg-gray-850 rounded-2xl border border-gray-700 p-6 mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Briefcase className="text-blue-400" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Portfolio Summary</h2>
              </div>
              
              <div className="flex items-center gap-2">
                 {loading && <span className="text-xs text-blue-400 animate-pulse flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Updating Live Data...</span>}
                 <button 
                   onClick={() => fetchPortfolioData(true)}
                   className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                   title="Force Refresh Data"
                 >
                   <RefreshCw size={18} />
                 </button>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                  <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Total Value</p>
                  <p className="text-3xl font-mono font-bold text-white">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                  <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Total Invested</p>
                  <p className="text-2xl font-mono text-gray-300">${totalInvested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                  <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Total P&L</p>
                  <div className="flex items-end gap-2">
                      <p className={`text-3xl font-mono font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </p>
                      <span className={`mb-1 text-sm font-bold ${totalPnLPercent >= 0 ? 'text-green-500/80' : 'text-red-500/80'}`}>
                          ({totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
                      </span>
                  </div>
              </div>
          </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Holdings</h3>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
          >
              <Plus size={18} /> Add Symbol
          </button>
      </div>

      {/* Add Row */}
      {isAdding && (
          <div className="bg-gray-800/50 border border-blue-500/30 rounded-xl p-4 mb-6 flex items-center gap-4 animate-in fade-in zoom-in-95">
              <input 
                  autoFocus
                  type="text"
                  placeholder="Ticker (e.g. TSLA)"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPosition()}
                  className="bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg uppercase font-mono w-40 focus:border-blue-500 outline-none"
              />
              <div className="flex gap-2">
                <button onClick={handleAddPosition} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Save</button>
                <button onClick={() => setIsAdding(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
          </div>
      )}

      {/* List */}
      <div className="space-y-4">
          {positions.length === 0 && !isAdding && (
              <div className="text-center py-16 bg-gray-850/50 border-2 border-dashed border-gray-800 rounded-2xl text-gray-500">
                  <Briefcase size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Your portfolio is empty.</p>
                  <p className="text-sm">Click "Add Symbol" to start tracking your holdings.</p>
              </div>
          )}

          {positions.map(pos => {
              const data = marketData[pos.ticker];
              const result = data?.result;
              const advice = data?.advice;
              const currentPrice = result?.currentPrice || 0;
              const currentValue = currentPrice * pos.quantity;
              const pnl = currentValue - (pos.avgEntryPrice * pos.quantity);
              const pnlPercent = pos.avgEntryPrice > 0 ? (pnl / (pos.avgEntryPrice * pos.quantity)) * 100 : 0;
              const isJournalOpen = expandedJournal === pos.ticker;

              return (
                  <div key={pos.ticker} className="bg-gray-850 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors">
                      {/* Main Row Content */}
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          
                          {/* 1. Ticker & Live Price (Cols 1-2) */}
                          <div className="lg:col-span-2">
                              <div className="flex items-center justify-between lg:block">
                                  <div>
                                      <h4 
                                        onClick={() => result && onSelectStock(result)}
                                        className={`text-xl font-black text-white font-mono ${result ? 'cursor-pointer hover:text-blue-400 hover:underline decoration-blue-500/50 underline-offset-4' : ''} transition-all`}
                                        title={result ? "View Analysis" : "Loading..."}
                                      >
                                        {pos.ticker}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1">
                                          {currentPrice > 0 ? (
                                              <>
                                                 <span className="text-gray-300 font-mono">${currentPrice.toFixed(2)}</span>
                                                 {result && (
                                                     <span className={`text-xs font-bold ${result.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                         {result.changePercent > 0 ? '+' : ''}{result.changePercent.toFixed(2)}%
                                                     </span>
                                                 )}
                                              </>
                                          ) : (
                                              <span className="text-xs text-blue-400 animate-pulse flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> Fetching...</span>
                                          )}
                                      </div>
                                  </div>
                                  {/* Mobile Trash Button */}
                                  <button onClick={() => handleRemovePosition(pos.ticker)} className="lg:hidden p-2 text-gray-600 hover:text-red-400">
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                          </div>

                          {/* 2. Inputs (Cols 3-5) */}
                          <div className="lg:col-span-3 grid grid-cols-2 gap-3">
                              <div>
                                  <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Avg Price</label>
                                  <div className="relative">
                                      <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                                      <input 
                                          type="number" 
                                          value={pos.avgEntryPrice || ''}
                                          onChange={(e) => handleUpdatePosition(pos.ticker, 'avgEntryPrice', parseFloat(e.target.value))}
                                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 pl-5 text-sm text-white focus:border-blue-500 outline-none font-mono"
                                          placeholder="0.00"
                                      />
                                  </div>
                              </div>
                              <div>
                                  <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Quantity</label>
                                  <input 
                                      type="number" 
                                      value={pos.quantity || ''}
                                      onChange={(e) => handleUpdatePosition(pos.ticker, 'quantity', parseFloat(e.target.value))}
                                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none font-mono"
                                      placeholder="0"
                                  />
                              </div>
                          </div>

                          {/* 3. Performance (Cols 6-8) */}
                          <div className="lg:col-span-3 flex justify-between lg:block bg-gray-800/30 lg:bg-transparent p-3 lg:p-0 rounded-lg">
                               <div className="mb-0 lg:mb-2">
                                  <p className="text-[10px] uppercase text-gray-500 font-bold">Current Value</p>
                                  <p className="text-white font-mono font-bold">${currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                               </div>
                               <div>
                                  <p className="text-[10px] uppercase text-gray-500 font-bold">Profit / Loss</p>
                                  <div className="flex items-center gap-2">
                                      <span className={`font-mono font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {pnl >= 0 ? '+' : ''}{pnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                      </span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${pnlPercent >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                          {pnlPercent.toFixed(2)}%
                                      </span>
                                  </div>
                               </div>
                          </div>

                          {/* 4. AI Advisor (Cols 9-11) */}
                          <div className="lg:col-span-3">
                              {advice ? (
                                  <div className={`border rounded-lg p-2.5 relative overflow-hidden ${
                                      advice.action === 'BUY MORE' ? 'bg-green-900/10 border-green-500/30' :
                                      advice.action === 'TAKE PROFIT' ? 'bg-emerald-900/10 border-emerald-500/30' :
                                      advice.action.includes('SELL') ? 'bg-red-900/10 border-red-500/30' :
                                      'bg-blue-900/10 border-blue-500/30'
                                  }`}>
                                      <div className="flex justify-between items-center mb-1.5">
                                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                             <Briefcase size={10} /> AI Advisor
                                          </span>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                              advice.action === 'BUY MORE' ? 'bg-green-500 text-black' :
                                              advice.action === 'TAKE PROFIT' ? 'bg-emerald-500 text-black' :
                                              advice.action.includes('SELL') ? 'bg-red-500 text-white' :
                                              'bg-blue-500 text-white'
                                          }`}>
                                              {advice.action}
                                          </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-4 text-xs">
                                          <div>
                                             <span className="text-gray-500 block text-[9px] uppercase">S. Stop</span>
                                             <span className="text-red-300 font-mono">${advice.suggestedStop}</span>
                                          </div>
                                          <div>
                                             <span className="text-gray-500 block text-[9px] uppercase">Target</span>
                                             <span className="text-green-300 font-mono">${advice.suggestedTarget}</span>
                                          </div>
                                          <div className="flex-1 text-right">
                                               <span className="text-gray-500 block text-[9px] uppercase">Tech Score</span>
                                               <span className={`font-bold ${result!.totalScore >= 7 ? 'text-green-400' : result!.totalScore >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                   {result!.totalScore}
                                               </span>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="h-full flex items-center justify-center text-xs text-gray-600 bg-gray-900/30 rounded-lg border border-gray-800 border-dashed">
                                      AI Analyzing...
                                  </div>
                              )}
                          </div>

                          {/* 5. Actions (Col 12) */}
                          <div className="hidden lg:col-span-1 lg:flex flex-col gap-2 items-end">
                              <button 
                                onClick={() => setExpandedJournal(isJournalOpen ? null : pos.ticker)}
                                className={`p-2 rounded-lg transition-colors ${isJournalOpen ? 'bg-blue-900/30 text-blue-400' : 'text-gray-600 hover:bg-gray-800 hover:text-white'}`}
                                title="Trading Journal"
                              >
                                  <BookOpen size={18} />
                              </button>
                              <button 
                                onClick={() => handleRemovePosition(pos.ticker)}
                                className="p-2 text-gray-600 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                                title="Remove Position"
                              >
                                  <Trash2 size={18} />
                              </button>
                          </div>
                      </div>

                      {/* Trading Journal Section (Expandable) */}
                      {isJournalOpen && (
                          <div className="border-t border-gray-700 bg-gray-900/50 p-4 animate-in slide-in-from-top-2">
                              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Trading Journal & Notes</label>
                              <textarea
                                value={pos.notes || ''}
                                onChange={(e) => handleUpdatePosition(pos.ticker, 'notes', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none min-h-[100px]"
                                placeholder="Why did you enter this trade? What is your plan?..."
                              />
                          </div>
                      )}
                  </div>
              );
          })}
      </div>
    </div>
  );
};

export default PortfolioView;
