# Fix Packaged MCP Startup

Status: APPROVED — explicit “Make It So” authorization on 2026-07-14.

## Why

Fresh LLM Council MCP child processes exit during module import because the deployable `dist` tree omits the generated model-registry JSON required by `dist/index.js`. Existing compilation and source-projection tests do not exercise an isolated packed artifact, so CI reports success for a package that cannot initialize.

## What Changes

- Make the generated model registry a compiler-tracked runtime dependency and package only the complete `dist` tree.
- Support a current maintained Node runtime floor compatible with native JSON import attributes.
- Add an isolated tarball installation and MCP protocol smoke test covering `initialize` and `tools/list` without invoking the backend.
- Make deployable-package verification blocking in Forgejo CI.
- Activate only the exact merged artifact using a quiesced transactional cutover, preserving unrelated shared-checkout work.

## Out of Scope

- No paid council request.
- No Cloud Run deployment or production traffic mutation.
- No changes to provider routing, model selection, authentication, or PHI handling.
