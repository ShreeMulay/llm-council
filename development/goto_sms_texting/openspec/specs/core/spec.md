# Core SMS Sending Specification

## Purpose

Define the fundamental SMS sending capability independent of provider or interface. This spec ensures consistent behavior across all implementations (Python, Apps Script, future interfaces).

## Requirements

### Requirement: Single Message Sending
The system SHALL send an SMS message to a single phone number.

#### Scenario: Valid phone number and message
- GIVEN a valid E.164 phone number
- AND a non-empty message body
- WHEN a send request is submitted
- THEN the message is delivered via the configured SMS provider
- AND a delivery confirmation with message ID is returned

#### Scenario: Invalid phone number format
- GIVEN a phone number not in E.164 format
- WHEN a send request is submitted
- THEN the system attempts to convert to E.164
- AND if conversion fails, returns a validation error
- AND no message is sent to the provider

#### Scenario: Empty message body
- GIVEN an empty or whitespace-only message
- WHEN a send request is submitted
- THEN the system returns a validation error
- AND no message is sent

### Requirement: Phone Number Normalization
The system SHALL normalize phone numbers to E.164 format.

#### Scenario: 10-digit US number
- GIVEN a phone number "5145550199"
- WHEN normalization is applied
- THEN the result is "+15145550199"

#### Scenario: Number with formatting
- GIVEN a phone number "(514) 555-0199"
- WHEN normalization is applied
- THEN the result is "+15145550199"

#### Scenario: Number with country code
- GIVEN a phone number "15145550199"
- WHEN normalization is applied
- THEN the result is "+15145550199"

#### Scenario: Already E.164 format
- GIVEN a phone number "+15145550199"
- WHEN normalization is applied
- THEN the result is unchanged

### Requirement: Multi-Recipient Sending
The system SHALL support sending the same message to multiple recipients in a single operation.

#### Scenario: Multiple valid recipients
- GIVEN a list of 3 valid phone numbers
- AND a message body
- WHEN a batch send is requested
- THEN the message is sent to all 3 recipients
- AND individual delivery status is available for each

#### Scenario: Mixed valid and invalid recipients
- GIVEN a list containing valid and invalid phone numbers
- WHEN a batch send is requested
- THEN valid numbers receive the message
- AND invalid numbers are reported as failures
- AND the operation continues (no fail-fast)

### Requirement: Message Logging
The system SHALL log all SMS sending attempts for audit purposes.

#### Scenario: Successful message send
- WHEN a message is sent successfully
- THEN a log entry is created containing:
  - Timestamp
  - Recipient phone number
  - Message content (or preview)
  - Status: SUCCESS
  - Provider message ID
  - Sender identity (if available)

#### Scenario: Failed message send
- WHEN a message fails to send
- THEN a log entry is created containing:
  - Timestamp
  - Recipient phone number
  - Message content (or preview)
  - Status: FAILED
  - Error details

### Requirement: Owner Phone Configuration
The system SHALL send messages from a configured owner phone number.

#### Scenario: Owner phone configured
- GIVEN a valid owner phone number in configuration
- WHEN any message is sent
- THEN the owner phone number is used as the sender

#### Scenario: Owner phone not configured
- GIVEN no owner phone number in configuration
- WHEN a send is attempted
- THEN the system returns a configuration error
- AND no message is sent

### Requirement: Do-Not-Contact Compliance
The system SHALL respect opt-out requests and maintain a Do-Not-Contact list.

#### Scenario: Send to opted-out number
- GIVEN a phone number is on the Do-Not-Contact list
- WHEN a send request is submitted to that number
- THEN the send is blocked
- AND the blocked attempt is logged
- AND a MessageBlockedError is raised (Python) or error returned (Apps Script)
- AND the caller is informed the recipient has opted out

#### Scenario: Multiple recipients with one opted-out
- GIVEN a list containing an opted-out phone number
- WHEN a batch send is requested
- THEN the entire batch is blocked
- AND all blocked numbers are reported

#### Scenario: STOP response received
- GIVEN a patient sends "STOP" (or equivalent keyword)
- WHEN the response is processed
- THEN the phone number is added to Do-Not-Contact list
- AND a confirmation may be sent to the patient
- AND all future sends to this number are blocked

#### Scenario: START response received
- GIVEN a phone number on the Do-Not-Contact list
- AND the patient sends "START" (or equivalent keyword)
- WHEN the response is processed
- THEN the phone number is removed from Do-Not-Contact list
- AND future sends are allowed

### Requirement: Response Tracking
The system SHALL capture and process incoming SMS responses.

#### Scenario: CONFIRM response received
- GIVEN a patient received an appointment message
- WHEN the patient replies "CONFIRM" (or YES, Y, etc.)
- THEN the response is logged
- AND the appointment is marked as confirmed
- AND the original message is linked if possible

#### Scenario: Unknown response received
- GIVEN a patient sends a response not matching known keywords
- WHEN the response is processed
- THEN the response is logged
- AND it is flagged for manual review

## Interfaces

### Python Library
```python
from goto_sms import GoToSMS

sms = GoToSMS(access_token="...")
result = sms.send_sms(
    phone_numbers=["+15145550199"],
    message="Hello from the practice!"
)
```

### Google Apps Script
```javascript
const result = sendSMS("+15145550199", "Hello from the practice!");
```

### CLI
```bash
python send_text.py custom --phone +15145550199 --message "Hello!"
```

## Non-Functional Requirements

### Performance
- Single message send: < 3 seconds
- Batch send: < 1 second per recipient (parallelized where possible)

### Reliability
- Failed sends should not crash the application
- Transient failures should be reportable for retry

### Security
- Access tokens never logged
- Phone numbers logged but not exposed in error messages to end users
