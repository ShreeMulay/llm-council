"""
Data module - IBKR connection, data collection, precision handling.
"""

from src.data.precision import (
    round_quantity,
    round_price,
    validate_quantity,
    validate_order_value,
    calculate_max_quantity,
    prepare_order_params,
)
from src.data.rate_limiter import rate_limiter, IBKRRateLimiter
from src.data.ibkr_client import get_ibkr_client, IBKRClient
from src.data.ohlcv_collector import (
    get_ohlcv_collector,
    OHLCVCollector,
    OHLCVBar,
    Timeframe,
)

__all__ = [
    "round_quantity",
    "round_price", 
    "validate_quantity",
    "validate_order_value",
    "calculate_max_quantity",
    "prepare_order_params",
    "rate_limiter",
    "IBKRRateLimiter",
    "get_ibkr_client",
    "IBKRClient",
    "get_ohlcv_collector",
    "OHLCVCollector",
    "OHLCVBar",
    "Timeframe",
]
