"""
IBKR API Rate Limiter

Enforces IBKR's rate limits to prevent pacing violations and IP soft-bans.

Limits (from IBKR documentation):
- Max 60 historical data requests per 10 minutes
- Max 50 concurrent requests
- No identical requests within 15 seconds
- Max 6 requests for same contract/exchange/tick type within 2 seconds

Violations result in:
- Request rejection
- Potential temporary IP ban
- Data quality degradation
"""

import asyncio
import hashlib
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, TypeVar, ParamSpec
from functools import wraps

import structlog

from src.config import IBKR_RATE_LIMITS

logger = structlog.get_logger(__name__)

P = ParamSpec("P")
T = TypeVar("T")


@dataclass
class RequestRecord:
    """Record of a single request."""
    timestamp: float
    request_hash: str
    contract: str | None = None


@dataclass
class RateLimiterState:
    """State tracking for rate limiting."""
    # Rolling window of all requests (10 min window)
    requests: list[RequestRecord] = field(default_factory=list)
    
    # Track requests by contract for same-contract limit
    contract_requests: dict[str, list[float]] = field(
        default_factory=lambda: defaultdict(list)
    )
    
    # Track identical request hashes
    request_hashes: dict[str, float] = field(default_factory=dict)
    
    # Current concurrent request count
    concurrent_count: int = 0
    
    # Lock for thread safety
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class IBKRRateLimiter:
    """
    Rate limiter for IBKR API calls.
    
    Usage:
        limiter = IBKRRateLimiter()
        
        # Check before making request
        await limiter.acquire("historical", contract="BTC")
        try:
            result = await make_ibkr_request()
        finally:
            limiter.release()
    
    Or use as decorator:
        @limiter.rate_limited("historical")
        async def fetch_data(contract: str):
            ...
    """
    
    def __init__(self):
        self.config = IBKR_RATE_LIMITS
        self.state = RateLimiterState()
        
        # Time windows
        self._window_10min = 10 * 60  # seconds
        self._window_2sec = 2  # seconds
    
    def _compute_request_hash(self, request_type: str, **params: Any) -> str:
        """Compute hash for identical request detection."""
        key = f"{request_type}:{sorted(params.items())}"
        return hashlib.md5(key.encode()).hexdigest()
    
    def _cleanup_old_requests(self, now: float) -> None:
        """Remove requests outside the 10-minute window."""
        cutoff = now - self._window_10min
        self.state.requests = [
            r for r in self.state.requests if r.timestamp > cutoff
        ]
        
        # Cleanup contract requests
        for contract in list(self.state.contract_requests.keys()):
            self.state.contract_requests[contract] = [
                t for t in self.state.contract_requests[contract]
                if t > now - self._window_2sec
            ]
            if not self.state.contract_requests[contract]:
                del self.state.contract_requests[contract]
        
        # Cleanup old request hashes (15 second window)
        hash_cutoff = now - self.config["identical_request_interval_sec"]
        self.state.request_hashes = {
            h: t for h, t in self.state.request_hashes.items()
            if t > hash_cutoff
        }
    
    async def acquire(
        self,
        request_type: str,
        contract: str | None = None,
        **params: Any,
    ) -> None:
        """
        Acquire permission to make a request.
        
        Blocks until the request can be made within rate limits.
        
        Args:
            request_type: Type of request (for logging/tracking)
            contract: Contract identifier (for same-contract limits)
            **params: Additional params for identical request detection
        
        Raises:
            asyncio.TimeoutError: If wait exceeds 60 seconds
        """
        request_hash = self._compute_request_hash(request_type, contract=contract, **params)
        start_time = time.monotonic()
        max_wait = 60.0  # Maximum wait time
        
        while True:
            async with self.state.lock:
                now = time.time()
                self._cleanup_old_requests(now)
                
                # Check all limits
                can_proceed, wait_time, reason = self._check_limits(
                    now, request_hash, contract
                )
                
                if can_proceed:
                    # Record the request
                    self.state.requests.append(
                        RequestRecord(
                            timestamp=now,
                            request_hash=request_hash,
                            contract=contract,
                        )
                    )
                    self.state.request_hashes[request_hash] = now
                    
                    if contract:
                        self.state.contract_requests[contract].append(now)
                    
                    self.state.concurrent_count += 1
                    
                    logger.debug(
                        "rate_limit_acquired",
                        request_type=request_type,
                        contract=contract,
                        concurrent=self.state.concurrent_count,
                        requests_10min=len(self.state.requests),
                    )
                    return
            
            # Check timeout
            elapsed = time.monotonic() - start_time
            if elapsed > max_wait:
                raise asyncio.TimeoutError(
                    f"Rate limit wait exceeded {max_wait}s: {reason}"
                )
            
            # Wait before retry
            actual_wait = min(wait_time, max_wait - elapsed)
            logger.debug(
                "rate_limit_waiting",
                wait_seconds=actual_wait,
                reason=reason,
            )
            await asyncio.sleep(actual_wait)
    
    def _check_limits(
        self,
        now: float,
        request_hash: str,
        contract: str | None,
    ) -> tuple[bool, float, str]:
        """
        Check if request can proceed.
        
        Returns:
            Tuple of (can_proceed, wait_time_if_not, reason)
        """
        # Check 1: Concurrent requests
        if self.state.concurrent_count >= self.config["max_concurrent_requests"]:
            return False, 0.1, "max concurrent requests reached"
        
        # Check 2: Requests per 10 minutes
        if len(self.state.requests) >= self.config["max_requests_per_10min"]:
            oldest = min(r.timestamp for r in self.state.requests)
            wait = oldest + self._window_10min - now + 0.1
            return False, max(wait, 0.1), "max requests per 10min reached"
        
        # Check 3: Identical request within 15 seconds
        if request_hash in self.state.request_hashes:
            last_time = self.state.request_hashes[request_hash]
            elapsed = now - last_time
            if elapsed < self.config["identical_request_interval_sec"]:
                wait = self.config["identical_request_interval_sec"] - elapsed + 0.1
                return False, wait, "identical request too soon"
        
        # Check 4: Same contract requests within 2 seconds
        if contract and contract in self.state.contract_requests:
            recent = self.state.contract_requests[contract]
            if len(recent) >= self.config["same_contract_requests_per_2sec"]:
                oldest = min(recent)
                wait = oldest + self._window_2sec - now + 0.1
                return False, max(wait, 0.1), "same contract rate limit"
        
        return True, 0, ""
    
    def release(self) -> None:
        """Release a concurrent request slot."""
        self.state.concurrent_count = max(0, self.state.concurrent_count - 1)
    
    async def __aenter__(self):
        """Context manager entry - NOT for general use, see acquire()."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.release()
        return False
    
    def rate_limited(
        self,
        request_type: str,
        contract_param: str | None = None,
    ) -> Callable[[Callable[P, T]], Callable[P, T]]:
        """
        Decorator to rate-limit a function.
        
        Args:
            request_type: Type of request for tracking
            contract_param: Name of parameter containing contract (optional)
        
        Example:
            @limiter.rate_limited("historical", contract_param="symbol")
            async def fetch_history(symbol: str, timeframe: str):
                ...
        """
        def decorator(func: Callable[P, T]) -> Callable[P, T]:
            @wraps(func)
            async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
                # Extract contract from kwargs if specified
                contract = None
                if contract_param and contract_param in kwargs:
                    contract = str(kwargs[contract_param])
                
                await self.acquire(request_type, contract=contract, **kwargs)
                try:
                    return await func(*args, **kwargs)
                finally:
                    self.release()
            
            return wrapper
        return decorator
    
    def get_stats(self) -> dict[str, Any]:
        """Get current rate limiter statistics."""
        now = time.time()
        self._cleanup_old_requests(now)
        
        return {
            "concurrent_requests": self.state.concurrent_count,
            "requests_last_10min": len(self.state.requests),
            "max_requests_per_10min": self.config["max_requests_per_10min"],
            "max_concurrent": self.config["max_concurrent_requests"],
            "tracked_contracts": len(self.state.contract_requests),
            "cached_request_hashes": len(self.state.request_hashes),
        }


# Global rate limiter instance
rate_limiter = IBKRRateLimiter()
