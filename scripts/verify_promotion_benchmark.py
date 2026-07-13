#!/usr/bin/env python3
"""Fail closed unless the approved immutable promotion benchmark is exact."""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

RUN_ID = "2026-07-13-flagship-promotion-live-v4"
RUN_DIR = Path(__file__).parents[1] / "benchmarks" / "runs" / RUN_ID
PINNED_HASHES = {
    "config.json": "273afc9819ab4634a63e0e06df70fb82fb890de658599c6509c330675cc72cf1",
    "seat-ablation-report.json": "694e04b6fd25955a192eb0d1c9f821204ed9a3dd9bbe56bddd36c99d5d2da7bd",
    "council-aggregates.jsonl": "5b7beeaaee6700df8f1ff59d511525fb86db218195dcba680bcddce04b5437dc",
}
REGISTRY_DIGEST = "eaeb59a2a69d7781e5e699b9649afdf27968a03f1834187a302cb77c07634783"
MANIFEST_DIGEST = "13d851bcc611bb3dbc0d56c08ad24c82deb03fadf4270b49a4a6d14dc174ec96"
EXPECTED_THRESHOLDS: dict[str, tuple[float, str]] = {
    "cost": (1.25, "maximum"),
    "evaluator_format_rate": (0.0, "minimum"),
    "factual_error_rate": (0.0, "maximum"),
    "full_council_p95_latency": (1.2, "maximum"),
    "grok_direct_failover_rate": (0.02, "maximum"),
    "individual_p95_latency": (1.5, "maximum"),
    "objective_accuracy": (-2.0, "minimum"),
    "quality_by_stratum": (-5.0, "minimum_by_stratum"),
    "quality_overall": (-3.0, "minimum"),
    "route_success_rate": (0.99, "minimum"),
}
EXPECTED_STRATA = {
    "reasoning-evaluator",
    "reasoning-quality",
    "structured-evaluator",
    "structured-quality",
}
EXPECTED_CONFIG_THRESHOLDS = {
    "cost": {"exception_requires_acceptance": True, "max_baseline_multiplier": 1.25},
    "evaluator_format_rate": {"min_delta_points": 0.0},
    "factual_error_rate": {"max_delta_points": 0.0},
    "full_council_p95_latency": {"max_baseline_multiplier": 1.2},
    "grok_direct_failover_rate": {"maximum": 0.02},
    "individual_p95_latency": {"max_baseline_multiplier": 1.5},
    "objective_accuracy": {"min_delta_points": -2.0},
    "quality_by_stratum": {"min_delta_points": -5.0},
    "quality_overall": {"min_delta_points": -3.0},
    "route_success_rate": {"minimum": 0.99},
}


class PromotionBenchmarkError(ValueError):
    """The pinned promotion evidence is missing, stale, or ineligible."""


def _load_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise PromotionBenchmarkError("invalid benchmark object")
    return value


def _is_finite_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _verify_config_thresholds(config: dict[str, Any]) -> None:
    thresholds = config.get("promotion_thresholds")
    if not isinstance(thresholds, dict) or thresholds.keys() != EXPECTED_CONFIG_THRESHOLDS.keys():
        raise PromotionBenchmarkError("benchmark config thresholds mismatch")
    for name, expected in EXPECTED_CONFIG_THRESHOLDS.items():
        actual = thresholds.get(name)
        if not isinstance(actual, dict) or actual.keys() != expected.keys():
            raise PromotionBenchmarkError("benchmark config threshold mismatch")
        for field, expected_value in expected.items():
            actual_value = actual.get(field)
            if isinstance(expected_value, bool):
                matches = actual_value is expected_value
            else:
                matches = _is_finite_number(actual_value) and actual_value == expected_value
            if not matches:
                raise PromotionBenchmarkError("benchmark config threshold mismatch")


def verify_promotion_benchmark(run_dir: Path = RUN_DIR) -> None:
    """Verify hashes, run identity, completeness, and every promotion outcome."""
    for name, expected in PINNED_HASHES.items():
        path = run_dir / name
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise PromotionBenchmarkError("benchmark digest mismatch")

    config = _load_object(run_dir / "config.json")
    if (
        config.get("run_id") != RUN_ID
        or config.get("mode") != "live"
        or config.get("registry_digest") != REGISTRY_DIGEST
        or config.get("run_manifest_digest") != MANIFEST_DIGEST
        or config.get("variant_set") != "flagship-promotion-v1"
        or config.get("settings", {}).get("allow_declared_route_failover") is not False
        or config.get("settings", {}).get("allow_provider_substitution") is not False
    ):
        raise PromotionBenchmarkError("benchmark identity mismatch")
    _verify_config_thresholds(config)

    report = _load_object(run_dir / "seat-ablation-report.json")
    if (
        report.get("expected_count") != 52
        or report.get("completed_count") != 52
        or report.get("missing_cells") != []
        or report.get("production_mutations") != []
        or report.get("promotion_eligible") is not True
        or report.get("promotion_evidence") is not True
        or report.get("quality_available") is not True
    ):
        raise PromotionBenchmarkError("benchmark completeness mismatch")

    outcomes = report.get("threshold_outcomes")
    if not isinstance(outcomes, dict) or outcomes.keys() != EXPECTED_THRESHOLDS.keys():
        raise PromotionBenchmarkError("benchmark outcomes missing")
    if any(not isinstance(item, dict) or item.get("passed") is not True for item in outcomes.values()):
        raise PromotionBenchmarkError("benchmark outcome failed")
    for name, (limit, direction) in EXPECTED_THRESHOLDS.items():
        outcome = outcomes.get(name)
        threshold = outcome.get("threshold") if isinstance(outcome, dict) else None
        if not _is_finite_number(threshold) or threshold != limit:
            raise PromotionBenchmarkError("benchmark threshold mismatch")
        value = outcome.get("value")
        if direction == "minimum_by_stratum":
            if (
                not isinstance(value, dict)
                or value.keys() != EXPECTED_STRATA
                or any(not _is_finite_number(item) or item < limit for item in value.values())
            ):
                raise PromotionBenchmarkError("benchmark stratum threshold exceeded")
            continue
        if not _is_finite_number(value):
            raise PromotionBenchmarkError("benchmark threshold value invalid")
        if (direction == "maximum" and value > limit) or (direction == "minimum" and value < limit):
            raise PromotionBenchmarkError("benchmark threshold exceeded")
    if outcomes["cost"].get("exception_accepted") is not False:
        raise PromotionBenchmarkError("benchmark cost exception accepted")


def main() -> int:
    try:
        verify_promotion_benchmark()
    except (PromotionBenchmarkError, OSError, json.JSONDecodeError, TypeError):
        print("FAIL: promotion benchmark verification failed", file=sys.stderr)
        return 1
    print("SUCCESS: promotion benchmark verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
