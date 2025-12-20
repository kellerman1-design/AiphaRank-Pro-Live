
import { StockResult } from "../types";

const SCAN_KEY = 'alpharank_scanner_v1';

interface ScannerState {
  lastRunDate: string; // YYYY-MM-DD
  currentIndex: number;
  results: StockResult[];
}

export const scannerService = {
  // Initialize or Get State
  getState: (): ScannerState => {
    try {
      const now = new Date();
      const today = now.toLocaleDateString("en-CA", {timeZone: "America/New_York"});
      const currentHour = now.getHours(); // 0-23
      
      const stored = localStorage.getItem(SCAN_KEY);
      
      if (stored) {
        const parsed: ScannerState = JSON.parse(stored);
        
        // Smart Reset:
        // Only reset if the date has changed AND it is past 9:00 AM (New Trading Day).
        // This prevents the list from clearing at midnight during an overnight scan session.
        if (parsed.lastRunDate !== today) {
           if (currentHour >= 9) {
             // It is a new trading day (morning), reset logic.
             const newState: ScannerState = {
               lastRunDate: today,
               currentIndex: 0, // Start over
               results: []
             };
             scannerService.saveState(newState);
             return newState;
           } else {
             // We are in the "Overnight" zone (e.g., 1 AM).
             // Update the date to today so we don't check again this tick, 
             // but KEEP the results and index.
             parsed.lastRunDate = today;
             scannerService.saveState(parsed);
             return parsed;
           }
        }
        return parsed;
      }

      // Default State
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

  // Add a found Prime stock
  addResult: (stock: StockResult) => {
    const state = scannerService.getState();
    const existingIndex = state.results.findIndex(r => r.ticker === stock.ticker);
    
    if (existingIndex >= 0) {
        state.results[existingIndex] = stock;
    } else {
        state.results.push(stock);
    }
    
    scannerService.saveState(state);
    return state.results;
  },

  // Increment index for next run
  incrementIndex: (totalStocks: number) => {
    const state = scannerService.getState();
    const nextIndex = state.currentIndex + 1;
    
    // Stop at totalStocks to indicate completion (do not loop back to 0)
    // The reset logic in getState() will handle resetting to 0 the next day
    if (nextIndex <= totalStocks) {
        state.currentIndex = nextIndex;
        scannerService.saveState(state);
    }
    
    return state.currentIndex;
  },

  // Get just the index
  getCurrentIndex: (): number => {
    return scannerService.getState().currentIndex;
  },

  // Get just the results
  getResults: (): StockResult[] => {
    return scannerService.getState().results;
  }
};
