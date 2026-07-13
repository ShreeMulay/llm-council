"""Contract tests for the internal model benchmark harness."""

import json
import sys
from pathlib import Path

import pytest

from backend.benchmarking.artifacts import (
    ArtifactSecretError,
    build_side_by_side_markdown,
    write_text_guarded,
)
from backend.benchmarking.budget import BudgetGuard
from backend.benchmarking.costs import compute_cost, validate_usage
from backend.benchmarking.independent_judge import DEFAULT_JUDGE_MODEL
from backend.benchmarking.judge import build_blind_judge_payload
from backend.benchmarking.models import (
    FLAGSHIP_PROMOTION_VARIANT_SET,
    FLAGSHIP_PROMOTION_VARIANTS,
    JULY_2026_PROMOTION_THRESHOLDS,
    JULY_2026_ROSTER_VARIANT_SET,
    PROMOTION_COUNCIL_VARIANTS,
    BenchmarkVariant,
    PricingSnapshot,
    resolve_benchmark_variants,
    resolve_default_variants,
)
from backend.benchmarking.probes import (
    PROBE_PROJECTED_COST_USD,
    PROBE_TARGETS,
    ProbeResult,
    probe_target,
    run_support_probes,
)
from backend.benchmarking.promotion import (
    FLAGSHIP_PROMPT_SET,
    evaluator_format_status,
    promotion_prompt_suite,
)
from backend.benchmarking.runner import (
    BenchmarkRunConfig,
    CouncilPromotionExecutor,
    CouncilPromotionRequest,
    _live_provider_response,
    _observed_council_cost,
    _project_council_cost,
    _provider_matches_route,
    _run_single,
    _run_support_probes_budgeted,
    deterministic_quality_metrics,
    evaluate_promotion_thresholds,
    run_benchmark,
)
from backend.fireworks_client import FIREWORKS_MODEL_MAP
from backend.main import app
from backend.model_registry import load_registry


def test_provider_route_alias_is_narrow_and_explicit():
    assert _provider_matches_route("vertex", "vertex-anthropic") is True
    assert _provider_matches_route("openrouter", "openrouter") is True
    assert _provider_matches_route("openrouter", "vertex-anthropic") is False


def test_default_variant_expansion_probe_gates_unsupported_efforts():
    resolution = resolve_default_variants(
        {
            "openrouter:gpt-5.5:xhigh": False,
            "openrouter:claude-opus-4.8:max": True,
        }
    )

    variant_ids = {variant.variant_id for variant in resolution.variants}
    blocked_ids = {variant.variant_id for variant in resolution.blocked}

    assert "fireworks-glm-5.2-default" in variant_ids
    assert "fireworks-glm-5.2-xhigh" in variant_ids
    assert "openrouter-gpt-5.5-medium" in variant_ids
    assert "openrouter-gpt-5.5-high" in variant_ids
    assert "openrouter-gpt-5.5-xhigh" in blocked_ids
    assert "openrouter-opus-4.8-xhigh" in variant_ids
    assert "openrouter-opus-4.8-max" in variant_ids

    max_blocked_resolution = resolve_default_variants(
        {
            "openrouter:gpt-5.5:xhigh": False,
            "openrouter:claude-opus-4.8:max": False,
        }
    )
    max_blocked_ids = {variant.variant_id for variant in max_blocked_resolution.blocked}
    max_blocked_variant_ids = {variant.variant_id for variant in max_blocked_resolution.variants}
    assert "openrouter-opus-4.8-xhigh" in max_blocked_variant_ids
    assert "openrouter-opus-4.8-max" in max_blocked_ids

    glm = next(variant for variant in resolution.variants if variant.variant_id == "fireworks-glm-5.2-default")
    assert glm.provider == "fireworks"
    assert glm.model_id == "fireworks/glm-5.2"
    assert glm.reasoning_effort is None

    glm_xhigh = next(variant for variant in resolution.variants if variant.variant_id == "fireworks-glm-5.2-xhigh")
    assert glm_xhigh.provider == "fireworks"
    assert glm_xhigh.model_id == "fireworks/glm-5.2"
    assert glm_xhigh.reasoning_effort == "xhigh"

    prices = {variant.variant_id: variant.pricing for variant in resolution.variants + resolution.blocked}
    assert prices["fireworks-glm-5.2-default"].input_per_million_usd == 1.40
    assert prices["fireworks-glm-5.2-default"].output_per_million_usd == 4.40
    assert prices["fireworks-glm-5.2-xhigh"].input_per_million_usd == 1.40
    assert prices["fireworks-glm-5.2-xhigh"].output_per_million_usd == 4.40
    assert prices["openrouter-gpt-5.5-medium"].input_per_million_usd == 5.00
    assert prices["openrouter-gpt-5.5-medium"].output_per_million_usd == 30.00
    assert prices["openrouter-gpt-5.5-high"].input_per_million_usd == 5.00
    assert prices["openrouter-gpt-5.5-high"].output_per_million_usd == 30.00
    assert prices["openrouter-gpt-5.5-xhigh"].input_per_million_usd == 5.00
    assert prices["openrouter-gpt-5.5-xhigh"].output_per_million_usd == 30.00
    assert prices["openrouter-opus-4.8-xhigh"].input_per_million_usd == 5.00
    assert prices["openrouter-opus-4.8-xhigh"].output_per_million_usd == 25.00
    assert prices["openrouter-opus-4.8-max"].input_per_million_usd == 5.00
    assert prices["openrouter-opus-4.8-max"].output_per_million_usd == 25.00
    assert "approved benchmark plan/current lookup" in prices["fireworks-glm-5.2-default"].source


def test_july_roster_variant_set_is_selectable_and_roster_neutral():
    resolution = resolve_benchmark_variants(JULY_2026_ROSTER_VARIANT_SET)
    variants = {variant.variant_id: variant for variant in resolution.variants}

    assert set(variants) == {
        "openrouter-llama-4-maverick",
        "openrouter-minimax-m3",
        "fireworks-kimi-k2.6",
        "fireworks-kimi-k2.7-code",
        "openrouter-z-ai-glm-5.2",
        "fireworks-glm-5.2-xhigh",
        "openrouter-claude-fable-5",
    }
    assert {variant.model_id for variant in variants.values()} == {
        "meta-llama/llama-4-maverick",
        "minimax/minimax-m3",
        "fireworks/kimi-k2.6",
        "fireworks/kimi-k2.7-code",
        "z-ai/glm-5.2",
        "fireworks/glm-5.2",
        "anthropic/claude-fable-5",
    }
    assert not {
        "openrouter-gpt-5.5-medium",
        "openrouter-gpt-5.5-high",
        "openrouter-gpt-5.5-xhigh",
        "openrouter-opus-4.8-xhigh",
        "openrouter-opus-4.8-max",
    }.intersection(variants)
    assert all(
        variant.pricing.captured_at == "2026-07-04T00:00:00Z"
        and "roster-refresh-2026-07" in variant.pricing.source
        for variant in variants.values()
    )
    assert variants["openrouter-minimax-m3"].pricing.input_per_million_usd == 0.30
    assert variants["openrouter-minimax-m3"].pricing.output_per_million_usd == 1.20
    assert variants["openrouter-z-ai-glm-5.2"].pricing.input_per_million_usd == 0.91
    assert variants["openrouter-z-ai-glm-5.2"].pricing.output_per_million_usd == 2.86
    assert variants["openrouter-claude-fable-5"].reasoning_effort == "medium"
    assert variants["openrouter-claude-fable-5"].pricing.input_per_million_usd == 10.00
    assert variants["openrouter-claude-fable-5"].pricing.output_per_million_usd == 50.00


def test_july_fireworks_variants_have_explicit_mappings():
    resolution = resolve_benchmark_variants(JULY_2026_ROSTER_VARIANT_SET)
    fireworks_model_ids = {
        variant.model_id for variant in resolution.variants if variant.provider == "fireworks"
    }

    assert fireworks_model_ids
    assert fireworks_model_ids.issubset(FIREWORKS_MODEL_MAP)
    assert FIREWORKS_MODEL_MAP["fireworks/kimi-k2.7-code"] == (
        "accounts/fireworks/models/kimi-k2p7-code"
    )


def test_unknown_fireworks_benchmark_variant_fails_closed_before_spend():
    with pytest.raises(ValueError, match="explicit FIREWORKS_MODEL_MAP"):
        resolve_benchmark_variants(
            [
                BenchmarkVariant(
                    variant_id="fireworks-unknown-model",
                    provider="fireworks",
                    model_id="fireworks/unknown-model",
                    display_name="Unknown Fireworks model",
                    reasoning_effort=None,
                    pricing=PricingSnapshot(
                        input_per_million_usd=1.0,
                        output_per_million_usd=1.0,
                        source="test",
                        captured_at="2026-07-04T00:00:00Z",
                    ),
                )
            ]
        )


def test_independent_judge_default_is_not_july_candidate():
    resolution = resolve_benchmark_variants(JULY_2026_ROSTER_VARIANT_SET)

    assert DEFAULT_JUDGE_MODEL == "google/gemini-3.1-pro-preview"
    assert DEFAULT_JUDGE_MODEL not in {variant.model_id for variant in resolution.variants}


def test_july_promotion_thresholds_are_registered_in_mock_artifact(tmp_path: Path):
    config = BenchmarkRunConfig(
        mode="mock",
        output_dir=tmp_path,
        run_id="july-thresholds-run",
        variant_set=JULY_2026_ROSTER_VARIANT_SET,
        budget_usd=1.0,
        fixed_prompt_tokens=1,
        fixed_completion_tokens=1,
    )

    run = run_benchmark(config)
    config_json = json.loads((run.run_dir / "config.json").read_text())

    assert config_json["variant_set"] == JULY_2026_ROSTER_VARIANT_SET
    assert config_json["promotion_thresholds"] == JULY_2026_PROMOTION_THRESHOLDS
    assert config_json["promotion_thresholds"] == {
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


def test_cost_math_uses_pricing_snapshot():
    pricing = PricingSnapshot(
        input_per_million_usd=2.0,
        output_per_million_usd=8.0,
        source="test-price-card",
        captured_at="2026-06-20T00:00:00Z",
    )

    cost = compute_cost(
        {"prompt_tokens": 1_000, "completion_tokens": 500, "total_tokens": 1_500},
        pricing,
    )

    assert cost.input_cost_usd == pytest.approx(0.002)
    assert cost.output_cost_usd == pytest.approx(0.004)
    assert cost.total_cost_usd == pytest.approx(0.006)
    assert cost.pricing_source == "test-price-card"
    assert cost.pricing_captured_at == "2026-06-20T00:00:00Z"


@pytest.mark.parametrize(
    ("usage", "effective_completion_tokens"),
    [
        (
            {
                "prompt_tokens": 195,
                "completion_tokens": 2,
                "total_tokens": 331,
                "completion_tokens_details": {"reasoning_tokens": 134},
            },
            136,
        ),
        (
            {
                "prompt_tokens": 210,
                "completion_tokens": 1,
                "total_tokens": 232,
                "completion_tokens_details": {"reasoning_tokens": 21},
            },
            22,
        ),
        (
            {
                "prompt_tokens": 195,
                "completion_tokens": 136,
                "total_tokens": 331,
                "completion_tokens_details": {"reasoning_tokens": 134},
            },
            136,
        ),
    ],
    ids=["xai-grok", "xai-grok-4.5", "openrouter-reasoning-already-included"],
)
def test_reasoning_usage_normalizes_to_conservative_effective_completion(
    usage, effective_completion_tokens
):
    pricing = PricingSnapshot(
        input_per_million_usd=2.0,
        output_per_million_usd=10.0,
        source="test-price-card",
        captured_at="2026-07-13T00:00:00Z",
    )

    validated = validate_usage(usage)
    cost = compute_cost(usage, pricing)

    assert validated == {
        "prompt_tokens": usage["prompt_tokens"],
        "completion_tokens": effective_completion_tokens,
        "total_tokens": usage["total_tokens"],
    }
    assert cost.completion_tokens == effective_completion_tokens
    assert cost.total_tokens == usage["total_tokens"]
    assert cost.output_cost_usd == pytest.approx(effective_completion_tokens * 10.0 / 1_000_000)


def test_deterministic_mock_run_writes_expected_artifacts(tmp_path: Path):
    config = BenchmarkRunConfig(
        mode="mock",
        output_dir=tmp_path,
        run_id="fixed-run",
        clock_iso="2026-06-20T12:00:00Z",
        seed=7,
        fixed_latency_seconds=1.25,
        fixed_prompt_tokens=100,
        fixed_completion_tokens=40,
        probe_results={
            "openrouter:gpt-5.5:xhigh": False,
            "openrouter:claude-opus-4.8:max": False,
        },
    )

    first = run_benchmark(config)
    second = run_benchmark(config)

    assert first.run_dir == tmp_path / "fixed-run"
    assert sorted(path.name for path in first.run_dir.iterdir()) == [
        "config.json",
        "judge-scores.csv",
        "metrics.csv",
        "raw-results.jsonl",
        "side-by-side.md",
        "summary.md",
    ]
    assert (first.run_dir / "raw-results.jsonl").read_text() == (
        second.run_dir / "raw-results.jsonl"
    ).read_text()
    assert (first.run_dir / "judge-scores.csv").read_text() == (
        second.run_dir / "judge-scores.csv"
    ).read_text()

    side_by_side = (first.run_dir / "side-by-side.md").read_text()
    assert "# Benchmark Side-by-Side" in side_by_side
    assert "Prompt:" in side_by_side
    assert "Mock response" in side_by_side
    assert "Latency:" in side_by_side
    assert "Tokens:" in side_by_side
    assert "Estimated cost:" in side_by_side

    config_json = json.loads((first.run_dir / "config.json").read_text())
    first_variant = config_json["variants"][0]
    assert first_variant["pricing"]["source"]
    assert first_variant["pricing"]["captured_at"]
    assert first_variant["pricing"]["input_per_million_usd"] is not None

    judge_rows = (first.run_dir / "judge-scores.csv").read_text().splitlines()
    assert len(judge_rows) > 1
    assert "candidate_variant_id" in judge_rows[0]
    assert "correctness" in judge_rows[0]
    assert "deterministic mock blind score" in judge_rows[1]
    metrics_header = (first.run_dir / "metrics.csv").read_text().splitlines()[0]
    assert "reasoning_tokens" in metrics_header
    assert "reasoning_chars" in metrics_header
    assert "reasoning_details_count" in metrics_header


def test_budget_cap_stops_additional_calls(tmp_path: Path):
    config = BenchmarkRunConfig(
        mode="mock",
        output_dir=tmp_path,
        run_id="budget-run",
        clock_iso="2026-06-20T12:00:00Z",
        seed=1,
        budget_usd=0.000001,
        fixed_prompt_tokens=10_000,
        fixed_completion_tokens=10_000,
        probe_results={
            "openrouter:gpt-5.5:xhigh": False,
            "openrouter:claude-opus-4.8:max": False,
        },
    )

    run = run_benchmark(config)
    config_json = json.loads((run.run_dir / "config.json").read_text())
    metrics_rows = (run.run_dir / "metrics.csv").read_text().splitlines()

    assert config_json["budget"]["stopped"] is True
    assert "Budget stop" in (run.run_dir / "summary.md").read_text()
    assert len(metrics_rows) == 1  # header only: no calls made after fail-closed projection


def test_blind_judge_payload_anonymizes_candidates_and_excludes_self():
    resolution = resolve_default_variants(
        {
            "openrouter:gpt-5.5:xhigh": False,
            "openrouter:claude-opus-4.8:max": False,
        }
    )
    judge_variant = next(
        variant for variant in resolution.variants if variant.variant_id == "openrouter-gpt-5.5-medium"
    )
    results = [
        {
            "variant_id": "openrouter-gpt-5.5-medium",
            "model_id": "openai/gpt-5.5",
            "output": "self output",
        },
        {
            "variant_id": "fireworks-glm-5.2-default",
            "model_id": "fireworks/glm-5.2",
            "output": "other output",
        },
    ]

    payload = build_blind_judge_payload(
        judge_variant=judge_variant,
        prompt={"id": "p1", "prompt": "Compare these."},
        candidate_results=results,
        seed=3,
    )

    content = payload["messages"][0]["content"]
    assert "Candidate A" in content
    assert "other output" in content
    assert "self output" not in content
    assert "openai/gpt-5.5" not in content
    assert "fireworks/glm-5.2" not in content
    assert payload["excluded_variant_ids"] == ["openrouter-gpt-5.5-medium"]


@pytest.mark.asyncio
async def test_support_probe_uses_tiny_no_fallback_openrouter_call(monkeypatch):
    calls = []

    async def fake_query_model(
        model,
        messages,
        max_tokens,
        temperature,
        timeout,
        reasoning_effort,
        allow_fallbacks,
        allow_provider_substitution,
    ):
        calls.append(
            {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "timeout": timeout,
                "reasoning_effort": reasoning_effort,
                "allow_fallbacks": allow_fallbacks,
                "allow_provider_substitution": allow_provider_substitution,
            }
        )
        return {"content": "OK", "usage": {}}

    monkeypatch.setattr("backend.openrouter.query_model", fake_query_model)

    result = await probe_target(PROBE_TARGETS["openrouter:gpt-5.5:xhigh"], timeout=5.0)

    assert result.supported is True
    assert result.reason == "probe call succeeded"
    assert calls == [
        {
            "model": "openai/gpt-5.5",
            "messages": [{"role": "user", "content": "Reply with OK."}],
            "max_tokens": 16,
            "temperature": 0,
            "timeout": 5.0,
            "reasoning_effort": "xhigh",
            "allow_fallbacks": False,
            "allow_provider_substitution": False,
        }
    ]


@pytest.mark.asyncio
async def test_live_benchmark_captures_one_primary_route_and_disables_both_policies(monkeypatch):
    captured = []

    async def fake_query(request):
        captured.append(request)
        return {"content": "ok", "usage": {}}

    monkeypatch.setattr("backend.model_dispatcher.query_model", fake_query)
    variant = next(
        item for item in resolve_benchmark_variants(JULY_2026_ROSTER_VARIANT_SET).variants
        if item.variant_id == "openrouter-claude-fable-5"
    )
    await _live_provider_response(
        BenchmarkRunConfig(mode="live"), variant, {"prompt": "test"}
    )

    assert captured[0].allow_declared_route_failover is False
    assert captured[0].allow_provider_substitution is False


@pytest.mark.asyncio
async def test_support_probe_fails_closed_on_none(monkeypatch):
    async def fake_query_model(*args, **kwargs):
        return None

    monkeypatch.setattr("backend.openrouter.query_model", fake_query_model)

    result = await probe_target(PROBE_TARGETS["openrouter:claude-opus-4.8:max"])

    assert result.supported is False
    assert result.reason == "probe returned no response"


def test_live_probe_gated_variants_are_included_when_mocked_probe_supports(
    tmp_path: Path,
    monkeypatch,
):
    prompt_suite = tmp_path / "suite.json"
    prompt_suite.write_text(
        json.dumps(
            {
                "suite_id": "test_suite",
                "version": 1,
                "prompts": [
                    {
                        "id": "p1",
                        "kind": "coding",
                        "title": "Test prompt",
                        "prompt": "Write one sentence.",
                    }
                ],
            }
        )
    )

    async def fake_run_support_probes(*, timeout, budget, keys=None):
        del timeout, keys
        results = [
            ProbeResult(
                key="openrouter:gpt-5.5:xhigh",
                provider="openrouter",
                model_id="openai/gpt-5.5",
                reasoning_effort="xhigh",
                supported=True,
                reason="mocked supported",
            ),
            ProbeResult(
                key="openrouter:claude-opus-4.8:max",
                provider="openrouter",
                model_id="anthropic/claude-opus-4.8",
                reasoning_effort="max",
                supported=True,
                reason="mocked supported",
            ),
        ]
        authorized = []
        for result in results:
            if not budget.can_start(result.projected_cost_usd):
                break
            authorized.append(result)
            budget.record_observed(
                result.observed_cost_usd if result.usage_complete else None,
                reserved_cost_usd=result.projected_cost_usd,
            )
        return authorized

    async def fake_run_single(config, variant, prompt, trial_index):
        return {
            "run_id": config.run_id,
            "prompt_id": prompt["id"],
            "variant_id": variant.variant_id,
            "provider": variant.provider,
            "model_id": variant.model_id,
            "trial_index": trial_index,
            "latency_seconds": 0.01,
            "prompt_tokens": 1,
            "completion_tokens": 1,
            "total_tokens": 2,
            "output_tokens_per_second": 100.0,
            "estimated_input_cost_usd": 0.0,
            "estimated_output_cost_usd": 0.0,
            "estimated_total_cost_usd": 0.0,
            "error_status": None,
            "fallback_used": False,
            "output": f"mock live output from {variant.variant_id}",
        }

    monkeypatch.setattr("backend.benchmarking.runner.run_support_probes", fake_run_support_probes)
    monkeypatch.setattr("backend.benchmarking.runner._run_single", fake_run_single)

    run = run_benchmark(
        BenchmarkRunConfig(
            mode="live",
            output_dir=tmp_path,
            run_id="live-probe-test",
            prompt_suite_path=prompt_suite,
            probe_gated_variants=True,
            trials=1,
            max_tokens=256,
            temperature=0.2,
        )
    )

    config_json = json.loads((run.run_dir / "config.json").read_text())
    variant_ids = {variant["variant_id"] for variant in config_json["variants"]}

    assert "openrouter-gpt-5.5-xhigh" in variant_ids
    assert "openrouter-opus-4.8-xhigh" in variant_ids
    assert "openrouter-opus-4.8-max" in variant_ids
    assert config_json["probe_gated_variants"] is True
    assert config_json["probe_support"] == {
        "openrouter:gpt-5.5:xhigh": True,
        "openrouter:claude-opus-4.8:max": True,
    }
    assert {result["reason"] for result in config_json["probe_results"]} == {"mocked supported"}
    assert run.result_count == len(config_json["variants"])


@pytest.mark.asyncio
async def test_live_fireworks_variant_passes_reasoning_effort(monkeypatch):
    calls = []

    async def fake_query_fireworks_model(model_id, messages, *args, **kwargs):
        calls.append(
            {
                "model_id": model_id,
                "messages": messages,
                "args": args,
                "kwargs": kwargs,
            }
        )
        return {"content": "ok", "usage": {}, "provider": "fireworks"}

    monkeypatch.setattr("backend.fireworks_client.query_fireworks_model", fake_query_fireworks_model)

    pricing = PricingSnapshot(
        input_per_million_usd=1.40,
        output_per_million_usd=4.40,
        source="test-price-card",
        captured_at="2026-06-20T00:00:00Z",
    )
    variant = BenchmarkVariant(
        variant_id="fireworks-glm-5.2-xhigh",
        provider="fireworks",
        model_id="fireworks/glm-5.2",
        display_name="Fireworks GLM-5.2 xHigh",
        reasoning_effort="xhigh",
        pricing=pricing,
    )

    response = await _live_provider_response(
        BenchmarkRunConfig(mode="live", max_tokens=32768, temperature=0.2),
        variant,
        {"id": "p1", "prompt": "Test prompt"},
    )

    assert response["content"] == "ok"
    assert calls[0]["model_id"] == "accounts/fireworks/models/glm-5p2"
    assert calls[0]["kwargs"]["reasoning_effort"] == "xhigh"


@pytest.mark.asyncio
async def test_live_result_empty_content_sets_error_and_blank_side_by_side(monkeypatch):
    async def fake_live_provider_response(config, variant, prompt):
        return {
            "content": None,
            "finish_reason": "length",
            "native_finish_reason": "max_output_tokens",
            "reasoning": "hidden reasoning trace",
            "reasoning_details": [{"type": "summary", "text": "detail"}],
            "usage": {
                "prompt_tokens": 5,
                "completion_tokens": 0,
                "total_tokens": 5,
                "completion_tokens_details": {"reasoning_tokens": 4096},
            },
            "latency_seconds": 0.2,
        }

    monkeypatch.setattr(
        "backend.benchmarking.runner._live_provider_response",
        fake_live_provider_response,
    )
    variant = next(
        variant
        for variant in resolve_default_variants().variants
        if variant.variant_id == "openrouter-gpt-5.5-medium"
    )
    prompt = {"id": "p1", "kind": "coding", "title": "Empty output", "prompt": "Test prompt"}

    result = await _run_single(
        BenchmarkRunConfig(mode="live", run_id="empty-content-test"),
        variant,
        prompt,
        trial_index=0,
    )
    markdown = build_side_by_side_markdown([prompt], [result])

    assert result["output"] == ""
    assert result["error_status"] == "empty_content"
    assert result["finish_reason"] == "length"
    assert result["native_finish_reason"] == "max_output_tokens"
    assert result["reasoning_tokens"] == 4096
    assert result["reasoning_chars"] == len("hidden reasoning trace")
    assert result["reasoning_details_count"] == 1
    assert "Error status: empty_content" in markdown
    assert "None" not in markdown
    assert "```text\n\n```" in markdown


def test_artifact_writer_rejects_common_secret_patterns(tmp_path: Path):
    with pytest.raises(ArtifactSecretError):
        write_text_guarded(tmp_path / "summary.md", "Authorization: Bearer sk-or-v1-secretvalue")

    assert not (tmp_path / "summary.md").exists()


def test_no_benchmark_fastapi_endpoint_route_added():
    paid_benchmark_routes = [route.path for route in app.routes if "benchmark" in route.path.lower()]

    assert paid_benchmark_routes == []


def test_flagship_promotion_definitions_are_exact_immutable_and_paired():
    variants = {item.variant_id: item for item in FLAGSHIP_PROMOTION_VARIANTS}
    assert {(item.model_id, item.route_id) for item in variants.values()} == {
        ("openai/gpt-5.5", "openrouter:openai/gpt-5.5"),
        ("openai/gpt-5.6-sol", "openrouter:openai/gpt-5.6-sol"),
        ("x-ai/grok-4.3", "xai:x-ai/grok-4.3"),
        ("x-ai/grok-4.5", "xai:x-ai/grok-4.5"),
    }
    assert all(not item.allow_declared_route_failover for item in variants.values())
    assert all(not item.allow_provider_substitution for item in variants.values())
    with pytest.raises(AttributeError):
        FLAGSHIP_PROMOTION_VARIANTS[0].model_id = "changed"

    councils = {item.variant_id: item for item in PROMOTION_COUNCIL_VARIANTS}
    assert set(councils) == {
        "full-council-old",
        "full-council-new",
        "seat-ablation-gpt",
        "seat-ablation-grok",
        *(f"seat-removal-{index}" for index in range(1, 10)),
    }
    assert councils["seat-ablation-gpt"].ablated_seat == "openai/gpt-5.6-sol"
    assert councils["seat-ablation-grok"].ablated_seat == "x-ai/grok-4.5"
    removals = [item for item in councils.values() if item.configuration == "removed"]
    assert len(removals) == 9
    assert {item.ablated_seat for item in removals} == set(councils["full-council-new"].roster)
    assert all(item.ablated_seat not in item.roster and len(item.roster) == 8 for item in removals)

    pairs: dict[str, set[str]] = {}
    for case in FLAGSHIP_PROMPT_SET.cases:
        pairs.setdefault(case.pair_id, set()).add(case.role)
    assert pairs
    assert all(roles == {"quality", "evaluator_format"} for roles in pairs.values())
    assert evaluator_format_status("1. Candidate A\n2. Candidate B", ("A", "B")) == "pass"
    assert evaluator_format_status("Candidate A was best", ("A", "B")) == "fail"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "probe_key",
    ["promotion:openai/gpt-5.6-sol", "promotion:x-ai/grok-4.5"],
)
async def test_promotion_probe_uses_exact_route_and_disables_both_fallback_policies(
    probe_key,
    monkeypatch,
):
    captured = []

    async def fake_query(request):
        captured.append(request)
        target = PROBE_TARGETS[probe_key]
        return {"content": "OK", "route_id": target.route_id, "usage": {}}

    monkeypatch.setattr("backend.model_dispatcher.query_model", fake_query)
    result = await probe_target(PROBE_TARGETS[probe_key], timeout=4.0)

    assert result.supported is True
    assert result.route_id == PROBE_TARGETS[probe_key].route_id
    assert result.allow_declared_route_failover is False
    assert result.allow_provider_substitution is False
    assert captured[0].allow_declared_route_failover is False
    assert captured[0].allow_provider_substitution is False
    assert captured[0].provider == PROBE_TARGETS[probe_key].provider


def test_promotion_run_persists_proof_metadata_without_content(tmp_path: Path):
    run = run_benchmark(
        BenchmarkRunConfig(
            mode="mock",
            output_dir=tmp_path,
            run_id="flagship-proof",
            variant_set=FLAGSHIP_PROMOTION_VARIANT_SET,
            prompt_suite_path=Path("benchmarks/prompts/internal_suite_v1.json"),
            fixed_prompt_tokens=2,
            fixed_completion_tokens=3,
        )
    )
    config_json = json.loads((run.run_dir / "config.json").read_text())
    rows = [json.loads(line) for line in (run.run_dir / "raw-results.jsonl").read_text().splitlines()]
    persisted = "\n".join(path.read_text() for path in run.run_dir.iterdir() if path.is_file())

    assert config_json["prompt_set_version"] == "flagship-promotion-v2"
    assert len(config_json["config_digest"]) == 64
    assert len(config_json["registry_digest"]) == 64
    assert config_json["council_variants"]
    assert rows
    for row in rows:
        assert row["model_id"]
        assert row["route_id"]
        assert row["allow_declared_route_failover"] is False
        assert row["allow_provider_substitution"] is False
        assert row["prompt_set_version"] == "flagship-promotion-v2"
        assert row["config_digest"] == config_json["config_digest"]
        assert row["registry_digest"] == config_json["registry_digest"]
        assert row["quality_status"] in {"pass", "fail", "not_evaluated"}
        assert "latency_seconds" in row
        assert "estimated_total_cost_usd" in row
        assert "error_status" in row
        assert "output" not in row
    assert "Mock response" not in persisted
    assert "Reply with OK" not in persisted


def test_promotion_executes_all_councils_after_individual_pairs_without_live_api(
    tmp_path: Path,
    monkeypatch,
):
    events = []

    async def fake_run_single(config, variant, prompt, trial_index):
        events.append(("individual", prompt["id"], variant.variant_id))
        return {
            "run_id": config.run_id,
            "prompt_id": prompt["id"],
            "variant_id": variant.variant_id,
            "provider": variant.provider,
            "model_id": variant.model_id,
            "route_id": variant.route_id,
            "trial_index": trial_index,
            "latency_seconds": 0.01,
            "prompt_tokens": 1,
            "completion_tokens": 1,
            "total_tokens": 2,
            "estimated_total_cost_usd": 0.0,
            "error_status": None,
            "fallback_used": False,
            "output": "not persisted",
        }

    async def fake_council_executor(request):
        events.append(("council", request.prompt_id, request.case_id))
        assert request.allow_declared_route_failover is False
        assert request.allow_provider_substitution is False
        return {
            "models": [dict(model) for model in request.models],
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
            "fallback_used": False,
            "latency_seconds": 1.25,
            "estimated_total_cost_usd": 0.5,
            "quality_status": "pass",
            "error_status": None,
            "content": "must never be persisted",
        }

    monkeypatch.setattr("backend.benchmarking.runner._run_single", fake_run_single)
    run = run_benchmark(BenchmarkRunConfig(
        mode="mock",
        output_dir=tmp_path,
        run_id="executable-councils",
        variant_set=FLAGSHIP_PROMOTION_VARIANT_SET,
        council_executor=fake_council_executor,
        budget_usd=None,
    ))

    individual_count = len(FLAGSHIP_PROMPT_SET.cases) * len(FLAGSHIP_PROMOTION_VARIANTS)
    council_count = len(FLAGSHIP_PROMPT_SET.cases) * len(PROMOTION_COUNCIL_VARIANTS)
    assert len(events) == individual_count + council_count
    assert all(event[0] == "individual" for event in events[:individual_count])
    assert all(event[0] == "council" for event in events[individual_count:])
    assert {event[2] for event in events[individual_count:]} == {
        item.variant_id for item in PROMOTION_COUNCIL_VARIANTS
    }

    aggregates_path = run.run_dir / "council-aggregates.jsonl"
    aggregates = [json.loads(line) for line in aggregates_path.read_text().splitlines()]
    assert len(aggregates) == council_count
    assert "must never be persisted" not in aggregates_path.read_text()
    assert all(row["fallback_used"] is False for row in aggregates)
    assert all(row["models"] for row in aggregates)
    report = json.loads((run.run_dir / "seat-ablation-report.json").read_text())
    assert set(report["effects"]) == {
        item.ablated_seat
        for item in PROMOTION_COUNCIL_VARIANTS
        if item.configuration == "removed"
    }
    assert all(
        set(metrics) >= {
            "quality", "diversity", "latency", "cost", "failure_rate",
            "uncertainty", "judge_agreement",
        }
        for seat in report["effects"].values()
        for metrics in seat["removed"].values()
    )


@pytest.mark.parametrize("invalid_proof", ["fallback", "identity"])
def test_promotion_council_rejects_fallback_or_route_model_role_mismatch(
    tmp_path: Path,
    invalid_proof: str,
):
    async def rejecting_executor(request):
        models = [dict(model) for model in request.models]
        fallback_used = invalid_proof == "fallback"
        if invalid_proof == "identity":
            models[0] = {**models[0], "roles": ["wrong-role"]}
        return {
            "models": models,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
            "fallback_used": fallback_used,
        }

    with pytest.raises(ValueError, match="fallback|route/model/role"):
        run_benchmark(BenchmarkRunConfig(
            mode="mock",
            output_dir=tmp_path,
            run_id=f"reject-{invalid_proof}",
            variant_set=FLAGSHIP_PROMOTION_VARIANT_SET,
            council_executor=rejecting_executor,
        ))

    assert not (tmp_path / f"reject-{invalid_proof}").exists()


def test_promotion_uses_canonical_registry_digest(tmp_path: Path):
    run = run_benchmark(BenchmarkRunConfig(
        mode="mock",
        output_dir=tmp_path,
        run_id="canonical-digest",
        variant_set=FLAGSHIP_PROMOTION_VARIANT_SET,
        budget_usd=0.0,
    ))
    config = json.loads((run.run_dir / "config.json").read_text())
    assert config["registry_digest"] == load_registry().digest


def test_council_budget_projects_before_call_and_records_observed_spend(
    tmp_path: Path, monkeypatch
):
    calls = []

    async def fake_single(config, variant, prompt, trial_index):
        return {"estimated_total_cost_usd": 0.0, "output": "discarded"}

    async def fake_council(request):
        calls.append(request.case_id)
        return {
            "models": [dict(model) for model in request.models],
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
            "fallback_used": False,
            "estimated_total_cost_usd": 0.1,
        }

    monkeypatch.setattr("backend.benchmarking.runner._run_single", fake_single)
    run = run_benchmark(BenchmarkRunConfig(
        mode="mock",
        output_dir=tmp_path,
        run_id="council-budget",
        variant_set=FLAGSHIP_PROMOTION_VARIANT_SET,
        budget_usd=0.25,
        council_projected_cost_usd=0.2,
        council_executor=fake_council,
    ))
    config = json.loads((run.run_dir / "config.json").read_text())
    assert calls == ["full-council-old"]
    assert config["budget"]["stopped"] is True
    assert config["budget"]["observed_spend_usd"] == pytest.approx(0.1)
    assert config["council_spend_usd"] == pytest.approx(0.1)
    assert run.council_spend_usd == pytest.approx(0.1)


def test_live_promotion_cli_constructs_concrete_executor_without_network(
    monkeypatch, tmp_path: Path
):
    captured = []

    def fake_run(config):
        captured.append(config)
        return type("Summary", (), {"run_dir": tmp_path})()

    monkeypatch.setattr("backend.benchmarking.__main__.run_benchmark", fake_run)
    monkeypatch.setattr(sys, "argv", [
        "benchmark", "--mode", "live", "--promotion", "--output-dir", str(tmp_path),
        "--probe-timeout-seconds", "90",
    ])
    from backend.benchmarking.__main__ import main

    main()
    assert captured[0].variant_set == FLAGSHIP_PROMOTION_VARIANT_SET
    assert isinstance(captured[0].council_executor, CouncilPromotionExecutor)
    assert captured[0].probe_timeout_seconds == 90


@pytest.mark.asyncio
@pytest.mark.parametrize("invalid", [None, "route", "fallback"])
async def test_concrete_council_executor_verifies_every_exact_operation_without_network(
    monkeypatch, invalid
):
    import backend.council as council_runtime

    registry = load_registry()
    request = CouncilPromotionRequest(
        case_id="full-council-new",
        prompt_id="p1",
        prompt="content must not be returned",
        models=tuple({
            "model_id": model_id,
            "route_id": registry.model(model_id).preferred_route.route_id,
            "roles": list(registry.model(model_id).roles),
        } for model_id in registry.production_roster),
    )
    call_count = 0

    class FakeDispatcher:
        async def execute(self, operation):
            nonlocal call_count
            call_count += 1
            return {
                "content": "runtime-only content",
                "provider": operation.route.provider,
                "route_id": "wrong:route" if invalid == "route" and call_count == 1 else operation.route.route_id,
                "selected_route_id": "wrong:route" if invalid == "route" and call_count == 1 else operation.route.route_id,
                "fallback_used": invalid == "fallback" and call_count == 1,
                "usage": {
                    "prompt_tokens": 2,
                    "completion_tokens": 3,
                    "total_tokens": 5,
                },
            }

    async def fake_run_full_council(
        prompt, council_models, execution_plan, operation_executor=None
    ):
        del prompt, council_models
        assert operation_executor is not None
        stage1 = []
        for operation in execution_plan.stage1:
            response = await operation_executor("stage1", operation)
            stage1.append({"model": operation.logical_id, "response": response["content"]})
        stage2 = []
        for operation in execution_plan.evaluators:
            await operation_executor("stage2", operation)
            stage2.append({"model": operation.logical_id})
        await operation_executor("stage3", execution_plan.chairman)
        return stage1, stage2, {"model": execution_plan.chairman.logical_id}, {
            "aggregate_rankings": [],
            "execution_plan": council_runtime.execution_plan_metadata(execution_plan),
        }

    def dispatcher_factory():
        return FakeDispatcher()

    monkeypatch.setattr(council_runtime, "_dispatcher", dispatcher_factory)
    monkeypatch.setattr(council_runtime, "run_full_council", fake_run_full_council)
    council_runtime._stage1_cache["benchmark-must-not-clear"] = ({"content": "cached"}, 1.0)

    if invalid:
        with pytest.raises(ValueError, match="route mismatch|fallback"):
            await CouncilPromotionExecutor()(request)
        assert council_runtime._dispatcher is dispatcher_factory
        assert "benchmark-must-not-clear" in council_runtime._stage1_cache
        return

    result = await CouncilPromotionExecutor()(request)
    assert call_count == len(registry.production_roster) + len(registry.evaluator_priority) + 1
    assert result["fallback_used"] is False
    assert result["estimated_total_cost_usd"] > 0
    assert result["models"][0]["model_id"] == "openai/gpt-5.6-sol"
    assert "content" not in result
    assert council_runtime._dispatcher is dispatcher_factory
    assert "benchmark-must-not-clear" in council_runtime._stage1_cache


def test_zero_live_budget_makes_zero_probe_or_provider_calls(tmp_path: Path, monkeypatch):
    calls = []

    async def forbidden(*args, **kwargs):
        calls.append((args, kwargs))
        raise AssertionError("network path must not run")

    monkeypatch.setattr("backend.benchmarking.runner.run_support_probes", forbidden)
    monkeypatch.setattr("backend.benchmarking.runner._live_provider_response", forbidden)
    run = run_benchmark(BenchmarkRunConfig(
        mode="live", output_dir=tmp_path, run_id="zero-budget",
        variant_set=FLAGSHIP_PROMOTION_VARIANT_SET, budget_usd=0,
    ))
    config = json.loads((run.run_dir / "config.json").read_text())
    assert calls == []
    assert config["budget"]["stopped"] is True
    assert config["probe_spend_usd"] == 0


@pytest.mark.asyncio
async def test_probe_missing_usage_charges_full_reservation(monkeypatch):
    target = PROBE_TARGETS["promotion:openai/gpt-5.6-sol"]

    async def fake_query(request):
        return {"content": "OK", "route_id": target.route_id, "usage": {}}

    monkeypatch.setattr("backend.model_dispatcher.query_model", fake_query)
    budget = BudgetGuard(1.0)
    results = await run_support_probes(keys=[target.key], budget=budget)
    assert results[0].usage_complete is False
    assert results[0].observed_cost_usd == PROBE_PROJECTED_COST_USD
    assert budget.observed_spend_usd == PROBE_PROJECTED_COST_USD


@pytest.mark.asyncio
async def test_budgeted_probe_internal_type_error_fails_without_retry(monkeypatch):
    calls = 0

    async def failing_probe_runner(*, keys, timeout, budget):
        nonlocal calls
        del keys, timeout, budget
        calls += 1
        raise TypeError("provider implementation failed internally")

    monkeypatch.setattr(
        "backend.benchmarking.runner.run_support_probes", failing_probe_runner
    )

    with pytest.raises(TypeError, match="failed internally"):
        await _run_support_probes_budgeted(timeout=1.0, budget=BudgetGuard(1.0))

    assert calls == 1


@pytest.mark.asyncio
async def test_legacy_probe_fake_cannot_bypass_budget_api(monkeypatch):
    calls = 0

    async def legacy_probe_runner(timeout):
        nonlocal calls
        del timeout
        calls += 1
        return []

    monkeypatch.setattr(
        "backend.benchmarking.runner.run_support_probes", legacy_probe_runner
    )

    with pytest.raises(TypeError, match="unexpected keyword argument"):
        await _run_support_probes_budgeted(timeout=1.0, budget=BudgetGuard(1.0))

    assert calls == 0


@pytest.mark.asyncio
async def test_every_network_probe_has_prior_budget_authorization(monkeypatch):
    events = []

    class RecordingBudget(BudgetGuard):
        def can_start(self, projected_cost_usd):
            events.append(("can_start", projected_cost_usd))
            return super().can_start(projected_cost_usd)

    async def fake_probe_target(target, timeout):
        del timeout
        events.append(("network", target.key))
        return ProbeResult(
            key=target.key,
            provider=target.provider,
            model_id=target.model_id,
            reasoning_effort=target.reasoning_effort,
            supported=True,
            reason="mocked supported",
            route_id=target.route_id,
            usage_complete=True,
        )

    monkeypatch.setattr("backend.benchmarking.probes.probe_target", fake_probe_target)
    keys = list(PROBE_TARGETS)[:2]

    results = await run_support_probes(keys=keys, budget=RecordingBudget(1.0))

    assert [result.key for result in results] == keys
    assert events == [
        ("can_start", PROBE_PROJECTED_COST_USD),
        ("network", keys[0]),
        ("can_start", PROBE_PROJECTED_COST_USD),
        ("network", keys[1]),
    ]


def test_deterministic_objective_and_evaluator_quality_metrics():
    normalized = deterministic_quality_metrics(
        "quality", "STATUS_OK", (), "STATUS_OK"
    )
    evaluator = deterministic_quality_metrics(
        "evaluator_format", None, ("A", "B"), "1. Candidate A\n2. Candidate B"
    )
    assert normalized["objective_exact_accuracy"] == 1
    assert normalized["objective_normalized_accuracy"] == 1
    assert normalized["factual_error_rate"] == 0
    assert evaluator["evaluator_format_rate"] == 1


def test_promotion_matrix_reports_complete_and_budget_truncated_incomplete(tmp_path: Path):
    complete = run_benchmark(BenchmarkRunConfig(
        mode="mock", output_dir=tmp_path, run_id="complete-matrix",
        variant_set=FLAGSHIP_PROMOTION_VARIANT_SET, budget_usd=None,
    ))
    complete_report = json.loads(
        (complete.run_dir / "seat-ablation-report.json").read_text()
    )
    incomplete = run_benchmark(BenchmarkRunConfig(
        mode="mock", output_dir=tmp_path, run_id="incomplete-matrix",
        variant_set=FLAGSHIP_PROMOTION_VARIANT_SET, budget_usd=0,
    ))
    incomplete_report = json.loads(
        (incomplete.run_dir / "seat-ablation-report.json").read_text()
    )
    assert complete_report["complete"] is True
    assert complete_report["expected_count"] == (
        len(PROMOTION_COUNCIL_VARIANTS) * len(FLAGSHIP_PROMPT_SET.cases)
    )
    assert incomplete_report["complete"] is False
    assert incomplete_report["missing_cells"]
    assert incomplete_report["promotion_eligible"] is False
    assert incomplete_report["promotion_evidence"] is False


def test_unavailable_and_failed_promotion_thresholds_fail_closed():
    outcomes = evaluate_promotion_thresholds([
        {"case_id": "full-council-old", "quality": 1.0, "stratum": "reasoning"},
        {"case_id": "full-council-new", "quality": 0.8, "stratum": "reasoning"},
    ])
    assert outcomes["quality_overall"]["passed"] is False
    assert outcomes["individual_p95_latency"]["passed"] is False
    assert outcomes["route_success_rate"]["passed"] is False


def test_run_manifest_digest_changes_with_execution_inputs_and_leaks_no_content(tmp_path: Path):
    first = run_benchmark(BenchmarkRunConfig(
        mode="mock", output_dir=tmp_path, run_id="digest-a", seed=1,
        variant_set=FLAGSHIP_PROMOTION_VARIANT_SET, budget_usd=0,
    ))
    second = run_benchmark(BenchmarkRunConfig(
        mode="mock", output_dir=tmp_path, run_id="digest-b", seed=2,
        variant_set=FLAGSHIP_PROMOTION_VARIANT_SET, budget_usd=0,
    ))
    first_config = json.loads((first.run_dir / "config.json").read_text())
    second_config = json.loads((second.run_dir / "config.json").read_text())
    persisted = "\n".join(path.read_text() for path in first.run_dir.iterdir())
    assert first_config["run_manifest_digest"] != second_config["run_manifest_digest"]
    assert "Return only the integer result" not in persisted
    assert "STATUS_OK" not in persisted


@pytest.mark.asyncio
async def test_live_council_plan_uses_the_reserved_token_limit_and_temperature(monkeypatch):
    import backend.council as council_runtime

    registry = load_registry()
    request = CouncilPromotionRequest(
        case_id="full-council-new",
        prompt_id="p1",
        prompt="verify captured execution limits",
        models=tuple({
            "model_id": model_id,
            "route_id": registry.model(model_id).preferred_route.route_id,
            "roles": list(registry.model(model_id).roles),
        } for model_id in registry.production_roster),
        max_tokens=777,
        temperature=0.11,
    )
    observed_settings = []

    class FakeDispatcher:
        async def execute(self, operation):
            observed_settings.append(
                (operation.settings.max_tokens, operation.settings.temperature)
            )
            return {
                "content": "runtime-only",
                "provider": operation.route.provider,
                "route_id": operation.route.route_id,
                "selected_route_id": operation.route.route_id,
                "fallback_used": False,
                "usage": {
                    "prompt_tokens": 2,
                    "completion_tokens": 3,
                    "total_tokens": 5,
                },
            }

    async def fake_run_full_council(
        prompt, council_models, execution_plan, operation_executor=None
    ):
        del prompt, council_models
        for operation in execution_plan.stage1:
            await operation_executor("stage1", operation)
        for operation in execution_plan.evaluators:
            await operation_executor("stage2", operation)
        await operation_executor("stage3", execution_plan.chairman)
        return [], [], {}, {
            "aggregate_rankings": [],
            "execution_plan": council_runtime.execution_plan_metadata(execution_plan),
        }

    monkeypatch.setattr(council_runtime, "_dispatcher", FakeDispatcher)
    monkeypatch.setattr(council_runtime, "run_full_council", fake_run_full_council)

    await CouncilPromotionExecutor()(request)
    assert observed_settings
    assert set(observed_settings) == {(request.max_tokens, request.temperature)}
    reservation = _project_council_cost(
        BenchmarkRunConfig(mode="live", max_tokens=99_999), request
    )
    expected = _project_council_cost(
        BenchmarkRunConfig(mode="live", max_tokens=request.max_tokens), request
    )
    assert reservation == expected
    assert _project_council_cost(
        BenchmarkRunConfig(
            mode="live", max_tokens=request.max_tokens,
            council_projected_cost_usd=0.000001,
        ),
        request,
    ) == expected


def test_token_limit_changes_manifest_and_budget_reservation(tmp_path: Path):
    default = run_benchmark(BenchmarkRunConfig(
        mode="live", output_dir=tmp_path, run_id="default-limit",
        variant_set=FLAGSHIP_PROMOTION_VARIANT_SET, budget_usd=0,
    ))
    high = run_benchmark(BenchmarkRunConfig(
        mode="live", output_dir=tmp_path, run_id="high-limit",
        variant_set=FLAGSHIP_PROMOTION_VARIANT_SET, budget_usd=0,
        max_tokens=32_768,
    ))
    default_manifest = json.loads((default.run_dir / "config.json").read_text())
    high_manifest = json.loads((high.run_dir / "config.json").read_text())
    assert default_manifest["settings"]["max_tokens"] == 2048
    assert high_manifest["settings"]["max_tokens"] == 32_768
    assert default_manifest["run_manifest_digest"] != high_manifest["run_manifest_digest"]

    case = PROMOTION_COUNCIL_VARIANTS[0]
    prompt = promotion_prompt_suite()["prompts"][0]
    from backend.benchmarking.runner import _council_promotion_request

    default_config = BenchmarkRunConfig(mode="live")
    high_config = BenchmarkRunConfig(mode="live", max_tokens=32_768)
    default_cost = _project_council_cost(
        default_config, _council_promotion_request(case, prompt, default_config)
    )
    high_cost = _project_council_cost(
        high_config, _council_promotion_request(case, prompt, high_config)
    )
    assert high_cost > default_cost
    budget = BudgetGuard((default_cost + high_cost) / 2)
    assert budget.can_start(default_cost) is True
    assert budget.can_start(high_cost) is False


@pytest.mark.parametrize(
    "usage",
    [
        {"prompt_tokens": True, "completion_tokens": 1, "total_tokens": 2},
        {"prompt_tokens": -1, "completion_tokens": 1, "total_tokens": 0},
        {"prompt_tokens": float("nan"), "completion_tokens": 1, "total_tokens": 1},
        {"prompt_tokens": 1, "completion_tokens": float("inf"), "total_tokens": 1},
        {"prompt_tokens": "1", "completion_tokens": 1, "total_tokens": 2},
        {"completion_tokens": 1, "total_tokens": 1},
        {"prompt_tokens": 1, "total_tokens": 1},
        {"prompt_tokens": 1, "completion_tokens": 1},
        {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 3},
        {
            "prompt_tokens": 1,
            "completion_tokens": 1,
            "total_tokens": 4,
            "completion_tokens_details": {"reasoning_tokens": 1},
        },
    ],
)
def test_strict_usage_validation_rejects_every_invalid_form(usage):
    with pytest.raises(ValueError, match="provider usage"):
        validate_usage(usage)


@pytest.mark.parametrize(
    "completion_details",
    [
        True,
        [],
        {"reasoning_tokens": True},
        {"reasoning_tokens": -1},
        {"reasoning_tokens": float("nan")},
        {"reasoning_tokens": float("inf")},
        {"reasoning_tokens": "1"},
        {"reasoning_tokens": None},
    ],
)
def test_usage_validation_rejects_malformed_completion_details(completion_details):
    with pytest.raises(ValueError, match="provider usage"):
        validate_usage(
            {
                "prompt_tokens": 1,
                "completion_tokens": 1,
                "total_tokens": 2,
                "completion_tokens_details": completion_details,
            }
        )


@pytest.mark.asyncio
async def test_probe_invalid_usage_rejects_before_budget_recording(monkeypatch):
    target = PROBE_TARGETS["promotion:openai/gpt-5.6-sol"]

    async def fake_query(request):
        return {
            "content": "OK",
            "route_id": target.route_id,
            "usage": {"prompt_tokens": -1, "completion_tokens": 1, "total_tokens": 0},
        }

    monkeypatch.setattr("backend.model_dispatcher.query_model", fake_query)
    budget = BudgetGuard(1.0)
    with pytest.raises(ValueError, match="provider usage"):
        await run_support_probes(keys=[target.key], budget=budget)
    assert budget.observed_spend_usd == 0


@pytest.mark.asyncio
async def test_individual_invalid_usage_rejects_instead_of_falling_back(monkeypatch):
    async def fake_response(config, variant, prompt):
        return {
            "content": "ok",
            "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 99},
        }

    monkeypatch.setattr("backend.benchmarking.runner._live_provider_response", fake_response)
    variant = resolve_default_variants().variants[0]
    with pytest.raises(ValueError, match="inconsistent"):
        await _run_single(
            BenchmarkRunConfig(mode="live"), variant,
            {"id": "p1", "prompt": "test"}, 0,
        )


def test_council_invalid_usage_rejects_instead_of_returning_missing():
    observations = [{
        "usage": {"prompt_tokens": 1, "completion_tokens": False, "total_tokens": 1}
    }]
    with pytest.raises(ValueError, match="provider usage"):
        _observed_council_cost(observations)


def test_missing_usage_fallback_is_explicit_and_never_coerces_invalid_costs():
    assert _observed_council_cost([{"usage": None}]) is None
    with pytest.raises(ValueError, match="provider usage is missing"):
        validate_usage({})
    budget = BudgetGuard(1.0)
    assert budget.record_observed(None, reserved_cost_usd=0.25) == 0.25
    assert budget.observed_spend_usd == 0.25
    for invalid in (True, -1.0, float("nan"), float("inf")):
        with pytest.raises(ValueError, match="finite non-negative"):
            budget.record_observed(invalid, reserved_cost_usd=0.25)
    assert budget.observed_spend_usd == 0.25
