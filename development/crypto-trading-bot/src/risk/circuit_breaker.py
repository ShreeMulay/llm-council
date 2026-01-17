"""
Circuit Breaker Module

Emergency stop mechanisms that operate INDEPENDENTLY of trading strategy.
These are last-resort safety measures that bypass normal trading logic.

Circuit Breakers:
1. Flash Crash Detection - Emergency liquidation on rapid price drops
2. Max Drawdown - Halt trading when portfolio drops too much
3. Daily Loss Limit - Halt for the day on excessive losses
4. Connection Loss - Close positions on extended disconnection

CRITICAL: These must ALWAYS be checked before any trade execution!
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Callable, Awaitable

import structlog

from src.config import FLASH_CRASH_THRESHOLDS, RISK_CONFIG

logger = structlog.get_logger(__name__)


class CircuitBreakerState(Enum):
    """Current state of circuit breaker system."""
    NORMAL = "NORMAL"           # Trading allowed
    WARNING = "WARNING"         # Elevated risk, reduced position sizes
    HALTED = "HALTED"          # Trading halted, no new positions
    LIQUIDATING = "LIQUIDATING" # Emergency liquidation in progress
    EMERGENCY = "EMERGENCY"     # Manual intervention required


@dataclass
class PriceHistory:
    """Rolling price history for flash crash detection."""
    prices: list[tuple[float, Decimal]] = field(default_factory=list)  # (timestamp, price)
    max_history_seconds: int = 3600  # 1 hour
    
    def add_price(self, price: Decimal) -> None:
        """Add a new price observation."""
        now = datetime.now().timestamp()
        self.prices.append((now, price))
        
        # Cleanup old prices
        cutoff = now - self.max_history_seconds
        self.prices = [(t, p) for t, p in self.prices if t > cutoff]
    
    def get_price_at(self, seconds_ago: int) -> Decimal | None:
        """Get price from N seconds ago (approximate)."""
        if not self.prices:
            return None
        
        now = datetime.now().timestamp()
        target_time = now - seconds_ago
        
        # Find closest price to target time
        closest = min(self.prices, key=lambda x: abs(x[0] - target_time))
        
        # Only return if within 10% of target time
        if abs(closest[0] - target_time) < seconds_ago * 0.1:
            return closest[1]
        
        return None
    
    @property
    def current_price(self) -> Decimal | None:
        """Get most recent price."""
        if not self.prices:
            return None
        return self.prices[-1][1]


@dataclass
class CircuitBreakerStatus:
    """Current status of all circuit breakers."""
    state: CircuitBreakerState
    flash_crash_triggered: bool = False
    max_drawdown_triggered: bool = False
    daily_loss_triggered: bool = False
    connection_loss_triggered: bool = False
    
    halt_reason: str | None = None
    halt_time: datetime | None = None
    resume_time: datetime | None = None  # When auto-resume is allowed
    
    # Current metrics
    current_drawdown: Decimal = Decimal("0")
    daily_pnl: Decimal = Decimal("0")
    peak_value: Decimal = Decimal("0")


class CircuitBreaker:
    """
    Circuit breaker system for emergency trading halts.
    
    Usage:
        cb = CircuitBreaker(
            on_halt=my_halt_callback,
            on_liquidate=my_liquidate_callback,
        )
        
        # Check before every trade
        if not await cb.can_trade():
            return  # Trading halted
        
        # Update with market data
        await cb.update_price("BTC", current_price)
        await cb.update_portfolio(current_value, daily_pnl)
    """
    
    def __init__(
        self,
        on_halt: Callable[[str], Awaitable[None]] | None = None,
        on_liquidate: Callable[[], Awaitable[None]] | None = None,
        on_alert: Callable[[str, str], Awaitable[None]] | None = None,
    ):
        """
        Initialize circuit breaker.
        
        Args:
            on_halt: Callback when trading is halted (receives reason)
            on_liquidate: Callback to liquidate all positions
            on_alert: Callback for alerts (level, message)
        """
        self.on_halt = on_halt
        self.on_liquidate = on_liquidate
        self.on_alert = on_alert
        
        # Price history per asset
        self.price_history: dict[str, PriceHistory] = {}
        
        # Current status
        self.status = CircuitBreakerStatus(state=CircuitBreakerState.NORMAL)
        
        # Portfolio tracking
        self.peak_portfolio_value = Decimal("0")
        self.day_start_value = Decimal("0")
        self.last_portfolio_update = datetime.min
        
        # Connection tracking
        self.last_heartbeat = datetime.now()
        self.connection_timeout_seconds = 300  # 5 minutes
        
        # Lock for concurrent access
        self._lock = asyncio.Lock()
    
    async def can_trade(self) -> bool:
        """
        Check if trading is allowed.
        
        MUST be called before every trade decision!
        
        Returns:
            True if trading is allowed, False if halted
        """
        async with self._lock:
            return self.status.state == CircuitBreakerState.NORMAL
    
    async def update_price(self, asset: str, price: Decimal) -> None:
        """
        Update price and check for flash crash.
        
        Args:
            asset: Asset symbol (e.g., "BTC")
            price: Current price
        """
        async with self._lock:
            # Initialize history if needed
            if asset not in self.price_history:
                self.price_history[asset] = PriceHistory()
            
            history = self.price_history[asset]
            history.add_price(price)
            
            # Check flash crash thresholds
            await self._check_flash_crash(asset, price, history)
    
    async def _check_flash_crash(
        self,
        asset: str,
        current_price: Decimal,
        history: PriceHistory,
    ) -> None:
        """Check for flash crash conditions."""
        thresholds = {
            60: FLASH_CRASH_THRESHOLDS["1min_drop"],      # 1 minute
            300: FLASH_CRASH_THRESHOLDS["5min_drop"],     # 5 minutes
            3600: FLASH_CRASH_THRESHOLDS["1hour_drop"],   # 1 hour
        }
        
        for seconds, threshold in thresholds.items():
            past_price = history.get_price_at(seconds)
            if past_price is None:
                continue
            
            # Calculate percentage change
            pct_change = (current_price - past_price) / past_price
            
            if pct_change <= threshold:
                timeframe = f"{seconds // 60}min" if seconds >= 60 else f"{seconds}sec"
                await self._trigger_flash_crash(
                    asset, 
                    pct_change, 
                    timeframe,
                )
                return
    
    async def _trigger_flash_crash(
        self,
        asset: str,
        pct_change: Decimal,
        timeframe: str,
    ) -> None:
        """Trigger flash crash circuit breaker."""
        reason = f"FLASH CRASH: {asset} dropped {pct_change:.2%} in {timeframe}"
        
        logger.critical(
            "flash_crash_detected",
            asset=asset,
            pct_change=float(pct_change),
            timeframe=timeframe,
        )
        
        self.status.state = CircuitBreakerState.LIQUIDATING
        self.status.flash_crash_triggered = True
        self.status.halt_reason = reason
        self.status.halt_time = datetime.now()
        
        # Alert
        if self.on_alert:
            await self.on_alert("CRITICAL", reason)
        
        # Liquidate all positions
        if self.on_liquidate:
            await self.on_liquidate()
        
        # Set to halted after liquidation
        self.status.state = CircuitBreakerState.HALTED
        
        # Halt callback
        if self.on_halt:
            await self.on_halt(reason)
    
    async def update_portfolio(
        self,
        current_value: Decimal,
        daily_pnl: Decimal | None = None,
    ) -> None:
        """
        Update portfolio value and check drawdown/daily loss limits.
        
        Args:
            current_value: Current total portfolio value
            daily_pnl: Today's P&L (optional, calculated if not provided)
        """
        async with self._lock:
            now = datetime.now()
            
            # Reset day start on new day
            if self.last_portfolio_update.date() != now.date():
                self.day_start_value = current_value
            
            self.last_portfolio_update = now
            
            # Update peak
            if current_value > self.peak_portfolio_value:
                self.peak_portfolio_value = current_value
            
            # Calculate metrics
            if self.peak_portfolio_value > 0:
                drawdown = (self.peak_portfolio_value - current_value) / self.peak_portfolio_value
            else:
                drawdown = Decimal("0")
            
            if daily_pnl is None and self.day_start_value > 0:
                daily_pnl = (current_value - self.day_start_value) / self.day_start_value
            elif daily_pnl is None:
                daily_pnl = Decimal("0")
            
            self.status.current_drawdown = drawdown
            self.status.daily_pnl = daily_pnl
            self.status.peak_value = self.peak_portfolio_value
            
            # Check limits
            await self._check_drawdown_limit(drawdown)
            await self._check_daily_loss_limit(daily_pnl)
    
    async def _check_drawdown_limit(self, drawdown: Decimal) -> None:
        """Check max drawdown circuit breaker."""
        max_dd = RISK_CONFIG["max_drawdown"]
        
        if drawdown >= max_dd:
            reason = f"MAX DRAWDOWN: Portfolio down {drawdown:.2%} (limit: {max_dd:.2%})"
            
            logger.warning(
                "max_drawdown_triggered",
                drawdown=float(drawdown),
                limit=float(max_dd),
            )
            
            if self.status.state == CircuitBreakerState.NORMAL:
                self.status.state = CircuitBreakerState.HALTED
                self.status.max_drawdown_triggered = True
                self.status.halt_reason = reason
                self.status.halt_time = datetime.now()
                
                if self.on_alert:
                    await self.on_alert("ERROR", reason)
                
                if self.on_halt:
                    await self.on_halt(reason)
    
    async def _check_daily_loss_limit(self, daily_pnl: Decimal) -> None:
        """Check daily loss circuit breaker."""
        limit = RISK_CONFIG["daily_loss_limit"]
        
        if daily_pnl <= -limit:
            reason = f"DAILY LOSS LIMIT: Down {-daily_pnl:.2%} today (limit: {limit:.2%})"
            
            logger.warning(
                "daily_loss_limit_triggered",
                daily_pnl=float(daily_pnl),
                limit=float(limit),
            )
            
            if self.status.state == CircuitBreakerState.NORMAL:
                self.status.state = CircuitBreakerState.HALTED
                self.status.daily_loss_triggered = True
                self.status.halt_reason = reason
                self.status.halt_time = datetime.now()
                # Auto-resume at midnight
                tomorrow = datetime.now().replace(
                    hour=0, minute=0, second=0, microsecond=0
                ) + timedelta(days=1)
                self.status.resume_time = tomorrow
                
                if self.on_alert:
                    await self.on_alert("WARNING", reason)
                
                if self.on_halt:
                    await self.on_halt(reason)
    
    async def heartbeat(self) -> None:
        """
        Record heartbeat from IBKR connection.
        
        Call this periodically when connection is healthy.
        """
        async with self._lock:
            self.last_heartbeat = datetime.now()
            
            # Clear connection loss if it was triggered
            if self.status.connection_loss_triggered:
                self.status.connection_loss_triggered = False
                logger.info("connection_restored")
    
    async def check_connection(self) -> None:
        """
        Check if connection is healthy.
        
        Call this periodically to detect connection loss.
        """
        async with self._lock:
            elapsed = (datetime.now() - self.last_heartbeat).total_seconds()
            
            if elapsed > self.connection_timeout_seconds:
                reason = f"CONNECTION LOSS: No heartbeat for {elapsed:.0f} seconds"
                
                logger.error(
                    "connection_loss_detected",
                    elapsed_seconds=elapsed,
                )
                
                if not self.status.connection_loss_triggered:
                    self.status.connection_loss_triggered = True
                    
                    if self.on_alert:
                        await self.on_alert("ERROR", reason)
                    
                    # Don't halt, but maybe close positions
                    # This is configurable based on risk tolerance
    
    async def reset(self, force: bool = False) -> bool:
        """
        Attempt to reset circuit breaker to NORMAL state.
        
        Args:
            force: Force reset even if conditions aren't met
        
        Returns:
            True if reset successful, False otherwise
        """
        async with self._lock:
            if self.status.state == CircuitBreakerState.NORMAL:
                return True
            
            if not force:
                # Check if auto-resume conditions are met
                if self.status.resume_time and datetime.now() < self.status.resume_time:
                    logger.info(
                        "reset_denied",
                        resume_time=self.status.resume_time.isoformat(),
                    )
                    return False
                
                # Don't auto-reset flash crash
                if self.status.flash_crash_triggered:
                    logger.warning("reset_denied_flash_crash")
                    return False
            
            logger.info(
                "circuit_breaker_reset",
                previous_state=self.status.state.value,
                force=force,
            )
            
            # Reset status
            self.status = CircuitBreakerStatus(state=CircuitBreakerState.NORMAL)
            
            if self.on_alert:
                await self.on_alert("INFO", "Circuit breaker reset - trading resumed")
            
            return True
    
    def get_status(self) -> dict:
        """Get current circuit breaker status."""
        return {
            "state": self.status.state.value,
            "flash_crash_triggered": self.status.flash_crash_triggered,
            "max_drawdown_triggered": self.status.max_drawdown_triggered,
            "daily_loss_triggered": self.status.daily_loss_triggered,
            "connection_loss_triggered": self.status.connection_loss_triggered,
            "halt_reason": self.status.halt_reason,
            "halt_time": self.status.halt_time.isoformat() if self.status.halt_time else None,
            "resume_time": self.status.resume_time.isoformat() if self.status.resume_time else None,
            "current_drawdown": float(self.status.current_drawdown),
            "daily_pnl": float(self.status.daily_pnl),
            "peak_value": float(self.status.peak_value),
        }


# Global circuit breaker instance (initialized in main)
circuit_breaker: CircuitBreaker | None = None


def get_circuit_breaker() -> CircuitBreaker:
    """Get the global circuit breaker instance."""
    global circuit_breaker
    if circuit_breaker is None:
        circuit_breaker = CircuitBreaker()
    return circuit_breaker
