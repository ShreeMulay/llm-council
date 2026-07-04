# LLM Council - OpenCode Project

Multi-model LLM deliberation system with peer review. Queries 9 models in parallel (or 5 in compact mode), has a subset of evaluators rank responses anonymously with self-exclusion and randomized order, and synthesizes a final answer via chairman model from curated top responses.

## Quick Start

```bash
# Start backend (port 8800)
uv run python -m backend.main

# Or use the start script
./start.sh
```

## Council Models (9-Member Configuration)

| # | Model | Provider | Role | Tier | Special Settings |
|---|-------|----------|------|------|------------------|
| 1 | GPT-5.5 | OpenRouter | Anchor/Reasoning | Strong | `reasoning_effort: medium` (Stage 1), `high` (Stage 2 evaluator) |
| 2 | Claude Fable 5 | OpenRouter | Lead Coder + **Chairman** | Strong | `reasoning_effort: high`; non-PHI unless routed through a verified BAA-safe path |
| 3 | Fireworks GLM-5.2 xHigh | Fireworks Direct | Tool Specialist | Medium | Promoted by 2026-07-04 benchmark; `reasoning_effort: xhigh` |
| 4 | Gemini 3.1 Pro Preview | OpenRouter | Knowledge Generalist | Medium | - |
| 5 | Grok 4.3 | xAI Direct | Real-time Intel | Medium | xAI flagship slot |
| 6 | Kimi K2.7 Code | Fireworks Direct | Long-context/Coding Generalist | Medium | Promoted by 2026-07-04 benchmark over Kimi K2.6 |
| 7 | DeepSeek V4 Pro | OpenRouter | Code/Math Specialist | Strong | Evaluator priority #2 |
| 8 | Llama 4 Maverick | OpenRouter | Open-weight Generalist | Weak | - |
| 9 | Qwen 3.7 Max | OpenRouter | Multilingual Specialist | Medium | Refreshed production Qwen slot |

### Compact Mode (5 Models)

Use `compact: true` for faster/cheaper deliberation with core 5 models: GPT-5.5, Fable 5, GLM-5.2, Gemini 3.1 Pro, Grok 4.3.

### Deliberation Architecture

**Stage 1** — All 9 models respond in parallel (cached for 1 hour by model+prompt hash)
**Stage 2** — Top 3 evaluators rank responses (Fable 5-high, DeepSeek V4 Pro, GPT-5.5-high):
- Self-exclusion: evaluators don't rank their own response
- Randomized order: different label-to-model mapping per evaluator
- Dynamic truncation: strong models 8K, medium 10K, weak 12K (inverse allocation)
**Stage 3** — Chairman synthesizes from curated top 5 responses:
- Top 3 by consensus + 1 wildcard (high disagreement) + 1 diversity pick

### Chairman Selection

**Claude Fable 5** serves as chairman with high reasoning effort.
Safety: do not send PHI unless this model is routed through a verified BAA-safe path.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/council` | POST | Execute 3-stage council deliberation. `?format=markdown\|markdown-raw` for inline export |
| `/api/council/export` | POST | Export council result as downloadable file. `?format=markdown\|json` |
| `/api/council/stream` | POST | Stream council deliberation as SSE |
| `/api/council/async` | POST | Execute council with webhook callback (async) |
| `/api/council/jobs` | GET | List async jobs |
| `/api/council/jobs/{job_id}` | GET | Get job status |
| `/api/models` | GET | List available models (cached) |
| `/api/mcp/schema` | GET | MCP tool schema for registration |
| `/health` | GET | Health check |

## MCP Integration

The MCP server (`mcp/`) exposes `llm_council` tool:

```bash
# Install dependencies
cd mcp && npm install && npm run build

# Register in OpenCode config
```

MCP Config:
```json
{
  "mcpServers": {
    "llm-council": {
      "command": "node",
      "args": ["/path/to/llm-council/mcp/dist/index.js"],
      "env": {
        "LLM_COUNCIL_URL": "http://localhost:8800",
        "COUNCIL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## API Keys & OAuth

**OAuth (loaded from `~/.local/share/opencode/auth.json`):**
- `anthropic` - Legacy (Anthropic OAuth broken, all Claude models route through OpenRouter)

**API Keys (loaded from `~/.bash_secrets`):**
- `OPENROUTER_API_KEY` - For GPT-5.5, Claude Fable 5, Claude Opus 4.8 compatibility, Gemini, DeepSeek V4 Pro, Llama 4 Maverick, Qwen 3.7 Max, MiniMax M3 challenger, and fallbacks
- `FIREWORKS_API_KEY` - For default Fireworks GLM-5.2 xHigh and Kimi K2.7 Code routing, plus explicit legacy Kimi K2.6
- `GROK_API_KEY` - For Grok 4.3 via xAI Direct
- `CEREBRAS_API_KEY` - Legacy

## Model Aliases

Use aliases in `/council` command:
- `gpt` -> openai/gpt-5.5
- `opus` -> anthropic/claude-opus-4.8
- `glm` -> fireworks/glm-5.2 (default Fireworks GLM-5.2 xHigh)
- `glm-fw` -> fireworks/glm-5.2 (legacy alias for default GLM)
- `glm-zai` -> z-ai/glm-5.2 (explicit legacy baseline)
- `gemini` or `pro` -> google/gemini-3.1-pro-preview
- `grok` -> x-ai/grok-4.3
- `kimi` -> fireworks/kimi-k2.7-code
- `kimi26` -> fireworks/kimi-k2.6 (explicit legacy baseline)
- `deepseek` -> deepseek/deepseek-v4-pro
- `llama` -> meta-llama/llama-4-maverick
- `qwen` -> qwen/qwen3.7-max
- `fable` -> anthropic/claude-fable-5 (default chairman/member; non-PHI unless routed through a verified BAA-safe path)
- `sonnet` -> anthropic/claude-sonnet-5
- `minimax` -> minimax/minimax-m3 (explicit challenger only; Llama remains default)
- `flash` -> google/gemini-3.5-flash

## Tech Stack

- **Backend**: FastAPI, httpx, Pydantic v2, Python 3.10+
- **MCP**: TypeScript, @modelcontextprotocol/sdk
- **Storage**: JSON files in `data/conversations/`
- **Cache**: JSON in `data/cache/models.json` (24h TTL)

## Development

```bash
# Python dependencies
uv sync

# MCP dependencies
cd mcp && npm install

# Run backend
uv run python -m backend.main

# Test council endpoint
curl -X POST http://localhost:8800/api/council \
  -H "Content-Type: application/json" \
  -d '{"query": "What is quantum computing?"}'
```

## OpenSpec

See `openspec/` for detailed specifications:
- `project.md` - Project overview
- `specs/model-discovery/` - Dynamic model fetching
- `specs/council-deliberation/` - 3-stage deliberation logic
- `specs/opencode-integration/` - /council command and MCP

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
