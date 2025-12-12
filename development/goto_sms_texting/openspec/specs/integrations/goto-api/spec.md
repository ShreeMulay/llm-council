# GoTo API Integration Specification

## Purpose

Define the integration with GoTo Messaging API for SMS delivery. This spec abstracts the provider details to enable future provider switching.

## Requirements

### Requirement: OAuth 2.0 Authentication
The system SHALL authenticate with GoTo using OAuth 2.0.

#### Scenario: Client credentials authentication
- GIVEN valid client_id and client_secret
- AND the messaging.v1.send scope
- WHEN authentication is requested
- THEN an access token is returned
- AND the token has an expiration time

#### Scenario: Invalid credentials
- GIVEN invalid client_id or client_secret
- WHEN authentication is requested
- THEN an authentication error is returned
- AND no token is issued

#### Scenario: Token usage
- GIVEN a valid access token
- WHEN an API request is made
- THEN the token is sent in the Authorization header as Bearer token

### Requirement: Access Token Management
The system SHALL manage access token lifecycle.

#### Scenario: Token storage (Python)
- WHEN a token is obtained
- THEN it MAY be stored in an environment variable
- OR passed directly to the client

#### Scenario: Token storage (Apps Script)
- WHEN a token is configured
- THEN it SHALL be stored in Script Properties
- AND NOT in source code

#### Scenario: Token expiration detection
- WHEN an API call returns HTTP 401
- THEN the system SHALL attempt token refresh (if configured)
- AND retry the original request
- OR indicate token expiration if refresh not possible

#### Scenario: Proactive token refresh
- WHEN token expiry is tracked
- AND token will expire within 12 minutes (720 seconds)
- THEN the system SHALL refresh the token proactively
- BEFORE making the API request

### Requirement: Token Refresh Flow
The system SHALL support automatic token refresh using refresh tokens.

#### Scenario: Successful token refresh
- GIVEN a valid refresh token
- AND valid client credentials (client_id, client_secret)
- WHEN refresh is requested
- THEN a new access token is obtained
- AND the token expiry is updated
- AND any new refresh token replaces the old one

#### Scenario: Refresh token expired
- GIVEN an expired or invalid refresh token
- WHEN refresh is requested
- THEN HTTP 401 is returned
- AND a TokenExpiredError is raised
- AND re-authentication is required

#### Scenario: Transient refresh failure
- GIVEN a network error during refresh
- WHEN refresh fails
- THEN retry with exponential backoff (1s, 2s, 4s)
- AND after 3 failures, raise TokenRefreshError

#### Scenario: 401 during API call
- GIVEN an API call returns HTTP 401
- AND auto-refresh is enabled
- WHEN the error is detected
- THEN refresh the token automatically
- AND retry the original API call once

### Requirement: Message Sending API
The system SHALL send messages via the GoTo Messaging API.

#### Scenario: Successful message send
- GIVEN a valid access token
- AND a valid payload with ownerPhoneNumber, contactPhoneNumbers, body
- WHEN POST /messaging/v1/messages is called
- THEN HTTP 200 or 201 is returned
- AND a message ID is included in the response

#### Scenario: Invalid phone number
- GIVEN an invalid contactPhoneNumber
- WHEN the API is called
- THEN an error response is returned
- AND the error details are parseable

#### Scenario: Rate limiting
- WHEN too many requests are made
- THEN HTTP 429 is returned
- AND appropriate backoff should be applied

#### Scenario: Server error
- WHEN the GoTo API is unavailable
- THEN HTTP 5xx is returned
- AND the error is logged
- AND the operation is retryable

## API Details

### Base Configuration

| Setting | Value |
|---------|-------|
| Base URL | `https://api.goto.com` |
| Auth URL | `https://authentication.logmeininc.com/oauth/token` |
| Required Scope | `messaging.v1.send` |

### Send Message Endpoint

**POST** `/messaging/v1/messages`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "ownerPhoneNumber": "+15145550100",
  "contactPhoneNumbers": ["+15145550199"],
  "body": "Message content here"
}
```

**Success Response (200/201):**
```json
{
  "id": "msg_123456789",
  "ownerPhoneNumber": "+15145550100",
  "contactPhoneNumbers": ["+15145550199"],
  "body": "Message content here",
  "timestamp": "2024-12-01T10:30:00Z"
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": "error_code",
  "message": "Human readable error message"
}
```

### OAuth Token Endpoint

**POST** `https://authentication.logmeininc.com/oauth/token`

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(client_id:client_secret)}
```

#### Client Credentials Grant (Initial Token)

**Request Body:**
```
grant_type=client_credentials
&client_id={client_id}
&client_secret={client_secret}
&scope=messaging.v1.send
```

**Success Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### Refresh Token Grant (Token Refresh)

**Request Body:**
```
grant_type=refresh_token
&refresh_token={refresh_token}
```

**Success Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new_refresh_token..."
}
```

**Notes:**
- Refresh token is obtained via authorization code flow (not client credentials)
- A new refresh token MAY be returned; if so, replace the old one
- Refresh tokens expire after ~30 days of inactivity

## Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 200, 201 | Success | Return result |
| 400 | Bad request | Check payload format |
| 401 | Unauthorized | Token expired, refresh needed |
| 403 | Forbidden | Check scope/permissions |
| 404 | Not found | Check endpoint URL |
| 429 | Rate limited | Apply exponential backoff |
| 500+ | Server error | Retry with backoff |

## Implementation Notes

### Python (`goto_sms.py`)
- Uses `requests` library
- Token passed via constructor or environment
- Returns dict with success/error info

### Apps Script (`Code.gs`)
- Uses `UrlFetchApp.fetch()`
- Token stored in Script Properties
- Returns object with success/error info

### Future Provider Abstraction
To add a new provider:
1. Create new integration spec
2. Implement same interface (send_sms, etc.)
3. Add provider selection config
4. Core spec remains unchanged
