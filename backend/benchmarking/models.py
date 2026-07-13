"""Benchmark variant and pricing configuration."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import asdict, dataclass

PRICING_SOURCE = "approved benchmark plan/current lookup snapshot for model-benchmark-harness"
PRICING_CAPTURED_AT = "2026-06-20T00:00:00Z"
JULY_2026_PRICING_SOURCE = "approved OpenSpec roster-refresh-2026-07 conservative pricing snapshot"
JULY_2026_PRICING_CAPTURED_AT = "2026-07-04T00:00:00Z"
DEFAULT_VARIANT_SET = "default"
JULY_2026_ROSTER_VARIANT_SET = "july-2026-roster"
FLAGSHIP_PROMOTION_VARIANT_SET = "flagship-promotion-v1"
FLAGSHIP_PROMPT_SET_VERSION = "flagship-promotion-v2"
JULY_2026_PROMOTION_THRESHOLDS = {
    "minimax-vs-llama": {
        "candidate_variant_id": "openrouter-minimax-m3",
        "baseline_variant_id": "openrouter-llama-4-maverick",
        "min_mean_score_delta": 0.0,
        "max_median_latency_multiplier": 2.0,
        "max_estimated_cost_multiplier": 2.0,
    },
    "kimi2.7-vs-kimi2.6": {
        "candidate_variant_id": "fireworks-kimi-k2.7-code",
        "baseline_variant_id": "fireworks-kimi-k2.6",
        "min_mean_score_delta": -0.25,
        "coding_debugging_subset_min_delta": 0.0,
    },
    "glm-fw-vs-z-ai-glm": {
        "candidate_variant_id": "fireworks-glm-5.2-xhigh",
        "baseline_variant_id": "openrouter-z-ai-glm-5.2",
        "win_min_mean_score_delta": 0.25,
        "tie_window_mean_score_delta": 0.25,
        "tie_requires_latency_improvement": True,
        "max_estimated_cost_multiplier": 2.0,
    },
}
FLAGSHIP_PROMOTION_THRESHOLDS = {
    "quality_overall": {"min_delta_points": -3.0},
    "quality_by_stratum": {"min_delta_points": -5.0},
    "objective_accuracy": {"min_delta_points": -2.0},
    "evaluator_format_rate": {"min_delta_points": 0.0},
    "factual_error_rate": {"max_delta_points": 0.0},
    "route_success_rate": {"minimum": 0.99},
    "grok_direct_failover_rate": {"maximum": 0.02},
    "full_council_p95_latency": {"max_baseline_multiplier": 1.20},
    "individual_p95_latency": {"max_baseline_multiplier": 1.50},
    "cost": {"max_baseline_multiplier": 1.25, "exception_requires_acceptance": True},
}


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
    route_id: str | None = None
    allow_declared_route_failover: bool = False
    allow_provider_substitution: bool = False

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
class CouncilBenchmarkVariant:
    """Pre-registered full-council or single-seat ablation."""

    variant_id: str
    roster: tuple[str, ...]
    ablated_seat: str | None = None
    configuration: str = "full"


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


def _july_pricing(input_usd: float, output_usd: float) -> PricingSnapshot:
    return PricingSnapshot(
        input_per_million_usd=input_usd,
        output_per_million_usd=output_usd,
        source=JULY_2026_PRICING_SOURCE,
        captured_at=JULY_2026_PRICING_CAPTURED_AT,
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

JULY_2026_ROSTER_VARIANT_SPECS: tuple[VariantSpec, ...] = (
    VariantSpec(
        BenchmarkVariant(
            variant_id="openrouter-llama-4-maverick",
            provider="openrouter",
            model_id="meta-llama/llama-4-maverick",
            display_name="Llama 4 Maverick baseline via OpenRouter",
            reasoning_effort=None,
            pricing=_july_pricing(0.30, 0.60),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="openrouter-minimax-m3",
            provider="openrouter",
            model_id="minimax/minimax-m3",
            display_name="MiniMax M3 challenger via OpenRouter",
            reasoning_effort=None,
            pricing=_july_pricing(0.30, 1.20),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="fireworks-kimi-k2.6",
            provider="fireworks",
            model_id="fireworks/kimi-k2.6",
            display_name="Kimi K2.6 baseline via Fireworks",
            reasoning_effort=None,
            pricing=_july_pricing(0.60, 2.50),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="fireworks-kimi-k2.7-code",
            provider="fireworks",
            model_id="fireworks/kimi-k2.7-code",
            display_name="Kimi K2.7 Code challenger via Fireworks",
            reasoning_effort=None,
            pricing=_july_pricing(0.80, 4.00),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="openrouter-z-ai-glm-5.2",
            provider="openrouter",
            model_id="z-ai/glm-5.2",
            display_name="z-ai GLM-5.2 production baseline via OpenRouter",
            reasoning_effort=None,
            pricing=_july_pricing(0.91, 2.86),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="fireworks-glm-5.2-xhigh",
            provider="fireworks",
            model_id="fireworks/glm-5.2",
            display_name="Fireworks GLM-5.2 xHigh challenger",
            reasoning_effort="xhigh",
            pricing=_july_pricing(1.40, 4.40),
        )
    ),
    VariantSpec(
        BenchmarkVariant(
            variant_id="openrouter-claude-fable-5",
            provider="openrouter",
            model_id="anthropic/claude-fable-5",
            display_name="Claude Fable 5 challenger via OpenRouter",
            reasoning_effort="medium",
            pricing=_july_pricing(10.00, 50.00),
        )
    ),
)

_CURRENT_COUNCIL = (
    "openai/gpt-5.6-sol",
    "anthropic/claude-fable-5",
    "fireworks/glm-5.2",
    "google/gemini-3.1-pro-preview",
    "x-ai/grok-4.5",
    "fireworks/kimi-k2.7-code",
    "deepseek/deepseek-v4-pro",
    "meta-llama/llama-4-maverick",
    "qwen/qwen3.7-max",
)
_LEGACY_COUNCIL = (
    "openai/gpt-5.5",
    *_CURRENT_COUNCIL[1:4],
    "x-ai/grok-4.3",
    *_CURRENT_COUNCIL[5:],
)

_SEAT_ABLATIONS = tuple(
    CouncilBenchmarkVariant(
        f"seat-removal-{index}",
        tuple(model for model in _CURRENT_COUNCIL if model != seat),
        seat,
        "removed",
    )
    for index, seat in enumerate(_CURRENT_COUNCIL, 1)
)

PROMOTION_COUNCIL_VARIANTS: tuple[CouncilBenchmarkVariant, ...] = (
    CouncilBenchmarkVariant("full-council-old", _LEGACY_COUNCIL, configuration="legacy"),
    CouncilBenchmarkVariant("full-council-new", _CURRENT_COUNCIL),
    *_SEAT_ABLATIONS,
    CouncilBenchmarkVariant(
        "seat-ablation-gpt",
        ("openai/gpt-5.5", *_CURRENT_COUNCIL[1:]),
        "openai/gpt-5.6-sol",
        "replacement",
    ),
    CouncilBenchmarkVariant(
        "seat-ablation-grok",
        (*_CURRENT_COUNCIL[:4], "x-ai/grok-4.3", *_CURRENT_COUNCIL[5:]),
        "x-ai/grok-4.5",
        "replacement",
    ),
)

FLAGSHIP_PROMOTION_VARIANT_SPECS: tuple[VariantSpec, ...] = (
    VariantSpec(BenchmarkVariant(
        "openrouter-gpt-5.5-medium", "openrouter", "openai/gpt-5.5",
        "GPT-5.5 baseline", "medium", _july_pricing(5.0, 30.0),
        route_id="openrouter:openai/gpt-5.5",
    ), probe_key="promotion:openai/gpt-5.5"),
    VariantSpec(BenchmarkVariant(
        "openrouter-gpt-5.6-sol-medium", "openrouter", "openai/gpt-5.6-sol",
        "GPT-5.6 Sol candidate", "medium", _july_pricing(5.0, 30.0),
        route_id="openrouter:openai/gpt-5.6-sol",
    ), probe_key="promotion:openai/gpt-5.6-sol"),
    VariantSpec(BenchmarkVariant(
        "xai-grok-4.3", "xai", "x-ai/grok-4.3", "Grok 4.3 baseline", None,
        _july_pricing(3.0, 15.0), route_id="xai:x-ai/grok-4.3",
    ), probe_key="promotion:x-ai/grok-4.3"),
    VariantSpec(BenchmarkVariant(
        "xai-grok-4.5", "xai", "x-ai/grok-4.5", "Grok 4.5 candidate", None,
        _july_pricing(3.0, 15.0), route_id="xai:x-ai/grok-4.5",
    ), probe_key="promotion:x-ai/grok-4.5"),
)
FLAGSHIP_PROMOTION_VARIANTS = tuple(spec.variant for spec in FLAGSHIP_PROMOTION_VARIANT_SPECS)

VARIANT_SETS = {
    DEFAULT_VARIANT_SET: DEFAULT_VARIANT_SPECS,
    JULY_2026_ROSTER_VARIANT_SET: JULY_2026_ROSTER_VARIANT_SPECS,
    FLAGSHIP_PROMOTION_VARIANT_SET: FLAGSHIP_PROMOTION_VARIANT_SPECS,
}

PROMOTION_THRESHOLDS_BY_VARIANT_SET = {
    JULY_2026_ROSTER_VARIANT_SET: JULY_2026_PROMOTION_THRESHOLDS,
    FLAGSHIP_PROMOTION_VARIANT_SET: FLAGSHIP_PROMOTION_THRESHOLDS,
}


def promotion_thresholds_for_variant_set(variant_set: str) -> dict[str, dict[str, object]]:
    """Return pre-registered promotion thresholds for a variant set."""
    return PROMOTION_THRESHOLDS_BY_VARIANT_SET.get(variant_set, {})


def resolve_benchmark_variants(
    variant_set: str | Sequence[VariantSpec | BenchmarkVariant] = DEFAULT_VARIANT_SET,
    probe_results: dict[str, bool] | None = None,
) -> VariantResolution:
    """Resolve benchmark variants, blocking gated efforts and invalid Fireworks IDs fail-closed."""
    if isinstance(variant_set, str):
        try:
            specs = VARIANT_SETS[variant_set]
        except KeyError as exc:
            raise ValueError(f"unknown benchmark variant set: {variant_set}") from exc
    else:
        specs = tuple(
            VariantSpec(item) if isinstance(item, BenchmarkVariant) else item
            for item in variant_set
        )

    _validate_fireworks_mappings(specs)
    return _resolve_variant_specs(specs, probe_results)


def _validate_fireworks_mappings(specs: Sequence[VariantSpec]) -> None:
    from backend.fireworks_client import FIREWORKS_MODEL_MAP

    missing = sorted(
        spec.variant.model_id
        for spec in specs
        if spec.variant.provider == "fireworks" and spec.variant.model_id not in FIREWORKS_MODEL_MAP
    )
    if missing:
        raise ValueError(
            "Fireworks benchmark variants require explicit FIREWORKS_MODEL_MAP entries: "
            + ", ".join(missing)
        )


def _resolve_variant_specs(
    specs: Sequence[VariantSpec],
    probe_results: dict[str, bool] | None = None,
) -> VariantResolution:
    probes = probe_results or {}
    variants: list[BenchmarkVariant] = []
    blocked: list[BlockedVariant] = []

    for spec in specs:
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


def resolve_default_variants(probe_results: dict[str, bool] | None = None) -> VariantResolution:
    """Resolve default variants, blocking support-probe-gated efforts fail-closed."""
    return resolve_benchmark_variants(DEFAULT_VARIANT_SET, probe_results)
