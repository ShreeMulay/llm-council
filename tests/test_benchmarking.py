"""Contract tests for the internal model benchmark harness."""

import json
from pathlib import Path

import pytest

from backend.benchmarking.artifacts import (
    ArtifactSecretError,
    build_side_by_side_markdown,
    write_text_guarded,
)
from backend.benchmarking.costs import compute_cost
from backend.benchmarking.judge import build_blind_judge_payload
from backend.benchmarking.models import (
    BenchmarkVariant,
    PricingSnapshot,
    resolve_default_variants,
)
from backend.benchmarking.probes import PROBE_TARGETS, ProbeResult, probe_target
from backend.benchmarking.runner import (
    BenchmarkRunConfig,
    _live_provider_response,
    _run_single,
    run_benchmark,
)
from backend.main import app


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
        }
    ]


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

    async def fake_run_support_probes(timeout):
        return [
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
    assert calls[0]["model_id"] == "fireworks/glm-5.2"
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
