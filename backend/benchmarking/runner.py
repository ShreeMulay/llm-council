"""Benchmark runner plumbing for mock and live modes."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

from .artifacts import write_artifacts
from .budget import BudgetGuard
from .costs import compute_cost, output_tokens_per_second
from .judge import generate_mock_judge_scores
from .models import BenchmarkVariant, resolve_default_variants
from .probes import configured_probe_results, probe_support_map, run_support_probes
from .prompts import DEFAULT_PROMPT_SUITE_PATH, load_prompt_suite


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
    mock_judging_enabled: bool = True


@dataclass(frozen=True)
class BenchmarkRunSummary:
    """Summary returned by benchmark execution."""

    run_id: str
    run_dir: Path
    result_count: int
    budget_stopped: bool


def run_benchmark(config: BenchmarkRunConfig) -> BenchmarkRunSummary:
    """Run the benchmark in mock mode or live mode and write artifacts."""
    if config.mode == "live":
        return asyncio.run(_run_benchmark_async(config))
    return _run_benchmark_sync(config)


def _run_benchmark_sync(config: BenchmarkRunConfig) -> BenchmarkRunSummary:
    return asyncio.run(_run_benchmark_async(config))


async def _run_benchmark_async(config: BenchmarkRunConfig) -> BenchmarkRunSummary:
    suite = load_prompt_suite(config.prompt_suite_path)
    prompts = suite["prompts"]
    probe_details = configured_probe_results(config.probe_results)
    effective_probe_results = dict(config.probe_results)
    if config.mode == "live" and config.probe_gated_variants:
        probe_details = await run_support_probes(timeout=config.probe_timeout_seconds)
        effective_probe_results.update(probe_support_map(probe_details))
    resolution = resolve_default_variants(effective_probe_results)
    budget = BudgetGuard(config.budget_usd)
    results: list[dict[str, Any]] = []

    for trial_index in range(config.trials):
        for prompt in prompts:
            for variant in resolution.variants:
                projected_cost = _project_cost(config, variant, prompt)
                if not budget.can_start(projected_cost):
                    break
                result = await _run_single(config, variant, prompt, trial_index)
                results.append(result)
                budget.record_observed(result.get("estimated_total_cost_usd"))
                if budget.stopped:
                    break
            if budget.stopped:
                break
        if budget.stopped:
            break

    run_dir = config.output_dir / config.run_id
    artifact_config = {
        "run_id": config.run_id,
        "mode": config.mode,
        "created_at": config.clock_iso,
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
        "probe_support": effective_probe_results,
        "budget": budget.to_dict(),
        "settings": {
            "trials": config.trials,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "allow_fallbacks": False,
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

    write_artifacts(
        run_dir=run_dir,
        config=artifact_config,
        prompts=prompts,
        results=results,
        judge_scores=judge_scores,
    )
    return BenchmarkRunSummary(
        run_id=config.run_id,
        run_dir=run_dir,
        result_count=len(results),
        budget_stopped=budget.stopped,
    )


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
    cost = compute_cost(usage, variant.pricing)
    throughput = output_tokens_per_second(cost.completion_tokens, latency_seconds)
    reasoning = provider_response.get("reasoning") or ""
    reasoning_details = provider_response.get("reasoning_details")

    return {
        "run_id": config.run_id,
        "created_at": config.clock_iso,
        "prompt_id": prompt.get("id"),
        "prompt_kind": prompt.get("kind"),
        "variant_id": variant.variant_id,
        "display_name": variant.display_name,
        "provider": variant.provider,
        "model_id": variant.model_id,
        "reasoning_effort": variant.reasoning_effort,
        "trial_index": trial_index,
        "latency_seconds": latency_seconds,
        "prompt_tokens": cost.prompt_tokens,
        "completion_tokens": cost.completion_tokens,
        "total_tokens": cost.total_tokens,
        "output_tokens_per_second": throughput,
        "estimated_input_cost_usd": cost.input_cost_usd,
        "estimated_output_cost_usd": cost.output_cost_usd,
        "estimated_total_cost_usd": cost.total_cost_usd,
        "pricing_source": cost.pricing_source,
        "pricing_captured_at": cost.pricing_captured_at,
        "fallback_used": False,
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
    return {
        "content": (
            f"Mock response seed={config.seed} run={config.run_id} trial={trial_index} "
            f"prompt={prompt.get('id')} variant={variant.variant_id}"
        ),
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
    if variant.provider == "openrouter":
        from backend.openrouter import query_model

        response = await query_model(
            variant.model_id,
            messages,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            reasoning_effort=variant.reasoning_effort,
            allow_fallbacks=False,
        )
    elif variant.provider == "fireworks":
        from backend.fireworks_client import query_fireworks_model

        response = await query_fireworks_model(
            variant.model_id,
            messages,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            reasoning_effort=variant.reasoning_effort,
        )
    else:
        response = {"content": "", "usage": {}, "error": f"unsupported provider {variant.provider}"}

    latency = time.perf_counter() - started
    if response is None:
        return {"content": "", "usage": {}, "error": "provider call failed", "latency_seconds": latency}
    return {**response, "latency_seconds": latency}


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
