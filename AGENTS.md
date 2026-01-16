# LLM Council - OpenCode Project

Multi-model LLM deliberation system with peer review. Queries 4 models in parallel, has them rank each other's responses anonymously, and synthesizes a final answer via chairman model.

## Quick Start

```bash
# Start backend (port 8800)
uv run python -m backend.main

# Or use the start script
./start.sh
```

## Council Models

| Model | Provider | Purpose |
|-------|----------|---------|
| Claude Opus 4.5 | OpenRouter (Anthropic) | Council + Chairman |
| Gemini Flash 3.0 Preview | OpenRouter (Google) | Council |
| Grok 4.1 Fast | OpenRouter (xAI) | Council |
| GLM 4.7 | Cerebras Direct | Council |

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

## API Keys

Loaded from `~/.bash_secrets`:
- `OPENROUTER_API_KEY` - For Opus, Gemini, Grok
- `CEREBRAS_API_KEY` - For GLM 4.7

## Model Aliases

Use aliases in `/council` command:
- `opus` -> anthropic/claude-opus-4.5
- `gemini` or `flash` -> google/gemini-3-flash-preview
- `grok` -> x-ai/grok-4.1-fast
- `glm` -> zai-glm-4.7
- `sonnet` -> anthropic/claude-3.5-sonnet

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
