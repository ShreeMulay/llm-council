# Delta for Core SMS Specification

## ADDED Requirements

### Requirement: Incoming Message Handling
The system SHALL capture and process incoming SMS responses from patients.

#### Scenario: CONFIRM response received
- GIVEN a patient received an appointment reminder
- WHEN the patient replies "CONFIRM"
- THEN the response is logged
- AND the appointment is marked as confirmed

#### Scenario: STOP response received
- GIVEN a patient receives any message
- WHEN the patient replies "STOP"
- THEN the phone number is added to do-not-contact list
- AND a confirmation is sent to the patient
- AND future sends to this number are blocked

### Requirement: Do-Not-Contact List
The system SHALL maintain a do-not-contact list and respect opt-out requests.

#### Scenario: Send to opted-out number
- GIVEN a phone number on the do-not-contact list
- WHEN a send is attempted to that number
- THEN the send is blocked
- AND the blocked attempt is logged
- AND the caller is informed the number has opted out

#### Scenario: Re-opt-in via START
- GIVEN a phone number on the do-not-contact list
- WHEN the patient sends "START"
- THEN the number is removed from the do-not-contact list
- AND future sends are allowed

### Requirement: Response Analytics
The system SHALL track messaging analytics for reporting.

#### Scenario: View response rate
- WHEN analytics are requested
- THEN response rate (responses / messages sent) is calculated
- AND breakdown by template type is available

#### Scenario: View opt-out rate
- WHEN analytics are requested
- THEN opt-out rate is calculated
- AND trend over time is available
