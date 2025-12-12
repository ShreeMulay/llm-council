"""
GoTo SMS Texting Tool

A simple Python tool to send SMS messages to patients using the GoTo API.

Features:
- Automatic OAuth token refresh for uninterrupted service
- Do-Not-Contact list management (TCPA compliance)
- Response tracking and analytics support
"""

import requests
import json
import base64
import os
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from config import GOTO_CONFIG, MESSAGE_TEMPLATES

# Configure logging
logger = logging.getLogger(__name__)


class TokenRefreshError(Exception):
    """Raised when token refresh fails."""
    pass


class TokenExpiredError(Exception):
    """Raised when token is expired and cannot be refreshed."""
    pass


class MessageBlockedError(Exception):
    """Raised when a message is blocked (recipient opted out)."""
    pass


class GoToSMS:
    """
    GoTo SMS Client for sending text messages to patients.
    
    Supports automatic OAuth token refresh for uninterrupted service.
    """
    
    # Token refresh buffer - refresh when 20% of TTL remains (48 minutes into 60 min token)
    TOKEN_REFRESH_BUFFER_SECONDS = 720  # 12 minutes before expiry
    
    def __init__(
        self,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        token_expiry: Optional[datetime] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        auto_refresh: bool = True
    ):
        """
        Initialize the GoTo SMS client.
        
        Args:
            access_token: Pre-obtained OAuth access token (optional).
            refresh_token: OAuth refresh token for auto-refresh (optional).
            token_expiry: When the access token expires (optional).
            client_id: OAuth client ID (optional, uses config/env if not provided).
            client_secret: OAuth client secret (optional, uses config/env if not provided).
            auto_refresh: Whether to automatically refresh expired tokens (default: True).
        """
        # Token management
        self.access_token = access_token or os.environ.get("GOTO_ACCESS_TOKEN")
        self.refresh_token = refresh_token or os.environ.get("GOTO_REFRESH_TOKEN")
        self.token_expiry = token_expiry
        self.auto_refresh = auto_refresh
        
        # Parse token expiry from environment if provided
        if not self.token_expiry:
            expiry_str = os.environ.get("GOTO_TOKEN_EXPIRY")
            if expiry_str:
                try:
                    self.token_expiry = datetime.fromisoformat(expiry_str)
                except ValueError:
                    logger.warning(f"Invalid GOTO_TOKEN_EXPIRY format: {expiry_str}")
        
        # OAuth credentials
        self.client_id = client_id or os.environ.get("GOTO_CLIENT_ID") or GOTO_CONFIG.get("client_id")
        self.client_secret = client_secret or os.environ.get("GOTO_CLIENT_SECRET") or GOTO_CONFIG.get("client_secret")
        
        # API configuration
        self.api_base_url = GOTO_CONFIG["api_base_url"]
        self.auth_url = GOTO_CONFIG["auth_url"]
        self.owner_phone_number = GOTO_CONFIG["owner_phone_number"]
        
        # Refresh state tracking
        self._last_refresh_attempt = None
        self._refresh_failure_count = 0
        self._max_refresh_retries = 3
        
        # Do-Not-Contact list (in-memory, can be loaded from external source)
        self._blocked_numbers: set = set()
        self._check_blocked = True  # Enable/disable blocking check
    
    def _is_token_expired(self) -> bool:
        """
        Check if the access token is expired or will expire soon.
        
        Returns:
            True if token is expired or will expire within the buffer period.
        """
        if not self.token_expiry:
            # No expiry tracking - assume token is valid
            return False
        
        # Check if token will expire within buffer period
        buffer = timedelta(seconds=self.TOKEN_REFRESH_BUFFER_SECONDS)
        return datetime.now() >= (self.token_expiry - buffer)
    
    def _can_refresh(self) -> bool:
        """
        Check if we have the credentials needed to refresh the token.
        
        Returns:
            True if refresh is possible.
        """
        return bool(self.refresh_token and self.client_id and self.client_secret)
    
    def _get_auth_header(self) -> str:
        """
        Get the Basic Auth header value for token requests.
        
        Returns:
            Base64 encoded client_id:client_secret
        """
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def _refresh_access_token(self) -> bool:
        """
        Refresh the access token using the refresh token.
        
        Returns:
            True if refresh was successful.
            
        Raises:
            TokenRefreshError: If refresh fails after retries.
        """
        if not self._can_refresh():
            raise TokenRefreshError(
                "Cannot refresh token: missing refresh_token, client_id, or client_secret. "
                "Set GOTO_REFRESH_TOKEN, GOTO_CLIENT_ID, and GOTO_CLIENT_SECRET environment variables."
            )
        
        logger.info("Attempting to refresh access token...")
        self._last_refresh_attempt = datetime.now()
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": self._get_auth_header()
        }
        
        payload = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token
        }
        
        # Retry with exponential backoff
        for attempt in range(self._max_refresh_retries):
            try:
                response = requests.post(self.auth_url, data=payload, headers=headers, timeout=30)
                
                if response.status_code == 200:
                    token_data = response.json()
                    self.access_token = token_data.get("access_token")
                    
                    # Update expiry (default 60 minutes if not provided)
                    expires_in = token_data.get("expires_in", 3600)
                    self.token_expiry = datetime.now() + timedelta(seconds=expires_in)
                    
                    # Update refresh token if a new one was issued
                    if "refresh_token" in token_data:
                        self.refresh_token = token_data["refresh_token"]
                        logger.info("New refresh token received")
                    
                    self._refresh_failure_count = 0
                    logger.info(f"Token refreshed successfully. Expires at {self.token_expiry}")
                    return True
                
                elif response.status_code == 401:
                    # Refresh token is invalid/expired
                    raise TokenExpiredError(
                        "Refresh token is invalid or expired. Please re-authenticate to get new tokens. "
                        "Visit https://developer.goto.com/guides/Authentication/03_HOW_accessToken/"
                    )
                
                else:
                    logger.warning(f"Token refresh attempt {attempt + 1} failed: {response.status_code}")
                    
            except requests.RequestException as e:
                logger.warning(f"Token refresh attempt {attempt + 1} network error: {e}")
            
            # Exponential backoff before retry
            if attempt < self._max_refresh_retries - 1:
                wait_time = (2 ** attempt) * 1  # 1s, 2s, 4s
                logger.info(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
        
        self._refresh_failure_count += 1
        raise TokenRefreshError(
            f"Failed to refresh token after {self._max_refresh_retries} attempts. "
            "Check your network connection and credentials."
        )
    
    def _ensure_valid_token(self) -> None:
        """
        Ensure we have a valid access token, refreshing if necessary.
        
        Raises:
            Exception: If no valid token is available and refresh fails.
        """
        if not self.access_token:
            if self.auto_refresh and self._can_refresh():
                self._refresh_access_token()
            else:
                raise Exception(
                    "No access token set. Either provide a token, set GOTO_ACCESS_TOKEN, "
                    "or configure refresh credentials for auto-refresh."
                )
        
        elif self._is_token_expired():
            if self.auto_refresh and self._can_refresh():
                logger.info("Access token expired or expiring soon, refreshing...")
                self._refresh_access_token()
            else:
                raise TokenExpiredError(
                    "Access token has expired. Set GOTO_REFRESH_TOKEN and credentials for auto-refresh, "
                    "or provide a new access token."
                )
    
    def get_access_token(self) -> str:
        """
        Get an OAuth access token using client credentials.
        
        Note: This method uses client credentials grant. For production with
        refresh tokens, use the authorization code flow and set refresh_token.
        
        Returns:
            Access token string
            
        Raises:
            Exception: If authentication fails
        """
        # For client credentials grant
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "messaging.v1.send"
        }
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        response = requests.post(self.auth_url, data=payload, headers=headers)
        
        if response.status_code == 200:
            token_data = response.json()
            self.access_token = token_data.get("access_token")
            
            # Track expiry
            expires_in = token_data.get("expires_in", 3600)
            self.token_expiry = datetime.now() + timedelta(seconds=expires_in)
            
            # Store refresh token if provided
            if "refresh_token" in token_data:
                self.refresh_token = token_data["refresh_token"]
            
            logger.info(f"Access token obtained. Expires at {self.token_expiry}")
            return self.access_token
        else:
            raise Exception(f"Failed to get access token: {response.status_code} - {response.text}")
    
    def get_token_status(self) -> Dict:
        """
        Get the current token status for debugging/monitoring.
        
        Returns:
            Dictionary with token status information.
        """
        now = datetime.now()
        
        status = {
            "has_access_token": bool(self.access_token),
            "has_refresh_token": bool(self.refresh_token),
            "can_auto_refresh": self._can_refresh(),
            "auto_refresh_enabled": self.auto_refresh,
            "token_expiry": self.token_expiry.isoformat() if self.token_expiry else None,
            "is_expired": self._is_token_expired(),
            "refresh_failure_count": self._refresh_failure_count,
        }
        
        if self.token_expiry:
            remaining = self.token_expiry - now
            status["seconds_until_expiry"] = max(0, int(remaining.total_seconds()))
            status["minutes_until_expiry"] = max(0, int(remaining.total_seconds() / 60))
        
        return status
    
    # ============================================
    # DO-NOT-CONTACT LIST MANAGEMENT
    # ============================================
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number for comparison (last 10 digits)."""
        if not phone:
            return ""
        import re
        digits = re.sub(r'\D', '', phone)
        return digits[-10:] if len(digits) >= 10 else digits
    
    def is_phone_blocked(self, phone: str) -> bool:
        """
        Check if a phone number is on the Do-Not-Contact list.
        
        Args:
            phone: Phone number to check
            
        Returns:
            True if phone is blocked
        """
        if not self._check_blocked:
            return False
        return self._normalize_phone(phone) in self._blocked_numbers
    
    def add_blocked_number(self, phone: str) -> None:
        """
        Add a phone number to the Do-Not-Contact list.
        
        Args:
            phone: Phone number to block
        """
        normalized = self._normalize_phone(phone)
        if normalized:
            self._blocked_numbers.add(normalized)
            logger.info(f"Added {phone} to Do-Not-Contact list")
    
    def remove_blocked_number(self, phone: str) -> bool:
        """
        Remove a phone number from the Do-Not-Contact list.
        
        Args:
            phone: Phone number to unblock
            
        Returns:
            True if phone was found and removed
        """
        normalized = self._normalize_phone(phone)
        if normalized in self._blocked_numbers:
            self._blocked_numbers.discard(normalized)
            logger.info(f"Removed {phone} from Do-Not-Contact list")
            return True
        return False
    
    def load_blocked_numbers(self, phone_list: List[str]) -> int:
        """
        Load a list of blocked phone numbers.
        
        Args:
            phone_list: List of phone numbers to block
            
        Returns:
            Number of phones added
        """
        count = 0
        for phone in phone_list:
            normalized = self._normalize_phone(phone)
            if normalized and normalized not in self._blocked_numbers:
                self._blocked_numbers.add(normalized)
                count += 1
        logger.info(f"Loaded {count} blocked numbers")
        return count
    
    def get_blocked_numbers(self) -> List[str]:
        """
        Get all blocked phone numbers.
        
        Returns:
            List of blocked phone numbers
        """
        return list(self._blocked_numbers)
    
    def set_blocking_enabled(self, enabled: bool) -> None:
        """
        Enable or disable the Do-Not-Contact check.
        
        Args:
            enabled: True to enable blocking check
        """
        self._check_blocked = enabled
        logger.info(f"Blocking check {'enabled' if enabled else 'disabled'}")
    
    def send_sms(
        self,
        phone_numbers: List[str],
        message: str,
        owner_phone: Optional[str] = None,
        skip_blocked_check: bool = False
    ) -> Dict:
        """
        Send an SMS message to one or more phone numbers.
        
        Automatically refreshes the access token if expired and refresh is configured.
        Checks Do-Not-Contact list before sending (TCPA compliance).
        
        Args:
            phone_numbers: List of phone numbers to send to (format: +1XXXXXXXXXX)
            message: The message content to send
            owner_phone: The GoTo phone number to send from (optional, uses config default)
            skip_blocked_check: If True, skip Do-Not-Contact check (not recommended)
            
        Returns:
            API response dictionary
            
        Raises:
            Exception: If no access token is set or API call fails
            TokenExpiredError: If token is expired and cannot be refreshed
            MessageBlockedError: If recipient has opted out (STOP)
        """
        # Ensure phone numbers are in a list
        if isinstance(phone_numbers, str):
            phone_numbers = [phone_numbers]
        
        # Check Do-Not-Contact list (TCPA compliance)
        if not skip_blocked_check:
            blocked = [p for p in phone_numbers if self.is_phone_blocked(p)]
            if blocked:
                logger.warning(f"Blocked numbers detected: {blocked}")
                raise MessageBlockedError(
                    f"Message blocked: {len(blocked)} recipient(s) have opted out (STOP). "
                    f"Blocked numbers: {blocked}"
                )
        
        # Ensure we have a valid token (auto-refresh if needed)
        self._ensure_valid_token()
        
        url = f"{self.api_base_url}/messaging/v1/messages"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "ownerPhoneNumber": owner_phone or self.owner_phone_number,
            "contactPhoneNumbers": phone_numbers,
            "body": message
        }
        
        response = requests.post(url, headers=headers, json=payload)
        
        # Handle 401 by attempting token refresh
        if response.status_code == 401 and self.auto_refresh and self._can_refresh():
            logger.info("Received 401, attempting token refresh...")
            try:
                self._refresh_access_token()
                # Retry with new token
                headers["Authorization"] = f"Bearer {self.access_token}"
                response = requests.post(url, headers=headers, json=payload)
            except TokenRefreshError as e:
                logger.error(f"Token refresh failed: {e}")
                raise
        
        if response.status_code in [200, 201]:
            return response.json()
        else:
            raise Exception(f"Failed to send SMS: {response.status_code} - {response.text}")
    
    def send_template_message(
        self,
        phone_numbers: List[str],
        template_name: str,
        **template_vars
    ) -> Dict:
        """
        Send a pre-defined template message to one or more phone numbers.
        
        Args:
            phone_numbers: List of phone numbers to send to
            template_name: Name of the template (e.g., 'appointment_reminder')
            **template_vars: Variables to fill in the template
                            (e.g., patient_name="John", appointment_date="Dec 1")
            
        Returns:
            API response dictionary
            
        Raises:
            ValueError: If template name is invalid
        """
        if template_name not in MESSAGE_TEMPLATES:
            available = ", ".join(MESSAGE_TEMPLATES.keys())
            raise ValueError(f"Unknown template: {template_name}. Available: {available}")
        
        template = MESSAGE_TEMPLATES[template_name]["message"]
        
        # Fill in template variables
        try:
            message = template.format(**template_vars)
        except KeyError as e:
            raise ValueError(f"Missing template variable: {e}")
        
        return self.send_sms(phone_numbers, message)
    
    def send_kidney_video(
        self,
        phone_number: str,
        first_name: str,
        last_name: Optional[str] = None,
        practice_name: Optional[str] = None
    ) -> Dict:
        """
        Send the kidney treatment options video to a patient.
        
        Args:
            phone_number: Patient's phone number
            first_name: Patient's first name
            last_name: Patient's last name (optional, for logging)
            practice_name: Practice name (optional, uses config default)
            
        Returns:
            API response dictionary
        """
        pname = practice_name or GOTO_CONFIG.get("practice_name", "Our Practice")
        return self.send_template_message(
            phone_numbers=[phone_number],
            template_name="kidney_treatment_video",
            first_name=first_name,
            practice_name=pname
        )
    
    def send_appointment_reminder(
        self,
        phone_number: str,
        patient_name: str,
        appointment_date: str,
        appointment_time: str
    ) -> Dict:
        """
        Send an appointment reminder to a patient.
        
        Args:
            phone_number: Patient's phone number
            patient_name: Patient's name
            appointment_date: Date of appointment (e.g., "December 1, 2024")
            appointment_time: Time of appointment (e.g., "2:30 PM")
            
        Returns:
            API response dictionary
        """
        return self.send_template_message(
            phone_numbers=[phone_number],
            template_name="appointment_reminder",
            patient_name=patient_name,
            appointment_date=appointment_date,
            appointment_time=appointment_time
        )
    
    def send_appointment_confirmation(
        self,
        phone_number: str,
        patient_name: str,
        appointment_date: str,
        appointment_time: str
    ) -> Dict:
        """
        Send an appointment confirmation to a patient.
        
        Args:
            phone_number: Patient's phone number
            patient_name: Patient's name
            appointment_date: Date of appointment
            appointment_time: Time of appointment
            
        Returns:
            API response dictionary
        """
        return self.send_template_message(
            phone_numbers=[phone_number],
            template_name="appointment_confirmation",
            patient_name=patient_name,
            appointment_date=appointment_date,
            appointment_time=appointment_time
        )
    
    def send_follow_up(self, phone_number: str, patient_name: str) -> Dict:
        """
        Send a follow-up message to a patient.
        
        Args:
            phone_number: Patient's phone number
            patient_name: Patient's name
            
        Returns:
            API response dictionary
        """
        return self.send_template_message(
            phone_numbers=[phone_number],
            template_name="follow_up",
            patient_name=patient_name
        )
    
    def send_prescription_ready(self, phone_number: str, patient_name: str) -> Dict:
        """
        Notify a patient that their prescription is ready.
        
        Args:
            phone_number: Patient's phone number
            patient_name: Patient's name
            
        Returns:
            API response dictionary
        """
        return self.send_template_message(
            phone_numbers=[phone_number],
            template_name="prescription_ready",
            patient_name=patient_name
        )
    
    def send_thank_you(self, phone_number: str, patient_name: str) -> Dict:
        """
        Send a thank you message to a patient after their visit.
        
        Args:
            phone_number: Patient's phone number
            patient_name: Patient's name
            
        Returns:
            API response dictionary
        """
        return self.send_template_message(
            phone_numbers=[phone_number],
            template_name="thank_you",
            patient_name=patient_name
        )
    
    def send_custom_message(self, phone_number: str, message: str) -> Dict:
        """
        Send a custom message to a patient.
        
        Args:
            phone_number: Patient's phone number
            message: Custom message text
            
        Returns:
            API response dictionary
        """
        return self.send_sms([phone_number], message)


def list_templates():
    """Print all available message templates."""
    print("\n=== Available Message Templates ===\n")
    for key, template in MESSAGE_TEMPLATES.items():
        print(f"Template: {key}")
        print(f"  Name: {template['name']}")
        print(f"  Message: {template['message']}")
        print()


# Example usage
if __name__ == "__main__":
    print("GoTo SMS Texting Tool")
    print("=" * 40)
    
    # List available templates
    list_templates()
    
    print("\n=== Quick Start Guide ===")
    print("""
1. Update config.py with your GoTo API credentials:
   - client_id
   - client_secret  
   - owner_phone_number (your GoTo phone number)

2. Use the tool in your code:

   from goto_sms import GoToSMS
   
   # Initialize with your access token
   sms = GoToSMS(access_token="your_token_here")
   
   # Send an appointment reminder
   sms.send_appointment_reminder(
       phone_number="+15145550199",
       patient_name="John Smith",
       appointment_date="December 1, 2024",
       appointment_time="2:30 PM"
   )
   
   # Or send a custom message
   sms.send_custom_message(
       phone_number="+15145550199",
       message="Hello! This is a test message."
   )

3. Or use the CLI tool: python send_text.py --help
""")
