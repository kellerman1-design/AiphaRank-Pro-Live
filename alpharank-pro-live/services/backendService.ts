
import { UserProfile, StockAlert, Position, StockResult, RealizedTrade } from "../types";

/**
 * BACKEND SERVICE (HYBRID CLOUD SIMULATION)
 * In a real production app, these methods would call a real API (Node.js/Firebase/Supabase).
 * For now, we use LocalStorage but provide a 'Data-Rich Sync' mechanism to bridge devices.
 */

const DB_KEYS = {
    USERS_DB: 'alpharank_db_users', 
    SESSION: 'alpharank_session_id',
    ALERTS: 'alpharank_alerts',
    GLOBAL_SCAN: 'alpharank_global_scan_results',
};

const SIMULATED_LATENCY = 600;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getAllUsers = (): any[] => {
    const stored = localStorage.getItem(DB_KEYS.USERS_DB);
    return stored ? JSON.parse(stored) : [];
};

/**
 * Encodes the entire user state into a base64 string.
 * This acts as a portable "mini-database" for manual syncing.
 */
const generateSyncKey = (user: UserProfile, password?: string) => {
    const payload = {
        e: user.email,
        p: password || 'synced',
        n: user.name,
        w: user.watchlist,
        pos: user.positions,
        rt: user.realizedTrades || [],
        stats: user.portfolioStats || { cashBalance: 0, equityInvested: 0 }
    };
    return btoa(JSON.stringify(payload));
};

export const backendService = {
    
    // --- AUTH METHODS ---
    async register(email: string, password: string, name: string): Promise<UserProfile> {
        await delay(SIMULATED_LATENCY);
        const users = getAllUsers();
        
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            throw new Error("User already exists with this email.");
        }

        const newUser: UserProfile = {
            id: Math.random().toString(36).substr(2, 9),
            email: email.toLowerCase(),
            name,
            watchlist: ['NVDA', 'MSFT', 'AAPL', 'TSLA', 'AMD'],
            positions: [],
            realizedTrades: [],
            portfolioStats: { cashBalance: 0, equityInvested: 0 }
        };

        newUser.syncKey = generateSyncKey(newUser, password);

        const dbEntry = { ...newUser, password }; 
        users.push(dbEntry);
        localStorage.setItem(DB_KEYS.USERS_DB, JSON.stringify(users));
        localStorage.setItem(DB_KEYS.SESSION, newUser.id);
        
        return newUser;
    },

    async login(email: string, password: string): Promise<UserProfile> {
        await delay(SIMULATED_LATENCY);
        const users = getAllUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

        if (!user) {
            throw new Error("Invalid email or password.");
        }

        // Initialize stats/arrays if missing (migration)
        if (!user.portfolioStats) user.portfolioStats = { cashBalance: 0, equityInvested: 0 };
        if (!user.realizedTrades) user.realizedTrades = [];

        // Update key to include latest data on login
        user.syncKey = generateSyncKey(user, user.password);
        localStorage.setItem(DB_KEYS.USERS_DB, JSON.stringify(users));

        localStorage.setItem(DB_KEYS.SESSION, user.id);
        const { password: _, ...profile } = user;
        return profile;
    },

    async syncAccount(syncKey: string): Promise<UserProfile> {
        await delay(SIMULATED_LATENCY);
        try {
            const data = JSON.parse(atob(syncKey));
            const users = getAllUsers();
            
            // Check if user already exists locally, update them. Otherwise create.
            let userIdx = users.findIndex(u => u.email === data.e);
            
            const syncedUser: any = {
                id: userIdx >= 0 ? users[userIdx].id : Math.random().toString(36).substr(2, 9),
                email: data.e,
                password: data.p,
                name: data.n,
                watchlist: data.w || [],
                positions: data.pos || [],
                realizedTrades: data.rt || [],
                portfolioStats: data.stats || { cashBalance: 0, equityInvested: 0 },
                syncKey: syncKey
            };

            if (userIdx >= 0) {
                users[userIdx] = syncedUser;
            } else {
                users.push(syncedUser);
            }

            localStorage.setItem(DB_KEYS.USERS_DB, JSON.stringify(users));
            localStorage.setItem(DB_KEYS.SESSION, syncedUser.id);
            
            const { password: _, ...profile } = syncedUser;
            return profile;
        } catch (e) {
            throw new Error("Invalid or corrupted sync key.");
        }
    },

    async getCurrentSessionUser(): Promise<UserProfile | null> {
        const sessionId = localStorage.getItem(DB_KEYS.SESSION);
        if (!sessionId) return null;
        
        const users = getAllUsers();
        const user = users.find(u => u.id === sessionId);
        if (user) {
            // Migration check
            if (!user.portfolioStats) user.portfolioStats = { cashBalance: 0, equityInvested: 0 };
            if (!user.realizedTrades) user.realizedTrades = [];
            
            // Always refresh sync key based on current local state before returning
            user.syncKey = generateSyncKey(user, user.password);
            const { password: _, ...profile } = user;
            return profile;
        }
        return null;
    },

    async logout(): Promise<void> {
        localStorage.removeItem(DB_KEYS.SESSION);
    },

    // --- GLOBAL SCAN SYNC ---
    async getGlobalScanResults(): Promise<{ date: string, results: StockResult[] } | null> {
        const stored = localStorage.getItem(DB_KEYS.GLOBAL_SCAN);
        return stored ? JSON.parse(stored) : null;
    },

    async updateGlobalScanResults(results: StockResult[]): Promise<void> {
        const today = new Date().toLocaleDateString("en-CA", {timeZone: "America/New_York"});
        const payload = { date: today, results: results };
        localStorage.setItem(DB_KEYS.GLOBAL_SCAN, JSON.stringify(payload));
    },

    // --- USER DATA METHODS ---
    async updateWatchlist(watchlist: string[]): Promise<void> {
        const sessionId = localStorage.getItem(DB_KEYS.SESSION);
        if (!sessionId) return;
        const users = getAllUsers();
        const idx = users.findIndex(u => u.id === sessionId);
        if (idx !== -1) {
            users[idx].watchlist = watchlist;
            // Update syncKey payload
            users[idx].syncKey = generateSyncKey(users[idx], users[idx].password);
            localStorage.setItem(DB_KEYS.USERS_DB, JSON.stringify(users));
        }
    },

    async updatePosition(position: Position): Promise<void> {
        const sessionId = localStorage.getItem(DB_KEYS.SESSION);
        if (!sessionId) return;
        const users = getAllUsers();
        const idx = users.findIndex(u => u.id === sessionId);
        if (idx !== -1) {
            const pIdx = users[idx].positions.findIndex((p: any) => p.ticker === position.ticker);
            if (pIdx >= 0) users[idx].positions[pIdx] = position;
            else users[idx].positions.unshift(position);
            
            users[idx].syncKey = generateSyncKey(users[idx], users[idx].password);
            localStorage.setItem(DB_KEYS.USERS_DB, JSON.stringify(users));
        }
    },

    async removePosition(ticker: string): Promise<void> {
        const sessionId = localStorage.getItem(DB_KEYS.SESSION);
        if (!sessionId) return;
        const users = getAllUsers();
        const idx = users.findIndex(u => u.id === sessionId);
        if (idx !== -1) {
            users[idx].positions = users[idx].positions.filter((p: any) => p.ticker !== ticker);
            users[idx].syncKey = generateSyncKey(users[idx], users[idx].password);
            localStorage.setItem(DB_KEYS.USERS_DB, JSON.stringify(users));
        }
    },

    async addRealizedTrade(trade: RealizedTrade): Promise<void> {
        const sessionId = localStorage.getItem(DB_KEYS.SESSION);
        if (!sessionId) return;
        const users = getAllUsers();
        const idx = users.findIndex(u => u.id === sessionId);
        if (idx !== -1) {
            if (!users[idx].realizedTrades) users[idx].realizedTrades = [];
            users[idx].realizedTrades.push(trade);
            users[idx].syncKey = generateSyncKey(users[idx], users[idx].password);
            localStorage.setItem(DB_KEYS.USERS_DB, JSON.stringify(users));
        }
    },

    async updatePortfolioStats(stats: { cashBalance: number; equityInvested: number }): Promise<void> {
        const sessionId = localStorage.getItem(DB_KEYS.SESSION);
        if (!sessionId) return;
        const users = getAllUsers();
        const idx = users.findIndex(u => u.id === sessionId);
        if (idx !== -1) {
            users[idx].portfolioStats = stats;
            users[idx].syncKey = generateSyncKey(users[idx], users[idx].password);
            localStorage.setItem(DB_KEYS.USERS_DB, JSON.stringify(users));
        }
    },

    async createAlert(alert: Omit<StockAlert, 'id' | 'createdAt' | 'active'>): Promise<StockAlert> {
        const stored = localStorage.getItem(DB_KEYS.ALERTS);
        const alerts = stored ? JSON.parse(stored) : [];
        const newAlert: StockAlert = {
            ...alert,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString(),
            active: true,
            triggered: false
        };
        alerts.push(newAlert);
        localStorage.setItem(DB_KEYS.ALERTS, JSON.stringify(alerts));
        return newAlert;
    },

    async removeAlert(id: string): Promise<void> {
        const stored = localStorage.getItem(DB_KEYS.ALERTS);
        if (!stored) return;
        let alerts = JSON.parse(stored);
        alerts = alerts.filter((a: any) => a.id !== id);
        localStorage.setItem(DB_KEYS.ALERTS, JSON.stringify(alerts));
    }
};
