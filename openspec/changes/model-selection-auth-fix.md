# Model Selection & Auth Fix

## Overview

This change implements three levels of model selection (global default, per-conversation, per-message) and fixes the authentication issue preventing the "New Conversation" button from working.

## Changes

### Authentication Fix

**Problem**: Frontend `api.js` doesn't send `X-Council-Key` header, causing 401 Unauthorized on all API calls when `COUNCIL_API_KEY` is configured.

**Solution**:
1. Backend `auth.py`: Add Tailscale IP range (`100.64.0.0/10`, `fd7a:115c:a1e0::/48`) as trusted networks that bypass API key check
2. Frontend `api.js`: Read `VITE_COUNCIL_API_KEY` from `import.meta.env` and send as `X-Council-Key` header
3. Optional non-Tailscale dev setup: `frontend/.env.local` with `VITE_COUNCIL_API_KEY` (gitignored)

### Model Selection Architecture

Three levels of model configuration:

1. **Global Default** (Sidebar Settings): Stored in `localStorage` as `llm_council_models`. Applied to all NEW conversations.
2. **Per-Conversation** (Conversation object): Stored in backend JSON as `active_models`. Each conversation remembers which models were used.
3. **Per-Message Override** (Input bar gear icon): Temporary override for just the next message. Not persisted.

### Backend Changes

- `config.py`: Add `ALL_MODEL_IDS` constant with all 9 backend model IDs
- `main.py`:
  - `SendMessageRequest`: Add `models: list[str] | None = None` field
  - `create_conversation`: Accept optional `active_models` in request body
  - `send_message_stream`: Use `request.models` > conversation `active_models` > `COUNCIL_MODELS`
  - `ConversationMetadata`: Add `active_models: list[str] | None = None`
- `storage.py`:
  - `create_conversation`: Store `active_models` in conversation JSON
  - `list_conversations`: Return `active_models` in metadata

### Frontend Changes

- `api.js`:
  - Send `X-Council-Key` header on all requests
  - `MODEL_INFO`: Add `modelId` field mapping to backend IDs
  - `createConversation`: Accept `activeModels` parameter
  - `sendMessageStream`: Accept `models` parameter
- `App.jsx`:
  - Add `globalModelConfig` state (loaded from `localStorage`)
  - Pass model config to `createConversation`
  - Support `overrideModels` in `handleSendMessage`
- `Sidebar.jsx`: Replace Compact Mode toggle with Council Configuration panel
- `ChatInterface.jsx`: Add per-message model override button (gear icon)
- `ModelPicker.jsx` (new): Reusable model picker component with presets and per-model toggles

### UI Design

**Council Configuration Panel (Sidebar)**:
- Preset buttons: Full Council (9), Compact (5), Speed (3), Minimal (2)
- Per-model toggle chips with brand colors/icons
- At least 2 models required (validation)
- "Save as Default" button

**Per-Message Override (Input Bar)**:
- Gear icon next to send button
- Dropdown with same model picker
- Shows current selection summary
- Resets after message sent

## API Changes

### Request: POST /api/conversations
```json
{
  "active_models": ["openai/gpt-5.5", "anthropic/claude-opus-4.7"]
}
```

### Request: POST /api/conversations/{id}/message/stream
```json
{
  "content": "What is quantum computing?",
  "compact": false,
  "models": ["openai/gpt-5.5", "anthropic/claude-opus-4.7"]
}
```

### Response: GET /api/conversations
```json
[
  {
    "id": "...",
    "created_at": "...",
    "title": "...",
    "message_count": 2,
    "active_models": ["openai/gpt-5.5", "anthropic/claude-opus-4.7"]
  }
]
```

## Acceptance Criteria

- [ ] New Conversation button works without 401 errors
- [ ] Tailscale devices access API without API key
- [ ] Non-Tailscale requests still require X-Council-Key
- [ ] Global model config persists in localStorage
- [ ] Per-conversation model config persists in backend
- [ ] Per-message override applies only to next message
- [ ] At least 2 models must be selected (validation)
- [ ] All 92 existing tests pass
- [ ] Frontend builds successfully
- [ ] Changes pushed to Forgejo

## Related Issues

- llm-council-1xr: Fix New Conversation button - auth header missing
- llm-council-i18: Add per-conversation model selection with global defaults
