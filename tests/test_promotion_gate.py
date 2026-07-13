"""Prospective immutable benchmark and paired canary gate contract."""

from __future__ import annotations

import hashlib
import json
import shutil

import pytest

from scripts.verify_council_smoke import (
    PAIRED_TRIAL_ORDER,
    SmokeVerificationError,
    run_paired_canary,
)
from scripts.verify_council_smoke import main as smoke_main
from scripts.verify_promotion_benchmark import (
    EXPECTED_CONFIG_THRESHOLDS,
    EXPECTED_STRATA,
    EXPECTED_THRESHOLDS,
    PINNED_HASHES,
    RUN_DIR,
    PromotionBenchmarkError,
    verify_promotion_benchmark,
)
from tests.test_deployment_verification import _make_objective_output, smoke_payload


def test_committed_promotion_benchmark_is_exact_and_eligible():
    verify_promotion_benchmark()


@pytest.mark.parametrize(
    ("file_name", "mutation"),
    [
        ("config.json", lambda value: value.update(mode="replay")),
        ("config.json", lambda value: value.update(registry_digest="stale")),
        ("seat-ablation-report.json", lambda value: value.update(promotion_eligible=False)),
        (
            "seat-ablation-report.json",
            lambda value: value["threshold_outcomes"]["cost"].update(passed=False),
        ),
        (
            "seat-ablation-report.json",
            lambda value: value["threshold_outcomes"]["route_success_rate"].update(value=0.98),
        ),
    ],
)
def test_promotion_benchmark_fails_closed_on_semantic_mismatch(
    tmp_path, monkeypatch, file_name, mutation
):
    run = tmp_path / RUN_DIR.name
    shutil.copytree(RUN_DIR, run)
    path = run / file_name
    value = json.loads(path.read_text(encoding="utf-8"))
    mutation(value)
    path.write_text(json.dumps(value), encoding="utf-8")
    hashes = dict(PINNED_HASHES)
    hashes[file_name] = hashlib.sha256(path.read_bytes()).hexdigest()
    monkeypatch.setattr("scripts.verify_promotion_benchmark.PINNED_HASHES", hashes)

    with pytest.raises(PromotionBenchmarkError):
        verify_promotion_benchmark(run)


def test_promotion_benchmark_fails_closed_on_missing_or_hash_mismatch(tmp_path):
    with pytest.raises(PromotionBenchmarkError):
        verify_promotion_benchmark(tmp_path)


def _mutated_run(tmp_path, monkeypatch, file_name, mutation):
    run = tmp_path / RUN_DIR.name
    shutil.copytree(RUN_DIR, run)
    path = run / file_name
    value = json.loads(path.read_text(encoding="utf-8"))
    mutation(value)
    path.write_text(json.dumps(value, allow_nan=True), encoding="utf-8")
    hashes = dict(PINNED_HASHES)
    hashes[file_name] = hashlib.sha256(path.read_bytes()).hexdigest()
    monkeypatch.setattr("scripts.verify_promotion_benchmark.PINNED_HASHES", hashes)
    return run


@pytest.mark.parametrize("name", EXPECTED_THRESHOLDS)
def test_every_report_threshold_definition_is_pinned(tmp_path, monkeypatch, name):
    run = _mutated_run(
        tmp_path,
        monkeypatch,
        "seat-ablation-report.json",
        lambda value: value["threshold_outcomes"][name].update(threshold=999.0),
    )
    with pytest.raises(PromotionBenchmarkError):
        verify_promotion_benchmark(run)


@pytest.mark.parametrize("name,definition", EXPECTED_CONFIG_THRESHOLDS.items())
def test_every_config_threshold_definition_is_pinned(
    tmp_path, monkeypatch, name, definition
):
    field = next(iter(definition))
    run = _mutated_run(
        tmp_path,
        monkeypatch,
        "config.json",
        lambda value: value["promotion_thresholds"][name].update({field: "changed"}),
    )
    with pytest.raises(PromotionBenchmarkError):
        verify_promotion_benchmark(run)


@pytest.mark.parametrize(
    ("name", "invalid_value"),
    [
        (name, limit + 0.01 if direction == "maximum" else limit - 0.01)
        for name, (limit, direction) in EXPECTED_THRESHOLDS.items()
        if direction != "minimum_by_stratum"
    ]
    + [("quality_by_stratum", dict.fromkeys(EXPECTED_STRATA, -5.01))],
)
def test_every_report_threshold_direction_is_enforced(
    tmp_path, monkeypatch, name, invalid_value
):
    run = _mutated_run(
        tmp_path,
        monkeypatch,
        "seat-ablation-report.json",
        lambda value: value["threshold_outcomes"][name].update(value=invalid_value),
    )
    with pytest.raises(PromotionBenchmarkError):
        verify_promotion_benchmark(run)


@pytest.mark.parametrize("mutation", [lambda outcomes: outcomes.pop("cost"), lambda outcomes: outcomes.update(extra={"passed": True})])
def test_report_requires_exact_threshold_outcome_keys(tmp_path, monkeypatch, mutation):
    run = _mutated_run(
        tmp_path,
        monkeypatch,
        "seat-ablation-report.json",
        lambda value: mutation(value["threshold_outcomes"]),
    )
    with pytest.raises(PromotionBenchmarkError):
        verify_promotion_benchmark(run)


@pytest.mark.parametrize("invalid_value", [True, float("nan")])
@pytest.mark.parametrize("field", ["threshold", "value"])
def test_report_rejects_bool_and_non_finite_numbers(
    tmp_path, monkeypatch, field, invalid_value
):
    run = _mutated_run(
        tmp_path,
        monkeypatch,
        "seat-ablation-report.json",
        lambda value: value["threshold_outcomes"]["route_success_rate"].update(
            {field: invalid_value}
        ),
    )
    with pytest.raises(PromotionBenchmarkError):
        verify_promotion_benchmark(run)


@pytest.mark.parametrize("invalid_value", [True, float("nan")])
def test_config_rejects_bool_and_non_finite_thresholds(
    tmp_path, monkeypatch, invalid_value
):
    run = _mutated_run(
        tmp_path,
        monkeypatch,
        "config.json",
        lambda value: value["promotion_thresholds"]["route_success_rate"].update(
            minimum=invalid_value
        ),
    )
    with pytest.raises(PromotionBenchmarkError):
        verify_promotion_benchmark(run)


@pytest.mark.parametrize(
    "mutation",
    [
        lambda outcome: outcome.update(exception_accepted=True),
        lambda outcome: outcome.pop("exception_accepted"),
    ],
)
def test_cost_exception_must_be_explicitly_unaccepted(tmp_path, monkeypatch, mutation):
    run = _mutated_run(
        tmp_path,
        monkeypatch,
        "seat-ablation-report.json",
        lambda value: mutation(value["threshold_outcomes"]["cost"]),
    )
    with pytest.raises(PromotionBenchmarkError):
        verify_promotion_benchmark(run)


@pytest.mark.parametrize(
    "mutation",
    [
        lambda strata: strata.pop("reasoning-evaluator"),
        lambda strata: strata.update(extra=0.0),
        lambda strata: strata.update({"reasoning-evaluator": True}),
        lambda strata: strata.update({"reasoning-evaluator": float("nan")}),
    ],
)
def test_quality_strata_require_exact_keys_and_finite_numeric_values(
    tmp_path, monkeypatch, mutation
):
    run = _mutated_run(
        tmp_path,
        monkeypatch,
        "seat-ablation-report.json",
        lambda value: mutation(value["threshold_outcomes"]["quality_by_stratum"]["value"]),
    )
    with pytest.raises(PromotionBenchmarkError):
        verify_promotion_benchmark(run)


def _paired_runner(*, candidate_elapsed=11.0, candidate_reported=11.0, candidate_usage=1):
    calls = {"sync": [], "stream": []}

    def poster(surface):
        def call(url, _key, _timeout):
            calls[surface].append(url)
            payload = _make_objective_output(smoke_payload())
            candidate = url == "https://candidate.example"
            if candidate:
                payload["timing"]["elapsed_seconds"] = candidate_reported
                if candidate_usage != 1:
                    for item in [*payload["stage1"], *payload["stage2"], payload["stage3"]]:
                        item["usage"] = {
                            key: value * candidate_usage for key, value in item["usage"].items()
                        }
            return payload, candidate_elapsed if candidate else 10.0

        return call

    evidence = run_paired_canary(
        "https://baseline.example",
        "https://candidate.example",
        "project",
        "secret",
        timeout=100,
        max_latency=480,
        max_tokens=60_000,
        max_cost=1.50,
        secret_loader=lambda *_args: "key",
        poster=poster("sync"),
        stream_poster=poster("stream"),
        promotion_verifier=lambda: None,
    )
    return evidence, calls


def test_paired_canary_has_one_verified_warmup_and_exact_five_trial_order():
    evidence, calls = _paired_runner()
    expected = [
        "https://baseline.example",
        "https://candidate.example",
        "https://baseline.example",
        "https://candidate.example",
        "https://candidate.example",
        "https://baseline.example",
        "https://baseline.example",
        "https://candidate.example",
        "https://candidate.example",
        "https://baseline.example",
        "https://baseline.example",
        "https://candidate.example",
    ]
    assert calls == {"sync": expected, "stream": expected}
    assert evidence["steady_canary"]["sync"]["trial_order"] == list(PAIRED_TRIAL_ORDER)
    assert evidence["steady_canary"]["sync"]["trial_count"] == 5
    assert evidence["cold_gate"]["status"] == "passed"


def test_paired_ratios_are_medians_and_diagnostic_overages_only_warn():
    evidence, _ = _paired_runner(
        candidate_elapsed=13.0, candidate_reported=13.0, candidate_usage=2
    )
    for surface in ("sync", "stream"):
        diagnostics = evidence["steady_canary"][surface]["diagnostics"]
        assert diagnostics["paired_median_elapsed_latency_ratio"] == pytest.approx(1.3)
        assert diagnostics["paired_median_reported_latency_ratio"] == pytest.approx(1.3)
        assert diagnostics["paired_median_list_cost_ratio"] == pytest.approx(2.0)
        assert diagnostics["elapsed_latency_status"] == "warning"
        assert diagnostics["reported_latency_status"] == "warning"
        assert diagnostics["list_cost_status"] == "warning"
    assert evidence["promotion_gate"]["status"] == "passed"
    assert evidence["hard_canary_gate"]["status"] == "passed"


def test_paired_warmup_or_candidate_hard_failure_stops_without_retry():
    calls = []

    def failing_poster(url, _key, _timeout):
        calls.append(url)
        payload = _make_objective_output(smoke_payload())
        if url == "https://candidate.example":
            payload["stage1"][0]["fallback_used"] = True
        return payload, 10

    with pytest.raises(SmokeVerificationError, match="fallback"):
        run_paired_canary(
            "https://baseline.example",
            "https://candidate.example",
            "project",
            "secret",
            timeout=100,
            secret_loader=lambda *_args: "key",
            poster=failing_poster,
            stream_poster=failing_poster,
            promotion_verifier=lambda: None,
        )
    assert calls == ["https://baseline.example", "https://candidate.example"]


@pytest.mark.parametrize(
    ("failure", "classification", "mutation"),
    [
        (
            "fixed instruction/objective mismatch",
            "instruction",
            lambda payload: payload["stage3"].update(response="WRONG_FIXED_OUTPUT"),
        ),
        (
            "fixed factual error",
            "factual",
            lambda payload: payload["stage3"].update(response="2 + 2 = 5"),
        ),
        (
            "fixed evaluator-format failure",
            "evaluator_format",
            lambda payload: payload["stage2"][0].update(parsed_ranking=[]),
        ),
    ],
)
def test_candidate_fixed_quality_failures_hard_fail_despite_passing_benchmark(
    failure, classification, mutation
):
    calls = []
    benchmark_verified = []

    def poster(url, _key, _timeout):
        calls.append(url)
        payload = _make_objective_output(smoke_payload())
        if url == "https://candidate.example":
            mutation(payload)
        return payload, 10

    with pytest.raises(SmokeVerificationError) as caught:
        run_paired_canary(
            "https://baseline.example",
            "https://candidate.example",
            "project",
            "secret",
            timeout=100,
            secret_loader=lambda *_args: "key",
            poster=poster,
            stream_poster=poster,
            promotion_verifier=lambda: benchmark_verified.append(True),
        )

    assert caught.value.classification == classification

    assert failure
    assert benchmark_verified == [True]
    assert calls == ["https://baseline.example", "https://candidate.example"]


def test_paired_evidence_is_content_free():
    evidence, _ = _paired_runner()
    serialized = json.dumps(evidence)
    for forbidden in ("synthetic result", '"response"', '"usage"', "secret"):
        assert forbidden not in serialized


@pytest.mark.parametrize(
    "flags",
    [
        ["--paired"],
        ["--paired", "--baseline-url", "https://baseline", "--baseline"],
        ["--paired", "--baseline-url", "https://baseline", "--proof-out", "proof.json"],
        ["--baseline-url", "https://baseline"],
        ["--paired-legacy-baseline"],
        ["--evidence-out", "evidence.json"],
    ],
)
def test_paired_cli_flag_conflicts_fail_closed_before_requests(flags, monkeypatch):
    def unexpected(*_args, **_kwargs):
        raise AssertionError("conflicting paired flags must fail before requests")

    monkeypatch.setattr("scripts.verify_council_smoke.run_smoke", unexpected)
    monkeypatch.setattr("scripts.verify_council_smoke.run_paired_canary", unexpected)
    assert smoke_main(["https://candidate", "--project", "project", *flags]) == 1
