"""Benchmark cost and metric calculations."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from .models import PricingSnapshot


@dataclass(frozen=True)
class CostBreakdown:
    """Token usage and estimated cost for a single result."""

    prompt_tokens: int | None
    completion_tokens: int | None
    total_tokens: int | None
    input_cost_usd: float | None
    output_cost_usd: float | None
    total_cost_usd: float | None
    pricing_source: str
    pricing_captured_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def compute_cost(usage: dict[str, Any] | None, pricing: PricingSnapshot) -> CostBreakdown:
    """Compute list-price cost from a pricing snapshot.

    Missing usage metadata returns unknown costs instead of fabricating numbers.
    """
    usage = usage or {}
    prompt_tokens = usage.get("prompt_tokens")
    completion_tokens = usage.get("completion_tokens")
    total_tokens = usage.get("total_tokens")

    if prompt_tokens is None or completion_tokens is None:
        return CostBreakdown(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            input_cost_usd=None,
            output_cost_usd=None,
            total_cost_usd=None,
            pricing_source=pricing.source,
            pricing_captured_at=pricing.captured_at,
        )

    input_cost = (int(prompt_tokens) / 1_000_000) * pricing.input_per_million_usd
    output_cost = (int(completion_tokens) / 1_000_000) * pricing.output_per_million_usd
    total_cost = input_cost + output_cost

    return CostBreakdown(
        prompt_tokens=int(prompt_tokens),
        completion_tokens=int(completion_tokens),
        total_tokens=int(total_tokens or int(prompt_tokens) + int(completion_tokens)),
        input_cost_usd=input_cost,
        output_cost_usd=output_cost,
        total_cost_usd=total_cost,
        pricing_source=pricing.source,
        pricing_captured_at=pricing.captured_at,
    )


def output_tokens_per_second(completion_tokens: int | None, latency_seconds: float) -> float | None:
    """Compute generated-token throughput."""
    if not completion_tokens or latency_seconds <= 0:
        return None
    return completion_tokens / latency_seconds
