# Google Chat Bot Setup Guide

This guide walks you through setting up the GoTo SMS Bot for Google Chat.

## Prerequisites

1. Google Workspace account with admin access
2. GoTo account with API access
3. GoTo phone number with SMS permissions

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note the **Project ID** - you'll need it later

## Step 2: Enable APIs

In Google Cloud Console, enable these APIs:

1. Go to **APIs & Services > Library**
2. Search and enable:
   - **Google Chat API**
   - **Google Sheets API** (for logging)

## Step 3: Create Apps Script Project

### Option A: From Google Drive

1. Go to [Google Drive](https://drive.google.com/)
2. Click **New > More > Google Apps Script**
3. Name it "GoTo SMS Bot"

### Option B: From script.google.com

1. Go to [script.google.com](https://script.google.com/)
2. Click **New Project**
3. Name it "GoTo SMS Bot"

## Step 4: Add the Code Files

In the Apps Script editor:

1. **Replace** `Code.gs` content with the content from `Code.gs`
2. Create new file `ChatBot.gs` and paste content from `ChatBot.gs`
3. Create new file `Templates.gs` and paste content from `Templates.gs`
4. Click on `appsscript.json` (View > Show manifest file) and replace with our `appsscript.json`

## Step 5: Create Google Sheet for Logging

1. Create a new Google Sheet
2. Name it "GoTo SMS Bot Logs"
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
4. The bot will auto-create these sheets:
   - **Message Log** - All sent messages
   - **Patients** - Patient contact history

## Step 6: Configure the Bot

In Apps Script, run the `setConfig()` function:

1. Open `Code.gs`
2. Find the `setConfig()` function
3. Fill in your values:
   ```javascript
   props.setProperties({
     'GOTO_ACCESS_TOKEN': 'your_actual_token',
     'GOTO_REFRESH_TOKEN': 'your_refresh_token',  // For auto-refresh
     'GOTO_CLIENT_ID': 'your_client_id',          // For auto-refresh
     'GOTO_CLIENT_SECRET': 'your_client_secret',  // For auto-refresh
     'GOTO_OWNER_PHONE': '+1234567890',           // Your GoTo phone
     'PRACTICE_NAME': 'Your Practice Name',
     'SPREADSHEET_ID': 'your_sheet_id',
   });
   ```
4. Run the function (Run > Run function > setConfig)
5. Verify with `verifyConfig()` function

### Enabling Automatic Token Refresh

Access tokens expire after 60 minutes. For uninterrupted service, configure auto-refresh:

| Property | Purpose | Required |
|----------|---------|----------|
| `GOTO_ACCESS_TOKEN` | Current access token | Yes |
| `GOTO_REFRESH_TOKEN` | OAuth refresh token | For auto-refresh |
| `GOTO_CLIENT_ID` | OAuth client ID | For auto-refresh |
| `GOTO_CLIENT_SECRET` | OAuth client secret | For auto-refresh |
| `GOTO_TOKEN_EXPIRY` | ISO expiry time | Auto-managed |

The bot will automatically:
- Refresh tokens 12 minutes before expiry
- Log all refresh attempts to "Token Log" sheet
- Retry failed refreshes with exponential backoff
- Notify users if refresh fails

## Step 7: Deploy as Chat Bot

### Connect to Google Cloud Project

1. In Apps Script, go to **Project Settings** (gear icon)
2. Under **Google Cloud Platform (GCP) Project**
3. Click **Change project**
4. Enter your GCP Project Number (not ID!)
   - Find it in GCP Console > Dashboard

### Configure Chat API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Google Chat API**
3. Click **CONFIGURE** (or "Manage")
4. Fill in the configuration:

   **App name:** GoTo SMS Bot
   
   **Avatar URL:** (optional) https://www.gstatic.com/images/branding/product/2x/chat_48dp.png
   
   **Description:** Send SMS messages to patients via GoTo
   
   **Functionality:**
   - [x] Receive 1:1 messages
   - [x] Join spaces and group conversations
   
   **Connection settings:**
   - Select **Apps Script project**
   - **Deployment ID:** (get from next step)
   
   **Slash commands:** Add these commands:

   | Command ID | Name | Description |
   |------------|------|-------------|
   | 1 | /send-video | Send kidney treatment video |
   | 2 | /reminder | Send appointment reminder |
   | 3 | /confirm | Send appointment confirmation |
   | 4 | /followup | Send follow-up message |
   | 5 | /prescription | Prescription ready notification |
   | 6 | /thankyou | Send thank you message |
   | 7 | /custom | Send custom message |
   | 8 | /templates | View all message templates |
   | 9 | /help | Show help |

   **Visibility:**
   - Select **Specific people and groups in your domain**
   - Add your test room/space members

5. Click **SAVE**

### Get Deployment ID

1. In Apps Script, click **Deploy > New deployment**
2. Click gear icon > Select **Add-on**
3. Description: "GoTo SMS Bot v1"
4. Click **Deploy**
5. Copy the **Deployment ID**
6. Go back to Chat API config and paste it

## Step 8: Add Bot to a Space

1. Open [Google Chat](https://chat.google.com/)
2. Create a new Space or use existing one
3. Click the Space name > **Apps & integrations**
4. Search for "GoTo SMS Bot"
5. Click **Add**

## Step 9: Test the Bot

In the Chat space:

1. Type `/help` - Should show available commands
2. Type `/templates` - Should show message templates
3. Type `/send-video` - Should open form dialog
4. Fill in test patient info and send

## Troubleshooting

### "Access token not configured"
Run `setConfig()` in Apps Script with your GoTo token.

### "Failed to send SMS: 401"
Your GoTo access token expired. If auto-refresh is configured, it should refresh automatically. Otherwise:
```javascript
updateAccessToken('your_new_token');
```

### "Bot not responding"
1. Check Apps Script execution logs (View > Executions)
2. Verify deployment is active
3. Check Chat API is enabled

### "Slash commands not showing"
1. Remove and re-add bot to the space
2. Verify slash commands are configured in Chat API

### Token Refresh Errors

#### "Token refresh failed: missing credentials"
Ensure all refresh credentials are set in Script Properties:
- `GOTO_REFRESH_TOKEN`
- `GOTO_CLIENT_ID`
- `GOTO_CLIENT_SECRET`

#### "Refresh token expired"
Refresh tokens expire after 30 days of inactivity. Re-authenticate:
1. Complete GoTo OAuth authorization code flow
2. Update all token properties via `setConfig()`

#### Debugging Token Issues
Check token status in Apps Script:
```javascript
function checkStatus() {
  const status = getTokenStatus();
  console.log(JSON.stringify(status, null, 2));
}
```

View refresh logs in the "Token Log" sheet in your logging spreadsheet.

## Updating the Access Token

GoTo access tokens expire after 60 minutes.

### Automatic Refresh (Recommended)
Configure refresh credentials in `setConfig()`. The bot handles everything automatically.

### Manual Update
If auto-refresh isn't configured:

1. Get a new token from GoTo OAuth
2. In Apps Script, run:
   ```javascript
   function updateToken() {
     updateAccessToken('YOUR_NEW_TOKEN_HERE');
   }
   ```

## Security Notes

- Access token is stored in Script Properties (encrypted at rest)
- Only users in your specified Workspace group can use the bot
- All messages are logged to your Google Sheet
- Bot only works in designated spaces

## Response Tracking Setup (Optional)

Enable response tracking to capture patient replies (CONFIRM, STOP, etc.).

### Step 1: Deploy as Web App

1. In Apps Script, click **Deploy > New deployment**
2. Select type: **Web app**
3. Settings:
   - Execute as: **Me**
   - Who has access: **Anyone** (required for GoTo webhook)
4. Click **Deploy**
5. Copy the **Web app URL** (e.g., `https://script.google.com/macros/s/.../exec`)

### Step 2: Set Up GoTo Notification Channel

Use the GoTo API to create a webhook subscription:

```bash
# 1. Create notification channel
curl -X POST 'https://api.goto.com/notification-channel/v1/channels/sms-responses' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "channelType": "Webhook",
    "webhookChannelData": {
      "webhook": {
        "url": "YOUR_WEB_APP_URL"
      }
    }
  }'

# 2. Create SMS subscription with the channel ID from step 1
curl -X POST 'https://api.goto.com/messaging/v1/subscriptions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "channelId": "CHANNEL_ID_FROM_STEP_1",
    "phoneNumber": "+1XXXXXXXXXX"
  }'
```

### Step 3: Verify Webhook

Send a test SMS to your GoTo number. Check the "Incoming Messages" sheet in your logging spreadsheet.

### Response Keywords

| Keyword | Action |
|---------|--------|
| CONFIRM, YES, Y | Mark appointment confirmed |
| STOP, UNSUBSCRIBE, CANCEL | Add to Do-Not-Contact list |
| START, SUBSCRIBE | Remove from Do-Not-Contact |
| HELP | Send help message |

### New Sheets Created

The bot automatically creates these sheets for response tracking:

- **Incoming Messages** - All received messages with classification
- **Confirmations** - Appointment confirmations
- **Do Not Contact** - Opted-out phone numbers
- **Blocked Messages** - Blocked send attempts
- **Analytics** - Summary dashboard

## Support

- GoTo API: https://developer.goto.com/
- Apps Script: https://developers.google.com/apps-script
- Chat API: https://developers.google.com/chat
