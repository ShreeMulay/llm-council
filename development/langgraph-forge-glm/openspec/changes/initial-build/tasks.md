# Implementation Tasks: Initial Build

## Phase 1: Backend Foundation

### 1.1 Project Setup
- [x] Create pyproject.toml with dependencies
- [x] Create backend/.env.example
- [x] Create backend/app/main.py (FastAPI app)
- [x] Create backend/app/config.py (settings)
- [x] Verify pytest runs

### 1.2 Provider Abstraction
- [x] **TEST**: test_providers/test_base.py - interface contract
- [x] Create providers/base.py - abstract provider class
- [x] Define Model and Pricing dataclasses

### 1.3 OpenRouter Provider
- [x] **TEST**: test_providers/test_openrouter.py
  - test_list_models_returns_models
  - test_list_models_includes_pricing
  - test_invoke_returns_response
  - test_invoke_returns_usage
- [x] Create providers/openrouter.py

### 1.4 Cerebras Provider
- [x] **TEST**: test_providers/test_cerebras.py
  - test_list_models_returns_models
  - test_fallback_pricing_used
  - test_invoke_returns_response
- [x] Create providers/cerebras.py

### 1.5 Fireworks Provider
- [x] **TEST**: test_providers/test_fireworks.py
  - (similar to cerebras)
- [x] Create providers/fireworks.py

### 1.6 Model Caching
- [x] **TEST**: test_cache.py
  - test_cache_stores_models
  - test_cache_returns_fresh
  - test_cache_refetches_when_stale
  - test_cache_returns_stale_on_error
- [x] Create cache/model_cache.py

### 1.7 Health API
- [x] **TEST**: integration/test_api_health.py
  - test_health_returns_status
  - test_health_shows_provider_status
- [x] Create api/health.py (already in main.py)

### 1.8 Models API
- [x] **TEST**: integration/test_api_models.py
  - test_models_returns_for_provider
  - test_models_cached
- [x] Create api/models.py

---

## Phase 2: Frontend Foundation

### 2.1 Project Setup
- [x] Initialize Bun project with Vite
- [x] Configure TypeScript
- [x] Install and configure Tailwind v4
- [x] Initialize Shadcn/ui v4
- [x] Configure Vitest
- [x] Configure Playwright

### 2.2 Theme System
- [x] **TEST**: theme-store.test.ts
  - test_default_theme
  - test_change_theme
  - test_persist_theme
- [x] Create lib/themes.ts (7 themes)
- [x] Create styles/themes.css
- [x] Create stores/theme-store.ts
- [x] **TEST**: components/theme/theme-switcher.test.tsx
- [x] Create components/theme/theme-switcher.tsx

### 2.3 Layout Components
- [x] Create components/layout/header.tsx
- [x] Create components/layout/sidebar.tsx
- [x] Create components/layout/main-layout.tsx

### 2.4 Provider Store
- [x] **TEST**: stores/provider-store.test.ts
  - test_initial_state
  - test_set_provider
  - test_set_model
- [x] Create stores/provider-store.ts

### 2.5 Provider Selector
- [x] **TEST**: components/providers/provider-selector.test.tsx
  - test_renders_providers
  - test_select_provider
  - test_shows_models
- [x] Create components/providers/provider-selector.tsx
- [x] Create components/providers/model-selector.tsx

### 2.6 Code Editor
- [x] **TEST**: components/editor/code-editor.test.tsx
  - test_renders_code
  - test_syntax_highlighting
  - test_on_change_callback
- [x] Create components/editor/code-editor.tsx

### 2.7 API Client
- [x] Create lib/api-client.ts
- [x] Create hooks/use-models.ts

---

## Phase 3: Integration

### 3.1 Execute API
- [x] **TEST**: integration/test_api_execute.py
  - test_execute_simple_code
  - test_execute_returns_output
  - test_execute_returns_metrics
  - test_execute_returns_graph_structure
  - test_execute_handles_error
  - test_execute_timeout
- [x] Create api/execute.py

### 3.2 Code Parser
- [x] **TEST**: unit/test_parser.py
  - test_parse_simple_graph
  - test_parse_conditional_edges
  - test_parse_entry_point
- [x] Create executor/parser.py

### 3.3 Error Analyzer
- [x] **TEST**: unit/test_error_analyzer.py
  - test_keyerror_suggestions
  - test_node_exists_suggestions
  - test_api_key_suggestions
- [x] Create executor/error_analyzer.py

### 3.4 Execution Store
- [x] **TEST**: stores/execution-store.test.ts
  - test_execute_mutation
  - test_loading_state
  - test_error_handling
- [x] Create stores/execution-store.ts
- [x] Create hooks/use-execute.ts

### 3.5 Output Panel
- [x] **TEST**: components/output/output-panel.test.tsx
  - test_shows_output
  - test_shows_error
  - test_shows_suggestions
- [x] Create components/output/output-panel.tsx
- [x] Create components/output/error-display.tsx

---

## Phase 4: Full Features

### 4.1 Graph Visualization
- [x] **TEST**: components/graph/graph-canvas.test.tsx
  - test_renders_nodes
  - test_renders_edges
  - test_handles_empty_graph
- [x] Create components/graph/graph-canvas.tsx
- [x] Create lib/graph-layout.ts (dagre)

### 4.2 Custom Nodes
- [x] Create components/graph/nodes/start-node.tsx
- [x] Create components/graph/nodes/end-node.tsx
- [x] Create components/graph/nodes/llm-node.tsx
- [x] Create components/graph/nodes/tool-node.tsx

### 4.3 Custom Edges
- [x] **TEST**: components/graph/edges/conditional-edge.test.tsx
  - test_renders_edge_without_label
  - test_renders_edge_with_label
  - test_positions_label_centered
  - test_does_not_render_empty_label
  - test_applies_custom_styles
- [x] Create components/graph/edges/conditional-edge.tsx
- [x] Update lib/graph-layout.ts to set edge type for conditional edges
- [x] Update graph-canvas.tsx to register edgeTypes

### 4.4 Metrics Panel
- [ ] **TEST**: components/metrics/metrics-panel.test.tsx
  - test_shows_tokens
  - test_shows_cost
  - test_shows_speed
- [ ] Create components/metrics/metrics-panel.tsx
- [ ] Create components/metrics/token-display.tsx
- [ ] Create components/metrics/cost-display.tsx

### 4.5 Playground Page
- [ ] Create pages/playground/index.tsx
- [ ] Wire up all components

---

## Phase 5: Content & Polish

### 5.1 Level 1 Examples
- [ ] Create examples/level-1/01-hello-state.py + .md
- [ ] Create examples/level-1/02-two-nodes.py + .md
- [ ] Create examples/level-1/03-llm-node.py + .md
- [ ] Create examples/level-1/04-conditional-edge.py + .md
- [ ] Create examples/level-1/05-simple-agent.py + .md
- [ ] Create examples/metadata.json

### 5.2 Tutorial Page
- [ ] Create pages/tutorial/index.tsx
- [ ] Create components/examples/example-list.tsx
- [ ] Create components/examples/example-card.tsx

### 5.3 Progress Tracking
- [ ] **TEST**: stores/progress-store.test.ts
- [ ] Create stores/progress-store.ts
- [ ] Create components/examples/progress-indicator.tsx

### 5.4 E2E Tests
- [ ] Create tests/e2e/playground.spec.ts
  - test_write_code
  - test_change_provider
  - test_execute_and_see_results
  - test_see_graph_visualization
- [ ] Create tests/e2e/tutorial.spec.ts
  - test_navigate_examples
  - test_run_example
  - test_see_output

### 5.5 Documentation
- [ ] Create README.md with setup instructions
- [ ] Create .env.example files
- [ ] Document API in openspec/specs/

---

## Definition of Done

Each task is complete when:
1. Tests written and passing
2. Implementation complete
3. No linter errors
4. Full test suite still passes
5. Code reviewed (self-review for solo work)
