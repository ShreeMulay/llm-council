# OpenSpec Proposal: Initial Build

**Change ID**: initial-build  
**Status**: APPROVED  
**Created**: 2025-01-10  
**Approved**: 2025-01-10  
**Author**: AI Assistant  

## Summary

Build the MVP of LangGraph Forge - an interactive learning platform with tutorials and a playground for experimenting with LangGraph.

## Motivation

Developers learning LangGraph need:
1. A structured curriculum that builds knowledge progressively
2. The ability to run real LangGraph code and see results
3. Visual representation of graph execution
4. Comparison of different LLM providers (speed, cost)

## Scope

### In Scope (MVP)
- Backend: FastAPI with provider abstraction, execution sandbox
- Frontend: React app with tutorials and playground
- Providers: OpenRouter, Cerebras, Fireworks AI
- Content: 5 Level 1 examples
- Visualization: React Flow graph display
- Metrics: Token usage, cost, speed
- Themes: 7 color schemes
- Testing: Full TDD coverage

### Out of Scope (Post-MVP)
- Levels 2-4 content
- User accounts / cloud persistence
- Animated execution visualization
- Streaming token display
- Save/load user code

## Technical Approach

### Phase 1: Backend Foundation
1. Set up FastAPI project structure
2. Implement provider abstraction (base class)
3. Implement OpenRouter provider (tests first)
4. Implement Cerebras provider (tests first)
5. Implement Fireworks provider (tests first)
6. Implement model caching layer
7. Implement /api/health endpoint
8. Implement /api/models endpoint

### Phase 2: Frontend Foundation
1. Set up React 19 + Vite + Bun project
2. Configure Shadcn/ui v4 and Tailwind v4
3. Implement theme system (7 themes)
4. Create layout components
5. Implement provider/model selector
6. Implement Monaco code editor wrapper
7. Create Zustand stores

### Phase 3: Integration
1. Implement /api/execute endpoint
2. Implement code parser for graph structure
3. Implement error analyzer with suggestions
4. Connect frontend to backend
5. Implement useExecute hook
6. Create output panel with error display

### Phase 4: Full Features
1. Implement React Flow graph visualization
2. Create custom node types (start, end, llm, tool)
3. Create custom edge types (conditional)
4. Implement auto-layout with dagre
5. Create metrics panel
6. Build playground page

### Phase 5: Content & Polish
1. Create 5 Level 1 examples with explanations
2. Build tutorial page with example navigation
3. Implement progress tracking
4. Add example metadata (prerequisites, difficulty)
5. E2E tests for key flows
6. Documentation

## API Contracts

See AGENTS.md for full API specifications.

## Success Criteria

- [ ] All tests pass (backend + frontend + E2E)
- [ ] Can select provider and model from dynamic list
- [ ] Can run LangGraph code and see output
- [ ] Graph visualization displays correctly
- [ ] Metrics show tokens, cost, speed
- [ ] Errors show message, traceback, and suggestions
- [ ] All 7 themes work correctly
- [ ] 5 Level 1 examples are complete and runnable

## Risks

| Risk | Mitigation |
|------|------------|
| Provider API changes | Use abstraction layer, cache responses |
| LangGraph version churn | Pin version, document compatibility |
| Code execution security | Subprocess sandbox, timeout, local-only |
| Scope creep | Strict MVP definition, defer to post-MVP |

## Timeline

~5 days for MVP:
- Day 1: Backend foundation (providers, caching)
- Day 2: Frontend foundation (setup, components)
- Day 3: Integration (execute, connect)
- Day 4: Features (graph viz, metrics)
- Day 5: Content & polish (examples, E2E)
