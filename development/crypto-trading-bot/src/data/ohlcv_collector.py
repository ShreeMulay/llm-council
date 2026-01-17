"""
OHLCV Data Collector

Collects candlestick data from IBKR for BTC and ETH.

Features:
- Historical backfill (configurable lookback)
- Real-time streaming updates
- Multiple timeframes (1m, 5m, 1h)
- Data quality validation
- Gap detection and filling
- Rate limit compliance via IBKRRateLimiter

Usage:
    collector = OHLCVCollector()
    await collector.start()
    
    # Backfill historical data
    await collector.backfill("BTC", "1h", days=30)
    
    # Start streaming (runs until stopped)
    await collector.stream_all()
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Callable, Awaitable

import structlog

from src.config import TRADING_PAIRS, settings
from src.data.ibkr_client import get_ibkr_client, IBKRClient
from src.data.rate_limiter import rate_limiter

logger = structlog.get_logger(__name__)


class Timeframe(str, Enum):
    """Supported OHLCОВИЧ timeframes."""
    M1 = "1m"    # 1 minute
    M5 = "5m"    # 5 minutes
    H1 = "1h"    # 1 hour


# IBKR bar size mapping
TIMEFRAME_TO_IBKR = {
    Timeframe.M1: "1 min",
    Timeframe.M5: "5 mins",
    Timeframe.H1: "1 hour",
}

# Duration string for backfill requests
TIMEFRAME_BACKFILL_DURATION = {
    Timeframe.M1: "1 D",     # 1 day of 1-min bars
    Timeframe.M5: "1 W",     # 1 week of 5-min bars  
    Timeframe.H1: "1 M",     # 1 month of 1-hour bars
}


@dataclass
class OHLCVBar:
    """Single OHLCV candlestick."""
    asset: str
    timeframe: str
    timestamp: int  # Unix ms
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dict for Convex storage."""
        return {
            "asset": self.asset,
            "timeframe": self.timeframe,
            "timestamp": self.timestamp,
            "open": float(self.open),
            "high": float(self.high),
            "low": float(self.low),
            "close": float(self.close),
            "volume": float(self.volume),
        }
    
    def validate(self) -> tuple[bool, str | None]:
        """
        Validate bar data quality.
        
        Returns:
            (is_valid, error_message)
        """
        # Check OHLC relationship: high >= max(open, close), low <= min(open, close)
        if self.high < max(self.open, self.close):
            return False, f"High {self.high} < max(open, close)"
        
        if self.low > min(self.open, self.close):
            return False, f"Low {self.low} > min(open, close)"
        
        # Check for zero or negative prices
        if any(p <= 0 for p in [self.open, self.high, self.low, self.close]):
            return False, "Price <= 0 detected"
        
        # Check for reasonable price range (no more than 50% intra-bar move for crypto)
        price_range_pct = (self.high - self.low) / self.low
        if price_range_pct > Decimal("0.50"):
            return False, f"Suspicious price range: {price_range_pct:.2%}"
        
        return True, None


@dataclass
class CollectorState:
    """State tracking for the collector."""
    is_running: bool = False
    last_bar_time: dict[str, dict[str, int]] = field(default_factory=dict)  # asset -> timeframe -> timestamp
    bars_collected: int = 0
    errors: int = 0
    last_error: str | None = None
    
    # Streaming state
    streaming_tasks: dict[str, asyncio.Task] = field(default_factory=dict)


class OHLCVCollector:
    """
    Collects and manages OHLCV data from IBKR.
    
    Handles both historical backfill and real-time streaming
    with proper rate limiting and data validation.
    """
    
    def __init__(
        self,
        client: IBKRClient | None = None,
        on_bar: Callable[[OHLCVBar], Awaitable[None]] | None = None,
        on_error: Callable[[Exception, str], Awaitable[None]] | None = None,
    ):
        """
        Initialize collector.
        
        Args:
            client: IBKR client (uses global if not provided)
            on_bar: Callback for each new bar (for storage/processing)
            on_error: Callback for errors
        """
        self.client = client or get_ibkr_client()
        self.on_bar = on_bar
        self.on_error = on_error
        self.state = CollectorState()
        
        # Initialize last bar times
        for asset in TRADING_PAIRS:
            self.state.last_bar_time[asset] = {}
    
    async def start(self) -> None:
        """Start the collector (ensure connection)."""
        if not self.client.is_connected:
            connected = await self.client.connect()
            if not connected:
                raise ConnectionError("Failed to connect to IBKR")
        
        self.state.is_running = True
        logger.info("ohlcv_collector_started")
    
    async def stop(self) -> None:
        """Stop the collector and all streaming tasks."""
        self.state.is_running = False
        
        # Cancel all streaming tasks
        for key, task in self.state.streaming_tasks.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self.state.streaming_tasks.clear()
        logger.info(
            "ohlcv_collector_stopped",
            bars_collected=self.state.bars_collected,
            errors=self.state.errors,
        )
    
    async def backfill(
        self,
        asset: str,
        timeframe: Timeframe | str,
        days: int | None = None,
        end_time: datetime | None = None,
    ) -> list[OHLCVBar]:
        """
        Backfill historical OHLCV data.
        
        Args:
            asset: Asset symbol ("BTC", "ETH")
            timeframe: Bar timeframe
            days: Number of days to backfill (overrides default)
            end_time: End time for backfill (default: now)
        
        Returns:
            List of collected bars
        
        Note:
            IBKR limits historical data requests. For extensive backfill,
            this may need to be called multiple times with different end_times.
        """
        if isinstance(timeframe, str):
            timeframe = Timeframe(timeframe)
        
        if not self.client.is_connected:
            raise ConnectionError("Not connected to IBKR")
        
        # Acquire rate limit
        await rate_limiter.acquire("historical", contract=asset)
        
        try:
            from ib_async import Crypto
            
            contract = Crypto(asset, "PAXOS", "USD")
            self.client._ib.qualifyContracts(contract)
            
            # Calculate duration
            if days:
                duration = f"{days} D"
            else:
                duration = TIMEFRAME_BACKFILL_DURATION[timeframe]
            
            # Set end time
            end_dt = end_time or datetime.now(timezone.utc)
            end_str = end_dt.strftime("%Y%m%d %H:%M:%S")
            
            logger.info(
                "backfill_starting",
                asset=asset,
                timeframe=timeframe.value,
                duration=duration,
                end_time=end_str,
            )
            
            # Request historical bars
            bars_data = await self.client._ib.reqHistoricalDataAsync(
                contract,
                endDateTime=end_str,
                durationStr=duration,
                barSizeSetting=TIMEFRAME_TO_IBKR[timeframe],
                whatToShow="MIDPOINT",  # Crypto uses MIDPOINT
                useRTH=False,  # Include extended hours
                formatDate=1,  # Unix timestamp
            )
            
            # Parse bars
            bars = []
            for bar in bars_data:
                ohlcv = self._parse_bar(asset, timeframe.value, bar)
                
                # Validate
                is_valid, error = ohlcv.validate()
                if not is_valid:
                    logger.warning(
                        "invalid_bar_skipped",
                        asset=asset,
                        timestamp=ohlcv.timestamp,
                        reason=error,
                    )
                    continue
                
                bars.append(ohlcv)
                
                # Callback
                if self.on_bar:
                    await self.on_bar(ohlcv)
            
            self.state.bars_collected += len(bars)
            
            # Update last bar time
            if bars:
                self.state.last_bar_time[asset][timeframe.value] = max(
                    b.timestamp for b in bars
                )
            
            logger.info(
                "backfill_complete",
                asset=asset,
                timeframe=timeframe.value,
                bars_count=len(bars),
            )
            
            return bars
            
        except Exception as e:
            self.state.errors += 1
            self.state.last_error = str(e)
            logger.error(
                "backfill_failed",
                asset=asset,
                timeframe=timeframe.value if isinstance(timeframe, Timeframe) else timeframe,
                error=str(e),
            )
            
            if self.on_error:
                await self.on_error(e, f"backfill_{asset}_{timeframe}")
            
            raise
            
        finally:
            rate_limiter.release()
    
    async def backfill_all(self, days: int = 30) -> dict[str, int]:
        """
        Backfill all assets and timeframes.
        
        Args:
            days: Days of history to fetch
        
        Returns:
            Dict of {asset_timeframe: bars_count}
        """
        results = {}
        
        for asset in TRADING_PAIRS:
            for timeframe in Timeframe:
                key = f"{asset}_{timeframe.value}"
                try:
                    bars = await self.backfill(asset, timeframe, days=days)
                    results[key] = len(bars)
                except Exception as e:
                    logger.error(f"Backfill failed for {key}: {e}")
                    results[key] = 0
                
                # Small delay between requests to be nice to IBKR
                await asyncio.sleep(1)
        
        return results
    
    async def stream(self, asset: str, timeframe: Timeframe | str) -> None:
        """
        Start streaming real-time bars for an asset/timeframe.
        
        This runs until stop() is called or an error occurs.
        """
        if isinstance(timeframe, str):
            timeframe = Timeframe(timeframe)
        
        if not self.client.is_connected:
            raise ConnectionError("Not connected to IBKR")
        
        key = f"{asset}_{timeframe.value}"
        
        try:
            from ib_async import Crypto
            
            contract = Crypto(asset, "PAXOS", "USD")
            self.client._ib.qualifyContracts(contract)
            
            logger.info(
                "streaming_started",
                asset=asset,
                timeframe=timeframe.value,
            )
            
            # Subscribe to real-time bars
            bars_stream = self.client._ib.reqRealTimeBars(
                contract,
                barSize=5,  # 5-second bars (minimum for crypto)
                whatToShow="MIDPOINT",
                useRTH=False,
            )
            
            # For 1m+ timeframes, we aggregate 5-second bars
            aggregator = BarAggregator(asset, timeframe, self.on_bar)
            
            # Listen for updates
            bars_stream.updateEvent += lambda bars, hasNewBar: asyncio.create_task(
                self._handle_realtime_bar(aggregator, bars, hasNewBar)
            )
            
            # Keep running until stopped
            while self.state.is_running:
                await asyncio.sleep(1)
            
        except asyncio.CancelledError:
            logger.info(f"Streaming cancelled for {key}")
            raise
            
        except Exception as e:
            self.state.errors += 1
            self.state.last_error = str(e)
            logger.error(
                "streaming_error",
                asset=asset,
                timeframe=timeframe.value,
                error=str(e),
            )
            
            if self.on_error:
                await self.on_error(e, f"stream_{key}")
            
            raise
    
    async def _handle_realtime_bar(
        self,
        aggregator: "BarAggregator",
        bars: Any,
        has_new_bar: bool,
    ) -> None:
        """Handle incoming real-time bar update."""
        if not has_new_bar:
            return
        
        try:
            # Get the latest bar
            if bars:
                bar = bars[-1]
                await aggregator.add_tick(bar)
                self.state.bars_collected += 1
                
        except Exception as e:
            logger.error("realtime_bar_error", error=str(e))
    
    async def stream_all(self) -> None:
        """
        Start streaming all assets and timeframes.
        
        Runs until stop() is called.
        """
        tasks = []
        
        for asset in TRADING_PAIRS:
            for timeframe in Timeframe:
                key = f"{asset}_{timeframe.value}"
                task = asyncio.create_task(
                    self.stream(asset, timeframe),
                    name=f"stream_{key}",
                )
                self.state.streaming_tasks[key] = task
                tasks.append(task)
        
        # Wait for all tasks (they run until stopped)
        try:
            await asyncio.gather(*tasks)
        except asyncio.CancelledError:
            pass
    
    def _parse_bar(self, asset: str, timeframe: str, bar: Any) -> OHLCVBar:
        """Parse IBKR bar object to OHLCVBar."""
        # Handle both historical and real-time bar formats
        if hasattr(bar, 'date'):
            # Historical bar
            if isinstance(bar.date, datetime):
                timestamp = int(bar.date.timestamp() * 1000)
            else:
                # Unix timestamp
                timestamp = int(bar.date) * 1000
        elif hasattr(bar, 'time'):
            # Real-time bar
            timestamp = int(bar.time.timestamp() * 1000)
        else:
            timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        
        return OHLCVBar(
            asset=asset,
            timeframe=timeframe,
            timestamp=timestamp,
            open=Decimal(str(bar.open)),
            high=Decimal(str(bar.high)),
            low=Decimal(str(bar.low)),
            close=Decimal(str(bar.close)),
            volume=Decimal(str(bar.volume)) if hasattr(bar, 'volume') and bar.volume else Decimal("0"),
        )
    
    def get_stats(self) -> dict[str, Any]:
        """Get collector statistics."""
        return {
            "is_running": self.state.is_running,
            "bars_collected": self.state.bars_collected,
            "errors": self.state.errors,
            "last_error": self.state.last_error,
            "last_bar_times": self.state.last_bar_time,
            "active_streams": list(self.state.streaming_tasks.keys()),
            "rate_limiter": rate_limiter.get_stats(),
        }


class BarAggregator:
    """
    Aggregates lower-timeframe bars into higher-timeframe bars.
    
    IBKR only provides 5-second real-time bars for crypto.
    This class aggregates them into 1m, 5m, or 1h bars.
    """
    
    def __init__(
        self,
        asset: str,
        timeframe: Timeframe,
        on_bar: Callable[[OHLCVBar], Awaitable[None]] | None = None,
    ):
        self.asset = asset
        self.timeframe = timeframe
        self.on_bar = on_bar
        
        # Timeframe in seconds
        self.period_seconds = {
            Timeframe.M1: 60,
            Timeframe.M5: 300,
            Timeframe.H1: 3600,
        }[timeframe]
        
        # Current bar being built
        self.current_bar: OHLCVBar | None = None
        self.current_period_start: int = 0
    
    async def add_tick(self, bar: Any) -> OHLCVBar | None:
        """
        Add a tick (5-second bar) to the aggregator.
        
        Returns:
            Completed bar if period ended, None otherwise
        """
        # Get timestamp
        if hasattr(bar, 'time'):
            timestamp = int(bar.time.timestamp() * 1000)
        else:
            timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        
        # Calculate period start
        period_start = (timestamp // (self.period_seconds * 1000)) * (self.period_seconds * 1000)
        
        # Check if new period
        if period_start != self.current_period_start:
            # Emit previous bar if exists
            completed_bar = self.current_bar
            
            # Start new bar
            self.current_bar = OHLCVBar(
                asset=self.asset,
                timeframe=self.timeframe.value,
                timestamp=period_start,
                open=Decimal(str(bar.open)),
                high=Decimal(str(bar.high)),
                low=Decimal(str(bar.low)),
                close=Decimal(str(bar.close)),
                volume=Decimal(str(bar.volume)) if hasattr(bar, 'volume') else Decimal("0"),
            )
            self.current_period_start = period_start
            
            # Callback for completed bar
            if completed_bar and self.on_bar:
                await self.on_bar(completed_bar)
            
            return completed_bar
        
        # Update current bar
        if self.current_bar:
            self.current_bar.high = max(self.current_bar.high, Decimal(str(bar.high)))
            self.current_bar.low = min(self.current_bar.low, Decimal(str(bar.low)))
            self.current_bar.close = Decimal(str(bar.close))
            if hasattr(bar, 'volume'):
                self.current_bar.volume += Decimal(str(bar.volume))
        
        return None


# Global collector instance
_collector: OHLCVCollector | None = None


def get_ohlcv_collector() -> OHLCVCollector:
    """Get or create the global OHLCV collector instance."""
    global _collector
    if _collector is None:
        _collector = OHLCVCollector()
    return _collector
