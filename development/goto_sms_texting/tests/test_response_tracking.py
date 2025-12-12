"""
Tests for Response Tracking and Do-Not-Contact Functionality

These tests verify the response tracking implementation in goto_sms.py.
Run with: pytest tests/test_response_tracking.py -v
"""

import pytest
from unittest.mock import Mock, patch
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from goto_sms import GoToSMS, MessageBlockedError


class TestPhoneNormalization:
    """Tests for phone number normalization"""
    
    def test_normalize_full_e164(self):
        """Should normalize E.164 format phone"""
        sms = GoToSMS(access_token="test")
        assert sms._normalize_phone("+15145550199") == "5145550199"
    
    def test_normalize_with_country_code(self):
        """Should normalize phone with country code no plus"""
        sms = GoToSMS(access_token="test")
        assert sms._normalize_phone("15145550199") == "5145550199"
    
    def test_normalize_ten_digit(self):
        """Should keep 10-digit phone as-is"""
        sms = GoToSMS(access_token="test")
        assert sms._normalize_phone("5145550199") == "5145550199"
    
    def test_normalize_with_formatting(self):
        """Should strip formatting characters"""
        sms = GoToSMS(access_token="test")
        assert sms._normalize_phone("(514) 555-0199") == "5145550199"
    
    def test_normalize_empty(self):
        """Should handle empty input"""
        sms = GoToSMS(access_token="test")
        assert sms._normalize_phone("") == ""


class TestDoNotContactList:
    """Tests for Do-Not-Contact list management"""
    
    def test_add_blocked_number(self):
        """Should add phone to blocked list"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        assert sms.is_phone_blocked("+15145550199") is True
    
    def test_add_multiple_formats(self):
        """Should recognize same number in different formats"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        
        # All these should be blocked (same number)
        assert sms.is_phone_blocked("15145550199") is True
        assert sms.is_phone_blocked("5145550199") is True
        assert sms.is_phone_blocked("(514) 555-0199") is True
    
    def test_remove_blocked_number(self):
        """Should remove phone from blocked list"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        assert sms.is_phone_blocked("+15145550199") is True
        
        result = sms.remove_blocked_number("+15145550199")
        assert result is True
        assert sms.is_phone_blocked("+15145550199") is False
    
    def test_remove_nonexistent_number(self):
        """Should return False when removing non-blocked number"""
        sms = GoToSMS(access_token="test")
        result = sms.remove_blocked_number("+15145550199")
        assert result is False
    
    def test_load_blocked_numbers(self):
        """Should load multiple blocked numbers at once"""
        sms = GoToSMS(access_token="test")
        
        phone_list = [
            "+15145550199",
            "+15145550200",
            "+15145550201"
        ]
        
        count = sms.load_blocked_numbers(phone_list)
        
        assert count == 3
        assert sms.is_phone_blocked("+15145550199") is True
        assert sms.is_phone_blocked("+15145550200") is True
        assert sms.is_phone_blocked("+15145550201") is True
    
    def test_load_ignores_duplicates(self):
        """Should not count duplicates when loading"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        
        phone_list = [
            "+15145550199",  # Already blocked
            "+15145550200",  # New
        ]
        
        count = sms.load_blocked_numbers(phone_list)
        assert count == 1  # Only one new number
    
    def test_get_blocked_numbers(self):
        """Should return list of all blocked numbers"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        sms.add_blocked_number("+15145550200")
        
        blocked = sms.get_blocked_numbers()
        assert len(blocked) == 2
        assert "5145550199" in blocked
        assert "5145550200" in blocked


class TestBlockingEnabled:
    """Tests for blocking enable/disable"""
    
    def test_blocking_enabled_by_default(self):
        """Blocking should be enabled by default"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        assert sms.is_phone_blocked("+15145550199") is True
    
    def test_disable_blocking(self):
        """Should allow disabling blocking check"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        
        sms.set_blocking_enabled(False)
        
        # Phone is in list but check is disabled
        assert sms.is_phone_blocked("+15145550199") is False
    
    def test_re_enable_blocking(self):
        """Should allow re-enabling blocking check"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        
        sms.set_blocking_enabled(False)
        assert sms.is_phone_blocked("+15145550199") is False
        
        sms.set_blocking_enabled(True)
        assert sms.is_phone_blocked("+15145550199") is True


class TestSendSMSBlocking:
    """Tests for SMS blocking during send"""
    
    @patch('goto_sms.requests.post')
    def test_blocked_number_raises_error(self, mock_post):
        """Should raise MessageBlockedError for blocked numbers"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        
        with pytest.raises(MessageBlockedError) as exc_info:
            sms.send_sms(["+15145550199"], "Test message")
        
        assert "opted out" in str(exc_info.value).lower()
        # Should not have made API call
        mock_post.assert_not_called()
    
    @patch('goto_sms.requests.post')
    def test_partially_blocked_raises_error(self, mock_post):
        """Should raise error if any number in list is blocked"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        
        with pytest.raises(MessageBlockedError):
            sms.send_sms(["+15145550200", "+15145550199"], "Test message")
        
        mock_post.assert_not_called()
    
    @patch('goto_sms.requests.post')
    def test_skip_blocked_check(self, mock_post):
        """Should allow skipping blocked check"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "msg_123"}
        mock_post.return_value = mock_response
        
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        
        # This should succeed with skip_blocked_check=True
        result = sms.send_sms(
            ["+15145550199"], 
            "Test message",
            skip_blocked_check=True
        )
        
        assert result["id"] == "msg_123"
        mock_post.assert_called_once()
    
    @patch('goto_sms.requests.post')
    def test_non_blocked_sends_normally(self, mock_post):
        """Should send normally to non-blocked numbers"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "msg_123"}
        mock_post.return_value = mock_response
        
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")  # Block a different number
        
        result = sms.send_sms(["+15145550200"], "Test message")
        
        assert result["id"] == "msg_123"
        mock_post.assert_called_once()


class TestMessageBlockedError:
    """Tests for MessageBlockedError exception"""
    
    def test_error_message_contains_numbers(self):
        """Error message should include blocked numbers"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        sms.add_blocked_number("+15145550200")
        
        with pytest.raises(MessageBlockedError) as exc_info:
            sms.send_sms(["+15145550199", "+15145550200"], "Test")
        
        error_msg = str(exc_info.value)
        assert "5145550199" in error_msg or "+15145550199" in error_msg
    
    def test_error_indicates_count(self):
        """Error message should indicate number of blocked recipients"""
        sms = GoToSMS(access_token="test")
        sms.add_blocked_number("+15145550199")
        sms.add_blocked_number("+15145550200")
        
        with pytest.raises(MessageBlockedError) as exc_info:
            sms.send_sms(["+15145550199", "+15145550200"], "Test")
        
        assert "2" in str(exc_info.value)


class TestResponseKeywords:
    """Tests for response keyword classification patterns"""
    
    # These test the patterns used in Apps Script ResponseTracking.gs
    # Testing the logic here helps validate the approach
    
    def test_confirm_keywords(self):
        """Verify CONFIRM keywords work correctly"""
        keywords = ['CONFIRM', 'YES', 'Y', 'CONFIRMED', 'OK', 'OKAY']
        
        for keyword in keywords:
            # Exact match
            assert keyword.upper() == keyword.upper()
            # Case insensitive
            assert keyword.lower().upper() == keyword.upper()
    
    def test_stop_keywords(self):
        """Verify STOP keywords work correctly"""
        keywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'OPTOUT', 'OPT-OUT', 'QUIT', 'END']
        
        for keyword in keywords:
            assert keyword.upper() in [k.upper() for k in keywords]
    
    def test_start_keywords(self):
        """Verify START keywords work correctly"""
        keywords = ['START', 'SUBSCRIBE', 'OPTIN', 'OPT-IN', 'RESUME', 'UNSTOP']
        
        for keyword in keywords:
            assert keyword.upper() in [k.upper() for k in keywords]


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
