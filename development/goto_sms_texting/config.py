"""
GoTo SMS Configuration

This file contains the configuration settings for SMS providers.
Supports GoTo (primary) and Twilio (fallback) providers.

== GoTo (Primary Provider) ==

To get GoTo credentials:
1. Create a developer account at https://developer.goto.com/
2. Create an OAuth client with 'messaging.v1.send' scope
3. Get your GoTo phone number from GoTo Admin (admin.goto.com)

Environment Variables:
- GOTO_ACCESS_TOKEN: OAuth access token (required)
- GOTO_REFRESH_TOKEN: OAuth refresh token (for auto-refresh)
- GOTO_CLIENT_ID: OAuth client ID (for token refresh)
- GOTO_CLIENT_SECRET: OAuth client secret (for token refresh)
- GOTO_TOKEN_EXPIRY: Token expiry timestamp in ISO format (optional)

== Twilio (Fallback Provider) ==

To get Twilio credentials:
1. Create an account at https://www.twilio.com/
2. Get your Account SID and Auth Token from the console
3. Purchase a phone number with SMS capability

Environment Variables:
- TWILIO_ACCOUNT_SID: Your Twilio account SID
- TWILIO_AUTH_TOKEN: Your Twilio auth token
- TWILIO_FROM_PHONE: Your Twilio phone number (+1XXXXXXXXXX)

== Failover Behavior ==

When failover is enabled (default), the system will:
1. Try sending via GoTo (primary)
2. On retriable errors (5xx, timeout, auth), failover to Twilio
3. On non-retriable errors (invalid number), fail immediately

The system will automatically refresh GoTo tokens when:
1. GOTO_REFRESH_TOKEN is set
2. GOTO_CLIENT_ID and GOTO_CLIENT_SECRET are set
3. The access token is expired or will expire within 12 minutes
"""

# GoTo API Configuration
GOTO_CONFIG = {
    # Your GoTo OAuth Client ID
    "client_id": "YOUR_CLIENT_ID_HERE",
    
    # Your GoTo OAuth Client Secret
    "client_secret": "YOUR_CLIENT_SECRET_HERE",
    
    # Your GoTo phone number (the one you'll send messages FROM)
    # Format: +1XXXXXXXXXX (e.g., +15145550100)
    "owner_phone_number": "+1XXXXXXXXXX",
    
    # Your practice/clinic name (used in message templates)
    "practice_name": "Your Practice Name",
    
    # API endpoints
    "api_base_url": "https://api.goto.com",
    "auth_url": "https://authentication.logmeininc.com/oauth/token",
}

# Twilio API Configuration (Fallback Provider)
TWILIO_CONFIG = {
    # Your Twilio Account SID (from console.twilio.com)
    "account_sid": "YOUR_TWILIO_ACCOUNT_SID",
    
    # Your Twilio Auth Token (from console.twilio.com)
    "auth_token": "YOUR_TWILIO_AUTH_TOKEN",
    
    # Your Twilio phone number (the one you'll send messages FROM)
    # Format: +1XXXXXXXXXX (e.g., +15145550100)
    "from_phone": "+1XXXXXXXXXX",
}

# Provider Routing Configuration
PROVIDER_CONFIG = {
    # Primary SMS provider: "goto" or "twilio"
    "primary_provider": "goto",
    
    # Fallback SMS provider: "twilio", "goto", or None
    "fallback_provider": "twilio",
    
    # Enable automatic failover to fallback on primary failure
    "failover_enabled": True,
}

# Message Templates for Patient Communication
# These are ready-made messages you can quickly send to patients
MESSAGE_TEMPLATES = {
    "kidney_treatment_video": {
        "name": "Kidney Treatment Options Video",
        "message": "Hi {first_name}! This is {practice_name}. As we discussed your kidney health, we'd like to share an important video that explains kidney disease and the treatment options available to you:\n\nhttps://www.youtube.com/watch?v=mi34xCfmLhw\n\nThis video covers dialysis, transplant, and other care options. Please watch before your next visit - we're here to answer any questions!",
    },
    "appointment_reminder": {
        "name": "Appointment Reminder",
        "message": "Hi {patient_name}! This is a reminder about your appointment on {appointment_date} at {appointment_time}. Please reply CONFIRM to confirm or call us to reschedule.",
    },
    "appointment_confirmation": {
        "name": "Appointment Confirmation",
        "message": "Hi {patient_name}! Your appointment has been confirmed for {appointment_date} at {appointment_time}. We look forward to seeing you!",
    },
    "follow_up": {
        "name": "Follow-up Message",
        "message": "Hi {patient_name}! We hope you're doing well. It's time for your follow-up appointment. Please call us or reply to schedule.",
    },
    "prescription_ready": {
        "name": "Prescription Ready",
        "message": "Hi {patient_name}! Your prescription is ready for pickup. Please visit us during office hours.",
    },
    "office_hours": {
        "name": "Office Hours",
        "message": "Our office hours are Monday-Friday 9AM-5PM. For emergencies, please call 911 or go to your nearest emergency room.",
    },
    "thank_you": {
        "name": "Thank You",
        "message": "Thank you for visiting us, {patient_name}! If you have any questions or concerns, please don't hesitate to reach out.",
    },
    "custom": {
        "name": "Custom Message",
        "message": "{custom_message}",
    },
}
