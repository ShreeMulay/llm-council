# Tasks: Twilio Fallback Provider

## 1. Provider Abstraction Layer

- [ ] 1.1 Create `SMSProvider` abstract base class
- [ ] 1.2 Define common interface: `send()`, `health_check()`
- [ ] 1.3 Create `ProviderResult` class for unified responses
- [ ] 1.4 Create `ProviderError` exception hierarchy
- [ ] 1.5 Refactor GoTo implementation to extend base class

## 2. Twilio Integration

- [ ] 2.1 Add `twilio` to requirements.txt
- [ ] 2.2 Create `TwilioProvider` class
- [ ] 2.3 Implement Twilio authentication
- [ ] 2.4 Implement `send()` method for Twilio
- [ ] 2.5 Implement `health_check()` for Twilio
- [ ] 2.6 Handle Twilio-specific errors
- [ ] 2.7 Map Twilio response to common format

## 3. SMS Router

- [ ] 3.1 Create `SMSRouter` class
- [ ] 3.2 Implement primary provider send
- [ ] 3.3 Implement failover logic
- [ ] 3.4 Define retriable vs non-retriable errors
- [ ] 3.5 Add failover event logging
- [ ] 3.6 Implement provider health tracking

## 4. Configuration Updates

- [ ] 4.1 Add Twilio config section to config.py
- [ ] 4.2 Add provider selection config
- [ ] 4.3 Add failover enabled/disabled toggle
- [ ] 4.4 Add environment variables for Twilio credentials
- [ ] 4.5 Create configuration validation

## 5. GoToSMS Class Updates

- [ ] 5.1 Update GoToSMS to use SMSRouter
- [ ] 5.2 Maintain backward compatibility
- [ ] 5.3 Add provider info to response
- [ ] 5.4 Update initialization with router

## 6. Logging Updates

- [ ] 6.1 Add "Provider" column to Message Log
- [ ] 6.2 Log which provider was used
- [ ] 6.3 Log failover events
- [ ] 6.4 Add provider to analytics

## 7. Apps Script Implementation

- [ ] 7.1 Create TwilioProvider in Apps Script
- [ ] 7.2 Add Twilio credentials to Script Properties
- [ ] 7.3 Implement failover logic in Apps Script
- [ ] 7.4 Update sendSMS to use router pattern

## 8. Health Check System

- [ ] 8.1 Create health check endpoint/function
- [ ] 8.2 Implement periodic health checks
- [ ] 8.3 Track provider availability history
- [ ] 8.4 Alert on provider failures (optional)

## 9. Testing

- [ ] 9.1 Test GoTo provider in isolation
- [ ] 9.2 Test Twilio provider in isolation
- [ ] 9.3 Test failover: GoTo fails, Twilio succeeds
- [ ] 9.4 Test failover: both fail
- [ ] 9.5 Test non-retriable error (no failover)
- [ ] 9.6 Test health check accuracy
- [ ] 9.7 Test configuration validation
- [ ] 9.8 Test backward compatibility

## 10. Documentation

- [ ] 10.1 Document multi-provider setup
- [ ] 10.2 Document Twilio account setup
- [ ] 10.3 Document failover behavior
- [ ] 10.4 Document configuration options
- [ ] 10.5 Add troubleshooting for provider issues
- [ ] 10.6 Document phone number considerations

## 11. Spec Updates

- [ ] 11.1 Create provider abstraction spec
- [ ] 11.2 Create Twilio integration spec
- [ ] 11.3 Update core spec with failover requirements
- [ ] 11.4 Update security spec with Twilio credentials
