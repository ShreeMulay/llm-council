# Change Proposal: Twilio Fallback Provider

## Summary

Add Twilio as a backup SMS provider for redundancy and reliability, with automatic failover when GoTo is unavailable.

## Motivation

### Current State
- Single SMS provider (GoTo)
- No redundancy if GoTo is down
- Single point of failure

### Problems
1. **Availability Risk:** GoTo outage = no SMS capability
2. **No Failover:** Must manually switch providers
3. **Limited Options:** Can't optimize for cost or features
4. **Carrier Coverage:** GoTo may have gaps with certain carriers

### Desired State
- Twilio as secondary provider
- Automatic failover on GoTo failure
- Provider health monitoring
- Unified logging across providers
- Easy provider configuration

## Scope

### In Scope
- Twilio SMS integration
- Provider abstraction layer
- Automatic failover logic
- Health check mechanism
- Unified message logging
- Configuration for provider selection

### Out of Scope
- Real-time provider switching UI
- Cost-based routing
- Carrier-based routing
- Multi-provider load balancing

## Success Criteria

1. **Redundancy:** Can send via Twilio when GoTo fails
2. **Automatic:** Failover happens without manual intervention
3. **Transparent:** Logging shows which provider was used
4. **Configurable:** Easy to set primary/secondary provider
5. **Reversible:** Can fail back to GoTo when recovered

## Technical Approach

### Provider Abstraction
```python
class SMSProvider:
    """Abstract base class for SMS providers"""
    def send(self, to, message, media_urls=None):
        raise NotImplementedError
    
    def health_check(self):
        raise NotImplementedError

class GoToProvider(SMSProvider):
    # Existing GoTo implementation
    pass

class TwilioProvider(SMSProvider):
    # New Twilio implementation
    pass

class SMSRouter:
    def __init__(self, primary, fallback):
        self.primary = primary
        self.fallback = fallback
    
    def send(self, to, message):
        try:
            return self.primary.send(to, message)
        except ProviderUnavailable:
            return self.fallback.send(to, message)
```

### Failover Logic
```
Send Request
     │
     ▼
Primary Provider (GoTo)
     │
     ├── Success ──► Return Result
     │
     └── Failure
           │
           ▼
     Is Retriable?
           │
     ├── No (bad request) ──► Return Error
     │
     └── Yes (5xx, timeout)
           │
           ▼
     Fallback Provider (Twilio)
           │
           ├── Success ──► Return Result (note: used fallback)
           │
           └── Failure ──► Return Error (both failed)
```

### Configuration
```python
SMS_CONFIG = {
    "primary_provider": "goto",
    "fallback_provider": "twilio",
    "failover_enabled": True,
    "providers": {
        "goto": {
            "access_token": "...",
            "owner_phone": "+15145550100"
        },
        "twilio": {
            "account_sid": "...",
            "auth_token": "...",
            "from_phone": "+15145550101"
        }
    }
}
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Different phone numbers | Document in message that number may vary |
| Cost increase | Only use fallback on failure |
| Configuration complexity | Clear documentation, validation |
| Twilio API differences | Abstract behind common interface |

## Dependencies

- Twilio account and phone number
- Additional configuration management

## Estimated Effort

| Component | Effort |
|-----------|--------|
| Provider abstraction layer | 3-4 hours |
| Twilio integration | 3-4 hours |
| Failover logic | 2-3 hours |
| Health check system | 2 hours |
| Configuration updates | 2 hours |
| Testing | 4 hours |
| Documentation | 2 hours |
| **Total** | **18-21 hours** |

## Twilio Requirements

### Account Setup
1. Create Twilio account
2. Purchase phone number
3. Get Account SID and Auth Token
4. Enable SMS capability

### API Endpoint
```
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages
```

### Pricing Consideration
Twilio pricing is per-message. Fallback-only usage minimizes cost impact.
