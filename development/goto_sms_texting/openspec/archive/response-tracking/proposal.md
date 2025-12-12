# Change Proposal: Response Tracking & Analytics

## Summary

Implement tracking for patient SMS responses and provide analytics dashboard for communication effectiveness.

## Motivation

### Current State
- Messages are sent but responses are not captured
- Templates include "reply CONFIRM" but confirmations aren't tracked
- No visibility into communication effectiveness
- STOP requests may not be honored (compliance risk)

### Problems
1. **Blind Communication:** No feedback on message delivery/response
2. **Manual Confirmation:** Staff manually track appointment confirmations
3. **Compliance Risk:** STOP requests not automatically honored
4. **No Analytics:** Can't measure communication effectiveness

### Desired State
- Incoming SMS responses captured via webhook
- CONFIRM responses automatically processed
- STOP requests automatically honored
- Analytics dashboard showing communication metrics
- Daily/weekly summary reports

## Scope

### In Scope
- GoTo webhook integration for incoming messages
- Response parsing (CONFIRM, STOP, YES, NO, etc.)
- Google Sheets analytics dashboard
- Automated STOP list management
- Appointment confirmation status updates

### Out of Scope
- Two-way conversation support (beyond simple responses)
- AI-powered response interpretation
- Real-time notifications (future enhancement)

## Success Criteria

1. **Response Capture:** All incoming SMS responses logged
2. **CONFIRM Processing:** Appointment confirmations auto-tracked
3. **STOP Compliance:** STOP requests immediately honored
4. **Analytics:** Dashboard shows key metrics
5. **Reporting:** Weekly summary available

## Technical Approach

### Architecture
```
Patient SMS Response
        │
        ▼
GoTo Webhook ──────► Apps Script Web App
                            │
                            ▼
                    Parse Response
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         CONFIRM         STOP        Other
              │             │             │
              ▼             ▼             ▼
    Update Patient    Add to        Log for
    Confirmation    Do-Not-Call    Review
        Sheet          List
```

### Response Keywords
| Keyword | Action |
|---------|--------|
| CONFIRM, YES, Y | Mark appointment confirmed |
| STOP, UNSUBSCRIBE, CANCEL | Add to do-not-call list |
| HELP | Send help message |
| Other | Log for manual review |

### Analytics Metrics
- Messages sent (daily/weekly/monthly)
- Response rate
- Confirmation rate
- Opt-out rate
- Template effectiveness

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Webhook security | Verify GoTo signature |
| False positive STOP | Require exact keyword match |
| High volume | Rate limiting, batch processing |
| Missed webhooks | Periodic sync check |

## Dependencies

- GoTo API webhook support
- Apps Script Web App deployment
- Additional Google Sheet tabs

## Estimated Effort

| Component | Effort |
|-----------|--------|
| Webhook endpoint setup | 2-3 hours |
| Response parsing logic | 2-3 hours |
| STOP list management | 2 hours |
| Analytics dashboard | 3-4 hours |
| Testing | 3 hours |
| Documentation | 1 hour |
| **Total** | **13-16 hours** |

## References

- GoTo Webhooks: https://developer.goto.com/guides/Webhooks/
