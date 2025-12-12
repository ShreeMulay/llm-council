# Tasks: OAuth Token Auto-Refresh

## 1. Research & Planning

- [x] 1.1 Verify GoTo API supports refresh tokens
- [x] 1.2 Document OAuth flow with refresh token
- [x] 1.3 Identify token TTL (time-to-live)
- [x] 1.4 Define refresh timing strategy (e.g., refresh at 80% TTL)

## 2. Python Implementation

- [x] 2.1 Add refresh_token parameter to GoToSMS constructor
- [x] 2.2 Add token_expiry tracking
- [x] 2.3 Implement `_is_token_expired()` method
- [x] 2.4 Implement `_refresh_access_token()` method
- [x] 2.5 Add `_ensure_valid_token()` call before API requests
- [x] 2.6 Update config.py with refresh token support
- [x] 2.7 Add GOTO_REFRESH_TOKEN environment variable support
- [x] 2.8 Handle refresh failures gracefully

## 3. Apps Script Implementation

- [x] 3.1 Add TOKEN_EXPIRY to Script Properties
- [x] 3.2 Add REFRESH_TOKEN to Script Properties
- [x] 3.3 Implement `isTokenExpired()` function
- [x] 3.4 Implement `refreshAccessToken()` function
- [x] 3.5 Add `ensureValidToken()` call before API requests
- [x] 3.6 Update setConfig() to include refresh token
- [x] 3.7 Handle refresh failures with user notification

## 4. Error Handling

- [x] 4.1 Create specific error for expired refresh token
- [x] 4.2 Add retry logic for transient refresh failures
- [x] 4.3 Implement exponential backoff
- [x] 4.4 Log all refresh attempts and outcomes

## 5. Testing

- [x] 5.1 Test successful token refresh (Python)
- [x] 5.2 Test successful token refresh (Apps Script)
- [x] 5.3 Test expired refresh token handling
- [x] 5.4 Test network failure during refresh
- [x] 5.5 Test concurrent request handling
- [x] 5.6 Test proactive refresh (before expiry)

## 6. Documentation

- [x] 6.1 Update README.md with refresh token setup
- [x] 6.2 Update google_chat_bot/SETUP.md
- [x] 6.3 Add troubleshooting for refresh failures
- [x] 6.4 Document environment variables

## 7. Spec Updates

- [x] 7.1 Update security/spec.md with refresh token requirements
- [x] 7.2 Update integrations/goto-api/spec.md with refresh flow
