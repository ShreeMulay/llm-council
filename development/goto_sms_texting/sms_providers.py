"""
SMS Provider Abstraction Layer

Provides a unified interface for multiple SMS providers with automatic failover.
Supports GoTo (primary) and Twilio (fallback) providers.

Environment Variables:
    Primary (GoTo):
        GOTO_ACCESS_TOKEN, GOTO_REFRESH_TOKEN, GOTO_CLIENT_ID, GOTO_CLIENT_SECRET
    
    Fallback (Twilio):
        TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE

Usage:
    from sms_providers import SMSRouter, create_default_router
    
    # Create router with automatic failover
    router = create_default_router()
    
    # Send message (uses GoTo, falls back to Twilio on failure)
    result = router.send("+15145550199", "Hello!")
    print(f"Sent via: {result.provider}")
"""

import os
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)


# ============================================
# EXCEPTIONS
# ============================================

class ProviderError(Exception):
    """Base exception for provider errors"""
    def __init__(self, message: str, provider: str = "", retriable: bool = False):
        super().__init__(message)
        self.provider = provider
        self.retriable = retriable


class ProviderUnavailable(ProviderError):
    """Provider is temporarily unavailable (retriable)"""
    def __init__(self, message: str, provider: str = ""):
        super().__init__(message, provider, retriable=True)


class ProviderAuthError(ProviderError):
    """Authentication failed (may be retriable after token refresh)"""
    def __init__(self, message: str, provider: str = ""):
        super().__init__(message, provider, retriable=True)


class ProviderConfigError(ProviderError):
    """Configuration error (not retriable)"""
    def __init__(self, message: str, provider: str = ""):
        super().__init__(message, provider, retriable=False)


class ProviderSendError(ProviderError):
    """Send failed (retriable for server errors)"""
    pass


# ============================================
# RESULT TYPES
# ============================================

class SendStatus(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    BLOCKED = "blocked"


@dataclass
class SendResult:
    """Result of a send operation"""
    status: SendStatus
    provider: str
    message_id: str = ""
    error: str = ""
    raw_response: Dict[str, Any] = field(default_factory=dict)
    failover_used: bool = False
    timestamp: datetime = field(default_factory=datetime.now)
    
    @property
    def success(self) -> bool:
        return self.status == SendStatus.SUCCESS
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value,
            "provider": self.provider,
            "message_id": self.message_id,
            "error": self.error,
            "failover_used": self.failover_used,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class HealthStatus:
    """Health check result for a provider"""
    provider: str
    healthy: bool
    latency_ms: float = 0.0
    error: str = ""
    last_check: datetime = field(default_factory=datetime.now)


# ============================================
# ABSTRACT PROVIDER
# ============================================

class SMSProvider(ABC):
    """Abstract base class for SMS providers"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name for logging"""
        pass
    
    @abstractmethod
    def send(self, to: str, message: str, **kwargs) -> SendResult:
        """
        Send an SMS message.
        
        Args:
            to: Recipient phone number (E.164 format)
            message: Message body
            **kwargs: Provider-specific options
            
        Returns:
            SendResult with status and details
            
        Raises:
            ProviderError: On failure
        """
        pass
    
    @abstractmethod
    def health_check(self) -> HealthStatus:
        """
        Check if provider is healthy.
        
        Returns:
            HealthStatus with availability info
        """
        pass
    
    def is_configured(self) -> bool:
        """Check if provider has required configuration"""
        return True


# ============================================
# GOTO PROVIDER
# ============================================

class GoToProvider(SMSProvider):
    """
    GoTo SMS provider implementation.
    
    Wraps the existing GoToSMS class with the provider interface.
    """
    
    def __init__(self, access_token: Optional[str] = None, **kwargs):
        # Import here to avoid circular imports
        from goto_sms import GoToSMS, MessageBlockedError
        
        self._sms = GoToSMS(access_token=access_token, **kwargs)
        self._MessageBlockedError = MessageBlockedError
    
    @property
    def name(self) -> str:
        return "goto"
    
    def is_configured(self) -> bool:
        """Check if GoTo is configured"""
        try:
            status = self._sms.get_token_status()
            return status.get("has_access_token", False)
        except Exception:
            return False
    
    def send(self, to: str, message: str, **kwargs) -> SendResult:
        """Send SMS via GoTo API"""
        try:
            response = self._sms.send_sms(
                phone_numbers=[to],
                message=message,
                **kwargs
            )
            
            return SendResult(
                status=SendStatus.SUCCESS,
                provider=self.name,
                message_id=response.get("id", ""),
                raw_response=response
            )
            
        except self._MessageBlockedError as e:
            return SendResult(
                status=SendStatus.BLOCKED,
                provider=self.name,
                error=str(e)
            )
            
        except Exception as e:
            error_msg = str(e)
            
            # Determine if retriable
            if "401" in error_msg:
                raise ProviderAuthError(error_msg, self.name)
            elif "5" in error_msg[:1] or "timeout" in error_msg.lower():
                raise ProviderUnavailable(error_msg, self.name)
            else:
                raise ProviderSendError(error_msg, self.name, retriable=False)
    
    def health_check(self) -> HealthStatus:
        """Check GoTo API health"""
        import time
        
        start = time.time()
        try:
            status = self._sms.get_token_status()
            latency = (time.time() - start) * 1000
            
            if not status.get("has_access_token"):
                return HealthStatus(
                    provider=self.name,
                    healthy=False,
                    latency_ms=latency,
                    error="No access token configured"
                )
            
            if status.get("is_expired") and not status.get("can_auto_refresh"):
                return HealthStatus(
                    provider=self.name,
                    healthy=False,
                    latency_ms=latency,
                    error="Token expired and cannot auto-refresh"
                )
            
            return HealthStatus(
                provider=self.name,
                healthy=True,
                latency_ms=latency
            )
            
        except Exception as e:
            return HealthStatus(
                provider=self.name,
                healthy=False,
                error=str(e)
            )


# ============================================
# TWILIO PROVIDER
# ============================================

class TwilioProvider(SMSProvider):
    """
    Twilio SMS provider implementation.
    
    Environment Variables:
        TWILIO_ACCOUNT_SID: Twilio account SID
        TWILIO_AUTH_TOKEN: Twilio auth token
        TWILIO_FROM_PHONE: Twilio phone number to send from
    """
    
    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        from_phone: Optional[str] = None
    ):
        self.account_sid = account_sid or os.environ.get("TWILIO_ACCOUNT_SID", "")
        self.auth_token = auth_token or os.environ.get("TWILIO_AUTH_TOKEN", "")
        self.from_phone = from_phone or os.environ.get("TWILIO_FROM_PHONE", "")
        
        self._client = None
    
    @property
    def name(self) -> str:
        return "twilio"
    
    def is_configured(self) -> bool:
        """Check if Twilio is configured"""
        return bool(self.account_sid and self.auth_token and self.from_phone)
    
    def _get_client(self):
        """Lazy-load Twilio client"""
        if self._client is None:
            if not self.is_configured():
                raise ProviderConfigError(
                    "Twilio not configured. Set TWILIO_ACCOUNT_SID, "
                    "TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE",
                    self.name
                )
            
            try:
                from twilio.rest import Client
                self._client = Client(self.account_sid, self.auth_token)
            except ImportError:
                raise ProviderConfigError(
                    "Twilio SDK not installed. Run: pip install twilio",
                    self.name
                )
        
        return self._client
    
    def send(self, to: str, message: str, **kwargs) -> SendResult:
        """Send SMS via Twilio API"""
        try:
            client = self._get_client()
            
            # Twilio uses media_url for MMS (optional)
            create_kwargs = {
                "from_": self.from_phone,
                "to": to,
                "body": message
            }
            
            if kwargs.get("media_urls"):
                create_kwargs["media_url"] = kwargs["media_urls"]
            
            twilio_message = client.messages.create(**create_kwargs)
            
            return SendResult(
                status=SendStatus.SUCCESS,
                provider=self.name,
                message_id=twilio_message.sid,
                raw_response={
                    "sid": twilio_message.sid,
                    "status": twilio_message.status
                }
            )
            
        except ProviderConfigError:
            raise
            
        except Exception as e:
            error_msg = str(e)
            
            # Parse Twilio error codes
            if "21610" in error_msg:  # Blacklisted
                return SendResult(
                    status=SendStatus.BLOCKED,
                    provider=self.name,
                    error="Recipient has opted out (blacklisted)"
                )
            elif "21408" in error_msg or "21211" in error_msg:  # Invalid number
                raise ProviderSendError(
                    f"Invalid phone number: {error_msg}",
                    self.name,
                    retriable=False
                )
            elif "20003" in error_msg:  # Auth error
                raise ProviderAuthError(error_msg, self.name)
            elif "503" in error_msg or "timeout" in error_msg.lower():
                raise ProviderUnavailable(error_msg, self.name)
            else:
                raise ProviderSendError(error_msg, self.name, retriable=True)
    
    def health_check(self) -> HealthStatus:
        """Check Twilio API health"""
        import time
        
        start = time.time()
        try:
            if not self.is_configured():
                return HealthStatus(
                    provider=self.name,
                    healthy=False,
                    error="Not configured"
                )
            
            client = self._get_client()
            
            # Quick API call to verify credentials
            account = client.api.accounts(self.account_sid).fetch()
            latency = (time.time() - start) * 1000
            
            if account.status != "active":
                return HealthStatus(
                    provider=self.name,
                    healthy=False,
                    latency_ms=latency,
                    error=f"Account status: {account.status}"
                )
            
            return HealthStatus(
                provider=self.name,
                healthy=True,
                latency_ms=latency
            )
            
        except Exception as e:
            return HealthStatus(
                provider=self.name,
                healthy=False,
                error=str(e)
            )


# ============================================
# SMS ROUTER (FAILOVER LOGIC)
# ============================================

class SMSRouter:
    """
    Routes SMS messages through providers with automatic failover.
    
    Features:
    - Primary/fallback provider pattern
    - Automatic failover on retriable errors
    - Health tracking
    - Unified logging
    
    Usage:
        router = SMSRouter(
            primary=GoToProvider(),
            fallback=TwilioProvider()
        )
        result = router.send("+15145550199", "Hello!")
    """
    
    def __init__(
        self,
        primary: SMSProvider,
        fallback: Optional[SMSProvider] = None,
        failover_enabled: bool = True
    ):
        self.primary = primary
        self.fallback = fallback
        self.failover_enabled = failover_enabled
        
        # Health tracking
        self._health_cache: Dict[str, HealthStatus] = {}
        
        logger.info(
            f"SMSRouter initialized: primary={primary.name}, "
            f"fallback={fallback.name if fallback else 'none'}, "
            f"failover={failover_enabled}"
        )
    
    def send(self, to: str, message: str, **kwargs) -> SendResult:
        """
        Send SMS with automatic failover.
        
        Args:
            to: Recipient phone number
            message: Message body
            **kwargs: Provider-specific options
            
        Returns:
            SendResult with provider info
        """
        # Try primary provider
        try:
            result = self.primary.send(to, message, **kwargs)
            logger.info(f"Sent via {result.provider}: {result.message_id}")
            return result
            
        except ProviderError as e:
            logger.warning(
                f"Primary provider ({self.primary.name}) failed: {e}"
            )
            
            # Check if we should failover
            if not self.failover_enabled:
                return SendResult(
                    status=SendStatus.FAILED,
                    provider=self.primary.name,
                    error=str(e)
                )
            
            if not e.retriable:
                logger.error(f"Non-retriable error, not failing over: {e}")
                return SendResult(
                    status=SendStatus.FAILED,
                    provider=self.primary.name,
                    error=str(e)
                )
            
            if not self.fallback:
                logger.error("No fallback provider configured")
                return SendResult(
                    status=SendStatus.FAILED,
                    provider=self.primary.name,
                    error=str(e)
                )
            
            # Try fallback provider
            return self._send_fallback(to, message, str(e), **kwargs)
    
    def _send_fallback(
        self, 
        to: str, 
        message: str, 
        primary_error: str,
        **kwargs
    ) -> SendResult:
        """Send via fallback provider"""
        logger.info(f"Failing over to {self.fallback.name}")
        
        try:
            result = self.fallback.send(to, message, **kwargs)
            result.failover_used = True
            
            logger.info(
                f"Failover successful via {result.provider}: {result.message_id}"
            )
            
            return result
            
        except ProviderError as e:
            logger.error(f"Fallback provider also failed: {e}")
            return SendResult(
                status=SendStatus.FAILED,
                provider=self.fallback.name,
                error=f"Primary: {primary_error}; Fallback: {e}",
                failover_used=True
            )
    
    def health_check(self) -> Dict[str, HealthStatus]:
        """Check health of all providers"""
        results = {}
        
        results[self.primary.name] = self.primary.health_check()
        
        if self.fallback:
            results[self.fallback.name] = self.fallback.health_check()
        
        self._health_cache = results
        return results
    
    def get_status(self) -> Dict[str, Any]:
        """Get current router status"""
        return {
            "primary": {
                "name": self.primary.name,
                "configured": self.primary.is_configured()
            },
            "fallback": {
                "name": self.fallback.name if self.fallback else None,
                "configured": self.fallback.is_configured() if self.fallback else False
            },
            "failover_enabled": self.failover_enabled,
            "health_cache": {
                name: {
                    "healthy": status.healthy,
                    "error": status.error,
                    "last_check": status.last_check.isoformat()
                }
                for name, status in self._health_cache.items()
            }
        }


# ============================================
# FACTORY FUNCTIONS
# ============================================

def create_goto_provider(**kwargs) -> GoToProvider:
    """Create a GoTo provider with environment config"""
    return GoToProvider(**kwargs)


def create_twilio_provider(**kwargs) -> TwilioProvider:
    """Create a Twilio provider with environment config"""
    return TwilioProvider(**kwargs)


def create_default_router(
    failover_enabled: bool = True,
    goto_kwargs: Optional[Dict] = None,
    twilio_kwargs: Optional[Dict] = None
) -> SMSRouter:
    """
    Create the default SMS router with GoTo primary and Twilio fallback.
    
    Args:
        failover_enabled: Enable automatic failover
        goto_kwargs: Extra kwargs for GoTo provider
        twilio_kwargs: Extra kwargs for Twilio provider
        
    Returns:
        Configured SMSRouter
    """
    primary = create_goto_provider(**(goto_kwargs or {}))
    
    # Only create fallback if Twilio is configured
    fallback = None
    twilio = create_twilio_provider(**(twilio_kwargs or {}))
    if twilio.is_configured():
        fallback = twilio
        logger.info("Twilio fallback configured")
    else:
        logger.info("Twilio not configured, running without fallback")
    
    return SMSRouter(
        primary=primary,
        fallback=fallback,
        failover_enabled=failover_enabled
    )


# ============================================
# TESTING HELPER
# ============================================

def test_providers():
    """Test provider configurations"""
    print("\n=== SMS Provider Test ===\n")
    
    # Test GoTo
    print("GoTo Provider:")
    try:
        goto = create_goto_provider()
        print(f"  Configured: {goto.is_configured()}")
        health = goto.health_check()
        print(f"  Healthy: {health.healthy}")
        if health.error:
            print(f"  Error: {health.error}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test Twilio
    print("\nTwilio Provider:")
    try:
        twilio = create_twilio_provider()
        print(f"  Configured: {twilio.is_configured()}")
        if twilio.is_configured():
            health = twilio.health_check()
            print(f"  Healthy: {health.healthy}")
            if health.error:
                print(f"  Error: {health.error}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test Router
    print("\nSMS Router:")
    try:
        router = create_default_router()
        status = router.get_status()
        print(f"  Primary: {status['primary']['name']} (configured: {status['primary']['configured']})")
        print(f"  Fallback: {status['fallback']['name']} (configured: {status['fallback']['configured']})")
        print(f"  Failover Enabled: {status['failover_enabled']}")
    except Exception as e:
        print(f"  Error: {e}")
    
    print()


if __name__ == "__main__":
    test_providers()
