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
- Run public/non-PHI no-fallback probes, paired benchmarks, shadow, canary, rollback rehearsal, production verification, Forgejo/GitHub landing, and shared-checkout reconciliation.

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
- Deployment SHALL pin application, registry, and projection digests; pass shadow/canary gates; rehearse rollback; and verify the nine-seat roster in production.
- Forgejo CI SHALL pass before merge, GitHub SHALL mirror Forgejo, and the user's shared checkout SHALL match the authoritative remote before completion is claimed.
