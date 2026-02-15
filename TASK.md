# TASK: Update LLM Council to 6-Model Lineup

## New Council Lineup

| Model | Primary Provider | Model ID | Fallback |
|-------|-----------------|----------|----------|
| Claude Opus 4.6 | Anthropic Direct (existing client) | anthropic/claude-opus-4-6 | OpenRouter |
| GLM 4.7 | Cerebras Direct (existing client) | zai-glm-4.7 | OpenRouter |
| Gemini Flash 3.0 | Google Direct (new client) | google/gemini-3-flash | OpenRouter |
| Grok 4 | xAI Direct (new client) | x-ai/grok-4 | OpenRouter |
| Kimi K2.5 | Moonshot Direct (new client) | moonshot/kimi-k2.5 | OpenRouter |
| DeepSeek V3.1 | OpenRouter only | deepseek/deepseek-chat | none |

Chairman: Claude Opus 4.6

## What to Do

1. Update backend/config.py with new model list and chairman
2. Update backend/secrets.py to import MOONSHOT, GROK, and GEMINI keys from env
3. Create backend/moonshot_client.py (OpenAI-compatible, api.moonshot.ai)
4. Create backend/xai_client.py (OpenAI-compatible, api.x.ai)
5. Create backend/gemini_client.py (Google AI REST API, generativelanguage.googleapis.com)
6. Update backend/council.py with new routing and OpenRouter fallback for all models
7. Update mcp/src/index.ts tool description

See existing cerebras.py and anthropic_client.py for client patterns.
See existing config.py for model ID lists and routing patterns.

All env vars are already set. Test with uv run python import.

When done run: openclaw gateway wake --text "Done: Council updated" --mode now
