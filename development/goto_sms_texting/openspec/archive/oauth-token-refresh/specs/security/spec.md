# Delta for Security Specification

## ADDED Requirements

### Requirement: Refresh Token Storage
The system SHALL securely store OAuth refresh tokens.

#### Scenario: Python refresh token storage
- WHEN a refresh token is obtained
- THEN it SHALL be stored in environment variable `GOTO_REFRESH_TOKEN`
- OR passed directly to the client at runtime
- AND NEVER committed to version control

#### Scenario: Apps Script refresh token storage
- WHEN a refresh token is obtained
- THEN it SHALL be stored in Script Properties as `REFRESH_TOKEN`
- AND accessed via PropertiesService

### Requirement: Automatic Token Refresh
The system SHALL automatically refresh access tokens before expiration.

#### Scenario: Proactive refresh
- GIVEN a token that will expire within 20% of its TTL
- WHEN an API operation is requested
- THEN the token is refreshed first
- AND the operation proceeds with the new token

#### Scenario: Refresh on 401
- GIVEN an expired access token
- WHEN an API call returns HTTP 401
- THEN token refresh is attempted
- AND the original operation is retried once

### Requirement: Refresh Failure Handling
The system SHALL handle refresh token failures gracefully.

#### Scenario: Refresh token expired
- WHEN the refresh token is expired or invalid
- THEN a clear error message is shown
- AND instructions for re-authentication are provided
- AND the system does not crash

#### Scenario: Network failure during refresh
- WHEN a network error occurs during token refresh
- THEN retry with exponential backoff is attempted
- AND after max retries, user is notified

## MODIFIED Requirements

### Requirement: Environment Variable Usage (MODIFIED)
The system SHALL support these environment variables for Python:

| Variable | Purpose | Required |
|----------|---------|----------|
| `GOTO_ACCESS_TOKEN` | OAuth access token | Yes (or auto-refresh) |
| `GOTO_REFRESH_TOKEN` | OAuth refresh token | For auto-refresh |
| `GOTO_CLIENT_ID` | OAuth client ID | For token refresh |
| `GOTO_CLIENT_SECRET` | OAuth client secret | For token refresh |
| `GOTO_TOKEN_EXPIRY` | Token expiration timestamp | For proactive refresh |

#### Scenario: Auto-refresh enabled
- GIVEN GOTO_REFRESH_TOKEN is set
- AND GOTO_CLIENT_ID and GOTO_CLIENT_SECRET are set
- WHEN GOTO_ACCESS_TOKEN expires
- THEN a new access token is obtained automatically

#### Scenario: Auto-refresh not configured
- GIVEN GOTO_REFRESH_TOKEN is not set
- WHEN GOTO_ACCESS_TOKEN expires
- THEN the user is prompted to provide a new token manually
