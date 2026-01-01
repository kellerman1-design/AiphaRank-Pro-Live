
import { StockResult } from "../types";
import { backendService } from "./backendService";

const SCAN_KEY = 'alpharank_scanner_v1';

interface ScannerState {
  lastRunDate: string; // YYYY-MM-DD
  currentIndex: number;
  results: StockResult[];
}

export const scannerService = {
  
  // Sync local results to "Cloud"
  async syncToCloud() {
      const state = scannerService.getState();
      if (state.results.length > 0) {
          await backendService.updateGlobalScanResults(state.results);
      }
  },

  // Pull latest results from "Cloud"
  async fetchFromCloud(): Promise<StockResult[]> {
      const cloudData = await backendService.getGlobalScanResults();
      const today = new Date().toLocaleDateString("en-CA", {timeZone: "America/New_York"});
      
      if (cloudData && cloudData.results.length > 0) {
          const state = scannerService.getState();
          state.results = cloudData.results;
          state.lastRunDate = cloudData.date;
          scannerService.saveState(state);
          return cloudData.results;
      }
      return [];
  },

  getState: (): ScannerState => {
    try {
      const now = new Date();
      const today = now.toLocaleDateString("en-CA", {timeZone: "America/New_York"});
      const currentHour = now.getHours(); 
      
      const stored = localStorage.getItem(SCAN_KEY);
      
      if (stored) {
        const parsed: ScannerState = JSON.parse(stored);
        
        if (parsed.lastRunDate !== today) {
           if (currentHour >= 9) {
             const newState: ScannerState = {
               lastRunDate: today,
               currentIndex: 0,
               results: []
             };
             scannerService.saveState(newState);
             return newState;
           } else {
             parsed.lastRunDate = today;
             scannerService.saveState(parsed);
             return parsed;
           }
        }
        return parsed;
      }

      return {
        lastRunDate: today,
        currentIndex: 0,
        results: []
      };
    } catch (e) {
      return { lastRunDate: "", currentIndex: 0, results: [] };
    }
  },

  saveState: (state: ScannerState) => {
    try {
      localStorage.setItem(SCAN_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Scanner storage full", e);
    }
  },

  addResult: (stock: StockResult) => {
    const state = scannerService.getState();
    const existingIndex = state.results.findIndex(r => r.ticker === stock.ticker);
    
    if (existingIndex >= 0) {
        state.results[existingIndex] = stock;
    } else {
        state.results.push(stock);
    }
    
    scannerService.saveState(state);
    // Silent cloud sync after each result added (or wait for complete)
    return state.results;
  },

  getResults: (): StockResult[] => {
    return scannerService.getState().results;
  }
};
