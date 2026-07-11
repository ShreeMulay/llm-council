# Modernize Model Council Control Plane and Execution

Status: APPROVED

Issue: `llm-council-s0h`

## Summary

Replace duplicated model configuration and routing behavior with a declarative, side-effect-free canonical registry, an evidence-backed model lifecycle, and one provider-neutral execution path. Harden roster curation, benchmarking, optional Parallel Search Stage 0, and a proposal-only Parallel Monitor without changing the frozen production roster during this change.

## Motivation

Model identity, provider routing, roles, API metadata, frontend metadata, MCP descriptions, benchmarks, and lifecycle decisions currently risk diverging. A single contract is needed so roster changes are deterministic, benchmark-backed, reviewable, reversible, and incapable of silently mutating production.

## Scope

### In scope

- A declarative, import-safe canonical registry with stable logical model IDs and route-specific provider IDs.
- A frozen snapshot of the current nine-seat production roster and compact roster.
- Role assignment independent of lifecycle state.
- A validated `discovered → probed → benchmark → shadow → canary → production → retired` lifecycle with persisted evidence.
- One provider-neutral dispatcher shared by synchronous, streaming, and benchmark execution.
- Immutable execution plans and semantic parity between synchronous and streaming execution.
- Registry-derived backend, API, frontend, and MCP metadata with drift tests.
- Deterministic family, provider, and seat-diversity curation.
- A bounded, versioned benchmark corpus of 60–100 curated public/non-PHI prompts, objective validators, two independent judge families for subjective scoring, balanced/resumable artifacts, and seat-ablation analysis.
- Conditional Parallel Search Stage 0 with explicit URL fetch preservation, opt-in or classifier gating, provenance, resource caps, failure-open behavior, and prompt-injection defenses.
- A Parallel Monitor event and output contract that deduplicates discoveries and emits candidate proposals only.
- Deployment, rollback, and acceptance-test requirements.
- Deletion of obsolete root `TASK.md`, superseded by this approved change and Bead `llm-council-s0h`.

### Out of scope

- Product-code or test implementation in this change-authoring task.
- Any production roster, chairman, evaluator, route, or alias mutation.
- Automatic promotion or production mutation by discovery, benchmarks, or Parallel Monitor.
- PHI, patient identifiers, secrets, raw clinical content, or approval of any PHI processing route.
- General web research providers other than the conditional Parallel capabilities defined here.

## Safety boundary

All prompts, search queries, fetched pages, benchmark artifacts, monitor events, logs, and model outputs governed by this change MUST be public/non-PHI and MUST NOT contain secrets. Fetched content and provider/model output MUST be treated as untrusted data.

## Acceptance Criteria

- The canonical registry is side-effect-free, schema-validated, deterministic, and preserves stable logical IDs across route changes.
- The exact current production and compact rosters remain frozen until a separately approved, evidence-backed change promotes a candidate.
- Invalid lifecycle transitions fail closed and every accepted transition references persisted evidence.
- Sync, stream, and benchmark modes execute the same immutable plan through one dispatcher and satisfy parity tests.
- Backend, API, frontend, and MCP metadata are generated from the registry and drift checks fail on hand-maintained divergence.
- Curation is deterministic and enforces declared family, provider, and seat-diversity constraints.
- Benchmark acceptance proves corpus bounds/versioning, objective validation, two-family subjective judging, balance, resume safety, and seat ablation.
- Parallel Search Stage 0 is conditional, bounded, provenance-preserving, injection-safe, and failure-open; explicit URL fetch behavior remains available.
- Parallel Monitor only creates deduplicated candidate proposals and cannot mutate production configuration.
- Deployment includes staged rollout, observable acceptance gates, and a tested rollback to the frozen registry/artifact version.
- Root `TASK.md` is absent and explicitly superseded by this change.

## Risks

- Registry migration could alter provider payloads despite stable logical identities; golden plan and parity tests mitigate this.
- Search content can contain prompt injection or unreliable claims; strict data/instruction separation, provenance, caps, and failure-open behavior mitigate this.
- Automated judges can share bias; two judge families, objective validators, balanced assignments, and seat ablation reduce correlated error.
- Lifecycle evidence can become stale; evidence schemas include timestamps, versions, provenance, and expiry policy.
