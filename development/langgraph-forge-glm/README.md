# LangGraph Forge

An interactive learning platform for mastering LangGraph through hands-on tutorials and a live playground with real-time graph visualization.

## Features

- **Interactive Tutorials** - Guided lessons with 5 progressively complex examples, progress tracking
  - Level 1 Basics: Hello State, Two Nodes, LLM Node, Conditional Edge, Simple Agent
  - Real-time progress indicator tracking completed examples
  - Difficulty badges and estimated reading times for each lesson
- **Live Playground** - Free-form code editor with execution and graph visualization
- **Multi-Provider Support** - OpenRouter, Cerebras, Fireworks AI with dynamic model lists
- **Rich Metrics** - Token usage, cost, speed (tokens/sec)
- **7 Color Themes** - Light, Dark, Midnight, Forest, Ocean, Sunset, High Contrast

### Tutorial Navigation

- **Home Page** (`/`) - Overview with link to start tutorial
- **Tutorial Page** (`/tutorial`) - Complete example list with progress tracking

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (for frontend)
- [uv](https://docs.astral.sh/uv/) (for Python backend)
- API key for at least one provider (OpenRouter, Cerebras, or Fireworks AI)

### Setup

1. Clone and install dependencies:

```bash
cd langgraph-forge
make install
```

2. Configure API keys:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your API keys
```

3. Start development servers:

```bash
make dev
```

4. Open http://localhost:5173

## Development

### Running Tests

```bash
# All tests (required before commit)
make test-all

# Backend only
make test-backend

# Frontend only  
make test-frontend

# E2E tests
make test-e2e
```

### Project Structure

```
langgraph-forge/
├── frontend/           # React 19 + Vite + Bun
├── backend/            # FastAPI + LangGraph
├── examples/           # Tutorial examples
├── shared/             # Shared TypeScript types
├── openspec/           # Project specifications
└── .beads/             # Issue tracking
```

## Tech Stack

### Frontend
- React 19, Shadcn/ui v4, Tailwind v4
- React Flow (graph visualization)
- Monaco Editor (code editing)
- Zustand (state), TanStack Query (server state)

### Backend
- FastAPI, LangGraph
- OpenRouter, Cerebras, Fireworks AI providers

## License

MIT
