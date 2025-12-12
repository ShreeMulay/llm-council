# Google Chat Bot Integration Specification

## Purpose

Define the Google Chat bot interface that enables staff to send SMS messages to patients directly from Google Chat spaces.

## Requirements

### Requirement: Bot Activation
The system SHALL respond to bot interactions in authorized Google Chat spaces.

#### Scenario: Bot added to space
- WHEN the bot is added to a Chat space
- THEN a welcome message is displayed
- AND available commands are listed

#### Scenario: Direct message to bot
- WHEN a user sends a direct message to the bot
- THEN the bot responds with help information

### Requirement: Slash Commands
The system SHALL provide slash commands for common operations.

#### Scenario: Command invoked
- WHEN a user types a slash command (e.g., `/send-video`)
- THEN a dialog form is presented for data entry

#### Scenario: Unknown command
- WHEN a user types an unrecognized command
- THEN help information is displayed

### Requirement: Dialog Forms
The system SHALL present form dialogs for structured data collection.

#### Scenario: Form displayed
- WHEN a slash command is invoked
- THEN a dialog with appropriate input fields is shown
- AND field validation hints are provided

#### Scenario: Form submission - success
- WHEN a user submits a valid form
- THEN the SMS is sent
- AND a success confirmation is displayed

#### Scenario: Form submission - validation error
- WHEN a user submits incomplete data
- THEN an error message is displayed
- AND the form remains open for correction

#### Scenario: Form submission - send failure
- WHEN the SMS fails to send
- THEN an error dialog is displayed with details
- AND the error is logged

### Requirement: Access Control
The system SHALL restrict access to authorized users and spaces.

#### Scenario: Authorized space
- GIVEN a Google Chat space where the bot is installed
- AND users are members of the authorized domain
- THEN commands are available to all space members

#### Scenario: Unauthorized access attempt
- GIVEN a user outside the authorized domain
- WHEN they attempt to use the bot
- THEN access is denied

## Slash Commands

| Command ID | Command | Purpose | Form Fields |
|------------|---------|---------|-------------|
| 1 | `/send-video` | Send kidney treatment video | First Name, Last Name, Phone |
| 2 | `/reminder` | Appointment reminder | First Name, Last Name, Phone, Date, Time |
| 3 | `/confirm` | Appointment confirmation | First Name, Last Name, Phone, Date, Time |
| 4 | `/followup` | Follow-up message | First Name, Last Name, Phone |
| 5 | `/prescription` | Prescription ready | First Name, Last Name, Phone |
| 6 | `/thankyou` | Thank you message | First Name, Last Name, Phone |
| 7 | `/custom` | Custom message | First Name, Last Name, Phone, Message |
| 8 | `/templates` | View all templates | (none - displays card) |
| 9 | `/help` | Show help | (none - displays card) |

## UI Components

### Help Card
Displayed when bot is added or `/help` is invoked:
- Bot name and description
- List of available commands
- Quick action buttons for common operations

### Templates Card
Displayed when `/templates` is invoked:
- List of all available templates
- Template names and preview text

### Input Dialog
Displayed when a send command is invoked:
- Header with operation name
- Input fields with labels and hints
- Send and Cancel buttons

### Success Dialog
Displayed after successful send:
- Success icon and message
- Recipient info
- Message ID

### Error Dialog
Displayed on failure:
- Error icon and message
- Error details
- Retry guidance

## Event Handlers

### `onMessage(event)`
Handles incoming messages and slash commands.

### `onCardClick(event)`
Handles button clicks and form submissions.

### `onAddToSpace(event)`
Handles bot installation to a space.

## Configuration

### Script Properties (Required)
| Property | Purpose |
|----------|---------|
| `GOTO_ACCESS_TOKEN` | OAuth access token for GoTo API |
| `GOTO_OWNER_PHONE` | Phone number to send from |
| `PRACTICE_NAME` | Practice name for templates |
| `SPREADSHEET_ID` | Google Sheet ID for logging |

### OAuth Scopes (Required)
```json
[
  "https://www.googleapis.com/auth/chat.bot",
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email"
]
```

## Deployment

### Google Cloud Project Requirements
1. Google Chat API enabled
2. Apps Script deployment linked to project
3. Chat API configured with slash commands

### Visibility Settings
- **Recommended:** Specific people and groups in domain
- **Space Restriction:** Only installed spaces

## Implementation Files

| File | Purpose |
|------|---------|
| `ChatBot.gs` | Event handlers, slash commands, dialogs |
| `Code.gs` | GoTo API integration, logging |
| `Templates.gs` | Message templates |
| `appsscript.json` | Manifest with OAuth scopes |
