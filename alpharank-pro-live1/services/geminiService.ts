// Gemini API integration has been removed.
// This file is kept as a placeholder if future AI features are needed.

export interface MarketSentiment {
  summary: string;
  sources: { title: string; uri: string }[];
}

export const getMarketSentiment = async (ticker: string): Promise<MarketSentiment> => {
    return { 
      summary: "AI Market analysis is currently disabled.", 
      sources: [] 
    };
};
