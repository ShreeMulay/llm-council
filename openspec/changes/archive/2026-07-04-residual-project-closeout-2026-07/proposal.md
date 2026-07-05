# Residual Project Closeout 2026-07

Status: APPROVED

Issue: `llm-council-uca`

## Summary

Close the remaining llm-council project hygiene after codebase hardening:

- Supersede the stale `ci/ai-review-auto` PR with a current branch that adds the org-standard advisory AI review step.
- Archive completed or obsolete OpenSpec change records that were still sitting under `openspec/changes/`.
- Verify, merge, mirror, and clean stale branch state.

## Acceptance Criteria

- Advisory AI review Woodpecker step exists on current `master` and is non-blocking (`failure: ignore`).
- Stale OpenSpec records are moved under `openspec/changes/archive/`.
- The superseded old PR #2 is closed and its stale branch removed after the replacement lands.
- CI passes before merge.
- Forgejo and GitHub mirrors match after closeout.
