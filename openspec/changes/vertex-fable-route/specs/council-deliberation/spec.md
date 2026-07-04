# Delta Spec: Vertex AI Anthropic Route for Claude Fable 5

## MODIFIED Requirements

### Requirement: Multi-provider routing SHALL use the PHI-eligible Vertex route for Fable

The system SHALL route `anthropic/claude-fable-5` to Anthropic-on-Vertex as its primary provider.

#### Scenario: Fable uses Vertex AI primary route

GIVEN the model ID `anthropic/claude-fable-5`
WHEN the council queries the model
THEN it SHALL call the Anthropic Vertex backend
AND it SHALL map the model to `claude-fable-5`
AND it SHALL authenticate using Cloud Run ADC/service account credentials
AND it SHALL NOT require service-account JSON key files.

#### Scenario: Fable sends high-effort Vertex payload

GIVEN the model ID `anthropic/claude-fable-5`
WHEN the Vertex Anthropic request is built
THEN it SHALL include `thinking={"type":"adaptive","display":"omitted"}` when supported
AND it SHALL include `output_config={"effort":"high"}` when supported.

#### Scenario: Fable OpenRouter fallback is non-PHI only

GIVEN the Vertex Anthropic primary route fails
WHEN the existing OpenRouter fallback is used for `anthropic/claude-fable-5`
THEN the fallback SHALL remain available for non-PHI/deidentified prompts only
AND the system SHALL NOT claim OpenRouter fallback is PHI-safe

#### Scenario: Covered deployments require the Vertex route

GIVEN `REQUIRE_VERTEX_ANTHROPIC=true`
AND the model ID is `anthropic/claude-fable-5`
WHEN the Vertex Anthropic primary route fails
THEN the system SHALL refuse OpenRouter fallback for that model
AND the response for that model SHALL fail closed rather than silently using a non-BAA provider
AND the system SHALL document that no PHI detector suppresses fallback automatically.

#### Scenario: Existing production roster stays intact

GIVEN the default council roster
WHEN Fable routing changes
THEN Fireworks GLM-5.2 xHigh SHALL remain the default GLM slot
AND Kimi K2.7 Code SHALL remain the default Kimi slot.
