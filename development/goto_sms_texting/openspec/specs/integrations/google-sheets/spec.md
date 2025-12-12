# Google Sheets Logging Integration Specification

## Purpose

Define the logging and tracking system using Google Sheets for audit trails, patient contact history, and analytics.

## Requirements

### Requirement: Message Logging
The system SHALL log all SMS sending attempts to a Google Sheet.

#### Scenario: Successful message logged
- WHEN a message is sent successfully
- THEN a row is added to the "Message Log" sheet
- AND all required fields are populated

#### Scenario: Failed message logged
- WHEN a message fails to send
- THEN a row is added to the "Message Log" sheet
- AND the status is "FAILED"
- AND error details are included

#### Scenario: Sheet doesn't exist
- WHEN the "Message Log" sheet doesn't exist
- THEN it is created automatically
- AND headers are added

### Requirement: Patient Contact Tracking
The system SHALL track patient contact history.

#### Scenario: New patient contact
- WHEN a message is sent to a new phone number
- THEN a row is added to the "Patients" sheet
- AND contact count is set to 1

#### Scenario: Existing patient contact
- WHEN a message is sent to an existing phone number
- THEN the existing row is updated
- AND contact count is incremented
- AND last template is updated

### Requirement: Sender Identification
The system SHALL record who sent each message.

#### Scenario: Chat bot sender
- WHEN a message is sent via Google Chat bot
- THEN the sender's Google email is logged

#### Scenario: CLI sender
- WHEN a message is sent via CLI
- THEN "CLI" or system user is logged

## Sheet Structures

### Message Log Sheet

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp | When message was sent | 2024-12-01 10:30:00 |
| Phone Number | Recipient phone (E.164) | +15145550199 |
| Message | Content (truncated to 100 chars) | Hi John! This is... |
| Status | SUCCESS, FAILED, ERROR | SUCCESS |
| Details | Message ID or error | msg_123456 |
| Sent By | User email or "CLI" | user@practice.com |

### Patients Sheet

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp | Last contact time | 2024-12-01 10:30:00 |
| First Name | Patient first name | John |
| Last Name | Patient last name | Smith |
| Phone | Phone number (E.164) | +15145550199 |
| Last Template | Most recent template used | appointment_reminder |
| Contact Count | Total messages sent | 5 |

### Incoming Messages Sheet

| Column | Description | Example |
|--------|-------------|---------|
| Received At | When message was received | 2024-12-01 10:45:00 |
| From Number | Sender phone (E.164) | +15145550199 |
| Message | Full message content | CONFIRM |
| Classification | CONFIRM, STOP, START, HELP, OTHER | CONFIRM |
| Message ID | GoTo message ID | msg_789012 |
| Processed | AUTO-PROCESSED or NEEDS REVIEW | AUTO-PROCESSED |
| Notes | Manual notes | - |

### Confirmations Sheet

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp | When confirmation received | 2024-12-01 10:45:00 |
| Phone Number | Patient phone (E.164) | +15145550199 |
| Response | Actual response text | CONFIRM |
| Status | CONFIRMED | CONFIRMED |
| Matched Appointment | Original message info | Reminder for Dec 1... |
| Original Message Timestamp | When reminder was sent | 2024-12-01 09:00:00 |

### Do Not Contact Sheet

| Column | Description | Example |
|--------|-------------|---------|
| Phone Number | Blocked phone (E.164) | +15145550199 |
| Added Date | When blocked | 2024-12-01 10:45:00 |
| Reason | Why blocked | STOP request |
| Original Message | Patient's message | STOP |
| Status | ACTIVE or REMOVED | ACTIVE |

### Blocked Messages Sheet

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp | When send was attempted | 2024-12-01 11:00:00 |
| Phone Number | Blocked phone | +15145550199 |
| Message | Attempted message | Hi John... |
| Reason | Why blocked | Recipient opted out (STOP) |
| Attempted By | User email | user@practice.com |

### Token Log Sheet

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp | When event occurred | 2024-12-01 10:30:00 |
| Event | Event type | Token Refresh |
| Status | SUCCESS, FAILED, ERROR | SUCCESS |
| Details | Additional info | Token refreshed |

### Analytics Sheet

Auto-generated dashboard with:
- Weekly/monthly message counts
- Delivery rate
- Response rate
- Confirmation rate
- Opt-out rate

## Configuration

### Spreadsheet ID
The Google Sheet ID is extracted from the URL:
```
https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
```

### Access Requirements
The Apps Script service account needs edit access to the spreadsheet.

## Implementation Notes

### Auto-Creation
Sheets and headers are created automatically on first use.

### Message Truncation
Messages are truncated to 100 characters in logs to save space while maintaining audit trail.

### Privacy Consideration
- Full message content is logged (for compliance)
- Logs should be access-controlled
- Consider retention policy for HIPAA compliance

### Error Handling
Logging failures should not prevent SMS sending:
```javascript
try {
  logMessage(...);
} catch (error) {
  Logger.log('Failed to log: ' + error);
  // Continue - don't fail the SMS send
}
```

## Future Enhancements

### Analytics Dashboard
- Daily/weekly send counts
- Success rate tracking
- Template usage statistics

### Retention Management
- Automatic archival of old logs
- Configurable retention period

### Export Functionality
- Export logs to CSV
- Compliance reporting
