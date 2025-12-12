# Change Proposal: OAuth Token Auto-Refresh

## Summary

Implement automatic OAuth access token refresh to prevent service interruptions when tokens expire.

## Motivation

### Current State
- GoTo access tokens expire (typically after 1 hour)
- When tokens expire, all SMS operations fail with HTTP 401
- Staff must manually obtain new tokens, causing delays
- No warning before expiration

### Problems
1. **Service Interruption:** Failed sends during patient communication
2. **Manual Overhead:** Staff must know how to refresh tokens
3. **Poor UX:** Cryptic "401 Unauthorized" errors
4. **Reliability:** Unpredictable system availability

### Desired State
- Tokens refresh automatically before expiration
- Zero-downtime token rotation
- Graceful fallback if auto-refresh fails
- Works in both Python and Apps Script implementations

## Scope

### In Scope
- Implement refresh token flow for GoTo OAuth
- Secure storage of refresh tokens
- Background/proactive token refresh
- Token expiration monitoring
- Graceful degradation on refresh failure
- Update both Python and Apps Script implementations

### Out of Scope
- Changes to message templates
- Changes to logging format
- UI changes (beyond error messages)

## Success Criteria

1. **Auto-Refresh:** Tokens refresh automatically without user action
2. **Proactive:** Refresh happens before expiration (e.g., at 80% of TTL)
3. **Fallback:** Clear guidance if auto-refresh fails
4. **Secure:** Refresh tokens stored as securely as access tokens
5. **Observable:** Token refresh events are logged
6. **Cross-Platform:** Works in Python CLI and Apps Script

## Technical Approach

### Python Implementation
```python
class GoToSMS:
    def __init__(self, access_token=None, refresh_token=None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.token_expiry = None
    
    def _ensure_valid_token(self):
        if self._is_token_expired():
            self._refresh_access_token()
    
    def _is_token_expired(self):
        if not self.token_expiry:
            return False
        return datetime.now() >= self.token_expiry - timedelta(minutes=5)
    
    def _refresh_access_token(self):
        # Use refresh token to get new access token
        pass
```

### Apps Script Implementation
```javascript
function ensureValidToken() {
  const props = PropertiesService.getScriptProperties();
  const expiry = props.getProperty('TOKEN_EXPIRY');
  
  if (isTokenExpired(expiry)) {
    refreshAccessToken();
  }
}
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Refresh token expires | Alert user, provide re-auth instructions |
| Refresh fails repeatedly | Exponential backoff, fallback to manual |
| Race condition in concurrent requests | Token refresh mutex/lock |
| Refresh token storage security | Same security as access token |

## Dependencies

- GoTo API must support refresh tokens (verify capability)
- May require OAuth client configuration changes

## Estimated Effort

| Component | Effort |
|-----------|--------|
| Python implementation | 2-3 hours |
| Apps Script implementation | 2-3 hours |
| Testing | 2 hours |
| Documentation | 1 hour |
| **Total** | **7-9 hours** |

## References

- GoTo OAuth Documentation: https://developer.goto.com/guides/Authentication/
- RFC 6749 (OAuth 2.0): https://tools.ietf.org/html/rfc6749
