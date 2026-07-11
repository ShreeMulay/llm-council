# Delta Spec: Conditional Parallel Intelligence

## ADDED Requirements

### Requirement: Parallel Search Stage 0 MUST be conditional and preserve explicit URL fetch

Stage 0 MUST run only when explicitly requested or when an enabled classifier satisfies its configured threshold. Explicit URLs MUST retain direct fetch semantics and MUST NOT be converted into broad search queries.

#### Scenario: Skip Stage 0 by default

GIVEN Stage 0 was not requested and classifier opt-in is disabled or below threshold
WHEN an execution plan is created
THEN no Parallel call SHALL be planned
AND the original council query SHALL proceed unchanged.

#### Scenario: Fetch explicit URL

GIVEN the caller explicitly supplies an allowed public HTTP(S) URL
WHEN Stage 0 is planned
THEN the exact URL SHALL be fetched subject to safety redirects and caps
AND broad search SHALL NOT replace the fetch
AND provenance SHALL identify the requested and final canonical URLs.

### Requirement: Stage 0 MUST be bounded, provenance-preserving, injection-safe, and failure-open

Stage 0 MUST enforce request, result, byte, time, and spend caps; attach source identifiers, canonical URLs, titles, and retrieval timestamps; treat fetched content as untrusted data; and isolate it from instructions.

#### Scenario: Handle injection content

GIVEN fetched text contains instructions to override system policy or expose secrets
WHEN evidence is prepared for council use
THEN the text SHALL remain labeled untrusted evidence
AND it MUST NOT alter execution instructions, tools, routes, limits, or safety policy.

#### Scenario: Fail open on retrieval error or cap

GIVEN search/fetch fails, times out, exceeds a cap, or returns no safe evidence
WHEN Stage 0 completes
THEN the original council query SHALL continue without retrieved context
AND a structured non-sensitive warning and provenance status SHALL be emitted.

### Requirement: Parallel Monitor MUST emit proposals only

The monitor MUST validate versioned discovery events, deduplicate by event ID and provider/model/version fingerprint, and emit candidate proposal records. It MUST NOT mutate canonical registry, lifecycle state, roles, routes, deployment configuration, or production traffic.

#### Scenario: Deduplicate discovery events

GIVEN repeated events describe the same provider, model, and version
WHEN monitor ingestion runs
THEN one candidate proposal SHALL be retained with merged provenance
AND retries SHALL be idempotent.

#### Scenario: Propose candidate without promotion

GIVEN a novel valid discovery event
WHEN monitor processing succeeds
THEN output SHALL include a candidate logical-ID suggestion, routes, provenance, capabilities, family, release/version, confidence, conflicts, and required probe
AND production configuration and lifecycle history SHALL remain byte-for-byte unchanged.
