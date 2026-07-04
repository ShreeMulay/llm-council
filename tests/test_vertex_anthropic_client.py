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
    monkeypatch.setattr("backend.vertex_anthropic_client._VERTEX_CLIENT_CACHE", {})

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
async def test_vertex_fable_payload_uses_per_call_reasoning_effort_override(monkeypatch):
    calls = []

    class FakeMessages:
        def create(self, **payload):
            calls.append(payload)
            return FakeResponse()

    class FakeAnthropicVertex:
        def __init__(self, project_id, region):
            self.project_id = project_id
            self.region = region
            self.messages = FakeMessages()

    monkeypatch.setattr("backend.vertex_anthropic_client.AnthropicVertex", FakeAnthropicVertex)
    monkeypatch.setattr("backend.vertex_anthropic_client.VERTEX_PROJECT_ID", "covered-project")
    monkeypatch.setattr("backend.vertex_anthropic_client.VERTEX_LOCATION", "us-east5")
    monkeypatch.setattr("backend.vertex_anthropic_client._VERTEX_CLIENT_CACHE", {})

    result = await query_vertex_anthropic_model(
        "anthropic/claude-fable-5",
        [{"role": "user", "content": "test"}],
        max_tokens=4096,
        reasoning_effort="medium",
    )

    assert result is not None
    assert calls[0]["output_config"] == {"effort": "medium"}


@pytest.mark.asyncio
async def test_vertex_client_reuses_cache_by_project_location_without_prompt_leak(monkeypatch):
    constructed = []
    payloads = []
    cache = {}

    class FakeMessages:
        def create(self, **payload):
            payloads.append(payload)
            return FakeResponse()

    class FakeAnthropicVertex:
        def __init__(self, project_id, region):
            constructed.append((project_id, region))
            self.project_id = project_id
            self.region = region
            self.messages = FakeMessages()

    monkeypatch.setattr("backend.vertex_anthropic_client.AnthropicVertex", FakeAnthropicVertex)
    monkeypatch.setattr("backend.vertex_anthropic_client.VERTEX_PROJECT_ID", "covered-project")
    monkeypatch.setattr("backend.vertex_anthropic_client.VERTEX_LOCATION", "global")
    monkeypatch.setattr("backend.vertex_anthropic_client._VERTEX_CLIENT_CACHE", cache)

    first = await query_vertex_anthropic_model(
        "anthropic/claude-fable-5",
        [{"role": "user", "content": "first prompt"}],
    )
    second = await query_vertex_anthropic_model(
        "anthropic/claude-fable-5",
        [{"role": "user", "content": "second prompt"}],
    )

    assert first is not None
    assert second is not None
    assert constructed == [("covered-project", "global")]
    assert list(cache.keys()) == [("covered-project", "global")]
    assert "first prompt" not in repr(cache)
    assert "second prompt" not in repr(cache)
    assert payloads[0]["messages"] == [{"role": "user", "content": "first prompt"}]
    assert payloads[1]["messages"] == [{"role": "user", "content": "second prompt"}]


@pytest.mark.asyncio
async def test_vertex_typeerror_fallback_only_for_unsupported_payload_parameter(monkeypatch):
    calls = []

    class FakeMessages:
        def create(self, **payload):
            calls.append(payload)
            if "thinking" in payload:
                raise TypeError("Messages.create() got an unexpected keyword argument 'thinking'")
            return FakeResponse()

    class FakeAnthropicVertex:
        def __init__(self, *args, **kwargs):
            self.messages = FakeMessages()

    monkeypatch.setattr("backend.vertex_anthropic_client.AnthropicVertex", FakeAnthropicVertex)
    monkeypatch.setattr("backend.vertex_anthropic_client.VERTEX_PROJECT_ID", "covered-project")
    monkeypatch.setattr("backend.vertex_anthropic_client._VERTEX_CLIENT_CACHE", {})

    result = await query_vertex_anthropic_model(
        "anthropic/claude-fable-5",
        [{"role": "user", "content": "test"}],
    )

    assert result is not None
    assert len(calls) == 2
    assert "thinking" in calls[0]
    assert "output_config" in calls[0]
    assert "thinking" not in calls[1]
    assert "output_config" not in calls[1]


@pytest.mark.asyncio
async def test_vertex_typeerror_from_sdk_bug_is_not_masked(monkeypatch):
    calls = []

    class FakeMessages:
        def create(self, **payload):
            calls.append(payload)
            raise TypeError("random sdk bug unrelated to payload parameters")

    class FakeAnthropicVertex:
        def __init__(self, *args, **kwargs):
            self.messages = FakeMessages()

    monkeypatch.setattr("backend.vertex_anthropic_client.AnthropicVertex", FakeAnthropicVertex)
    monkeypatch.setattr("backend.vertex_anthropic_client.VERTEX_PROJECT_ID", "covered-project")
    monkeypatch.setattr("backend.vertex_anthropic_client._VERTEX_CLIENT_CACHE", {})

    with pytest.raises(TypeError, match="random sdk bug"):
        await query_vertex_anthropic_model(
            "anthropic/claude-fable-5",
            [{"role": "user", "content": "test"}],
        )

    assert len(calls) == 1


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
    monkeypatch.setattr("backend.vertex_anthropic_client._VERTEX_CLIENT_CACHE", {})

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
    monkeypatch.setattr("backend.vertex_anthropic_client._VERTEX_CLIENT_CACHE", {})

    result = await query_vertex_anthropic_model(
        "anthropic/claude-fable-5",
        [{"role": "user", "content": "test"}],
    )

    assert result is None
