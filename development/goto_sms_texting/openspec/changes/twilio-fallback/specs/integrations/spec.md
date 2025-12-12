# Delta for Integrations Specification

## ADDED Requirements

### Requirement: Provider Abstraction
The system SHALL abstract SMS provider details behind a common interface.

#### Scenario: Send via primary provider
- GIVEN GoTo is configured as primary provider
- WHEN a message send is requested
- THEN GoTo API is used
- AND provider name is logged with the message

#### Scenario: Send via fallback provider
- GIVEN Twilio is configured as fallback
- AND primary provider fails
- WHEN a message send is requested
- THEN Twilio API is used as fallback
- AND failover event is logged

### Requirement: Twilio Integration
The system SHALL support Twilio as an SMS provider.

#### Scenario: Twilio authentication
- GIVEN valid Twilio Account SID and Auth Token
- WHEN Twilio is used for sending
- THEN authentication succeeds
- AND messages can be sent

#### Scenario: Twilio message send
- GIVEN Twilio is the active provider
- WHEN a message is sent
- THEN Twilio API is called
- AND response is mapped to common format

### Requirement: Automatic Failover
The system SHALL automatically fail over to backup provider on primary failure.

#### Scenario: Primary provider timeout
- GIVEN primary provider does not respond within timeout
- WHEN a send is attempted
- THEN fallback provider is used
- AND original message is delivered via fallback
- AND failover is logged

#### Scenario: Primary provider error
- GIVEN primary provider returns 5xx error
- WHEN a send is attempted
- THEN fallback provider is tried
- AND if fallback succeeds, message is delivered

#### Scenario: Non-retriable error
- GIVEN primary provider returns 4xx error (bad request)
- WHEN a send fails
- THEN failover is NOT attempted
- AND error is returned to caller

### Requirement: Provider Health Monitoring
The system SHALL monitor provider availability.

#### Scenario: Health check passes
- WHEN provider health is checked
- AND API responds successfully
- THEN provider is marked healthy

#### Scenario: Health check fails
- WHEN provider health is checked
- AND API does not respond or returns error
- THEN provider is marked unhealthy
- AND failover may be preemptively activated
