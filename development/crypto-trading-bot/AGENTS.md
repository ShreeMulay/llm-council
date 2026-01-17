# Crypto Trading Bot - AI Agent Guidelines

## Project Overview

**Name**: Crypto Trading Bot  
**Type**: Self-learning algorithmic trading system  
**Platform**: Interactive Brokers (IBKR) via Paxos  
**Starting Capital**: $1,000 (scaling on success)  
**Trading Pairs**: BTC/USD, ETH/USD

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Broker API** | `ib_async` (IBKR connection) |
| **Real-time DB** | Convex |
| **Vector DB** | Qdrant (pattern matching) |
| **ML Framework** | Stable Baselines3 (PPO/SAC) |
| **Backtesting** | VectorBT |
| **Indicators** | pandas-ta |
| **CLI** | Typer + Rich |
| **Alerts** | Discord Webhook |

## Coding Conventions

### Python Style
- **Python 3.11+** required
- **Type hints** on all functions
- **Async/await** for all I/O operations
- **Decimal** for all monetary calculations (never float!)
- **dataclasses** or **Pydantic** for data structures

```python
# CORRECT
from decimal import Decimal

async def calculate_position_size(
    capital: Decimal,
    risk_pct: Decimal,
    stop_distance: Decimal
) -> Decimal:
    """Calculate position size based on risk parameters."""
    return (capital * risk_pct) / stop_distance

# WRONG - Never use float for money!
def bad_calc(capital: float, risk: float) -> float:
    return capital * risk
```

### Error Handling
- **Never silently catch exceptions**
- **Log all errors** with context
- **Alert on critical failures**

```python
# CORRECT
try:
    await ibkr.place_order(order)
except IBKRConnectionError as e:
    logger.error(f"Order failed: {e}", extra={"order": order.to_dict()})
    await alert_critical(f"Order placement failed: {e}")
    raise
except IBKRRejectionError as e:
    logger.warning(f"Order rejected: {e.reason}")
    return OrderResult(success=False, reason=e.reason)

# WRONG
try:
    await ibkr.place_order(order)
except Exception:
    pass  # NEVER DO THIS
```

### File Organization
```
src/
├── data/           # Data collection, IBKR client
├── strategy/       # Trading signals, indicators
├── ml/             # RL models, training
├── risk/           # Position sizing, stops
├── tax/            # Tax lot tracking, HIFO
├── profit/         # P&L, reinvestment
└── monitoring/     # Health checks, alerts
```

## Critical Rules

### 1. Precision & Rounding
```python
# ALWAYS use exchange-specific precision
from config import ASSET_PRECISION

def round_quantity(qty: Decimal, asset: str) -> Decimal:
    step = ASSET_PRECISION[asset]['qty_step']
    return (qty // step) * step  # Round DOWN
```

### 2. Rate Limiting
```python
# ALWAYS respect IBKR rate limits
# Max 60 historical data requests per 10 minutes
# Max 50 concurrent requests
```

### 3. State Reconciliation
```python
# ALWAYS reconcile on startup
async def startup():
    if not await reconcile_state():
        logger.critical("State mismatch - halting")
        sys.exit(1)
```

### 4. Circuit Breakers
```python
# ALWAYS check circuit breakers before trading
if portfolio.drawdown_pct > MAX_DRAWDOWN:
    await halt_trading("Max drawdown exceeded")
    return
```

## Testing Requirements

- **Unit tests** for all indicator calculations
- **Integration tests** for IBKR connection
- **Backtest validation** before any strategy change
- **Paper trading** minimum 4 weeks before live

## Beads Issue Tracking

All work tracked via `bd` (Beads):
```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress
bd close <id>
bd sync               # Always run before ending session
```

## Environment Variables

Required in `.env`:
```bash
# IBKR
IBKR_HOST=127.0.0.1
IBKR_PORT=7497        # Paper: 7497, Live: 7496
IBKR_CLIENT_ID=1

# Convex
CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=...

# Alerts
DISCORD_WEBHOOK_URL=...

# Config
TRADING_MODE=paper    # paper or live
LOG_LEVEL=INFO
```

## Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Sharpe Ratio | > 1.0 | < 0.5 |
| Max Drawdown | < 15% | > 10% |
| Win Rate | > 50% | < 45% |
| Daily P&L | Positive | < -5% |

## Phase 1 Implementation Order (Council Recommended)

| Days | Tasks | Focus |
|------|-------|-------|
| 1-2 | Convex schema, Precision module | No IBKR needed |
| 1-3 | IBKR account setup (parallel) | External dependency |
| 3-5 | ib_async connection wrapper | Core connectivity |
| 5-6 | Rate limiter, Auto-restart | Reliability |
| 6-7 | Health monitoring | Observability |
| 7-9 | OHLCV data collector | Data pipeline |
| 9-14 | Startup reconciliation | Integration |

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
