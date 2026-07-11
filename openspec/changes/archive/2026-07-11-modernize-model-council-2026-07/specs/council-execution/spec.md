# Delta Spec: Provider-Neutral Council Execution

## ADDED Requirements

### Requirement: All execution modes MUST use one provider-neutral dispatcher

Synchronous council, streaming council, and benchmark execution MUST invoke the same dispatcher and provider adapter contracts; mode-specific provider routing logic MUST NOT exist.

#### Scenario: Dispatch all modes consistently

GIVEN sync, stream, and benchmark requests select the same logical model and route policy
WHEN each request is planned
THEN each SHALL produce the same route and normalized provider request
AND each SHALL execute through the same dispatcher interface.

### Requirement: Execution plans MUST be immutable

The planner MUST resolve registry version, roster, roles, routes, fallbacks, Stage 0 decision, limits, and stage operations before dispatch and MUST emit a deeply immutable, digestible plan.

#### Scenario: Prevent mid-flight mutation

GIVEN an execution plan has been created
WHEN registry configuration or caller-owned request collections change during execution
THEN the in-flight plan and its digest SHALL remain unchanged
AND execution SHALL use only values captured in the plan.

### Requirement: Streaming and synchronous results MUST have semantic parity

Sync and stream execution of the same plan MUST agree on selected models/routes, stage outcomes, normalized errors, usage totals, terminal status, and final semantic content; chunk boundaries and timing MAY differ.

#### Scenario: Reassemble stream into sync result

GIVEN deterministic adapter responses and one execution plan
WHEN the plan runs through sync and streaming transports
THEN folding normalized stream events SHALL equal the normalized sync result
AND both SHALL reference the same plan digest.

### Requirement: Curation MUST enforce deterministic diversity

Roster and Stage 3 curation MUST use declared family, provider, and seat metadata with stable tie-breaking and MUST NOT infer diversity from display names.

#### Scenario: Repeat curation deterministically

GIVEN the same eligible candidates, scores, seat requirements, and registry version in different input orders
WHEN curation runs
THEN the selected ordered roster SHALL be identical
AND configured family/provider maximums and required distinct counts SHALL be satisfied where possible.

#### Scenario: Reject unsatisfied seat constraints

GIVEN the eligible pool cannot satisfy a required seat or diversity constraint
WHEN the plan is built
THEN planning SHALL fail with machine-readable violated constraints
AND constraints MUST NOT be silently relaxed.
