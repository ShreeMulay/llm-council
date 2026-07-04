# Delta Spec: July 2026 Council Roster

## MODIFIED Requirements

### Requirement: Default council roster SHALL be benchmark-gated for July 2026 swaps

The system SHALL NOT apply July 2026 roster-impacting swaps unless the benchmark gate supports the swap.

#### Scenario: MiniMax can replace Llama only after benchmark support

GIVEN Llama 4 Maverick is the incumbent default open-weight/generalist slot
WHEN the July 2026 benchmark shows MiniMax M3 is better or equal in quality with acceptable latency and cost
THEN the default roster MAY replace `meta-llama/llama-4-maverick` with `minimax/minimax-m3`
AND the `llama` alias MAY remain available as an explicit legacy alias
AND a `minimax` alias SHALL resolve to `minimax/minimax-m3`.

#### Scenario: Kimi can upgrade only after benchmark support

GIVEN Kimi K2.6 is the incumbent default Kimi slot
WHEN the July 2026 benchmark shows Kimi K2.7 Code does not regress overall quality
THEN the default roster MAY replace `fireworks/kimi-k2.6` with `fireworks/kimi-k2.7-code`
AND the `kimi` alias MAY resolve to `fireworks/kimi-k2.7-code`.

#### Scenario: GLM Fireworks promotion is gated

GIVEN `glm-fw` is an explicit Fireworks GLM 5.2 xHigh challenger
WHEN the July 2026 benchmark shows Fireworks GLM 5.2 xHigh beats or ties `z-ai/glm-5.2` with acceptable latency and cost
THEN the production `glm` slot MAY be promoted to `fireworks/glm-5.2`
AND the benchmark result SHALL be documented.

### Requirement: Claude Sonnet 5 SHALL be alias-only in this change

The system SHALL expose Claude Sonnet 5 as a convenience alias but SHALL NOT add it to the default roster in this change.

#### Scenario: Sonnet alias refresh

GIVEN the alias `sonnet`
WHEN model aliases are resolved
THEN it SHALL resolve to `anthropic/claude-sonnet-5`
AND `anthropic/claude-sonnet-5` SHALL NOT be included in the default council roster.

### Requirement: Fable 5 SHALL remain challenger-only and non-PHI

The system MAY benchmark Fable 5 with PHI-free prompts but SHALL NOT make Fable a default member or chairman.

#### Scenario: Fable stays out of default roster

GIVEN `anthropic/claude-fable-5` is benchmarked
WHEN the production roster is resolved
THEN `anthropic/claude-fable-5` SHALL NOT appear in default council models
AND the default chairman SHALL remain `anthropic/claude-opus-4.8`.

#### Scenario: Fable benchmark uses only PHI-free prompts

GIVEN a live benchmark includes Fable 5
WHEN prompts are loaded
THEN prompts SHALL come from committed PHI-free benchmark suites
AND prompts SHALL NOT include patient identifiers, labs, screenshots, raw clinical notes, or secrets.
