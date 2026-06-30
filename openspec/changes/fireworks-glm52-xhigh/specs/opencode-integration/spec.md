# OpenCode Integration Delta: Fireworks GLM 5.2 Challenger Alias

## ADDED Requirement: MCP and UI Metadata for GLM Fireworks Challenger

The OpenCode MCP schema and frontend metadata SHALL document the Fireworks GLM 5.2 challenger without implying it is the production GLM default.

### Scenario: MCP accepts explicit GLM Fireworks alias

- **GIVEN** a caller passes model alias `glm-fw`
- **WHEN** the MCP server forwards model choices
- **THEN** the backend SHALL resolve it to `fireworks/glm-5.2`.

### Scenario: UI keeps production GLM default stable

- **GIVEN** the frontend displays core council metadata
- **WHEN** the user views the default GLM slot
- **THEN** it SHALL continue to show `z-ai/glm-5.2` as the default GLM model
- **AND** it SHALL expose distinct metadata for `glm-fw` so Fireworks GLM 5.2 is not mislabeled as the production Z.ai/OpenRouter slot.

### Scenario: Documentation states challenger status

- **GIVEN** a developer reads project documentation
- **WHEN** reviewing model aliases
- **THEN** documentation SHALL state that `glm-fw` is Fireworks-direct GLM 5.2 xHigh challenger-only pending benchmark promotion.
