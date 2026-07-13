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


def test_openrouter_provider_substitution_defaults_false_and_legacy_true_is_conservative():
    default_payload = build_chat_payload("model", [{"role": "user", "content": "x"}])
    legacy_payload = build_chat_payload(
        "model", [{"role": "user", "content": "x"}], allow_fallbacks=True
    )
    explicit_payload = build_chat_payload(
        "model", [{"role": "user", "content": "x"}],
        allow_provider_substitution=True,
    )

    assert default_payload["provider"]["allow_fallbacks"] is False
    assert legacy_payload["provider"]["allow_fallbacks"] is False
    assert explicit_payload["provider"]["allow_fallbacks"] is True


@pytest.mark.asyncio
async def test_query_model_normalizes_null_content_to_empty_string(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {
                        "finish_reason": "length",
                        "native_finish_reason": "max_output_tokens",
                        "message": {
                            "content": None,
                            "reasoning": "hidden reasoning",
                            "reasoning_details": [{"type": "summary", "text": "detail"}],
                        },
                    }
                ],
                "usage": {
                    "prompt_tokens": 1,
                    "completion_tokens": 0,
                    "total_tokens": 1,
                    "completion_tokens_details": {"reasoning_tokens": 16},
                },
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
    assert result["finish_reason"] == "length"
    assert result["native_finish_reason"] == "max_output_tokens"
    assert result["reasoning"] == "hidden reasoning"
    assert result["reasoning_details"] == [{"type": "summary", "text": "detail"}]
