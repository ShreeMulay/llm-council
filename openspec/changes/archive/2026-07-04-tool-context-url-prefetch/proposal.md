# Tool Context URL Prefetch

## Overview

LLM Council currently forwards user prompts verbatim to model APIs. When a prompt contains URLs, the council members cannot retrieve those resources and respond with "paste the transcript" or hallucinate access. This change adds a safe Stage 0 tool-context preprocessor so the web app, API, and MCP server can analyze public URL content without requiring each model to have browser/tool access.

## Goals

- Detect `http://` and `https://` URLs in council queries.
- Safely fetch public text/HTML resources before Stage 1.
- Inject bounded source excerpts into the prompt sent to council members.
- Preserve the original user query for UI/storage while exposing tool-context metadata.
- Work consistently from the web app, direct API, and OpenCode MCP server.
- Avoid SSRF by blocking localhost, private, loopback, link-local, multicast, and non-HTTP schemes.

## Non-Goals

- Full arbitrary tool calling by every council member.
- Autonomous multi-step browsing/search beyond fetching explicitly provided URLs.
- Video/audio decoding in v1. If a dashboard links to media, v1 only extracts text/HTML visible in fetched resources.

## Behavior

1. If a query contains no URLs, deliberation is unchanged.
2. If URLs are present and tool context is enabled:
   - Fetch up to `MAX_TOOL_CONTEXT_URLS` URLs.
   - Limit each resource to `MAX_TOOL_CONTEXT_CHARS_PER_URL` characters.
   - Limit total injected context to `MAX_TOOL_CONTEXT_TOTAL_CHARS` characters.
   - For HTML, strip scripts/styles and extract readable text.
   - For text/JSON/markdown, decode directly.
   - Failed fetches are recorded in metadata but do not fail the council.
3. Stage 1/2/3 receive an augmented prompt containing:
   - Original user request.
   - Tool context sources with URL, content type, status, and excerpt.
   - Instruction to ground analysis in provided source excerpts and not claim access beyond them.
4. UI and API metadata include `tool_context` details.

## API Shape

### CouncilRequest / SendMessageRequest

```json
{
  "query": "Analyze this transcript: https://example.com/transcript.txt",
  "tool_context": true
}
```

`tool_context` defaults to `true`.

### Metadata

```json
{
  "tool_context": {
    "enabled": true,
    "urls": ["https://example.com/transcript.txt"],
    "sources": [
      {
        "url": "https://example.com/transcript.txt",
        "ok": true,
        "status_code": 200,
        "content_type": "text/plain",
        "char_count": 12345,
        "truncated": false
      }
    ]
  }
}
```

## Acceptance Criteria

- [ ] URL extraction handles punctuation and duplicate URLs.
- [ ] Private/localhost URLs are blocked.
- [ ] Public text URLs are fetched and included in augmented prompt.
- [ ] HTML URLs are converted to readable text.
- [ ] `/api/council`, `/api/council/stream`, conversation message, conversation streaming, and MCP path all use the same preprocessor.
- [ ] Existing tests pass.
- [ ] New tests cover extraction, SSRF blocking, fetch success/failure, and prompt augmentation.
- [ ] Deployed/restarted service can analyze the provided Clarity transcript URL without models asking the user to paste it.

## Related Issue

- `llm-council-07j` — Add tool-context URL prefetch for council queries
