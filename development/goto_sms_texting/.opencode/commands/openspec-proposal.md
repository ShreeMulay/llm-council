# OpenSpec Proposal Command

Create a new OpenSpec change proposal for the GoTo SMS Patient Texting Platform.

## Instructions

When the user invokes `/openspec-proposal <feature-name>`, create a new change proposal:

1. **Create the change folder structure:**
   ```
   openspec/changes/<feature-name>/
   ├── proposal.md    # Why and what we're changing
   ├── tasks.md       # Implementation checklist
   └── specs/         # Spec deltas (what changes in specs)
   ```

2. **Read existing specs** in `openspec/specs/` to understand current state

3. **Generate proposal.md** with:
   - Summary (1-2 sentences)
   - Motivation (current state, problems, desired state)
   - Scope (in scope, out of scope)
   - Success criteria
   - Technical approach
   - Risks & mitigations
   - Estimated effort

4. **Generate tasks.md** with:
   - Numbered task groups by component
   - Checkboxes for each task
   - Include: implementation, testing, documentation, spec updates

5. **Generate spec deltas** if the change modifies existing specs:
   - Use `## ADDED Requirements` for new features
   - Use `## MODIFIED Requirements` for changes
   - Use `## REMOVED Requirements` for deprecations

6. **Consider multi-interface impact:**
   - This project has Python CLI, Python Library, and Google Chat Bot
   - Changes should consider all interfaces where applicable

7. **Run `openspec list`** to confirm the change was created

## Project Context

- Healthcare patient communication system
- GoTo API for SMS
- Google Chat Bot for staff interface
- Google Sheets for logging
- Templates for message consistency

## Example

```
User: /openspec-proposal add-patient-portal-links

AI: I'll create a change proposal for adding patient portal links to SMS messages.

[Creates openspec/changes/add-patient-portal-links/ with proposal.md, tasks.md]

The proposal has been created. Key points:
- Adds secure portal link template
- Includes URL shortening consideration  
- Updates both Python and Apps Script
- Estimated effort: 8-10 hours

Run `openspec show add-patient-portal-links` to review.
```
