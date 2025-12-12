# Security Specification

## Purpose

Define security requirements for the patient communication system, including credential management, access control, and compliance considerations.

## Requirements

### Requirement: Credential Storage
The system SHALL NOT store credentials in source code.

#### Scenario: Python configuration
- WHEN GoTo API credentials are needed
- THEN they SHALL be read from environment variables
- OR passed directly to the client at runtime
- AND NEVER committed to version control

#### Scenario: Apps Script configuration
- WHEN GoTo API credentials are needed
- THEN they SHALL be stored in Script Properties
- AND accessed via PropertiesService.getScriptProperties()
- AND NEVER hardcoded in .gs files

#### Scenario: Credential in source code detected
- WHEN credentials are found in source files
- THEN deployment should be blocked
- AND credentials should be rotated

### Requirement: Environment Variable Usage
The system SHALL support these environment variables for Python:

| Variable | Purpose | Required |
|----------|---------|----------|
| `GOTO_ACCESS_TOKEN` | OAuth access token | Yes |
| `GOTO_REFRESH_TOKEN` | OAuth refresh token | For auto-refresh |
| `GOTO_CLIENT_ID` | OAuth client ID | For token refresh |
| `GOTO_CLIENT_SECRET` | OAuth client secret | For token refresh |
| `GOTO_TOKEN_EXPIRY` | ISO 8601 token expiry time | Optional |

#### Scenario: Missing required variable
- WHEN GOTO_ACCESS_TOKEN is not set
- AND no token is passed to the client
- THEN a clear error message is displayed
- AND instructions for obtaining a token are shown

#### Scenario: Refresh credentials incomplete
- WHEN auto-refresh is attempted
- AND GOTO_REFRESH_TOKEN, GOTO_CLIENT_ID, or GOTO_CLIENT_SECRET is missing
- THEN a TokenRefreshError is raised
- AND the error message specifies which credentials are missing

### Requirement: Token Expiration Handling
The system SHALL handle expired access tokens gracefully.

#### Scenario: Token expired during operation
- WHEN an API call returns HTTP 401
- AND auto-refresh is enabled with valid credentials
- THEN the access token is refreshed automatically
- AND the original operation is retried
- AND the operation completes without user intervention

#### Scenario: Token expired without auto-refresh
- WHEN an API call returns HTTP 401
- AND auto-refresh is NOT configured
- THEN a TokenExpiredError is raised
- AND instructions for refreshing are provided

#### Scenario: Proactive token refresh
- WHEN a refresh token is available
- AND the access token will expire within 12 minutes
- THEN a new access token is obtained proactively
- AND the operation continues without interruption

#### Scenario: Refresh token expired
- WHEN the refresh token is invalid or expired (HTTP 401 on refresh)
- THEN a TokenExpiredError is raised
- AND instructions for re-authentication are provided
- AND the user is directed to the OAuth authorization flow

### Requirement: Refresh Token Security
The system SHALL protect refresh tokens as sensitive credentials.

#### Scenario: Refresh token storage (Python)
- WHEN a refresh token is configured
- THEN it SHALL be stored in environment variables
- OR passed securely at runtime
- AND NEVER logged or exposed in error messages

#### Scenario: Refresh token storage (Apps Script)
- WHEN a refresh token is configured
- THEN it SHALL be stored in Script Properties
- AND logged to a secure "Token Log" sheet for audit
- AND NOT exposed in user-facing messages

#### Scenario: Refresh token rotation
- WHEN a token refresh returns a new refresh token
- THEN the old refresh token SHALL be replaced
- AND the new refresh token SHALL be stored securely

### Requirement: Audit Logging
The system SHALL maintain audit logs for compliance.

#### Scenario: Message sent via Chat bot
- WHEN a message is sent through Google Chat
- THEN the sender's Google email is logged
- AND timestamp, recipient, and content are recorded

#### Scenario: Message sent via CLI
- WHEN a message is sent through the CLI
- THEN the system user or "CLI" is logged
- AND timestamp, recipient, and content are recorded

### Requirement: PHI Minimization
The system SHALL minimize Protected Health Information (PHI) exposure.

#### Scenario: Message logging
- WHEN a message is logged
- THEN full message content IS logged (for compliance audit)
- BUT message content is NOT exposed in error messages to users
- AND logs are access-controlled

#### Scenario: Error messages
- WHEN an error occurs
- THEN the error message does NOT include patient names
- AND the error message does NOT include message content
- AND only phone numbers may be referenced for debugging

### Requirement: Access Control
The system SHALL restrict access to authorized users.

#### Scenario: Google Chat bot access
- WHEN the bot is deployed
- THEN it is only available in specified Google Workspace domain
- AND only in spaces where it is explicitly added

#### Scenario: CLI access
- WHEN the CLI is used
- THEN access is controlled by:
  - File system permissions
  - Environment variable access
  - Network access to GoTo API

### Requirement: Secure Communication
The system SHALL use encrypted communication channels.

#### Scenario: API calls
- WHEN calls are made to GoTo API
- THEN HTTPS is used (TLS 1.2+)
- AND certificates are validated

#### Scenario: Google services
- WHEN calls are made to Google APIs
- THEN OAuth 2.0 is used
- AND HTTPS is mandatory

## Compliance Considerations

### HIPAA
- **Minimum Necessary:** Only collect/log data needed for operation
- **Access Controls:** Restrict system access to authorized staff
- **Audit Trail:** Log all PHI access and transmission
- **Encryption:** Use TLS for all data in transit

### TCPA (Telephone Consumer Protection Act)
- **Consent:** Ensure patient consent for SMS communication
- **Opt-Out:** Honor STOP requests promptly
- **Time Restrictions:** Respect quiet hours (if applicable)

### CAN-SPAM (if applicable to SMS)
- **Identification:** Messages identify the sending practice
- **Opt-Out:** Clear mechanism to stop messages

## Implementation Checklist

### Before Deployment
- [ ] Remove any hardcoded credentials
- [ ] Set up environment variables
- [ ] Configure Script Properties (Apps Script)
- [ ] Restrict Chat bot visibility
- [ ] Set up logging spreadsheet with access controls
- [ ] Review templates for PHI/compliance

### Ongoing
- [ ] Rotate credentials periodically
- [ ] Review audit logs
- [ ] Update access as staff changes
- [ ] Monitor for failed authentication attempts

## Incident Response

### Credential Exposure
1. Immediately rotate affected credentials
2. Review logs for unauthorized access
3. Notify appropriate parties per policy
4. Update credentials in all environments

### Unauthorized Access
1. Disable affected access immediately
2. Review audit logs
3. Determine scope of access
4. Follow incident response policy
