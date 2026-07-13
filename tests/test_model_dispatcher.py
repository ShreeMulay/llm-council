"""Focused contracts for the provider-neutral model dispatcher."""

from dataclasses import replace

import httpx
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
        "attempted_route_ids": ["fireworks:fireworks/glm-5.2"],
        "attempts": ({"route_id": "fireworks:fireworks/glm-5.2", "attempt": 1, "status": "succeeded"},),
        "selected_route_id": "fireworks:fireworks/glm-5.2",
        "fallback_used": False, "error": None, "terminal_status": "succeeded",
        "fallback_reason": None, "primary_failure_reason": None, "failure_reason": None,
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
async def test_promoted_gpt_5_6_member_executes_exact_openrouter_adapter_boundary():
    calls = []

    async def openrouter(model_id, messages, **settings):
        calls.append((model_id, messages, settings))
        return {"content": "sol"}

    dispatcher = ModelDispatcher(adapters={"openrouter": openrouter})
    result = await dispatcher.query(DispatchRequest("openai/gpt-5.6-sol", MESSAGES))

    assert calls == [("openai/gpt-5.6-sol", MESSAGES, {
        "max_tokens": 32768,
        "temperature": 0.7,
        "reasoning_effort": "medium",
        "allow_provider_substitution": False,
    })]
    assert result["route_id"] == "openrouter:openai/gpt-5.6-sol"
    assert result["selected_route_id"] == "openrouter:openai/gpt-5.6-sol"
    assert result["primary_failure_reason"] is None


@pytest.mark.asyncio
async def test_promoted_gpt_5_6_evaluator_executes_high_effort_at_exact_adapter_boundary():
    from backend.execution_planning import build_execution_plan

    calls = []

    async def openrouter(model_id, messages, **settings):
        calls.append((model_id, messages, settings))
        return {"content": "ranked"}

    plan = build_execution_plan(
        load_registry(), {"query": "rank", "models": ["openai/gpt-5.6-sol"]}
    )
    evaluator = next(
        operation
        for operation in plan.evaluators
        if operation.logical_id == "openai/gpt-5.6-sol"
    )
    result = await ModelDispatcher(adapters={"openrouter": openrouter}).execute(evaluator)

    assert calls == [("openai/gpt-5.6-sol", [{"role": "user", "content": "rank"}], {
        "max_tokens": 8192,
        "temperature": 0.7,
        "reasoning_effort": "high",
        "allow_provider_substitution": False,
    })]
    assert result["selected_route_id"] == "openrouter:openai/gpt-5.6-sol"


@pytest.mark.asyncio
async def test_grok_4_5_direct_failure_uses_exact_openrouter_route_without_provider_substitution():
    calls = []

    async def xai(model_id, _messages, **settings):
        calls.append(("xai", model_id, settings))
        return None

    async def openrouter(model_id, _messages, **settings):
        calls.append(("openrouter", model_id, settings))
        return {"content": "recovered"}

    dispatcher = ModelDispatcher(adapters={"xai": xai, "openrouter": openrouter})
    result = await dispatcher.query(DispatchRequest("x-ai/grok-4.5", MESSAGES))

    operation = dispatcher.capture(DispatchRequest("x-ai/grok-4.5", MESSAGES))
    assert calls == [
        ("xai", operation.routes[0].provider_model_id, {
            "max_tokens": 32768, "temperature": 0.7,
        }),
        ("openrouter", operation.routes[1].provider_model_id, {
            "max_tokens": 32768, "temperature": 0.7,
            "reasoning_effort": operation.settings.reasoning_effort,
            "allow_provider_substitution": False,
        }),
    ]
    assert result["attempted_route_ids"] == [route.route_id for route in operation.routes]
    assert result["attempts"] == (
        {"route_id": "xai:x-ai/grok-4.5", "attempt": 1, "status": "failed", "reason": "empty_response"},
        {"route_id": "openrouter:x-ai/grok-4.5", "attempt": 1, "status": "succeeded"},
    )
    with pytest.raises(TypeError):
        result["attempts"][0]["reason"] = "raw secret"  # type: ignore[index]
    assert result["selected_route_id"] == operation.routes[1].route_id
    assert result["fallback_used"] is True
    assert result["fallback_reason"] == "empty_response"
    assert result["primary_failure_reason"] == "empty_response"
    assert result["failure_reason"] is None


@pytest.mark.asyncio
async def test_grok_4_5_multi_retry_preserves_primary_terminal_reason_on_fallback_success():
    xai_results = [TimeoutError("private"), None]
    openrouter_results = [RuntimeError("private"), {"content": "recovered"}]

    async def xai(*_args, **_kwargs):
        result = xai_results.pop(0)
        if isinstance(result, Exception):
            raise result
        return result

    async def openrouter(*_args, **_kwargs):
        result = openrouter_results.pop(0)
        if isinstance(result, Exception):
            raise result
        return result

    dispatcher = ModelDispatcher(
        adapters={"xai": xai, "openrouter": openrouter}, sleep=lambda _: _done()
    )
    result = await dispatcher.query(DispatchRequest(
        "x-ai/grok-4.5", MESSAGES, max_retries=1, backoff_base=0
    ))

    assert result["attempts"] == (
        {"route_id": "xai:x-ai/grok-4.5", "attempt": 1, "status": "failed", "reason": "timeout"},
        {"route_id": "xai:x-ai/grok-4.5", "attempt": 2, "status": "failed", "reason": "empty_response"},
        {"route_id": "openrouter:x-ai/grok-4.5", "attempt": 1, "status": "failed", "reason": "adapter_error"},
        {"route_id": "openrouter:x-ai/grok-4.5", "attempt": 2, "status": "succeeded"},
    )
    assert result["primary_failure_reason"] == "empty_response"
    assert result["fallback_reason"] == "empty_response"
    assert result["failure_reason"] is None


@pytest.mark.asyncio
async def test_grok_4_5_multi_retry_exhaustion_separates_primary_and_final_reasons():
    async def xai(*_args, **_kwargs):
        raise TimeoutError("private")

    fallback_results = [None, RuntimeError("private")]

    async def openrouter(*_args, **_kwargs):
        result = fallback_results.pop(0)
        if isinstance(result, Exception):
            raise result
        return result

    dispatcher = ModelDispatcher(
        adapters={"xai": xai, "openrouter": openrouter}, sleep=lambda _: _done()
    )
    operation = dispatcher.capture(DispatchRequest(
        "x-ai/grok-4.5", MESSAGES, max_retries=1, backoff_base=0
    ))
    result = await dispatcher.execute(operation)

    assert result["primary_failure_reason"] == "timeout"
    assert result["fallback_reason"] == "timeout"
    assert result["failure_reason"] == "adapter_error"
    assert result["attempts"][-1] == {
        "route_id": "openrouter:x-ai/grok-4.5",
        "attempt": 2,
        "status": "failed",
        "reason": "adapter_error",
    }


@pytest.mark.asyncio
async def test_declared_route_failover_and_provider_substitution_are_independent():
    calls = []

    async def adapter(model_id, _messages, **settings):
        calls.append((model_id, settings))
        return None

    dispatcher = ModelDispatcher(adapters={"xai": adapter, "openrouter": adapter})
    operation = dispatcher.capture(DispatchRequest(
        "x-ai/grok-4.5", MESSAGES,
        allow_declared_route_failover=False,
        allow_provider_substitution=True,
    ))
    result = await dispatcher.execute(operation)

    assert len(calls) == 1
    assert result["attempted_route_ids"] == [operation.routes[0].route_id]
    assert result["selected_route_id"] is None
    assert result["failure_reason"] == "empty_response"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("error_factory", "reason"),
    [
        (lambda: TimeoutError("raw timeout detail"), "timeout"),
        (
            lambda: httpx.HTTPStatusError(
                "raw body with secret",
                request=httpx.Request("POST", "https://provider.invalid"),
                response=httpx.Response(503),
            ),
            "http_error",
        ),
        (lambda: ValueError("unsupported provider secret-provider"), "unsupported_provider"),
        (lambda: RuntimeError("raw adapter secret"), "adapter_error"),
    ],
)
async def test_attempt_failure_categories_are_normalized_without_raw_details(error_factory, reason):
    async def failed(*_args, **_kwargs):
        raise error_factory()

    operation = ModelDispatcher(adapters={"openrouter": failed}).capture(
        DispatchRequest("legacy/model", MESSAGES, provider="openrouter", allow_fallbacks=False)
    )
    result = await ModelDispatcher(adapters={"openrouter": failed}).execute(operation)

    assert result["failure_reason"] == reason
    assert result["attempts"] == ({
        "route_id": "openrouter:legacy/model",
        "attempt": 1,
        "status": "failed",
        "reason": reason,
    },)
    assert "secret" not in repr(result)


@pytest.mark.asyncio
async def test_legacy_allow_fallbacks_never_enables_openrouter_provider_substitution():
    seen = []

    async def openrouter(_model_id, _messages, **settings):
        seen.append(settings)
        return {"content": "ok"}

    dispatcher = ModelDispatcher(adapters={"openrouter": openrouter})
    result = await dispatcher.query(DispatchRequest(
        "legacy/model", MESSAGES, provider="openrouter", allow_fallbacks=True
    ))

    assert result["content"] == "ok"
    assert seen[0]["allow_provider_substitution"] is False


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


@pytest.mark.asyncio
async def test_deployment_strict_dispatch_fails_closed_for_missing_fable_record(monkeypatch):
    monkeypatch.setattr("backend.config.REQUIRE_VERTEX_ANTHROPIC", True)
    calls = []

    async def forbidden_adapter(*args, **kwargs):
        calls.append((args, kwargs))
        return {"content": "unsafe"}

    dispatcher = ModelDispatcher(
        adapters={"vertex": forbidden_adapter, "openrouter": forbidden_adapter}
    )
    fable_id = "anthropic/claude-fable-5"
    dispatcher.registry = replace(
        dispatcher.registry,
        models=tuple(
            model for model in dispatcher.registry.models if model.logical_id != fable_id
        ),
    )

    with pytest.raises(ValueError, match="requires a canonical registry record"):
        await dispatcher.query(DispatchRequest(fable_id, MESSAGES, provider="openrouter"))

    assert calls == []


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
        "attempted_route_ids": ["vertex:anthropic/claude-fable-5"],
        "attempts": ({"route_id": "vertex:anthropic/claude-fable-5", "attempt": 1, "status": "failed", "reason": "empty_response"},),
        "selected_route_id": None, "fallback_reason": None,
        "primary_failure_reason": "empty_response", "failure_reason": "empty_response",
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
    dispatcher.require_vertex_anthropic = True

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
