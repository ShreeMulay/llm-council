"""Focused contracts for the provider-neutral model dispatcher."""

from dataclasses import replace

import pytest

from backend.model_dispatcher import DispatchRequest, ModelDispatcher
from backend.model_registry import load_registry

MESSAGES = [{"role": "user", "content": "hello"}]


@pytest.mark.asyncio
async def test_dispatches_logical_id_to_exact_primary_route_and_normalizes(monkeypatch):
    calls = []

    async def fireworks(model_id, messages, **settings):
        calls.append((model_id, messages, settings))
        return {"content": "ok", "usage": None}

    dispatcher = ModelDispatcher(adapters={"fireworks": fireworks})
    result = await dispatcher.query(
        DispatchRequest("fireworks/glm-5.2", MESSAGES, reasoning_effort="high")
    )

    assert calls == [("accounts/fireworks/models/glm-5p2", MESSAGES, {
        "max_tokens": 32768, "temperature": 0.7, "reasoning_effort": "high"
    })]
    assert result == {
        "content": "ok", "usage": {}, "provider": "fireworks",
        "model": "fireworks/glm-5.2", "route_id": "fireworks:fireworks/glm-5.2",
        "fallback_used": False, "error": None, "terminal_status": "succeeded",
    }


@pytest.mark.asyncio
async def test_fallback_uses_next_exact_route_and_labels_provider(monkeypatch):
    calls = []

    async def vertex(*args, **kwargs):
        return None

    async def openrouter(model_id, messages, **settings):
        calls.append((model_id, settings))
        return {"content": "fallback", "usage": {}, "provider": "openrouter"}

    dispatcher = ModelDispatcher(adapters={"vertex": vertex, "openrouter": openrouter})
    result = await dispatcher.query(
        DispatchRequest("anthropic/claude-fable-5", MESSAGES, reasoning_effort="xhigh")
    )

    assert calls[0][0] == "anthropic/claude-fable-5"
    assert calls[0][1]["reasoning_effort"] == "xhigh"
    assert result["provider"] == "openrouter-fallback"
    assert result["fallback_used"] is True


@pytest.mark.asyncio
async def test_strict_vertex_never_calls_fallback():
    calls = []

    async def failed_vertex(*args, **kwargs):
        calls.append("vertex")
        return None

    async def forbidden_fallback(*args, **kwargs):
        calls.append("openrouter")
        return {"content": "unsafe"}

    dispatcher = ModelDispatcher(
        adapters={"vertex": failed_vertex, "openrouter": forbidden_fallback},
        require_vertex_anthropic=True,
    )
    result = await dispatcher.query(DispatchRequest("anthropic/claude-fable-5", MESSAGES))

    assert result is None
    assert calls == ["vertex"]


@pytest.mark.parametrize("constructor_policy", [None, False])
def test_deployment_strict_policy_ignores_openrouter_override(monkeypatch, constructor_policy):
    monkeypatch.setattr("backend.config.REQUIRE_VERTEX_ANTHROPIC", True)
    dispatcher = ModelDispatcher(require_vertex_anthropic=constructor_policy)

    operation = dispatcher.capture(DispatchRequest(
        "anthropic/claude-fable-5", MESSAGES, provider="openrouter"
    ))

    assert [route.provider for route in operation.routes] == ["vertex"]
    assert operation.routes[0].route_id == "vertex:anthropic/claude-fable-5"


def test_constructor_can_strengthen_non_strict_deployment(monkeypatch):
    monkeypatch.setattr("backend.config.REQUIRE_VERTEX_ANTHROPIC", False)
    dispatcher = ModelDispatcher(require_vertex_anthropic=True)

    operation = dispatcher.capture(DispatchRequest(
        "anthropic/claude-fable-5", MESSAGES, provider="openrouter"
    ))

    assert [route.provider for route in operation.routes] == ["vertex"]


def test_strict_dispatch_selects_vertex_when_openrouter_is_preferred():
    dispatcher = ModelDispatcher(require_vertex_anthropic=True)
    fable = dispatcher.registry.model("anthropic/claude-fable-5")
    openrouter = next(route for route in fable.routes if route.provider == "openrouter")
    dispatcher.registry = dispatcher.registry.with_preferred_route(
        fable.logical_id, openrouter.route_id
    )

    operation = dispatcher.capture(DispatchRequest(
        fable.logical_id, MESSAGES, provider="openrouter"
    ))

    assert [route.provider for route in operation.routes] == ["vertex"]
    assert operation.routes[0].route_id == "vertex:anthropic/claude-fable-5"


@pytest.mark.parametrize("vertex_count", [0, 2])
def test_strict_dispatch_fails_closed_for_invalid_vertex_routes(vertex_count):
    dispatcher = ModelDispatcher(require_vertex_anthropic=True)
    registry = load_registry()
    fable = registry.model("anthropic/claude-fable-5")
    vertex = next(route for route in fable.routes if route.provider == "vertex")
    non_vertex = tuple(route for route in fable.routes if route.provider != "vertex")
    dispatcher.registry = replace(
        registry,
        models=tuple(
            replace(model, routes=non_vertex + ((vertex,) * vertex_count))
            if model == fable else model
            for model in registry.models
        ),
    )

    with pytest.raises(ValueError, match=f"exactly one Vertex route.*found {vertex_count}"):
        dispatcher.capture(DispatchRequest(fable.logical_id, MESSAGES, provider="openrouter"))


def test_non_strict_explicit_openrouter_remains_available(monkeypatch):
    monkeypatch.setattr("backend.config.REQUIRE_VERTEX_ANTHROPIC", False)
    dispatcher = ModelDispatcher(require_vertex_anthropic=False)

    operation = dispatcher.capture(DispatchRequest(
        "anthropic/claude-fable-5", MESSAGES, provider="openrouter"
    ))

    assert [route.provider for route in operation.routes] == ["openrouter"]


@pytest.mark.asyncio
async def test_retries_primary_before_fallback():
    attempts = 0

    async def flaky(model_id, messages, **settings):
        nonlocal attempts
        attempts += 1
        return None if attempts == 1 else {"content": "recovered"}

    dispatcher = ModelDispatcher(adapters={"fireworks": flaky}, sleep=lambda _: _done())
    result = await dispatcher.query(
        DispatchRequest("fireworks/glm-5.2", MESSAGES, max_retries=1, backoff_base=0)
    )

    assert attempts == 2
    assert result["content"] == "recovered"


@pytest.mark.asyncio
async def test_fallbacks_disabled_uses_only_selected_registered_provider():
    calls = []

    async def vertex(*args, **kwargs):
        calls.append("vertex")
        return None

    async def openrouter(*args, **kwargs):
        calls.append("openrouter")
        return {"content": "wrong route"}

    dispatcher = ModelDispatcher(adapters={"vertex": vertex, "openrouter": openrouter})
    operation = dispatcher.capture(DispatchRequest(
        "anthropic/claude-fable-5", MESSAGES, allow_fallbacks=False, max_retries=0
    ))
    result = await dispatcher.execute(operation)

    assert result == {
        "content": "", "usage": {}, "provider": "vertex", "model": "anthropic/claude-fable-5",
        "route_id": "vertex:anthropic/claude-fable-5", "fallback_used": False,
        "error": {"code": "provider_exhausted", "message": "All captured routes failed"},
        "terminal_status": "failed",
    }
    assert calls == ["vertex"]


@pytest.mark.asyncio
async def test_captured_operation_is_registry_independent_and_parity_safe():
    calls = []

    async def primary(model_id, _messages, **_settings):
        calls.append(("primary", model_id))
        return None

    async def fallback(model_id, _messages, **_settings):
        calls.append(("fallback", model_id))
        return {"content": "ok", "provider": "openrouter"}

    dispatcher = ModelDispatcher(adapters={"vertex": primary, "openrouter": fallback})
    operation = dispatcher.capture(DispatchRequest("anthropic/claude-fable-5", MESSAGES))
    dispatcher.registry = object()  # execution must not consult this mutated source

    first = await dispatcher.execute(operation)
    second = await dispatcher.execute(operation)

    assert first == second
    assert first["provider"] == "openrouter-fallback"
    assert [route.provider for route in operation.routes] == ["vertex", "openrouter"]


@pytest.mark.asyncio
async def test_captured_no_fallback_operation_stays_single_route():
    dispatcher = ModelDispatcher(adapters={"openrouter": lambda *_args, **_kwargs: _done()})
    operation = dispatcher.capture(DispatchRequest("legacy/model", MESSAGES, provider="openrouter", allow_fallbacks=False))
    assert len(operation.routes) == 1
    assert replace(operation.settings, temperature=0.1).temperature == 0.1


async def _done():
    return None
