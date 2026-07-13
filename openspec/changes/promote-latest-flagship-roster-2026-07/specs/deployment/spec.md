# Deployment Delta

## ADDED Requirements

### Requirement: Evidence-backed latest-roster rollout

Production SHALL only receive the promoted roster through pinned, observable, reversible stages.

#### Scenario: Promote reviewed artifact

- **GIVEN** full local validation, exact-route probes, paired benchmarks, and Forgejo CI pass
- **WHEN** the release is deployed
- **THEN** the image, registry, and projection digests are pinned
- **AND** zero-traffic shadow checks run before canary traffic
- **AND** canary progresses through 10% and 50% before 100%
- **AND** the prior image/registry remains available for rollback

#### Scenario: Verify immutable promotion evidence before rollout mutation

- **GIVEN** the committed 52-case representative live benchmark hard-gates its evidenced quality, factual-error, objective, evaluator-format, route, latency, and cost thresholds
- **WHEN** a rollout is requested
- **THEN** the verifier MUST validate its pinned hashes, exact run and registry identity, no-fallback policy, completeness, and every passing threshold outcome before service describe, snapshot, deploy, or traffic mutation
- **AND** missing, stale, mismatched, incomplete, or failing benchmark evidence MUST stop the rollout

#### Scenario: Run paired synthetic shadow canary

- **GIVEN** exact prior-service and shadow-candidate URLs and strict shadow health
- **WHEN** synthetic canary evidence is collected prospectively
- **THEN** sync and stream each MUST run one verified warmup per URL followed by exactly five measured pairs ordered `AB, BA, AB, BA, AB`
- **AND** warmup latency and cost MUST be recorded separately and excluded from measured aggregates
- **AND** any fixed deployment instruction/objective mismatch, factual error, evaluator-format failure, schema violation, explicit error, fallback, route mismatch, policy violation, usage/pricing violation, or absolute latency/token/cost violation by the candidate MUST hard-fail regardless of the immutable benchmark outcome
- **AND** paired steady-state latency and list-cost ratios MUST be emitted as explicit diagnostic statuses and MUST NOT replace the representative benchmark's relative promotion gates
- **AND** later 10%, restarted 10%, 50%, and 100% checks MUST retain strict candidate and absolute gates without reapplying baseline-relative synthetic gates
- **AND** evidence MUST remain content-free and distinguish `promotion_gate`, `cold_gate`, `hard_canary_gate`, and steady-canary diagnostics
- **AND** these artifacts MUST NOT claim comprehensive safety evaluation

#### Scenario: Complete shared-checkout landing

- **GIVEN** Forgejo has merged and GitHub has mirrored the release
- **WHEN** completion is claimed
- **THEN** the user's shared checkout matches the authoritative remote
- **AND** generated registry files and promoted IDs exist in that checkout
- **AND** validation has run from the shared checkout
