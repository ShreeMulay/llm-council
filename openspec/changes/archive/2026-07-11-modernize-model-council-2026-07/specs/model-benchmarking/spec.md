# Delta Spec: Bounded Model Benchmarking

## ADDED Requirements

### Requirement: Benchmark corpus MUST be curated, versioned, bounded, and public/non-PHI

An acceptance benchmark suite MUST contain 60–100 curated prompts, an immutable versioned manifest and checksums, declared task strata and rubrics, and only public/non-PHI, secret-free content.

#### Scenario: Validate suite before execution

GIVEN a benchmark manifest
WHEN preflight validation runs
THEN prompt count MUST be between 60 and 100 inclusive
AND versions, checksums, strata, rubrics, and public/non-PHI attestations MUST be present
AND invalid suites MUST NOT call providers.

### Requirement: Scoring MUST combine objective validators and independent judge families

Objective prompts MUST use deterministic validators. Subjective prompts MUST use blinded, balanced assignments across at least two independent judge families, and a candidate MUST NOT judge its own output.

#### Scenario: Score mixed benchmark

GIVEN objective and subjective benchmark items
WHEN scoring completes
THEN objective scores SHALL reference validator name/version and reproducible inputs
AND subjective reports SHALL separate and aggregate both judge families
AND self-judging assignments SHALL be rejected.

### Requirement: Benchmark artifacts MUST be balanced and resumable

Runs MUST persist append-only per-item attempts, deterministic assignment seeds, completion state, route and plan digests, costs, latency, failures, and scoring versions. Resume MUST execute only missing or explicitly invalidated work and MUST NOT double count attempts.

#### Scenario: Resume interrupted balanced run

GIVEN a partially completed run with valid checksums
WHEN the run resumes
THEN completed valid assignments SHALL be reused
AND only missing assignments SHALL execute
AND final candidate/judge/order exposure SHALL satisfy declared balance tolerances.

### Requirement: Reports MUST include seat-ablation evidence

Benchmark reports MUST compare the full frozen council with removal or replacement of each seat and MUST report quality, diversity, latency, cost, failure rate, uncertainty, and judge agreement by stratum.

#### Scenario: Produce promotion evidence without mutation

GIVEN a completed benchmark and seat-ablation matrix
WHEN the report is finalized
THEN it SHALL identify marginal seat effects and limitations
AND it MAY create lifecycle evidence or a candidate proposal
BUT it MUST NOT modify production lifecycle, roles, registry, or traffic.
