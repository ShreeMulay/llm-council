# OpenCode Integration Spec

## Requirement: /council Command

The system SHALL provide a `/council` command for explicit invocation of LLM Council deliberation.

### Scenario: Basic Council Invocation

- **GIVEN** user invokes `/council <query>`
- **WHEN** the command is processed
- **THEN** it executes 3-stage council deliberation
- **AND** returns structured markdown with:
  - Stage 1 responses (expandable details)
  - Stage 2 rankings table + evaluations
  - Stage 3 final synthesis
- **AND** includes timing and token usage

### Scenario: Final-Only Flag

- **GIVEN** user invokes `/council --final-only <query>`
- **WHEN** the command is processed
- **THEN** it skips Stage 2 (peer review)
- **AND** returns only Stage 1 responses + Stage 3 synthesis
- **AND** reduces latency by ~40%

### Scenario: Custom Models

- **GIVEN** user invokes `/council --models opus,gemini <query>`
- **WHEN** the command is processed
- **THEN** it resolves model aliases to full IDs
- **AND** uses only specified models for deliberation

## Requirement: MCP Tool Integration

The system SHALL expose LLM Council as an MCP tool for conditional invocation.

### Scenario: LLM Calls Council Tool

- **GIVEN** MCP tool `llm_council` is registered
- **WHEN** LLM calls tool with query parameter
- **THEN** it executes council deliberation via backend API
- **AND** returns formatted markdown response
- **AND** includes error handling for backend failures

### Scenario: Backend Unavailable

- **GIVEN** backend is not running
- **WHEN** MCP tool is invoked
- **THEN** it returns error message with instructions
- **AND** does not hang or timeout silently

## Technical Implementation

### Model Name Aliases

| Alias | Full Model ID |
|-------|---------------|
| `gpt` | openai/gpt-5.5 |
| `opus` | anthropic/claude-opus-4.8 |
| `glm` | fireworks/glm-5.2 |
| `glm-fw` | fireworks/glm-5.2 (legacy alias for default Fireworks GLM xHigh) |
| `glm-zai` | z-ai/glm-5.2 (explicit legacy baseline) |
| `fable` | anthropic/claude-fable-5 (default production council member/chairman; non-PHI unless verified BAA-safe route) |
| `gemini`, `pro` | google/gemini-3.1-pro-preview |
| `grok` | x-ai/grok-4.3 |
| `kimi` | fireworks/kimi-k2.7-code |
| `kimi26` | fireworks/kimi-k2.6 (explicit legacy baseline) |
| `deepseek` | deepseek/deepseek-v4-pro |
| `llama` | meta-llama/llama-4-maverick |
| `qwen` | qwen/qwen3.7-max |
| `sonnet` | anthropic/claude-sonnet-5 (explicit alias only; not default) |
| `minimax` | minimax/minimax-m3 (explicit challenger only) |
| `flash` | google/gemini-3.5-flash |

### API Endpoint

```
POST /api/council
Content-Type: application/json

{
  "query": "string (required)",
  "final_only": "boolean (default: false)",
  "models": "string[] (optional)",
  "chairman": "string (optional)",
  "include_details": "boolean (default: true)"
}
```

### Response Format

```json
{
  "markdown": "## LLM Council Deliberation...",
  "stage1": [...],
  "stage2": [...],
  "stage3": {...},
  "metadata": {
    "label_to_model": {...},
    "aggregate_rankings": [...]
  },
  "timing": {
    "elapsed_seconds": 23.4
  },
  "config": {
    "council_models": [...],
    "chairman_model": "...",
    "final_only": false
  }
}
```

### MCP Tool Schema

```json
{
  "name": "llm_council",
  "description": "Consult multiple LLMs for peer-reviewed answers",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {"type": "string"},
      "final_only": {"type": "boolean", "default": false},
      "include_details": {"type": "boolean", "default": true}
    },
    "required": ["query"]
  }
}
```
