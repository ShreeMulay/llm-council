from decimal import Decimal
from enum import Enum
from pydantic_settings import BaseSettings
from pydantic import Field


class TradingMode(str, Enum):
    PAPER = "paper"
    LIVE = "live"


class TaxMethod(str, Enum):
    FIFO = "FIFO"
    LIFO = "LIFO"
    HIFO = "HIFO"


class Settings(BaseSettings):
    ibkr_host: str = "127.0.0.1"
    ibkr_port_paper: int = 7497
    ibkr_port_live: int = 7496
    ibkr_client_id: int = 1

    convex_url: str = ""
    convex_deploy_key: str = ""

    discord_webhook_url: str = ""

    trading_mode: TradingMode = TradingMode.PAPER
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


TRADING_PAIRS = ["BTC", "ETH"]

ASSET_PRECISION = {
    "BTC": {
        "qty_step": Decimal("0.0001"),
        "qty_min": Decimal("0.0001"),
        "price_tick": Decimal("0.01"),
    },
    "ETH": {
        "qty_step": Decimal("0.001"),
        "qty_min": Decimal("0.001"),
        "price_tick": Decimal("0.01"),
    },
}

RISK_CONFIG = {
    "risk_per_trade": Decimal("0.02"),
    "max_drawdown": Decimal("0.15"),
    "daily_loss_limit": Decimal("0.05"),
    "max_position_pct": Decimal("0.33"),
    "stop_loss_atr_mult": Decimal("2.0"),
}

STRATEGY_CONFIG = {
    "adx_threshold": 25,
    "adx_period": 14,
    "ema_fast": 12,
    "ema_slow": 26,
    "rsi_period": 14,
    "rsi_oversold": 30,
    "rsi_overbought": 70,
    "bb_period": 20,
    "bb_std": Decimal("2.0"),
}

RL_CONFIG = {
    "sizing_min": Decimal("0.5"),
    "sizing_max": Decimal("2.0"),
    "retrain_sharpe_threshold": Decimal("0.5"),
    "retrain_winrate_threshold": Decimal("0.45"),
}

PROFIT_CONFIG = {
    "reinvest_pct": Decimal("0.20"),
    "reinvest_crypto_pct": Decimal("0.50"),
    "reinvest_gold_pct": Decimal("0.50"),
    "reinvest_frequency": "weekly",
}

TAX_CONFIG = {
    "method": TaxMethod.HIFO,
    "short_term_days": 365,
    "wallet": "IBKR_PAXOS",
}

FLASH_CRASH_THRESHOLDS = {
    "1min_drop": Decimal("-0.05"),
    "5min_drop": Decimal("-0.10"),
    "1hour_drop": Decimal("-0.15"),
}

IBKR_RATE_LIMITS = {
    "max_requests_per_10min": 60,
    "max_concurrent_requests": 50,
    "identical_request_interval_sec": 15,
    "same_contract_requests_per_2sec": 6,
}

MIN_TRADE_USD = Decimal("350")

settings = Settings()
