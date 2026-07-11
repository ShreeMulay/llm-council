"""Acceptance contracts for the versioned, resumable benchmark design.

These tests intentionally describe backend APIs that do not exist yet.  Keep
them red until the modernization implementation satisfies the OpenSpec.
"""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter, defaultdict
from copy import deepcopy
from importlib import import_module
from pathlib import Path

ROOT = Path(__file__).parents[1]
SUITE_PATH = ROOT / "benchmarks/prompts/internal_suite_v2.json"
STRATA = {
    "coding",
    "debugging",
    "architecture",
    "operations",
    "structured_output",
    "factual_current_evidence",
    "long_context",
    "multilingual",
    "tool_choice",
    "concise_synthesis",
}


def _suite() -> dict:
    return json.loads(SUITE_PATH.read_text(encoding="utf-8"))


def _api():
    return import_module("backend.benchmarking.modernization")


def _sha256(value: object) -> str:
    encoded = json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def test_v2_manifest_is_versioned_public_and_checksum_ready():
    suite = _suite()

    assert suite["schema_version"] == "1.0.0"
    assert suite["suite_id"] == "internal_suite"
    assert suite["version"] == "2.0.0"
    assert suite["content_policy"] == {
        "classification": "public_non_phi",
        "contains_phi": False,
        "contains_secrets": False,
        "attested_by": "llm-council-benchmark-maintainers",
    }
    assert suite["checksum"]["algorithm"] == "sha256"
    assert suite["checksum"]["canonicalization"] == "json-sort-keys-compact"
    assert len(suite["checksum"]["value"]) == 64
    assert suite["checksum"]["value"] == _sha256(suite["prompts"])
    assert len({item["id"] for item in suite["prompts"]}) == len(suite["prompts"])
    for item in suite["prompts"]:
        assert item["checksum"] == _sha256(
            {key: value for key, value in item.items() if key != "checksum"}
        )


def test_v2_suite_meets_count_and_declared_strata_minimums():
    suite = _suite()
    counts = Counter(item["stratum"] for item in suite["prompts"])

    assert 60 <= len(suite["prompts"]) <= 100
    assert set(counts) == STRATA
    assert suite["strata"] == {stratum: {"minimum": 6} for stratum in sorted(STRATA)}
    assert all(counts[stratum] >= suite["strata"][stratum]["minimum"] for stratum in STRATA)


def test_objective_items_declare_deterministic_versioned_validators():
    objective = [item for item in _suite()["prompts"] if item["scoring"]["type"] == "objective"]

    assert objective
    for item in objective:
        validator = item["scoring"]["validator"]
        assert validator["name"]
        assert validator["version"]
        assert validator["inputs"]
        assert validator["deterministic"] is True
        assert "judge_families" not in item["scoring"]


def test_subjective_items_require_two_independent_judge_families():
    subjective = [item for item in _suite()["prompts"] if item["scoring"]["type"] == "subjective"]

    assert subjective
    for item in subjective:
        families = item["scoring"]["judge_families"]
        assert len(families) >= 2
        assert len(set(families)) == len(families)
        assert all(family != "candidate" for family in families)
        assert item["scoring"]["rubric_version"]
        assert item["scoring"]["blinded"] is True


def test_manifest_validator_is_deterministic_and_fails_before_provider_calls():
    api = _api()
    suite = _suite()
    provider_calls: list[object] = []

    first = api.validate_suite_manifest(suite, provider_call=lambda value: provider_calls.append(value))
    second = api.validate_suite_manifest(suite, provider_call=lambda value: provider_calls.append(value))
    assert first == second
    assert first.is_valid

    invalid = {**suite, "prompts": suite["prompts"][:59]}
    rejected = api.validate_suite_manifest(
        invalid, provider_call=lambda value: provider_calls.append(value)
    )
    assert not rejected.is_valid
    assert "prompt_count" in {error.code for error in rejected.errors}
    assert provider_calls == []


def test_round_robin_schedule_balances_candidate_judge_and_order_exposure():
    api = _api()
    candidates = ["a", "b", "c", "d"]
    judges = {"family-one": ["a", "j1"], "family-two": ["j2", "j3"]}
    schedule = api.build_balanced_schedule(
        prompt_ids=["p1", "p2", "p3", "p4"],
        candidate_ids=candidates,
        judge_families=judges,
        seed=23,
    )

    assert schedule == api.build_balanced_schedule(
        prompt_ids=["p1", "p2", "p3", "p4"],
        candidate_ids=candidates,
        judge_families=judges,
        seed=23,
    )
    assert all(cell.candidate_id != cell.judge_id for cell in schedule)
    by_family = Counter((cell.candidate_id, cell.judge_family) for cell in schedule)
    assert max(by_family.values()) - min(by_family.values()) <= 1
    positions = defaultdict(Counter)
    for cell in schedule:
        positions[cell.candidate_id][cell.presentation_index] += 1
    assert all(max(counts.values()) - min(counts.values()) <= 1 for counts in positions.values())


def test_resume_uses_stable_composite_keys_without_double_counting():
    api = _api()
    dimensions = {
        "run_id": "run-7",
        "suite_version": "2.0.0",
        "prompt_id": "coding-001",
        "candidate_id": "model-a",
        "judge_family": "family-one",
        "judge_id": "judge-a",
        "trial_index": 0,
        "scoring_version": "1.0.0",
        "plan_digest": "plan-sha256",
        "route_digest": "route-sha256",
    }
    key = api.composite_attempt_key(**dimensions)

    assert key == api.composite_attempt_key(**dict(reversed(dimensions.items())))
    assert key != api.composite_attempt_key(**{**dimensions, "trial_index": 1})
    assert api.select_resume_work([dimensions, dimensions], completed_keys={key}) == []


def _attempt(api, **overrides):
    identity = {
        "run_id": "run-7",
        "suite_version": "2.0.0",
        "prompt_id": "coding-001",
        "candidate_id": "model-a",
        "judge_family": "family-one",
        "judge_id": "judge-a",
        "trial_index": 0,
    }
    values = {
        "identity": identity,
        "seed": 23,
        "completed": True,
        "costs": {"input_usd": 0.01, "output_usd": 0.02},
        "latency_ms": 1250,
        "failures": [],
        "scoring_version": "1.0.0",
        "plan_digest": "plan-sha256",
        "route_digest": "route-sha256",
    }
    values.update(overrides)
    return api.BenchmarkAttempt(**values)


def test_attempt_ledger_replays_every_persisted_field_after_restart(tmp_path):
    api = _api()
    path = tmp_path / "attempts.jsonl"
    attempt = _attempt(api)

    api.AttemptLedger(path).append(attempt)
    replayed = api.AttemptLedger(path).replay()

    assert replayed == [attempt]
    stored = json.loads(path.read_text(encoding="utf-8"))
    assert stored["attempt_id"] == attempt.attempt_id
    assert stored["seed"] == 23
    assert stored["completed"] is True
    assert stored["costs"] == {"input_usd": 0.01, "output_usd": 0.02}
    assert stored["latency_ms"] == 1250
    assert stored["failures"] == []
    assert stored["scoring_version"] == "1.0.0"
    assert stored["plan_digest"] == "plan-sha256"
    assert stored["route_digest"] == "route-sha256"
    assert len(stored["checksum"]) == 64


def test_attempt_ledger_rejects_duplicate_composite_id_even_after_restart(tmp_path):
    api = _api()
    path = tmp_path / "attempts.jsonl"
    api.AttemptLedger(path).append(_attempt(api))

    try:
        api.AttemptLedger(path).append(_attempt(api, latency_ms=999))
    except ValueError as error:
        assert "duplicate" in str(error)
    else:
        raise AssertionError("duplicate attempt IDs must be rejected")


def test_attempt_ledger_detects_checksum_corruption(tmp_path):
    api = _api()
    path = tmp_path / "attempts.jsonl"
    api.AttemptLedger(path).append(_attempt(api))
    raw = path.read_text(encoding="utf-8").replace('"latency_ms":1250', '"latency_ms":1251')
    path.write_text(raw, encoding="utf-8")

    try:
        api.AttemptLedger(path).replay()
    except api.LedgerCorruptionError as error:
        assert "checksum" in str(error)
    else:
        raise AssertionError("corrupt ledger records must be rejected")


def test_attempt_ledger_selects_missing_or_incomplete_work_after_restart(tmp_path):
    api = _api()
    path = tmp_path / "attempts.jsonl"
    complete = _attempt(api)
    incomplete_identity = {**complete.identity, "prompt_id": "coding-002"}
    incomplete = _attempt(api, identity=incomplete_identity, completed=False, failures=["timeout"])
    ledger = api.AttemptLedger(path)
    ledger.append(complete)
    ledger.append(incomplete)
    planned = [complete.identity, incomplete.identity, {**complete.identity, "prompt_id": "coding-003"}]

    missing = api.AttemptLedger(path).select_resume_work(planned)

    assert missing == planned[1:]
    assert os.path.getsize(path) > 0


def test_incomplete_cell_report_names_every_missing_assignment():
    api = _api()
    expected = [
        {"prompt_id": "p1", "candidate_id": "a", "judge_family": "f1"},
        {"prompt_id": "p1", "candidate_id": "b", "judge_family": "f1"},
    ]
    report = api.report_incomplete_cells(expected, completed=[expected[0]])

    assert report.complete is False
    assert report.expected_count == 2
    assert report.completed_count == 1
    assert report.missing_cells == [expected[1]]


def test_incomplete_cell_report_rejects_duplicate_expected_attempts():
    api = _api()
    cell = {"prompt_id": "p1", "candidate_id": "a", "trial_index": 0}

    try:
        api.report_incomplete_cells([cell, cell], completed=[])
    except ValueError as error:
        assert "duplicate" in str(error)
    else:
        raise AssertionError("duplicate expected cells must be rejected")


def test_seat_ablation_separates_configurations_and_matches_trials():
    api = _api()
    rows = [
        {"configuration": "full", "stratum": "coding", "seat": None, "trial_id": "a", "quality": 0.8, "judge_agreement": 0.9},
        {"configuration": "full", "stratum": "coding", "seat": None, "trial_id": "b", "quality": 0.6, "judge_agreement": 0.7},
        {"configuration": "removed", "stratum": "coding", "seat": "seat-1", "trial_id": "a", "quality": 0.5, "judge_agreement": 0.6},
        {"configuration": "removed", "stratum": "coding", "seat": "seat-1", "trial_id": "b", "quality": 0.5, "judge_agreement": 0.8},
        {"configuration": "replacement", "stratum": "coding", "seat": "seat-1", "trial_id": "a", "quality": 0.9, "judge_agreement": 0.85},
    ]
    report = api.analyze_seat_ablation(rows, frozen_seats=["seat-1"])

    assert report.baseline == "full"
    assert set(report.effects["seat-1"]) == {"removed", "replacement"}
    removed = report.effects["seat-1"]["removed"]["coding"]
    replacement = report.effects["seat-1"]["replacement"]["coding"]
    assert set(removed) >= {
        "quality",
        "diversity",
        "latency",
        "cost",
        "failure_rate",
        "uncertainty",
        "judge_agreement",
        "marginal_effect",
        "limitations",
        "effect_direction",
        "matched_trials",
    }
    assert removed["marginal_effect"] == -0.2
    assert removed["effect_direction"] == "decrease"
    assert removed["uncertainty"]["trial_count"] == 2
    assert removed["judge_agreement"] == 0.7
    assert replacement["matched_trials"] == 1
    assert "fewer than two matched trials" in replacement["limitations"]
    assert report.production_mutations == []


def test_manifest_validator_rejects_malformed_structure_and_sensitive_markers():
    api = _api()
    suite = _suite()
    invalid = deepcopy(suite)
    invalid["schema_version"] = "v1"
    invalid["suite_id"] = " "
    invalid["content_policy"]["attested_by"] = ""
    invalid["prompts"][0]["id"] = ""
    invalid["prompts"][0]["prompt"] = "API_KEY=sk-secret and patient MRN: 123456"
    invalid["prompts"][0]["scoring"]["validator"]["version"] = "latest"

    codes = {error.code for error in api.validate_suite_manifest(invalid).errors}
    assert {"semantic_version", "suite_id", "attested_by", "prompt_id", "sensitive_content", "validator"} <= codes
