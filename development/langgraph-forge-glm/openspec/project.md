# LangGraph Forge

## Vision

**One-liner**: A comprehensive, interactive learning platform for mastering LangGraph through hands-on tutorials and a live playground with real-time graph visualization.

**Problem**: Learning LangGraph is challenging because existing resources are scattered, lack interactivity, and don't let you see how graphs execute in real-time. Developers need a unified place to learn concepts progressively AND experiment freely.

**Users**: Developers who know LLMs and want to master LangGraph - from basics through production patterns.

## Core Features (v1)

1. **Interactive Tutorials** - Guided lessons with runnable examples, progress tracking, prerequisites
2. **Live Playground** - Free-form code editor with execution, React Flow graph visualization, metrics display  
3. **Multi-Provider Support** - OpenRouter, Cerebras, Fireworks AI with dynamic model lists and pricing
4. **Rich Feedback** - Token usage, cost, speed metrics; three-level error display with fix suggestions

## Tech Stack

### Frontend
- **Runtime**: Bun
- **Framework**: React 19 with Server Components
- **Components**: Shadcn/ui v4
- **Styling**: Tailwind CSS v4
- **State**: Zustand (client), TanStack Query (server)
- **Code Editor**: Monaco Editor
- **Graph Visualization**: React Flow (Xyflow)
- **Testing**: Vitest, Playwright

### Backend
- **Framework**: FastAPI (Python)
- **LLM Orchestration**: LangGraph
- **Testing**: pytest

### Providers
- OpenRouter (meta-provider, 200+ models)
- Cerebras (speed-focused, Llama models)
- Fireworks AI (balanced speed/variety)

## Constraints

- Local-only deployment
- TDD approach (tests first, all tests must pass)
- ~5 day MVP timeline
- Multiple color themes (7 themes)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Bun)                      │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │       Tutorials         │  │       Playground        │   │
│  │  • Guided lessons       │  │  • Code editor          │   │
│  │  • Progress tracking    │  │  • Graph visualization  │   │
│  │  • Prerequisites        │  │  • Metrics display      │   │
│  └───────────┬─────────────┘  └───────────┬─────────────┘   │
└──────────────┼────────────────────────────┼─────────────────┘
               │                            │
               └────────────┬───────────────┘
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI Backend (Python)                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  /api/execute                           ││
│  │  • Run LangGraph code in sandbox                        ││
│  │  • Return output, metrics, graph structure              ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  /api/models                            ││
│  │  • Dynamic model lists (cached)                         ││
│  │  • Pricing from provider APIs                           ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ OpenRouter  │ │  Cerebras   │ │  Fireworks  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Content Levels

| Level | Focus | Examples |
|-------|-------|----------|
| 1 | Basics | State, Nodes, Edges, Simple Graphs |
| 2 | Intermediate | Conditional Routing, Checkpoints, Human-in-Loop |
| 3 | Advanced | Multi-Agent, Subgraphs, Streaming |
| 4 | Production | Deployment, Monitoring, Testing |

## Success Criteria

- [ ] Can run LangGraph code from browser
- [ ] See graph visualization of execution
- [ ] Switch between providers/models
- [ ] View token usage and costs
- [ ] Complete Level 1 tutorials
- [ ] All tests pass
