# Tasks

## Planning

- [x] Create Beads issues for the hardening epic and four lanes.
- [x] Write approved OpenSpec proposal and delta specs.
- [x] Get oracle plan review and reconcile ordering.

## Lane 1 — Security hotfix

- [x] Add failing auth spoof regression test.
- [x] Add failing strict-Vertex streaming/reasoning fallback regression test.
- [x] Add SSE generic-error regression coverage where practical.
- [x] Fix auth bypass and strict fallback holes.
- [x] Run focused + full backend validation.
- [ ] PR, CI, merge, deploy smoke.

## Lane 3 — Deploy/CI hardening

- [x] Add deploy verification script or equivalent testable check for strict Vertex health.
- [x] Wire script into `scripts/deploy.sh` / Cloud Build path.
- [x] Align CI/deploy docs and gates.
- [ ] PR, CI, merge.

## Lane 2 — Deliberation correctness

- [x] Add label-map aggregation regression test.
- [x] Add ≥7-response curation regression test.
- [x] Add streaming Stage 2 parity and timeout/cache-bound tests.
- [x] Implement label-map fix.
- [x] Implement streaming parity/shared Stage 2.
- [x] Implement score-based curation, timeouts, and cache bounds.
- [ ] PR, CI, merge.

## Lane 4 — Reliability hygiene

- [x] Add webhook SSRF and secret-persistence tests.
- [x] Fix webhook validation, secret persistence, and timezone handling.
- [x] Fix frontend API base and model classification assumptions.
- [x] Fix MCP PID validation and stale-PID safety.
- [x] Clean provider logging/dead paths where tests prove safe.
- [ ] PR, CI, merge.

## Closeout

- [ ] Final full validation.
- [ ] Deploy and PHI-free production smoke if available.
- [ ] Archive OpenSpec change.
- [ ] Close Beads.
- [ ] Push Forgejo and GitHub mirror.
- [ ] Store memory summary.
