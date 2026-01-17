"""
Crypto Trading Bot - Main Entry Point

Self-learning AI cryptocurrency trading system for IBKR.

Usage:
    python -m src.main           # Run the trading bot
    python -m src.main --health  # Run health server only
"""

import asyncio
import signal
import sys
from datetime import datetime

import structlog

from src.config import settings, TradingMode
from src.data.ibkr_client import get_ibkr_client
from src.risk.circuit_breaker import get_circuit_breaker, CircuitBreakerState
from src.monitoring.health import get_health_monitor, start_health_server, HealthStatus

logger = structlog.get_logger(__name__)


class TradingBot:
    """
    Main trading bot orchestrator.
    
    Coordinates all components:
    - IBKR connection
    - Data collection
    - Strategy execution
    - Risk management
    - Health monitoring
    """
    
    def __init__(self):
        self.ibkr = get_ibkr_client()
        self.circuit_breaker = get_circuit_breaker()
        self.health_monitor = get_health_monitor()
        
        self._running = False
        self._health_server = None
        self._shutdown_event = asyncio.Event()
    
    async def startup(self) -> bool:
        """
        Initialize and start all components.
        
        Returns:
            True if startup successful
        """
        logger.info(
            "bot_starting",
            trading_mode=settings.trading_mode.value,
            version="0.1.0",
        )
        
        # Start health server
        self._health_server = await start_health_server(port=8080)
        
        # Connect to IBKR
        logger.info("connecting_to_ibkr")
        connected = await self.ibkr.connect()
        
        if not connected:
            logger.error("ibkr_connection_failed")
            self.health_monitor.update_component(
                "ibkr_connection",
                HealthStatus.UNHEALTHY,
                "Failed to connect to IBKR",
            )
            return False
        
        self.health_monitor.update_component(
            "ibkr_connection",
            HealthStatus.HEALTHY,
            "Connected to IBKR",
        )
        
        # Perform startup reconciliation
        logger.info("performing_reconciliation")
        if not await self._reconcile_state():
            logger.error("reconciliation_failed")
            return False
        
        self.health_monitor.update_component(
            "reconciliation",
            HealthStatus.HEALTHY,
            "State reconciled",
        )
        
        # Setup circuit breaker callbacks
        self.circuit_breaker.on_halt = self._on_trading_halt
        self.circuit_breaker.on_liquidate = self._emergency_liquidate
        self.circuit_breaker.on_alert = self._send_alert
        
        logger.info("bot_started")
        return True
    
    async def _reconcile_state(self) -> bool:
        """
        Reconcile local state with IBKR.
        
        CRITICAL: Must be called on every startup!
        """
        try:
            # Get positions from IBKR
            positions = await self.ibkr.get_positions()
            
            # Get open orders
            open_orders = await self.ibkr.get_open_orders()
            
            logger.info(
                "state_reconciled",
                positions=len(positions),
                open_orders=len(open_orders),
            )
            
            # TODO: Compare with local database state
            # TODO: Cancel orphaned orders
            # TODO: Alert on mismatches
            
            return True
            
        except Exception as e:
            logger.error("reconciliation_error", error=str(e))
            return False
    
    async def _on_trading_halt(self, reason: str) -> None:
        """Handle trading halt from circuit breaker."""
        logger.warning("trading_halted", reason=reason)
        self.health_monitor.update_component(
            "trading",
            HealthStatus.UNHEALTHY,
            f"Trading halted: {reason}",
        )
    
    async def _emergency_liquidate(self) -> None:
        """Emergency liquidation of all positions."""
        logger.critical("emergency_liquidation")
        
        # Cancel all open orders
        cancelled = await self.ibkr.cancel_all_orders()
        logger.info("orders_cancelled", count=cancelled)
        
        # TODO: Market sell all positions
        # This requires implementing position liquidation
    
    async def _send_alert(self, level: str, message: str) -> None:
        """Send alert via configured channels."""
        logger.log(level.lower(), "alert", message=message)
        
        # TODO: Send to Discord webhook
        # TODO: Send email for critical alerts
    
    async def run(self) -> None:
        """
        Main bot loop.
        
        Runs until shutdown signal received.
        """
        self._running = True
        
        while self._running and not self._shutdown_event.is_set():
            try:
                # Check if trading is allowed
                if not await self.circuit_breaker.can_trade():
                    logger.debug("trading_halted_skipping_cycle")
                    await asyncio.sleep(10)
                    continue
                
                # Update health monitor
                await self.circuit_breaker.heartbeat()
                
                # TODO: Fetch latest market data
                # TODO: Calculate indicators
                # TODO: Generate signals
                # TODO: Execute trades
                
                # For now, just heartbeat
                logger.debug("bot_cycle_complete")
                
                # Wait before next cycle
                await asyncio.sleep(60)  # 1 minute cycles
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("bot_cycle_error", error=str(e))
                await asyncio.sleep(10)
    
    async def shutdown(self) -> None:
        """Graceful shutdown."""
        logger.info("bot_shutting_down")
        
        self._running = False
        self._shutdown_event.set()
        
        # Stop health server
        if self._health_server:
            await self._health_server.stop()
        
        # Disconnect from IBKR
        await self.ibkr.disconnect()
        
        logger.info("bot_shutdown_complete")


async def main() -> int:
    """Main entry point."""
    # Configure structured logging
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Create bot
    bot = TradingBot()
    
    # Setup signal handlers
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        logger.info("shutdown_signal_received")
        asyncio.create_task(bot.shutdown())
    
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, signal_handler)
    
    # Startup
    if not await bot.startup():
        logger.error("startup_failed")
        return 1
    
    # Run
    try:
        await bot.run()
    except Exception as e:
        logger.error("unhandled_error", error=str(e))
        return 1
    finally:
        await bot.shutdown()
    
    return 0


def main_sync():
    """Synchronous wrapper for main()."""
    sys.exit(asyncio.run(main()))


if __name__ == "__main__":
    main_sync()
