# Council Deliberation Spec

## Requirement: Stage 1 - Collect First Opinions

The system SHALL query all configured council models in parallel.

### Scenario: Successful Stage 1

- **GIVEN** 4 council models configured
- **WHEN** user submits query
- **THEN** it makes parallel async calls to all models
- **AND** returns responses within 120 seconds (timeout)
- **AND** includes usage metadata (tokens, provider)

### Scenario: Partial Model Failure

- **GIVEN** 4 council models configured
- **WHEN** 1 model fails to respond
- **THEN** it continues with 3 successful responses
- **AND** logs the failure but doesn't abort

### Scenario: All Models Fail

- **GIVEN** all models fail to respond
- **WHEN** Stage 1 completes
- **THEN** it returns error message to user
- **AND** does not proceed to Stage 2

## Requirement: Stage 2 - Peer Review (Anonymized)

The system SHALL have each model evaluate and rank others' responses anonymously.

### Scenario: Anonymized Ranking

- **GIVEN** 4 model responses from Stage 1
- **WHEN** Stage 2 begins
- **THEN** it assigns anonymous labels: "Response A", "Response B", "Response C", "Response D"
- **AND** creates `label_to_model` mapping for de-anonymization
- **AND** sends evaluation prompt with anonymous responses

### Scenario: Extract Rankings

- **GIVEN** model evaluation text with "FINAL RANKING:" section
- **WHEN** parsing rankings
- **THEN** it extracts ordered list from numbered format (e.g., "1. Response C")
- **AND** falls back to pattern matching if format varies

### Scenario: Aggregate Rankings

- **GIVEN** 4 model rankings
- **WHEN** aggregating
- **THEN** it calculates average position for each response
- **AND** sorts by average rank (lower is better)
- **AND** includes vote count for each model

## Requirement: Stage 3 - Chairman Synthesis

The system SHALL have chairman model synthesize final response.

### Scenario: Full Context Synthesis

- **GIVEN** Stage 1 responses and Stage 2 rankings
- **WHEN** Stage 3 begins
- **THEN** chairman receives:
  - Original query
  - All model responses with model names
  - All peer evaluations with rankings
- **AND** synthesizes comprehensive final answer

### Scenario: Final-Only Mode

- **GIVEN** `final_only=true` flag
- **WHEN** running council
- **THEN** it skips Stage 2 entirely
- **AND** chairman synthesizes from Stage 1 only
- **AND** reduces total latency significantly

## Requirement: Multi-Provider Routing

The system SHALL route queries to appropriate API providers.

### Scenario: Route to Cerebras

- **GIVEN** model ID matches Cerebras model (e.g., "zai-glm-4.7")
- **WHEN** querying model
- **THEN** it uses Cerebras API endpoint
- **AND** uses CEREBRAS_API_KEY for authentication

### Scenario: Route to OpenRouter

- **GIVEN** model ID does not match Cerebras models
- **WHEN** querying model
- **THEN** it uses OpenRouter API endpoint
- **AND** uses OPENROUTER_API_KEY for authentication

## Technical Implementation

### Council Configuration

```python
DEFAULT_COUNCIL_MODELS = [
    "anthropic/claude-opus-4.6",      # OpenRouter
    "google/gemini-3-flash-preview",  # OpenRouter
    "x-ai/grok-4.1-fast",             # OpenRouter
    "zai-glm-4.7",                    # Cerebras
]

DEFAULT_CHAIRMAN_MODEL = "anthropic/claude-opus-4.6"
```

### Cerebras Model IDs

```python
CEREBRAS_MODEL_IDS = [
    "zai-glm-4.6",
    "zai-glm-4.7",
    "llama3.1-8b",
    "llama-3.3-70b",
    "qwen-3-32b",
    "gpt-oss-120b",
]
```

### Ranking Prompt Format

The Stage 2 prompt requires specific output format:
- Evaluation for each response
- "FINAL RANKING:" header
- Numbered list: "1. Response X"

### Response Structure

```python
{
    "stage1": [
        {"model": "...", "response": "...", "usage": {...}, "provider": "..."}
    ],
    "stage2": [
        {"model": "...", "ranking": "...", "parsed_ranking": [...]}
    ],
    "stage3": {
        "model": "...", "response": "...", "usage": {...}
    },
    "metadata": {
        "label_to_model": {"Response A": "model_id"},
        "aggregate_rankings": [{"model": "...", "average_rank": 1.5}]
    }
}
```
