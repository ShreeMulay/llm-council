# council-execution Specification

## Purpose
TBD - created by archiving change promote-latest-flagship-roster-2026-07. Update Purpose after archive.
## Requirements
### Requirement: Independent fallback controls

The execution plan SHALL capture declared route failover separately from provider-internal substitution.

#### Scenario: Grok direct route fails

- **GIVEN** Grok 4.5 has direct xAI and exact OpenRouter routes
- **AND** declared route failover is enabled
- **AND** provider substitution is disabled
- **WHEN** xAI direct fails
- **THEN** the dispatcher attempts `openrouter:x-ai/grok-4.5`
- **AND** OpenRouter receives `allow_fallbacks=false`
- **AND** the normalized result identifies the selected route and fallback reason

#### Scenario: Benchmark disables all fallback

- **GIVEN** a support probe or benchmark operation
- **WHEN** its immutable plan is executed
- **THEN** only the captured primary route is attempted
- **AND** OpenRouter provider substitution is disabled
- **AND** failure is recorded rather than replaced by another route/provider

### Requirement: Sync and stream parity after roster promotion

Sync and stream execution SHALL produce equivalent terminal semantics for the promoted roster.

#### Scenario: Fold promoted stream

- **GIVEN** the same promoted execution plan, provider outcomes, and cache state
- **WHEN** sync and stream execution complete
- **THEN** ordered content, routes, fallbacks, errors, usage, terminal status, and plan digest are equal

