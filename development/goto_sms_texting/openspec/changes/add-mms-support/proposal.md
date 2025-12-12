# Change Proposal: MMS Support (Images & Attachments)

## Summary

Enable sending MMS messages with images and attachments for richer patient communication.

## Motivation

### Current State
- Only plain text SMS supported
- Cannot share images or documents
- Limited communication options

### Problems
1. **Limited Content:** Can't share visual educational materials
2. **No Documents:** Can't send appointment summaries or forms
3. **Engagement:** Text-only messages less engaging
4. **Directions:** Can't send clinic maps

### Desired State
- Send images (JPG, PNG) with messages
- Send PDF documents
- Share location/maps
- Rich media templates

## Scope

### In Scope
- Image attachment support (JPG, PNG, GIF)
- PDF attachment support
- Media URL support
- File size validation
- Media-enabled templates
- Update both Python and Apps Script

### Out of Scope
- Video attachments (size/cost concerns)
- Audio messages
- Interactive media
- Media storage/hosting (use existing URLs)

## Success Criteria

1. **Image Sending:** Can send message with image attachment
2. **PDF Sending:** Can send message with PDF attachment
3. **URL Support:** Can include media via URL
4. **Validation:** File size/type validated before send
5. **Templates:** At least 2 media-enabled templates

## Technical Approach

### GoTo API MMS
```json
{
  "ownerPhoneNumber": "+15145550100",
  "contactPhoneNumbers": ["+15145550199"],
  "body": "Here's a map to our clinic!",
  "mediaUrls": [
    "https://example.com/clinic-map.png"
  ]
}
```

### Python Interface
```python
sms.send_mms(
    phone_number="+15145550199",
    message="Here's your wound care guide",
    media_urls=["https://example.com/wound-care.pdf"]
)
```

### Media Templates

**Clinic Map:**
```
Hi {patient_name}! Here's a map to our clinic for your appointment on {date}.
[Attachment: clinic-map.png]
```

**Wound Care Instructions:**
```
Hi {patient_name}! Here are your wound care instructions. Please review before your follow-up.
[Attachment: wound-care.pdf]
```

## Media Constraints

| Type | Max Size | Formats |
|------|----------|---------|
| Image | 1 MB | JPG, PNG, GIF |
| Document | 2 MB | PDF |
| Total per message | 3 MB | - |

Note: Verify GoTo API actual limits.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| MMS not supported by GoTo | Verify API capability first |
| Large file failures | Pre-validation, clear errors |
| Recipient carrier doesn't support MMS | Graceful degradation to SMS |
| Media URL expires | Use stable URLs, warn about expiry |

## Dependencies

- GoTo API MMS support (must verify)
- Media hosting (external - not in scope)

## Estimated Effort

| Component | Effort |
|-----------|--------|
| API research and testing | 2 hours |
| Python MMS implementation | 3-4 hours |
| Apps Script MMS implementation | 3-4 hours |
| Media validation | 2 hours |
| Media templates | 2 hours |
| Testing | 3 hours |
| Documentation | 1 hour |
| **Total** | **16-18 hours** |

## Pre-Requisites

Before starting implementation:
1. **Verify** GoTo API supports MMS
2. **Identify** media URL requirements
3. **Confirm** file size limits
4. **Test** with GoTo support if needed
