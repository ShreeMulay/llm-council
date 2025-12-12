# Delta for Core SMS Specification

## ADDED Requirements

### Requirement: MMS Message Sending
The system SHALL support sending MMS messages with media attachments.

#### Scenario: Send message with image
- GIVEN a valid image URL (JPG, PNG, GIF)
- WHEN an MMS send is requested
- THEN the image is included in the message
- AND the message is delivered as MMS

#### Scenario: Send message with PDF
- GIVEN a valid PDF URL
- WHEN an MMS send is requested
- THEN the PDF is attached to the message
- AND the message is delivered as MMS

#### Scenario: Multiple media attachments
- GIVEN multiple media URLs
- WHEN an MMS send is requested
- THEN all media items are attached
- AND total size is validated against limits

### Requirement: Media Validation
The system SHALL validate media before sending.

#### Scenario: Valid media URL
- GIVEN a publicly accessible media URL
- WHEN validation is performed
- THEN content type is verified
- AND file size is checked against limits
- AND validation passes

#### Scenario: Invalid media type
- GIVEN a URL pointing to unsupported file type
- WHEN validation is performed
- THEN an error is returned
- AND the send is blocked

#### Scenario: Media too large
- GIVEN a media file exceeding size limits
- WHEN validation is performed
- THEN an error with size limit info is returned
- AND the send is blocked

### Requirement: MMS Templates
The system SHALL support templates with media attachments.

#### Scenario: Template with static media
- GIVEN a template with predefined media URL
- WHEN the template is sent
- THEN the media is included automatically

#### Scenario: Template with dynamic media
- GIVEN a template with media URL placeholder
- WHEN the template is sent with media URL variable
- THEN the provided media is attached
