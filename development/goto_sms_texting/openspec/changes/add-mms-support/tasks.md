# Tasks: MMS Support (Images & Attachments)

## 1. Research & Validation

- [ ] 1.1 Verify GoTo API MMS capabilities
- [ ] 1.2 Document MMS API payload format
- [ ] 1.3 Identify supported media types
- [ ] 1.4 Confirm file size limits
- [ ] 1.5 Test MMS sending via API explorer
- [ ] 1.6 Document carrier MMS support considerations

## 2. Python Core Implementation

- [ ] 2.1 Add `media_urls` parameter to `send_sms()`
- [ ] 2.2 Create `send_mms()` convenience method
- [ ] 2.3 Implement media URL validation
- [ ] 2.4 Implement file size validation (if checkable)
- [ ] 2.5 Handle MMS-specific errors
- [ ] 2.6 Update API payload construction

## 3. Media Validation

- [ ] 3.1 Create `validate_media_url()` function
- [ ] 3.2 Check URL accessibility (HEAD request)
- [ ] 3.3 Validate content type from headers
- [ ] 3.4 Validate file size from headers
- [ ] 3.5 Return clear validation errors

## 4. Template Updates

- [ ] 4.1 Add media_urls field to template structure
- [ ] 4.2 Create "Clinic Map" template with media
- [ ] 4.3 Create "Wound Care Instructions" template
- [ ] 4.4 Create "Appointment Summary" template
- [ ] 4.5 Update template rendering to include media

## 5. CLI Implementation

- [ ] 5.1 Add `--media` argument to custom command
- [ ] 5.2 Add `mms` subcommand for media messages
- [ ] 5.3 Support multiple media URLs
- [ ] 5.4 Display media validation results
- [ ] 5.5 Update help text with MMS examples

## 6. Apps Script Implementation

- [ ] 6.1 Update `sendSMS()` to support media
- [ ] 6.2 Create `sendMMS()` function
- [ ] 6.3 Add media URL input to relevant dialogs
- [ ] 6.4 Create MMS-specific slash command
- [ ] 6.5 Add media URL validation

## 7. Google Chat Bot UI

- [ ] 7.1 Add media URL field to custom message dialog
- [ ] 7.2 Create `/send-map` command for clinic directions
- [ ] 7.3 Update success dialog to show media sent
- [ ] 7.4 Handle media validation errors in UI

## 8. Logging Updates

- [ ] 8.1 Add media_urls column to Message Log
- [ ] 8.2 Log media URLs sent with each message
- [ ] 8.3 Track MMS vs SMS in analytics

## 9. Testing

- [ ] 9.1 Test image sending (JPG)
- [ ] 9.2 Test image sending (PNG)
- [ ] 9.3 Test PDF sending
- [ ] 9.4 Test multiple media URLs
- [ ] 9.5 Test oversized file rejection
- [ ] 9.6 Test invalid URL handling
- [ ] 9.7 Test MMS to non-MMS capable number
- [ ] 9.8 Test media templates

## 10. Documentation

- [ ] 10.1 Document MMS capabilities in README
- [ ] 10.2 Document media URL requirements
- [ ] 10.3 Document file size limits
- [ ] 10.4 Add MMS examples to CLI help
- [ ] 10.5 Update Apps Script documentation

## 11. Spec Updates

- [ ] 11.1 Create MMS spec or update core spec
- [ ] 11.2 Update templates spec with media templates
- [ ] 11.3 Update GoTo API spec with MMS endpoint
