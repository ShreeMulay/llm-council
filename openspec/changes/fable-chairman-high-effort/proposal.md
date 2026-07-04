# Change: Fable Chairman High Effort

Status: APPROVED
Issue: `llm-council-nao`

## Summary

Replace Claude Opus 4.8 with Claude Fable 5 as the default Anthropic council member, compact member, lead evaluator, and chairman.

## Motivation

The operator requested Fable 5 as the production chairman with high reasoning effort after live council smoke testing confirmed the current pipeline works end-to-end.

## Scope

### In scope

- Set `anthropic/claude-fable-5` as the default production council member.
- Set `anthropic/claude-fable-5` as the compact-mode Anthropic member.
- Set `anthropic/claude-fable-5` as the default chairman.
- Set `anthropic/claude-fable-5` as the lead evaluator.
- Send `reasoning_effort="high"` for Fable 5 via OpenRouter.
- Preserve Opus 4.8 alias, fallback, truncation tier, and reasoning-effort compatibility for explicit use.
- Update UI, MCP help, docs, and tests to reflect the new default.
- Preserve safety language: Fable use is non-PHI unless routed through a verified BAA-safe path.

### Out of scope

- Removing Opus 4.8 compatibility.
- Changing the 3-stage council algorithm.
- Changing provider credentials or PHI routing policy.
- Rewriting completed roster-refresh change history.

## Acceptance Criteria

- Default roster includes `anthropic/claude-fable-5` and excludes `anthropic/claude-opus-4.8` unless explicitly requested.
- Compact roster includes `anthropic/claude-fable-5`.
- Default chairman resolves to `anthropic/claude-fable-5`.
- Lead evaluator priority starts with `anthropic/claude-fable-5`.
- Fable reasoning effort resolves to `high`.
- Opus alias resolves to `anthropic/claude-opus-4.8` and remains explicit/backward-compatible.
- Tests, lint, frontend build/test, and MCP typecheck/build pass.
