# Refresh LLM Council GLM and Qwen Roster

Status: APPROVED

Issue: `llm-council-tnr`

## Summary

Refresh the stale GLM and Qwen council slots while preserving the current Anthropic chairman decision.

## Motivation

The live 9-model council is mostly current, but model availability review on 2026-06-16 found two stale slots:

- GLM: production uses `fireworks/glm-5.1`; OpenRouter now lists `z-ai/glm-5.2`.
- Qwen: production uses `qwen/qwen3.5-122b-a10b`; OpenRouter now lists `qwen/qwen3.7-max` and `qwen/qwen3.7-plus`.

Claude Fable 5 is also available as a newer Anthropic model, but this change SHALL NOT replace Opus 4.8 as chairman without a separate challenger benchmark because that would reduce current provider diversity and alter chairman behavior.

## Scope

### In scope

- Replace the default GLM slot with `z-ai/glm-5.2`.
- Replace the default Qwen slot with `qwen/qwen3.7-max`.
- Update compact-mode roster to use GLM 5.2.
- Update aliases, fallback maps, model tiers, UI/MCP metadata, and docs for the new roster.
- Keep backward-compatible aliases/mappings for prior GLM/Qwen IDs where practical.
- Add tests proving the roster, aliases, and metadata match the new contract.
- Deploy and verify Cloud Run `/health` and a compact council smoke test.

### Out of scope

- Replacing Opus 4.8 chairman with Claude Fable 5.
- Adding a tenth permanent council member.
- Changing the 3-stage deliberation algorithm.
- Editing archived OpenSpec changes.

## Risks

- GLM 5.2 routes via OpenRouter rather than Fireworks direct, which may be slower or differently priced than Fireworks GLM 5.1.
- Provider-specific response formatting may differ from Fireworks GLM responses.
- Qwen 3.7 Max may have different latency/cost behavior than Qwen 3.5 122B.

## Acceptance Criteria

- `backend/config.py` default roster includes `z-ai/glm-5.2` and `qwen/qwen3.7-max`.
- Compact roster includes `z-ai/glm-5.2`.
- `glm` alias resolves to `z-ai/glm-5.2`; `qwen` alias resolves to `qwen/qwen3.7-max`.
- Backward compatibility keeps old GLM/Qwen IDs usable as explicit model IDs or documented legacy references.
- MCP and frontend model metadata display GLM 5.2 and Qwen 3.7 Max.
- Tests, lint, frontend build/test, and MCP typecheck/build pass.
- Deployed `/health` reports the refreshed roster and Opus 4.8 chairman.
- A compact smoke test succeeds against the deployed service.
