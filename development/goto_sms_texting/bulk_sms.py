"""
Bulk SMS Sending Module

Provides batch SMS sending capabilities with:
- CSV and Google Sheets import
- Rate limiting
- Progress tracking
- Do-Not-Contact filtering
- Summary reporting
"""

import csv
import time
import logging
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Callable, Any, Sequence
from pathlib import Path
from enum import Enum

from goto_sms import GoToSMS, MessageBlockedError
from config import MESSAGE_TEMPLATES

# Configure logging
logger = logging.getLogger(__name__)


class SendStatus(Enum):
    """Status of an individual send attempt"""
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    BLOCKED = "blocked"


@dataclass
class Recipient:
    """Represents a message recipient with their data"""
    phone: str
    first_name: str = ""
    last_name: str = ""
    appointment_date: str = ""
    appointment_time: str = ""
    custom_data: Dict[str, str] = field(default_factory=dict)
    status: SendStatus = SendStatus.PENDING
    error_message: str = ""
    message_id: str = ""
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "phone": self.phone,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "appointment_date": self.appointment_date,
            "appointment_time": self.appointment_time,
            "status": self.status.value,
            "error_message": self.error_message,
            "message_id": self.message_id,
            **self.custom_data
        }


@dataclass
class BatchResult:
    """Summary of a batch send operation"""
    campaign_name: str
    template_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    total_recipients: int = 0
    sent_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0
    blocked_count: int = 0
    recipients: List[Recipient] = field(default_factory=list)
    
    @property
    def success_rate(self) -> float:
        if self.total_recipients == 0:
            return 0.0
        return (self.sent_count / self.total_recipients) * 100
    
    @property
    def duration_seconds(self) -> float:
        if not self.end_time:
            return 0.0
        return (self.end_time - self.start_time).total_seconds()
    
    def summary(self) -> str:
        """Generate human-readable summary"""
        lines = [
            f"\n{'='*50}",
            f"BULK SEND SUMMARY: {self.campaign_name}",
            f"{'='*50}",
            f"Template: {self.template_name}",
            f"Start: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}",
            f"End: {self.end_time.strftime('%Y-%m-%d %H:%M:%S') if self.end_time else 'In Progress'}",
            f"Duration: {self.duration_seconds:.1f} seconds",
            f"",
            f"RESULTS:",
            f"  Total Recipients: {self.total_recipients}",
            f"  Sent Successfully: {self.sent_count}",
            f"  Failed: {self.failed_count}",
            f"  Skipped (invalid): {self.skipped_count}",
            f"  Blocked (opted-out): {self.blocked_count}",
            f"  Success Rate: {self.success_rate:.1f}%",
        ]
        
        # Add failed details
        failed = [r for r in self.recipients if r.status == SendStatus.FAILED]
        if failed:
            lines.append(f"\nFAILED RECIPIENTS ({len(failed)}):")
            for r in failed[:10]:  # Show first 10
                lines.append(f"  - {r.phone}: {r.error_message}")
            if len(failed) > 10:
                lines.append(f"  ... and {len(failed) - 10} more")
        
        # Add blocked details
        blocked = [r for r in self.recipients if r.status == SendStatus.BLOCKED]
        if blocked:
            lines.append(f"\nBLOCKED RECIPIENTS ({len(blocked)}):")
            for r in blocked[:5]:
                lines.append(f"  - {r.phone} (opted out)")
            if len(blocked) > 5:
                lines.append(f"  ... and {len(blocked) - 5} more")
        
        lines.append(f"{'='*50}\n")
        return "\n".join(lines)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "campaign_name": self.campaign_name,
            "template_name": self.template_name,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "total_recipients": self.total_recipients,
            "sent_count": self.sent_count,
            "failed_count": self.failed_count,
            "skipped_count": self.skipped_count,
            "blocked_count": self.blocked_count,
            "success_rate": self.success_rate,
            "duration_seconds": self.duration_seconds
        }
    
    def to_csv(self, filepath: str) -> None:
        """Export detailed results to CSV"""
        with open(filepath, 'w', newline='') as f:
            if self.recipients:
                writer = csv.DictWriter(f, fieldnames=self.recipients[0].to_dict().keys())
                writer.writeheader()
                for r in self.recipients:
                    writer.writerow(r.to_dict())


class CSVImporter:
    """Import recipients from CSV files"""
    
    # Required columns
    REQUIRED_COLUMNS = ["phone"]
    
    # Optional columns with aliases
    COLUMN_ALIASES = {
        "phone": ["phone", "phone_number", "phonenumber", "mobile", "cell", "telephone"],
        "first_name": ["first_name", "firstname", "first", "fname", "given_name"],
        "last_name": ["last_name", "lastname", "last", "lname", "surname", "family_name"],
        "appointment_date": ["appointment_date", "date", "appt_date", "visit_date"],
        "appointment_time": ["appointment_time", "time", "appt_time", "visit_time"],
    }
    
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def _find_column(self, headers: Sequence[str], field: str) -> Optional[str]:
        """Find a column by name or alias"""
        headers_lower = [h.lower().strip() for h in headers]
        aliases = self.COLUMN_ALIASES.get(field, [field])
        
        for alias in aliases:
            if alias.lower() in headers_lower:
                idx = headers_lower.index(alias.lower())
                return headers[idx]
        return None
    
    def import_file(self, filepath: str) -> List[Recipient]:
        """
        Import recipients from a CSV file.
        
        Args:
            filepath: Path to CSV file
            
        Returns:
            List of Recipient objects
        """
        self.errors = []
        self.warnings = []
        recipients = []
        
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"CSV file not found: {filepath}")
        
        with open(filepath, 'r', newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []
            
            # Find column mappings
            phone_col = self._find_column(headers, "phone")
            fname_col = self._find_column(headers, "first_name")
            lname_col = self._find_column(headers, "last_name")
            date_col = self._find_column(headers, "appointment_date")
            time_col = self._find_column(headers, "appointment_time")
            
            if not phone_col:
                raise ValueError("CSV must have a phone number column (phone, phone_number, mobile, etc.)")
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (1 is header)
                try:
                    phone = row.get(phone_col, "").strip()
                    
                    if not phone:
                        self.warnings.append(f"Row {row_num}: Empty phone number, skipping")
                        continue
                    
                    # Get other fields
                    recipient = Recipient(
                        phone=phone,
                        first_name=row.get(fname_col, "").strip() if fname_col else "",
                        last_name=row.get(lname_col, "").strip() if lname_col else "",
                        appointment_date=row.get(date_col, "").strip() if date_col else "",
                        appointment_time=row.get(time_col, "").strip() if time_col else "",
                    )
                    
                    # Store any extra columns as custom data
                    mapped_cols = {phone_col, fname_col, lname_col, date_col, time_col}
                    for col in headers:
                        if col not in mapped_cols and col:
                            recipient.custom_data[col] = row.get(col, "").strip()
                    
                    recipients.append(recipient)
                    
                except Exception as e:
                    self.errors.append(f"Row {row_num}: {str(e)}")
        
        logger.info(f"Imported {len(recipients)} recipients from {filepath}")
        if self.warnings:
            logger.warning(f"Import warnings: {len(self.warnings)}")
        if self.errors:
            logger.error(f"Import errors: {len(self.errors)}")
        
        return recipients
    
    def get_validation_report(self) -> str:
        """Get a report of import validation issues"""
        lines = ["CSV Import Validation Report", "=" * 30]
        
        if self.errors:
            lines.append(f"\nErrors ({len(self.errors)}):")
            for err in self.errors[:20]:
                lines.append(f"  - {err}")
            if len(self.errors) > 20:
                lines.append(f"  ... and {len(self.errors) - 20} more")
        
        if self.warnings:
            lines.append(f"\nWarnings ({len(self.warnings)}):")
            for warn in self.warnings[:20]:
                lines.append(f"  - {warn}")
            if len(self.warnings) > 20:
                lines.append(f"  ... and {len(self.warnings) - 20} more")
        
        if not self.errors and not self.warnings:
            lines.append("\nNo issues found!")
        
        return "\n".join(lines)


class BatchSender:
    """
    Batch SMS sender with rate limiting and progress tracking.
    
    Example usage:
        sms = GoToSMS(access_token="...")
        sender = BatchSender(sms)
        
        # Import recipients
        recipients = sender.import_csv("patients.csv")
        
        # Send with progress callback
        result = sender.send_batch(
            recipients=recipients,
            template_name="appointment_reminder",
            campaign_name="Dec 15 Reminders",
            on_progress=lambda p: print(f"Progress: {p}%")
        )
        
        print(result.summary())
    """
    
    def __init__(
        self,
        sms_client: GoToSMS,
        rate_limit: float = 1.0,
        retry_count: int = 2,
        retry_delay: float = 2.0
    ):
        """
        Initialize batch sender.
        
        Args:
            sms_client: GoToSMS client instance
            rate_limit: Messages per second (default 1.0)
            retry_count: Number of retries for failed sends
            retry_delay: Delay between retries in seconds
        """
        self.sms = sms_client
        self.rate_limit = rate_limit
        self.retry_count = retry_count
        self.retry_delay = retry_delay
        self._cancelled = False
        self._csv_importer = CSVImporter()
    
    def import_csv(self, filepath: str) -> List[Recipient]:
        """Import recipients from CSV file"""
        return self._csv_importer.import_file(filepath)
    
    def get_import_report(self) -> str:
        """Get import validation report"""
        return self._csv_importer.get_validation_report()
    
    def cancel(self) -> None:
        """Cancel the current batch operation"""
        self._cancelled = True
        logger.info("Batch cancellation requested")
    
    def _validate_recipient(self, recipient: Recipient) -> bool:
        """Validate a recipient has required data"""
        if not recipient.phone:
            return False
        
        # Basic phone validation
        phone = recipient.phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not phone.replace("+", "").isdigit():
            return False
        if len(phone.replace("+", "")) < 10:
            return False
        
        return True
    
    def _format_message(self, template_name: str, recipient: Recipient) -> str:
        """Format a message template with recipient data"""
        if template_name not in MESSAGE_TEMPLATES:
            raise ValueError(f"Unknown template: {template_name}")
        
        template = MESSAGE_TEMPLATES[template_name]["message"]
        
        # Replace placeholders
        message = template
        message = message.replace("{patient_name}", recipient.first_name or "Patient")
        message = message.replace("{first_name}", recipient.first_name or "Patient")
        message = message.replace("{appointment_date}", recipient.appointment_date or "your scheduled date")
        message = message.replace("{appointment_time}", recipient.appointment_time or "your scheduled time")
        
        # Replace any custom data placeholders
        for key, value in recipient.custom_data.items():
            message = message.replace(f"{{{key}}}", value)
        
        return message
    
    def filter_blocked(self, recipients: List[Recipient]) -> tuple:
        """
        Filter out blocked (opted-out) recipients.
        
        Returns:
            Tuple of (allowed_recipients, blocked_recipients)
        """
        allowed = []
        blocked = []
        
        for r in recipients:
            if self.sms.is_phone_blocked(r.phone):
                r.status = SendStatus.BLOCKED
                r.error_message = "Recipient opted out (STOP)"
                blocked.append(r)
            else:
                allowed.append(r)
        
        if blocked:
            logger.info(f"Filtered {len(blocked)} blocked recipients")
        
        return allowed, blocked
    
    def preview(
        self,
        recipients: List[Recipient],
        template_name: str
    ) -> Dict[str, Any]:
        """
        Preview a batch send without actually sending.
        
        Returns:
            Preview information including counts and sample messages
        """
        # Validate recipients
        valid = []
        invalid = []
        for r in recipients:
            if self._validate_recipient(r):
                valid.append(r)
            else:
                invalid.append(r)
        
        # Filter blocked
        allowed, blocked = self.filter_blocked(valid)
        
        # Generate sample messages
        samples = []
        for r in allowed[:3]:
            try:
                msg = self._format_message(template_name, r)
                samples.append({
                    "phone": r.phone,
                    "name": r.full_name,
                    "message_preview": msg[:100] + "..." if len(msg) > 100 else msg
                })
            except Exception as e:
                samples.append({"phone": r.phone, "error": str(e)})
        
        return {
            "template": template_name,
            "total_recipients": len(recipients),
            "valid_recipients": len(valid),
            "invalid_recipients": len(invalid),
            "blocked_recipients": len(blocked),
            "will_send_to": len(allowed),
            "estimated_time_seconds": len(allowed) / self.rate_limit,
            "sample_messages": samples
        }
    
    def send_batch(
        self,
        recipients: List[Recipient],
        template_name: str,
        campaign_name: Optional[str] = None,
        on_progress: Optional[Callable[[int, int, Recipient], None]] = None,
        dry_run: bool = False
    ) -> BatchResult:
        """
        Send messages to a batch of recipients.
        
        Args:
            recipients: List of recipients to send to
            template_name: Name of message template to use
            campaign_name: Optional campaign identifier
            on_progress: Callback function(current, total, recipient) for progress updates
            dry_run: If True, validate but don't actually send
            
        Returns:
            BatchResult with send statistics
        """
        self._cancelled = False
        
        if not campaign_name:
            campaign_name = f"Batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        result = BatchResult(
            campaign_name=campaign_name,
            template_name=template_name,
            start_time=datetime.now(),
            total_recipients=len(recipients)
        )
        
        # Validate and filter
        valid_recipients = []
        for r in recipients:
            if self._validate_recipient(r):
                valid_recipients.append(r)
            else:
                r.status = SendStatus.SKIPPED
                r.error_message = "Invalid phone number format"
                result.skipped_count += 1
                result.recipients.append(r)
        
        # Filter blocked
        allowed, blocked = self.filter_blocked(valid_recipients)
        result.blocked_count = len(blocked)
        result.recipients.extend(blocked)
        
        if dry_run:
            logger.info(f"DRY RUN: Would send to {len(allowed)} recipients")
            result.end_time = datetime.now()
            for r in allowed:
                r.status = SendStatus.PENDING
                result.recipients.append(r)
            return result
        
        # Send messages with rate limiting
        delay = 1.0 / self.rate_limit
        
        for i, recipient in enumerate(allowed):
            if self._cancelled:
                logger.info("Batch cancelled by user")
                recipient.status = SendStatus.SKIPPED
                recipient.error_message = "Cancelled by user"
                result.skipped_count += 1
                result.recipients.append(recipient)
                continue
            
            # Progress callback
            if on_progress:
                on_progress(i + 1, len(allowed), recipient)
            
            # Format message
            try:
                message = self._format_message(template_name, recipient)
            except Exception as e:
                recipient.status = SendStatus.FAILED
                recipient.error_message = f"Template error: {str(e)}"
                result.failed_count += 1
                result.recipients.append(recipient)
                continue
            
            # Send with retry
            success = False
            last_error = ""
            
            for attempt in range(self.retry_count + 1):
                try:
                    response = self.sms.send_sms(
                        phone_numbers=[recipient.phone],
                        message=message,
                        skip_blocked_check=True  # Already filtered
                    )
                    recipient.status = SendStatus.SUCCESS
                    recipient.message_id = response.get("id", "")
                    result.sent_count += 1
                    success = True
                    break
                    
                except MessageBlockedError:
                    recipient.status = SendStatus.BLOCKED
                    recipient.error_message = "Recipient opted out"
                    result.blocked_count += 1
                    break
                    
                except Exception as e:
                    last_error = str(e)
                    if attempt < self.retry_count:
                        logger.warning(f"Retry {attempt + 1} for {recipient.phone}: {e}")
                        time.sleep(self.retry_delay)
            
            if not success and recipient.status == SendStatus.PENDING:
                recipient.status = SendStatus.FAILED
                recipient.error_message = last_error
                result.failed_count += 1
            
            result.recipients.append(recipient)
            
            # Rate limiting delay
            if i < len(allowed) - 1:  # Don't delay after last message
                time.sleep(delay)
        
        result.end_time = datetime.now()
        logger.info(f"Batch complete: {result.sent_count}/{len(allowed)} sent successfully")
        
        return result


def create_sample_csv(filepath: str, num_rows: int = 10) -> None:
    """Create a sample CSV file for testing"""
    import random
    
    first_names = ["John", "Jane", "Bob", "Alice", "Charlie", "Diana", "Eve", "Frank"]
    last_names = ["Smith", "Doe", "Johnson", "Williams", "Brown", "Jones", "Davis"]
    
    with open(filepath, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["first_name", "last_name", "phone", "appointment_date", "appointment_time"])
        
        for i in range(num_rows):
            fname = random.choice(first_names)
            lname = random.choice(last_names)
            phone = f"+1514555{random.randint(1000, 9999)}"
            date = f"December {random.randint(1, 28)}, 2024"
            time = f"{random.randint(9, 16)}:{random.choice(['00', '15', '30', '45'])} {'AM' if random.randint(9, 16) < 12 else 'PM'}"
            
            writer.writerow([fname, lname, phone, date, time])
    
    print(f"Created sample CSV with {num_rows} rows: {filepath}")


# Example usage
if __name__ == "__main__":
    print("Bulk SMS Module")
    print("=" * 40)
    print("""
Usage:
    from bulk_sms import BatchSender, CSVImporter
    from goto_sms import GoToSMS
    
    # Initialize
    sms = GoToSMS(access_token="your_token")
    sender = BatchSender(sms, rate_limit=1.0)
    
    # Import from CSV
    recipients = sender.import_csv("patients.csv")
    print(sender.get_import_report())
    
    # Preview (dry run)
    preview = sender.preview(recipients, "appointment_reminder")
    print(f"Will send to {preview['will_send_to']} recipients")
    
    # Send batch
    result = sender.send_batch(
        recipients=recipients,
        template_name="appointment_reminder",
        campaign_name="Dec Reminders",
        on_progress=lambda cur, tot, r: print(f"Sending {cur}/{tot}: {r.phone}")
    )
    
    print(result.summary())
    result.to_csv("results.csv")
""")
    
    # Create sample file for testing
    create_sample_csv("sample_patients.csv", 5)
