# Council Deliberation Delta — Codebase Hardening 2026-07

## Modified Requirements

### Requirement: Vertex-only Fable in strict deployments

When `REQUIRE_VERTEX_ANTHROPIC=true`, any request for a model that requires Vertex Anthropic SHALL fail closed if Vertex Anthropic is unavailable. The system MUST NOT fall back to OpenRouter or another non-BAA provider for that model on sync, streaming, retry, or reasoning-override paths.

#### Scenario: Streaming path refuses non-BAA fallback

GIVEN `REQUIRE_VERTEX_ANTHROPIC=true`
AND Claude Fable 5 is configured as a Vertex-required model
AND the Vertex Anthropic call fails
WHEN the streaming council path queries Claude Fable 5
THEN no OpenRouter fallback call SHALL be made
AND the model result SHALL be a fail-closed error for that model.

### Requirement: Stage 2 rankings use evaluator-local labels

Aggregate rankings SHALL decode each evaluator's labels using that evaluator's `label_to_model` map when present.

#### Scenario: Evaluators receive different randomized orders

GIVEN two evaluator ranking results with different label-to-model mappings
WHEN aggregate rankings are calculated
THEN each rank SHALL be attributed to the model indicated by that evaluator's local mapping
AND global/unshuffled labels SHALL NOT override evaluator-local labels.

### Requirement: Streaming and sync deliberation parity

The streaming council path SHALL use the same Stage 2 evaluator selection, self-exclusion, randomized response labeling, and response truncation semantics as the sync council path.

#### Scenario: Streaming Stage 2 excludes evaluator's own response

GIVEN a configured evaluator that also produced a Stage 1 response
WHEN streaming Stage 2 asks that evaluator to rank responses
THEN the evaluator's own response SHALL be excluded from its ranking prompt.

### Requirement: Score-based top response curation

Stage 3 response selection SHALL use aggregate ranking scores, not response length, to select curated responses. The curated set SHOULD include top consensus responses plus a disagreement wildcard and diversity pick when enough valid responses are available.

#### Scenario: More than five responses are available

GIVEN at least seven Stage 1 responses and Stage 2 aggregate rankings
WHEN selecting responses for Stage 3
THEN top consensus responses SHALL be prioritized by aggregate rank
AND the selected set SHALL include no more than five responses
AND it SHALL include at least one non-top-consensus response when a valid wildcard/diversity candidate exists.

### Requirement: Bounded calls and cache

Model calls in Stage 1, Stage 2, streaming, and chairman synthesis SHOULD be bounded by explicit timeouts. Stage 1 cache SHALL have bounded size and SHALL evict expired or oldest entries before unbounded memory growth.
