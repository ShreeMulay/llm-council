# LLM Council - Project Overview

## Vision

Multi-model LLM deliberation system that provides more accurate, well-reasoned answers by:
1. Collecting individual responses from 4 diverse LLMs
2. Having each model rank others' responses anonymously (preventing bias)
3. Synthesizing a final answer from all inputs via chairman model

## Domain Context

When users query the system, it proceeds in 3 stages:

### Stage 1: Individual Responses
- Query all 4 council models in parallel
- Collect individual responses with usage metadata
- Continue with successful responses (graceful degradation)

### Stage 2: Peer Review (Anonymized)
- Anonymize responses as "Response A", "Response B", etc.
- Each model evaluates and ranks others' responses
- Extract structured rankings from evaluation text
- Calculate aggregate rankings across all reviewers

### Stage 3: Chairman Synthesis
- Chairman receives all responses and rankings
- Synthesizes comprehensive final answer
- Represents council's collective wisdom

## Tech Stack

### Backend
- **Runtime**: Python 3.10+
- **Framework**: FastAPI
- **HTTP Client**: httpx (async)
- **Validation**: Pydantic v2
- **Package Manager**: uv

### MCP Server
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **SDK**: @modelcontextprotocol/sdk

### Storage
- **Conversations**: JSON files in `data/conversations/`
- **Model Cache**: JSON in `data/cache/models.json`

### API Providers
- **OpenRouter**: Claude Opus, Gemini Flash, Grok
- **Cerebras**: GLM 4.7 (direct)

## Model Configuration

### Council Members (4 models)
| Model | Provider | Alias |
|-------|----------|-------|
| anthropic/claude-opus-4.6 | OpenRouter | `opus` |
| google/gemini-3-flash-preview | OpenRouter | `gemini`, `flash` |
| x-ai/grok-4.1-fast | OpenRouter | `grok` |
| zai-glm-4.7 | Cerebras | `glm` |

### Chairman
- **Model**: anthropic/claude-opus-4.6
- **Rationale**: Best synthesis and reasoning capability

## API Design

### Primary Endpoints
- `POST /api/council` - Execute deliberation, return markdown
- `GET /api/models` - List available models with caching
- `GET /api/mcp/schema` - MCP tool registration schema

### Integration Points
- OpenCode `/council` command via MCP tool
- Direct API access via HTTP
- Legacy GUI support (maintained for reference)

## Security

- API keys loaded from `~/.bash_secrets` (not committed)
- No secrets in code or environment files
- CORS enabled for all origins (local development)

## Performance Considerations

- Parallel API calls to all providers
- 24-hour model cache to reduce API calls
- Graceful degradation on model failures
- Timeout handling (120s default)
