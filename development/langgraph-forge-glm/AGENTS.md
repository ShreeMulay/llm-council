# LangGraph Forge - AI Agent Rules

## Project Overview

Interactive learning platform for LangGraph with tutorials, playground, and graph visualization.

## Beads Issue Tracking (MANDATORY)

Use `bd` for ALL task tracking:

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Tech Stack

### Frontend (Bun + React)
- **React 19** - Use function components, hooks
- **Shadcn/ui v4** - Use MCP server for component lookup
- **Tailwind v4** - CSS-first configuration
- **Zustand** - Client state
- **TanStack Query** - Server state, caching
- **React Flow** - Graph visualization
- **Monaco Editor** - Code editing
- **Vitest** - Unit/integration tests
- **Playwright** - E2E tests

### Backend (Python + FastAPI)
- **FastAPI** - Async API endpoints
- **LangGraph** - Core library being taught
- **pytest** - All testing
- **httpx** - Async HTTP client for provider APIs

## Development Rules

### TDD - Test-Driven Development (CRITICAL)

1. **Write tests FIRST** - Before any implementation
2. **Tests must pass** - Never commit with failing tests
3. **Run full suite** - Before every commit

```bash
# Backend
cd backend && uv run pytest -v

# Frontend
cd frontend && bun test

# Both (must pass before commit)
make test-all
```

### Code Style

#### TypeScript/React
```typescript
// Use interfaces, not types
interface Props {
  title: string
}

// Function declarations for components
export function Component({ title }: Props) {
  return <div>{title}</div>
}

// Zustand stores
export const useStore = create<StoreType>()((set) => ({
  value: null,
  setValue: (v) => set({ value: v }),
}))
```

#### Python
```python
# Use Pydantic models for API
from pydantic import BaseModel

class ExecuteRequest(BaseModel):
    provider: str
    model: str
    code: str

# Async endpoints
@router.post("/execute")
async def execute(request: ExecuteRequest) -> ExecuteResponse:
    ...
```

### File Organization

- **Co-locate tests**: `component.tsx` + `component.test.tsx`
- **One component per file**: Keep files focused
- **Shared types in `/shared/types/`**: API contracts

## API Contracts

### POST /api/execute
```typescript
// Request
interface ExecuteRequest {
  provider: "openrouter" | "cerebras" | "fireworks"
  model: string
  code: string
}

// Response
interface ExecuteResponse {
  success: boolean
  output: string
  error?: string
  metrics: {
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    durationMs: number
    tokensPerSecond: number
    costUsd: number
  }
  graphStructure?: {
    nodes: Array<{ id: string; type: string }>
    edges: Array<{ source: string; target: string; condition?: string }>
  }
}
```

### GET /api/models?provider=X
```typescript
interface ModelsResponse {
  provider: string
  models: Array<{
    id: string
    name: string
    contextLength: number
    inputPricePerMillion: number
    outputPricePerMillion: number
  }>
}
```

## Theming

7 color schemes available via CSS custom properties:
- light, dark (base)
- midnight, forest, ocean, sunset (extended)
- high-contrast (accessibility)

Use semantic color variables:
```css
var(--background)
var(--foreground)
var(--primary)
var(--muted)
var(--error)
var(--success)
```

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
