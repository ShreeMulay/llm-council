"""Tests for OpenRouter request construction."""

import pytest

from backend.openrouter import build_chat_payload, query_model


def test_benchmark_no_fallback_payload_sets_allow_fallbacks_false():
    payload = build_chat_payload(
        model="openai/gpt-5.5",
        messages=[{"role": "user", "content": "test"}],
        max_tokens=128,
        temperature=0.1,
        reasoning_effort="high",
        allow_fallbacks=False,
    )

    assert payload["provider"]["allow_fallbacks"] is False
    assert payload["provider"]["order"] == ["openai"]
    assert payload["reasoning_effort"] == "high"


@pytest.mark.asyncio
async def test_query_model_normalizes_null_content_to_empty_string(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [{"message": {"content": None}}],
                "usage": {"prompt_tokens": 1, "completion_tokens": 0, "total_tokens": 1},
            }

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, headers, json):
            return FakeResponse()

    monkeypatch.setattr("backend.openrouter.OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr("backend.openrouter.httpx.AsyncClient", FakeAsyncClient)

    result = await query_model(
        "openai/gpt-5.5",
        [{"role": "user", "content": "test"}],
        max_tokens=16,
        temperature=0,
        reasoning_effort="high",
        allow_fallbacks=False,
    )

    assert result is not None
    assert result["content"] == ""
