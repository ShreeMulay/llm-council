# Config Spec: 9-Model Council

## Requirement: Model Configuration

The system SHALL support 9 council models with provider-specific routing.

### Scenario: Resolve Model Aliases

- **GIVEN** a model alias string
- **WHEN** `resolve_model_alias()` is called
- **THEN** it returns the full model ID
- **AND** supports aliases: `gpt`, `opus`, `glm`, `gemini`, `pro`, `grok`, `kimi`, `deepseek`, `llama`, `qwen`, `sonnet`, `flash`

### Scenario: Dual-Mode Reasoning Effort

- **GIVEN** GPT-5.5 is configured for dual-mode operation
- **WHEN** requesting reasoning effort for Stage 1 (responder)
- **THEN** it returns `medium`
- **AND** when requesting for Stage 2 (evaluator)
- **THEN** it returns `high`

### Scenario: Tiered Truncation Allocation

- **GIVEN** 9 models in the council
- **WHEN** `calculate_max_response_chars()` is called with model tier
- **THEN** strong models (opus, gpt-5.5, deepseek) return 8,000
- **AND** medium models (gemini, grok, kimi) return 10,000
- **AND** weaker models (glm-5.1, llama-4, qwen-3.5) return 12,000
- **AND** with 5 models (compact mode), all return 12,000

### Scenario: Evaluator Priority List

- **GIVEN** the evaluator priority list is configured
- **WHEN** `get_evaluator_models()` is called with active council models
- **THEN** it returns the top 3 models from the priority list that are present in the council
- **AND** excludes models that are not in the active council

## Technical Implementation

```python
DEFAULT_COUNCIL_MODELS = [
    "openai/gpt-5.5",                    # Anchor/Fast Thinker
    "anthropic/claude-opus-4.7",          # Lead Coder + Chairman
    "fireworks/glm-5.1",                  # Tool Specialist
    "google/gemini-3.1-pro-preview",      # Knowledge Generalist
    "x-ai/grok-4.20-0309-reasoning",      # Real-time Intel
    "fireworks/kimi-k2.6",                # Long-Context Specialist
    "deepseek/deepseek-v4-pro",           # Deep Reasoner
    "meta-llama/llama-4-maverick",        # Open-Weights Leader
    "qwen/qwen3.5-122b-a10b",           # Agentic/Tools Expert
]

EVALUATOR_PRIORITY = [
    "anthropic/claude-opus-4.7",
    "deepseek/deepseek-v4-pro",
    "openai/gpt-5.5",
]

TIERED_TRUNCATION = {
    "strong": ["anthropic/claude-opus-4.7", "openai/gpt-5.5", "deepseek/deepseek-v4-pro"],
    "medium": ["google/gemini-3.1-pro-preview", "x-ai/grok-4.20-0309-reasoning", "fireworks/kimi-k2.6"],
    "weak": ["fireworks/glm-5.1", "meta-llama/llama-4-maverick", "qwen/qwen3.5-122b-a10b"],
}

TRUNCATION_LIMITS = {
    "strong": 8000,
    "medium": 10000,
    "weak": 12000,
}
```

## Fireworks Model IDs

```python
FIREWORKS_MODEL_IDS = [
    "fireworks/glm-5.1",
    "fireworks/glm-5",
    "fireworks/kimi-k2.6",
]

FIREWORKS_MODEL_MAP = {
    "fireworks/glm-5.1": "accounts/fireworks/models/glm-5p1",
    "fireworks/glm-5": "accounts/fireworks/models/glm-5",
    "fireworks/kimi-k2.6": "accounts/fireworks/models/kimi-k2p6",
}
```

## OpenRouter Fallback Map

```python
OPENROUTER_FALLBACK_MAP = {
    "openai/gpt-5.5": "openai/gpt-5.5",
    "anthropic/claude-opus-4.7": "anthropic/claude-opus-4.7",
    "fireworks/glm-5.1": "z-ai/glm-5.1",
    "fireworks/glm-5": "z-ai/glm-5",
    "google/gemini-3.1-pro-preview": "google/gemini-3.1-pro-preview",
    "x-ai/grok-4.20-0309-reasoning": "x-ai/grok-4.20",
    "fireworks/kimi-k2.6": "moonshotai/kimi-k2.6",
    "deepseek/deepseek-v4-pro": "deepseek/deepseek-v4-pro",
    "meta-llama/llama-4-maverick": "meta-llama/llama-4-maverick",
    "qwen/qwen3.5-122b-a10b": "qwen/qwen3.5-122b-a10b",
}
```

## Model Aliases

```python
MODEL_ALIASES = {
    "gpt": "openai/gpt-5.5",
    "opus": "anthropic/claude-opus-4.7",
    "glm": "fireworks/glm-5.1",
    "gemini": "google/gemini-3.1-pro-preview",
    "pro": "google/gemini-3.1-pro-preview",
    "grok": "x-ai/grok-4.20-0309-reasoning",
    "kimi": "fireworks/kimi-k2.6",
    "deepseek": "deepseek/deepseek-v4-pro",
    "llama": "meta-llama/llama-4-maverick",
    "qwen": "qwen/qwen3.5-122b-a10b",
    "sonnet": "anthropic/claude-sonnet-4.5",
    "flash": "google/gemini-3-flash-preview",
}
```

## Reasoning Effort Map

```python
MODEL_REASONING_EFFORT = {
    "openai/gpt-5.5": "medium",           # Stage 1 default
    "openai/gpt-5.5-evaluator": "high",   # Stage 2 override
    "anthropic/claude-opus-4.7": "xhigh",
}
```
