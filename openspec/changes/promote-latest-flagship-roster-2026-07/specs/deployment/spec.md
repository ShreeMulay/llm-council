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

#### Scenario: Complete shared-checkout landing

- **GIVEN** Forgejo has merged and GitHub has mirrored the release
- **WHEN** completion is claimed
- **THEN** the user's shared checkout matches the authoritative remote
- **AND** generated registry files and promoted IDs exist in that checkout
- **AND** validation has run from the shared checkout
