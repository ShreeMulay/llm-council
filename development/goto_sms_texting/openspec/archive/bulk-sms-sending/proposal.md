# Change Proposal: Bulk SMS Sending

## Summary

Enable sending messages to multiple patients efficiently for appointment reminders, office announcements, and preventive care campaigns.

## Motivation

### Current State
- Messages sent one at a time
- No batch processing capability
- Manual work for daily appointment reminders
- No campaign management

### Problems
1. **Time-Consuming:** Sending 50 appointment reminders takes 50 manual actions
2. **Error-Prone:** Easy to miss patients in manual process
3. **No Campaigns:** Can't efficiently reach patients for preventive care
4. **Limited Scale:** Current approach doesn't scale

### Desired State
- Import patient lists from CSV or Google Sheets
- Batch send with rate limiting
- Progress tracking and reporting
- Campaign management (name, schedule, targeting)
- Respect do-not-contact list

## Scope

### In Scope
- CSV/Google Sheets patient list import
- Batch processing with configurable rate limits
- Progress tracking during send
- Summary report after completion
- Failed send retry
- Do-not-contact list integration
- Campaign naming and logging

### Out of Scope
- Scheduled/delayed sending (future enhancement)
- A/B testing of templates
- Segment targeting rules
- Campaign performance comparison

## Success Criteria

1. **Scale:** Can send to 100+ recipients in single operation
2. **Reliability:** Individual failures don't stop batch
3. **Reporting:** Summary report with success/failure counts
4. **Compliance:** Respects opt-out list automatically
5. **Usability:** Easy import from spreadsheet

## Technical Approach

### Batch Processing Flow
```
Patient List (CSV/Sheet)
        │
        ▼
   Validation
   - Phone format
   - Required fields
   - Do-not-contact check
        │
        ▼
   Rate-Limited Sending
   - 1 msg/second default
   - Configurable rate
        │
        ▼
   Progress Tracking
   - Current/total count
   - Success/failure counts
        │
        ▼
   Summary Report
   - Total sent
   - Success count
   - Failure details
```

### CLI Interface
```bash
# From CSV file
python send_text.py bulk --file patients.csv --template reminder --date "Dec 15" --time "Various"

# From Google Sheet
python send_text.py bulk --sheet "1abc...xyz" --template reminder
```

### Apps Script Interface
- New `/bulk-send` slash command
- Sheet selection dialog
- Progress updates in Chat
- Summary card when complete

### CSV Format
```csv
first_name,last_name,phone,appointment_date,appointment_time
John,Smith,+15145550199,December 15,9:00 AM
Jane,Doe,+15145550198,December 15,10:30 AM
```

## Rate Limiting

| Scenario | Rate |
|----------|------|
| Default | 1 message/second |
| Conservative | 1 message/2 seconds |
| Aggressive | 2 messages/second |

Note: Check GoTo API rate limits and adjust accordingly.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Hitting API rate limits | Configurable rate, exponential backoff |
| Sending to wrong list | Preview mode, confirmation prompt |
| Duplicate sends | Track sent status, skip already-sent |
| Large list timeout | Background processing, resume capability |

## Dependencies

- Response tracking (for do-not-contact list)
- Stable GoTo API connection

## Estimated Effort

| Component | Effort |
|-----------|--------|
| CSV import and validation | 2-3 hours |
| Batch processing logic | 3-4 hours |
| Rate limiting | 1-2 hours |
| Progress tracking | 2 hours |
| Summary reporting | 2 hours |
| Apps Script integration | 3-4 hours |
| Testing | 3 hours |
| Documentation | 1 hour |
| **Total** | **17-21 hours** |
