# Design

## Build and Package Contract

`mcp/src/index.ts` will use a static ESM JSON import with an import attribute. Under TypeScript NodeNext with `resolveJsonModule`, the source registry becomes part of the compiler graph and is emitted to `dist/generated/model-registry.json`. The package will declare a maintained Node 22 floor, clean before builds, and include only `dist` in the tarball.

## Isolated Runtime Proof

A Node test creates a temporary workspace, performs a raw clean TypeScript compile and `npm pack`, verifies the exact tarball allowlist, installs the tarball into a blank project, and launches the installed binary with temporary `HOME` and `XDG_RUNTIME_DIR`. It binds an HTTP sentinel to an ephemeral `127.0.0.1` port and sets that address as the backend URL. The test sends MCP `initialize`, `notifications/initialized`, and `tools/list`, verifies the `llm_council` tool schema, and asserts exactly zero sentinel TCP connections and HTTP requests before shutting down. All process, protocol, command, and sentinel operations are time-bounded, and the sentinel closes during cleanup.

## Runtime Activation

After Forgejo merge and mirror, the exact merged SHA is rebuilt in a clean worktree. Consumers are inventoried and quiesced. The current ignored runtime `dist` is renamed to a backup, the verified staged `dist` is renamed into place, and a direct protocol smoke test runs. Failure restores the backup. OpenCode must be restarted in a fresh process before acceptance; acceptance requires a post-cutover MCP PID, connected MCP status, visible `llm_council` tool, and no startup error. No paid tool call is permitted.

## Safety

- The dirty shared checkout's tracked files are not reset, rebased, stashed, cleaned, or regenerated.
- Stale OpenCode/MCP processes are not killed blindly; process ownership is mapped before quiescence.
- Registry freshness is proven against the merged canonical generated projection.
- Existing config is chezmoi-managed; no config edit is needed for this incident unless post-cutover verification disproves the current command contract.
