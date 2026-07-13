"""Tests for xAI response usage normalization."""

import logging

import pytest

from backend.provider_errors import XAIInvalidUsageError
from backend.xai_client import normalize_xai_usage, query_xai_model


class FakeResponse:
    def __init__(self, usage):
        self._usage = usage

    def raise_for_status(self):
        return None

    def json(self):
        return {
            "choices": [{"message": {"content": "visible answer"}}],
            "usage": self._usage,
        }


def test_normalize_xai_usage_preserves_consistent_counts_and_metadata():
    usage = {
        "prompt_tokens": 240,
        "completion_tokens": 13,
        "total_tokens": 253,
        "cached_tokens": 12,
    }

    normalized = normalize_xai_usage(usage)

    assert normalized == usage
    assert normalized is not usage


def test_normalize_xai_usage_folds_hidden_reasoning_into_completion():
    usage = {
        "prompt_tokens": 240,
        "completion_tokens": 13,
        "total_tokens": 391,
        "completion_tokens_details": {"reasoning_tokens": 138},
        "provider_extension": "preserved",
    }

    normalized = normalize_xai_usage(usage)

    assert normalized == {
        "prompt_tokens": 240,
        "completion_tokens": 151,
        "total_tokens": 391,
        "completion_tokens_details": {"reasoning_tokens": 138},
        "provider_extension": "preserved",
    }


@pytest.mark.parametrize(
    "usage",
    [
        None,
        [],
        {},
        {"completion_tokens": 1, "total_tokens": 1},
        {"prompt_tokens": 1, "total_tokens": 1},
        {"prompt_tokens": 1, "completion_tokens": 1},
        {"prompt_tokens": -1, "completion_tokens": 1, "total_tokens": 0},
        {"prompt_tokens": 1, "completion_tokens": -1, "total_tokens": 0},
        {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": -1},
        {"prompt_tokens": 1.0, "completion_tokens": 1, "total_tokens": 2},
        {"prompt_tokens": 1, "completion_tokens": 0.5, "total_tokens": 2},
        {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2.5},
        {"prompt_tokens": True, "completion_tokens": 1, "total_tokens": 2},
        {"prompt_tokens": 1, "completion_tokens": False, "total_tokens": 1},
        {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": True},
        {"prompt_tokens": "1", "completion_tokens": 1, "total_tokens": 2},
        {"prompt_tokens": None, "completion_tokens": 1, "total_tokens": 2},
        {"prompt_tokens": 2, "completion_tokens": 2, "total_tokens": 3},
    ],
)
def test_normalize_xai_usage_rejects_invalid_usage(usage):
    with pytest.raises(XAIInvalidUsageError):
        normalize_xai_usage(usage)


@pytest.mark.asyncio
async def test_query_xai_model_returns_normalized_usage(monkeypatch):
    usage = {
        "prompt_tokens": 240,
        "completion_tokens": 13,
        "total_tokens": 391,
        "completion_tokens_details": {"reasoning_tokens": 138},
    }

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, headers, json):
            return FakeResponse(usage)

    monkeypatch.setattr("backend.xai_client.GROK_API_KEY", "test-key")
    monkeypatch.setattr("backend.xai_client.httpx.AsyncClient", FakeAsyncClient)

    result = await query_xai_model("x-ai/grok-4.5", [{"role": "user", "content": "test"}])

    assert result is not None
    assert result["usage"] == {
        "prompt_tokens": 240,
        "completion_tokens": 151,
        "total_tokens": 391,
        "completion_tokens_details": {"reasoning_tokens": 138},
    }


@pytest.mark.asyncio
async def test_query_xai_model_propagates_bounded_invalid_usage(monkeypatch):
    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, headers, json):
            return FakeResponse(
                {"prompt_tokens": 240, "completion_tokens": 13, "total_tokens": 200}
            )

    monkeypatch.setattr("backend.xai_client.GROK_API_KEY", "test-key")
    monkeypatch.setattr("backend.xai_client.httpx.AsyncClient", FakeAsyncClient)

    with pytest.raises(XAIInvalidUsageError):
        await query_xai_model("x-ai/grok-4.5", [{"role": "user", "content": "test"}])


@pytest.mark.asyncio
async def test_query_xai_model_redacts_unexpected_exception_text(monkeypatch, caplog):
    sentinel = "secret-response-fragment"

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, headers, json):
            raise RuntimeError(sentinel)

    monkeypatch.setattr("backend.xai_client.GROK_API_KEY", "test-key")
    monkeypatch.setattr("backend.xai_client.httpx.AsyncClient", FakeAsyncClient)

    with caplog.at_level(logging.ERROR, logger="llm-council.xai"):
        assert await query_xai_model(
            "x-ai/grok-4.5", [{"role": "user", "content": "test"}]
        ) is None

    assert sentinel not in caplog.text
    assert "category=unexpected_error" in caplog.text
