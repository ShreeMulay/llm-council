# Add Fireworks GLM 5.2 xHigh Challenger

Status: ARCHIVED

## Summary

Add a Fireworks-direct GLM 5.2 challenger path without replacing the production GLM slot. The production `glm` alias and default/compact rosters stay on `z-ai/glm-5.2`; a new `glm-fw` alias routes explicit challenger requests to `fireworks/glm-5.2` with explicit xHigh reasoning and streaming support for outputs above Fireworks' 4096 non-streaming limit.

Also refresh stale convenience aliases: `sonnet` SHALL point to Claude Sonnet 4.6 and `flash` SHALL point to Gemini 3.5 Flash. Gemini Pro stays `google/gemini-3.1-pro-preview`; Opus 4.8 remains chairman; Claude Fable remains explicit challenger only.

## Motivation

- Fireworks GLM 5.2 is a cost/latency challenger but must not silently replace the production GLM slot before an A/B benchmark.
- Fireworks requires `stream=true` for `max_tokens > 4096`; xHigh/Max reasoning can consume enough reasoning budget that a 4096 cap yields empty or truncated visible content.
- Existing Fireworks calls do not pass `reasoning_effort`, so explicit xHigh configuration is currently ineffective.
- The benchmark harness currently drops Fireworks `reasoning_effort`, making Fireworks GLM reasoning comparisons ambiguous.

## Scope

In scope:

- `glm-fw` alias for `fireworks/glm-5.2`.
- Fireworks payload `reasoning_effort` support.
- Fireworks streaming support and aggregation for `content` and `reasoning_content`.
- OpenRouter fallback `fireworks/glm-5.2` → `z-ai/glm-5.2`.
- Benchmark harness pass-through of Fireworks `reasoning_effort`.
- Frontend/MCP/docs metadata for the challenger alias and refreshed convenience aliases.
- Tests and PHI-free smoke/A/B verification where credentials allow.

Out of scope:

- Replacing default `glm` with Fireworks.
- Changing chairman away from Opus 4.8.
- Activating Claude Fable as default or PHI-safe.
- Editing archived OpenSpec changes.

## Success Criteria

- Unit tests prove `glm-fw` resolves to `fireworks/glm-5.2`, the production `glm` alias remains `z-ai/glm-5.2`, and `fireworks/glm-5.2` has xHigh reasoning plus OpenRouter fallback.
- Fireworks client tests prove explicit `reasoning_effort` is sent and streaming is used when requested tokens exceed 4096.
- Council routing passes the effective reasoning effort into Fireworks calls.
- Benchmark harness passes Fireworks variant `reasoning_effort` into the provider call.
- Quality gates pass.
- Cloud Run deploy and `/health`/council smoke checks succeed if deployment credentials are available.
- Forgejo PR merges with CI green and GitHub mirror is updated.
