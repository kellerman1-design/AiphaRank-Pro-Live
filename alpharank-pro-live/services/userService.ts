
import { StockAlert, UserProfile, Position, RealizedTrade } from "../types";
import { backendService } from "./backendService";

let currentUserCache: UserProfile | null = null;

// Try to restore session on boot
backendService.getCurrentSessionUser().then(user => {
    if (user) currentUserCache = user;
});

export const userService = {
  // --- Auth ---
  async register(email: string, password: string, name: string): Promise<UserProfile> {
    const user = await backendService.register(email, password, name);
    currentUserCache = user;
    return user;
  },

  async login(email: string, password: string): Promise<UserProfile> {
    const user = await backendService.login(email, password);
    currentUserCache = user;
    return user;
  },

  async syncWithKey(key: string): Promise<UserProfile> {
    const user = await backendService.syncAccount(key);
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
      backendService.updateWatchlist(tickers);
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

  // --- Trade History & Tax ---
  recordRealizedTrade: (trade: RealizedTrade) => {
      if (currentUserCache) {
          if (!currentUserCache.realizedTrades) currentUserCache.realizedTrades = [];
          currentUserCache.realizedTrades.push(trade);
          backendService.addRealizedTrade(trade);
      }
  },

  // --- Portfolio Stats ---
  updatePortfolioStats: (stats: { cashBalance: number; equityInvested: number }) => {
    if (currentUserCache) {
        currentUserCache.portfolioStats = stats;
        backendService.updatePortfolioStats(stats);
    }
  },

  // --- Alerts ---
  getAlerts: (): StockAlert[] => {
    const stored = localStorage.getItem('alpharank_alerts');
    return stored ? JSON.parse(stored) : [];
  },

  addAlert: (alert: Omit<StockAlert, 'id' | 'createdAt' | 'active'>) => {
    const tempAlert: StockAlert = {
        ...alert,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        active: true,
        triggered: false
    };
    backendService.createAlert(alert);
    return tempAlert;
  },

  removeAlert: (id: string) => {
    backendService.removeAlert(id);
  }
};
