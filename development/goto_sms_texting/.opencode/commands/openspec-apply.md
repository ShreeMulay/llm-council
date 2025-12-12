# OpenSpec Apply Command

Implement tasks from an OpenSpec change proposal.

## Instructions

When the user invokes `/openspec-apply <change-name>`, implement the change:

1. **Read the proposal** at `openspec/changes/<change-name>/proposal.md`

2. **Read the tasks** at `openspec/changes/<change-name>/tasks.md`

3. **Read any spec deltas** in `openspec/changes/<change-name>/specs/`

4. **Read existing code** to understand current implementation:
   - `goto_sms.py` - Python SMS library
   - `send_text.py` - CLI tool
   - `config.py` - Configuration and templates
   - `google_chat_bot/*.gs` - Apps Script files

5. **Implement tasks in order:**
   - Work through each task group sequentially
   - Mark tasks complete as you finish them (update tasks.md)
   - Commit logical chunks of work

6. **Follow project conventions:**
   - Phone numbers in E.164 format
   - Use template system for messages
   - Log all SMS operations
   - Update both Python AND Apps Script where applicable

7. **Update specs** if implementation reveals needed changes

8. **Test the implementation:**
   - Verify Python code runs without errors
   - Check Apps Script syntax is valid
   - Test with example data where possible

9. **Report progress** as you complete task groups

## Example

```
User: /openspec-apply oauth-token-refresh

AI: I'll implement the OAuth token refresh feature.

Reading proposal... This adds automatic token refresh before expiration.

Starting with Task Group 1: Research & Planning
- Task 1.1: Verifying GoTo API refresh token support...
[continues through tasks]

Progress:
- [x] 1. Research & Planning (4/4 tasks)
- [x] 2. Python Implementation (8/8 tasks)
- [ ] 3. Apps Script Implementation (0/7 tasks)
...

Implementing Apps Script changes now...
```

## Important Notes

- Always read the full proposal before starting
- If a task seems unclear, check the spec delta for requirements
- If implementation differs from proposal, document why
- Keep the user informed of progress
- Ask for clarification if needed before making assumptions
