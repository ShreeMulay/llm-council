# Model Discovery Spec

## Requirement: OpenRouter Model Listing

The system SHALL dynamically fetch and cache available models from OpenRouter API.

### Scenario: Fetch OpenRouter Models

- **GIVEN** valid OPENROUTER_API_KEY from bash_secrets
- **WHEN** the `/api/models?provider=openrouter` endpoint is called
- **THEN** it returns array of model objects with:
  - `id`: Model identifier (e.g., "anthropic/claude-opus-4.6")
  - `name`: Human-readable name
  - `context_length`: Maximum tokens
  - `pricing.prompt`: Input cost per token
  - `pricing.completion`: Output cost per token
  - `supported_parameters`: Capabilities list
  - `provider`: "openrouter"

### Scenario: Cache OpenRouter Models

- **GIVEN** models previously fetched from OpenRouter
- **WHEN** subsequent requests occur within 24 hours
- **THEN** it returns cached models without API call
- **AND** cache age is validated against CACHE_TTL_SECONDS (86400)

## Requirement: Cerebras Model Listing

The system SHALL dynamically fetch and cache available models from Cerebras API.

### Scenario: Fetch Cerebras Models

- **GIVEN** valid CEREBRAS_API_KEY from bash_secrets
- **WHEN** the `/api/models?provider=cerebras` endpoint is called
- **THEN** it returns array of model objects with:
  - `id`: Model identifier (e.g., "zai-glm-4.7")
  - `owned_by`: Organization name
  - `provider`: "cerebras"
  - `pricing`: Estimated pricing metadata

### Scenario: Add Pricing to Cerebras Models

- **GIVEN** Cerebras model without pricing information
- **WHEN** model data is processed
- **THEN** it adds estimated pricing based on:
  - `llama3.1-8b`: ~$0.10/M tokens
  - `llama-3.3-70b`: ~$0.60/M tokens
  - `zai-glm-4.7`: ~$1.00/M tokens

## Requirement: Combined Model List

The system SHALL provide combined model listing from all providers.

### Scenario: Fetch All Models

- **GIVEN** both API keys are valid
- **WHEN** the `/api/models` endpoint is called
- **THEN** it returns merged list from both providers
- **AND** each model has `provider` field

### Scenario: Force Cache Refresh

- **GIVEN** cache exists with models
- **WHEN** `/api/models?refresh=true` is called
- **THEN** it bypasses cache and fetches fresh data
- **AND** updates cache with new models

## Technical Implementation

### Caching Strategy

- **Cache File**: `data/cache/models.json`
- **Cache TTL**: 86400 seconds (24 hours)
- **Cache Structure**:
  ```json
  {
    "openrouter": {
      "last_fetch": 1737062400,
      "models": [...]
    },
    "cerebras": {
      "last_fetch": 1737062400,
      "models": [...]
    }
  }
  ```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/models` | All models from both providers |
| `GET /api/models?provider=openrouter` | OpenRouter only |
| `GET /api/models?provider=cerebras` | Cerebras only |
| `GET /api/models?refresh=true` | Force cache refresh |

### Error Handling

- Return cached data on API failure
- Log errors but don't fail requests
- Graceful degradation if one provider fails
