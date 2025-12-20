
import { UserProfile, StockAlert, Position } from "../types";

/**
 * BACKEND SERVICE ABSTRACTION
 * 
 * This service simulates a real REST API backend.
 * In a production environment, these methods would call fetch() to a Node/Python server.
 * Currently, it uses LocalStorage with async wrappers to simulate network latency.
 */

const DB_KEYS = {
    USER: 'alpharank_user',
    ALERTS: 'alpharank_alerts',
    SCANNER: 'alpharank_scanner_v1'
};

const SIMULATED_LATENCY = 300; // ms

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const backendService = {
    
    // --- USER ENDPOINTS ---

    async getUser(): Promise<UserProfile | null> {
        await delay(SIMULATED_LATENCY);
        try {
            const stored = localStorage.getItem(DB_KEYS.USER);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (!parsed.positions) parsed.positions = [];
                return parsed;
            }
            return null;
        } catch (e) {
            console.error("Backend Error: getUser", e);
            throw new Error("Failed to fetch user");
        }
    },

    async loginOrRegister(email: string, name: string, photoURL?: string): Promise<UserProfile> {
        await delay(SIMULATED_LATENCY);
        // Simulate finding user in DB or creating new
        let user: UserProfile = {
            id: Math.random().toString(36).substr(2, 9),
            email,
            name,
            photoURL,
            watchlist: ['NVDA', 'MSFT', 'AAPL', 'TSLA', 'AMD'],
            positions: []
        };

        const existing = localStorage.getItem(DB_KEYS.USER);
        if (existing) {
            const parsed = JSON.parse(existing);
            if (parsed.email === email) {
                user = { ...parsed, name, photoURL }; // Update profile
            }
        }
        
        localStorage.setItem(DB_KEYS.USER, JSON.stringify(user));
        return user;
    },

    async logout(): Promise<void> {
        await delay(100);
        localStorage.removeItem(DB_KEYS.USER);
    },

    async updateWatchlist(watchlist: string[]): Promise<void> {
        // Optimistic update in UI, actual update here
        const user = await this.getUser();
        if (user) {
            user.watchlist = watchlist;
            localStorage.setItem(DB_KEYS.USER, JSON.stringify(user));
        }
    },

    // --- POSITIONS ENDPOINTS ---

    async updatePosition(position: Position): Promise<void> {
        const user = await this.getUser();
        if (user) {
            const existingIdx = user.positions.findIndex(p => p.ticker === position.ticker);
            if (existingIdx >= 0) {
                user.positions[existingIdx] = position;
            } else {
                user.positions.unshift(position);
            }
            localStorage.setItem(DB_KEYS.USER, JSON.stringify(user));
        }
    },

    async removePosition(ticker: string): Promise<void> {
        const user = await this.getUser();
        if (user) {
            user.positions = user.positions.filter(p => p.ticker !== ticker);
            localStorage.setItem(DB_KEYS.USER, JSON.stringify(user));
        }
    },

    // --- ALERTS ENDPOINTS ---

    async getAlerts(): Promise<StockAlert[]> {
        await delay(SIMULATED_LATENCY);
        const stored = localStorage.getItem(DB_KEYS.ALERTS);
        return stored ? JSON.parse(stored) : [];
    },

    async createAlert(alert: Omit<StockAlert, 'id' | 'createdAt' | 'active'>): Promise<StockAlert> {
        const alerts = await this.getAlerts();
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

    async deleteAlert(id: string): Promise<void> {
        let alerts = await this.getAlerts();
        alerts = alerts.filter(a => a.id !== id);
        localStorage.setItem(DB_KEYS.ALERTS, JSON.stringify(alerts));
    },

    async markAlertTriggered(id: string): Promise<void> {
        const alerts = await this.getAlerts();
        const index = alerts.findIndex(a => a.id === id);
        if (index !== -1) {
            alerts[index].triggered = true;
            localStorage.setItem(DB_KEYS.ALERTS, JSON.stringify(alerts));
        }
    }
};
