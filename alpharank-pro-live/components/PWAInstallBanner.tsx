import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Star } from 'lucide-react';

const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Standard PWA install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not in standalone mode
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(true);
      }
    };

    // If it's iOS and not standalone, show instructions
    if (ios && !window.matchMedia('(display-mode: standalone)').matches) {
      const lastDismissed = localStorage.getItem('pwa_banner_dismissed');
      const today = new Date().toDateString();
      if (lastDismissed !== today) {
        setIsVisible(true);
      }
    }

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_banner_dismissed', new Date().toDateString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg">
          <img 
            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9IjEyOCIgZmlsbD0iIzBmMTcyYSIvPjxwYXRoIGQ9Ik0yNTYgNjRMOTYgNDQ4aDcybDQ4LTExOGgxODBsNDQgMTE4aDc2TDI1NiA2NHoiIGZpbGw9IiMzYjgyZjYiLz48cGF0aCBkPSJNMTY2IDMwMGw5MC05MCA5MCA5MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjQwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=" 
            alt="Logo" 
            className="w-8 h-8" 
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-bold text-sm">AlphaRank Pro</h4>
          <p className="text-blue-100 text-[11px] leading-tight">
            {isIOS 
              ? 'Tap "Share" then "Add to Home Screen" to install' 
              : 'Install the app for a faster trading experience'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isIOS && (
            <button 
              onClick={handleInstall}
              className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition-transform"
            >
              Install
            </button>
          )}
          <button onClick={dismiss} className="text-white/60 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;