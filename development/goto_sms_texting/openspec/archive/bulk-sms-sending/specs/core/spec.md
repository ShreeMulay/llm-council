# Delta for Core SMS Specification

## ADDED Requirements

### Requirement: Batch Message Sending
The system SHALL support sending messages to multiple recipients in a batch operation.

#### Scenario: Send batch from CSV
- GIVEN a CSV file with patient phone numbers and names
- WHEN a batch send is initiated with a template
- THEN messages are sent to all valid recipients
- AND progress is reported during sending
- AND a summary report is generated

#### Scenario: Rate-limited batch sending
- GIVEN a batch of 100 recipients
- WHEN batch sending is initiated
- THEN messages are sent with configurable delay between sends
- AND API rate limits are respected

#### Scenario: Batch with failures
- GIVEN a batch containing some invalid phone numbers
- WHEN batch sending is initiated
- THEN valid numbers receive messages
- AND invalid numbers are skipped and logged
- AND the batch continues (no fail-fast)

### Requirement: Campaign Management
The system SHALL track batch sends as named campaigns.

#### Scenario: Create named campaign
- WHEN a batch send is initiated
- THEN a campaign name can be assigned
- AND all messages are linked to the campaign
- AND campaign-level reporting is available

#### Scenario: View campaign results
- GIVEN a completed campaign
- WHEN campaign details are requested
- THEN total sent, success, and failure counts are shown
- AND individual message status is available

### Requirement: Batch Import
The system SHALL import recipient lists from external sources.

#### Scenario: Import from CSV
- GIVEN a CSV file with required columns (phone, first_name)
- WHEN import is initiated
- THEN records are validated
- AND invalid records are reported
- AND valid records are queued for sending

#### Scenario: Import from Google Sheet
- GIVEN a Google Sheet ID with patient data
- WHEN import is initiated
- THEN data is read from the sheet
- AND the same validation applies as CSV import
