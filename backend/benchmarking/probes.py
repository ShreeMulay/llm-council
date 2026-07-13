"""Support probes for benchmark-only gated model variants."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import asdict, dataclass
from types import MappingProxyType

from .budget import BudgetGuard
from .costs import validate_usage

PROBE_MAX_TOKENS = 16
PROBE_PROJECTED_COST_USD = 0.002


@dataclass(frozen=True)
class ProbeTarget:
    """A benchmark support probe target."""

    key: str
    provider: str
    model_id: str
    reasoning_effort: str | None
    route_id: str | None = None


@dataclass(frozen=True)
class ProbeResult:
    """Structured support-probe outcome."""

    key: str
    provider: str
    model_id: str
    reasoning_effort: str | None
    supported: bool
    reason: str
    route_id: str | None = None
    allow_declared_route_failover: bool = False
    allow_provider_substitution: bool = False
    projected_cost_usd: float = PROBE_PROJECTED_COST_USD
    observed_cost_usd: float = 0.0
    usage_complete: bool = False
    prompt_tokens: int | None = None
    completion_tokens: int | None = None

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


PROBE_TARGETS: Mapping[str, ProbeTarget] = MappingProxyType({
    "openrouter:gpt-5.5:xhigh": ProbeTarget(
        key="openrouter:gpt-5.5:xhigh",
        provider="openrouter",
        model_id="openai/gpt-5.5",
        reasoning_effort="xhigh",
    ),
    "openrouter:claude-opus-4.8:max": ProbeTarget(
        key="openrouter:claude-opus-4.8:max",
        provider="openrouter",
        model_id="anthropic/claude-opus-4.8",
        reasoning_effort="max",
    ),
    "promotion:openai/gpt-5.5": ProbeTarget(
        "promotion:openai/gpt-5.5", "openrouter", "openai/gpt-5.5", "medium",
        "openrouter:openai/gpt-5.5",
    ),
    "promotion:openai/gpt-5.6-sol": ProbeTarget(
        "promotion:openai/gpt-5.6-sol", "openrouter", "openai/gpt-5.6-sol", "medium",
        "openrouter:openai/gpt-5.6-sol",
    ),
    "promotion:x-ai/grok-4.3": ProbeTarget(
        "promotion:x-ai/grok-4.3", "xai", "x-ai/grok-4.3", None,
        "xai:x-ai/grok-4.3",
    ),
    "promotion:x-ai/grok-4.5": ProbeTarget(
        "promotion:x-ai/grok-4.5", "xai", "x-ai/grok-4.5", None,
        "xai:x-ai/grok-4.5",
    ),
})


async def probe_target(target: ProbeTarget, timeout: float = 30.0) -> ProbeResult:
    """Probe one gated variant with a tiny no-fallback OpenRouter request.

    This function fails closed: errors, timeouts, unsupported settings, and None
    responses all return supported=False with a reason.
    """
    if target.route_id is not None:
        return await _probe_exact_route(target, timeout)
    if target.provider != "openrouter":
        return ProbeResult(
            key=target.key,
            provider=target.provider,
            model_id=target.model_id,
            reasoning_effort=target.reasoning_effort,
            supported=False,
            reason=f"unsupported probe provider: {target.provider}",
        )

    try:
        from backend.openrouter import query_model

        response = await query_model(
            target.model_id,
            [{"role": "user", "content": "Reply with OK."}],
            max_tokens=PROBE_MAX_TOKENS,
            temperature=0,
            timeout=timeout,
            reasoning_effort=target.reasoning_effort,
            allow_fallbacks=False,
            allow_provider_substitution=False,
        )
    except Exception as exc:
        return ProbeResult(
            key=target.key,
            provider=target.provider,
            model_id=target.model_id,
            reasoning_effort=target.reasoning_effort,
            supported=False,
            reason=f"probe error: {type(exc).__name__}",
        )

    if response is None:
        return ProbeResult(
            key=target.key,
            provider=target.provider,
            model_id=target.model_id,
            reasoning_effort=target.reasoning_effort,
            supported=False,
            reason="probe returned no response",
        )

    usage = response.get("usage") if isinstance(response, Mapping) else None
    accounting = _probe_accounting(usage, PROBE_PROJECTED_COST_USD)
    return ProbeResult(
        key=target.key,
        provider=target.provider,
        model_id=target.model_id,
        reasoning_effort=target.reasoning_effort,
        supported=True,
        reason="probe call succeeded",
        **accounting,
    )


async def _probe_exact_route(target: ProbeTarget, timeout: float) -> ProbeResult:
    """Probe a registry route with all routing substitution disabled."""
    try:
        from backend.model_dispatcher import DispatchRequest, query_model

        response = await query_model(DispatchRequest(
            model_id=target.model_id,
            messages=[{"role": "user", "content": "Reply with OK."}],
            max_tokens=16,
            temperature=0,
            reasoning_effort=target.reasoning_effort,
            timeout=timeout,
            allow_fallbacks=False,
            provider=target.provider,
            allow_declared_route_failover=False,
            allow_provider_substitution=False,
        ))
    except Exception as exc:
        return ProbeResult(
            target.key, target.provider, target.model_id, target.reasoning_effort, False,
            f"probe error: {type(exc).__name__}", target.route_id,
        )

    observed_route = response.get("route_id") if response else None
    supported = bool(response and response.get("content") and observed_route == target.route_id)
    reason = "exact route probe succeeded" if supported else "exact route probe failed"
    accounting = _probe_accounting(
        response.get("usage") if isinstance(response, Mapping) else None,
        PROBE_PROJECTED_COST_USD,
    )
    return ProbeResult(
        target.key, target.provider, target.model_id, target.reasoning_effort, supported,
        reason, target.route_id, projected_cost_usd=PROBE_PROJECTED_COST_USD,
        observed_cost_usd=accounting["observed_cost_usd"],
        usage_complete=accounting["usage_complete"],
        prompt_tokens=accounting["prompt_tokens"],
        completion_tokens=accounting["completion_tokens"],
    )


def _probe_accounting(
    usage: object, reservation: float
) -> dict[str, float | bool | int | None]:
    """Return content-free conservative probe accounting metadata."""
    validated = validate_usage(usage, allow_missing=True)
    complete = validated is not None
    prompt_tokens = validated["prompt_tokens"] if validated else None
    completion_tokens = validated["completion_tokens"] if validated else None
    observed = (
        prompt_tokens * 50.0 / 1_000_000
        + completion_tokens * 100.0 / 1_000_000
        if complete
        else reservation
    )
    return {
        "projected_cost_usd": reservation,
        "observed_cost_usd": observed,
        "usage_complete": complete,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
    }


async def run_support_probes(
    keys: list[str] | None = None,
    timeout: float = 30.0,
    budget: BudgetGuard | None = None,
    projected_cost_usd: float = PROBE_PROJECTED_COST_USD,
) -> list[ProbeResult]:
    """Run support probes for requested gated variants."""
    selected_keys = keys or list(PROBE_TARGETS)
    results: list[ProbeResult] = []
    for key in selected_keys:
        target = PROBE_TARGETS.get(key)
        if target is None:
            results.append(
                ProbeResult(
                    key=key,
                    provider="unknown",
                    model_id="unknown",
                    reasoning_effort="unknown",
                    supported=False,
                    reason="unknown probe key",
                )
            )
            continue
        if budget is not None and not budget.can_start(projected_cost_usd):
            break
        result = await probe_target(target, timeout=timeout)
        if projected_cost_usd != result.projected_cost_usd or not result.usage_complete:
            result = ProbeResult(
                **{
                    **result.to_dict(),
                    "projected_cost_usd": projected_cost_usd,
                    "observed_cost_usd": (
                        result.observed_cost_usd if result.usage_complete else projected_cost_usd
                    ),
                }
            )
        results.append(result)
        if budget is not None:
            budget.record_observed(
                result.observed_cost_usd if result.usage_complete else None,
                reserved_cost_usd=projected_cost_usd,
            )
            if budget.stopped:
                break
    return results


def probe_support_map(results: list[ProbeResult]) -> dict[str, bool]:
    """Convert probe details to the variant resolver's bool map."""
    return {result.key: result.supported for result in results}


def configured_probe_results(probe_results: dict[str, bool]) -> list[ProbeResult]:
    """Represent injected probe results in config artifact form."""
    results: list[ProbeResult] = []
    for key, supported in sorted(probe_results.items()):
        target = PROBE_TARGETS.get(key)
        results.append(
            ProbeResult(
                key=key,
                provider=target.provider if target else "unknown",
                model_id=target.model_id if target else "unknown",
                reasoning_effort=target.reasoning_effort if target else "unknown",
                supported=supported,
                reason="preconfigured probe result",
                route_id=target.route_id if target else None,
            )
        )
    return results
