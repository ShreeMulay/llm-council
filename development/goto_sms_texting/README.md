# GoTo SMS Texting Tool

A simple Python tool to send text messages to patients using your GoTo phone number and the GoTo API.

## Features

- **Pre-built message templates** for common patient communications:
  - Appointment reminders
  - Appointment confirmations
  - Follow-up messages
  - Prescription ready notifications
  - Thank you messages
  - Kidney treatment video introduction
- **Custom messages** for any other communication
- **Command-line interface** for quick one-off messages
- **Interactive mode** for easy message sending
- **Python library** for integration with your existing systems
- **Automatic token refresh** for uninterrupted service
- **Response tracking** with CONFIRM/STOP handling (TCPA compliant)
- **Do-Not-Contact list** to honor opt-out requests
- **Analytics dashboard** for communication metrics
- **Google Chat Bot** for team collaboration (see `google_chat_bot/`)

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Get GoTo API Credentials

1. Go to [GoTo Developer Portal](https://developer.goto.com/)
2. Create a developer account if you don't have one
3. Create an OAuth client with the `messaging.v1.send` scope
4. Note your Client ID and Client Secret

### 3. Get Your GoTo Phone Number

1. Log in to [GoTo Admin](https://admin.goto.com/)
2. Go to "Phone system > Phone numbers"
3. Make sure you have a phone number assigned to you with SMS permissions

### 4. Configure the Tool

Edit `config.py` and fill in your credentials:

```python
GOTO_CONFIG = {
    "client_id": "YOUR_CLIENT_ID_HERE",
    "client_secret": "YOUR_CLIENT_SECRET_HERE",
    "owner_phone_number": "+1XXXXXXXXXX",  # Your GoTo phone number
    ...
}
```

### 5. Get an Access Token

The GoTo API uses OAuth 2.0 for authentication. You'll need to obtain an access token:

1. Follow the [GoTo OAuth Tutorial](https://developer.goto.com/guides/Authentication/04_HOW_accessTokenNodeJS/)
2. Or use the OAuth flow to get a token with the `messaging.v1.send` scope

Set your access token as an environment variable:

```bash
export GOTO_ACCESS_TOKEN='your_access_token_here'
```

### 6. (Optional) Enable Automatic Token Refresh

Access tokens expire after 60 minutes. For uninterrupted service, enable automatic token refresh.

#### Environment Variables for Token Refresh

| Variable | Purpose | Required |
|----------|---------|----------|
| `GOTO_ACCESS_TOKEN` | OAuth access token | Yes |
| `GOTO_REFRESH_TOKEN` | OAuth refresh token | For auto-refresh |
| `GOTO_CLIENT_ID` | OAuth client ID | For auto-refresh |
| `GOTO_CLIENT_SECRET` | OAuth client secret | For auto-refresh |
| `GOTO_TOKEN_EXPIRY` | ISO format expiry time | Optional |

Set these environment variables:

```bash
export GOTO_ACCESS_TOKEN='your_access_token_here'
export GOTO_REFRESH_TOKEN='your_refresh_token_here'
export GOTO_CLIENT_ID='your_client_id'
export GOTO_CLIENT_SECRET='your_client_secret'
```

With these set, the tool will:
- Automatically detect when tokens are about to expire (12 minutes before expiry)
- Refresh the access token using the refresh token
- Retry failed requests with the new token
- Use exponential backoff for transient failures

#### Getting a Refresh Token

You receive a refresh token when completing the OAuth authorization code flow:

1. Follow the [GoTo OAuth Authorization Code Tutorial](https://developer.goto.com/guides/Authentication/03_HOW_accessToken/)
2. Exchange the authorization code for tokens
3. The response includes both `access_token` and `refresh_token`
4. Store the refresh token securely

See [GoTo Refresh Token Guide](https://developer.goto.com/guides/Authentication/05_HOW_refreshToken/) for details.

#### Check Token Status

```python
from goto_sms import GoToSMS

sms = GoToSMS()
status = sms.get_token_status()
print(f"Token expires in: {status['minutes_until_expiry']} minutes")
print(f"Auto-refresh enabled: {status['can_auto_refresh']}")
```

## Usage

### Command Line Interface

```bash
# View help
python send_text.py --help

# Send appointment reminder
python send_text.py reminder --phone +15145550199 --name "John Smith" --date "Dec 1" --time "2:30 PM"

# Send appointment confirmation
python send_text.py confirm --phone +15145550199 --name "Jane Doe" --date "Dec 2" --time "10:00 AM"

# Send follow-up message
python send_text.py followup --phone +15145550199 --name "Bob Johnson"

# Send prescription ready notification
python send_text.py prescription --phone +15145550199 --name "Alice Williams"

# Send thank you message
python send_text.py thankyou --phone +15145550199 --name "Charlie Brown"

# Send custom message
python send_text.py custom --phone +15145550199 --message "Hello! Please call us back at your convenience."

# View all available templates
python send_text.py templates

# Interactive mode (menu-driven)
python send_text.py interactive
```

### Bulk SMS Sending

Send messages to multiple recipients from a CSV file:

```bash
# Preview bulk send (dry run)
python send_text.py bulk --file patients.csv --template appointment_reminder --dry-run

# Send bulk messages
python send_text.py bulk --file patients.csv --template appointment_reminder

# With custom rate limit (0.5 messages/second) and output file
python send_text.py bulk -f patients.csv -t appointment_reminder -r 0.5 -o results.csv

# With campaign name for logging
python send_text.py bulk -f patients.csv -t appointment_reminder --campaign "Dec15 Reminders"
```

#### CSV File Format

The CSV file should have at minimum a `phone` column. Supported columns:

| Field | Accepted Column Names |
|-------|----------------------|
| Phone (required) | phone, phone_number, mobile, cell, telephone |
| First Name | first_name, firstname, first, fname |
| Last Name | last_name, lastname, last, surname |
| Appointment Date | appointment_date, date, appt_date |
| Appointment Time | appointment_time, time, appt_time |

Example CSV:
```csv
phone,first_name,last_name,appointment_date,appointment_time
+15145550199,John,Smith,December 15,10:00 AM
+15145550200,Jane,Doe,December 15,11:30 AM
```

#### Bulk Send Features

- **Preview mode**: Use `--dry-run` to see what would be sent without sending
- **Rate limiting**: Configurable messages per second (default 1.0)
- **Do-Not-Contact filtering**: Automatically skips opted-out recipients
- **Progress tracking**: Real-time progress updates during send
- **Retry logic**: Automatic retry for transient failures
- **Results export**: Export detailed results to CSV with `-o`
- **Campaign logging**: All campaigns logged for analytics

### Python Library

```python
from goto_sms import GoToSMS

# Initialize with your access token
sms = GoToSMS(access_token="your_access_token_here")

# Send an appointment reminder
result = sms.send_appointment_reminder(
    phone_number="+15145550199",
    patient_name="John Smith",
    appointment_date="December 1, 2024",
    appointment_time="2:30 PM"
)
print(f"Message sent! ID: {result['id']}")

# Send a custom message
result = sms.send_custom_message(
    phone_number="+15145550199",
    message="Hello! This is a custom message."
)

# Send using a template with variables
result = sms.send_template_message(
    phone_numbers=["+15145550199"],
    template_name="follow_up",
    patient_name="Jane Doe"
)
```

### Bulk SMS (Python Library)

```python
from bulk_sms import BatchSender, CSVImporter
from goto_sms import GoToSMS

# Initialize
sms = GoToSMS(access_token="your_token")
sender = BatchSender(sms, rate_limit=1.0)

# Import recipients from CSV
recipients = sender.import_csv("patients.csv")
print(sender.get_import_report())

# Preview (dry run)
preview = sender.preview(recipients, "appointment_reminder")
print(f"Will send to {preview['will_send_to']} recipients")
print(f"Estimated time: {preview['estimated_time_seconds']} seconds")

# Send batch with progress callback
def on_progress(current, total, recipient):
    pct = (current / total) * 100
    print(f"[{current}/{total}] {pct:.0f}% - {recipient.phone}")

result = sender.send_batch(
    recipients=recipients,
    template_name="appointment_reminder",
    campaign_name="December Reminders",
    on_progress=on_progress
)

# View results
print(result.summary())
print(f"Success rate: {result.success_rate}%")

# Export results to CSV
result.to_csv("send_results.csv")
```

### Do-Not-Contact List (TCPA Compliance)

The library automatically blocks messages to patients who have opted out:

```python
from goto_sms import GoToSMS, MessageBlockedError

sms = GoToSMS(access_token="your_token")

# Add a number to the blocked list (e.g., when patient texts STOP)
sms.add_blocked_number("+15145550199")

# Check if a number is blocked
if sms.is_phone_blocked("+15145550199"):
    print("This number has opted out")

# Sending to a blocked number raises an error
try:
    sms.send_sms(["+15145550199"], "Hello!")
except MessageBlockedError as e:
    print(f"Message blocked: {e}")

# Load multiple blocked numbers (e.g., from a database)
blocked_list = ["+15145550199", "+15145550200"]
sms.load_blocked_numbers(blocked_list)

# Get all blocked numbers
all_blocked = sms.get_blocked_numbers()

# Remove a number from blocked list (e.g., patient texts START)
sms.remove_blocked_number("+15145550199")
```

## Message Templates

The following templates are available:

| Template | Description |
|----------|-------------|
| `appointment_reminder` | Reminder about an upcoming appointment |
| `appointment_confirmation` | Confirms a scheduled appointment |
| `follow_up` | Reminder to schedule a follow-up |
| `prescription_ready` | Notifies patient their prescription is ready |
| `thank_you` | Thank you message after a visit |
| `office_hours` | Information about office hours |
| `custom` | Send any custom message |

You can customize these templates in `config.py`.

## Phone Number Format

All phone numbers should be in E.164 format:
- Country code + number
- Example: `+15145550199` (Canada/US)
- Example: `+442071234567` (UK)

## Troubleshooting

### "No access token found"
Make sure you've set the `GOTO_ACCESS_TOKEN` environment variable or provide it when initializing `GoToSMS`.

### "Failed to send SMS: 401"
Your access token has expired. Solutions:

1. **Enable auto-refresh** (recommended): Set `GOTO_REFRESH_TOKEN`, `GOTO_CLIENT_ID`, and `GOTO_CLIENT_SECRET`
2. **Manual refresh**: Get a new token using the OAuth flow and update `GOTO_ACCESS_TOKEN`

### "Failed to send SMS: 403"
Your OAuth client may not have the `messaging.v1.send` scope, or your GoTo phone number may not have SMS permissions.

### Token Refresh Errors

#### "TokenRefreshError: Cannot refresh token"
Missing refresh credentials. Ensure all three are set:
- `GOTO_REFRESH_TOKEN`
- `GOTO_CLIENT_ID`
- `GOTO_CLIENT_SECRET`

#### "TokenExpiredError: Refresh token is invalid or expired"
Your refresh token has expired (typically after 30 days of inactivity). You must:
1. Re-authenticate through the OAuth authorization code flow
2. Obtain new access and refresh tokens
3. Update your environment variables

#### "TokenRefreshError: Failed to refresh token after 3 attempts"
Network or server issues during refresh. The system uses exponential backoff (1s, 2s, 4s). If this persists:
1. Check your network connection
2. Verify GoTo API status at https://status.goto.com/
3. Ensure credentials are correct

### Debugging Token Issues

Check your token status programmatically:

```python
from goto_sms import GoToSMS

sms = GoToSMS()
status = sms.get_token_status()

print(f"Has access token: {status['has_access_token']}")
print(f"Has refresh token: {status['has_refresh_token']}")
print(f"Can auto-refresh: {status['can_auto_refresh']}")
print(f"Is expired: {status['is_expired']}")
if status.get('minutes_until_expiry'):
    print(f"Expires in: {status['minutes_until_expiry']} minutes")
```

## API Reference

For more details on the GoTo Messaging API, see:
- [GoTo Developer Documentation](https://developer.goto.com/GoToConnect/#tag/Message)
- [Send SMS Tutorial](https://developer.goto.com/guides/GoToConnect/12_Send_SMS/)
