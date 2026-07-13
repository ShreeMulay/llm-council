# Model Registry Delta

## ADDED Requirements

### Requirement: Latest flagship production roster

The canonical registry SHALL promote GPT-5.6 Sol and Grok 4.5 while preserving the other seven top-capability production seats.

#### Scenario: Generate target production projections

- **GIVEN** the approved registry version
- **WHEN** backend, frontend, and MCP projections are generated
- **THEN** production seat 1 is `openai/gpt-5.6-sol`
- **AND** production seat 5 is `x-ai/grok-4.5`
- **AND** compact and evaluator projections contain the promoted IDs
- **AND** chairman remains `anthropic/claude-fable-5`

#### Scenario: Preserve historical explicit IDs

- **GIVEN** an existing caller requests `openai/gpt-5.5` or `x-ai/grok-4.3`
- **WHEN** the registry resolves the explicit logical ID
- **THEN** the historical model remains callable through its own route
- **AND** it is not silently rewritten to the promoted model
- **AND** it has no production role or seat

### Requirement: Current challenger catalog

The registry SHALL distinguish active challengers from legacy models and SHALL include current callable flagship, balanced, speed, and long-context candidates without granting production roles automatically.

#### Scenario: Challenger does not mutate production

- **GIVEN** a current challenger such as Gemini 3.5 Flash, Mistral Medium 3.5, MiniMax M3, Llama 4 Scout, GPT-5.6 Terra, or GPT-5.6 Luna
- **WHEN** the registry is loaded
- **THEN** it is discoverable and benchmarkable
- **AND** it has no production seat unless separately promoted
