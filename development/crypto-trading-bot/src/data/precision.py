"""
Exchange Precision Module

Handles IBKR/Paxos specific precision requirements for crypto orders.
CRITICAL: Incorrect precision causes silent order rejections!

Rules:
- BTC: min qty 0.0001, step 0.0001, price tick 0.01
- ETH: min qty 0.001, step 0.001, price tick 0.01
- ALWAYS round DOWN quantities (never overspend)
- ALWAYS round prices to tick size
"""

from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
from dataclasses import dataclass
from typing import Literal

from src.config import ASSET_PRECISION, MIN_TRADE_USD


AssetType = Literal["BTC", "ETH"]


@dataclass(frozen=True)
class AssetPrecision:
    """Precision rules for a specific asset."""
    qty_step: Decimal
    qty_min: Decimal
    price_tick: Decimal


def get_precision(asset: AssetType) -> AssetPrecision:
    """Get precision rules for an asset."""
    config = ASSET_PRECISION.get(asset)
    if not config:
        raise ValueError(f"Unknown asset: {asset}")
    return AssetPrecision(
        qty_step=config["qty_step"],
        qty_min=config["qty_min"],
        price_tick=config["price_tick"],
    )


def round_quantity(qty: Decimal, asset: AssetType) -> Decimal:
    """
    Round quantity DOWN to valid step size.
    
    ALWAYS round down to avoid overspending or exceeding available balance.
    
    Args:
        qty: Desired quantity
        asset: Asset type ("BTC" or "ETH")
    
    Returns:
        Rounded quantity (may be less than requested)
    
    Example:
        >>> round_quantity(Decimal("0.12345"), "BTC")
        Decimal("0.1234")
    """
    precision = get_precision(asset)
    step = precision.qty_step
    
    # Integer division then multiply (rounds down)
    rounded = (qty // step) * step
    
    # Ensure we don't return negative or zero for positive input
    if rounded <= Decimal("0") and qty > Decimal("0"):
        return Decimal("0")
    
    return rounded


def round_price(price: Decimal, asset: AssetType) -> Decimal:
    """
    Round price to valid tick size using half-up rounding.
    
    Args:
        price: Desired price
        asset: Asset type
    
    Returns:
        Rounded price
    
    Example:
        >>> round_price(Decimal("42150.567"), "BTC")
        Decimal("42150.57")
    """
    precision = get_precision(asset)
    tick = precision.price_tick
    
    # Round to nearest tick
    return (price / tick).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * tick


def validate_quantity(qty: Decimal, asset: AssetType) -> tuple[bool, str | None]:
    """
    Validate that quantity meets minimum requirements.
    
    Args:
        qty: Quantity to validate
        asset: Asset type
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    precision = get_precision(asset)
    
    if qty < precision.qty_min:
        return False, f"Quantity {qty} below minimum {precision.qty_min} for {asset}"
    
    # Check it's a valid step
    remainder = qty % precision.qty_step
    if remainder != Decimal("0"):
        return False, f"Quantity {qty} not a valid step size for {asset}"
    
    return True, None


def validate_order_value(
    qty: Decimal, 
    price: Decimal, 
    asset: AssetType
) -> tuple[bool, str | None]:
    """
    Validate order meets minimum value requirements.
    
    IBKR has $1.75 minimum commission - small orders are fee-inefficient.
    We enforce minimum $350 trade size (fees < 0.5%).
    
    Args:
        qty: Order quantity
        price: Order price
        asset: Asset type
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    order_value = qty * price
    
    if order_value < MIN_TRADE_USD:
        return False, f"Order value ${order_value:.2f} below minimum ${MIN_TRADE_USD}"
    
    return True, None


def calculate_max_quantity(
    available_usd: Decimal,
    price: Decimal,
    asset: AssetType,
    reserve_pct: Decimal = Decimal("0.01"),
) -> Decimal:
    """
    Calculate maximum quantity that can be purchased.
    
    Args:
        available_usd: Available USD balance
        price: Current price
        asset: Asset type
        reserve_pct: Percentage to reserve for fees/slippage (default 1%)
    
    Returns:
        Maximum purchasable quantity (rounded down)
    """
    # Reserve some for fees
    usable_usd = available_usd * (Decimal("1") - reserve_pct)
    
    # Calculate raw quantity
    raw_qty = usable_usd / price
    
    # Round down to valid step
    return round_quantity(raw_qty, asset)


def format_quantity(qty: Decimal, asset: AssetType) -> str:
    """Format quantity for display with appropriate decimal places."""
    precision = get_precision(asset)
    
    # Count decimal places in step
    step_str = str(precision.qty_step)
    if "." in step_str:
        decimals = len(step_str.split(".")[1])
    else:
        decimals = 0
    
    return f"{qty:.{decimals}f}"


def format_price(price: Decimal, asset: AssetType) -> str:
    """Format price for display with appropriate decimal places."""
    precision = get_precision(asset)
    
    # Count decimal places in tick
    tick_str = str(precision.price_tick)
    if "." in tick_str:
        decimals = len(tick_str.split(".")[1])
    else:
        decimals = 0
    
    return f"{price:.{decimals}f}"


# Pre-validation helper for order construction
def prepare_order_params(
    asset: AssetType,
    side: Literal["BUY", "SELL"],
    quantity: Decimal,
    price: Decimal | None = None,  # None for market orders
) -> dict:
    """
    Prepare and validate order parameters.
    
    Args:
        asset: Asset type
        side: Order side
        quantity: Desired quantity
        price: Limit price (None for market order)
    
    Returns:
        Dict with validated order parameters
    
    Raises:
        ValueError: If order parameters are invalid
    """
    # Round quantity
    rounded_qty = round_quantity(quantity, asset)
    
    # Validate quantity
    valid, error = validate_quantity(rounded_qty, asset)
    if not valid:
        raise ValueError(error)
    
    result = {
        "asset": asset,
        "side": side,
        "quantity": rounded_qty,
        "quantity_str": format_quantity(rounded_qty, asset),
    }
    
    # Handle price for limit orders
    if price is not None:
        rounded_price = round_price(price, asset)
        result["price"] = rounded_price
        result["price_str"] = format_price(rounded_price, asset)
        
        # Validate order value
        valid, error = validate_order_value(rounded_qty, rounded_price, asset)
        if not valid:
            raise ValueError(error)
    
    return result
