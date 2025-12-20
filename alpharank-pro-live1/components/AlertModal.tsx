
import React, { useState } from 'react';
import { X, Bell, Hash, DollarSign, Mail, Smartphone } from 'lucide-react';
import { StockResult } from '../types';
import { userService } from '../services/userService';

interface Props {
  stock: StockResult;
  onClose: () => void;
}

const AlertModal: React.FC<Props> = ({ stock, onClose }) => {
  const [targetPrice, setTargetPrice] = useState<string>(stock.riskAnalysis.takeProfit.toFixed(2));
  const [targetScore, setTargetScore] = useState<string>('8.5');
  const [method, setMethod] = useState<'email' | 'sms'>('email');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    // Save to local storage service
    userService.addAlert({
      ticker: stock.ticker,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      targetScore: targetScore ? parseFloat(targetScore) : undefined,
      condition: 'above'
    });

    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  if (isSaved) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-gray-900 border border-green-500/50 rounded-2xl p-8 text-center animate-in zoom-in duration-200">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="text-green-400" size={32} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Alert Activated!</h3>
          <p className="text-gray-400">Added to your active alerts dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-850 rounded-t-2xl">
          <div>
             <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <Bell className="text-blue-500" size={20} />
               Set Alert for {stock.ticker}
             </h3>
             <p className="text-sm text-gray-400">Get notified when technicals align.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Trigger 1: Technical Score */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
              <Hash size={16} className="text-purple-400"/> Target Technical Score
            </label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                placeholder="e.g. 8.5"
                step="0.1"
                max="10"
              />
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 text-sm flex items-center">
                / 10
              </div>
            </div>
            <p className="text-xs text-gray-500">Current Score: <span className={stock.totalScore >= 7 ? 'text-green-400' : 'text-yellow-400'}>{stock.totalScore}</span></p>
          </div>

          <div className="h-px bg-gray-800"></div>

          {/* Trigger 2: Price Target */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
              <DollarSign size={16} className="text-green-400"/> Target Price Breakout
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input 
                type="number" 
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Price"
              />
            </div>
            <p className="text-xs text-gray-500">Current Price: ${stock.currentPrice.toFixed(2)}</p>
          </div>

          {/* Notification Method */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={() => setMethod('email')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                method === 'email' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Mail size={18} /> Email
            </button>
            <button 
              onClick={() => setMethod('sms')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                method === 'sms' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Smartphone size={18} /> SMS
            </button>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98]"
          >
            Create Alert
          </button>

        </div>
      </div>
    </div>
  );
};

export default AlertModal;
