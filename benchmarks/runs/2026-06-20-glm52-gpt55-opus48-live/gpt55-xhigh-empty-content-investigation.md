# GPT-5.5 xhigh Empty-Content Investigation

Source run: `2026-06-20-glm52-gpt55-opus48-live`
Prompt: `debugging-async-001`
Model: `openai/gpt-5.5` via OpenRouter
Reasoning effort: `xhigh`
Fallbacks: disabled; provider order forced to `openai`.

## Probe results

| Max tokens | HTTP | Finish reason | Native finish | Total tokens | Reasoning tokens | Visible chars | Conclusion |
|---:|---:|---|---|---:|---:|---:|---|
| 4096 | 200 | `length` | `max_output_tokens` | 4153 | 4096 | 0 | empty visible output |
| 8192 | 200 | `stop` | `completed` | 8248 | 6732 | 6420 | visible output |

## Finding

The failed benchmark row is consistent with reasoning-token budget exhaustion: GPT-5.5 xhigh can spend the output cap on reasoning before producing visible `message.content`. OpenRouter reports reasoning tokens under `usage.completion_tokens_details.reasoning_tokens`; there is no alternate visible response field to recover as final content for the empty row.

## Recommendation

- Do not make GPT-5.5 xhigh a default benchmark/council setting at 4096 max tokens.
- For xhigh probes, use a materially larger output cap or lower the reasoning effort to high/medium.
- Treat `empty_content` with `finish_reason=length` and high reasoning-token usage as a limited-variant/budget-exhaustion condition, not a parser failure.
