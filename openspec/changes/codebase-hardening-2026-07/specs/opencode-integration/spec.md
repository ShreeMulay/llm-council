# OpenCode / MCP Integration Delta — Codebase Hardening 2026-07

## Modified Requirements

### Requirement: MCP streaming safety

The MCP server's default council call path MAY prefer streaming, but streaming MUST preserve the same provider safety and deliberation invariants as the sync API.

#### Scenario: MCP calls strict Fable deployment

GIVEN the MCP server calls `/api/council/stream`
AND the backend has `REQUIRE_VERTEX_ANTHROPIC=true`
WHEN Vertex Anthropic is unavailable for Fable
THEN the backend SHALL fail closed rather than route Fable to OpenRouter.

### Requirement: MCP local backend PID safety

MCP stale-backend PID cleanup SHALL verify the PID belongs to the expected backend process before terminating it. Verification failure SHALL be treated as unsafe-to-kill.

#### Scenario: PID file cannot be verified

GIVEN a stale PID file exists
AND the MCP server cannot verify that PID as the llm-council backend process
WHEN cleanup runs
THEN it SHALL NOT terminate that PID.
