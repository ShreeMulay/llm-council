# Crypto Trading Bot - Project Specification

## Vision

Build a **self-learning, fully automated cryptocurrency trading bot** that:
1. Trades BTC and ETH on Interactive Brokers via Paxos
2. Uses ADX regime filtering for signal generation
3. Employs reinforcement learning for position sizing optimization
4. Tracks taxes automatically with HIFO lot matching
5. Reinvests 20% of profits into BTC/ETH and gold (IAUM)
6. Scales capital as performance proves successful

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Broker** | IBKR via Paxos | 0.12-0.18% fees, legitimate, API access |
| **Starting Capital** | $1,000 | Sufficient for testing, manageable risk |
| **Trading Pairs** | BTC/USD, ETH/USD | Most liquid, best data availability |
| **Strategy** | ADX Regime Filter | Research-backed, Sharpe >1.0 achievable |
| **RL Role** | Position sizing only (0.5-2.0x) | Augment, don't replace rule-based |
| **Tax Method** | HIFO | Minimize taxes by selling highest cost first |
| **Reinvestment** | Weekly 20% | Capture gains, diversify to gold |
| **Hosting** | Hetzner CX22 (Ashburn) | $6.49/mo, 4GB RAM, 40ms to IBKR |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MONITORING LAYER                           │
│   Dashboard (Shadcn/ui) │ CLI (Typer) │ Alerts (Discord)       │
├─────────────────────────────────────────────────────────────────┤
│                    PROFIT MANAGEMENT                            │
│   Tax Tracker (HIFO) │ Reinvestor (Weekly) │ P&L Reporter      │
├─────────────────────────────────────────────────────────────────┤
│                   CONTINUOUS LEARNING                           │
│   Drift Detection │ Auto Retrain │ Walk-Forward Validation     │
├─────────────────────────────────────────────────────────────────┤
│                    INTELLIGENCE LAYER                           │
│   ┌─────────────────────────┐  ┌────────────────────────────┐  │
│   │ Rule-Based Strategy     │  │ RL Augmentation            │  │
│   │ • ADX Regime Detection  │  │ • Position Sizing (PPO)    │  │
│   │ • Trend Follow (EMA)    │  │ • 0.5x - 2.0x multiplier   │  │
│   │ • Mean Reversion (RSI)  │  │                            │  │
│   └─────────────────────────┘  └────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                   RISK & EXECUTION                              │
│   Position Sizer (2% risk) │ Stop Loss (ATR) │ IBKR Orders     │
├─────────────────────────────────────────────────────────────────┤
│                      DATA LAYER                                 │
│   IBKR Gateway (ib_async) │ Convex (state) │ Qdrant (patterns) │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend (Python 3.11+)
- **ib_async** - IBKR API connection
- **Convex** - Real-time database
- **Stable Baselines3** - RL (PPO/SAC)
- **pandas-ta** - Technical indicators
- **VectorBT** - Backtesting
- **Qdrant** - Vector similarity for pattern matching

### Frontend (Optional Phase 7)
- **React 19** + Server Components
- **Shadcn/ui v4** - Component library
- **Tailwind CSS v4** - Styling
- **Recharts** - Performance charts

### Infrastructure
- **Hetzner CX22** - VPS ($6.49/mo)
- **systemd** - Service management
- **IBC** - TWS Gateway auto-restart

## Risk Controls

| Control | Trigger | Action |
|---------|---------|--------|
| Max Drawdown | 15% from peak | Halt all trading |
| Daily Loss | 5% in single day | Halt for day |
| Position Limit | >33% in single asset | Block new buys |
| Flash Crash | >5% drop in 1 min | Emergency liquidate |
| Connection Loss | >5 min disconnect | Close positions |
| Model Drift | Sharpe <0.5 for 2 weeks | Trigger retrain |

## Configuration

```python
CONFIG = {
    # Trading
    "TRADING_PAIRS": ["BTC/USD", "ETH/USD"],
    "MIN_TRADE_USD": 350,
    "MAX_POSITION_PCT": 0.33,
    
    # Risk
    "RISK_PER_TRADE": 0.02,
    "MAX_DRAWDOWN": 0.15,
    "STOP_LOSS_ATR_MULT": 2.0,
    
    # Strategy
    "ADX_THRESHOLD": 25,
    "ADX_PERIOD": 14,
    "EMA_FAST": 12,
    "EMA_SLOW": 26,
    "RSI_PERIOD": 14,
    
    # RL
    "RL_SIZING_MIN": 0.5,
    "RL_SIZING_MAX": 2.0,
    
    # Profit
    "REINVEST_PCT": 0.20,
    "REINVEST_FREQUENCY": "weekly",
    
    # Tax
    "TAX_METHOD": "HIFO",
}
```

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- IBKR account setup + TWS Gateway
- Convex schema deployment
- ib_async connection wrapper
- OHLCV data collector
- Rate limiter, health monitoring
- Startup state reconciliation

### Phase 2: Core Strategy (Weeks 3-4)
- ADX indicator calculation
- Trend following (EMA crossover)
- Mean reversion (RSI + Bollinger)
- Regime detector
- Position sizing, stop loss
- Backtest framework

### Phase 3: RL Infrastructure (Weeks 5-6)
- Gymnasium trading environment
- State/action space design
- Sharpe-based reward function
- PPO training pipeline
- Walk-forward validation
- RL integration with strategy

### Phase 4: Tax & Compliance (Weeks 7-8)
- Tax lot creation
- HIFO matching algorithm
- Cost basis tracking
- Tax-loss harvesting
- Form 8949 export

### Phase 5: Continuous Learning (Weeks 9-10)
- Trade outcome logging
- Drift detection
- Auto-retrain triggers
- Model versioning
- Champion/challenger A/B testing

### Phase 6: Profit Management (Week 11)
- Weekly P&L snapshots
- Profit reinvestment calculator
- BTC/ETH purchase automation
- IAUM ETF purchase
- Reinvestment ledger

### Phase 7: Monitoring & Go-Live (Week 12+)
- CLI dashboard
- Web dashboard (optional)
- Alert system
- VPS deployment
- Paper trading validation
- Live trading switch

## Success Criteria

### Paper Trading (4+ weeks required)
- [ ] Sharpe Ratio > 1.0
- [ ] Max Drawdown < 10%
- [ ] Win Rate > 50%
- [ ] All systems operational 99%+ uptime

### Live Trading Scaling
- 10% capital ($100) → 2 profitable weeks
- 25% capital ($250) → 2 more profitable weeks
- 50% capital ($500) → 2 more profitable weeks
- 100% capital ($1,000) → ongoing

### Capital Scaling
User will add more capital as bot proves successful:
- $1K → $5K after 3 months profitable
- $5K → $10K+ based on continued success
