"""
Tests for Bulk SMS Sending Functionality

These tests verify the bulk SMS implementation in bulk_sms.py.
Run with: pytest tests/test_bulk_sms.py -v
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import os
import sys
import tempfile
import csv
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bulk_sms import (
    SendStatus, Recipient, BatchResult, CSVImporter, BatchSender,
    create_sample_csv
)
from goto_sms import GoToSMS, MessageBlockedError


# ============================================
# RECIPIENT DATACLASS TESTS
# ============================================

class TestRecipient:
    """Tests for Recipient dataclass"""
    
    def test_create_basic_recipient(self):
        """Should create recipient with phone only"""
        r = Recipient(phone="+15145550199")
        assert r.phone == "+15145550199"
        assert r.first_name == ""
        assert r.status == SendStatus.PENDING
    
    def test_full_name_property(self):
        """Should return full name from first and last"""
        r = Recipient(phone="+15145550199", first_name="John", last_name="Smith")
        assert r.full_name == "John Smith"
    
    def test_full_name_first_only(self):
        """Should handle first name only"""
        r = Recipient(phone="+15145550199", first_name="John")
        assert r.full_name == "John"
    
    def test_to_dict(self):
        """Should convert to dictionary"""
        r = Recipient(
            phone="+15145550199",
            first_name="John",
            last_name="Smith",
            status=SendStatus.SUCCESS,
            message_id="msg-123"
        )
        d = r.to_dict()
        
        assert d["phone"] == "+15145550199"
        assert d["first_name"] == "John"
        assert d["status"] == "success"
        assert d["message_id"] == "msg-123"
    
    def test_custom_data(self):
        """Should store custom data fields"""
        r = Recipient(phone="+15145550199")
        r.custom_data["doctor"] = "Dr. Jones"
        
        assert r.custom_data["doctor"] == "Dr. Jones"
        assert "doctor" in r.to_dict()


# ============================================
# BATCH RESULT TESTS
# ============================================

class TestBatchResult:
    """Tests for BatchResult dataclass"""
    
    def test_success_rate_calculation(self):
        """Should calculate success rate correctly"""
        result = BatchResult(
            campaign_name="Test",
            template_name="reminder",
            start_time=datetime.now(),
            total_recipients=100,
            sent_count=95
        )
        assert result.success_rate == 95.0
    
    def test_success_rate_zero_recipients(self):
        """Should handle zero recipients"""
        result = BatchResult(
            campaign_name="Test",
            template_name="reminder",
            start_time=datetime.now(),
            total_recipients=0
        )
        assert result.success_rate == 0.0
    
    def test_summary_generation(self):
        """Should generate readable summary"""
        result = BatchResult(
            campaign_name="December Reminders",
            template_name="appointment_reminder",
            start_time=datetime.now(),
            end_time=datetime.now(),
            total_recipients=50,
            sent_count=45,
            failed_count=3,
            skipped_count=1,
            blocked_count=1
        )
        summary = result.summary()
        
        assert "December Reminders" in summary
        assert "appointment_reminder" in summary
        assert "Total Recipients: 50" in summary
        assert "Sent Successfully: 45" in summary
        assert "90.0%" in summary  # Success rate
    
    def test_to_dict(self):
        """Should convert to dictionary"""
        start = datetime.now()
        result = BatchResult(
            campaign_name="Test",
            template_name="reminder",
            start_time=start,
            total_recipients=10,
            sent_count=8
        )
        d = result.to_dict()
        
        assert d["campaign_name"] == "Test"
        assert d["total_recipients"] == 10
        assert d["success_rate"] == 80.0
    
    def test_to_csv_export(self):
        """Should export results to CSV"""
        result = BatchResult(
            campaign_name="Test",
            template_name="reminder",
            start_time=datetime.now(),
            end_time=datetime.now()
        )
        result.recipients = [
            Recipient(phone="+15145550199", first_name="John", status=SendStatus.SUCCESS),
            Recipient(phone="+15145550200", first_name="Jane", status=SendStatus.FAILED)
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            filepath = f.name
        
        try:
            result.to_csv(filepath)
            
            with open(filepath, 'r') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                
            assert len(rows) == 2
            assert rows[0]["phone"] == "+15145550199"
            assert rows[0]["status"] == "success"
            assert rows[1]["status"] == "failed"
        finally:
            os.unlink(filepath)


# ============================================
# CSV IMPORTER TESTS
# ============================================

class TestCSVImporter:
    """Tests for CSVImporter class"""
    
    def create_csv(self, rows, headers):
        """Helper to create test CSV files"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for row in rows:
                writer.writerow(row)
            return f.name
    
    def test_import_basic_csv(self):
        """Should import CSV with standard column names"""
        filepath = self.create_csv(
            [
                ["+15145550199", "John", "Smith"],
                ["+15145550200", "Jane", "Doe"]
            ],
            ["phone", "first_name", "last_name"]
        )
        
        try:
            importer = CSVImporter()
            recipients = importer.import_file(filepath)
            
            assert len(recipients) == 2
            assert recipients[0].phone == "+15145550199"
            assert recipients[0].first_name == "John"
            assert recipients[1].last_name == "Doe"
        finally:
            os.unlink(filepath)
    
    def test_import_column_aliases(self):
        """Should recognize column aliases"""
        filepath = self.create_csv(
            [["+15145550199", "John", "Smith"]],
            ["mobile", "firstname", "surname"]  # Aliases
        )
        
        try:
            importer = CSVImporter()
            recipients = importer.import_file(filepath)
            
            assert len(recipients) == 1
            assert recipients[0].phone == "+15145550199"
            assert recipients[0].first_name == "John"
            assert recipients[0].last_name == "Smith"
        finally:
            os.unlink(filepath)
    
    def test_import_with_appointments(self):
        """Should import appointment data"""
        filepath = self.create_csv(
            [["+15145550199", "John", "Dec 15", "10:30 AM"]],
            ["phone", "first_name", "date", "time"]
        )
        
        try:
            importer = CSVImporter()
            recipients = importer.import_file(filepath)
            
            assert recipients[0].appointment_date == "Dec 15"
            assert recipients[0].appointment_time == "10:30 AM"
        finally:
            os.unlink(filepath)
    
    def test_import_custom_columns(self):
        """Should store extra columns as custom_data"""
        filepath = self.create_csv(
            [["+15145550199", "John", "Dr. Smith"]],
            ["phone", "first_name", "doctor"]
        )
        
        try:
            importer = CSVImporter()
            recipients = importer.import_file(filepath)
            
            assert "doctor" in recipients[0].custom_data
            assert recipients[0].custom_data["doctor"] == "Dr. Smith"
        finally:
            os.unlink(filepath)
    
    def test_import_missing_phone_column(self):
        """Should raise error if no phone column"""
        filepath = self.create_csv(
            [["John", "Smith"]],
            ["first_name", "last_name"]
        )
        
        try:
            importer = CSVImporter()
            with pytest.raises(ValueError) as exc:
                importer.import_file(filepath)
            assert "phone" in str(exc.value).lower()
        finally:
            os.unlink(filepath)
    
    def test_import_skips_empty_phones(self):
        """Should skip rows with empty phones"""
        filepath = self.create_csv(
            [
                ["+15145550199", "John"],
                ["", "Jane"],  # Empty phone
                ["+15145550200", "Bob"]
            ],
            ["phone", "first_name"]
        )
        
        try:
            importer = CSVImporter()
            recipients = importer.import_file(filepath)
            
            assert len(recipients) == 2
            assert len(importer.warnings) == 1  # Warning for skipped row
        finally:
            os.unlink(filepath)
    
    def test_import_nonexistent_file(self):
        """Should raise FileNotFoundError for missing file"""
        importer = CSVImporter()
        with pytest.raises(FileNotFoundError):
            importer.import_file("/nonexistent/path/file.csv")
    
    def test_validation_report(self):
        """Should generate validation report"""
        importer = CSVImporter()
        importer.warnings = ["Row 2: Empty phone"]
        importer.errors = []
        
        report = importer.get_validation_report()
        
        assert "Warnings (1):" in report
        assert "Row 2: Empty phone" in report


# ============================================
# BATCH SENDER TESTS
# ============================================

class TestBatchSender:
    """Tests for BatchSender class"""
    
    def create_mock_sms(self):
        """Create a mocked GoToSMS client"""
        mock = Mock(spec=GoToSMS)
        mock.send_sms.return_value = {"id": "msg-123", "success": True}
        mock.is_phone_blocked.return_value = False
        return mock
    
    def test_init_with_defaults(self):
        """Should initialize with default settings"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms)
        
        assert sender.rate_limit == 1.0
        assert sender.retry_count == 2
    
    def test_init_with_custom_settings(self):
        """Should accept custom settings"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms, rate_limit=0.5, retry_count=3)
        
        assert sender.rate_limit == 0.5
        assert sender.retry_count == 3
    
    def test_validate_valid_phone(self):
        """Should validate correct phone numbers"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms)
        
        r = Recipient(phone="+15145550199")
        assert sender._validate_recipient(r) is True
    
    def test_validate_invalid_phone(self):
        """Should reject invalid phone numbers"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms)
        
        invalid_phones = [
            "",
            "abc",
            "12345",
            "not-a-phone"
        ]
        
        for phone in invalid_phones:
            r = Recipient(phone=phone)
            assert sender._validate_recipient(r) is False, f"Should reject: {phone}"
    
    def test_filter_blocked_recipients(self):
        """Should filter out blocked recipients"""
        mock_sms = self.create_mock_sms()
        mock_sms.is_phone_blocked.side_effect = lambda p: p == "+15145550200"
        
        sender = BatchSender(mock_sms)
        
        recipients = [
            Recipient(phone="+15145550199"),
            Recipient(phone="+15145550200"),  # Blocked
            Recipient(phone="+15145550201")
        ]
        
        allowed, blocked = sender.filter_blocked(recipients)
        
        assert len(allowed) == 2
        assert len(blocked) == 1
        assert blocked[0].status == SendStatus.BLOCKED
    
    def test_format_message(self):
        """Should format template with recipient data"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms)
        
        r = Recipient(
            phone="+15145550199",
            first_name="John",
            appointment_date="Dec 15",
            appointment_time="10:30 AM"
        )
        
        message = sender._format_message("appointment_reminder", r)
        
        assert "John" in message
        assert "Dec 15" in message
        assert "10:30 AM" in message
    
    def test_format_message_unknown_template(self):
        """Should raise error for unknown template"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms)
        
        r = Recipient(phone="+15145550199")
        
        with pytest.raises(ValueError) as exc:
            sender._format_message("nonexistent_template", r)
        assert "Unknown template" in str(exc.value)
    
    def test_preview_batch(self):
        """Should generate preview without sending"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms)
        
        recipients = [
            Recipient(phone="+15145550199", first_name="John"),
            Recipient(phone="+15145550200", first_name="Jane"),
            Recipient(phone="invalid", first_name="Bad")
        ]
        
        preview = sender.preview(recipients, "appointment_reminder")
        
        assert preview["total_recipients"] == 3
        assert preview["valid_recipients"] == 2
        assert preview["invalid_recipients"] == 1
        assert preview["will_send_to"] == 2
        assert len(preview["sample_messages"]) <= 3
        
        # Shouldn't have called send
        mock_sms.send_sms.assert_not_called()
    
    def test_send_batch_success(self):
        """Should send messages to all valid recipients"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms, rate_limit=100)  # Fast for tests
        
        recipients = [
            Recipient(phone="+15145550199", first_name="John"),
            Recipient(phone="+15145550200", first_name="Jane")
        ]
        
        result = sender.send_batch(
            recipients=recipients,
            template_name="appointment_reminder",
            campaign_name="Test Campaign"
        )
        
        assert result.sent_count == 2
        assert result.failed_count == 0
        assert result.campaign_name == "Test Campaign"
        assert mock_sms.send_sms.call_count == 2
    
    def test_send_batch_with_failures(self):
        """Should handle send failures"""
        mock_sms = self.create_mock_sms()
        mock_sms.send_sms.side_effect = [
            {"id": "msg-1"},
            Exception("API Error"),
            {"id": "msg-3"}
        ]
        
        sender = BatchSender(mock_sms, rate_limit=100, retry_count=0)
        
        recipients = [
            Recipient(phone="+15145550199", first_name="John"),
            Recipient(phone="+15145550200", first_name="Jane"),
            Recipient(phone="+15145550201", first_name="Bob")
        ]
        
        result = sender.send_batch(recipients, "appointment_reminder")
        
        assert result.sent_count == 2
        assert result.failed_count == 1
    
    def test_send_batch_blocked_handling(self):
        """Should handle blocked recipients"""
        mock_sms = self.create_mock_sms()
        mock_sms.send_sms.side_effect = [
            {"id": "msg-1"},
            MessageBlockedError("Blocked"),
            {"id": "msg-3"}
        ]
        
        sender = BatchSender(mock_sms, rate_limit=100, retry_count=0)
        
        recipients = [
            Recipient(phone="+15145550199", first_name="John"),
            Recipient(phone="+15145550200", first_name="Jane"),
            Recipient(phone="+15145550201", first_name="Bob")
        ]
        
        result = sender.send_batch(recipients, "appointment_reminder")
        
        assert result.sent_count == 2
        assert result.blocked_count == 1
    
    def test_send_batch_dry_run(self):
        """Should not send in dry run mode"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms)
        
        recipients = [
            Recipient(phone="+15145550199", first_name="John"),
            Recipient(phone="+15145550200", first_name="Jane")
        ]
        
        result = sender.send_batch(
            recipients=recipients,
            template_name="appointment_reminder",
            dry_run=True
        )
        
        mock_sms.send_sms.assert_not_called()
        assert result.sent_count == 0
    
    def test_send_batch_with_skipped(self):
        """Should skip invalid recipients"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms, rate_limit=100)
        
        recipients = [
            Recipient(phone="+15145550199", first_name="John"),
            Recipient(phone="invalid", first_name="Bad"),
            Recipient(phone="+15145550200", first_name="Jane")
        ]
        
        result = sender.send_batch(recipients, "appointment_reminder")
        
        assert result.sent_count == 2
        assert result.skipped_count == 1
        assert mock_sms.send_sms.call_count == 2
    
    def test_send_batch_progress_callback(self):
        """Should call progress callback"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms, rate_limit=100)
        
        progress_calls = []
        def on_progress(current, total, recipient):
            progress_calls.append((current, total, recipient.phone))
        
        recipients = [
            Recipient(phone="+15145550199"),
            Recipient(phone="+15145550200")
        ]
        
        sender.send_batch(
            recipients=recipients,
            template_name="appointment_reminder",
            on_progress=on_progress
        )
        
        assert len(progress_calls) == 2
        assert progress_calls[0] == (1, 2, "+15145550199")
        assert progress_calls[1] == (2, 2, "+15145550200")
    
    def test_send_batch_cancellation(self):
        """Should stop on cancellation"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms, rate_limit=100)
        
        # Cancel after first message
        def on_progress(current, total, recipient):
            if current == 1:
                sender.cancel()
        
        recipients = [
            Recipient(phone="+15145550199"),
            Recipient(phone="+15145550200"),
            Recipient(phone="+15145550201")
        ]
        
        result = sender.send_batch(
            recipients=recipients,
            template_name="appointment_reminder",
            on_progress=on_progress
        )
        
        # First should succeed, rest should be skipped
        assert result.sent_count == 1
        assert result.skipped_count >= 1
    
    def test_send_batch_retry_on_failure(self):
        """Should retry failed sends"""
        mock_sms = self.create_mock_sms()
        
        # Fail first attempt, succeed on retry
        mock_sms.send_sms.side_effect = [
            Exception("Temporary error"),
            {"id": "msg-1"}  # Success on retry
        ]
        
        sender = BatchSender(mock_sms, rate_limit=100, retry_count=1, retry_delay=0.01)
        
        recipients = [Recipient(phone="+15145550199")]
        result = sender.send_batch(recipients, "appointment_reminder")
        
        assert result.sent_count == 1
        assert mock_sms.send_sms.call_count == 2  # Original + 1 retry
    
    def test_import_csv_through_sender(self):
        """Should import CSV via sender wrapper"""
        mock_sms = self.create_mock_sms()
        sender = BatchSender(mock_sms)
        
        # Create test CSV
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["phone", "first_name"])
            writer.writerow(["+15145550199", "John"])
            filepath = f.name
        
        try:
            recipients = sender.import_csv(filepath)
            assert len(recipients) == 1
            assert recipients[0].first_name == "John"
        finally:
            os.unlink(filepath)


# ============================================
# INTEGRATION TESTS
# ============================================

class TestBulkSendIntegration:
    """Integration tests for full bulk send flow"""
    
    def test_full_csv_to_batch_flow(self):
        """Test complete flow from CSV to batch send"""
        # Create test CSV
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["phone", "first_name", "last_name", "appointment_date", "appointment_time"])
            writer.writerow(["+15145550199", "John", "Smith", "Dec 15", "10:00 AM"])
            writer.writerow(["+15145550200", "Jane", "Doe", "Dec 15", "11:00 AM"])
            writer.writerow(["invalid", "Bad", "Phone", "Dec 15", "12:00 PM"])
            filepath = f.name
        
        try:
            # Mock SMS client
            mock_sms = Mock(spec=GoToSMS)
            mock_sms.send_sms.return_value = {"id": "msg-123"}
            mock_sms.is_phone_blocked.return_value = False
            
            sender = BatchSender(mock_sms, rate_limit=100)
            
            # Import
            recipients = sender.import_csv(filepath)
            assert len(recipients) == 3
            
            # Preview
            preview = sender.preview(recipients, "appointment_reminder")
            assert preview["valid_recipients"] == 2
            assert preview["invalid_recipients"] == 1
            
            # Send
            result = sender.send_batch(
                recipients=recipients,
                template_name="appointment_reminder",
                campaign_name="Integration Test"
            )
            
            assert result.sent_count == 2
            assert result.skipped_count == 1
            assert result.success_rate == pytest.approx(66.67, rel=0.1)
            
        finally:
            os.unlink(filepath)
    
    def test_sample_csv_creation(self):
        """Test sample CSV file creation"""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "sample.csv")
            create_sample_csv(filepath, num_rows=5)
            
            # Verify file was created
            assert os.path.exists(filepath)
            
            # Verify contents
            with open(filepath, 'r') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            assert len(rows) == 5
            assert "phone" in rows[0]
            assert "first_name" in rows[0]


# ============================================
# ERROR HANDLING TESTS
# ============================================

class TestErrorHandling:
    """Tests for error handling scenarios"""
    
    def test_template_error_in_batch(self):
        """Should handle template formatting errors gracefully"""
        mock_sms = Mock(spec=GoToSMS)
        mock_sms.is_phone_blocked.return_value = False
        
        sender = BatchSender(mock_sms, rate_limit=100)
        
        recipients = [
            Recipient(phone="+15145550199")
        ]
        
        # Use invalid template
        result = sender.send_batch(recipients, "nonexistent_template")
        
        assert result.failed_count == 1
        assert "Template error" in result.recipients[0].error_message or "Unknown template" in result.recipients[0].error_message
    
    def test_api_error_exhausts_retries(self):
        """Should fail after exhausting retries"""
        mock_sms = Mock(spec=GoToSMS)
        mock_sms.send_sms.side_effect = Exception("Persistent API error")
        mock_sms.is_phone_blocked.return_value = False
        
        sender = BatchSender(mock_sms, rate_limit=100, retry_count=2, retry_delay=0.01)
        
        recipients = [Recipient(phone="+15145550199", first_name="John")]
        result = sender.send_batch(recipients, "appointment_reminder")
        
        assert result.failed_count == 1
        assert result.sent_count == 0
        assert mock_sms.send_sms.call_count == 3  # Original + 2 retries
        assert "Persistent API error" in result.recipients[0].error_message


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
