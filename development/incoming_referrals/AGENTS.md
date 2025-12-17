# Incoming Referrals - Google Apps Script

## Overview

Google Apps Script project for processing incoming patient referrals. Handles form submissions, provider/clinic normalization, Gemini AI triage, and Google Chat notifications.

## Tech Stack

- **Platform**: Google Apps Script
- **AI**: Gemini API (via GeminiTriage.js)
- **Notifications**: Google Chat webhooks
- **Data**: Google Sheets

## Project Structure

```
incoming_referrals/
├── Code.js                    # Main entry point
├── OnFormSubmit.js            # Form submission handler
├── GeminiTriage.js            # AI-powered triage
├── GoogleChatNotifications.js # Chat integration
├── *Normalization.js          # Data normalization modules
└── Dict_*.js                  # Dictionary/lookup modules
```

## Key Files

| File | Purpose |
|------|---------|
| `OnFormSubmit.js` | Trigger handler for form submissions |
| `GeminiTriage.js` | AI triage using Gemini |
| `ProviderNormalization.js` | Standardize provider names |
| `ClinicNormalization.js` | Standardize clinic names |
| `GoogleChatNotifications.js` | Send notifications |

## Beads Integration

Use `bd` for task tracking:
```bash
bd ready              # Find available work
bd create "Task" --description="Details" -t task -p 1 --json
bd sync               # End of session
```

## Development Notes

- This is Google Apps Script, not Node.js
- Deploy via clasp or Apps Script editor
- Test with sample data in `Sample_Data.csv`
- See `docs/` for additional documentation
