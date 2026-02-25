# LLM Council - OpenCode Project

Multi-model LLM deliberation system with peer review. Queries 7 models in parallel, has them rank each other's responses anonymously, and synthesizes a final answer via chairman model.

## Quick Start

```bash
# Start backend (port 8800)
uv run python -m backend.main

# Or use the start script
./start.sh
```

## Council Models (7-Member Configuration)

| Model | Provider | Role | Special Settings |
|-------|----------|------|------------------|
| GPT-5.2 | OpenRouter | Anchor/Reasoning | `reasoningEffort: high` |
| Claude Opus 4.6 | Anthropic OAuth | Lead Coder + **Chairman** | - |
| Kimi K2.5 | Fireworks Direct | Reasoning | 200 tok/s, 3.4x faster than OR |
| GLM-5 | Fireworks Direct | Tool Specialist | Highest output speed (AA) |
| Gemini 3.1 Pro Preview | OpenRouter | Knowledge Generalist | - |
| DeepSeek V3.2 | OpenRouter | Architect/Reasoner | - |
| Grok 4.1 Fast | OpenRouter | Real-time Intel | `reasoning: disabled` |

### Chairman Selection (LLM Council Decision)

**Claude Opus 4.6** was selected as chairman by unanimous council vote (4-0).

Key reasoning:
- **Synthesis > Reasoning**: Chairman's job is to integrate perspectives, not be the smartest
- **Constitutional AI**: Reduces self-preference bias vs performance-optimized models
- **"Strong but not supreme"**: 80.9% SWE-bench means technical depth without "Tyranny of the Expert"
- **Separation of powers**: GPT-5.2 as Visionary, Claude as Judge

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/council` | POST | Execute 3-stage council deliberation |
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
        "LLM_COUNCIL_URL": "http://localhost:8800"
      }
    }
  }
}
```

## API Keys & OAuth

**OAuth (loaded from `~/.local/share/opencode/auth.json`):**
- `openai` / `codex` - For GPT-5.2 via Codex OAuth
- `anthropic` - For Claude Opus 4.6 via Anthropic OAuth

**API Keys (loaded from `~/.bash_secrets`):**
- `OPENROUTER_API_KEY` - For GPT-5.2, Gemini, DeepSeek, Grok (+ fallback)
- `FIREWORKS_API_KEY` - For Kimi K2.5, GLM-5 (primary, 3.4x faster)
- `CEREBRAS_API_KEY` - Legacy (GLM 4.7 if needed)

## Model Aliases

Use aliases in `/council` command:
- `gpt` -> openai/gpt-5.2
- `opus` -> anthropic/claude-opus-4.6
- `kimi` -> fireworks/kimi-k2.5
- `glm` -> fireworks/glm-5
- `gemini` or `pro` -> google/gemini-3.1-pro-preview
- `deepseek` -> deepseek/deepseek-v3.2
- `grok` -> x-ai/grok-4.1-fast
- `sonnet` -> anthropic/claude-sonnet-4.5
- `flash` -> google/gemini-3-flash-preview (backward compat)

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
