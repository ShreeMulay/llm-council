## ADDED Requirements

### Requirement: Deployable MCP package is self-contained

The LLM Council MCP package MUST include every runtime dependency required to initialize from a clean installation, including the generated model registry corresponding exactly to the merged source projection.

#### Scenario: Clean packed installation initializes
- **GIVEN** a clean build from the approved source SHA
- **WHEN** the produced tarball is installed in an otherwise blank temporary project
- **THEN** the installed MCP process MUST complete `initialize` and `tools/list`
- **AND** `llm_council` MUST be present with its expected input schema
- **AND** initialization MUST NOT contact the council backend.

#### Scenario: Generated registry is absent
- **GIVEN** a package without `dist/generated/model-registry.json`
- **WHEN** package verification runs
- **THEN** verification MUST fail before publication or runtime activation.

### Requirement: Package contents are deterministic and minimal

The package MUST be produced from a clean build, MUST package only the intended `dist` runtime tree, and MUST reject source, test, secret, or unrelated repository files.

#### Scenario: Tarball manifest verification
- **WHEN** CI runs `npm pack --dry-run --json`
- **THEN** the manifest MUST contain the executable runtime and generated registry
- **AND** MUST NOT contain source, tests, credentials, environment files, or unrelated assets.

### Requirement: Runtime activation is reversible

Local OpenCode activation MUST use an artifact built from the exact merged Forgejo SHA and MUST preserve a rollback copy until a fresh OpenCode process connects successfully.

#### Scenario: Cutover verification fails
- **GIVEN** consumers are quiesced and the staged runtime has replaced the prior runtime
- **WHEN** direct MCP or fresh OpenCode verification fails
- **THEN** the previous runtime MUST be restored
- **AND** the failure MUST be recorded without making a paid council request.
