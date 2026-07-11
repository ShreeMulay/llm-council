# Delta Spec: Modernization Deployment and Rollback

## ADDED Requirements

### Requirement: Deployment MUST be staged and digest-pinned

Deployment artifacts MUST pin application, registry, schema, and generated-projection digests and MUST pass validation, parity/drift tests, shadow comparison, and canary acceptance before production rollout.

#### Scenario: Block a failing canary

GIVEN canary route selection, output parity, errors, latency, cost, or frozen-roster checks exceed an approved threshold
WHEN promotion is evaluated
THEN production deployment MUST stop
AND the prior production artifact and registry SHALL remain active.

### Requirement: Rollback MUST atomically restore the frozen baseline

Rollback MUST restore the prior application artifact and matching registry/projection set as one compatible unit while preserving append-only lifecycle, benchmark, monitor, and execution evidence.

#### Scenario: Rehearse rollback

GIVEN a modernization canary is active
WHEN rollback is invoked
THEN health checks and a public/non-PHI council smoke SHALL use the prior pinned digests
AND the frozen nine-seat and compact rosters SHALL be restored
AND no evidence history SHALL be deleted or rewritten.

### Requirement: Acceptance tests MUST prove the modernization contract

Acceptance tests MUST cover registry import safety and frozen roster, lifecycle validation/evidence, dispatcher reuse, immutable plans, sync/stream parity, derived metadata drift, deterministic diversity, bounded/resumable benchmarking and seat ablation, Stage 0 gating/URL/provenance/failure-open/injection safety, monitor deduplication/non-mutation, and deployment rollback.

#### Scenario: Gate production release

GIVEN a release candidate
WHEN the acceptance suite runs
THEN every required contract area SHALL pass with public/non-PHI fixtures
AND any failure MUST block production promotion.
