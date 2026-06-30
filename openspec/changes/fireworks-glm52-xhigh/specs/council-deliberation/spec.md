# Council Deliberation Delta: Fireworks GLM 5.2 xHigh Challenger

## ADDED Requirement: Fireworks GLM 5.2 Challenger Routing

The system SHALL expose Fireworks GLM 5.2 as an explicit challenger without changing the default GLM production slot.

### Scenario: Preserve production GLM alias

- **GIVEN** the user selects alias `glm`
- **WHEN** aliases are resolved
- **THEN** the resolved model SHALL be `z-ai/glm-5.2`
- **AND** default and compact council rosters SHALL continue to use `z-ai/glm-5.2`.

### Scenario: Route explicit Fireworks GLM challenger

- **GIVEN** the user selects alias `glm-fw`
- **WHEN** aliases are resolved
- **THEN** the resolved model SHALL be `fireworks/glm-5.2`
- **AND** direct-provider routing SHALL use the Fireworks API.

### Scenario: Apply xHigh reasoning to Fireworks GLM 5.2

- **GIVEN** model ID `fireworks/glm-5.2`
- **WHEN** the council queries the model through Fireworks
- **THEN** the payload SHALL include `reasoning_effort: "xhigh"`
- **AND** the setting SHALL be visible through `get_model_reasoning_effort("fireworks/glm-5.2")`.

### Scenario: Pass Fireworks reasoning through live council routing

- **GIVEN** model ID `fireworks/glm-5.2` is queried by Stage 1, Stage 3, or retry routing
- **WHEN** the primary-provider query path invokes the Fireworks client
- **THEN** it SHALL pass `reasoning_effort="xhigh"` into `query_fireworks_model`
- **AND** it SHALL NOT route the primary call through OpenRouter unless the Fireworks call fails.

### Scenario: Fallback Fireworks GLM 5.2 to OpenRouter GLM 5.2

- **GIVEN** the primary Fireworks call for `fireworks/glm-5.2` fails
- **WHEN** fallback routing is attempted
- **THEN** the fallback model SHALL be `z-ai/glm-5.2`
- **AND** the production GLM alias SHALL remain unchanged.

## ADDED Requirement: Fireworks Streaming Above Non-Streaming Cap

The Fireworks client SHALL use streaming for calls whose requested `max_tokens` exceed the Fireworks non-streaming cap.

### Scenario: Stream long Fireworks responses

- **GIVEN** a Fireworks model call with `max_tokens > 4096`
- **WHEN** the Fireworks client builds the request
- **THEN** it SHALL send `stream: true`
- **AND** it SHALL NOT lower the requested `max_tokens` to 4096.

### Scenario: Aggregate streamed reasoning and visible content

- **GIVEN** a Fireworks streaming response with chunks containing `reasoning_content` and `content`
- **WHEN** the stream completes
- **THEN** the client SHALL aggregate both fields in order
- **AND** return visible `content` that includes reasoning content when the model's visible content is sparse
- **AND** use the same sparse-content threshold for streaming and non-streaming paths.

### Scenario: Prevent reasoning-only success from falling back

- **GIVEN** a Fireworks GLM response has sparse visible content but non-empty `reasoning_content`
- **WHEN** the client merges reasoning content into the returned text
- **THEN** the council SHALL treat the Fireworks call as successful
- **AND** SHALL NOT trigger OpenRouter fallback only because the original visible content was sparse.

### Scenario: Preserve non-streaming behavior below cap

- **GIVEN** a Fireworks model call with `max_tokens <= 4096`
- **WHEN** the Fireworks client builds the request
- **THEN** it MAY use non-streaming mode
- **AND** it SHALL preserve existing `reasoning_content` fallback behavior.

## ADDED Requirement: Fireworks Benchmark Reasoning Fidelity

The benchmark harness SHALL pass configured Fireworks `reasoning_effort` into Fireworks provider calls.

### Scenario: Benchmark Fireworks xHigh honestly

- **GIVEN** a benchmark variant with provider `fireworks` and `reasoning_effort: "xhigh"`
- **WHEN** the benchmark runner queries the provider
- **THEN** the Fireworks call SHALL receive `reasoning_effort="xhigh"`.

### Scenario: Include Fireworks xHigh benchmark variant

- **GIVEN** the benchmark default variants are expanded
- **WHEN** Fireworks GLM 5.2 variants are listed
- **THEN** at least one Fireworks GLM 5.2 variant SHALL declare `reasoning_effort="xhigh"`.

## ADDED Requirement: Convenience Alias Freshness

The system SHALL keep convenience aliases aligned with latest verified non-default models.

### Scenario: Resolve latest Sonnet alias

- **GIVEN** the user selects alias `sonnet`
- **WHEN** aliases are resolved
- **THEN** the resolved model SHALL be `anthropic/claude-sonnet-4.6`.

### Scenario: Resolve latest Flash alias

- **GIVEN** the user selects alias `flash`
- **WHEN** aliases are resolved
- **THEN** the resolved model SHALL be `google/gemini-3.5-flash`.

### Scenario: Route latest Flash alias through OpenRouter

- **GIVEN** the resolved model is `google/gemini-3.5-flash`
- **WHEN** the model is queried
- **THEN** the primary route SHALL be OpenRouter-compatible
- **AND** it SHALL NOT require a direct Google client entry.
