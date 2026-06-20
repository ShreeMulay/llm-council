# Internal Model Benchmark Harness

Status: APPROVED

Issue: `llm-council-fwy`

## Summary

Add an internal, PHI-free model benchmark harness that compares GLM-5.2, GPT-5.5 effort levels, Opus 4.8 xhigh, and probe-gated Opus 4.8 max on raw side-by-side outputs, automated judge scores, latency, token usage, reliability, and estimated cost.

## Motivation

GLM-5.2 is receiving strong external signal and is available to the user through Fireworks AI. The project currently supports a deliberation council, but it does not provide a reproducible benchmark workflow for comparing model outputs, cost, and speed across fixed internal prompts. A durable benchmark artifact in Forgejo will make model-selection decisions reviewable and repeatable.

## Scope

### In scope

- Define benchmark model variants for:
  - Fireworks GLM-5.2 default.
  - GPT-5.5 medium reasoning effort via OpenRouter.
  - GPT-5.5 high reasoning effort via OpenRouter.
  - GPT-5.5 xhigh reasoning effort via OpenRouter, only if a probe validates support.
  - Claude Opus 4.8 xhigh reasoning effort via OpenRouter as the supported Opus comparand.
  - Claude Opus 4.8 max reasoning effort via OpenRouter, only if a probe validates support; otherwise record as blocked.
- Add a PHI-free prompt suite covering different task kinds.
- Add a CLI/module that can run benchmarks in mock/dry-run mode and live mode.
- Keep benchmark execution CLI/module-only; no public or authenticated API endpoint SHALL be added for paid benchmark execution.
- Persist Forgejo-reviewable artifacts under `benchmarks/runs/<run-id>/`:
  - `summary.md`
  - `side-by-side.md`
  - `metrics.csv`
  - `judge-scores.csv`
  - `raw-results.jsonl`
  - `config.json`
- Compute latency, output tokens/second, token usage, estimated list cost, errors, and retry/fallback status.
- Support automated blind judge scoring while preserving raw side-by-side outputs for human review.
- Add budget guardrails and fail closed if projected or observed spend exceeds the configured cap.
- Add tests for variant expansion, pricing/cost math, persistence, report generation, judge scoring payloads, and budget guard behavior.
- Disable silent provider fallback in benchmark calls so unsupported reasoning efforts surface as blocked/skipped records.
- Snapshot pricing provenance in each run artifact set.
- Provide deterministic mock mode via injected clock/run ID/latency/token counts.
- Guard committed artifacts against secret/API-key leakage.

### Out of scope

- Replacing the production council roster.
- Adding benchmark endpoints to the public API.
- Running benchmarks on PHI, patient records, screenshots, or clinical source data.
- Silent provider fallbacks in benchmark mode.
- Committing secrets or provider API keys.
- Adding a paid benchmark trigger to the public API.

## Risks

- Fireworks may expose GLM-5.2 under a native path different from public router IDs.
- Some reasoning effort settings may be rejected or ignored by providers; GPT-5.5 xhigh and Opus 4.8 max SHALL be probe-gated before live benchmark inclusion. Opus 4.8 xhigh is retained as the OpenRouter-supported Opus comparand when max is blocked.
- Automated judges can be biased; raw side-by-side outputs remain the primary review artifact.
- Benchmark artifacts can become large if future suites use long-context prompts.

## Acceptance Criteria

- A benchmark command can run in mock mode without network calls and generate all expected artifacts.
- Benchmark artifacts are deterministic enough for tests and readable in Forgejo.
- The default prompt suite contains only PHI-free prompts across multiple task categories.
- Model variant configuration supports GPT-5.5 medium/high, probe-gated GPT-5.5 xhigh, Opus 4.8 xhigh, and probe-gated Opus 4.8 max through OpenRouter reasoning-effort fields.
- GLM-5.2 Fireworks routing is represented explicitly and does not silently downgrade to another GLM model.
- Unsupported model settings are recorded as skipped/blocked rather than silently changed.
- Benchmark OpenRouter calls can disable provider fallbacks, and tests prove no-fallback behavior is requested in benchmark mode.
- `config.json` records pricing source, pricing timestamp, and price values used for cost math.
- Fixed-seed mock runs can produce stable artifacts for tests.
- Artifact-writing tests assert common API-key/secret patterns are not emitted.
- Budget cap enforcement is covered by tests.
- `uv run ruff check .` and `uv run pytest -q` pass.
- Forgejo PR passes CI before merge.
