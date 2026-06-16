# Delta Spec: Council Deliberation Model Roster

## MODIFIED Requirements

### Requirement: Default council roster SHALL track the approved production model slate

The system SHALL use the approved 9-member production roster when no explicit model override is provided.

#### Scenario: Full council uses refreshed GLM and Qwen slots

GIVEN a request without a `models` override
WHEN the backend resolves `COUNCIL_MODELS`
THEN the roster SHALL include `z-ai/glm-5.2`
AND the roster SHALL include `qwen/qwen3.7-max`
AND the roster SHALL NOT include `fireworks/glm-5.1` as a default production member
AND the roster SHALL NOT include `qwen/qwen3.5-122b-a10b` as a default production member.

#### Scenario: Compact council uses refreshed GLM slot

GIVEN a request with `compact: true` and no explicit `models` override
WHEN the backend resolves compact council members
THEN the compact roster SHALL include `z-ai/glm-5.2`
AND the compact roster SHALL NOT include `fireworks/glm-5.1`.

### Requirement: Model aliases SHALL resolve to current approved production IDs

Aliases SHALL provide stable short names for current production models.

#### Scenario: GLM alias resolves to GLM 5.2

GIVEN the alias `glm`
WHEN model aliases are resolved
THEN it SHALL resolve to `z-ai/glm-5.2`.

#### Scenario: Qwen alias resolves to Qwen 3.7 Max

GIVEN the alias `qwen`
WHEN model aliases are resolved
THEN it SHALL resolve to `qwen/qwen3.7-max`.

#### Scenario: Fable alias is available as an explicit challenger

GIVEN the alias `fable`
WHEN model aliases are resolved
THEN it SHALL resolve to `anthropic/claude-fable-5`
AND it SHALL NOT be added to the default production roster.

### Requirement: Chairman SHALL remain Claude Opus 4.8

The chairman model SHALL remain `anthropic/claude-opus-4.8` unless a separate approved benchmark changes that decision.

#### Scenario: Refreshed roster preserves chairman

GIVEN the refreshed production roster
WHEN the default chairman is resolved
THEN it SHALL be `anthropic/claude-opus-4.8`.

### Requirement: Claude Fable 5 SHALL be treated as a challenger model

The system MAY expose `anthropic/claude-fable-5` as an explicit selectable model or alias, but SHALL NOT make it the default chairman in this change.

#### Scenario: Fable is not implicit chairman

GIVEN Claude Fable 5 is available from providers
WHEN no `chairman` override is provided
THEN the system SHALL NOT select Claude Fable 5 as chairman.
