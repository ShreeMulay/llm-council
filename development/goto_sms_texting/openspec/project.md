# GoTo SMS Patient Texting Platform

## Project Overview

A healthcare patient communication platform that enables medical practices to send SMS text messages to patients via the GoTo API. The system provides multiple interfaces (CLI, Python library, Google Chat Bot) for flexibility and team collaboration.

## Domain

**Healthcare / Patient Communication**

This system handles patient-facing communication for medical practices, including:
- Appointment management (reminders, confirmations)
- Prescription notifications
- Educational content delivery (kidney treatment options)
- Follow-up care coordination
- General patient outreach

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Primary Language** | Python 3.8+ |
| **Secondary Language** | Google Apps Script (JavaScript) |
| **SMS Provider** | GoTo Messaging API v1 |
| **Bot Platform** | Google Chat (Workspace) |
| **Logging/Storage** | Google Sheets |
| **Authentication** | OAuth 2.0 (GoTo), Google Workspace |

## Architecture Principles

### 1. Multi-Interface Design
The same core functionality is accessible via:
- **Python CLI** - For developers and automation scripts
- **Python Library** - For integration into other systems
- **Google Chat Bot** - For staff in Google Workspace

### 2. Template-Driven Messaging
All patient messages use pre-approved templates to ensure:
- Consistency in communication
- HIPAA compliance review
- Easy updates without code changes

### 3. Provider-Agnostic Core
Specifications define SMS capabilities independent of provider, enabling:
- Future provider switching (e.g., Twilio)
- Multi-provider redundancy
- Cost optimization

### 4. Audit Trail
All messages are logged for:
- Healthcare compliance
- Delivery tracking
- Analytics and reporting

## Conventions

### Phone Numbers
- All phone numbers MUST be in E.164 format: `+1XXXXXXXXXX`
- The system auto-converts common formats (e.g., `(514) 555-0199`)

### Credentials
- **Python**: Environment variables (`GOTO_ACCESS_TOKEN`)
- **Apps Script**: Script Properties (encrypted at rest)
- **NEVER** store credentials in source code

### Message Templates
- Templates use `{variable_name}` placeholder syntax
- All templates require review before production use
- Patient name placeholders: `{patient_name}`, `{first_name}`

### Logging
- All sent messages logged with: timestamp, recipient, content preview, status
- Patient contact history tracked separately
- Sender identity recorded (user email for Chat Bot)

## File Structure

```
goto_sms_texting/
├── openspec/                 # Specifications (this directory)
│   ├── project.md           # Project context (this file)
│   ├── specs/               # Current state specifications
│   ├── changes/             # Proposed changes
│   └── archive/             # Completed changes
├── config.py                # Python configuration
├── goto_sms.py              # Python SMS library
├── send_text.py             # CLI tool
├── requirements.txt         # Python dependencies
├── README.md                # Main documentation
└── google_chat_bot/         # Google Chat Bot (Apps Script)
    ├── Code.gs              # Core API integration
    ├── ChatBot.gs           # Chat event handlers
    ├── Templates.gs         # Message templates
    └── SETUP.md             # Deployment guide
```

## Key Stakeholders

| Role | Responsibility |
|------|----------------|
| **Practice Staff** | Send messages via Chat Bot |
| **Developers** | Maintain code, add features |
| **Practice Admin** | Configure templates, review logs |
| **Patients** | Receive messages, respond |

## Compliance Considerations

### HIPAA
- Minimize PHI in logs (phone number + message preview only)
- Access limited to authorized staff
- Audit trail maintained
- No medical information in SMS (use portal links)

### Messaging Compliance
- Include opt-out instructions where required
- Honor STOP requests
- Maintain do-not-contact list
