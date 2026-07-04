"""Tests for Fireworks request construction and response parsing."""

import json

import pytest

from backend.fireworks_client import get_fireworks_model_id, query_fireworks_model


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_kimi_k2_7_code_maps_to_fireworks_account_slug():
    assert get_fireworks_model_id("fireworks/kimi-k2.7-code") == (
        "accounts/fireworks/models/kimi-k2p7-code"
    )


@pytest.mark.asyncio
async def test_non_streaming_payload_includes_reasoning_effort_when_passed(monkeypatch):
    calls = []

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, headers, json):
            calls.append({"url": url, "headers": headers, "json": json, "timeout": self.timeout})
            return FakeResponse(
                {
                    "choices": [{"message": {"content": "visible answer"}}],
                    "usage": {"prompt_tokens": 1, "completion_tokens": 2, "total_tokens": 3},
                }
            )

    monkeypatch.setattr("backend.fireworks_client.FIREWORKS_API_KEY", "test-key")
    monkeypatch.setattr("backend.fireworks_client.httpx.AsyncClient", FakeAsyncClient)

    result = await query_fireworks_model(
        "fireworks/glm-5.2",
        [{"role": "user", "content": "test"}],
        max_tokens=4096,
        temperature=0.2,
        reasoning_effort="xhigh",
    )

    assert result is not None
    assert len(calls) == 1
    payload = calls[0]["json"]
    assert payload["reasoning_effort"] == "xhigh"
    assert payload.get("stream") in (None, False)
    assert payload["max_tokens"] == 4096


@pytest.mark.asyncio
async def test_large_request_streams_without_capping_max_tokens(monkeypatch):
    stream_calls = []

    class FakeStreamResponse:
        def raise_for_status(self):
            return None

        async def aiter_lines(self):
            yield 'data: {"choices":[{"delta":{"content":"large response"}}]}'
            yield "data: [DONE]"

    class FakeStreamContext:
        async def __aenter__(self):
            return FakeStreamResponse()

        async def __aexit__(self, exc_type, exc, traceback):
            return False

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        def stream(self, method, url, headers, json):
            stream_calls.append(
                {"method": method, "url": url, "headers": headers, "json": json, "timeout": self.timeout}
            )
            return FakeStreamContext()

        async def post(self, *args, **kwargs):
            raise AssertionError("large Fireworks requests must use streaming")

    monkeypatch.setattr("backend.fireworks_client.FIREWORKS_API_KEY", "test-key")
    monkeypatch.setattr("backend.fireworks_client.httpx.AsyncClient", FakeAsyncClient)

    result = await query_fireworks_model(
        "fireworks/glm-5.2",
        [{"role": "user", "content": "test"}],
        max_tokens=32768,
        temperature=0.2,
        reasoning_effort="xhigh",
    )

    assert result is not None
    assert len(stream_calls) == 1
    payload = stream_calls[0]["json"]
    assert payload["stream"] is True
    assert payload["max_tokens"] == 32768
    assert payload["reasoning_effort"] == "xhigh"


@pytest.mark.asyncio
async def test_streaming_response_aggregates_reasoning_and_visible_content(monkeypatch):
    class FakeStreamResponse:
        def raise_for_status(self):
            return None

        async def aiter_lines(self):
            yield "data: " + json.dumps(
                {"choices": [{"delta": {"reasoning_content": "think step. "}}]}
            )
            yield "data: " + json.dumps({"choices": [{"delta": {"content": "final answer."}}]})
            yield "data: [DONE]"

    class FakeStreamContext:
        async def __aenter__(self):
            return FakeStreamResponse()

        async def __aexit__(self, exc_type, exc, traceback):
            return False

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        def stream(self, method, url, headers, json):
            return FakeStreamContext()

    monkeypatch.setattr("backend.fireworks_client.FIREWORKS_API_KEY", "test-key")
    monkeypatch.setattr("backend.fireworks_client.httpx.AsyncClient", FakeAsyncClient)

    result = await query_fireworks_model(
        "fireworks/glm-5.2",
        [{"role": "user", "content": "test"}],
        max_tokens=32768,
        reasoning_effort="xhigh",
    )

    assert result is not None
    assert "think step" in result["content"]
    assert "final answer" in result["content"]
    assert result["provider"] == "fireworks"


@pytest.mark.asyncio
async def test_sparse_non_streaming_response_merges_reasoning_content(monkeypatch):
    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, headers, json):
            return FakeResponse(
                {
                    "choices": [
                        {
                            "message": {
                                "content": "short",
                                "reasoning_content": "important reasoning answer",
                            }
                        }
                    ],
                    "usage": {},
                }
            )

    monkeypatch.setattr("backend.fireworks_client.FIREWORKS_API_KEY", "test-key")
    monkeypatch.setattr("backend.fireworks_client.httpx.AsyncClient", FakeAsyncClient)

    result = await query_fireworks_model(
        "fireworks/glm-5.2",
        [{"role": "user", "content": "test"}],
        max_tokens=4096,
    )

    assert result is not None
    assert "short" in result["content"]
    assert "important reasoning answer" in result["content"]
    assert result["provider"] == "fireworks"
