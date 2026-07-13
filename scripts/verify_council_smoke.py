#!/usr/bin/env python3
"""Collect multi-sample, content-free council deployment evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import statistics
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from pathlib import Path
from types import MappingProxyType
from typing import Any

from backend.execution_planning import ExecutionPlan, build_execution_plan
from backend.model_registry import load_registry
from scripts.verify_promotion_benchmark import PromotionBenchmarkError, verify_promotion_benchmark

EXPECTED_CHAIRMAN_OUTPUT = "DEPLOYMENT_CHECK_OK: 2+2=4"
SYNTHETIC_QUERY = (
    "This is a deterministic non-sensitive deployment check. State exactly "
    f"'{EXPECTED_CHAIRMAN_OUTPUT}' and do not add other claims."
)
MIN_SAMPLES = 5
MIN_STREAM_SAMPLES = 1
PAIRED_TRIAL_ORDER = ("AB", "BA", "AB", "BA", "AB")
MAX_SSE_BYTES = 8 * 1024 * 1024
MAX_SSE_EVENTS = 100
ALLOWED_STREAM_EVENTS = {
    "stage_start", "model_response", "model_failed", "stage_complete", "synthesis", "complete",
}
PROMPT_COST_UPPER_BOUND_PER_MILLION = 50.0
COMPLETION_COST_UPPER_BOUND_PER_MILLION = 100.0
APPROVED_LEGACY_FALLBACK_PROVIDER = "openrouter-fallback"
PRICING_SNAPSHOT_ID = "oracle-approved-rollout-pricing-2026-07-13-v1"
PRICING_SNAPSHOT_CAPTURED_AT = "2026-07-13"
PRICING_SNAPSHOT_SOURCE = (
    "approved OpenSpec/direct provider snapshots plus OpenRouter public catalog"
)
MODEL_ROUTE_LIST_PRICING = MappingProxyType({
    ("openai/gpt-5.5", "openrouter:openai/gpt-5.5"): (5.0, 30.0),
    ("openai/gpt-5.6-sol", "openrouter:openai/gpt-5.6-sol"): (5.0, 30.0),
    ("anthropic/claude-fable-5", "vertex:anthropic/claude-fable-5"): (10.0, 50.0),
    ("fireworks/glm-5.2", "fireworks:fireworks/glm-5.2"): (1.4, 4.4),
    ("fireworks/glm-5.2", "openrouter:fireworks/glm-5.2"): (1.4, 4.4),
    ("google/gemini-3.1-pro-preview", "openrouter:google/gemini-3.1-pro-preview"): (2.0, 12.0),
    ("x-ai/grok-4.3", "xai:x-ai/grok-4.3"): (3.0, 15.0),
    ("x-ai/grok-4.5", "xai:x-ai/grok-4.5"): (3.0, 15.0),
})


def _pricing_snapshot_digest(
    table: Any = MODEL_ROUTE_LIST_PRICING,
    source: str = PRICING_SNAPSHOT_SOURCE,
    captured_at: str = PRICING_SNAPSHOT_CAPTURED_AT,
) -> str:
    canonical = {
        "captured_at": captured_at,
        "source": source,
        "table": [
            {
                "model": model,
                "route_id": route,
                "input_usd_per_million": prices[0],
                "output_usd_per_million": prices[1],
            }
            for (model, route), prices in sorted(table.items())
        ],
    }
    encoded = json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


PRICING_SNAPSHOT_DIGEST = _pricing_snapshot_digest()
PRICING_SNAPSHOT_METADATA = MappingProxyType({
    "pricing_snapshot_id": PRICING_SNAPSHOT_ID,
    "pricing_snapshot_captured_at": PRICING_SNAPSHOT_CAPTURED_AT,
    "pricing_snapshot_source": PRICING_SNAPSHOT_SOURCE,
    "pricing_snapshot_digest": PRICING_SNAPSHOT_DIGEST,
})

LEGACY_ROUTE_PROVIDER_ALIASES = MappingProxyType({
    "vertex": "vertex-anthropic",
})


def canonical_smoke_plan() -> ExecutionPlan:
    """Build the same no-fallback compact plan requested by this smoke check."""
    return build_execution_plan(
        load_registry(),
        {
            "query": SYNTHETIC_QUERY,
            "compact": True,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
        },
    )


_CANONICAL_PLAN = canonical_smoke_plan()
EXPECTED_MODELS = tuple(item.logical_id for item in _CANONICAL_PLAN.stage1)
EXPECTED_ROUTES = tuple(item.route.route_id for item in _CANONICAL_PLAN.stage1)
EXPECTED_EVALUATORS = tuple(item.logical_id for item in _CANONICAL_PLAN.evaluators)
EXPECTED_EVALUATOR_ROUTES = tuple(item.route.route_id for item in _CANONICAL_PLAN.evaluators)
EXPECTED_CHAIRMAN = _CANONICAL_PLAN.chairman.logical_id
EXPECTED_CHAIRMAN_ROUTE = _CANONICAL_PLAN.chairman.route.route_id


class SmokeVerificationError(ValueError):
    """Raised for a council smoke contract failure."""


def load_secret(project: str, secret: str) -> str:
    result = subprocess.run(
        ["gcloud", "secrets", "versions", "access", "latest", "--secret", secret, "--project", project],
        check=True,
        capture_output=True,
        text=True,
    )
    key = result.stdout.strip()
    if not key:
        raise SmokeVerificationError("council authentication secret is empty")
    return key


def _request_body() -> bytes:
    return json.dumps(
        {
            "query": SYNTHETIC_QUERY,
            "compact": True,
            "final_only": False,
            "tool_context": False,
            "include_details": False,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
        }
    ).encode()


def post_council(url: str, key: str, timeout: float) -> tuple[dict[str, Any], float]:
    body = _request_body()
    request = urllib.request.Request(
        f"{url.rstrip('/')}/api/council",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json", "X-Council-Key": key},
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as exc:
        raise SmokeVerificationError(f"council endpoint returned HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise SmokeVerificationError("council endpoint request failed") from exc
    elapsed = time.monotonic() - started
    if status != 200:
        raise SmokeVerificationError(f"council endpoint returned HTTP {status}")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SmokeVerificationError("council endpoint returned invalid JSON") from exc
    if not isinstance(payload, dict):
        raise SmokeVerificationError("council response must be an object")
    return payload, elapsed


def parse_sse_complete(lines: Any) -> dict[str, Any]:
    """Parse a bounded SSE stream and return its single complete event."""
    buffered_data: list[str] = []
    total_bytes = 0
    event_count = 0

    def finish_event() -> dict[str, Any] | None:
        nonlocal event_count
        if not buffered_data:
            return None
        event_count += 1
        if event_count > MAX_SSE_EVENTS:
            raise SmokeVerificationError("council stream exceeded event limit")
        try:
            event = json.loads("\n".join(buffered_data))
        except json.JSONDecodeError as exc:
            raise SmokeVerificationError("council stream contained malformed SSE JSON") from exc
        buffered_data.clear()
        if not isinstance(event, dict) or event.get("event") not in ALLOWED_STREAM_EVENTS:
            raise SmokeVerificationError("council stream contained an unexpected event")
        return event

    try:
        for raw_line in lines:
            if not isinstance(raw_line, bytes):
                raise SmokeVerificationError("council stream contained malformed SSE data")
            total_bytes += len(raw_line)
            if total_bytes > MAX_SSE_BYTES:
                raise SmokeVerificationError("council stream exceeded byte limit")
            try:
                line = raw_line.decode("utf-8").rstrip("\r\n")
            except UnicodeDecodeError as exc:
                raise SmokeVerificationError("council stream contained malformed UTF-8") from exc
            if not line:
                event = finish_event()
                if event is None:
                    continue
                if event["event"] == "complete":
                    return event
                continue
            if line.startswith(":"):
                continue
            if not line.startswith("data:"):
                raise SmokeVerificationError("council stream contained malformed SSE framing")
            data = line[5:]
            buffered_data.append(data[1:] if data.startswith(" ") else data)
    except (TimeoutError, OSError) as exc:
        raise SmokeVerificationError("council stream timed out or was truncated") from exc

    raise SmokeVerificationError("council stream ended without a complete event")


def post_council_stream(url: str, key: str, timeout: float) -> tuple[dict[str, Any], float]:
    request = urllib.request.Request(
        f"{url.rstrip('/')}/api/council/stream",
        data=_request_body(),
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "text/event-stream", "X-Council-Key": key},
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            if response.status != 200:
                raise SmokeVerificationError(f"council stream endpoint returned HTTP {response.status}")
            payload = parse_sse_complete(iter(lambda: response.readline(MAX_SSE_BYTES + 1), b""))
    except urllib.error.HTTPError as exc:
        raise SmokeVerificationError(f"council stream endpoint returned HTTP {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise SmokeVerificationError("council stream endpoint request failed") from exc
    return payload, time.monotonic() - started


def _results(payload: dict[str, Any]) -> list[dict[str, Any]]:
    stage1, stage2, stage3 = payload.get("stage1"), payload.get("stage2"), payload.get("stage3")
    if not isinstance(stage1, list) or not stage1 or not all(isinstance(item, dict) for item in stage1):
        raise SmokeVerificationError("stage1 structure is invalid")
    if not isinstance(stage2, list) or not stage2 or not all(isinstance(item, dict) for item in stage2):
        raise SmokeVerificationError("evaluator structure is invalid")
    if not isinstance(stage3, dict):
        raise SmokeVerificationError("chairman structure is invalid")
    return [*stage1, *stage2, stage3]


def _observed_route(item: dict[str, Any]) -> Any:
    """Use terminal dispatcher provenance, never the configured route projection."""
    return item.get("selected_route_id")


def _provenance_item(
    item: dict[str, Any], *, preserve_legacy_fields: bool = False
) -> dict[str, Any]:
    proof = {
        "model": item.get("model"),
        "observed_route_id": _observed_route(item),
        "fallback_used": item.get("fallback_used"),
        "allow_declared_route_failover": item.get("allow_declared_route_failover"),
        "allow_provider_substitution": item.get("allow_provider_substitution"),
        "terminal_status": item.get("terminal_status"),
    }
    if preserve_legacy_fields:
        proof.update(
            provider=item.get("provider"),
            configured_route_id=item.get("route_id"),
        )
    return proof


def smoke_proof(payload: dict[str, Any], *, legacy_baseline: bool = False) -> dict[str, Any]:
    _results(payload)
    plan = payload.get("metadata", {}).get("execution_plan", {})
    proof = {
        "stage1": [
            _provenance_item(item, preserve_legacy_fields=legacy_baseline)
            for item in payload["stage1"]
        ],
        "stage2": [
            _provenance_item(item, preserve_legacy_fields=legacy_baseline)
            for item in payload["stage2"]
        ],
        "stage3": _provenance_item(
            payload["stage3"], preserve_legacy_fields=legacy_baseline
        ),
        "plan_models": [[item.get("model"), item.get("route_id")] for item in plan.get("models", [])],
        "registry_digest": plan.get("registry_digest"),
        "settings": plan.get("settings"),
    }
    if legacy_baseline:
        proof["provenance_contract"] = "legacy-partial-terminal-provenance"
    return proof


def _percentile(values: list[float], percentile: float) -> float:
    return sorted(values)[max(0, math.ceil(percentile * len(values)) - 1)]


def _sample_metrics(
    payload: dict[str, Any],
    elapsed: float,
    *,
    legacy_baseline: bool = False,
    max_tokens: int | None = None,
) -> dict[str, float | None]:
    results = _results(payload)
    if legacy_baseline:
        successful = [
            item.get("terminal_status") in (None, "succeeded")
            and item.get("error") is None
            and bool(item.get("response") or item.get("ranking"))
            for item in results
        ]
    else:
        successful = [
            item.get("terminal_status") == "succeeded"
            and item.get("fallback_used") is False
            and bool(_observed_route(item))
            and not item.get("error")
            for item in results
        ]
    errors = sum(
        not ok or not (item.get("response") or item.get("ranking"))
        for ok, item in zip(successful, results, strict=True)
    )
    chairman_response = payload["stage3"].get("response")
    chairman_text = " ".join(chairman_response.split()) if isinstance(chairman_response, str) else ""
    objective_correct = chairman_text == EXPECTED_CHAIRMAN_OUTPUT
    factual_correct = objective_correct
    evaluator_format = all(
        bool(item.get("parsed_ranking"))
        or (legacy_baseline and bool(item.get("ranking")))
        for item in payload["stage2"]
    )
    prompt_tokens = 0
    completion_tokens = 0
    tokens = 0
    list_cost_usd = 0.0
    plan_models = payload.get("metadata", {}).get("execution_plan", {}).get("models", [])
    planned_routes: dict[str, set[str]] = {}
    if legacy_baseline and isinstance(plan_models, list):
        for planned in plan_models:
            if not isinstance(planned, dict):
                continue
            model, route = planned.get("model"), planned.get("route_id")
            if isinstance(model, str) and isinstance(route, str) and route:
                planned_routes.setdefault(model, set()).add(route)
    stage1_count = len(payload["stage1"])
    for index, item in enumerate(results):
        usage = item.get("usage")
        model = item.get("model")
        if not isinstance(model, str) or not model:
            raise SmokeVerificationError("successful council result model is missing")
        route = item.get("route_id") if legacy_baseline else _observed_route(item)
        resolved_legacy_route = legacy_baseline and not route and index >= stage1_count
        if resolved_legacy_route:
            routes = planned_routes.get(model, set())
            if len(routes) != 1:
                raise SmokeVerificationError(
                    "legacy model-route mapping is missing or ambiguous"
                )
            route = next(iter(routes))
            provider = item.get("provider")
            if not isinstance(provider, str) or not provider:
                raise SmokeVerificationError(
                    "legacy route-less result provider is missing"
                )
            if provider.endswith("-fallback"):
                raise SmokeVerificationError(
                    "legacy route-less result fallback provider is not canonical"
                )
            route_provider = route.partition(":")[0]
            canonical_provider = LEGACY_ROUTE_PROVIDER_ALIASES.get(
                route_provider, route_provider
            )
            if provider != canonical_provider:
                raise SmokeVerificationError(
                    "legacy route-less result provider does not match resolved route"
                )
        if not isinstance(route, str) or not route:
            raise SmokeVerificationError("successful council result route is missing")
        prices = MODEL_ROUTE_LIST_PRICING.get((model, route))
        if prices is None:
            raise SmokeVerificationError("successful council result model-route price is unknown")
        legacy_xai = legacy_baseline and (
            item.get("provider") == "xai"
            or (isinstance(model, str) and model.startswith("x-ai/grok-"))
        )
        if not isinstance(usage, dict):
            raise SmokeVerificationError("successful council result usage is missing")
        values = tuple(usage.get(key) for key in ("prompt_tokens", "completion_tokens", "total_tokens"))
        if legacy_xai:
            if any(
                isinstance(value, bool)
                or not isinstance(value, int)
                or value < 0
                or (max_tokens is not None and value > max_tokens)
                for value in values
            ):
                raise SmokeVerificationError("successful council result usage is invalid")
            prompt, reported_completion, total = values
            if total < prompt + reported_completion:
                raise SmokeVerificationError("successful council result usage total is inconsistent")
            completion = total - prompt
        else:
            if any(
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or (isinstance(value, float) and not math.isfinite(value))
                or value < 0
                for value in values
            ):
                raise SmokeVerificationError("successful council result usage is invalid")
            prompt, completion, total = values
            totals_match = (
                prompt + completion == total
                if all(isinstance(value, int) for value in values)
                else math.isclose(prompt + completion, total, rel_tol=0.0, abs_tol=1e-9)
            )
            if not totals_match:
                raise SmokeVerificationError("successful council result usage total is inconsistent")
        try:
            operation_cost = (prompt * prices[0] + completion * prices[1]) / 1_000_000
        except OverflowError as exc:
            raise SmokeVerificationError("successful council result cost is nonfinite") from exc
        if not math.isfinite(operation_cost):
            raise SmokeVerificationError("successful council result cost is nonfinite")
        prompt_tokens += prompt
        completion_tokens += completion
        tokens += total
        list_cost_usd += operation_cost
    reported = payload.get("timing", {}).get("elapsed_seconds")
    if not isinstance(reported, (int, float)):
        raise SmokeVerificationError("reported latency metric is missing")
    return {
        "quality_score": 70.0 * objective_correct + 20.0 * factual_correct + 10.0 * evaluator_format,
        "objective_correct": float(objective_correct),
        "factual_error": float(not factual_correct),
        "evaluator_format_success": float(evaluator_format),
        "route_success": (
            None if legacy_baseline else sum(successful) / len(results)
        ),
        "error_rate": errors / len(results),
        "elapsed_latency": elapsed,
        "reported_latency": float(reported),
        "token_count": float(tokens),
        "conservative_cost_usd": (
            prompt_tokens * PROMPT_COST_UPPER_BOUND_PER_MILLION
            + completion_tokens * COMPLETION_COST_UPPER_BOUND_PER_MILLION
        ) / 1_000_000,
        "list_cost_usd": list_cost_usd,
    }


def _strict_provenance(payload: dict[str, Any], proof: dict[str, Any]) -> None:
    expected_stage1 = [
        {
            "model": model,
            "observed_route_id": route,
            "fallback_used": False,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
            "terminal_status": "succeeded",
        }
        for model, route in zip(EXPECTED_MODELS, EXPECTED_ROUTES, strict=True)
    ]
    expected_stage2 = [
        {
            "model": model,
            "observed_route_id": route,
            "fallback_used": False,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
            "terminal_status": "succeeded",
        }
        for model, route in zip(EXPECTED_EVALUATORS, EXPECTED_EVALUATOR_ROUTES, strict=True)
    ]
    expected_stage3 = {
        "model": EXPECTED_CHAIRMAN, "observed_route_id": EXPECTED_CHAIRMAN_ROUTE,
        "fallback_used": False, "terminal_status": "succeeded",
        "allow_declared_route_failover": False,
        "allow_provider_substitution": False,
    }
    if proof["stage1"] != expected_stage1:
        raise SmokeVerificationError("candidate Stage1 model/observed route provenance is not exact")
    if proof["stage2"] != expected_stage2:
        raise SmokeVerificationError("candidate Stage2 model/observed route provenance is not exact")
    if proof["stage3"] != expected_stage3:
        raise SmokeVerificationError("candidate Stage3 model/observed route provenance is not exact")
    if proof["settings"] != {
        "allow_declared_route_failover": False,
        "allow_provider_substitution": False,
    }:
        raise SmokeVerificationError("execution plan request policy is not strict")
    planned = dict(proof["plan_models"])
    expected = list(zip(EXPECTED_MODELS, EXPECTED_ROUTES, strict=True))
    if any(planned.get(model) != route for model, route in expected):
        raise SmokeVerificationError("execution plan route provenance is not exact")


def verify_payload(
    payload: dict[str, Any],
    elapsed: float,
    *,
    max_latency: float,
    max_tokens: int,
    max_cost: float,
    max_error_rate: float = 0.0,
    expected_proof: dict[str, Any] | None = None,
    strict_candidate: bool = True,
    legacy_baseline: bool = False,
) -> dict[str, Any]:
    """Verify one sample. Kept as a focused unit-test/API seam."""
    proof = smoke_proof(payload, legacy_baseline=legacy_baseline)
    results = _results(payload)
    if legacy_baseline:
        if any(
            bool(item.get("fallback_used"))
            and item.get("provider") != APPROVED_LEGACY_FALLBACK_PROVIDER
            for item in results
        ):
            raise SmokeVerificationError("legacy baseline fallback provider is not approved")
        if any(item.get("error") is not None for item in results):
            raise SmokeVerificationError("legacy baseline contains an explicit error")
        if any(
            "terminal_status" in item and item.get("terminal_status") != "succeeded"
            for item in results
        ):
            raise SmokeVerificationError("legacy baseline contains an explicit failure")
        if any(not (item.get("response") or item.get("ranking")) for item in results):
            raise SmokeVerificationError("legacy baseline result content is missing")
    else:
        if any(item.get("fallback_used") is not False for item in results):
            raise SmokeVerificationError("fallback success contract failed")
        if any(item.get("terminal_status") != "succeeded" or item.get("error") for item in results):
            raise SmokeVerificationError("council contains an unsuccessful result")
    if strict_candidate:
        _strict_provenance(payload, proof)
    if expected_proof is not None and proof != expected_proof:
        raise SmokeVerificationError("restored council provenance does not match baseline")
    metrics = _sample_metrics(
        payload, elapsed, legacy_baseline=legacy_baseline, max_tokens=max_tokens
    )
    if metrics["route_success"] is not None and metrics["route_success"] < 0.99:
        raise SmokeVerificationError("fallback or observed route success fell below 99%")
    if metrics["error_rate"] > max_error_rate:
        raise SmokeVerificationError("council error rate exceeded ceiling")
    if max(metrics["elapsed_latency"], metrics["reported_latency"]) > max_latency:
        raise SmokeVerificationError("council latency exceeded ceiling")
    if metrics["token_count"] is not None and metrics["token_count"] > max_tokens:
        raise SmokeVerificationError("council token count exceeded ceiling")
    if metrics["conservative_cost_usd"] is not None and metrics["conservative_cost_usd"] > max_cost:
        raise SmokeVerificationError("council estimated cost exceeded ceiling")
    if metrics["factual_error"] or not metrics["objective_correct"] or not metrics["evaluator_format_success"]:
        raise SmokeVerificationError("council objective/factual/evaluator quality ceiling failed")
    return proof


def _aggregate(
    provenance: dict[str, Any], samples: list[dict[str, float | None]]
) -> dict[str, Any]:
    count = len(samples)

    def mean(key: str) -> float | None:
        values = [item[key] for item in samples if item[key] is not None]
        return sum(values) / len(values) if values else None

    def percentile(key: str) -> float | None:
        values = [item[key] for item in samples if item[key] is not None]
        return _percentile(values, 0.95) if values else None

    def total(key: str) -> float | None:
        values = [item[key] for item in samples if item[key] is not None]
        return sum(values) if values else None
    return {
        "schema_version": 2,
        "sample_count": count,
        "provenance": provenance,
        "metrics": {
            "quality_score": mean("quality_score"),
            "objective_correct_rate": mean("objective_correct"),
            "factual_error_rate": mean("factual_error"),
            "evaluator_format_success_rate": mean("evaluator_format_success"),
            "route_success_rate": mean("route_success"),
            "error_rate": mean("error_rate"),
            "p95_elapsed_latency_seconds": percentile("elapsed_latency"),
            "p95_reported_latency_seconds": percentile("reported_latency"),
            "mean_token_count": mean("token_count"),
            "total_token_count": total("token_count"),
            "mean_conservative_cost_usd": mean("conservative_cost_usd"),
            "total_conservative_cost_usd": total("conservative_cost_usd"),
            "mean_list_cost_usd": mean("list_cost_usd"),
            "total_list_cost_usd": total("list_cost_usd"),
        },
    }


def _metrics_aggregate(samples: list[dict[str, float | None]]) -> dict[str, Any]:
    return _aggregate({}, samples)["metrics"]


def compare_evidence(
    candidate: dict[str, Any],
    baseline: dict[str, Any],
    *,
    max_quality_drop: float = 3.0,
    max_latency_ratio: float = 1.20,
    max_cost_ratio: float = 1.25,
    min_route_success: float = 0.99,
) -> None:
    snapshot_keys = set(PRICING_SNAPSHOT_METADATA)
    candidate_snapshot = {key: candidate.get(key) for key in snapshot_keys}
    baseline_snapshot = {key: baseline.get(key) for key in snapshot_keys}
    expected_snapshot = dict(PRICING_SNAPSHOT_METADATA)
    if candidate_snapshot != baseline_snapshot or candidate_snapshot != expected_snapshot:
        raise SmokeVerificationError("deployment evidence pricing snapshot does not match")
    if candidate.get("sample_count", 0) < MIN_SAMPLES or baseline.get("sample_count", 0) < MIN_SAMPLES:
        raise SmokeVerificationError("insufficient samples in deployment evidence")
    if candidate.get("stream_sample_count", 0) < MIN_STREAM_SAMPLES or baseline.get("stream_sample_count", 0) < MIN_STREAM_SAMPLES:
        raise SmokeVerificationError("insufficient stream samples in deployment evidence")
    if candidate.get("provenance") != candidate.get("stream_provenance"):
        raise SmokeVerificationError("candidate sync/stream provenance mismatch")
    if baseline.get("provenance") != baseline.get("stream_provenance"):
        raise SmokeVerificationError("baseline sync/stream provenance mismatch")
    current, prior = candidate.get("metrics", {}), baseline.get("metrics", {})
    required = {
        "quality_score", "factual_error_rate", "evaluator_format_success_rate", "route_success_rate",
        "error_rate", "p95_elapsed_latency_seconds", "p95_reported_latency_seconds",
        "mean_token_count", "mean_conservative_cost_usd", "mean_list_cost_usd",
        "objective_correct_rate",
    }
    stream_current, stream_prior = candidate.get("stream_metrics", {}), baseline.get("stream_metrics", {})
    if not required <= current.keys() or not required <= prior.keys() or not required <= stream_current.keys() or not required <= stream_prior.keys():
        raise SmokeVerificationError("deployment evidence is missing required metrics")
    for mode_current, mode_prior in ((current, prior), (stream_current, stream_prior)):
        if mode_prior["quality_score"] is not None and mode_current["quality_score"] < mode_prior["quality_score"] - max_quality_drop:
            raise SmokeVerificationError("candidate quality regressed by more than 3 points")
        if mode_prior["factual_error_rate"] is not None and mode_current["factual_error_rate"] > mode_prior["factual_error_rate"]:
            raise SmokeVerificationError("candidate factual error rate regressed")
        if mode_prior["evaluator_format_success_rate"] is not None and mode_current["evaluator_format_success_rate"] < mode_prior["evaluator_format_success_rate"]:
            raise SmokeVerificationError("candidate evaluator format regressed")
        if mode_current["route_success_rate"] < min_route_success:
            raise SmokeVerificationError("candidate route success is below 99%")
        for key in ("p95_elapsed_latency_seconds", "p95_reported_latency_seconds"):
            if mode_prior[key] is not None and mode_current[key] > mode_prior[key] * max_latency_ratio:
                raise SmokeVerificationError("candidate p95 latency exceeds baseline by more than 20%")
        if mode_prior["mean_list_cost_usd"] is not None and mode_current["mean_list_cost_usd"] > mode_prior["mean_list_cost_usd"] * max_cost_ratio:
            raise SmokeVerificationError("candidate cost exceeds baseline by more than 25%")


def run_smoke(
    url: str,
    project: str,
    secret: str,
    *,
    samples: int = MIN_SAMPLES,
    stream_samples: int = MIN_STREAM_SAMPLES,
    timeout: float,
    max_latency: float,
    max_tokens: int,
    max_cost: float,
    max_error_rate: float = 0.0,
    expected_proof: dict[str, Any] | None = None,
    baseline_evidence: dict[str, Any] | None = None,
    max_quality_drop: float = 3.0,
    max_latency_ratio: float = 1.20,
    max_cost_ratio: float = 1.25,
    min_route_success: float = 0.99,
    strict_candidate: bool = True,
    legacy_baseline: bool = False,
    secret_loader: Callable[[str, str], str] = load_secret,
    poster: Callable[[str, str, float], tuple[dict[str, Any], float]] = post_council,
    stream_poster: Callable[[str, str, float], tuple[dict[str, Any], float]] | None = None,
) -> dict[str, Any]:
    if not MIN_SAMPLES <= samples <= 20:
        raise SmokeVerificationError("smoke samples must be between 5 and 20")
    if not MIN_STREAM_SAMPLES <= stream_samples <= 5:
        raise SmokeVerificationError("stream smoke samples must be between 1 and 5")
    if stream_poster is None:
        stream_poster = post_council_stream if poster is post_council else poster
    key = secret_loader(project, secret)
    provenance: dict[str, Any] | None = None
    metric_samples = []
    for _ in range(samples):
        payload, elapsed = poster(url, key, timeout)
        sample_proof = verify_payload(
            payload, elapsed, max_latency=max_latency, max_tokens=max_tokens, max_cost=max_cost,
            max_error_rate=max_error_rate, expected_proof=expected_proof, strict_candidate=strict_candidate,
            legacy_baseline=legacy_baseline,
        )
        if provenance is not None and sample_proof != provenance:
            raise SmokeVerificationError("sample provenance is inconsistent")
        provenance = sample_proof
        metric_samples.append(
            _sample_metrics(
                payload, elapsed, legacy_baseline=legacy_baseline, max_tokens=max_tokens
            )
        )
    stream_provenance: dict[str, Any] | None = None
    stream_metric_samples = []
    for _ in range(stream_samples):
        payload, elapsed = stream_poster(url, key, timeout)
        sample_proof = verify_payload(
            payload, elapsed, max_latency=max_latency, max_tokens=max_tokens, max_cost=max_cost,
            max_error_rate=max_error_rate, expected_proof=expected_proof, strict_candidate=strict_candidate,
            legacy_baseline=legacy_baseline,
        )
        if sample_proof != provenance:
            raise SmokeVerificationError("sync/stream provenance or policy mismatch")
        if stream_provenance is not None and sample_proof != stream_provenance:
            raise SmokeVerificationError("stream sample provenance is inconsistent")
        stream_provenance = sample_proof
        stream_metric_samples.append(
            _sample_metrics(
                payload, elapsed, legacy_baseline=legacy_baseline, max_tokens=max_tokens
            )
        )
    evidence = _aggregate(provenance or {}, metric_samples)
    evidence.update({
        "schema_version": 3,
        **PRICING_SNAPSHOT_METADATA,
        "stream_sample_count": len(stream_metric_samples),
        "stream_provenance": stream_provenance or {},
        "stream_metrics": _metrics_aggregate(stream_metric_samples),
    })
    if baseline_evidence is not None:
        compare_evidence(
            evidence, baseline_evidence, max_quality_drop=max_quality_drop,
            max_latency_ratio=max_latency_ratio, max_cost_ratio=max_cost_ratio,
            min_route_success=min_route_success,
        )
    return evidence


def _paired_ratio(candidate: float | None, baseline: float | None) -> float:
    if candidate is None or baseline is None or baseline <= 0:
        raise SmokeVerificationError("paired diagnostic denominator is unavailable")
    return candidate / baseline


def run_paired_canary(
    legacy_baseline_url: str,
    candidate_url: str,
    project: str,
    secret: str,
    *,
    timeout: float,
    max_latency: float = 480,
    max_tokens: int = 60_000,
    max_cost: float = 1.50,
    max_error_rate: float = 0.0,
    max_latency_ratio: float = 1.20,
    max_cost_ratio: float = 1.25,
    legacy_baseline: bool = False,
    secret_loader: Callable[[str, str], str] = load_secret,
    poster: Callable[[str, str, float], tuple[dict[str, Any], float]] = post_council,
    stream_poster: Callable[[str, str, float], tuple[dict[str, Any], float]] = post_council_stream,
    promotion_verifier: Callable[[], None] = verify_promotion_benchmark,
) -> dict[str, Any]:
    """Run one verified cold call then five deterministic measured pairs per surface."""
    if not legacy_baseline_url or not candidate_url or legacy_baseline_url == candidate_url:
        raise SmokeVerificationError("paired canary requires distinct exact URLs")
    if (
        not 0 < max_latency <= 480
        or not 0 < max_tokens <= 60_000
        or not 0 < max_cost <= 1.50
        or max_error_rate != 0.0
        or max_latency_ratio != 1.20
        or max_cost_ratio != 1.25
    ):
        raise SmokeVerificationError("paired canary gates cannot be weakened or redefined")
    promotion_verifier()
    key = secret_loader(project, secret)
    surfaces = {"sync": poster, "stream": stream_poster}
    cold: dict[str, Any] = {}
    steady: dict[str, Any] = {}
    candidate_provenance: dict[str, Any] | None = None
    baseline_provenance: dict[str, Any] | None = None

    def checked_call(
        call: Callable[[str, str, float], tuple[dict[str, Any], float]],
        url: str,
        *,
        baseline_side: bool,
    ) -> tuple[dict[str, Any], dict[str, float | None]]:
        payload, elapsed = call(url, key, timeout)
        proof = verify_payload(
            payload,
            elapsed,
            max_latency=math.inf if baseline_side else max_latency,
            max_tokens=sys.maxsize if baseline_side else max_tokens,
            max_cost=math.inf if baseline_side else max_cost,
            max_error_rate=max_error_rate,
            strict_candidate=not baseline_side,
            legacy_baseline=baseline_side and legacy_baseline,
        )
        return proof, _sample_metrics(
            payload,
            elapsed,
            legacy_baseline=baseline_side and legacy_baseline,
            max_tokens=max_tokens,
        )

    for surface, call in surfaces.items():
        surface_cold: dict[str, Any] = {}
        for side, url, baseline_side in (
            ("baseline", legacy_baseline_url, True),
            ("candidate", candidate_url, False),
        ):
            proof, metrics = checked_call(call, url, baseline_side=baseline_side)
            if baseline_side:
                if baseline_provenance is not None and proof != baseline_provenance:
                    raise SmokeVerificationError("baseline provenance is inconsistent")
                baseline_provenance = proof
            else:
                if candidate_provenance is not None and proof != candidate_provenance:
                    raise SmokeVerificationError("candidate provenance is inconsistent")
                candidate_provenance = proof
            surface_cold[side] = {
                "elapsed_latency_seconds": metrics["elapsed_latency"],
                "reported_latency_seconds": metrics["reported_latency"],
                "conservative_cost_usd": metrics["conservative_cost_usd"],
                "list_cost_usd": metrics["list_cost_usd"],
            }
        cold[surface] = surface_cold

        baseline_samples: list[dict[str, float | None]] = []
        candidate_samples: list[dict[str, float | None]] = []
        paired_ratios = {"elapsed": [], "reported": [], "list_cost": []}
        for order in PAIRED_TRIAL_ORDER:
            pair: dict[str, dict[str, float | None]] = {}
            for side in order:
                baseline_side = side == "A"
                proof, metrics = checked_call(
                    call,
                    legacy_baseline_url if baseline_side else candidate_url,
                    baseline_side=baseline_side,
                )
                expected = baseline_provenance if baseline_side else candidate_provenance
                if proof != expected:
                    raise SmokeVerificationError("paired sample provenance is inconsistent")
                pair[side] = metrics
                (baseline_samples if baseline_side else candidate_samples).append(metrics)
            paired_ratios["elapsed"].append(
                _paired_ratio(pair["B"]["elapsed_latency"], pair["A"]["elapsed_latency"])
            )
            paired_ratios["reported"].append(
                _paired_ratio(pair["B"]["reported_latency"], pair["A"]["reported_latency"])
            )
            paired_ratios["list_cost"].append(
                _paired_ratio(pair["B"]["list_cost_usd"], pair["A"]["list_cost_usd"])
            )

        candidate_metrics = _metrics_aggregate(candidate_samples)
        if candidate_metrics["route_success_rate"] is None or candidate_metrics["route_success_rate"] < 0.99:
            raise SmokeVerificationError("candidate route success is below 99%")
        elapsed_ratio = statistics.median(paired_ratios["elapsed"])
        reported_ratio = statistics.median(paired_ratios["reported"])
        cost_ratio = statistics.median(paired_ratios["list_cost"])
        steady[surface] = {
            "trial_count": len(PAIRED_TRIAL_ORDER),
            "trial_order": list(PAIRED_TRIAL_ORDER),
            "candidate_metrics": candidate_metrics,
            "diagnostics": {
                "paired_median_elapsed_latency_ratio": elapsed_ratio,
                "paired_median_reported_latency_ratio": reported_ratio,
                "paired_median_list_cost_ratio": cost_ratio,
                "elapsed_latency_status": "warning" if elapsed_ratio > max_latency_ratio else "within_limit",
                "reported_latency_status": "warning" if reported_ratio > max_latency_ratio else "within_limit",
                "list_cost_status": "warning" if cost_ratio > max_cost_ratio else "within_limit",
            },
        }

    return {
        "schema_version": 1,
        **PRICING_SNAPSHOT_METADATA,
        "promotion_gate": {"status": "passed"},
        "cold_gate": {"status": "passed", "measurements": cold},
        "hard_canary_gate": {"status": "passed"},
        "steady_canary": steady,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run secret-safe fixed synthetic council evidence set")
    parser.add_argument("url")
    parser.add_argument("--project", required=True)
    parser.add_argument("--secret", default="llm-council-api-key")
    parser.add_argument("--samples", type=int, default=MIN_SAMPLES)
    parser.add_argument("--stream-samples", type=int, default=MIN_STREAM_SAMPLES)
    parser.add_argument("--timeout", type=float, default=600)
    parser.add_argument("--max-latency-seconds", type=float, default=480)
    parser.add_argument("--max-tokens", type=int, default=60000)
    parser.add_argument("--max-cost-usd", type=float, default=1.50)
    parser.add_argument("--max-error-rate", type=float, default=0.0)
    parser.add_argument("--max-quality-drop", type=float, default=3.0)
    parser.add_argument("--max-latency-ratio", type=float, default=1.20)
    parser.add_argument("--max-cost-ratio", type=float, default=1.25)
    parser.add_argument("--min-route-success", type=float, default=0.99)
    parser.add_argument("--proof-out")
    parser.add_argument("--expected-proof")
    parser.add_argument("--baseline-proof")
    parser.add_argument("--baseline", action="store_true")
    parser.add_argument("--legacy-baseline", action="store_true")
    parser.add_argument("--paired", action="store_true")
    parser.add_argument("--baseline-url")
    parser.add_argument("--paired-legacy-baseline", action="store_true")
    parser.add_argument("--evidence-out")
    args = parser.parse_args(argv)
    try:
        proof_actions = bool(args.proof_out) + bool(args.expected_proof)
        if args.paired:
            if (
                not args.baseline_url
                or args.baseline
                or args.legacy_baseline
                or args.proof_out
                or args.expected_proof
                or args.baseline_proof
                or args.samples != MIN_SAMPLES
                or args.stream_samples != MIN_STREAM_SAMPLES
                or args.max_quality_drop != 3.0
                or args.min_route_success != 0.99
            ):
                raise SmokeVerificationError("paired mode flags conflict")
            evidence = run_paired_canary(
                args.baseline_url,
                args.url,
                args.project,
                args.secret,
                timeout=args.timeout,
                max_latency=args.max_latency_seconds,
                max_tokens=args.max_tokens,
                max_cost=args.max_cost_usd,
                max_error_rate=args.max_error_rate,
                max_latency_ratio=args.max_latency_ratio,
                max_cost_ratio=args.max_cost_ratio,
                legacy_baseline=args.paired_legacy_baseline,
            )
            if args.evidence_out:
                Path(args.evidence_out).write_text(
                    json.dumps(evidence, sort_keys=True, separators=(",", ":")), encoding="utf-8"
                )
            print("SUCCESS: paired council smoke verification passed")
            return 0
        if args.baseline_url or args.paired_legacy_baseline or args.evidence_out:
            raise SmokeVerificationError("paired-only flags require --paired")
        if (args.baseline or args.legacy_baseline) and proof_actions != 1:
            raise SmokeVerificationError(
                "baseline mode requires exactly one of --proof-out or --expected-proof"
            )
        if proof_actions > 1:
            raise SmokeVerificationError(
                "--proof-out and --expected-proof cannot be used together"
            )
        if args.legacy_baseline and not args.baseline:
            raise SmokeVerificationError("--legacy-baseline is valid only with --baseline")
        expected_evidence = json.loads(Path(args.expected_proof).read_text()) if args.expected_proof else None
        expected_provenance = expected_evidence.get("provenance") if expected_evidence else None
        baseline = json.loads(Path(args.baseline_proof).read_text()) if args.baseline_proof else None
        if not 0 <= args.max_error_rate <= 1:
            raise SmokeVerificationError("invalid error-rate ceiling")
        evidence = run_smoke(
            args.url, args.project, args.secret, samples=args.samples, stream_samples=args.stream_samples, timeout=args.timeout,
            max_latency=args.max_latency_seconds, max_tokens=args.max_tokens, max_cost=args.max_cost_usd,
            max_error_rate=args.max_error_rate, expected_proof=expected_provenance,
            baseline_evidence=baseline, strict_candidate=not args.baseline,
            legacy_baseline=args.legacy_baseline,
            max_quality_drop=args.max_quality_drop, max_latency_ratio=args.max_latency_ratio,
            max_cost_ratio=args.max_cost_ratio, min_route_success=args.min_route_success,
        )
        if args.proof_out:
            Path(args.proof_out).write_text(json.dumps(evidence, sort_keys=True, separators=(",", ":")), encoding="utf-8")
    except (SmokeVerificationError, PromotionBenchmarkError, subprocess.SubprocessError, OSError, json.JSONDecodeError, TypeError, KeyError):
        print("FAIL: council smoke verification failed", file=sys.stderr)
        return 1
    print("SUCCESS: council smoke verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
