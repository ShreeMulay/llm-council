"""
Tests for OAuth Token Refresh Functionality

These tests verify the token refresh implementation in goto_sms.py.
Run with: pytest tests/test_token_refresh.py -v
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from goto_sms import GoToSMS, TokenRefreshError, TokenExpiredError


class TestTokenExpiration:
    """Tests for token expiration detection (5.6 - Test proactive refresh)"""
    
    def test_is_token_expired_with_no_expiry(self):
        """Token without expiry tracking should be considered valid"""
        sms = GoToSMS(access_token="test_token")
        assert sms._is_token_expired() is False
    
    def test_is_token_expired_with_future_expiry(self):
        """Token expiring in the future (beyond buffer) should be valid"""
        future_expiry = datetime.now() + timedelta(hours=1)
        sms = GoToSMS(access_token="test_token", token_expiry=future_expiry)
        assert sms._is_token_expired() is False
    
    def test_is_token_expired_within_buffer(self):
        """Token expiring within buffer period should be considered expired"""
        # Default buffer is 720 seconds (12 minutes)
        near_expiry = datetime.now() + timedelta(minutes=5)
        sms = GoToSMS(access_token="test_token", token_expiry=near_expiry)
        assert sms._is_token_expired() is True
    
    def test_is_token_expired_past_expiry(self):
        """Token already past expiry should be considered expired"""
        past_expiry = datetime.now() - timedelta(minutes=5)
        sms = GoToSMS(access_token="test_token", token_expiry=past_expiry)
        assert sms._is_token_expired() is True


class TestCanRefresh:
    """Tests for refresh capability detection"""
    
    def test_can_refresh_with_all_credentials(self):
        """Should return True when all refresh credentials are present"""
        sms = GoToSMS(
            access_token="test_token",
            refresh_token="test_refresh",
            client_id="test_id",
            client_secret="test_secret"
        )
        assert sms._can_refresh() is True
    
    def test_cannot_refresh_without_refresh_token(self):
        """Should return False when refresh token is missing"""
        sms = GoToSMS(
            access_token="test_token",
            client_id="test_id",
            client_secret="test_secret"
        )
        assert sms._can_refresh() is False
    
    def test_cannot_refresh_without_client_id(self):
        """Should return False when client_id is missing"""
        sms = GoToSMS(
            access_token="test_token",
            refresh_token="test_refresh",
            client_secret="test_secret"
        )
        # Need to clear config defaults
        sms.client_id = None
        assert sms._can_refresh() is False
    
    def test_cannot_refresh_without_client_secret(self):
        """Should return False when client_secret is missing"""
        sms = GoToSMS(
            access_token="test_token",
            refresh_token="test_refresh",
            client_id="test_id"
        )
        sms.client_secret = None
        assert sms._can_refresh() is False


class TestSuccessfulTokenRefresh:
    """Tests for successful token refresh (5.1 - Python, 5.2 - Apps Script pattern)"""
    
    @patch('goto_sms.requests.post')
    def test_refresh_access_token_success(self, mock_post):
        """Token refresh should update access token and expiry on success"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "new_access_token",
            "expires_in": 3600,
            "refresh_token": "new_refresh_token"
        }
        mock_post.return_value = mock_response
        
        sms = GoToSMS(
            access_token="old_token",
            refresh_token="test_refresh",
            client_id="test_id",
            client_secret="test_secret"
        )
        
        result = sms._refresh_access_token()
        
        assert result is True
        assert sms.access_token == "new_access_token"
        assert sms.refresh_token == "new_refresh_token"
        assert sms.token_expiry is not None
        assert sms._refresh_failure_count == 0
    
    @patch('goto_sms.requests.post')
    def test_refresh_updates_expiry_correctly(self, mock_post):
        """Token refresh should set expiry based on expires_in response"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "new_token",
            "expires_in": 1800  # 30 minutes
        }
        mock_post.return_value = mock_response
        
        sms = GoToSMS(
            access_token="old_token",
            refresh_token="test_refresh",
            client_id="test_id",
            client_secret="test_secret"
        )
        
        before_refresh = datetime.now()
        sms._refresh_access_token()
        after_refresh = datetime.now()
        
        # Expiry should be approximately 30 minutes from now
        expected_expiry_min = before_refresh + timedelta(seconds=1800)
        expected_expiry_max = after_refresh + timedelta(seconds=1800)
        
        assert sms.token_expiry is not None
        assert sms.token_expiry >= expected_expiry_min
        assert sms.token_expiry <= expected_expiry_max


class TestExpiredRefreshToken:
    """Tests for expired refresh token handling (5.3)"""
    
    @patch('goto_sms.requests.post')
    def test_expired_refresh_token_raises_error(self, mock_post):
        """Should raise TokenExpiredError when refresh token is invalid"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_post.return_value = mock_response
        
        sms = GoToSMS(
            access_token="old_token",
            refresh_token="expired_refresh",
            client_id="test_id",
            client_secret="test_secret"
        )
        
        with pytest.raises(TokenExpiredError) as exc_info:
            sms._refresh_access_token()
        
        assert "invalid or expired" in str(exc_info.value).lower()
    
    @patch('goto_sms.requests.post')
    def test_expired_token_without_refresh_raises_error(self, mock_post):
        """Should raise error when token expired and no refresh token available"""
        past_expiry = datetime.now() - timedelta(minutes=5)
        sms = GoToSMS(
            access_token="expired_token",
            token_expiry=past_expiry,
            auto_refresh=True
        )
        sms.client_id = None  # Prevent refresh
        
        with pytest.raises(TokenExpiredError):
            sms._ensure_valid_token()


class TestNetworkFailure:
    """Tests for network failure during refresh (5.4)"""
    
    @patch('goto_sms.requests.post')
    @patch('goto_sms.time.sleep')  # Speed up tests by mocking sleep
    def test_retry_on_network_error(self, mock_sleep, mock_post):
        """Should retry with exponential backoff on network failures"""
        import requests
        mock_post.side_effect = requests.RequestException("Network error")
        
        sms = GoToSMS(
            access_token="old_token",
            refresh_token="test_refresh",
            client_id="test_id",
            client_secret="test_secret"
        )
        
        with pytest.raises(TokenRefreshError):
            sms._refresh_access_token()
        
        # Should have retried 3 times
        assert mock_post.call_count == 3
        # Should have slept between retries
        assert mock_sleep.call_count == 2  # No sleep after last failure
    
    @patch('goto_sms.requests.post')
    @patch('goto_sms.time.sleep')
    def test_exponential_backoff_timing(self, mock_sleep, mock_post):
        """Should use exponential backoff: 1s, 2s, 4s"""
        import requests
        mock_post.side_effect = requests.RequestException("Network error")
        
        sms = GoToSMS(
            access_token="old_token",
            refresh_token="test_refresh",
            client_id="test_id",
            client_secret="test_secret"
        )
        
        with pytest.raises(TokenRefreshError):
            sms._refresh_access_token()
        
        # Check backoff timing: 1s after first fail, 2s after second
        mock_sleep.assert_any_call(1)
        mock_sleep.assert_any_call(2)
    
    @patch('goto_sms.requests.post')
    @patch('goto_sms.time.sleep')
    def test_recovery_after_transient_failure(self, mock_sleep, mock_post):
        """Should succeed if network recovers during retries"""
        import requests
        
        # Fail twice, then succeed
        success_response = Mock()
        success_response.status_code = 200
        success_response.json.return_value = {
            "access_token": "new_token",
            "expires_in": 3600
        }
        
        mock_post.side_effect = [
            requests.RequestException("Network error"),
            requests.RequestException("Network error"),
            success_response
        ]
        
        sms = GoToSMS(
            access_token="old_token",
            refresh_token="test_refresh",
            client_id="test_id",
            client_secret="test_secret"
        )
        
        result = sms._refresh_access_token()
        
        assert result is True
        assert sms.access_token == "new_token"


class TestConcurrentRequests:
    """Tests for concurrent request handling (5.5)"""
    
    @patch('goto_sms.requests.post')
    def test_401_triggers_refresh_and_retry(self, mock_post):
        """API 401 should trigger refresh and retry the request"""
        # First call returns 401, refresh succeeds, retry succeeds
        success_sms_response = Mock()
        success_sms_response.status_code = 200
        success_sms_response.json.return_value = {"id": "msg_123"}
        
        refresh_response = Mock()
        refresh_response.status_code = 200
        refresh_response.json.return_value = {
            "access_token": "new_token",
            "expires_in": 3600
        }
        
        fail_401 = Mock()
        fail_401.status_code = 401
        
        # Order: send_sms fails with 401, refresh succeeds, retry send_sms succeeds
        mock_post.side_effect = [fail_401, refresh_response, success_sms_response]
        
        sms = GoToSMS(
            access_token="old_token",
            refresh_token="test_refresh",
            client_id="test_id",
            client_secret="test_secret"
        )
        
        result = sms.send_sms(["+15551234567"], "Test message")
        
        assert result["id"] == "msg_123"
        assert sms.access_token == "new_token"


class TestTokenStatus:
    """Tests for token status reporting"""
    
    def test_get_token_status_complete(self):
        """Should return comprehensive token status"""
        expiry = datetime.now() + timedelta(hours=1)
        sms = GoToSMS(
            access_token="test_token",
            refresh_token="test_refresh",
            token_expiry=expiry,
            client_id="test_id",
            client_secret="test_secret"
        )
        
        status = sms.get_token_status()
        
        assert status["has_access_token"] is True
        assert status["has_refresh_token"] is True
        assert status["can_auto_refresh"] is True
        assert status["auto_refresh_enabled"] is True
        assert status["is_expired"] is False
        assert "seconds_until_expiry" in status
        assert "minutes_until_expiry" in status
    
    def test_get_token_status_no_refresh(self):
        """Should indicate when refresh is not possible"""
        sms = GoToSMS(access_token="test_token")
        sms.client_id = None
        
        status = sms.get_token_status()
        
        assert status["has_access_token"] is True
        assert status["has_refresh_token"] is False
        assert status["can_auto_refresh"] is False


class TestEnvironmentVariables:
    """Tests for environment variable support"""
    
    def test_reads_token_from_env(self):
        """Should read access token from environment variable"""
        with patch.dict(os.environ, {"GOTO_ACCESS_TOKEN": "env_token"}):
            sms = GoToSMS()
            assert sms.access_token == "env_token"
    
    def test_reads_refresh_token_from_env(self):
        """Should read refresh token from environment variable"""
        with patch.dict(os.environ, {
            "GOTO_ACCESS_TOKEN": "token",
            "GOTO_REFRESH_TOKEN": "refresh_env"
        }):
            sms = GoToSMS()
            assert sms.refresh_token == "refresh_env"
    
    def test_reads_token_expiry_from_env(self):
        """Should parse token expiry from environment variable"""
        expiry_str = (datetime.now() + timedelta(hours=1)).isoformat()
        with patch.dict(os.environ, {
            "GOTO_ACCESS_TOKEN": "token",
            "GOTO_TOKEN_EXPIRY": expiry_str
        }):
            sms = GoToSMS()
            assert sms.token_expiry is not None
    
    def test_handles_invalid_expiry_format(self):
        """Should handle invalid expiry format gracefully"""
        with patch.dict(os.environ, {
            "GOTO_ACCESS_TOKEN": "token",
            "GOTO_TOKEN_EXPIRY": "not-a-date"
        }):
            # Should not raise, just log warning
            sms = GoToSMS()
            assert sms.token_expiry is None


class TestAutoRefreshDisabled:
    """Tests for auto_refresh=False behavior"""
    
    @patch('goto_sms.requests.post')
    def test_no_refresh_when_disabled(self, mock_post):
        """Should not attempt refresh when auto_refresh is False"""
        past_expiry = datetime.now() - timedelta(minutes=5)
        sms = GoToSMS(
            access_token="expired_token",
            refresh_token="test_refresh",
            token_expiry=past_expiry,
            client_id="test_id",
            client_secret="test_secret",
            auto_refresh=False
        )
        
        with pytest.raises(TokenExpiredError):
            sms._ensure_valid_token()
        
        # Should not have attempted refresh
        mock_post.assert_not_called()


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
