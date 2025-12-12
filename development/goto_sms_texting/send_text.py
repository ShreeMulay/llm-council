#!/usr/bin/env python3
"""
GoTo SMS Command Line Interface

A simple CLI tool to send text messages to patients using the GoTo API.

Usage:
    python send_text.py --help
    python send_text.py reminder --phone +15145550199 --name "John Smith" --date "Dec 1" --time "2:30 PM"
    python send_text.py custom --phone +15145550199 --message "Your custom message here"
    python send_text.py bulk --file patients.csv --template appointment_reminder --dry-run
"""

import argparse
import sys
import os
from goto_sms import GoToSMS, list_templates, MESSAGE_TEMPLATES, MessageBlockedError
from bulk_sms import BatchSender, CSVImporter


def get_access_token():
    """
    Get access token from environment variable or prompt user.
    """
    token = os.environ.get("GOTO_ACCESS_TOKEN")
    if not token:
        print("\n[!] No access token found in environment variable GOTO_ACCESS_TOKEN")
        print("\nTo get an access token, you need to:")
        print("1. Go to https://developer.goto.com/")
        print("2. Create an OAuth client with 'messaging.v1.send' scope")
        print("3. Complete the OAuth flow to get an access token")
        print("\nYou can set the token as an environment variable:")
        print("  export GOTO_ACCESS_TOKEN='your_token_here'")
        print("\nOr enter it now:")
        token = input("\nAccess Token: ").strip()
        
        if not token:
            print("Error: Access token is required")
            sys.exit(1)
    
    return token


def send_kidney_video(args):
    """Send kidney treatment video introduction."""
    token = get_access_token()
    sms = GoToSMS(access_token=token)
    
    print(f"\nSending kidney treatment video to {args.phone}...")
    try:
        result = sms.send_kidney_video(
            phone_number=args.phone,
            first_name=args.firstname
        )
        print("Success! Kidney video link sent.")
        print(f"Message ID: {result.get('id', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def send_reminder(args):
    """Send an appointment reminder."""
    token = get_access_token()
    sms = GoToSMS(access_token=token)
    
    print(f"\nSending appointment reminder to {args.phone}...")
    try:
        result = sms.send_appointment_reminder(
            phone_number=args.phone,
            patient_name=args.name,
            appointment_date=args.date,
            appointment_time=args.time
        )
        print("Success! Message sent.")
        print(f"Message ID: {result.get('id', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def send_confirmation(args):
    """Send an appointment confirmation."""
    token = get_access_token()
    sms = GoToSMS(access_token=token)
    
    print(f"\nSending appointment confirmation to {args.phone}...")
    try:
        result = sms.send_appointment_confirmation(
            phone_number=args.phone,
            patient_name=args.name,
            appointment_date=args.date,
            appointment_time=args.time
        )
        print("Success! Message sent.")
        print(f"Message ID: {result.get('id', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def send_followup(args):
    """Send a follow-up message."""
    token = get_access_token()
    sms = GoToSMS(access_token=token)
    
    print(f"\nSending follow-up message to {args.phone}...")
    try:
        result = sms.send_follow_up(
            phone_number=args.phone,
            patient_name=args.name
        )
        print("Success! Message sent.")
        print(f"Message ID: {result.get('id', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def send_prescription(args):
    """Send prescription ready notification."""
    token = get_access_token()
    sms = GoToSMS(access_token=token)
    
    print(f"\nSending prescription ready notification to {args.phone}...")
    try:
        result = sms.send_prescription_ready(
            phone_number=args.phone,
            patient_name=args.name
        )
        print("Success! Message sent.")
        print(f"Message ID: {result.get('id', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def send_thankyou(args):
    """Send a thank you message."""
    token = get_access_token()
    sms = GoToSMS(access_token=token)
    
    print(f"\nSending thank you message to {args.phone}...")
    try:
        result = sms.send_thank_you(
            phone_number=args.phone,
            patient_name=args.name
        )
        print("Success! Message sent.")
        print(f"Message ID: {result.get('id', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def send_custom(args):
    """Send a custom message."""
    token = get_access_token()
    sms = GoToSMS(access_token=token)
    
    print(f"\nSending custom message to {args.phone}...")
    try:
        result = sms.send_custom_message(
            phone_number=args.phone,
            message=args.message
        )
        print("Success! Message sent.")
        print(f"Message ID: {result.get('id', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def show_templates(args):
    """Show all available message templates."""
    list_templates()


def send_bulk(args):
    """Send bulk messages from CSV file."""
    token = get_access_token()
    sms = GoToSMS(access_token=token)
    
    # Set up batch sender
    rate_limit = args.rate if hasattr(args, 'rate') and args.rate else 1.0
    sender = BatchSender(sms, rate_limit=rate_limit)
    
    # Import recipients
    print(f"\nImporting recipients from {args.file}...")
    try:
        recipients = sender.import_csv(args.file)
    except FileNotFoundError:
        print(f"Error: File not found: {args.file}")
        sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    # Show import report
    report = sender.get_import_report()
    if "Error" in report or "Warning" in report:
        print(report)
    
    print(f"Loaded {len(recipients)} recipients")
    
    # Preview
    preview = sender.preview(recipients, args.template)
    
    print(f"\n--- Bulk Send Preview ---")
    print(f"Template: {args.template}")
    print(f"Total recipients: {preview['total_recipients']}")
    print(f"Valid recipients: {preview['valid_recipients']}")
    print(f"Invalid (will skip): {preview['invalid_recipients']}")
    print(f"Blocked (opted-out): {preview['blocked_recipients']}")
    print(f"Will send to: {preview['will_send_to']}")
    print(f"Estimated time: {preview['estimated_time_seconds']:.0f} seconds")
    
    if preview['sample_messages']:
        print(f"\nSample messages:")
        for sample in preview['sample_messages']:
            if 'error' in sample:
                print(f"  - {sample['phone']}: ERROR - {sample['error']}")
            else:
                print(f"  - {sample['phone']} ({sample['name']})")
                print(f"    {sample['message_preview']}")
    
    # Dry run mode
    if args.dry_run:
        print("\n[DRY RUN] No messages will be sent.")
        return
    
    # Confirmation
    if preview['will_send_to'] == 0:
        print("\nNo valid recipients to send to. Exiting.")
        return
    
    confirm = input(f"\nSend {preview['will_send_to']} messages? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("Cancelled.")
        return
    
    # Progress callback
    def on_progress(current, total, recipient):
        pct = (current / total) * 100
        status = "..." if recipient.status.value == "pending" else recipient.status.value.upper()
        print(f"[{current}/{total}] {pct:.0f}% - {recipient.phone} - {status}")
    
    # Send batch
    campaign_name = args.campaign if hasattr(args, 'campaign') and args.campaign else None
    
    print(f"\nStarting bulk send...")
    print("Press Ctrl+C to cancel\n")
    
    try:
        result = sender.send_batch(
            recipients=recipients,
            template_name=args.template,
            campaign_name=campaign_name,
            on_progress=on_progress
        )
    except KeyboardInterrupt:
        sender.cancel()
        print("\n\nCancelled by user.")
        return
    
    # Show summary
    print(result.summary())
    
    # Export results
    if hasattr(args, 'output') and args.output:
        result.to_csv(args.output)
        print(f"Results exported to: {args.output}")


def interactive_mode(args):
    """Run in interactive mode for easy message sending."""
    print("\n" + "=" * 50)
    print("   GoTo SMS Texting Tool - Interactive Mode")
    print("=" * 50)
    
    token = get_access_token()
    sms = GoToSMS(access_token=token)
    
    while True:
        print("\n--- Main Menu ---")
        print("1. Send Kidney Treatment Video")
        print("2. Send Appointment Reminder")
        print("3. Send Appointment Confirmation")
        print("4. Send Follow-up Message")
        print("5. Send Prescription Ready")
        print("6. Send Thank You")
        print("7. Send Custom Message")
        print("8. View Templates")
        print("9. Exit")
        
        choice = input("\nSelect option (1-9): ").strip()
        
        if choice == "9":
            print("\nGoodbye!")
            break
        elif choice == "8":
            list_templates()
            continue
        
        # Get phone number
        phone = input("Patient phone number (e.g., +15145550199): ").strip()
        if not phone:
            print("Phone number is required!")
            continue
        
        try:
            if choice == "1":
                first_name = input("Patient first name: ").strip()
                result = sms.send_kidney_video(phone, first_name)
            
            elif choice == "2":
                name = input("Patient name: ").strip()
                date = input("Appointment date (e.g., December 1, 2024): ").strip()
                time = input("Appointment time (e.g., 2:30 PM): ").strip()
                result = sms.send_appointment_reminder(phone, name, date, time)
                
            elif choice == "3":
                name = input("Patient name: ").strip()
                date = input("Appointment date: ").strip()
                time = input("Appointment time: ").strip()
                result = sms.send_appointment_confirmation(phone, name, date, time)
                
            elif choice == "4":
                name = input("Patient name: ").strip()
                result = sms.send_follow_up(phone, name)
                
            elif choice == "5":
                name = input("Patient name: ").strip()
                result = sms.send_prescription_ready(phone, name)
                
            elif choice == "6":
                name = input("Patient name: ").strip()
                result = sms.send_thank_you(phone, name)
                
            elif choice == "7":
                message = input("Enter your message: ").strip()
                result = sms.send_custom_message(phone, message)
                
            else:
                print("Invalid option. Please try again.")
                continue
            
            print("\n[SUCCESS] Message sent!")
            print(f"Message ID: {result.get('id', 'N/A')}")
            
        except Exception as e:
            print(f"\n[ERROR] Failed to send message: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="GoTo SMS Texting Tool - Send text messages to patients",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Send kidney treatment video
  python send_text.py video --phone +15145550199 --firstname "John"
  
  # Send appointment reminder
  python send_text.py reminder --phone +15145550199 --name "John Smith" --date "Dec 1" --time "2:30 PM"
  
  # Send custom message
  python send_text.py custom --phone +15145550199 --message "Hello! Please call us back."
  
  # Bulk send from CSV (dry run)
  python send_text.py bulk --file patients.csv --template appointment_reminder --dry-run
  
  # Bulk send with custom rate and output
  python send_text.py bulk -f patients.csv -t appointment_reminder -r 0.5 -o results.csv
  
  # Interactive mode
  python send_text.py interactive
  
  # View all templates
  python send_text.py templates

Environment Variables:
  GOTO_ACCESS_TOKEN    Your GoTo OAuth access token
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Kidney video command
    video_parser = subparsers.add_parser("video", help="Send kidney treatment video")
    video_parser.add_argument("--phone", "-p", required=True, help="Patient phone number")
    video_parser.add_argument("--firstname", "-f", required=True, help="Patient first name")
    video_parser.set_defaults(func=send_kidney_video)
    
    # Reminder command
    reminder_parser = subparsers.add_parser("reminder", help="Send appointment reminder")
    reminder_parser.add_argument("--phone", "-p", required=True, help="Patient phone number")
    reminder_parser.add_argument("--name", "-n", required=True, help="Patient name")
    reminder_parser.add_argument("--date", "-d", required=True, help="Appointment date")
    reminder_parser.add_argument("--time", "-t", required=True, help="Appointment time")
    reminder_parser.set_defaults(func=send_reminder)
    
    # Confirmation command
    confirm_parser = subparsers.add_parser("confirm", help="Send appointment confirmation")
    confirm_parser.add_argument("--phone", "-p", required=True, help="Patient phone number")
    confirm_parser.add_argument("--name", "-n", required=True, help="Patient name")
    confirm_parser.add_argument("--date", "-d", required=True, help="Appointment date")
    confirm_parser.add_argument("--time", "-t", required=True, help="Appointment time")
    confirm_parser.set_defaults(func=send_confirmation)
    
    # Follow-up command
    followup_parser = subparsers.add_parser("followup", help="Send follow-up message")
    followup_parser.add_argument("--phone", "-p", required=True, help="Patient phone number")
    followup_parser.add_argument("--name", "-n", required=True, help="Patient name")
    followup_parser.set_defaults(func=send_followup)
    
    # Prescription command
    rx_parser = subparsers.add_parser("prescription", help="Send prescription ready notification")
    rx_parser.add_argument("--phone", "-p", required=True, help="Patient phone number")
    rx_parser.add_argument("--name", "-n", required=True, help="Patient name")
    rx_parser.set_defaults(func=send_prescription)
    
    # Thank you command
    thanks_parser = subparsers.add_parser("thankyou", help="Send thank you message")
    thanks_parser.add_argument("--phone", "-p", required=True, help="Patient phone number")
    thanks_parser.add_argument("--name", "-n", required=True, help="Patient name")
    thanks_parser.set_defaults(func=send_thankyou)
    
    # Custom message command
    custom_parser = subparsers.add_parser("custom", help="Send custom message")
    custom_parser.add_argument("--phone", "-p", required=True, help="Patient phone number")
    custom_parser.add_argument("--message", "-m", required=True, help="Message text")
    custom_parser.set_defaults(func=send_custom)
    
    # Templates command
    templates_parser = subparsers.add_parser("templates", help="View all message templates")
    templates_parser.set_defaults(func=show_templates)
    
    # Interactive mode command
    interactive_parser = subparsers.add_parser("interactive", help="Run in interactive mode")
    interactive_parser.set_defaults(func=interactive_mode)
    
    # Bulk send command
    bulk_parser = subparsers.add_parser(
        "bulk", 
        help="Send bulk messages from CSV file",
        description="""
Send bulk SMS messages to multiple recipients from a CSV file.

The CSV file should have at minimum a 'phone' column. Supported columns:
  - phone (required): phone_number, phonenumber, mobile, cell, telephone
  - first_name: firstname, first, fname, given_name
  - last_name: lastname, last, lname, surname, family_name
  - appointment_date: date, appt_date, visit_date
  - appointment_time: time, appt_time, visit_time
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    bulk_parser.add_argument(
        "--file", "-f", 
        required=True, 
        help="Path to CSV file with recipients"
    )
    bulk_parser.add_argument(
        "--template", "-t", 
        required=True, 
        help="Message template name (use 'templates' command to list)"
    )
    bulk_parser.add_argument(
        "--rate", "-r", 
        type=float, 
        default=1.0,
        help="Messages per second rate limit (default: 1.0)"
    )
    bulk_parser.add_argument(
        "--dry-run", 
        action="store_true",
        help="Preview only, don't send messages"
    )
    bulk_parser.add_argument(
        "--campaign", "-c",
        help="Campaign name for logging (auto-generated if not provided)"
    )
    bulk_parser.add_argument(
        "--output", "-o",
        help="Export results to CSV file"
    )
    bulk_parser.set_defaults(func=send_bulk)
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        sys.exit(0)
    
    args.func(args)


if __name__ == "__main__":
    main()
