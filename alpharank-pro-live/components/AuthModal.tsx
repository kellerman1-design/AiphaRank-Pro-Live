
import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, Loader2, ShieldCheck, AlertCircle, Key, Smartphone } from 'lucide-react';
import { userService } from '../services/userService';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

const AuthModal: React.FC<Props> = ({ onSuccess, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'sync'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [syncKey, setSyncKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await userService.login(email, password);
      } else if (mode === 'register') {
        if (!name) throw new Error("Please enter your name.");
        await userService.register(email, password, name);
      } else if (mode === 'sync') {
        if (!syncKey) throw new Error("Please enter your sync key.");
        await userService.syncWithKey(syncKey);
      } else {
        await new Promise(r => setTimeout(r, 1000));
        alert("Password reset instructions sent to " + email);
        setMode('login');
        setLoading(false);
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-gray-900 border border-gray-700 w-full max-w-[420px] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Decorative Header */}
        <div className="h-32 bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
                <ShieldCheck className="text-white" size={40} />
            </div>
        </div>

        <div className="p-8">
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">
                    {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Account' : mode === 'sync' ? 'Sync Device' : 'Reset Password'}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                    {mode === 'login' ? 'Access your portfolios and alerts.' : 
                     mode === 'register' ? 'Start your AlphaRank Pro journey today.' : 
                     mode === 'sync' ? 'Enter the key from your computer to sync this phone.' :
                     'Enter your email to receive a recovery link.'}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-1">
                    <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-red-300 leading-tight">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Full Name</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                            <input 
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-850 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>
                )}

                {mode === 'sync' ? (
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Account Sync Key</label>
                        <div className="relative group">
                            <Key className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                            <textarea 
                                required
                                value={syncKey}
                                onChange={(e) => setSyncKey(e.target.value)}
                                className="w-full bg-gray-850 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all min-h-[80px] text-xs font-mono"
                                placeholder="Paste your key here..."
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                                <input 
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-850 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        {mode !== 'forgot' && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                                    {mode === 'login' && (
                                        <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-blue-500 hover:underline">Forgot?</button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                                    <input 
                                        required
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-gray-850 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}

                <button 
                    disabled={loading}
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 mt-4 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>
                            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Join Now' : mode === 'sync' ? 'Link Account' : 'Send Reset Link'}
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-800 text-center space-y-4">
                <p className="text-gray-500 text-sm">
                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                    <button 
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                        className="ml-2 font-bold text-white hover:text-blue-400 transition-colors"
                    >
                        {mode === 'login' ? 'Sign Up' : 'Log In'}
                    </button>
                </p>
                {mode !== 'sync' && (
                    <button 
                        onClick={() => setMode('sync')}
                        className="flex items-center justify-center gap-2 w-full text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <Smartphone size={14} /> Already used on another device? Sync here
                    </button>
                )}
            </div>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-20">
            <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
