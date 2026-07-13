"""Benchmark runner plumbing for mock and live modes."""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import time
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal, Protocol

from .artifacts import write_artifacts, write_text_guarded
from .budget import BudgetGuard
from .costs import compute_cost, output_tokens_per_second, validate_usage
from .judge import generate_mock_judge_scores
from .models import (
    DEFAULT_VARIANT_SET,
    FLAGSHIP_PROMOTION_VARIANT_SET,
    FLAGSHIP_PROMPT_SET_VERSION,
    PROMOTION_COUNCIL_VARIANTS,
    VARIANT_SETS,
    BenchmarkVariant,
    promotion_thresholds_for_variant_set,
    resolve_benchmark_variants,
)
from .probes import (
    PROBE_PROJECTED_COST_USD,
    PROBE_TARGETS,
    configured_probe_results,
    probe_support_map,
    run_support_probes,
)
from .prompts import DEFAULT_PROMPT_SUITE_PATH, load_prompt_suite


@dataclass(frozen=True)
class CouncilPromotionRequest:
    """Exact, no-fallback contract for one promotion council execution."""

    case_id: str
    prompt_id: str
    prompt: str
    models: tuple[dict[str, object], ...]
    max_tokens: int = 2048
    temperature: float = 0.2
    role: str | None = None
    expected_output: str | None = None
    expected_labels: tuple[str, ...] = ()
    allow_declared_route_failover: bool = False
    allow_provider_substitution: bool = False


class PromotionExecutor(Protocol):
    async def __call__(self, request: CouncilPromotionRequest) -> Mapping[str, Any]: ...


@dataclass(frozen=True)
class CouncilPromotionExecutor:
    """Production executor for exact-route, content-free promotion councils."""

    async def __call__(self, request: CouncilPromotionRequest) -> Mapping[str, Any]:
        return await _execute_live_promotion_council(request)


@dataclass(frozen=True)
class BenchmarkRunConfig:
    """Configuration for one benchmark run."""

    mode: Literal["mock", "live"] = "mock"
    output_dir: Path = Path("benchmarks/runs")
    run_id: str = "local-run"
    clock_iso: str = "1970-01-01T00:00:00Z"
    seed: int = 0
    budget_usd: float | None = 25.0
    prompt_suite_path: Path = DEFAULT_PROMPT_SUITE_PATH
    trials: int = 1
    max_tokens: int = 2048
    temperature: float = 0.2
    fixed_latency_seconds: float = 0.5
    fixed_prompt_tokens: int = 128
    fixed_completion_tokens: int = 64
    probe_results: dict[str, bool] = field(default_factory=dict)
    probe_gated_variants: bool = False
    probe_timeout_seconds: float = 30.0
    council_projected_cost_usd: float | None = None
    mock_judging_enabled: bool = True
    variant_set: str = DEFAULT_VARIANT_SET
    council_executor: PromotionExecutor | Callable[
        [CouncilPromotionRequest], Awaitable[Mapping[str, Any]]
    ] | None = field(
        default=None, compare=False, repr=False
    )


@dataclass(frozen=True)
class BenchmarkRunSummary:
    """Summary returned by benchmark execution."""

    run_id: str
    run_dir: Path
    result_count: int
    budget_stopped: bool
    council_spend_usd: float = 0.0
    probe_spend_usd: float = 0.0


def run_benchmark(config: BenchmarkRunConfig) -> BenchmarkRunSummary:
    """Run the benchmark in mock mode or live mode and write artifacts."""
    if config.mode == "live":
        return asyncio.run(_run_benchmark_async(config))
    return _run_benchmark_sync(config)


def _run_benchmark_sync(config: BenchmarkRunConfig) -> BenchmarkRunSummary:
    return asyncio.run(_run_benchmark_async(config))


async def _run_benchmark_async(config: BenchmarkRunConfig) -> BenchmarkRunSummary:
    budget = BudgetGuard(config.budget_usd)
    is_promotion = config.variant_set == FLAGSHIP_PROMOTION_VARIANT_SET
    if is_promotion:
        from .promotion import promotion_prompt_suite

        suite = promotion_prompt_suite()
    else:
        suite = load_prompt_suite(config.prompt_suite_path)
    prompts = suite["prompts"]
    probe_details = configured_probe_results(config.probe_results)
    effective_probe_results = dict(config.probe_results)
    promotion_probe_keys = tuple(
        spec.probe_key for spec in VARIANT_SETS[FLAGSHIP_PROMOTION_VARIANT_SET] if spec.probe_key
    )
    if config.mode == "mock" and is_promotion:
        effective_probe_results.update(dict.fromkeys(promotion_probe_keys, True))
        probe_details = configured_probe_results(effective_probe_results)
    if config.mode == "live" and (config.probe_gated_variants or is_promotion):
        if is_promotion:
            probe_details = await _run_support_probes_budgeted(
                keys=list(promotion_probe_keys),
                timeout=config.probe_timeout_seconds,
                budget=budget,
            )
        else:
            probe_details = await _run_support_probes_budgeted(
                timeout=config.probe_timeout_seconds, budget=budget
            )
        effective_probe_results.update(probe_support_map(probe_details))
    resolution = resolve_benchmark_variants(config.variant_set, effective_probe_results)
    registry_digest = _registry_digest()
    prompt_set_version = FLAGSHIP_PROMPT_SET_VERSION if is_promotion else str(suite.get("version"))
    config_digest = _run_manifest_digest(
        config, suite, resolution.variants, registry_digest, probe_details
    )
    probe_spend_usd = sum(result.observed_cost_usd for result in probe_details)
    results: list[dict[str, Any]] = []

    for trial_index in range(config.trials):
        for prompt in prompts:
            for variant in resolution.variants:
                projected_cost = _project_cost(config, variant, prompt)
                if not budget.can_start(projected_cost):
                    break
                result = await _run_single(config, variant, prompt, trial_index)
                result.update({
                    "prompt_set_version": prompt_set_version,
                    "config_digest": config_digest,
                    "run_manifest_digest": config_digest,
                    "registry_digest": registry_digest,
                })
                results.append(result)
                budget.record_observed(
                    result.get("estimated_total_cost_usd"), reserved_cost_usd=projected_cost
                )
                if budget.stopped:
                    break
            if budget.stopped:
                break
        if budget.stopped:
            break

    council_aggregates: list[dict[str, Any]] = []
    council_spend_usd = 0.0
    if is_promotion and not budget.stopped:
        council_aggregates, council_spend_usd = await _run_promotion_councils(
            config, prompts, budget
        )

    run_dir = config.output_dir / config.run_id
    artifact_config = {
        "run_id": config.run_id,
        "mode": config.mode,
        "variant_set": config.variant_set,
        "created_at": config.clock_iso,
        "config_digest": config_digest,
        "run_manifest_digest": config_digest,
        "registry_digest": registry_digest,
        "prompt_set_version": prompt_set_version,
        "seed": config.seed,
        "prompt_suite": {
            "path": str(config.prompt_suite_path),
            "suite_id": suite.get("suite_id"),
            "version": suite.get("version"),
        },
        "variants": [variant.to_dict() for variant in resolution.variants],
        "blocked_variants": [variant.to_dict() for variant in resolution.blocked],
        "probe_gated_variants": config.probe_gated_variants,
        "probe_results": [result.to_dict() for result in probe_details],
        "probe_spend_usd": probe_spend_usd,
        "probe_projected_cost_usd": PROBE_PROJECTED_COST_USD,
        "probe_support": effective_probe_results,
        "promotion_thresholds": promotion_thresholds_for_variant_set(config.variant_set),
        "council_variants": (
            [asdict(variant) for variant in PROMOTION_COUNCIL_VARIANTS] if is_promotion else []
        ),
        "budget": budget.to_dict(),
        "council_spend_usd": council_spend_usd,
        "settings": {
            "trials": config.trials,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
        },
    }
    judge_scores = []
    if config.mock_judging_enabled:
        judge_scores = generate_mock_judge_scores(
            run_id=config.run_id,
            prompts=prompts,
            results=results,
            judge_variants=resolution.variants,
            seed=config.seed,
        )

    persisted_prompts = prompts
    persisted_results = results
    if is_promotion:
        persisted_prompts = [
            {key: prompt.get(key) for key in ("id", "kind", "stratum", "title", "checksum")}
            for prompt in prompts
        ]
        persisted_results = [
            {key: value for key, value in result.items() if key not in {"output", "reasoning"}}
            for result in results
        ]
    write_artifacts(
        run_dir=run_dir,
        config=artifact_config,
        prompts=persisted_prompts,
        results=persisted_results,
        judge_scores=judge_scores,
    )
    if is_promotion:
        content = "".join(
            json.dumps(row, sort_keys=True) + "\n" for row in council_aggregates
        )
        write_text_guarded(run_dir / "council-aggregates.jsonl", content)
        write_text_guarded(
            run_dir / "seat-ablation-report.json",
            json.dumps(
                _seat_ablation_report(
                    council_aggregates,
                    [str(prompt.get("id")) for prompt in prompts],
                    config.trials,
                    budget.stopped,
                    results,
                ),
                indent=2,
                sort_keys=True,
            ) + "\n",
        )
    return BenchmarkRunSummary(
        run_id=config.run_id,
        run_dir=run_dir,
        result_count=len(results),
        budget_stopped=budget.stopped,
        council_spend_usd=council_spend_usd,
        probe_spend_usd=probe_spend_usd,
    )


async def _run_support_probes_budgeted(
    *, timeout: float, budget: BudgetGuard, keys: list[str] | None = None
) -> list[Any]:
    """Run probes only through the budget-aware probe API."""
    if not budget.can_start(PROBE_PROJECTED_COST_USD):
        return []
    return await run_support_probes(keys=keys, timeout=timeout, budget=budget)


async def _run_promotion_councils(
    config: BenchmarkRunConfig,
    prompts: list[dict[str, Any]],
    budget: BudgetGuard,
) -> tuple[list[dict[str, Any]], float]:
    """Execute every pre-registered council case after individual model pairs."""
    executor = config.council_executor or (
        _mock_council_executor if config.mode == "mock" else CouncilPromotionExecutor()
    )
    aggregates: list[dict[str, Any]] = []
    council_spend = 0.0
    for trial_index in range(config.trials):
        for prompt in prompts:
            for case in PROMOTION_COUNCIL_VARIANTS:
                request = _council_promotion_request(case, prompt, config)
                _enforce_no_fallback_request(request)
                if not budget.can_start(_project_council_cost(config, request)):
                    return aggregates, council_spend
                response = await executor(request)
                aggregate = _validated_council_aggregate(
                    request, response, config, trial_index, case.configuration, case.ablated_seat
                )
                aggregates.append(aggregate)
                observed = aggregate.get("estimated_total_cost_usd")
                reservation = _project_council_cost(config, request)
                if observed is None and aggregate.get("usage_missing") is not True:
                    raise ValueError(
                        "council reservation fallback requires explicitly missing provider usage"
                    )
                charged = budget.record_observed(observed, reserved_cost_usd=reservation)
                aggregate["accounted_cost_usd"] = charged
                council_spend += charged
                if budget.stopped:
                    return aggregates, council_spend
    return aggregates, council_spend


def _council_promotion_request(
    case, prompt: dict[str, Any], config: BenchmarkRunConfig
) -> CouncilPromotionRequest:
    from backend.model_registry import load_registry

    registry = load_registry()
    models = tuple(
        {
            "model_id": model_id,
            "route_id": registry.model(model_id).preferred_route.route_id,
            "roles": list(registry.model(model_id).roles),
        }
        for model_id in case.roster
    )
    return CouncilPromotionRequest(
        case_id=case.variant_id,
        prompt_id=str(prompt.get("id")),
        prompt=str(prompt.get("prompt", "")),
        models=models,
        max_tokens=config.max_tokens,
        temperature=config.temperature,
        role=str(prompt.get("role")) if prompt.get("role") is not None else None,
        expected_output=(
            str(prompt["expected_output"]) if prompt.get("expected_output") is not None else None
        ),
        expected_labels=tuple(str(label) for label in prompt.get("expected_labels", ())),
    )


def _enforce_no_fallback_request(request: CouncilPromotionRequest) -> None:
    if (
        request.allow_declared_route_failover is not False
        or request.allow_provider_substitution is not False
    ):
        raise ValueError("promotion council requires both fallback policies to be false")


def _validated_council_aggregate(
    request: CouncilPromotionRequest,
    response: Mapping[str, Any],
    config: BenchmarkRunConfig,
    trial_index: int,
    configuration: str = "full",
    ablated_seat: str | None = None,
) -> dict[str, Any]:
    """Validate execution proof and retain aggregate metrics, never model content."""
    if (
        response.get("allow_declared_route_failover") is not False
        or response.get("allow_provider_substitution") is not False
        or response.get("fallback_used") is not False
    ):
        raise ValueError("promotion council response used or enabled fallback")
    observed_models = response.get("models")
    expected_models = [dict(model) for model in request.models]
    if observed_models != expected_models:
        raise ValueError("promotion council route/model/role proof mismatch")

    metrics = _response_quality_metrics(request, response)
    return {
        "run_id": config.run_id,
        "created_at": config.clock_iso,
        "case_id": request.case_id,
        "prompt_id": request.prompt_id,
        "trial_index": trial_index,
        "trial_id": f"{request.prompt_id}:{trial_index}",
        "configuration": configuration,
        "seat": ablated_seat,
        "stratum": response.get("stratum", request.prompt_id),
        "models": expected_models,
        "allow_declared_route_failover": False,
        "allow_provider_substitution": False,
        "fallback_used": False,
        "latency_seconds": response.get("latency_seconds"),
        "estimated_total_cost_usd": response.get("estimated_total_cost_usd"),
        "usage_missing": response.get("usage_missing", False),
        "quality_status": metrics["quality_status"],
        "quality": metrics["quality"],
        "objective_exact_accuracy": metrics["objective_exact_accuracy"],
        "objective_accuracy": metrics["objective_normalized_accuracy"],
        "evaluator_format_rate": metrics["evaluator_format_rate"],
        "factual_error_rate": metrics["factual_error_rate"],
        "diversity": response.get("diversity"),
        "latency": response.get("latency_seconds"),
        "cost": response.get("estimated_total_cost_usd"),
        "failure_rate": response.get("failure_rate"),
        "judge_agreement": response.get("judge_agreement"),
        "error_status": response.get("error_status"),
    }


def _response_quality_metrics(
    request: CouncilPromotionRequest, response: Mapping[str, Any]
) -> dict[str, Any]:
    supplied = {
        key: response.get(key)
        for key in (
            "quality_status", "quality", "objective_exact_accuracy",
            "objective_normalized_accuracy", "evaluator_format_rate", "factual_error_rate",
        )
    }
    output = response.get("output")
    if isinstance(output, str):
        return deterministic_quality_metrics(
            request.role, request.expected_output, request.expected_labels, output
        )
    status = supplied["quality_status"] or "not_evaluated"
    quality = supplied["quality"]
    return {
        "quality_status": status,
        "quality": quality,
        "objective_exact_accuracy": supplied["objective_exact_accuracy"],
        "objective_normalized_accuracy": supplied["objective_normalized_accuracy"],
        "evaluator_format_rate": supplied["evaluator_format_rate"],
        "factual_error_rate": supplied["factual_error_rate"],
    }


def _normalize_objective(value: str) -> str:
    """Normalize deterministic objective answers without semantic guessing."""
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return " ".join(value.strip().casefold().split())
    return json.dumps(parsed, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def deterministic_quality_metrics(
    role: str | None,
    expected_output: str | None,
    expected_labels: tuple[str, ...],
    output: str,
) -> dict[str, Any]:
    """Compute content-free deterministic promotion quality metrics."""
    if role == "quality" and expected_output is not None:
        exact = float(output == expected_output)
        normalized = float(_normalize_objective(output) == _normalize_objective(expected_output))
        return {
            "quality_status": "pass" if normalized else "fail",
            "quality": normalized,
            "objective_exact_accuracy": exact,
            "objective_normalized_accuracy": normalized,
            "evaluator_format_rate": None,
            "factual_error_rate": 1.0 - normalized,
        }
    if role == "evaluator_format":
        from .promotion import evaluator_format_status

        passed = float(evaluator_format_status(output, expected_labels) == "pass")
        return {
            "quality_status": "pass" if passed else "fail",
            "quality": passed,
            "objective_exact_accuracy": None,
            "objective_normalized_accuracy": None,
            "evaluator_format_rate": passed,
            "factual_error_rate": 0.0 if passed else 1.0,
        }
    return {
        "quality_status": "not_evaluated", "quality": None,
        "objective_exact_accuracy": None, "objective_normalized_accuracy": None,
        "evaluator_format_rate": None, "factual_error_rate": None,
    }


async def _mock_council_executor(
    request: CouncilPromotionRequest,
) -> Mapping[str, Any]:
    return {
        "models": [dict(model) for model in request.models],
        "allow_declared_route_failover": False,
        "allow_provider_substitution": False,
        "fallback_used": False,
        "latency_seconds": 0.0,
        "estimated_total_cost_usd": 0.0,
        "quality_status": "pass",
        "output": (
            request.expected_output
            if request.role == "quality"
            else "\n".join(
                f"{index}. Candidate {label}"
                for index, label in enumerate(request.expected_labels, 1)
            )
        ),
        "error_status": None,
    }


async def _execute_live_promotion_council(
    request: CouncilPromotionRequest,
) -> Mapping[str, Any]:
    """Execute a real council from a strict captured plan and return proof only."""
    import backend.council as council_runtime
    from backend.execution_planning import build_execution_plan
    from backend.model_registry import load_registry

    registry = load_registry()
    plan = build_execution_plan(
        registry,
        {
            "query": request.prompt,
            "models": [str(model["model_id"]) for model in request.models],
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
        },
    )
    if plan.registry_digest != registry.digest:
        raise ValueError("promotion council plan registry digest mismatch")
    expected = [
        *(('stage1', operation) for operation in plan.stage1),
        *(('stage2', operation) for operation in plan.evaluators),
        ('stage3', plan.chairman),
    ]
    expected_by_key = {
        (stage, operation.logical_id, operation.route.route_id): operation
        for stage, operation in expected
    }
    observations_by_key: dict[tuple[str, str, str], dict[str, Any]] = {}
    private_dispatcher = council_runtime._dispatcher()

    class RecordingExecutor:
        async def __call__(self, stage, operation):
            key = (stage, operation.logical_id, operation.route.route_id)
            expected_operation = expected_by_key.get(key)
            if (
                expected_operation is None
                or operation.settings.allow_declared_route_failover is not False
                or operation.settings.allow_provider_substitution is not False
            ):
                raise ValueError(f"promotion council {stage} operation/model/route mismatch")
            if key in observations_by_key:
                raise ValueError(f"promotion council {stage} operation executed more than once")
            observations_by_key[key] = {"pending": True}
            result = await private_dispatcher.execute(operation)
            result = result or {}
            observations_by_key[key] = {
                "stage": stage,
                "model_id": operation.logical_id,
                "planned_route_id": expected_operation.route.route_id,
                "observed_route_id": result.get("selected_route_id") or result.get("route_id"),
                "planned_provider": expected_operation.route.provider,
                "observed_provider": result.get("provider"),
                "fallback_used": bool(result.get("fallback_used")),
                "usage": result.get("usage"),
                "error": bool(result.get("error")),
            }
            return result

    started = time.perf_counter()
    stage1, stage2, stage3, metadata = await council_runtime.run_full_council(
        request.prompt,
        council_models=[str(model["model_id"]) for model in request.models],
        execution_plan=plan,
        operation_executor=RecordingExecutor(),
    )
    latency = time.perf_counter() - started
    if set(observations_by_key) != set(expected_by_key):
        raise ValueError("promotion council did not execute every Stage 1/2/3 operation")
    observations = list(observations_by_key.values())
    for item in observations:
        if (
            item["observed_route_id"] != item["planned_route_id"]
            or item["observed_provider"] != item["planned_provider"]
            or item["fallback_used"]
        ):
            raise ValueError("promotion council operation route mismatch or fallback/substitution")
    proof = metadata["execution_plan"]
    requested_ids = {seat["model_id"] for seat in request.models}
    final_output = ""
    if isinstance(stage3, Mapping):
        final_output = str(stage3.get("response") or stage3.get("content") or "")
    metrics = deterministic_quality_metrics(
        request.role, request.expected_output, request.expected_labels, final_output
    )
    return {
        "models": [
            {
                "model_id": model["model"],
                "route_id": model["route_id"],
                "roles": model["roles"],
            }
            for model in proof["models"]
            if model["model"] in requested_ids
        ],
        "allow_declared_route_failover": plan.settings.allow_declared_route_failover,
        "allow_provider_substitution": plan.settings.allow_provider_substitution,
        "fallback_used": any(item["fallback_used"] for item in observations),
        "latency_seconds": latency,
        "estimated_total_cost_usd": _observed_council_cost(observations),
        "usage_missing": any(item["usage"] is None or item["usage"] == {} for item in observations),
        **metrics,
        "diversity": len({item["observed_provider"] for item in observations}) / max(1, len(request.models)),
        "failure_rate": sum(item["error"] for item in observations) / max(1, len(observations)),
        "judge_agreement": _judge_agreement(metadata),
        "error_status": "council_error" if any(item.get("error") for item in [*stage1, *stage2, stage3]) else None,
    }


# Backward-compatible private hook used by older tests.
_live_council_executor = _execute_live_promotion_council


def _project_council_cost(config: BenchmarkRunConfig, request: CouncilPromotionRequest) -> float:
    """Conservative pre-call bound using high list-price rates and all three stages."""
    if config.mode == "mock":
        return config.council_projected_cost_usd or 0.0
    member_count = len(request.models)
    evaluator_count = min(3, member_count)
    prompt_tokens = max(1, math.ceil(len(request.prompt.split()) * 2.0))
    input_tokens = (
        member_count * prompt_tokens
        + evaluator_count * (prompt_tokens + max(0, member_count - 1) * request.max_tokens)
        + prompt_tokens
        + min(5, member_count) * request.max_tokens
        + evaluator_count * request.max_tokens
    )
    output_tokens = (member_count + evaluator_count + 1) * request.max_tokens
    calculated = input_tokens * 50.0 / 1_000_000 + output_tokens * 100.0 / 1_000_000
    if config.council_projected_cost_usd is None:
        return calculated
    return max(calculated, config.council_projected_cost_usd)


def _observed_council_cost(observations: list[dict[str, Any]]) -> float | None:
    """Record spend conservatively when provider-specific billing is unavailable."""
    total = 0.0
    for item in observations:
        usage = validate_usage(item["usage"], allow_missing=True)
        if usage is None:
            return None
        total += usage["prompt_tokens"] * 50.0 / 1_000_000
        total += usage["completion_tokens"] * 100.0 / 1_000_000
    return total


def _judge_agreement(metadata: Mapping[str, Any]) -> float | None:
    rankings = metadata.get("aggregate_rankings")
    if not isinstance(rankings, list) or not rankings:
        return None
    ranks = [float(row["average_rank"]) for row in rankings if row.get("average_rank") is not None]
    if len(ranks) < 2:
        return None
    spread = max(ranks) - min(ranks)
    return max(0.0, 1.0 - spread / max(1.0, float(len(ranks) - 1)))


def _seat_ablation_report(
    aggregates: list[dict[str, Any]],
    prompt_ids: list[str] | None = None,
    trials: int = 1,
    budget_truncated: bool = False,
    individual_results: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    from .modernization import analyze_seat_ablation

    seats = [case.ablated_seat for case in PROMOTION_COUNCIL_VARIANTS if case.configuration == "removed"]
    full_rows = [dict(row) for row in aggregates if row.get("case_id") == "full-council-new"]
    for row in full_rows:
        row["configuration"] = "full"
    rows = full_rows + [
        row for row in aggregates if row.get("configuration") in {"removed", "replacement"}
    ]
    report = asdict(analyze_seat_ablation(rows, [seat for seat in seats if seat]))
    expected = [
        {"case_id": case.variant_id, "prompt_id": prompt_id, "trial_index": trial}
        for trial in range(trials)
        for prompt_id in (prompt_ids or sorted({str(row.get("prompt_id")) for row in aggregates}))
        for case in PROMOTION_COUNCIL_VARIANTS
    ]
    completed = [
        {"case_id": row.get("case_id"), "prompt_id": row.get("prompt_id"),
         "trial_index": row.get("trial_index")}
        for row in aggregates
    ]
    from .modernization import report_incomplete_cells

    completeness = report_incomplete_cells(expected, completed)
    outcomes = evaluate_promotion_thresholds(aggregates, individual_results or [])
    quality_available = all(
        row.get("quality") is not None for row in aggregates if row.get("case_id") in {
            "full-council-old", "full-council-new"
        }
    ) and bool(aggregates)
    report.update({
        "complete": completeness.complete,
        "expected_count": completeness.expected_count,
        "completed_count": completeness.completed_count,
        "missing_cells": completeness.missing_cells,
        "threshold_outcomes": outcomes,
        "quality_available": quality_available,
        "promotion_eligible": bool(
            not budget_truncated and completeness.complete and quality_available and outcomes
            and all(item["passed"] for item in outcomes.values())
        ),
        "promotion_evidence": bool(
            not budget_truncated and completeness.complete and quality_available
        ),
        "budget_truncated": budget_truncated,
    })
    return report


def _metric_mean(rows: list[dict[str, Any]], key: str) -> float | None:
    values = [float(row[key]) for row in rows if isinstance(row.get(key), (int, float))]
    return sum(values) / len(values) if values else None


def _p95(rows: list[dict[str, Any]], key: str) -> float | None:
    values = sorted(float(row[key]) for row in rows if isinstance(row.get(key), (int, float)))
    if not values:
        return None
    return values[max(0, math.ceil(0.95 * len(values)) - 1)]


def evaluate_promotion_thresholds(
    rows: list[dict[str, Any]],
    individual_rows: list[dict[str, Any]] | None = None,
    *,
    cost_exception_accepted: bool = False,
) -> dict[str, dict[str, Any]]:
    """Evaluate registered flagship gates; unavailable evidence fails closed."""
    old = [row for row in rows if row.get("case_id") == "full-council-old"]
    new = [row for row in rows if row.get("case_id") == "full-council-new"]

    def delta_gate(name: str, metric: str, minimum: float) -> dict[str, Any]:
        baseline, candidate = _metric_mean(old, metric), _metric_mean(new, metric)
        value = None if baseline is None or candidate is None else (candidate - baseline) * 100
        return {"passed": value is not None and value >= minimum, "value": value, "threshold": minimum}

    outcomes = {
        "quality_overall": delta_gate("quality_overall", "quality", -3.0),
        "objective_accuracy": delta_gate("objective_accuracy", "objective_accuracy", -2.0),
        "evaluator_format_rate": delta_gate("evaluator_format_rate", "evaluator_format_rate", 0.0),
    }
    factual = delta_gate("factual_error_rate", "factual_error_rate", float("-inf"))
    factual["passed"] = factual["value"] is not None and factual["value"] <= 0.0
    factual["threshold"] = 0.0
    outcomes["factual_error_rate"] = factual

    strata = sorted({str(row.get("stratum")) for row in old + new})
    stratum_deltas: dict[str, float | None] = {}
    for stratum in strata:
        baseline = _metric_mean([row for row in old if str(row.get("stratum")) == stratum], "quality")
        candidate = _metric_mean([row for row in new if str(row.get("stratum")) == stratum], "quality")
        stratum_deltas[stratum] = (
            None if baseline is None or candidate is None else (candidate - baseline) * 100
        )
    outcomes["quality_by_stratum"] = {
        "passed": bool(stratum_deltas) and all(
            value is not None and value >= -5.0 for value in stratum_deltas.values()
        ),
        "value": stratum_deltas,
        "threshold": -5.0,
    }
    individual_rows = individual_rows or []
    route_values = [
        float(not row.get("error_status") and not row.get("fallback_used"))
        for row in individual_rows
    ] + [
        1.0 - float(row["failure_rate"])
        for row in new if isinstance(row.get("failure_rate"), (int, float))
    ]
    route_success = sum(route_values) / len(route_values) if route_values else None
    outcomes["route_success_rate"] = {
        "passed": route_success is not None and route_success >= 0.99,
        "value": route_success, "threshold": 0.99,
    }
    grok_rows = [
        row for row in individual_rows if row.get("variant_id") == "xai-grok-4.5"
    ]
    grok_failover = _metric_mean(grok_rows, "fallback_used")
    outcomes["grok_direct_failover_rate"] = {
        "passed": grok_failover is not None and grok_failover < 0.02,
        "value": grok_failover, "threshold": 0.02,
    }
    old_p95, new_p95 = _p95(old, "latency"), _p95(new, "latency")
    latency_ratio = None if old_p95 in (None, 0) or new_p95 is None else new_p95 / old_p95
    outcomes["full_council_p95_latency"] = {
        "passed": latency_ratio is not None and latency_ratio <= 1.20,
        "value": latency_ratio, "threshold": 1.20,
    }
    pairs = (
        ("openrouter-gpt-5.5-medium", "openrouter-gpt-5.6-sol-medium"),
        ("xai-grok-4.3", "xai-grok-4.5"),
    )
    individual_ratios = []
    for baseline_id, candidate_id in pairs:
        baseline_p95 = _p95(
            [row for row in individual_rows if row.get("variant_id") == baseline_id],
            "latency_seconds",
        )
        candidate_p95 = _p95(
            [row for row in individual_rows if row.get("variant_id") == candidate_id],
            "latency_seconds",
        )
        individual_ratios.append(
            None if baseline_p95 in (None, 0) or candidate_p95 is None
            else candidate_p95 / baseline_p95
        )
    individual_ratio = (
        max(float(value) for value in individual_ratios if value is not None)
        if individual_ratios and all(value is not None for value in individual_ratios)
        else None
    )
    outcomes["individual_p95_latency"] = {
        "passed": individual_ratio is not None and individual_ratio <= 1.50,
        "value": individual_ratio, "threshold": 1.50,
    }
    old_cost, new_cost = _metric_mean(old, "cost"), _metric_mean(new, "cost")
    cost_ratio = None if old_cost in (None, 0) or new_cost is None else new_cost / old_cost
    outcomes["cost"] = {
        "passed": cost_exception_accepted or (cost_ratio is not None and cost_ratio <= 1.25),
        "value": cost_ratio, "threshold": 1.25,
        "exception_accepted": cost_exception_accepted,
    }
    return outcomes


async def _run_single(
    config: BenchmarkRunConfig,
    variant: BenchmarkVariant,
    prompt: dict[str, Any],
    trial_index: int,
) -> dict[str, Any]:
    if config.mode == "mock":
        provider_response = _mock_provider_response(config, variant, prompt, trial_index)
        latency_seconds = config.fixed_latency_seconds
        error_status = None
    else:
        provider_response = await _live_provider_response(config, variant, prompt)
        latency_seconds = provider_response.pop("latency_seconds", None) or 0.0
        error_status = provider_response.get("error")
    output = provider_response.get("content") or ""
    if not error_status and not output.strip():
        error_status = "empty_content"

    usage = provider_response.get("usage", {})
    cost = compute_cost(
        usage, variant.pricing, allow_missing_usage=config.mode == "live"
    )
    throughput = output_tokens_per_second(cost.completion_tokens, latency_seconds)
    reasoning = provider_response.get("reasoning") or ""
    reasoning_details = provider_response.get("reasoning_details")
    observed_route_id = provider_response.get("route_id") or variant.route_id
    if variant.route_id and observed_route_id != variant.route_id:
        error_status = "route_mismatch"

    metrics = deterministic_quality_metrics(
        str(prompt.get("role")) if prompt.get("role") is not None else None,
        str(prompt["expected_output"]) if prompt.get("expected_output") is not None else None,
        tuple(str(label) for label in prompt.get("expected_labels", ())),
        output,
    )
    usage_complete = validate_usage(usage, allow_missing=True) is not None
    accounted_total = cost.total_cost_usd
    if config.mode == "live" and not usage_complete:
        accounted_total = _project_cost(config, variant, prompt)
        error_status = error_status or "missing_usage"
        metrics = {**metrics, "quality_status": "fail", "quality": 0.0,
                   "factual_error_rate": 1.0}
    return {
        "run_id": config.run_id,
        "created_at": config.clock_iso,
        "prompt_id": prompt.get("id"),
        "prompt_kind": prompt.get("kind"),
        "variant_id": variant.variant_id,
        "display_name": variant.display_name,
        "provider": variant.provider,
        "model_id": variant.model_id,
        "route_id": observed_route_id,
        "reasoning_effort": variant.reasoning_effort,
        "trial_index": trial_index,
        "latency_seconds": latency_seconds,
        "prompt_tokens": cost.prompt_tokens,
        "completion_tokens": cost.completion_tokens,
        "total_tokens": cost.total_tokens,
        "output_tokens_per_second": throughput,
        "estimated_input_cost_usd": cost.input_cost_usd,
        "estimated_output_cost_usd": cost.output_cost_usd,
        "estimated_total_cost_usd": accounted_total,
        "usage_complete": usage_complete,
        "pricing_source": cost.pricing_source,
        "pricing_captured_at": cost.pricing_captured_at,
        "fallback_used": False,
        "allow_declared_route_failover": False,
        "allow_provider_substitution": False,
        **metrics,
        "error_status": error_status,
        "finish_reason": provider_response.get("finish_reason"),
        "native_finish_reason": provider_response.get("native_finish_reason"),
        "reasoning_tokens": _reasoning_tokens(usage),
        "reasoning_chars": len(reasoning),
        "reasoning_details_count": len(reasoning_details) if isinstance(reasoning_details, list) else 0,
        "output": output,
    }


def _reasoning_tokens(usage: dict[str, Any]) -> int | None:
    completion_details = usage.get("completion_tokens_details")
    if not isinstance(completion_details, dict):
        return None
    reasoning_tokens = completion_details.get("reasoning_tokens")
    return int(reasoning_tokens) if reasoning_tokens is not None else None


def _mock_provider_response(
    config: BenchmarkRunConfig,
    variant: BenchmarkVariant,
    prompt: dict[str, Any],
    trial_index: int,
) -> dict[str, Any]:
    if prompt.get("role") == "quality" and prompt.get("expected_output") is not None:
        content = str(prompt["expected_output"])
    elif prompt.get("role") == "evaluator_format":
        content = "\n".join(
            f"{index}. Candidate {label}"
            for index, label in enumerate(prompt.get("expected_labels", ()), 1)
        )
    else:
        content = (
            f"Mock response seed={config.seed} run={config.run_id} trial={trial_index} "
            f"prompt={prompt.get('id')} variant={variant.variant_id}"
        )
    return {
        "content": content,
        "usage": {
            "prompt_tokens": config.fixed_prompt_tokens,
            "completion_tokens": config.fixed_completion_tokens,
            "total_tokens": config.fixed_prompt_tokens + config.fixed_completion_tokens,
        },
    }


async def _live_provider_response(
    config: BenchmarkRunConfig,
    variant: BenchmarkVariant,
    prompt: dict[str, Any],
) -> dict[str, Any]:
    """Live provider plumbing. Tests do not execute this path."""
    import time

    messages = [{"role": "user", "content": str(prompt.get("prompt", ""))}]
    started = time.perf_counter()
    from backend.model_dispatcher import DispatchRequest, query_model

    response = await query_model(DispatchRequest(
        variant.model_id,
        messages,
        max_tokens=config.max_tokens,
        temperature=config.temperature,
        reasoning_effort=variant.reasoning_effort,
        timeout=config.probe_timeout_seconds,
        allow_fallbacks=False,
        provider=variant.provider,
        allow_declared_route_failover=False,
        allow_provider_substitution=False,
    ))

    latency = time.perf_counter() - started
    if response is None:
        return {"content": "", "usage": {}, "error": "provider call failed", "latency_seconds": latency}
    return {**response, "latency_seconds": latency}


def _quality_status(prompt: dict[str, Any], output: str, error_status: object) -> str:
    if error_status:
        return "fail"
    if prompt.get("role") == "quality":
        expected_output = prompt.get("expected_output")
        return "pass" if expected_output is not None and output.strip() == expected_output else "fail"
    if prompt.get("role") != "evaluator_format":
        return "not_evaluated"
    from .promotion import evaluator_format_status

    labels = tuple(prompt.get("expected_labels", ()))
    return evaluator_format_status(output, labels) if labels else "fail"


def _registry_digest() -> str:
    from backend.model_registry import load_registry

    return load_registry().digest


def _run_manifest_digest(
    config: BenchmarkRunConfig,
    suite: dict[str, Any],
    variants: list[BenchmarkVariant],
    registry_digest: str,
    probe_results: list[Any] | None = None,
) -> str:
    """Digest every execution input using checksums, never prompt/response content."""
    from backend.model_registry import load_registry

    registry = load_registry()
    prompt_checksums = [
        {
            "id": prompt.get("id"),
            "checksum": prompt.get("checksum") or hashlib.sha256(
                json.dumps(
                    {
                        key: value for key, value in prompt.items()
                        if key not in {"prompt", "expected_output"}
                    },
                    sort_keys=True,
                    separators=(",", ":"),
                ).encode()
            ).hexdigest(),
            "prompt_checksum": hashlib.sha256(
                str(prompt.get("prompt", "")).encode()
            ).hexdigest(),
            "expected_output_checksum": (
                hashlib.sha256(str(prompt["expected_output"]).encode()).hexdigest()
                if prompt.get("expected_output") is not None else None
            ),
        }
        for prompt in suite.get("prompts", [])
    ]
    council_rosters = []
    for case in PROMOTION_COUNCIL_VARIANTS if config.variant_set == FLAGSHIP_PROMOTION_VARIANT_SET else ():
        council_rosters.append({
            "variant_id": case.variant_id,
            "configuration": case.configuration,
            "ablated_seat": case.ablated_seat,
            "models": [
                {
                    "model_id": model_id,
                    "roles": list(registry.model(model_id).roles),
                    "route_id": registry.model(model_id).preferred_route.route_id,
                    "provider": registry.model(model_id).preferred_route.provider,
                }
                for model_id in case.roster
            ],
        })
    planned_probe_keys: tuple[str, ...] = ()
    if config.mode == "live" and config.variant_set == FLAGSHIP_PROMOTION_VARIANT_SET:
        planned_probe_keys = tuple(
            spec.probe_key for spec in VARIANT_SETS[FLAGSHIP_PROMOTION_VARIANT_SET]
            if spec.probe_key
        )
    elif config.mode == "live" and config.probe_gated_variants:
        planned_probe_keys = tuple(PROBE_TARGETS)
    projected_councils = []
    if config.variant_set == FLAGSHIP_PROMOTION_VARIANT_SET:
        for prompt in suite.get("prompts", []):
            for case in PROMOTION_COUNCIL_VARIANTS:
                request = _council_promotion_request(case, prompt, config)
                projected_councils.append({
                    "case_id": case.variant_id,
                    "prompt_id": prompt.get("id"),
                    "max_tokens": request.max_tokens,
                    "temperature": request.temperature,
                    "cost_usd": _project_council_cost(config, request),
                })
    projection = {
        "mode": config.mode,
        "variant_set": config.variant_set,
        "seed": config.seed,
        "trials": config.trials,
        "max_tokens": config.max_tokens,
        "temperature": config.temperature,
        "prompt_set": {
            "suite_id": suite.get("suite_id"), "version": suite.get("version"),
            "checksums": prompt_checksums,
        },
        "canonical_registry_digest": registry_digest,
        "variants": [variant.to_dict() for variant in variants],
        "council_rosters": council_rosters,
        "fallback_policies": {
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
        },
        "budget_usd": config.budget_usd,
        "probe": {
            "targets": [
                asdict(PROBE_TARGETS[key]) for key in planned_probe_keys
            ],
            "results": [result.to_dict() for result in (probe_results or [])],
            "timeout_seconds": config.probe_timeout_seconds,
            "projected_cost_usd": PROBE_PROJECTED_COST_USD,
            "projected_total_cost_usd": PROBE_PROJECTED_COST_USD * len(planned_probe_keys),
        },
        "council_projected_costs": projected_councils,
        "thresholds": promotion_thresholds_for_variant_set(config.variant_set),
    }
    canonical = json.dumps(projection, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


# Compatibility for callers that previously imported the private helper.
_config_digest = _run_manifest_digest


def _project_cost(config: BenchmarkRunConfig, variant: BenchmarkVariant, prompt: dict[str, Any]) -> float | None:
    if config.mode == "mock":
        usage = {
            "prompt_tokens": config.fixed_prompt_tokens,
            "completion_tokens": config.fixed_completion_tokens,
            "total_tokens": config.fixed_prompt_tokens + config.fixed_completion_tokens,
        }
    else:
        estimated_prompt_tokens = max(1, int(len(str(prompt.get("prompt", "")).split()) * 1.3))
        usage = {
            "prompt_tokens": estimated_prompt_tokens,
            "completion_tokens": config.max_tokens,
            "total_tokens": estimated_prompt_tokens + config.max_tokens,
        }
    return compute_cost(usage, variant.pricing).total_cost_usd
