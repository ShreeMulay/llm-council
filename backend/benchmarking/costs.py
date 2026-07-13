"""Benchmark cost and metric calculations."""

from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from numbers import Real
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


def validate_usage(
    usage: object, *, allow_missing: bool = False
) -> dict[str, int] | None:
    """Validate and conservatively normalize complete provider token usage."""
    if usage is None or (isinstance(usage, Mapping) and not usage):
        if allow_missing:
            return None
        raise ValueError("provider usage is missing")
    if not isinstance(usage, Mapping):
        raise ValueError("provider usage must be a mapping")

    required = ("prompt_tokens", "completion_tokens", "total_tokens")
    missing = [key for key in required if key not in usage]
    if missing:
        raise ValueError(f"provider usage missing required fields: {', '.join(missing)}")

    validated: dict[str, int] = {}
    for key in required:
        value = usage[key]
        if (
            isinstance(value, bool)
            or not isinstance(value, Real)
            or not math.isfinite(float(value))
            or value < 0
            or int(value) != value
        ):
            raise ValueError(f"provider usage {key} must be a finite non-negative integer")
        validated[key] = int(value)

    completion_details = usage.get("completion_tokens_details")
    reasoning_tokens = 0
    if completion_details is not None:
        if not isinstance(completion_details, Mapping):
            raise ValueError("provider usage completion_tokens_details must be a mapping")
        if "reasoning_tokens" in completion_details:
            reasoning_value = completion_details["reasoning_tokens"]
            if (
                isinstance(reasoning_value, bool)
                or not isinstance(reasoning_value, Real)
                or not math.isfinite(float(reasoning_value))
                or reasoning_value < 0
                or int(reasoning_value) != reasoning_value
            ):
                raise ValueError(
                    "provider usage reasoning_tokens must be a finite non-negative integer"
                )
            reasoning_tokens = int(reasoning_value)

    prompt_tokens = validated["prompt_tokens"]
    reported_completion_tokens = validated["completion_tokens"]
    total_tokens = validated["total_tokens"]
    reported_sum = prompt_tokens + reported_completion_tokens
    if total_tokens not in (reported_sum, reported_sum + reasoning_tokens):
        raise ValueError("provider usage total_tokens is inconsistent")

    # Some providers exclude reasoning from completion_tokens while others include it.
    # Billing total minus prompt is conservative in both representations.
    validated["completion_tokens"] = total_tokens - prompt_tokens
    return validated


def compute_cost(
    usage: object,
    pricing: PricingSnapshot,
    *,
    allow_missing_usage: bool = False,
) -> CostBreakdown:
    """Compute list-price cost from a pricing snapshot.

    Missing usage metadata returns unknown costs instead of fabricating numbers.
    """
    validated = validate_usage(usage, allow_missing=allow_missing_usage)
    if validated is None:
        return CostBreakdown(
            prompt_tokens=None,
            completion_tokens=None,
            total_tokens=None,
            input_cost_usd=None,
            output_cost_usd=None,
            total_cost_usd=None,
            pricing_source=pricing.source,
            pricing_captured_at=pricing.captured_at,
        )

    prompt_tokens = validated["prompt_tokens"]
    completion_tokens = validated["completion_tokens"]
    total_tokens = validated["total_tokens"]
    input_cost = (prompt_tokens / 1_000_000) * pricing.input_per_million_usd
    output_cost = (completion_tokens / 1_000_000) * pricing.output_per_million_usd
    total_cost = input_cost + output_cost

    return CostBreakdown(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
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
