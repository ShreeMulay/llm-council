# Promote Latest Flagship Council Roster

Status: APPROVED

Issue: `llm-council-465`

## Summary

Promote GPT-5.6 Sol and Grok 4.5 into the production, compact, and evaluator rosters while preserving the latest top-capability callable model in every existing family. Retain explicit legacy IDs, refresh challenger metadata, separate declared route failover from OpenRouter provider substitution, and deploy through evidence-backed shadow, canary, rollback, and production gates.

## Motivation

The production roster was intentionally frozen while GPT-5.6 Sol and Grok 4.5 remained challengers. First-party and provider catalogs now identify them as the current callable flagships for their families. The other seven production seats already use their latest applicable top-capability models. A reviewed registry mutation is required because model identity, aliases, roles, routes, generated consumers, benchmarks, and deployment checks must change atomically.

## Scope

### In scope

- Replace production/evaluator GPT-5.5 with `openai/gpt-5.6-sol`.
- Replace production Grok 4.3 with `x-ai/grok-4.5` using direct xAI primary and exact OpenRouter fallback.
- Preserve Claude Fable 5, GLM-5.2, Gemini 3.1 Pro Preview, Kimi K2.7 Code, DeepSeek V4 Pro, Llama 4 Maverick, and Qwen 3.7 Max.
- Keep Fable strict Vertex-only behavior in covered production deployments.
- Move `gpt` and `grok` aliases to the promoted IDs while keeping explicit old IDs callable as legacy compatibility records.
- Separate declared registry-route failover from OpenRouter's upstream-provider substitution control.
- Refresh challengers for Gemini 3.5 Flash, GPT-5.6 Terra/Luna, Claude Sonnet 5/Opus 4.8, MiniMax M3, Mistral Medium 3.5, Llama 4 Scout, Qwen 3.7 Plus, and current speed variants.
- Regenerate backend, frontend, and MCP projections and remove remaining manually duplicated roster metadata.
- Update benchmark variants, pricing, docs, health/deployment gates, and hard-coded exceptional model references.
- Run public/non-PHI no-fallback probes and the immutable benchmark, then one manually owned, bounded five-call shadow/canary/rollback rollout, production verification, Forgejo/GitHub landing, and shared-checkout reconciliation.

### Out of scope

- Replacing Gemini Pro with Gemini Flash solely because Flash has a newer release date.
- Replacing quality-tier DeepSeek Pro, Qwen Max, or Llama Maverick with lower-cost/speed siblings.
- Sending PHI, secrets, raw prompts, or model responses to telemetry or unapproved routes.
- Silently redirecting explicit historical model IDs to different models.

## Acceptance criteria

- The production roster SHALL contain GPT-5.6 Sol and Grok 4.5 in the prior GPT/Grok seats and SHALL preserve the other seven seats.
- Compact mode SHALL use GPT-5.6 Sol, Fable 5, GLM-5.2, Gemini 3.1 Pro Preview, and Grok 4.5.
- Evaluators SHALL be Fable 5, DeepSeek V4 Pro, and GPT-5.6 Sol; Fable SHALL remain chairman.
- `gpt` and `grok` SHALL resolve to the promoted IDs; explicit GPT-5.5/Grok-4.3 IDs SHALL remain callable without identity rewriting.
- Grok 4.5 SHALL use xAI direct first and exact OpenRouter Grok 4.5 second; OpenRouter silent provider substitution SHALL be independently controllable and disabled for benchmarks/probes.
- Registry generation and drift checks SHALL pass across backend, frontend, and MCP projections.
- Paired public/non-PHI benchmark evidence SHALL compare promoted and incumbent seats without fallback, and full-council/seat-ablation evidence SHALL be persisted.
- The immutable benchmark SHALL bind the roster, registry digest, run manifest, policies, prompt suite, and threshold outcomes; it SHALL NOT be represented as binding the subsequently built image SHA.
- Deployment SHALL be manually dispatched from GitHub with an approved full Forgejo SHA exactly matching checkout and fetched Forgejo `master`; local deploy SHALL require clean `HEAD` equal to fetched Forgejo `origin/master`. A GitHub `master` mirror push SHALL NOT build, mutate traffic, or issue paid probes.
- A prospective top-level `run_rollout` controller SHALL own the non-reorderable sequence benchmark → lock → build → prior capture/stream → shadow deploy/health → shadow sync/stream → 10% → planned restore → 10% → 50% → authoritative 100% convergence → strict approved production health → final sync/stream → cleanup/proof → durable retention obligation → mutation disarm → lock release. Callers SHALL NOT supply or reorder its five paid attempts: `prior-stream`, `shadow-sync`, `shadow-stream`, `final-sync`, and `final-stream`. One same-stage retry MAY occur only for classified infrastructure failure, making six the absolute maximum.
- Deployment SHALL pin application, registry, and projection digests; acquire the cooperative GCS generation-0 lock before build or service access; reject existing or malformed lock ownership; require a converged, well-formed service with exactly one resolved prior revision at 100%; use tag-preserving Cloud Run v2 etag-conditioned traffic PATCHes, long-running-operation polling, and exact convergence checks; rehearse exact planned restoration without paid calls while leaving final probes available; atomically close the paid gate before terminal rollback; and verify the nine-seat roster in production.
- The rollout SHALL use separate immutable generation-0 `NNNN-started.json` and `NNNN-completed.json` attempt records; completion SHALL repeat and match every started-record identity/gate field and add only a bounded outcome classification. A stale generation-0 deployment lock SHALL fail closed with explicit `stale_lock_recovery_required`; the normal controller SHALL NOT inspect an attempt ledger, pretend to resume, mutate service state, or issue a paid request. Before owned mutation, signal/exit cleanup SHALL generation-conditionally release only its owned lock without rollback; after mutation, exact rollback remains required. One injected monotonic 30-minute promotion deadline SHALL pass a freshly reduced remaining budget to every repeated operation/service poll and all other promotion boundaries; expiry between actual polls SHALL prevent the next promotion poll or operation, while rollback SHALL have an independent five-minute grace. Exact convergence and rollback proof SHALL independently bind canonical traffic/tags/statuses, prior health identity, error-free valid LRO, stable UID, generation/observed-generation/reconciling state, etag progression from snapshot and mutation-owner state, and lock retention until proof succeeds.
- Deployment runtime SHALL create only the durable GCS retention obligation and SHALL never execute `bd`; the orchestrator creates the follow-up Bead after success. GitHub CI and deploy jobs SHALL checkout and verify the identical full `approved_forgejo_sha` before tests, build, or deployment.
- `scripts/deploy.sh` SHALL be the production entry point and delegate the complete operation to `run_rollout`; GitHub and local executable paths SHALL complete clean-tree and exact approved/fetched Forgejo SHA checks before that call; and `cloudbuild.yaml` SHALL be build-only or delegate through the controller, never independently mutate Cloud Run or run paid probes. The outer workflow timeout SHALL exceed 2100 seconds. The controller SHALL create the derived durable retention obligation before disarming mutation and generation-conditioned lock release, derive `retain_until` no earlier than the injected clock's current UTC time plus 24 hours, perform no revision deletion, and stop after one failed rollout.
- Forgejo CI SHALL pass before merge, GitHub SHALL mirror Forgejo, and the user's shared checkout SHALL match the authoritative remote before completion is claimed.
