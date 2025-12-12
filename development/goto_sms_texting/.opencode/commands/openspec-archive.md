# OpenSpec Archive Command

Archive a completed change and merge spec updates.

## Instructions

When the user invokes `/openspec-archive <change-name>`, archive the completed change:

1. **Verify completion:**
   - Check `openspec/changes/<change-name>/tasks.md`
   - Ensure all tasks are marked complete `[x]`
   - If incomplete tasks exist, warn and ask for confirmation

2. **Merge spec deltas:**
   - For each file in `openspec/changes/<change-name>/specs/`
   - Apply ADDED requirements to corresponding spec in `openspec/specs/`
   - Apply MODIFIED requirements (replace existing)
   - Apply REMOVED requirements (delete from spec)

3. **Move to archive:**
   - Move `openspec/changes/<change-name>/` to `openspec/archive/<change-name>/`
   - Add archive timestamp to proposal.md

4. **Update any cross-references:**
   - If other proposals reference this change, update them

5. **Run `openspec list`** to confirm archival

6. **Report summary:**
   - Which specs were updated
   - What was archived
   - Any manual follow-up needed

## Example

```
User: /openspec-archive oauth-token-refresh

AI: Archiving the oauth-token-refresh change...

Checking task completion...
- All 28 tasks complete ✓

Merging spec deltas:
- Updated openspec/specs/security/spec.md (added refresh token requirements)
- Updated openspec/specs/integrations/goto-api/spec.md (added refresh flow)

Moving to archive...
- Moved to openspec/archive/oauth-token-refresh/

Archive complete! The OAuth token refresh feature is now part of the source-of-truth specs.

Run `openspec list` to see remaining active changes.
```

## Pre-Archive Checklist

Before archiving, verify:
- [ ] All tasks marked complete
- [ ] Code changes committed
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Spec deltas ready to merge

## Handling Incomplete Changes

If tasks remain incomplete:

```
AI: Warning: 3 tasks are not complete in oauth-token-refresh:
- [ ] 9.3 Test expired refresh token handling
- [ ] 10.1 Update README.md with refresh token setup
- [ ] 10.2 Update google_chat_bot/SETUP.md

Options:
1. Complete remaining tasks first
2. Archive anyway (not recommended)
3. Cancel archival

What would you like to do?
```
