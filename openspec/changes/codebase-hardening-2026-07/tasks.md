# Tasks

## Planning

- [x] Create Beads issues for the hardening epic and four lanes.
- [x] Write approved OpenSpec proposal and delta specs.
- [x] Get oracle plan review and reconcile ordering.

## Lane 1 — Security hotfix

- [ ] Add failing auth spoof regression test.
- [ ] Add failing strict-Vertex streaming/reasoning fallback regression test.
- [ ] Add SSE generic-error regression coverage where practical.
- [ ] Fix auth bypass and strict fallback holes.
- [ ] Run focused + full backend validation.
- [ ] PR, CI, merge, deploy smoke.

## Lane 3 — Deploy/CI hardening

- [ ] Add deploy verification script or equivalent testable check for strict Vertex health.
- [ ] Wire script into `scripts/deploy.sh` / Cloud Build path.
- [ ] Align CI/deploy docs and gates.
- [ ] PR, CI, merge.

## Lane 2 — Deliberation correctness

- [ ] Add label-map aggregation regression test.
- [ ] Add ≥7-response curation regression test.
- [ ] Add streaming Stage 2 parity and timeout/cache-bound tests.
- [ ] Implement label-map fix.
- [ ] Implement streaming parity/shared Stage 2.
- [ ] Implement score-based curation, timeouts, and cache bounds.
- [ ] PR, CI, merge.

## Lane 4 — Reliability hygiene

- [ ] Add webhook SSRF and secret-persistence tests.
- [ ] Fix webhook validation, secret persistence, and timezone handling.
- [ ] Fix frontend API base and model classification assumptions.
- [ ] Fix MCP PID validation and stale-PID safety.
- [ ] Clean provider logging/dead paths where tests prove safe.
- [ ] PR, CI, merge.

## Closeout

- [ ] Final full validation.
- [ ] Deploy and PHI-free production smoke if available.
- [ ] Archive OpenSpec change.
- [ ] Close Beads.
- [ ] Push Forgejo and GitHub mirror.
- [ ] Store memory summary.
