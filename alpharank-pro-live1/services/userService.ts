
import { StockAlert, UserProfile, Position } from "../types";
import { backendService } from "./backendService";

// Wrapper for synchronous compatibility where needed, 
// though moving to full async in components is recommended.
// This service acts as a Cache/State Manager now.

let currentUserCache: UserProfile | null = null;
let alertsCache: StockAlert[] = [];

// Initialize Cache
const init = () => {
   try {
     const stored = localStorage.getItem('alpharank_user');
     if(stored) currentUserCache = JSON.parse(stored);
     
     const storedAlerts = localStorage.getItem('alpharank_alerts');
     if(storedAlerts) alertsCache = JSON.parse(storedAlerts);
   } catch(e) {}
};
init();

export const userService = {
  // --- Auth ---
  login: (email: string, name: string, photoURL?: string): UserProfile => {
    // Fire and forget backend sync
    backendService.loginOrRegister(email, name, photoURL).then(u => {
        currentUserCache = u;
    });

    // Return optimistic result
    const user: UserProfile = {
      id: 'temp',
      email,
      name,
      photoURL,
      watchlist: currentUserCache?.watchlist || ['NVDA', 'MSFT', 'AAPL', 'TSLA', 'AMD'],
      positions: currentUserCache?.positions || []
    };
    currentUserCache = user;
    return user;
  },

  logout: () => {
    backendService.logout();
    currentUserCache = null;
  },

  getCurrentUser: (): UserProfile | null => {
    return currentUserCache;
  },

  // --- Watchlist ---
  updateWatchlist: (tickers: string[]) => {
    if (currentUserCache) {
      currentUserCache.watchlist = tickers;
      backendService.updateWatchlist(tickers); // Async sync
    }
  },

  // --- Positions ---
  getPosition: (ticker: string): Position | undefined => {
    return currentUserCache?.positions?.find(p => p.ticker === ticker);
  },

  updatePosition: (position: Position) => {
    if (currentUserCache) {
        const existingIdx = currentUserCache.positions.findIndex(p => p.ticker === position.ticker);
        if (existingIdx >= 0) {
            currentUserCache.positions[existingIdx] = position;
        } else {
            currentUserCache.positions.unshift(position);
        }
        backendService.updatePosition(position);
    }
  },

  removePosition: (ticker: string) => {
    if (currentUserCache) {
        currentUserCache.positions = currentUserCache.positions.filter(p => p.ticker !== ticker);
        backendService.removePosition(ticker);
    }
  },

  // --- Alerts ---
  getAlerts: (): StockAlert[] => {
    return alertsCache;
  },

  addAlert: (alert: Omit<StockAlert, 'id' | 'createdAt' | 'active'>) => {
    // Create temp alert for UI
    const tempAlert: StockAlert = {
        ...alert,
        id: Math.random().toString(),
        createdAt: new Date().toISOString(),
        active: true,
        triggered: false
    };
    alertsCache.push(tempAlert);
    
    // Sync with backend
    backendService.createAlert(alert).then(realAlert => {
        // Replace temp with real
        const idx = alertsCache.findIndex(a => a.id === tempAlert.id);
        if (idx !== -1) alertsCache[idx] = realAlert;
    });
    return tempAlert;
  },

  removeAlert: (id: string) => {
    alertsCache = alertsCache.filter(a => a.id !== id);
    backendService.deleteAlert(id);
  },

  markAlertTriggered: (id: string) => {
    const index = alertsCache.findIndex(a => a.id === id);
    if (index !== -1) {
      alertsCache[index].triggered = true;
      backendService.markAlertTriggered(id);
    }
  }
};
