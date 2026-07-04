## ADDED Requirements

### Requirement: Default Anthropic council member SHALL be Claude Fable 5

The production council roster SHALL include `anthropic/claude-fable-5` as the Anthropic member. The production council roster SHALL NOT include `anthropic/claude-opus-4.8` by default.

#### Scenario: Default roster uses Fable

GIVEN no explicit council model override is provided
WHEN the default council roster is resolved
THEN it SHALL include `anthropic/claude-fable-5`
AND it SHALL NOT include `anthropic/claude-opus-4.8`.

### Requirement: Compact roster SHALL use Claude Fable 5

The compact council roster SHALL include `anthropic/claude-fable-5` as its Anthropic member.

#### Scenario: Compact roster uses Fable

GIVEN compact mode is requested
WHEN compact council models are resolved
THEN the Anthropic member SHALL be `anthropic/claude-fable-5`.

### Requirement: Chairman SHALL be Claude Fable 5 with high effort

The default chairman model SHALL be `anthropic/claude-fable-5`. Requests to Fable SHALL use `reasoning_effort="high"`.

#### Scenario: Default chairman uses Fable high effort

GIVEN no chairman override is provided
WHEN the chairman model and reasoning effort are resolved
THEN the chairman model SHALL be `anthropic/claude-fable-5`
AND the reasoning effort SHALL be `high`.

### Requirement: Fable SHALL be the lead evaluator

The evaluator priority list SHALL prefer `anthropic/claude-fable-5` before other evaluator models when Fable is present in the active council.

#### Scenario: Evaluator priority starts with Fable

GIVEN the default council roster is active
WHEN evaluator models are selected
THEN `anthropic/claude-fable-5` SHALL be selected before `deepseek/deepseek-v4-pro` and `openai/gpt-5.5`.

### Requirement: Opus 4.8 SHALL remain explicit/backward-compatible

The system SHALL preserve `anthropic/claude-opus-4.8` as an explicit selectable model through alias resolution, fallback mapping, tiering, and reasoning-effort configuration. Opus 4.8 SHALL NOT be the default chairman or default production Anthropic council member.

#### Scenario: Opus alias remains available

GIVEN the alias `opus`
WHEN model aliases are resolved
THEN it SHALL resolve to `anthropic/claude-opus-4.8`.

### Requirement: Fable use SHALL preserve PHI safety boundaries

Fable 5 SHALL NOT be used for PHI unless it is routed through a verified BAA-safe path.

#### Scenario: Non-PHI safety language is visible

GIVEN documentation or tool metadata describes Fable 5 as default
WHEN users read the operational caveat
THEN it SHALL state Fable use is non-PHI unless routed through a verified BAA-safe path.
