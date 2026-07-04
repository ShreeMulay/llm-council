# Benchmark-Gated July 2026 Council Roster Refresh

Status: APPROVED

Issue: `llm-council-464`

## Summary

Refresh the LLM Council after the July 2026 model audit using a live, PHI-free benchmark gate before applying production roster-impacting swaps.

## Motivation

The 2026-07-03/04 model audit found that most production seats remain current, but several updates require action:

- `sonnet` alias is stale because Claude Sonnet 5 released on 2026-06-30.
- Claude Fable 5 is accessible again and should be measured as an explicit challenger, while remaining non-chairman and non-PHI.
- Kimi K2.7 Code is available as a candidate successor to Kimi K2.6 but may be a coding-specialized sidegrade.
- Llama 4 Maverick is the weakest default council seat and should be benchmarked against MiniMax M3.
- Fireworks GLM 5.2 xHigh is already shipped as `glm-fw`; promotion to default must be data-backed.

## Scope

### In scope

- Add benchmark variants for MiniMax M3, Llama 4 Maverick baseline, Kimi K2.7 Code, Kimi K2.6 baseline, Fable 5, z-ai GLM 5.2 baseline, and Fireworks GLM 5.2 xHigh.
- Update `sonnet` alias to `anthropic/claude-sonnet-5` without adding it to the default council roster.
- Add MiniMax M3 as the benchmark-approved replacement candidate for the Llama slot.
- Add Fireworks mapping for Kimi K2.7 Code.
- Preserve Opus 4.8 as default chairman.
- Run a PHI-free live benchmark under a $25 cap before applying roster-impacting swaps.
- Apply only benchmark-supported production swaps and document the benchmark result.
- Update backend, frontend, MCP, docs, tests, and OpenSpec deltas for the final accepted roster/aliases.

### Out of scope

- Replacing Opus 4.8 chairman.
- Making Fable 5 a default member or chairman.
- Routing PHI/secrets/patient data through benchmark prompts or artifacts.
- Adding Sonnet 5 as a default council member in this change.
- Editing `openspec/changes/archive/**`.
- Changing the 3-stage deliberation algorithm.

## Benchmark gate

The live benchmark SHALL use the committed PHI-free prompt suite, no silent provider fallback for benchmark purity, and a hard spend cap of $25.

The July benchmark SHALL use a named/selectable variant set instead of appending July candidates to the existing June reasoning-ladder defaults. This prevents re-running unrelated expensive GPT/Opus variants during the roster decision run.

Promotion rules:

- MiniMax M3 MAY replace Llama 4 Maverick only if the independent judge mean score is at least Llama's mean score, median latency is no more than 2x Llama, and estimated per-response cost is no more than 2x Llama.
- Kimi K2.7 Code MAY replace Kimi K2.6 only if independent judge mean score is no worse than 0.25 points below Kimi K2.6 on a 10-point scale and its coding/debugging subset is at least tied.
- `glm-fw` MAY be promoted only if Fireworks GLM 5.2 xHigh beats z-ai GLM 5.2 by at least 0.25 judge-score points, or ties within 0.25 while improving latency, with estimated per-response cost no more than 2x z-ai GLM 5.2.
- Fable 5 SHALL remain challenger-only regardless of score.

## Risks

- Provider IDs or Fireworks account slugs may differ from advertised slugs and must be tested before production use.
- Benchmark outputs include raw prompts/responses; artifacts must remain PHI-free, secret-scanned, and treated as untrusted data.
- Kimi K2.7 Code may improve coding prompts while regressing general deliberation.
- MiniMax M3 improves quality but changes council lab/geography diversity.
- Fireworks GLM xHigh may improve quality while increasing latency/cost.

## Acceptance Criteria

- OpenSpec and Beads track the change before implementation.
- Tests prove alias, roster, fallback, benchmark variant, and metadata contracts.
- Mock benchmark tests pass without provider calls.
- Live benchmark runs with PHI-free prompts, no silent fallback, and hard cap ≤ $25.
- Final production roster changes match benchmark results.
- `sonnet` resolves to `anthropic/claude-sonnet-5` and is not a default member.
- Fable 5 remains explicit/challenger-only and is not default/chairman.
- Local gates pass: Python tests/ruff, frontend test/lint/build, MCP typecheck/build.
- Cloud Run deploy and `/health` smoke prove the final roster and Opus 4.8 chairman.
- Forgejo PR passes CI, merges, mirrors to GitHub, Beads closes, OpenSpec archives, and memory is stored.
