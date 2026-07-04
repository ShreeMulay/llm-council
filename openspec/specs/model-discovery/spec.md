# Model Discovery Spec

## Requirement: Provider Model Catalog

The system SHALL provide a normalized model catalog for the production council roster and supported explicit/legacy aliases.

### Scenario: Return Production Roster

- **GIVEN** the `/api/models` endpoint is called without a provider filter
- **WHEN** the model catalog is returned
- **THEN** it includes the current 9-model production roster:
  - `openai/gpt-5.5` via OpenRouter
  - `anthropic/claude-fable-5` via Vertex AI Anthropic in `shree-development`
  - `fireworks/glm-5.2` via Fireworks direct
  - `google/gemini-3.1-pro-preview` via OpenRouter
  - `x-ai/grok-4.3` via xAI direct
  - `fireworks/kimi-k2.7-code` via Fireworks direct
  - `deepseek/deepseek-v4-pro` via OpenRouter
  - `meta-llama/llama-4-maverick` via OpenRouter
  - `qwen/qwen3.7-max` via OpenRouter
- **AND** each model has a normalized `provider` field
- **AND** `anthropic/claude-fable-5` is identified as the chairman model

### Scenario: Preserve Route-Conditional PHI Metadata

- **GIVEN** `anthropic/claude-fable-5` is included in the model catalog
- **WHEN** the route metadata is returned
- **THEN** Vertex AI Anthropic in `shree-development` with `REQUIRE_VERTEX_ANTHROPIC=true` is marked PHI-eligible
- **AND** `shree-development` is documented as BAA-covered per Shree on 2026-07-04
- **AND** OpenRouter fallback for Fable is marked non-PHI/deidentified only

## Requirement: OpenRouter Model Listing

The system SHALL dynamically fetch and cache available OpenRouter models when OpenRouter discovery is requested.

### Scenario: Fetch OpenRouter Models

- **GIVEN** a valid `OPENROUTER_API_KEY`
- **WHEN** the `/api/models?provider=openrouter` endpoint is called
- **THEN** it returns array of model objects with:
  - `id`: Model identifier (for example, `openai/gpt-5.5`)
  - `name`: Human-readable name when provided by OpenRouter
  - `context_length`: Maximum tokens when provided by OpenRouter
  - `pricing.prompt`: Input cost per token when provided by OpenRouter
  - `pricing.completion`: Output cost per token when provided by OpenRouter
  - `supported_parameters`: Capabilities list when provided by OpenRouter
  - `provider`: `openrouter`

### Scenario: Cache OpenRouter Models

- **GIVEN** models previously fetched from OpenRouter
- **WHEN** subsequent requests occur within 24 hours
- **THEN** it returns cached models without an API call
- **AND** cache age is validated against `CACHE_TTL_SECONDS` (86400)

## Requirement: Direct Provider Catalog Entries

The system SHALL include direct-provider production models even when the provider does not expose a compatible dynamic listing endpoint.

### Scenario: Include Vertex AI Anthropic Entry

- **GIVEN** `anthropic/claude-fable-5` is configured
- **WHEN** the catalog is generated
- **THEN** it is represented as a Vertex AI Anthropic route with ADC/service-account authentication
- **AND** it is the default chairman

### Scenario: Include Fireworks Direct Entries

- **GIVEN** `fireworks/glm-5.2` and `fireworks/kimi-k2.7-code` are configured
- **WHEN** the catalog is generated
- **THEN** both are represented as Fireworks direct routes
- **AND** `fireworks/glm-5.2` preserves configured xHigh reasoning metadata

### Scenario: Include xAI Direct Entry

- **GIVEN** `x-ai/grok-4.3` is configured
- **WHEN** the catalog is generated
- **THEN** it is represented as an xAI direct route

## Requirement: Legacy Cerebras Routes

Cerebras routes are legacy/non-production and SHALL NOT be presented as part of the default production or compact rosters.

### Scenario: Fetch Legacy Cerebras Models Explicitly

- **GIVEN** a valid `CEREBRAS_API_KEY`
- **WHEN** `/api/models?provider=cerebras` is called explicitly
- **THEN** Cerebras models MAY be returned for backward compatibility
- **AND** each model MUST be marked `legacy: true`
- **AND** each model MUST be marked `production_roster: false`

### Scenario: Do Not Promote Legacy GLM 4.7

- **GIVEN** a legacy Cerebras model such as `zai-glm-4.7`
- **WHEN** the default `/api/models` catalog is returned
- **THEN** it MUST NOT replace `fireworks/glm-5.2` in the production roster
- **AND** it MUST NOT appear in compact mode unless requested explicitly

## Requirement: Combined Model List

The system SHALL provide a combined normalized model list from production provider routes and supported explicit legacy routes.

### Scenario: Fetch All Models

- **GIVEN** available provider credentials and configured model routes
- **WHEN** the `/api/models` endpoint is called
- **THEN** it returns a merged normalized list
- **AND** each model has `id`, `provider`, and `production_roster` metadata

### Scenario: Force Cache Refresh

- **GIVEN** cache exists with models
- **WHEN** `/api/models?refresh=true` is called
- **THEN** it bypasses cache for dynamically discoverable providers
- **AND** updates cache with fresh discovery results and current static route metadata

## Technical Implementation

### Caching Strategy

- **Cache File**: `data/cache/models.json`
- **Cache TTL**: 86400 seconds (24 hours)
- **Cache Structure**:
  ```json
  {
    "openrouter": {
      "last_fetch": 1737062400,
      "models": []
    },
    "production_routes": {
      "last_fetch": 1737062400,
      "models": []
    },
    "legacy": {
      "last_fetch": 1737062400,
      "models": []
    }
  }
  ```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/models` | Production roster plus supported explicit aliases/metadata |
| `GET /api/models?provider=openrouter` | OpenRouter discovery |
| `GET /api/models?provider=vertex` | Vertex AI Anthropic configured routes |
| `GET /api/models?provider=fireworks` | Fireworks direct configured routes |
| `GET /api/models?provider=xai` | xAI direct configured routes |
| `GET /api/models?provider=cerebras` | Legacy Cerebras routes only |
| `GET /api/models?refresh=true` | Force cache refresh for discoverable providers |

### Error Handling

- Return cached data on API failure
- Log errors without leaking PHI, secrets, prompts, raw model responses, or patient identifiers
- Gracefully degrade if one non-required provider fails
