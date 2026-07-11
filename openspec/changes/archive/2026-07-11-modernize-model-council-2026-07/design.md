# Design: Model Council Modernization

## Design principles

1. **One source, many projections.** A canonical registry is loaded and validated without network, filesystem-write, credential, or environment-dependent side effects. Runtime surfaces consume derived projections.
2. **Identity is not routing.** A stable logical ID identifies a model; each route owns its provider, provider model ID, adapter, capabilities, policy, and priority.
3. **Role is not lifecycle.** `member`, `evaluator`, `chairman`, and seat labels describe execution responsibilities. Lifecycle state describes promotion maturity and never implies a role.
4. **Plan once, execute consistently.** Request normalization, roster curation, route selection, Stage 0 decisions, limits, and stage membership produce an immutable execution plan. Sync, stream, and benchmarks execute that plan through one dispatcher.
5. **Evidence before mutation.** Discovery and monitoring can propose candidates. Only an approved change can update production registry state.

## Canonical registry

The registry SHALL be declarative data validated against a versioned schema. Each model record includes:

- stable `logical_id`, display name, model family, aliases, capabilities, and lifecycle state;
- zero or more role/seat assignments stored separately from lifecycle;
- ordered routes containing `route_id`, provider, provider-specific model ID, adapter, capability overrides, policy classification, and availability requirements;
- evidence references and lifecycle history;
- metadata needed to derive API, frontend, MCP, and benchmark projections.

Loading the registry MUST NOT instantiate clients, inspect credentials, call providers, write caches, or mutate global state. Secrets remain runtime adapter inputs and MUST NOT appear in registry data or derived metadata.

## Frozen baseline

The migration baseline is frozen as:

| Seat | Logical model | Primary route | Roles |
|---|---|---|---|
| 1 | `openai/gpt-5.5` | OpenRouter | member, evaluator |
| 2 | `anthropic/claude-fable-5` | Vertex AI Anthropic | member, evaluator, chairman |
| 3 | `fireworks/glm-5.2` | Fireworks direct | member |
| 4 | `google/gemini-3.1-pro-preview` | OpenRouter | member |
| 5 | `x-ai/grok-4.3` | xAI direct | member |
| 6 | `fireworks/kimi-k2.7-code` | Fireworks direct | member |
| 7 | `deepseek/deepseek-v4-pro` | OpenRouter | member, evaluator |
| 8 | `meta-llama/llama-4-maverick` | OpenRouter | member |
| 9 | `qwen/qwen3.7-max` | OpenRouter | member |

Compact mode remains seats 1–5 in the table. Route-specific provider IDs are explicit registry values and MAY differ from logical IDs. Existing route behavior and aliases remain frozen unless a later approved delta changes them.

## Lifecycle and evidence

Allowed forward states are `discovered`, `probed`, `benchmark`, `shadow`, `canary`, `production`, and `retired`. A transition service validates adjacent transitions and persists an append-only event containing actor, timestamps, from/to states, registry version, evidence references, decision, and reason. Retirement MAY occur from any non-retired state with evidence. Re-entry from `retired` requires a new candidate/version and starts at `discovered`.

Evidence is immutable, content-addressed, schema-versioned, attributable, timestamped, and public/non-PHI. Probes capture route compatibility; benchmarks capture suite and scoring versions; shadow/canary evidence captures traffic scope, quality, errors, latency, and cost; production evidence references explicit approval and rollback coordinates.

## Execution architecture

An execution planner receives a registry snapshot and normalized request, applies deterministic roster/seat curation, selects routes, records fallback policy, and emits a deeply immutable plan with a stable digest. The provider-neutral dispatcher accepts only plan operations and normalized messages and returns normalized events/results. Provider adapters translate at the boundary.

Streaming is a projection of the same normalized event stream used to assemble synchronous results. Event ordering, terminal status, usage, errors, selected routes, and final semantic content MUST agree, excluding transport timing/chunk boundaries. Benchmarks call the same dispatcher with benchmark policy that disables silent fallback unless explicitly declared by the suite.

## Derived projections and drift prevention

Build-time generators derive backend constants, `/api/models` data, frontend labels/options, MCP schema/descriptions, and benchmark model selectors from one validated registry snapshot. Generated files carry registry schema/version/digest. CI regenerates into a temporary location and fails on diff, unknown logical IDs, duplicate aliases/routes, or hard-coded roster metadata outside approved generated boundaries.

## Diversity curation

Curation uses declared seat requirements and registry metadata, never model-name substring guesses. A stable algorithm orders candidates by eligibility, lifecycle, benchmark score, declared priority, then logical ID. It enforces configured maximums per family and provider and required distinct families/providers where the eligible pool permits. If constraints cannot be met, planning fails with a structured explanation rather than silently relaxing them.

## Benchmark design

Each benchmark suite has a semantic version, immutable manifest, checksums, rubric versions, and 60–100 curated public/non-PHI prompts distributed across declared task strata. Objective tasks use deterministic validators. Subjective tasks use blinded, balanced assignments across at least two independent judge families; no candidate judges its own answer. Runs persist append-only per-item artifacts, deterministic assignment seeds, attempt IDs, completion state, costs, latency, validator/judge versions, and checksums so interruption resumes missing work without double counting.

Reports include strata, uncertainty, failures, cost/latency, inter-judge agreement, and seat-ablation results comparing the full council against removing/replacing each seat. Benchmark output is evidence, not authority to mutate production.

## Parallel Search Stage 0

Stage 0 has three modes: disabled, explicitly requested, or classifier-gated opt-in. Explicit URL inputs preserve direct URL fetch semantics and are never rewritten into broad search. The planner records the gating reason, query/URL, limits, and policy. Search/fetch is bounded by request count, result count, bytes, time, and spend; emits URL/title/retrieval timestamp/source identifiers; deduplicates canonical URLs; and excludes unsafe schemes/private targets.

Fetched text is untrusted evidence, not instructions. It is isolated from system/developer instructions, size-limited, labeled with provenance, and scanned/escaped according to injection policy. Stage 0 failures, cap exhaustion, or classifier uncertainty fail open to the original council query with a structured warning; they do not fail the council request.

## Parallel Monitor

The monitor ingests versioned discovery events, normalizes identity, and deduplicates by event ID plus provider/model/version fingerprint. It emits a persisted candidate proposal containing logical-ID suggestion, routes, source provenance, capabilities, suspected family, observed release/version, confidence, conflicts, and required next probe. It MUST NOT edit registry files, lifecycle state, roles, deployment configuration, or production traffic.

## Deployment and rollback

Deployment proceeds through validation, local parity/drift tests, shadow comparison, canary, and production gates. Artifacts pin registry and generator digests. Rollback atomically restores the prior application artifact and frozen registry/projection set; lifecycle and execution evidence remain append-only. Acceptance checks cover import safety, frozen roster, route equivalence, parity, metadata drift, lifecycle rejection, diversity determinism, Stage 0 safety/failure-open behavior, monitor non-mutation, and rollback rehearsal.
