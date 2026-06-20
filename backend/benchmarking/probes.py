"""Support probes for benchmark-only gated model variants."""

from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class ProbeTarget:
    """A benchmark support probe target."""

    key: str
    provider: str
    model_id: str
    reasoning_effort: str


@dataclass(frozen=True)
class ProbeResult:
    """Structured support-probe outcome."""

    key: str
    provider: str
    model_id: str
    reasoning_effort: str
    supported: bool
    reason: str

    def to_dict(self) -> dict[str, str | bool]:
        return asdict(self)


PROBE_TARGETS: dict[str, ProbeTarget] = {
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
}


async def probe_target(target: ProbeTarget, timeout: float = 30.0) -> ProbeResult:
    """Probe one gated variant with a tiny no-fallback OpenRouter request.

    This function fails closed: errors, timeouts, unsupported settings, and None
    responses all return supported=False with a reason.
    """
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
            max_tokens=16,
            temperature=0,
            timeout=timeout,
            reasoning_effort=target.reasoning_effort,
            allow_fallbacks=False,
        )
    except Exception as exc:
        return ProbeResult(
            key=target.key,
            provider=target.provider,
            model_id=target.model_id,
            reasoning_effort=target.reasoning_effort,
            supported=False,
            reason=f"probe error: {exc}",
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

    return ProbeResult(
        key=target.key,
        provider=target.provider,
        model_id=target.model_id,
        reasoning_effort=target.reasoning_effort,
        supported=True,
        reason="probe call succeeded",
    )


async def run_support_probes(
    keys: list[str] | None = None,
    timeout: float = 30.0,
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
        results.append(await probe_target(target, timeout=timeout))
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
            )
        )
    return results
