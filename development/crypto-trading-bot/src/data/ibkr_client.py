"""
IBKR Client Wrapper

Robust connection handling for Interactive Brokers API using ib_async.

Features:
- Automatic reconnection with exponential backoff
- Heartbeat monitoring
- Connection state management
- Request rate limiting integration
- Startup reconciliation support

Usage:
    client = IBKRClient()
    await client.connect()
    
    # Get positions
    positions = await client.get_positions()
    
    # Place order
    trade = await client.place_order(order)
    
    # Disconnect
    await client.disconnect()
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Callable, Awaitable

import structlog

from src.config import settings, TradingMode, TRADING_PAIRS

logger = structlog.get_logger(__name__)


class ConnectionState(Enum):
    """IBKR connection states."""
    DISCONNECTED = "DISCONNECTED"
    CONNECTING = "CONNECTING"
    CONNECTED = "CONNECTED"
    RECONNECTING = "RECONNECTING"
    ERROR = "ERROR"


@dataclass
class ConnectionConfig:
    """IBKR connection configuration."""
    host: str = "127.0.0.1"
    port: int = 7497  # Paper: 7497, Live: 7496
    client_id: int = 1
    timeout: int = 30
    readonly: bool = False
    
    # Reconnection settings
    max_reconnect_attempts: int = 10
    initial_reconnect_delay: float = 1.0
    max_reconnect_delay: float = 60.0
    reconnect_backoff_factor: float = 2.0


@dataclass 
class OrderParams:
    """Parameters for order placement."""
    asset: str
    side: str  # "BUY" or "SELL"
    quantity: Decimal
    order_type: str = "LMT"  # LMT, MKT, STP, etc.
    limit_price: Decimal | None = None
    stop_price: Decimal | None = None
    tif: str = "GTC"  # GTC, DAY, IOC, etc.
    
    # Bracket order params
    take_profit: Decimal | None = None
    stop_loss: Decimal | None = None


@dataclass
class Position:
    """Current position information."""
    asset: str
    quantity: Decimal
    average_cost: Decimal
    market_value: Decimal
    unrealized_pnl: Decimal
    realized_pnl: Decimal


@dataclass
class TradeResult:
    """Result of order placement."""
    success: bool
    order_id: int | None = None
    status: str = ""
    message: str = ""
    filled_quantity: Decimal = Decimal("0")
    average_fill_price: Decimal = Decimal("0")


class IBKRClient:
    """
    Async IBKR client with robust connection handling.
    
    This is a wrapper around ib_async that adds:
    - Automatic reconnection
    - Rate limiting
    - Heartbeat monitoring
    - State reconciliation
    """
    
    def __init__(
        self,
        config: ConnectionConfig | None = None,
        on_connected: Callable[[], Awaitable[None]] | None = None,
        on_disconnected: Callable[[str], Awaitable[None]] | None = None,
        on_error: Callable[[Exception], Awaitable[None]] | None = None,
    ):
        """
        Initialize IBKR client.
        
        Args:
            config: Connection configuration
            on_connected: Callback when connection established
            on_disconnected: Callback when connection lost (with reason)
            on_error: Callback on errors
        """
        self.config = config or self._default_config()
        self.on_connected = on_connected
        self.on_disconnected = on_disconnected
        self.on_error = on_error
        
        # Connection state
        self.state = ConnectionState.DISCONNECTED
        self._ib: Any = None  # Will be ib_async.IB instance
        self._reconnect_attempts = 0
        self._last_heartbeat = datetime.min
        
        # Background tasks
        self._heartbeat_task: asyncio.Task | None = None
        self._reconnect_lock = asyncio.Lock()
    
    def _default_config(self) -> ConnectionConfig:
        """Get default config from settings."""
        port = (
            settings.ibkr_port_paper 
            if settings.trading_mode == TradingMode.PAPER 
            else settings.ibkr_port_live
        )
        return ConnectionConfig(
            host=settings.ibkr_host,
            port=port,
            client_id=settings.ibkr_client_id,
        )
    
    @property
    def is_connected(self) -> bool:
        """Check if connected to IBKR."""
        return (
            self.state == ConnectionState.CONNECTED 
            and self._ib is not None 
            and self._ib.isConnected()
        )
    
    async def connect(self) -> bool:
        """
        Connect to IBKR TWS/Gateway.
        
        Returns:
            True if connection successful, False otherwise
        """
        if self.is_connected:
            logger.debug("already_connected")
            return True
        
        self.state = ConnectionState.CONNECTING
        
        try:
            # Import ib_async here to allow graceful degradation
            from ib_async import IB
            
            self._ib = IB()
            
            # Set up event handlers
            self._ib.connectedEvent += self._on_connected
            self._ib.disconnectedEvent += self._on_disconnected
            self._ib.errorEvent += self._on_error
            
            # Connect
            await self._ib.connectAsync(
                host=self.config.host,
                port=self.config.port,
                clientId=self.config.client_id,
                timeout=self.config.timeout,
                readonly=self.config.readonly,
            )
            
            self.state = ConnectionState.CONNECTED
            self._reconnect_attempts = 0
            self._last_heartbeat = datetime.now()
            
            # Start heartbeat monitoring
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            
            logger.info(
                "ibkr_connected",
                host=self.config.host,
                port=self.config.port,
                client_id=self.config.client_id,
            )
            
            if self.on_connected:
                await self.on_connected()
            
            return True
            
        except ImportError:
            logger.error("ib_async_not_installed")
            self.state = ConnectionState.ERROR
            return False
            
        except Exception as e:
            logger.error("connection_failed", error=str(e))
            self.state = ConnectionState.ERROR
            
            if self.on_error:
                await self.on_error(e)
            
            return False
    
    async def disconnect(self) -> None:
        """Disconnect from IBKR."""
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
        
        if self._ib:
            self._ib.disconnect()
        
        self.state = ConnectionState.DISCONNECTED
        logger.info("ibkr_disconnected")
    
    async def reconnect(self) -> bool:
        """
        Attempt to reconnect with exponential backoff.
        
        Returns:
            True if reconnection successful
        """
        async with self._reconnect_lock:
            if self.is_connected:
                return True
            
            self.state = ConnectionState.RECONNECTING
            
            while self._reconnect_attempts < self.config.max_reconnect_attempts:
                self._reconnect_attempts += 1
                
                # Calculate delay with exponential backoff
                delay = min(
                    self.config.initial_reconnect_delay * (
                        self.config.reconnect_backoff_factor ** (self._reconnect_attempts - 1)
                    ),
                    self.config.max_reconnect_delay,
                )
                
                logger.info(
                    "reconnect_attempt",
                    attempt=self._reconnect_attempts,
                    max_attempts=self.config.max_reconnect_attempts,
                    delay=delay,
                )
                
                await asyncio.sleep(delay)
                
                if await self.connect():
                    return True
            
            logger.error(
                "reconnect_failed",
                attempts=self._reconnect_attempts,
            )
            self.state = ConnectionState.ERROR
            return False
    
    def _on_connected(self) -> None:
        """Handle connection event from ib_async."""
        self._last_heartbeat = datetime.now()
        logger.debug("ib_connected_event")
    
    def _on_disconnected(self) -> None:
        """Handle disconnection event from ib_async."""
        logger.warning("ib_disconnected_event")
        
        if self.state != ConnectionState.DISCONNECTED:
            # Unexpected disconnection - trigger reconnect
            asyncio.create_task(self._handle_unexpected_disconnect())
    
    async def _handle_unexpected_disconnect(self) -> None:
        """Handle unexpected disconnection."""
        self.state = ConnectionState.RECONNECTING
        
        if self.on_disconnected:
            await self.on_disconnected("Unexpected disconnection")
        
        await self.reconnect()
    
    def _on_error(self, reqId: int, errorCode: int, errorString: str, contract: Any) -> None:
        """Handle error event from ib_async."""
        # Some error codes are informational
        info_codes = {2104, 2106, 2158}  # Market data farm messages
        
        if errorCode in info_codes:
            logger.debug(
                "ib_info",
                code=errorCode,
                message=errorString,
            )
        else:
            logger.error(
                "ib_error",
                req_id=reqId,
                code=errorCode,
                message=errorString,
                contract=str(contract) if contract else None,
            )
    
    async def _heartbeat_loop(self) -> None:
        """Background task to monitor connection health."""
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                if self._ib and self._ib.isConnected():
                    # Request server time as heartbeat
                    await self._ib.reqCurrentTimeAsync()
                    self._last_heartbeat = datetime.now()
                else:
                    logger.warning("heartbeat_failed_not_connected")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("heartbeat_error", error=str(e))
    
    # ==================== Trading Methods ====================
    
    async def get_positions(self) -> list[Position]:
        """
        Get all current positions.
        
        Returns:
            List of Position objects
        """
        if not self.is_connected:
            raise ConnectionError("Not connected to IBKR")
        
        positions = []
        
        # Get positions from IBKR
        ib_positions = self._ib.positions()
        
        for pos in ib_positions:
            # Filter to our trading pairs
            symbol = pos.contract.symbol
            if symbol not in TRADING_PAIRS:
                continue
            
            positions.append(Position(
                asset=symbol,
                quantity=Decimal(str(pos.position)),
                average_cost=Decimal(str(pos.avgCost)),
                market_value=Decimal(str(pos.marketValue)) if hasattr(pos, 'marketValue') else Decimal("0"),
                unrealized_pnl=Decimal(str(pos.unrealizedPNL)) if hasattr(pos, 'unrealizedPNL') else Decimal("0"),
                realized_pnl=Decimal(str(pos.realizedPNL)) if hasattr(pos, 'realizedPNL') else Decimal("0"),
            ))
        
        return positions
    
    async def get_account_values(self) -> dict[str, Decimal]:
        """
        Get account values (cash, portfolio value, etc.).
        
        Returns:
            Dict of account values
        """
        if not self.is_connected:
            raise ConnectionError("Not connected to IBKR")
        
        values = {}
        
        # Get account summary
        account_values = self._ib.accountValues()
        
        for av in account_values:
            if av.currency == "USD":
                try:
                    values[av.tag] = Decimal(str(av.value))
                except Exception:
                    values[av.tag] = av.value
        
        return values
    
    async def get_open_orders(self) -> list[dict]:
        """
        Get all open orders.
        
        Returns:
            List of order dictionaries
        """
        if not self.is_connected:
            raise ConnectionError("Not connected to IBKR")
        
        orders = []
        
        for trade in self._ib.openTrades():
            orders.append({
                "order_id": trade.order.orderId,
                "symbol": trade.contract.symbol,
                "action": trade.order.action,
                "quantity": trade.order.totalQuantity,
                "order_type": trade.order.orderType,
                "limit_price": trade.order.lmtPrice,
                "status": trade.orderStatus.status,
                "filled": trade.orderStatus.filled,
                "remaining": trade.orderStatus.remaining,
            })
        
        return orders
    
    async def place_order(self, params: OrderParams) -> TradeResult:
        """
        Place an order.
        
        Args:
            params: Order parameters
        
        Returns:
            TradeResult with order status
        """
        if not self.is_connected:
            return TradeResult(
                success=False,
                message="Not connected to IBKR",
            )
        
        try:
            from ib_async import Crypto, Order
            
            # Create contract
            contract = Crypto(params.asset, "PAXOS", "USD")
            
            # Create order
            order = Order(
                action=params.side,
                totalQuantity=float(params.quantity),
                orderType=params.order_type,
                tif=params.tif,
            )
            
            if params.limit_price:
                order.lmtPrice = float(params.limit_price)
            
            if params.stop_price:
                order.auxPrice = float(params.stop_price)
            
            # Place order
            trade = self._ib.placeOrder(contract, order)
            
            # Wait for order to be acknowledged
            await asyncio.sleep(0.5)
            
            logger.info(
                "order_placed",
                asset=params.asset,
                side=params.side,
                quantity=str(params.quantity),
                order_type=params.order_type,
                order_id=trade.order.orderId,
            )
            
            return TradeResult(
                success=True,
                order_id=trade.order.orderId,
                status=trade.orderStatus.status,
                message="Order placed successfully",
            )
            
        except Exception as e:
            logger.error("order_placement_failed", error=str(e))
            return TradeResult(
                success=False,
                message=str(e),
            )
    
    async def cancel_order(self, order_id: int) -> bool:
        """
        Cancel an open order.
        
        Args:
            order_id: IBKR order ID
        
        Returns:
            True if cancellation submitted successfully
        """
        if not self.is_connected:
            return False
        
        try:
            # Find the trade
            for trade in self._ib.openTrades():
                if trade.order.orderId == order_id:
                    self._ib.cancelOrder(trade.order)
                    logger.info("order_cancelled", order_id=order_id)
                    return True
            
            logger.warning("order_not_found", order_id=order_id)
            return False
            
        except Exception as e:
            logger.error("cancel_order_failed", order_id=order_id, error=str(e))
            return False
    
    async def cancel_all_orders(self) -> int:
        """
        Cancel all open orders.
        
        Returns:
            Number of orders cancelled
        """
        if not self.is_connected:
            return 0
        
        count = 0
        for trade in self._ib.openTrades():
            try:
                self._ib.cancelOrder(trade.order)
                count += 1
            except Exception as e:
                logger.error(
                    "cancel_order_failed",
                    order_id=trade.order.orderId,
                    error=str(e),
                )
        
        logger.info("all_orders_cancelled", count=count)
        return count
    
    # ==================== Market Data Methods ====================
    
    async def get_current_price(self, asset: str) -> Decimal | None:
        """
        Get current price for an asset.
        
        Args:
            asset: Asset symbol (e.g., "BTC")
        
        Returns:
            Current price or None if unavailable
        """
        if not self.is_connected:
            return None
        
        try:
            from ib_async import Crypto
            
            contract = Crypto(asset, "PAXOS", "USD")
            
            # Request market data
            self._ib.qualifyContracts(contract)
            ticker = self._ib.reqMktData(contract)
            
            # Wait briefly for data
            await asyncio.sleep(1)
            
            if ticker.last and ticker.last > 0:
                return Decimal(str(ticker.last))
            elif ticker.close and ticker.close > 0:
                return Decimal(str(ticker.close))
            
            return None
            
        except Exception as e:
            logger.error("get_price_failed", asset=asset, error=str(e))
            return None
    
    def get_connection_status(self) -> dict:
        """Get current connection status."""
        return {
            "state": self.state.value,
            "is_connected": self.is_connected,
            "last_heartbeat": self._last_heartbeat.isoformat(),
            "reconnect_attempts": self._reconnect_attempts,
            "host": self.config.host,
            "port": self.config.port,
            "client_id": self.config.client_id,
        }


# Global client instance
_client: IBKRClient | None = None


def get_ibkr_client() -> IBKRClient:
    """Get or create the global IBKR client instance."""
    global _client
    if _client is None:
        _client = IBKRClient()
    return _client
