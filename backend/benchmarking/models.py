"""Benchmark variant and pricing configuration."""

from __future__ import annotations

from dataclasses import asdict, dataclass

PRICING_SOURCE = "approved benchmark plan/current lookup snapshot for model-benchmark-harness"
PRICING_CAPTURED_AT = "2026-06-20T00:00:00Z"


@dataclass(frozen=True)
class PricingSnapshot:
    """Per-million token price snapshot and provenance."""

    input_per_million_usd: float
    output_per_million_usd: float
    source: str
    captured_at: str

    def to_dict(self) -> dict[str, float | str]:
        return asdict(self)


@dataclass(frozen=True)
class BenchmarkVariant:
    """Resolved benchmark model variant."""

    variant_id: str
    provider: str
    model_id: str
    display_name: str
    reasoning_effort: str | None
    pricing: PricingSnapshot
    allow_fallbacks: bool = False

    def to_dict(self) -> dict[str, object]:
        data = asdict(self)
        data["pricing"] = self.pricing.to_dict()
        return data


@dataclass(frozen=True)
class VariantSpec:
    """Variant before support-probe resolution."""

    variant: BenchmarkVariant
    probe_key: str | None = None


@dataclass(frozen=True)
class BlockedVariant:
    """Probe-gated variant that is intentionally skipped."""

    variant_id: str
    provider: str
    model_id: str
    display_name: str
    reasoning_effort: str | None
    pricing: PricingSnapshot
    reason: str
    probe_key: str | None

    def to_dict(self) -> dict[str, object]:
        data = asdict(self)
        data["pricing"] = self.pricing.to_dict()
        return data


@dataclass(frozen=True)
class VariantResolution:
    """Resolved runnable variants plus blocked/skipped variants."""

    variants: list[BenchmarkVariant]
    blocked: list[BlockedVariant]


def _pricing(input_usd: float, output_usd: float) -> PricingSnapshot:
    return PricingSnapshot(
        input_per_million_usd=input_usd,
        output_per_million_usd=output_usd,
        source=PRICING_SOURCE,
        captured_at=PRICING_CAPTURED_AT,
    )


DEFAULT_VARIANT_SPECS: tuple[VariantSpec, ...] = (
    VariantSpec(
        BenchmarkVariant(
            variant_id="fireworks-glm-5.2-default",
            provider="fireworks",
            model_id="fireworks/glm-5.2",
            display_name="Fireworks GLM-5.2 default",
            reasoning_effort=None,
            pricing=_pricing(1.40, 4.40),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="fireworks-glm-5.2-xhigh",
            provider="fireworks",
            model_id="fireworks/glm-5.2",
            display_name="Fireworks GLM-5.2 xHigh challenger",
            reasoning_effort="xhigh",
            pricing=_pricing(1.40, 4.40),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="openrouter-gpt-5.5-medium",
            provider="openrouter",
            model_id="openai/gpt-5.5",
            display_name="GPT-5.5 medium via OpenRouter",
            reasoning_effort="medium",
            pricing=_pricing(5.00, 30.00),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="openrouter-gpt-5.5-high",
            provider="openrouter",
            model_id="openai/gpt-5.5",
            display_name="GPT-5.5 high via OpenRouter",
            reasoning_effort="high",
            pricing=_pricing(5.00, 30.00),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="openrouter-gpt-5.5-xhigh",
            provider="openrouter",
            model_id="openai/gpt-5.5",
            display_name="GPT-5.5 xhigh via OpenRouter",
            reasoning_effort="xhigh",
            pricing=_pricing(5.00, 30.00),
        ),
        probe_key="openrouter:gpt-5.5:xhigh",
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="openrouter-opus-4.8-xhigh",
            provider="openrouter",
            model_id="anthropic/claude-opus-4.8",
            display_name="Claude Opus 4.8 xhigh via OpenRouter",
            reasoning_effort="xhigh",
            pricing=_pricing(5.00, 25.00),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="openrouter-opus-4.8-max",
            provider="openrouter",
            model_id="anthropic/claude-opus-4.8",
            display_name="Claude Opus 4.8 max via OpenRouter",
            reasoning_effort="max",
            pricing=_pricing(5.00, 25.00),
        ),
        probe_key="openrouter:claude-opus-4.8:max",
    ),
)


def resolve_default_variants(probe_results: dict[str, bool] | None = None) -> VariantResolution:
    """Resolve default variants, blocking support-probe-gated efforts fail-closed."""
    probes = probe_results or {}
    variants: list[BenchmarkVariant] = []
    blocked: list[BlockedVariant] = []

    for spec in DEFAULT_VARIANT_SPECS:
        variant = spec.variant
        if spec.probe_key and probes.get(spec.probe_key) is not True:
            blocked.append(
                BlockedVariant(
                    variant_id=variant.variant_id,
                    provider=variant.provider,
                    model_id=variant.model_id,
                    display_name=variant.display_name,
                    reasoning_effort=variant.reasoning_effort,
                    pricing=variant.pricing,
                    reason="support probe did not validate this reasoning effort",
                    probe_key=spec.probe_key,
                )
            )
            continue
        variants.append(variant)

    return VariantResolution(variants=variants, blocked=blocked)
