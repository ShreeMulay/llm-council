# Codebase Hardening 2026-07

Status: APPROVED

## Why

The July 2026 code review found two critical production risks and several high-value correctness/reliability gaps:

- API key auth can be bypassed by spoofing `X-Forwarded-For` into the Tailscale allowlist.
- The streaming council path can fall Claude Fable 5 back to OpenRouter even when `REQUIRE_VERTEX_ANTHROPIC=true`.
- Streaming deliberation and aggregate rankings have drifted from the documented Stage 2 design.
- Deploy verification must prove the Vertex Anthropic gate is present before production is considered safe.
- Webhook, frontend, MCP, cache, logging, and timezone hygiene need hardening.

## What Changes

### Lane 1 — Security hotfix

- Disable or harden Tailscale allowlist bypass for Cloud Run/public proxy ingress.
- Enforce Vertex-only Fable behavior on all query helper paths when `REQUIRE_VERTEX_ANTHROPIC=true`.
- Emit generic SSE errors to clients and keep raw exception details server-side only.
- Validate webhook callback URLs before paid council execution where practical.

### Lane 3 — Deploy/CI hardening

- Ensure deploy scripts and Cloud Build configuration consistently set and verify `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, and `REQUIRE_VERTEX_ANTHROPIC=true`.
- Add a post-deploy health assertion that fails if Vertex Anthropic strict mode is absent.

### Lane 2 — Deliberation correctness

- Aggregate evaluator rankings using each evaluator's actual label-to-model mapping.
- Bring streaming Stage 2 into parity with sync Stage 2: configured evaluators, self-exclusion, randomized labels, truncation.
- Replace length-based response curation with aggregate-rank consensus plus wildcard/diversity selection.
- Add bounded Stage 1 cache eviction and bounded model-call timeouts.

### Lane 4 — Reliability hygiene

- Harden webhook persistence and time handling.
- Fix frontend model metadata/API base assumptions.
- Fix MCP PID validation under ESM and avoid unsafe stale PID termination.
- Remove or quarantine demonstrably dead risky provider paths and improve logging hygiene.

## Non-Goals

- No model roster changes.
- No change to the user-facing council API contract except safer error payloads.
- No PHI or real patient-data smoke tests.

## Validation

- TDD/regression tests for critical security and deliberation paths.
- Full backend test suite and ruff.
- Frontend tests/build and MCP typecheck/build where touched.
- Forgejo PR CI on every lane.
- Production or staging deploy smoke, including `/health` strict Vertex assertion, when deploy is available.
