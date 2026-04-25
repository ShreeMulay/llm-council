# Proposal: 9-Model Optimized LLM Council

**Status**: APPROVED
**Date**: 2026-04-25
**Author**: LLM Council (synthesized from 5-model deliberation)

## Summary

Expand the LLM Council from 5 to 9 models with an optimized deliberation architecture that replaces naive all-to-all peer review with a specialized evaluator panel, curated synthesis, and tiered truncation.

## Motivation

The current 5-model council uses O(N²) peer review (all models evaluate all others). At 5 models this is manageable. Expanding to 9 models while keeping this pattern would create:
- 81 evaluation calls (9×9) in Stage 2
- 108K characters of context for the chairman in Stage 3
- ~31 second latency per query
- ~$0.034 cost per query

The optimized architecture reduces this to 27 evaluation calls (3 evaluators × 9 responses), 55K characters for the chairman, ~21 second latency, and ~$0.023 cost — while maintaining or improving synthesis quality through specialized evaluator selection.

## New Models

| Model | Provider | Role | Reasoning |
|-------|----------|------|-----------|
| **Kimi K2.6** | Fireworks Direct | Long-Context Specialist | — |
| **DeepSeek V4 Pro** | OpenRouter | Deep Reasoner (Chinese training corpus) | — |
| **Llama 4 Maverick** | OpenRouter | Open-Weights Leader | — |
| **Qwen 3.5 122B A10B** | OpenRouter | Agentic/Tools Expert | — |

## Architecture Changes

### Stage 1: Collect (9 models, parallel)
- All 9 models respond to the query
- Full responses captured (no truncation yet)
- In-memory caching for duplicate model+prompt calls

### Stage 2: Evaluate (3 evaluators, parallel)
- **Evaluator panel**: Opus 4.7, DeepSeek V4 Pro, GPT-5.5-high
- Each evaluator:
  - Sees responses in **randomized order** (different per evaluator)
  - **Excludes their own Stage 1 response** (self-exclusion)
  - Produces rankings + brief evaluation summary
- Cost: 3 evaluation calls instead of 9

### Stage 3: Curate + Synthesize (Chairman)
- **Curation**: Select top 5 responses for chairman:
  - Top 3 by aggregate evaluator score
  - 1 "wildcard": highest disagreement response
  - 1 "diversity" pick: best response from a model not in top 3
- Chairman sees: 5 curated responses + 3 compressed evaluation summaries
- Context: ~55K characters (vs 108K naive)

### Tiered Truncation
- Strong models (Opus, GPT-5.5, DeepSeek): 8K chars
- Medium models (Gemini, Grok, Kimi): 10K chars
- Weaker models (GLM-5.1, Llama 4, Qwen 3.5): 12K chars
- Prevents systematic bias against models that need more tokens

### Dual-Mode GPT-5.5
- Stage 1 (responder): `medium` reasoning — fast, high-quality generalist
- Stage 2 (evaluator): `high` reasoning — deep critical analysis

### --compact Mode
- Core 5 models: GPT-5.5, Opus 4.7, GLM-5.1, Gemini 3.1, Grok 4.20
- Same 3-stage flow but fewer models = faster/cheaper
- Latency: ~14s, Cost: ~$0.014

## Cost & Latency Targets

| Mode | Models | Latency | Cost |
|------|--------|---------|------|
| Full 9 | 9 → 3 eval → top 5 | ~21s | ~$0.023 |
| Compact | 5 → 3 eval → top 3 | ~14s | ~$0.014 |
| Final-only 9 | 9 → chairman directly | ~10s | ~$0.015 |

## Test Strategy

- **Unit tests**: pytest + Hypothesis for fuzz testing ranking parser
- **Integration tests**: respx for mocking all HTTP providers
- **E2E tests**: Real API calls, marked `slow`, run nightly
- **Coverage target**: 85%

## Files Modified

- `pyproject.toml` — add test dependencies
- `backend/config.py` — 9 models, aliases, reasoning map, evaluator priority, truncation tiers
- `backend/fireworks_client.py` — Kimi K2.6 model mapping
- `backend/openrouter.py` — per-call reasoning effort override
- `backend/council.py` — evaluator subset, self-exclusion, randomized order, curation, caching
- `backend/main.py` — `--compact` API parameter
- `AGENTS.md` — updated council table
- `mcp/src/index.ts` — updated model list
- `.github/workflows/test.yml` — new CI test workflow

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Evaluator bias (Western models favor Western answers) | DeepSeek V4 provides Chinese-training perspective; randomize order per evaluator |
| Self-evaluation bias | Exclude evaluators from ranking their own response |
| Minority correct answers filtered out | Wildcard slot preserves high-disagreement responses |
| Truncation harms weaker models | Inverse tiered allocation (weaker models get MORE space) |
| Tail latency from 9 parallel calls | Deadline-based cutoff: proceed with however many respond within timeout |
| Position bias (middle responses ignored) | Randomize response order per evaluator |
