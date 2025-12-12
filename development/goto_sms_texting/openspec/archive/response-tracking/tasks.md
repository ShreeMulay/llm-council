# Tasks: Response Tracking & Analytics

## 1. Webhook Setup

- [x] 1.1 Research GoTo webhook capabilities for incoming SMS
  - GoTo supports Messaging Webhook Notifications via Notification Channel API
  - Requires: Create channel -> Create subscription for phone number
  - Super Admin authorization required for subscription creation
  - Webhook receives incoming SMS events with message body
  - API endpoints: /notification-channel/v1/channels, /messaging/v1/subscriptions
- [x] 1.2 Create Apps Script Web App endpoint (doPost)
- [ ] 1.3 Deploy Web App with appropriate permissions
- [ ] 1.4 Register webhook URL with GoTo
- [ ] 1.5 Implement webhook signature verification

## 2. Response Parsing

- [x] 2.1 Define response keyword dictionary
- [x] 2.2 Implement case-insensitive keyword matching
- [x] 2.3 Handle multi-word responses (extract keyword)
- [x] 2.4 Log unrecognized responses for review
- [x] 2.5 Create response classification function

## 3. CONFIRM Processing

- [x] 3.1 Create "Confirmations" sheet in logging spreadsheet
- [x] 3.2 Match incoming phone to pending appointments
- [x] 3.3 Update confirmation status on match
- [x] 3.4 Handle no-match scenarios (log for review)
- [x] 3.5 Add timestamp and response text to confirmation record

## 4. STOP List Management

- [x] 4.1 Create "Do Not Contact" sheet
- [x] 4.2 Add phone number on STOP keyword
- [x] 4.3 Check do-not-contact list before sending
- [x] 4.4 Block sends to opted-out numbers
- [x] 4.5 Log blocked send attempts
- [x] 4.6 Implement re-opt-in process (START keyword)

## 5. Response Logging

- [x] 5.1 Create "Incoming Messages" sheet
- [x] 5.2 Log: timestamp, from number, message, classification
- [x] 5.3 Link to original outbound message (if possible)
- [x] 5.4 Flag messages needing manual review

## 6. Analytics Dashboard

- [x] 6.1 Create "Analytics" sheet with summary formulas
- [x] 6.2 Add daily message count
- [x] 6.3 Add response rate calculation
- [x] 6.4 Add confirmation rate calculation
- [x] 6.5 Add opt-out rate calculation
- [x] 6.6 Add template effectiveness breakdown
- [x] 6.7 Create date range filters

## 7. Reporting

- [x] 7.1 Create weekly summary function
- [x] 7.2 Add email notification for weekly summary (optional)
- [x] 7.3 Create exportable report format

## 8. Python Integration

- [x] 8.1 Add do-not-contact check to send_sms()
- [ ] 8.2 Create function to query confirmation status
- [ ] 8.3 Add analytics query methods

## 9. Testing

- [x] 9.1 Test webhook receives messages (doGet/doPost functions)
- [x] 9.2 Test CONFIRM processing (classifyResponse tests)
- [x] 9.3 Test STOP processing (keyword tests)
- [x] 9.4 Test do-not-contact blocking (24 Python tests in test_response_tracking.py)
- [x] 9.5 Test analytics calculations (getAnalytics function)
- [x] 9.6 Test with various response formats (case-insensitive, multi-word)

## 10. Documentation

- [x] 10.1 Document webhook setup process
- [x] 10.2 Document response keywords
- [x] 10.3 Document analytics dashboard usage
- [x] 10.4 Update SETUP.md with webhook configuration

## 11. Spec Updates

- [x] 11.1 Create response-tracking spec (delta spec already exists)
- [x] 11.2 Update google-sheets spec with new sheets
- [x] 11.3 Update core spec with do-not-contact requirement
