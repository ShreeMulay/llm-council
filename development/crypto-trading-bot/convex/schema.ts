import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // PRICE DATA
  // ============================================
  
  /**
   * OHLCV candlestick data
   * Indexed for fast time-series queries
   */
  ohlcv: defineTable({
    asset: v.string(),           // "BTC", "ETH"
    timeframe: v.string(),       // "1m", "5m", "1h", "1d"
    timestamp: v.number(),       // Unix timestamp (ms)
    open: v.number(),
    high: v.number(),
    low: v.number(),
    close: v.number(),
    volume: v.number(),
    // Technical indicators (computed)
    adx: v.optional(v.number()),
    rsi: v.optional(v.number()),
    ema_fast: v.optional(v.number()),
    ema_slow: v.optional(v.number()),
    atr: v.optional(v.number()),
    bb_upper: v.optional(v.number()),
    bb_lower: v.optional(v.number()),
  })
    .index("by_asset_timeframe", ["asset", "timeframe"])
    .index("by_asset_timeframe_timestamp", ["asset", "timeframe", "timestamp"]),

  // ============================================
  // TRADING
  // ============================================
  
  /**
   * Trade execution log
   * Every order placed and filled
   */
  trades: defineTable({
    // Identifiers
    tradeId: v.string(),         // Unique trade ID
    ibkrOrderId: v.optional(v.number()), // IBKR order ID
    ibkrExecId: v.optional(v.string()),  // IBKR execution ID
    
    // Trade details
    asset: v.string(),           // "BTC", "ETH"
    side: v.string(),            // "BUY", "SELL"
    quantity: v.number(),        // Amount of asset
    price: v.number(),           // Execution price
    commission: v.number(),      // Fees paid
    
    // Timestamps
    signalTime: v.number(),      // When signal generated
    orderTime: v.number(),       // When order placed
    fillTime: v.optional(v.number()), // When filled
    
    // Strategy context
    strategy: v.string(),        // "TREND_FOLLOW", "MEAN_REVERSION"
    regime: v.string(),          // "TRENDING", "RANGING"
    adxValue: v.number(),        // ADX at signal time
    rlMultiplier: v.number(),    // RL position sizing (0.5-2.0)
    
    // Risk management
    stopLoss: v.optional(v.number()),
    takeProfit: v.optional(v.number()),
    riskAmount: v.number(),      // Dollar risk on trade
    
    // Status
    status: v.string(),          // "PENDING", "FILLED", "CANCELLED", "REJECTED"
    rejectReason: v.optional(v.string()),
    
    // Outcome (filled after close)
    pnl: v.optional(v.number()),
    pnlPct: v.optional(v.number()),
    holdingPeriodMs: v.optional(v.number()),
  })
    .index("by_asset", ["asset"])
    .index("by_status", ["status"])
    .index("by_fillTime", ["fillTime"]),

  // ============================================
  // TAX TRACKING
  // ============================================
  
  /**
   * Tax lots - each acquisition creates a lot
   */
  taxLots: defineTable({
    lotId: v.string(),           // Unique lot ID
    tradeId: v.string(),         // Reference to trades table
    
    asset: v.string(),
    acquiredAt: v.number(),      // Timestamp
    quantity: v.number(),        // Original quantity
    remainingQty: v.number(),    // After partial disposals
    costBasisPerUnit: v.number(),// Including fees
    totalCostBasis: v.number(),  // quantity * costBasisPerUnit
    
    // For HIFO matching
    isFullyDisposed: v.boolean(),
    
    // Wallet tracking (2025 IRS requirement)
    wallet: v.string(),          // "IBKR_PAXOS"
  })
    .index("by_asset", ["asset"])
    .index("by_asset_remaining", ["asset", "isFullyDisposed"])
    .index("by_costBasis", ["asset", "costBasisPerUnit"]),

  /**
   * Tax lot disposals - links sales to specific lots
   */
  taxLotDisposals: defineTable({
    disposalId: v.string(),
    lotId: v.string(),           // Reference to taxLots
    tradeId: v.string(),         // Reference to trades (sale)
    
    asset: v.string(),
    quantity: v.number(),        // Quantity disposed from this lot
    
    // Dates
    acquiredAt: v.number(),
    disposedAt: v.number(),
    holdingPeriodDays: v.number(),
    
    // Financials
    costBasis: v.number(),
    proceeds: v.number(),
    gainLoss: v.number(),
    
    // Classification
    isLongTerm: v.boolean(),     // Held > 365 days
    taxMethod: v.string(),       // "FIFO", "LIFO", "HIFO"
    
    // Tax year
    taxYear: v.number(),
  })
    .index("by_taxYear", ["taxYear"])
    .index("by_asset_year", ["asset", "taxYear"]),

  // ============================================
  // PORTFOLIO STATE
  // ============================================
  
  /**
   * Current positions
   * Single source of truth for holdings
   */
  positions: defineTable({
    asset: v.string(),           // "BTC", "ETH", "USD"
    quantity: v.number(),
    averageCost: v.number(),     // Average cost basis
    currentPrice: v.number(),
    unrealizedPnl: v.number(),
    unrealizedPnlPct: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_asset", ["asset"]),

  /**
   * P&L snapshots - periodic performance tracking
   */
  pnlSnapshots: defineTable({
    timestamp: v.number(),
    period: v.string(),          // "DAILY", "WEEKLY", "MONTHLY"
    
    // Portfolio value
    totalValue: v.number(),
    cashBalance: v.number(),
    positionsValue: v.number(),
    
    // Performance
    periodPnl: v.number(),
    periodPnlPct: v.number(),
    cumulativePnl: v.number(),
    cumulativePnlPct: v.number(),
    
    // Risk metrics
    sharpeRatio: v.optional(v.number()),
    sortinoRatio: v.optional(v.number()),
    maxDrawdown: v.number(),
    currentDrawdown: v.number(),
    
    // Trading stats
    tradesCount: v.number(),
    winCount: v.number(),
    lossCount: v.number(),
    winRate: v.number(),
    avgWin: v.number(),
    avgLoss: v.number(),
    profitFactor: v.optional(v.number()),
  })
    .index("by_period", ["period"])
    .index("by_timestamp", ["timestamp"]),

  // ============================================
  // PROFIT MANAGEMENT
  // ============================================
  
  /**
   * Reinvestment tracking
   * 20% of profits to BTC/ETH + IAUM
   */
  reinvestments: defineTable({
    timestamp: v.number(),
    
    // Source
    profitAmount: v.number(),    // Total profit being reinvested
    reinvestPct: v.number(),     // 0.20 (20%)
    reinvestAmount: v.number(),  // profitAmount * reinvestPct
    
    // Allocation
    cryptoAmount: v.number(),    // 50% to BTC/ETH
    goldAmount: v.number(),      // 50% to IAUM
    
    // Execution
    btcPurchased: v.optional(v.number()),
    ethPurchased: v.optional(v.number()),
    iaumPurchased: v.optional(v.number()),
    
    status: v.string(),          // "PENDING", "EXECUTED", "FAILED"
    executedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"]),

  // ============================================
  // ML MODEL STATE
  // ============================================
  
  /**
   * Model versioning and performance tracking
   */
  modelState: defineTable({
    modelId: v.string(),
    modelType: v.string(),       // "PPO", "SAC"
    version: v.number(),
    
    // Training info
    trainedAt: v.number(),
    trainEpisodes: v.number(),
    trainTimesteps: v.number(),
    
    // Validation metrics
    validationSharpe: v.number(),
    validationReturn: v.number(),
    validationDrawdown: v.number(),
    
    // Live performance
    liveStarted: v.optional(v.number()),
    liveSharpe: v.optional(v.number()),
    liveReturn: v.optional(v.number()),
    
    // Status
    status: v.string(),          // "TRAINING", "VALIDATING", "CHAMPION", "CHALLENGER", "RETIRED"
    promotedAt: v.optional(v.number()),
    retiredAt: v.optional(v.number()),
    retireReason: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_type_status", ["modelType", "status"]),

  // ============================================
  // MONITORING & ALERTS
  // ============================================
  
  /**
   * System alerts and notifications
   */
  alerts: defineTable({
    timestamp: v.number(),
    level: v.string(),           // "INFO", "WARNING", "ERROR", "CRITICAL"
    category: v.string(),        // "TRADE", "RISK", "CONNECTION", "MODEL", "TAX"
    message: v.string(),
    details: v.optional(v.string()), // JSON string with extra data
    
    // Notification status
    notified: v.boolean(),
    notifiedAt: v.optional(v.number()),
    notificationChannel: v.optional(v.string()), // "DISCORD", "EMAIL"
    
    // Acknowledgment
    acknowledged: v.boolean(),
    acknowledgedAt: v.optional(v.number()),
  })
    .index("by_level", ["level"])
    .index("by_category", ["category"])
    .index("by_unacknowledged", ["acknowledged"]),

  /**
   * Connection health tracking
   */
  connectionHealth: defineTable({
    timestamp: v.number(),
    
    // IBKR status
    ibkrConnected: v.boolean(),
    ibkrLatencyMs: v.optional(v.number()),
    ibkrLastHeartbeat: v.optional(v.number()),
    
    // Data freshness
    lastOhlcvUpdate: v.optional(v.number()),
    dataLagMs: v.optional(v.number()),
    
    // System health
    cpuUsagePct: v.optional(v.number()),
    memoryUsagePct: v.optional(v.number()),
    
    // Trading status
    tradingEnabled: v.boolean(),
    haltReason: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"]),

  // ============================================
  // CONFIGURATION
  // ============================================
  
  /**
   * Runtime configuration (editable without deploy)
   */
  config: defineTable({
    key: v.string(),
    value: v.string(),           // JSON-encoded value
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index("by_key", ["key"]),
});
