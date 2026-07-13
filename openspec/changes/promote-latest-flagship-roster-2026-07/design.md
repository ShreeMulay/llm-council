# Design: Latest Flagship Roster Promotion

## Decision

“Latest” means the newest top-capability callable flagship in each existing council family, not the newest release-date SKU. GPT-5.6 Sol and Grok 4.5 replace their incumbents. Gemini 3.1 Pro Preview remains the advanced Gemini reasoning seat; Gemini 3.5 Flash remains a cost/latency challenger rather than a Pro replacement.

## Target roster

| Seat | Logical model | Primary route | Roles |
|---|---|---|---|
| 1 | `openai/gpt-5.6-sol` | OpenRouter | member, evaluator |
| 2 | `anthropic/claude-fable-5` | Vertex AI Anthropic | member, evaluator, chairman |
| 3 | `fireworks/glm-5.2` | Fireworks direct | member |
| 4 | `google/gemini-3.1-pro-preview` | OpenRouter | member |
| 5 | `x-ai/grok-4.5` | xAI direct | member |
| 6 | `fireworks/kimi-k2.7-code` | Fireworks direct | member |
| 7 | `deepseek/deepseek-v4-pro` | OpenRouter | member, evaluator |
| 8 | `meta-llama/llama-4-maverick` | OpenRouter | member |
| 9 | `qwen/qwen3.7-max` | OpenRouter | member |

Compact mode is seats 1–5. Fable remains chairman. Evaluator priority is Fable, DeepSeek V4 Pro, GPT-5.6 Sol.

## Identity and compatibility

Promoted models receive production lifecycle, seats, roles, aliases, and reasoning settings. GPT-5.5 and Grok 4.3 lose production roles/seats and become legacy compatibility records. Explicit old logical IDs retain their existing routes. Aliases move to the promoted IDs. Cache keys and execution-plan digests continue to include the exact logical ID and captured route settings.

## Route policy separation

`allow_declared_route_failover` and `allow_provider_substitution` are independent execution settings. Declared failover means advancing to another explicit registry route after a recorded failure. Provider substitution controls OpenRouter's internal upstream substitution. Production MAY allow declared failover. Benchmarks and support probes MUST disable both. Every result records the attempted route, selected route, fallback flag, and normalized failure reason.

Grok 4.5 routes are:

1. `xai:x-ai/grok-4.5` using provider model ID `grok-4.5`.
2. `openrouter:x-ai/grok-4.5` using provider model ID `x-ai/grok-4.5`.

Fable production strict policy remains a single Vertex route and cannot be weakened by request, provider, constructor, preferred-route, missing-record, or ambiguous-route state.

## Benchmark and promotion evidence

No-fallback probes verify exact IDs before paid benchmark execution. The versioned public/non-PHI suite compares GPT-5.6 Sol against GPT-5.5 and Grok 4.5 against Grok 4.3, includes GPT evaluator behavior, and runs full-council seat ablations. Subjective scoring uses at least two independent judge families and objective validators where available.

Hard acceptance gates are exact route callability, zero undeclared provider substitution, zero critical safety/instruction failures, deterministic projection drift checks, and successful rollback. Quality MUST be within three percentage points overall, no task stratum worse by more than five points, objective accuracy within two points, evaluator formatting no worse than baseline, and full-council factual error no worse than baseline. Operational gates are at least 99% route success, less than 2% direct Grok failover, p95 full-council latency increase at most 20%, individual p95 at most 1.5× baseline, and cost increase at most 25% unless explicitly accepted.

## Deployment

Build from the reviewed merged tree and pin the image digest plus registry/projection digests. Deploy a zero-traffic tagged revision, compare public/non-PHI structural/route/latency evidence, then use staged 10% and 50% canaries before 100%. Rehearse atomic rollback to the prior image and registry before final promotion. Verify Forgejo/GitHub/master/shared-checkout equality at closeout.
