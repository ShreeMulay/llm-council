"""Provider-neutral dispatch for logical model IDs and exact registry routes."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

import httpx

from . import config
from .execution_planning import PlanOperation, RequestSettings, RetryPolicy, RouteResolution
from .model_registry import ModelRoute, load_registry
from .provider_errors import XAIInvalidUsageError

logger = logging.getLogger("llm-council.dispatcher")
Adapter = Callable[..., Awaitable[dict[str, Any] | None]]


class _FrozenAttempt(dict[str, Any]):
    """JSON-compatible immutable, secret-free attempt provenance."""

    def _immutable(self, *_args, **_kwargs) -> None:
        raise TypeError("attempt provenance is immutable")

    __setitem__ = _immutable
    __delitem__ = _immutable
    clear = _immutable
    pop = _immutable
    popitem = _immutable
    setdefault = _immutable
    update = _immutable
    __ior__ = _immutable


@dataclass(frozen=True)
class DispatchRequest:
    """One query contract shared by council, streaming, and benchmarks."""

    model_id: str
    messages: list[dict[str, str]]
    max_tokens: int = 32768
    temperature: float = 0.7
    reasoning_effort: str | None = None
    timeout: float = 180.0
    max_retries: int = 0
    backoff_base: float = 1.5
    allow_fallbacks: bool = True
    provider: str | None = None
    allow_declared_route_failover: bool | None = None
    allow_provider_substitution: bool = False


class ModelDispatcher:
    """Resolve logical IDs, invoke provider adapters, and normalize results."""

    def __init__(
        self,
        *,
        adapters: dict[str, Adapter] | None = None,
        require_vertex_anthropic: bool | None = None,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        self.registry = load_registry()
        self.adapters = _default_adapters() | (adapters or {})
        self.require_vertex_anthropic = require_vertex_anthropic
        self.sleep = sleep

    async def query(self, request: DispatchRequest) -> dict[str, Any] | None:
        operation = self.capture(request)
        result = await self.execute(operation)
        return None if result.get("terminal_status") == "failed" else result

    def capture(self, request: DispatchRequest) -> PlanOperation:
        """Resolve a legacy request once at its public boundary."""
        allow_declared_route_failover = (
            request.allow_fallbacks
            if request.allow_declared_route_failover is None
            else request.allow_declared_route_failover
        )
        routes = tuple(
            RouteResolution(request.model_id, route.route_id, route.provider, route.provider_model_id, route.adapter)
            for route in self._routes(request)
        )
        return PlanOperation(
            request.model_id,
            routes,
            tuple((str(item["role"]), str(item["content"])) for item in request.messages),
            RequestSettings(
                request.max_tokens,
                request.temperature,
                request.reasoning_effort or config.get_model_reasoning_effort(request.model_id),
                allow_declared_route_failover,
                request.allow_provider_substitution,
            ),
            RetryPolicy(request.timeout, request.max_retries, request.backoff_base),
            "provider-neutral-dispatch/v2",
        )

    async def execute(self, operation: PlanOperation) -> dict[str, Any] | None:
        """Execute only captured data; registry and config are never consulted."""
        routes = (
            operation.routes
            if operation.settings.allow_declared_route_failover
            else operation.routes[:1]
        )
        attempted_route_ids: list[str] = []
        attempts: list[_FrozenAttempt] = []
        failure_reason = "empty_response"
        primary_failure_reason: str | None = None
        terminal_failure = False
        for route_index, route in enumerate(routes):
            attempted_route_ids.append(route.route_id)
            for attempt in range(operation.retry.max_retries + 1):
                try:
                    raw = await asyncio.wait_for(
                        self._invoke_captured(route, operation),
                        timeout=operation.retry.timeout_seconds,
                    )
                    if raw and raw.get("content"):
                        attempts.append(_FrozenAttempt(
                            route_id=route.route_id,
                            attempt=attempt + 1,
                            status="succeeded",
                        ))
                        return _normalize(
                            raw,
                            operation.logical_id,
                            route,
                            route_index > 0,
                            attempted_route_ids,
                            attempts,
                            primary_failure_reason,
                        )
                    failure_reason = "empty_response"
                except Exception as error:
                    failure_reason = _failure_category(error)
                    logger.warning(
                        "Route %s attempt %d failed for %s (%s)",
                        route.route_id,
                        attempt + 1,
                        operation.logical_id,
                        failure_reason,
                    )
                attempts.append(_FrozenAttempt(
                    route_id=route.route_id,
                    attempt=attempt + 1,
                    status="failed",
                    reason=failure_reason,
                ))
                if failure_reason == "invalid_usage":
                    terminal_failure = True
                    break
                if attempt < operation.retry.max_retries:
                    await self.sleep(operation.retry.backoff_base_seconds * (2**attempt))
            if terminal_failure:
                break
            if route_index == 0:
                primary_failure_reason = failure_reason
        route = route if terminal_failure else routes[-1]
        return {
            "content": "",
            "usage": {},
            "provider": route.provider,
            "model": operation.logical_id,
            "route_id": route.route_id,
            "attempted_route_ids": attempted_route_ids,
            "attempts": tuple(attempts),
            "selected_route_id": None,
            "fallback_used": len(attempted_route_ids) > 1,
            "fallback_reason": (
                primary_failure_reason if len(attempted_route_ids) > 1 else None
            ),
            "primary_failure_reason": primary_failure_reason,
            "failure_reason": failure_reason,
            "error": {
                "code": "invalid_usage" if terminal_failure else "provider_exhausted",
                "message": (
                    "Provider returned invalid usage metadata"
                    if terminal_failure
                    else "All captured routes failed"
                ),
            },
            "terminal_status": "failed",
        }

    def _routes(self, request: DispatchRequest) -> tuple[ModelRoute, ...]:
        strict_vertex = self._strict_vertex(request.model_id)
        try:
            record = self.registry.model(request.model_id)
        except KeyError:
            if strict_vertex:
                raise ValueError(
                    f"Strict Vertex Anthropic policy requires a canonical registry record for {request.model_id}"
                ) from None
            return (_legacy_route(request.model_id, request.provider),)

        if strict_vertex:
            vertex_routes = tuple(
                route for route in record.routes if route.provider == "vertex"
            )
            if len(vertex_routes) != 1:
                raise ValueError(
                    f"Strict Vertex Anthropic policy requires exactly one Vertex route for {request.model_id}; found {len(vertex_routes)}"
                )
            return vertex_routes
        ordered = (record.preferred_route,) + tuple(
            route for route in record.routes if route != record.preferred_route
        )
        if request.provider:
            selected = tuple(route for route in ordered if route.provider == request.provider)
            if selected:
                ordered = selected
            elif request.provider == "openrouter":
                ordered = (
                    ModelRoute(
                        f"openrouter:{request.model_id}",
                        "openrouter",
                        config.get_openrouter_fallback(request.model_id) or request.model_id,
                        "openrouter_adapter",
                    ),
                )
        allow_declared_route_failover = (
            request.allow_fallbacks
            if request.allow_declared_route_failover is None
            else request.allow_declared_route_failover
        )
        return ordered if allow_declared_route_failover else ordered[:1]

    def _strict_vertex(self, model_id: str) -> bool:
        """Deployment policy is a floor; constructors may only strengthen it."""
        return config.is_vertex_anthropic_model(model_id) and (
            config.REQUIRE_VERTEX_ANTHROPIC or self.require_vertex_anthropic is True
        )

    async def _invoke(self, route: ModelRoute, request: DispatchRequest) -> dict[str, Any] | None:
        adapter = self.adapters.get(route.provider)
        if adapter is None:
            raise ValueError(f"unsupported provider {route.provider}")
        kwargs: dict[str, Any] = {
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
        }
        reasoning = request.reasoning_effort or config.get_model_reasoning_effort(request.model_id)
        if route.provider in {"openrouter", "fireworks", "vertex"}:
            kwargs["reasoning_effort"] = reasoning
        if route.provider == "openrouter":
            kwargs["allow_provider_substitution"] = request.allow_provider_substitution
        return await adapter(route.provider_model_id, request.messages, **kwargs)

    async def _invoke_captured(
        self, route: RouteResolution, operation: PlanOperation
    ) -> dict[str, Any] | None:
        adapter = self.adapters.get(route.provider)
        if adapter is None:
            raise ValueError(f"unsupported provider {route.provider}")
        kwargs: dict[str, Any] = {
            "max_tokens": operation.settings.max_tokens,
            "temperature": operation.settings.temperature,
        }
        if route.provider in {"openrouter", "fireworks", "vertex"}:
            kwargs["reasoning_effort"] = operation.settings.reasoning_effort
        if route.provider == "openrouter":
            kwargs["allow_provider_substitution"] = (
                operation.settings.allow_provider_substitution
            )
        messages = [
            {"role": role, "content": content} for role, content in operation.messages
        ]
        return await adapter(route.provider_model_id, messages, **kwargs)


def _default_adapters() -> dict[str, Adapter]:
    # Resolve through modules at construction time so tests and deployments can
    # replace clients without stale function references.
    from . import (
        cerebras,
        fireworks_client,
        gemini_client,
        moonshot_client,
        openrouter,
        vertex_anthropic_client,
        xai_client,
    )

    return {
        "openrouter": openrouter.query_model,
        "vertex": vertex_anthropic_client.query_vertex_anthropic_model,
        "fireworks": fireworks_client.query_fireworks_model,
        "cerebras": cerebras.query_cerebras_model,
        "moonshot": moonshot_client.query_moonshot_model,
        "xai": xai_client.query_xai_model,
        "gemini": gemini_client.query_gemini_model,
    }


def _legacy_route(model_id: str, provider: str | None) -> ModelRoute:
    selected = provider or (
        "fireworks" if config.is_fireworks_model(model_id)
        else "cerebras" if config.is_cerebras_model(model_id)
        else "moonshot" if config.is_moonshot_model(model_id)
        else "xai" if config.is_xai_model(model_id)
        else "gemini" if config.is_gemini_direct_model(model_id)
        else "vertex" if config.is_vertex_anthropic_model(model_id)
        else "openrouter"
    )
    provider_id = config.get_openrouter_fallback(model_id) or model_id if selected == "openrouter" else model_id
    return ModelRoute(f"{selected}:{model_id}", selected, provider_id, f"{selected}_adapter")


def _normalize(
    raw: dict[str, Any],
    logical_id: str,
    route: ModelRoute | RouteResolution,
    fallback_used: bool,
    attempted_route_ids: list[str],
    attempts: list[_FrozenAttempt],
    fallback_reason: str | None,
) -> dict[str, Any]:
    result = dict(raw)
    provider = str(result.get("provider") or route.provider)
    if fallback_used and not provider.endswith("-fallback"):
        provider = f"{provider}-fallback"
    result.update(
        content=str(result.get("content") or ""),
        usage=result.get("usage") or {},
        provider=provider,
        model=logical_id,
        route_id=route.route_id,
        attempted_route_ids=list(attempted_route_ids),
        attempts=tuple(attempts),
        selected_route_id=route.route_id,
        fallback_used=fallback_used,
        fallback_reason=fallback_reason,
        primary_failure_reason=fallback_reason,
        failure_reason=None,
        error=None,
        terminal_status="succeeded",
    )
    return result


def _failure_category(error: Exception) -> str:
    """Map provider failures to bounded categories without retaining details."""
    if isinstance(error, XAIInvalidUsageError):
        return "invalid_usage"
    if isinstance(error, (TimeoutError, httpx.TimeoutException)):
        return "timeout"
    if isinstance(error, httpx.HTTPStatusError):
        return "http_error"
    if isinstance(error, ValueError) and str(error).startswith("unsupported provider"):
        return "unsupported_provider"
    return "adapter_error"


async def query_model(request: DispatchRequest) -> dict[str, Any] | None:
    """Convenience entry point using production adapters."""
    return await ModelDispatcher().query(request)
