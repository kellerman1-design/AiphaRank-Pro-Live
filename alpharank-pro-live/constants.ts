
export const POPULAR_STOCKS = [
  // --- TECH LEADERS (NASDAQ) ---
  { symbol: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp', sector: 'Technology' },
  { symbol: 'AAPL', name: 'Apple Inc', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer Cyclical' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Communication Services' },
  { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Cyclical' },
  { symbol: 'AVGO', name: 'Broadcom Inc', sector: 'Technology' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
  { symbol: 'NFLX', name: 'Netflix', sector: 'Communication Services' },
  { symbol: 'ADBE', name: 'Adobe Inc', sector: 'Technology' },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Defensive' }, // Replacement for JWN
  { symbol: 'PEP', name: 'PepsiCo', sector: 'Consumer Defensive' }, // Replacement for K
  { symbol: 'ADSK', name: 'Autodesk', sector: 'Technology' }, // Replacement for ANSS
  { symbol: 'LULU', name: 'Lululemon', sector: 'Consumer Cyclical' }, // Replacement for SKX

  // --- NYSE GIANTS (NYSE) ---
  { symbol: 'V', name: 'Visa Inc', sector: 'Financial' },
  { symbol: 'MA', name: 'Mastercard', sector: 'Financial' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financial' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare' },
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare' },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy' },
  { symbol: 'WMT', name: 'Walmart Inc', sector: 'Consumer Defensive' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Defensive' },
  { symbol: 'ABBV', name: 'AbbVie Inc', sector: 'Healthcare' }, // Replacement for WBA
  { symbol: 'MRK', name: 'Merck & Co', sector: 'Healthcare' }, // Replacement for CTLT
  { symbol: 'BA', name: 'Boeing', sector: 'Industrials' }, // Replacement for SPR
  { symbol: 'AXP', name: 'American Express', sector: 'Financial' }, // Replacement for DFS
  { symbol: 'PLD', name: 'Prologis', sector: 'Real Estate' }, // Replacement for LSI
  { symbol: 'CAT', name: 'Caterpillar', sector: 'Industrials' },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Financial' },

  // --- GROWTH & MOMENTUM (NYSE/NASDAQ MIX) ---
  { symbol: 'PLTR', name: 'Palantir', sector: 'Technology' },
  { symbol: 'CRWD', name: 'CrowdStrike', sector: 'Technology' },
  { symbol: 'SQ', name: 'Block Inc', sector: 'Financial' },
  { symbol: 'SHOP', name: 'Shopify', sector: 'Technology' },
  { symbol: 'RDDT', name: 'Reddit', sector: 'Technology' },
  { symbol: 'UBER', name: 'Uber Technologies', sector: 'Technology' },
  { symbol: 'SNOW', name: 'Snowflake', sector: 'Technology' },
  { symbol: 'PANW', name: 'Palo Alto Networks', sector: 'Technology' },
  { symbol: 'MNDY', name: 'Monday.com', sector: 'Technology' },
  { symbol: 'HOOD', name: 'Robinhood', sector: 'Financial' },
  { symbol: 'DKNG', name: 'DraftKings', sector: 'Consumer Cyclical' },
  { symbol: 'COIN', name: 'Coinbase', sector: 'Financial' },

  // --- ENERGY & INDUSTRIALS ---
  { symbol: 'CVX', name: 'Chevron Corp', sector: 'Energy' },
  { symbol: 'SLB', name: 'Schlumberger', sector: 'Energy' },
  { symbol: 'GE', name: 'GE Aerospace', sector: 'Industrials' },
  { symbol: 'DE', name: 'Deere & Co', sector: 'Industrials' },
  { symbol: 'LMT', name: 'Lockheed Martin', sector: 'Industrials' },
  { symbol: 'RTX', name: 'RTX Corp', sector: 'Industrials' },

  // --- RETAIL & CONSUMER ---
  { symbol: 'NKE', name: 'Nike', sector: 'Consumer Cyclical' },
  { symbol: 'SBUX', name: 'Starbucks', sector: 'Consumer Cyclical' },
  { symbol: 'MCD', name: 'McDonald\'s', sector: 'Consumer Cyclical' },
  { symbol: 'TJX', name: 'TJX Companies', sector: 'Consumer Cyclical' },
  { symbol: 'HD', name: 'Home Depot', sector: 'Consumer Cyclical' },
  { symbol: 'LOW', name: 'Lowe\'s', sector: 'Consumer Cyclical' },

  // --- FINANCIALS ---
  { symbol: 'BAC', name: 'Bank of America', sector: 'Financial' },
  { symbol: 'WFC', name: 'Wells Fargo', sector: 'Financial' },
  { symbol: 'MS', name: 'Morgan Stanley', sector: 'Financial' },
  { symbol: 'BLK', name: 'BlackRock', sector: 'Financial' },

  // --- SEMICONDUCTORS ---
  { symbol: 'MU', name: 'Micron Technology', sector: 'Technology' },
  { symbol: 'INTC', name: 'Intel Corp', sector: 'Technology' },
  { symbol: 'AMAT', name: 'Applied Materials', sector: 'Technology' },
  { symbol: 'LRCX', name: 'Lam Research', sector: 'Technology' },
  { symbol: 'TXN', name: 'Texas Instruments', sector: 'Technology' },
  { symbol: 'QCOM', name: 'Qualcomm', sector: 'Technology' },

  // --- HEALTHCARE ---
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer', sector: 'Healthcare' },
  { symbol: 'TMO', name: 'Thermo Fisher', sector: 'Healthcare' },
  { symbol: 'ISRG', name: 'Intuitive Surgical', sector: 'Healthcare' },
  { symbol: 'GILD', name: 'Gilead Sciences', sector: 'Healthcare' },

  // --- ETFS ---
  { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'ETF' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', sector: 'ETF' },
  { symbol: 'IWM', name: 'Russell 2000 ETF', sector: 'ETF' },
  { symbol: 'XLE', name: 'Energy Sector ETF', sector: 'ETF' },
  { symbol: 'XLK', name: 'Tech Sector ETF', sector: 'ETF' },
  { symbol: 'XLF', name: 'Financial Sector ETF', sector: 'ETF' }
];
