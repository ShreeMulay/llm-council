# Upgrade Council Opus 4.7 → 4.8

## Overview

Upgrade the LLM Council's chairman and lead evaluator model from Claude Opus 4.7 to Claude Opus 4.8. Opus 4.8 is already configured as a valid model in the OpenCode provider config (`anthropic/claude-opus-4.8` on OpenRouter, `claude-opus-4-8` on Vertex BAA).

## Validation: reasoning_effort

Empirically tested against the live OpenRouter API (2026-05-29) for `anthropic/claude-opus-4.8`:

| Parameter | Result |
|-----------|--------|
| `reasoning_effort=high` | Accepted; enables thinking (reasoning_tokens > 0) |
| `reasoning_effort=xhigh` | Accepted; enables thinking (reasoning_tokens > 0); no API error |
| `verbosity=xhigh` alone | Does NOT enable reasoning (reasoning_tokens = 0) |

Supported effort levels: `low → medium → high (default) → xhigh → max`.

**Decision:** Keep `reasoning_effort = "xhigh"` for Opus 4.8. It is validated working via the existing `reasoning_effort` code path and is Anthropic's recommended level for coding/agentic synthesis. Significance: higher effort = more internal reasoning = stronger synthesis on hard problems, at higher latency/cost; `max` is the ceiling with diminishing returns.

## Changes

### Backend (functional)

- `config.py`:
  - `DEFAULT_COUNCIL_MODELS`: `anthropic/claude-opus-4.7` → `anthropic/claude-opus-4.8`
  - `COMPACT_COUNCIL_MODELS`: same
  - `DEFAULT_CHAIRMAN_MODEL`: `anthropic/claude-opus-4.8`
  - `OPENROUTER_FALLBACK_MAP`: add `anthropic/claude-opus-4.8` → `anthropic/claude-opus-4.8`; keep 4.7 entry for backward compat
  - `MODEL_ALIASES["opus"]`: → `anthropic/claude-opus-4.8`
  - `EVALUATOR_PRIORITY[0]`: → `anthropic/claude-opus-4.8`
  - `TIERED_TRUNCATION["strong"]`: → `anthropic/claude-opus-4.8`
  - `MODEL_REASONING_EFFORT`: add `anthropic/claude-opus-4.8: "xhigh"`; keep 4.7 entry
  - Comments referencing 4.7 → 4.8
- `anthropic_client.py`:
  - Add `anthropic/claude-opus-4.8` → `claude-opus-4-8` and `claude-opus-4.8` → `claude-opus-4-8`; keep 4.7/4.6/4.5 entries for backward compatibility

### Backend (display/interface text)

- `opencode_integration.py`: tool description, alias help, MCP schema description → Opus 4.8
- `mcp/src/index.ts`: tool description strings → Opus 4.8 (rebuild `dist/`)

### Frontend

- `api.js`: `MODEL_INFO.opus.modelId` → `anthropic/claude-opus-4.8`, `name` → `Claude Opus 4.8`
- `components/ChatInterface.jsx`: roster display name → Claude Opus 4.8

### Tests (TDD)

- `tests/test_config.py`: alias, reasoning effort, evaluator priority, truncation, default council membership; rename `test_includes_opus_4_7` → `test_includes_opus_4_8`
- `tests/test_council_unit.py`, `tests/test_council_integration.py`, `tests/test_api.py`: update expected model IDs to 4.8

### Docs

- `AGENTS.md`, `LLM_COUNCIL_OVERVIEW.md`, `openspec/project.md`, `openspec/specs/council-deliberation/spec.md`, `openspec/specs/opencode-integration/spec.md`, `openspec/changes/model-selection-auth-fix.md`

### Out of scope

- `openspec/changes/archive/**` — historical records, left unchanged.
- Backward-compat 4.7/4.6/4.5 mappings retained so previously stored conversations still resolve.

## Acceptance Criteria

- [ ] Default council + chairman use `anthropic/claude-opus-4.8`.
- [ ] `opus` alias resolves to 4.8.
- [ ] Reasoning effort `xhigh` configured and validated for 4.8.
- [ ] Anthropic client maps 4.8 → `claude-opus-4-8`; 4.7/4.6/4.5 still mapped.
- [ ] All tests pass (ruff + pytest + frontend lint/build + MCP build).
- [ ] Cloud Run redeployed; `/health` reports chairman = `anthropic/claude-opus-4.8`.
- [ ] Pushed to Forgejo + GitHub.

## Related Issue

- `llm-council-6er` — Upgrade council Opus 4.7 to 4.8 (chairman+evaluator)
