"""Tests for Anthropic-on-Vertex request construction and response parsing."""

import pytest

from backend.vertex_anthropic_client import query_vertex_anthropic_model


class FakeTextBlock:
    def __init__(self, text: str):
        self.text = text


class FakeUsage:
    input_tokens = 11
    output_tokens = 17


class FakeResponse:
    content = [FakeTextBlock("vertex answer")]
    usage = FakeUsage()


@pytest.mark.asyncio
async def test_vertex_fable_payload_uses_high_effort_and_omitted_thinking(monkeypatch):
    calls = []

    class FakeMessages:
        def create(self, **payload):
            calls.append(payload)
            return FakeResponse()

    class FakeAnthropicVertex:
        def __init__(self, project_id, region):
            calls.append({"project_id": project_id, "region": region})
            self.messages = FakeMessages()

    monkeypatch.setattr("backend.vertex_anthropic_client.AnthropicVertex", FakeAnthropicVertex)
    monkeypatch.setattr("backend.vertex_anthropic_client.VERTEX_PROJECT_ID", "covered-project")
    monkeypatch.setattr("backend.vertex_anthropic_client.VERTEX_LOCATION", "global")

    result = await query_vertex_anthropic_model(
        "anthropic/claude-fable-5",
        [{"role": "user", "content": "test"}],
        max_tokens=4096,
    )

    assert result == {
        "content": "vertex answer",
        "usage": {"prompt_tokens": 11, "completion_tokens": 17, "total_tokens": 28},
        "model": "anthropic/claude-fable-5",
        "raw_model": "claude-fable-5",
        "provider": "vertex-anthropic",
    }
    assert calls[0] == {"project_id": "covered-project", "region": "global"}
    payload = calls[1]
    assert payload["model"] == "claude-fable-5"
    assert payload["max_tokens"] == 4096
    assert payload["messages"] == [{"role": "user", "content": "test"}]
    assert payload["thinking"] == {"type": "adaptive", "display": "omitted"}
    assert payload["output_config"] == {"effort": "high"}


@pytest.mark.asyncio
async def test_vertex_fable_caps_non_streaming_max_tokens(monkeypatch):
    calls = []

    class FakeMessages:
        def create(self, **payload):
            calls.append(payload)
            return FakeResponse()

    class FakeAnthropicVertex:
        def __init__(self, *args, **kwargs):
            self.messages = FakeMessages()

    monkeypatch.setattr("backend.vertex_anthropic_client.AnthropicVertex", FakeAnthropicVertex)
    monkeypatch.setattr("backend.vertex_anthropic_client.VERTEX_PROJECT_ID", "covered-project")

    result = await query_vertex_anthropic_model(
        "anthropic/claude-fable-5",
        [{"role": "user", "content": "test"}],
        max_tokens=32768,
    )

    assert result is not None
    assert calls[0]["max_tokens"] == 16000


@pytest.mark.asyncio
async def test_vertex_fable_returns_none_without_project(monkeypatch):
    class FailIfConstructed:
        def __init__(self, *args, **kwargs):
            raise AssertionError("client should not be constructed without project")

    monkeypatch.setattr("backend.vertex_anthropic_client.AnthropicVertex", FailIfConstructed)
    monkeypatch.setattr("backend.vertex_anthropic_client.VERTEX_PROJECT_ID", None)

    result = await query_vertex_anthropic_model(
        "anthropic/claude-fable-5",
        [{"role": "user", "content": "test"}],
    )

    assert result is None
