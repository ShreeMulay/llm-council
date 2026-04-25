# API Spec: 9-Model Council

## Requirement: Council Endpoint with Compact Mode

The system SHALL support a `--compact` flag that uses only core 5 models.

### Scenario: Full 9-Model Query

- **GIVEN** user submits query without compact flag
- **WHEN** `POST /api/council` is called
- **THEN** it uses all 9 models
- **AND** proceeds through full 3-stage deliberation
- **AND** returns markdown + structured data

### Scenario: Compact Mode Query

- **GIVEN** user submits query with `compact=true`
- **WHEN** `POST /api/council` is called
- **THEN** it uses only core 5 models:
  - openai/gpt-5.5
  - anthropic/claude-opus-4.7
  - fireworks/glm-5.1
  - google/gemini-3.1-pro-preview
  - x-ai/grok-4.20-0309-reasoning
- **AND** proceeds through same 3-stage deliberation
- **AND** returns markdown + structured data

### Scenario: Final-Only Mode

- **GIVEN** user submits query with `final_only=true`
- **WHEN** `POST /api/council` is called
- **THEN** it skips Stage 2 (peer evaluation)
- **AND** chairman synthesizes directly from Stage 1 responses
- **AND** reduces latency by ~50%

## Request/Response Schema

### CouncilRequest

```python
class CouncilRequest(BaseModel):
    query: str
    final_only: bool = False
    compact: bool = False          # NEW: use core 5 models only
    models: Optional[List[str]] = None
    chairman: Optional[str] = None
    include_details: bool = True
```

### Response

```json
{
  "markdown": "## LLM Council Deliberation...",
  "stage1": [
    {"model": "...", "response": "...", "usage": {...}, "provider": "..."}
  ],
  "stage2": [
    {"model": "...", "ranking": "...", "parsed_ranking": [...], "usage": {...}}
  ],
  "stage3": {
    "model": "...",
    "response": "...",
    "usage": {...},
    "provider": "..."
  },
  "metadata": {
    "label_to_model": {...},
    "aggregate_rankings": [...],
    "final_only": false,
    "compact": false,
    "evaluators": ["anthropic/claude-opus-4.7", "deepseek/deepseek-v4-pro", "openai/gpt-5.5"],
    "curated_models": ["...", "...", "...", "...", "..."],
    "disagreement_score": 0.72,
    "confidence": "high"
  },
  "timing": {
    "elapsed_seconds": 21.3,
    "stage1_seconds": 8.1,
    "stage2_seconds": 7.2,
    "stage3_seconds": 6.0
  },
  "config": {
    "council_models": [...],
    "chairman_model": "...",
    "final_only": false,
    "compact": false
  }
}
```

## Health Endpoint

### Scenario: Health Check with 9 Models

- **GIVEN** system is running with 9-model configuration
- **WHEN** `GET /health` is called
- **THEN** it returns healthy status
- **AND** includes all 9 council models in config

## API Info Endpoint

### Scenario: Model Aliases

- **GIVEN** system is running
- **WHEN** `GET /api/info` is called
- **THEN** it returns all model aliases including new ones:
  - `kimi` -> fireworks/kimi-k2.6
  - `deepseek` -> deepseek/deepseek-v4-pro
  - `llama` -> meta-llama/llama-4-maverick
  - `qwen` -> qwen/qwen3.5-122b-a10b

## Error Handling

### Scenario: Invalid Compact Flag

- **GIVEN** user submits `compact=invalid_value`
- **WHEN** request is processed
- **THEN** it returns 422 Unprocessable Entity
- **AND** includes error detail about boolean type

### Scenario: All Models Fail

- **GIVEN** all 9 models fail to respond
- **WHEN** Stage 1 completes
- **THEN** it returns 503 Service Unavailable
- **AND** includes error message with failure details per model
