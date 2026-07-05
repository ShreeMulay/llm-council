# Model Benchmarking Delta Spec

## Requirement: Benchmark Model Variants

The system SHALL define benchmark variants independently from the production council roster.

### Scenario: Default internal benchmark variants

- **GIVEN** the benchmark harness is run with the default model set
- **WHEN** variants are resolved
- **THEN** the resolved variants include Fireworks GLM-5.2 default
- **AND** GPT-5.5 medium and high via OpenRouter
- **AND** GPT-5.5 xhigh via OpenRouter only when the support probe validates it
- **AND** Claude Opus 4.8 xhigh via OpenRouter as the supported Opus comparand
- **AND** Claude Opus 4.8 max via OpenRouter only when the support probe validates it, otherwise recorded as blocked
- **AND** each variant includes provider, model ID, display name, reasoning effort if applicable, and pricing metadata.

### Scenario: Unsupported effort setting

- **GIVEN** a model/provider rejects a requested reasoning effort
- **WHEN** the probe or benchmark call fails with an unsupported-setting error
- **THEN** the variant SHALL be recorded as skipped or blocked
- **AND** the harness SHALL NOT silently run the model with a lower effort setting.

## Requirement: CLI-Only Benchmark Surface

The system SHALL expose benchmark execution through a local CLI/module entrypoint, not through FastAPI request handlers.

### Scenario: No benchmark API endpoint

- **GIVEN** the benchmark harness is implemented
- **WHEN** the FastAPI application routes are inspected
- **THEN** no route SHALL trigger paid benchmark execution.

### Scenario: CLI/module execution

- **GIVEN** an operator runs the benchmark module locally
- **WHEN** mock or live mode is selected
- **THEN** benchmark execution SHALL use the local CLI/module path
- **AND** SHALL write artifacts to the configured run directory.

## Requirement: PHI-Free Prompt Suites

The system SHALL run only PHI-free benchmark prompts committed to the repository.

### Scenario: Balanced default suite

- **GIVEN** the default prompt suite is selected
- **WHEN** the harness loads prompts
- **THEN** prompts cover coding, debugging, architecture, TKE operations, clinical-adjacent education, culture/comms, structured JSON, long-context synthesis, ambiguous judgment, and short-answer speed baseline tasks
- **AND** no prompt includes patient identifiers, labs, screenshots, or PHI.

## Requirement: Benchmark Execution

The system SHALL execute model variants against prompts with repeatable settings and budget controls.

### Scenario: Mock benchmark run

- **GIVEN** mock mode is enabled
- **WHEN** the benchmark is run
- **THEN** no provider network calls are made
- **AND** artifacts are generated using deterministic mock responses.

### Scenario: Deterministic mock artifacts

- **GIVEN** fixed run ID, fixed clock, fixed latency, fixed token counts, and fixed random seed
- **WHEN** mock mode is run twice with the same inputs
- **THEN** stable artifact content SHALL match between runs except for explicitly documented volatile fields.

### Scenario: Budget cap enforcement

- **GIVEN** a configured spend cap
- **WHEN** projected or observed cost exceeds the cap
- **THEN** the harness SHALL stop additional paid model calls
- **AND** record the budget stop in `summary.md` and `config.json`.

### Scenario: Benchmark purity

- **GIVEN** benchmark mode is used
- **WHEN** a provider call fails
- **THEN** the harness SHALL record the error for that variant
- **AND** SHALL NOT silently use a provider fallback unless the benchmark configuration explicitly enables that fallback.

### Scenario: OpenRouter no-fallback calls

- **GIVEN** a benchmark variant uses OpenRouter with a reasoning effort
- **WHEN** the provider request is built
- **THEN** the payload SHALL set provider fallbacks off for benchmark purity
- **AND** an unsupported effort response SHALL become a blocked/skipped result.

## Requirement: Metrics and Cost Reporting

The system SHALL compute per-call and aggregate metrics.

### Scenario: Pricing snapshot provenance

- **GIVEN** benchmark variants are resolved
- **WHEN** `config.json` is written
- **THEN** it includes pricing values, pricing source, and pricing timestamp for each variant
- **AND** cost math uses that snapshot rather than hidden constants.

### Scenario: Per-result metrics

- **GIVEN** a model response returns usage metadata
- **WHEN** the result is recorded
- **THEN** the record includes prompt tokens, completion tokens, total tokens, latency seconds, output tokens per second, estimated input cost, estimated output cost, total estimated cost, provider, model ID, variant ID, prompt ID, and trial index.

### Scenario: Missing usage metadata

- **GIVEN** a provider response lacks usage metadata
- **WHEN** cost is computed
- **THEN** cost SHALL be recorded as unknown rather than fabricated
- **AND** the result SHALL still include latency and raw output.

### Scenario: Artifact secret guard

- **GIVEN** benchmark artifacts are written for Forgejo review
- **WHEN** artifact content is scanned before persistence completes
- **THEN** common API-key and bearer-token patterns SHALL be rejected or redacted
- **AND** no secret values SHALL be written to Markdown, CSV, JSONL, or JSON artifacts.

### Scenario: No artifact telemetry emission

- **GIVEN** benchmark artifacts include raw prompts and model outputs
- **WHEN** observability/logging is used by surrounding application code
- **THEN** raw prompts and model outputs SHALL NOT be emitted to OTEL/OpenObserve telemetry by the benchmark harness.

## Requirement: Side-by-Side and Judge Artifacts

The system SHALL persist durable, Forgejo-reviewable benchmark artifacts.

### Scenario: Side-by-side Markdown

- **GIVEN** benchmark results exist for multiple variants
- **WHEN** reports are generated
- **THEN** `side-by-side.md` presents each prompt with each model variant's raw output, latency, token usage, estimated cost, and error status.

### Scenario: Automated blind judging

- **GIVEN** judge scoring is enabled
- **WHEN** judge prompts are built
- **THEN** candidate outputs are anonymized
- **AND** model labels are not visible to the judge
- **AND** a benchmarked model variant SHALL NOT judge its own output unless explicitly allowed in configuration
- **AND** judge scores are persisted to `judge-scores.csv`.

### Scenario: Raw machine-readable results

- **GIVEN** a benchmark run completes or partially completes
- **WHEN** artifacts are written
- **THEN** `raw-results.jsonl`, `metrics.csv`, `summary.md`, `side-by-side.md`, and `config.json` exist under `benchmarks/runs/<run-id>/`.
