# LLM Council - Project Overview

## Vision

Multi-model LLM deliberation system that provides more accurate, well-reasoned answers by:
1. Collecting individual responses from a 9-model production council, or a 5-model compact council
2. Having selected evaluator models rank others' responses anonymously with self-exclusion and randomized order
3. Synthesizing a final answer from curated top responses via the chairman model

## Domain Context

When users query the system, it proceeds in 3 stages:

### Stage 1: Individual Responses
- Query the configured council models in parallel
- Collect individual responses with usage metadata
- Continue with successful responses (graceful degradation)

### Stage 2: Peer Review (Anonymized)
- Anonymize responses as "Response A", "Response B", etc.
- Selected evaluator models rank responses without seeing model identities
- Evaluators SHALL NOT rank their own response
- Extract structured rankings from evaluation text
- Calculate aggregate rankings across reviewers

### Stage 3: Chairman Synthesis
- Chairman receives curated top responses and ranking metadata
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
- **Runtime**: Node.js 22.12+
- **Language**: TypeScript
- **SDK**: @modelcontextprotocol/sdk

### Storage
- **Conversations**: JSON files in `data/conversations/`
- **Model Cache**: JSON in `data/cache/models.json`

### API Providers
- **OpenRouter**: GPT-5.6 Sol, Gemini 3.1 Pro Preview, DeepSeek V4 Pro, Llama 4 Maverick, Qwen 3.7 Max, and non-PHI/deidentified fallbacks
- **Vertex AI Anthropic**: Claude Fable 5 default/chairman through the covered Google/Vertex BAA route in `shree-development`
- **Fireworks Direct**: GLM-5.2 and Kimi K2.7 Code
- **xAI Direct**: Grok 4.5
- **Cerebras**: Legacy/non-production explicit routes only; not part of the current production roster

## Model Configuration

### Production Council Members (9 models)
| # | Model | Provider | Alias |
|---|-------|----------|-------|
| 1 | `openai/gpt-5.6-sol` | OpenRouter | `gpt` |
| 2 | `anthropic/claude-fable-5` | Vertex AI Anthropic in `shree-development`; OpenRouter fallback is non-PHI/deidentified only | `fable` |
| 3 | `fireworks/glm-5.2` | Fireworks direct | `glm`, `glm-fw` |
| 4 | `google/gemini-3.1-pro-preview` | OpenRouter | `gemini`, `pro` |
| 5 | `x-ai/grok-4.5` | xAI direct | `grok` |
| 6 | `fireworks/kimi-k2.7-code` | Fireworks direct | `kimi` |
| 7 | `deepseek/deepseek-v4-pro` | OpenRouter | `deepseek` |
| 8 | `meta-llama/llama-4-maverick` | OpenRouter | `llama` |
| 9 | `qwen/qwen3.7-max` | OpenRouter | `qwen` |

### Compact Council Members (5 models)
- `openai/gpt-5.6-sol`
- `anthropic/claude-fable-5`
- `fireworks/glm-5.2`
- `google/gemini-3.1-pro-preview`
- `x-ai/grok-4.5`

### Chairman
- **Model**: `anthropic/claude-fable-5`
- **Provider**: Vertex AI Anthropic in `shree-development`
- **Rationale**: Default production synthesis and reasoning capability with high effort through Vertex AI Anthropic

## BAA / PHI Route Attestation

- `shree-development` is BAA-covered per Shree on 2026-07-04.
- Fable via Vertex AI Anthropic in `shree-development` with `REQUIRE_VERTEX_ANTHROPIC=true` is PHI-eligible.
- Fable via OpenRouter is non-PHI/deidentified only and MUST NOT receive PHI.
- Other OpenRouter routes are non-PHI/deidentified only unless separately attested and documented.

## API Design

### Primary Endpoints
- `POST /api/council` - Execute deliberation, return markdown
- `POST /api/council/export` - Export council result
- `POST /api/council/stream` - Stream council deliberation as SSE
- `POST /api/council/async` - Execute council with webhook callback
- `GET /api/models` - List available models with caching
- `GET /api/mcp/schema` - MCP tool registration schema
- `GET /health` - Health check

### Integration Points
- OpenCode `/council` command via MCP tool
- Direct API access via HTTP
- Legacy GUI support (maintained for reference)

## Security

- API keys loaded from `~/.bash_secrets` or deployment secret manager (not committed)
- No secrets in code or environment files
- PHI eligibility is route-conditional; OpenRouter is non-PHI/deidentified only
- `REQUIRE_VERTEX_ANTHROPIC=true` MUST be set in covered deployments that process PHI through Fable
- Production deploys MUST preserve `VERTEX_PROJECT_ID=shree-development`, `VERTEX_LOCATION=global`, and `REQUIRE_VERTEX_ANTHROPIC=true`.
- Post-deploy verification MUST validate the semantic `/health` contract: exact ordered production, compact, and evaluator rosters; Fable chairman and Vertex route; strict Vertex configuration; and promoted GPT-5.6 Sol/Grok 4.5 IDs. HTTP status alone is insufficient.
- CORS enabled for local development

## Performance Considerations

- Parallel API calls to all providers
- 24-hour model cache to reduce API calls
- Graceful degradation on model failures
- Timeout handling (120s default)
