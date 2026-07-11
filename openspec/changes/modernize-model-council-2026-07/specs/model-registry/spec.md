# Delta Spec: Canonical Model Registry and Lifecycle

## ADDED Requirements

### Requirement: Canonical registry MUST be declarative and side-effect-free

The system MUST define models in one schema-validated canonical registry and MUST preserve stable logical IDs independently from route-specific provider IDs.

#### Scenario: Import registry safely

GIVEN no provider credentials and network access is denied
WHEN registry modules are imported and validated
THEN no client SHALL be instantiated, no network request SHALL occur, and no file SHALL be written
AND validation SHALL return the same ordered registry and digest for identical input.

#### Scenario: Change route without changing identity

GIVEN a model has a stable `logical_id` and two provider routes
WHEN the preferred route changes
THEN API and historical evidence identity SHALL retain the logical ID
AND dispatch SHALL use the selected route's provider-specific model ID.

### Requirement: Production roster MUST remain frozen during modernization

The production roster MUST remain the nine logical IDs listed in `design.md`, with Claude Fable 5 as chairman and seats 1–5 as compact mode, until a separate approved change is accepted.

#### Scenario: Validate frozen baseline

GIVEN the modernization registry is loaded
WHEN production and compact projections are generated
THEN production SHALL contain the frozen nine seats in order
AND compact SHALL contain frozen seats 1–5
AND no discovered, shadow, canary, or retired candidate SHALL be included.

### Requirement: Roles MUST be independent from lifecycle

Role and seat assignments MUST be represented separately from lifecycle state and changing either MUST NOT implicitly change the other.

#### Scenario: Promote lifecycle without assigning a role

GIVEN a candidate has no council role and valid evidence for a lifecycle transition
WHEN it advances from `benchmark` to `shadow`
THEN its roles SHALL remain unchanged
AND it SHALL NOT enter an execution roster.

### Requirement: Lifecycle transitions MUST be validated and evidence-backed

The system MUST enforce `discovered → probed → benchmark → shadow → canary → production → retired`, MUST reject skipped or reversed transitions, and MUST persist append-only evidence for every accepted transition. Retirement MAY occur from any active state with evidence.

#### Scenario: Accept adjacent transition with evidence

GIVEN a `probed` candidate and valid versioned benchmark evidence
WHEN an authorized actor requests transition to `benchmark`
THEN the transition SHALL be persisted with actor, time, versions, reason, and evidence references
AND prior events SHALL remain immutable.

#### Scenario: Reject unsupported promotion

GIVEN a `discovered` candidate
WHEN transition directly to `production` is requested
THEN validation MUST fail closed
AND registry, roles, routes, and production traffic MUST remain unchanged.

#### Scenario: Reconsider retired model

GIVEN a model version is `retired`
WHEN new availability is discovered
THEN a new candidate/version SHALL begin at `discovered`
AND retired history MUST NOT be rewritten.

### Requirement: Surface metadata MUST be derived and drift-checked

Backend configuration, API model metadata, frontend model metadata, MCP schema/descriptions, and benchmark selectors MUST be generated from the validated registry.

#### Scenario: Detect derived metadata drift

GIVEN a registry snapshot and committed generated projections
WHEN CI regenerates all projections
THEN any diff, unknown logical ID, duplicate alias, duplicate route ID, or digest mismatch MUST fail validation
AND no production deployment SHALL proceed.
