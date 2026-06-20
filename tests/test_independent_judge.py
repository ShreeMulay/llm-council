"""Tests for the independent benchmark judge pass."""

import json
from pathlib import Path

import pytest

from backend.benchmarking import independent_judge as ij


def test_anonymize_candidates_is_deterministic_and_hides_variant_labels():
    results = [
        {"prompt_id": "p1", "variant_id": "model-a", "output": "A output"},
        {"prompt_id": "p1", "variant_id": "model-b", "output": "B output"},
        {"prompt_id": "p1", "variant_id": "model-c", "output": "C output"},
    ]

    first_candidates, first_map = ij.anonymize_candidates("p1", results, seed=11)
    second_candidates, second_map = ij.anonymize_candidates("p1", results, seed=11)
    messages = ij.build_independent_judge_messages(
        {"id": "p1", "prompt": "Original prompt"},
        first_candidates,
    )

    assert first_candidates == second_candidates
    assert first_map == second_map
    assert set(first_map) == {"Candidate A", "Candidate B", "Candidate C"}
    content = messages[0]["content"]
    assert "model-a" not in content
    assert "model-b" not in content
    assert "model-c" not in content
    assert "Candidate A" in content
    assert "No markdown fences" in content
    assert "Notes must be <= 12 words" in content
    assert "numeric values only" in content


def test_extract_json_object_from_plain_and_fenced_content():
    plain = '{"scores":[{"candidate":"Candidate A","overall":5}]}'
    fenced = "```json\n{\"scores\":[{\"candidate\":\"Candidate A\",\"overall\":4}]}\n```"
    prefixed = "Here is the JSON:\n```\n{\"scores\":[]}\n```"

    assert ij.extract_json_object(plain)["scores"][0]["overall"] == 5
    assert ij.extract_json_object(fenced)["scores"][0]["overall"] == 4
    assert ij.extract_json_object(prefixed)["scores"] == []


def test_score_rows_map_blind_labels_back_to_variants():
    parsed = {
        "scores": [
            {
                "candidate": "Candidate A",
                "correctness": 5,
                "usefulness": 4,
                "reasoning": 5,
                "concision": 3,
                "overall": 4.5,
                "rank": 1,
                "notes": "Best answer.",
            }
        ]
    }

    rows = ij.score_rows_from_judge_json(
        run_id="run-1",
        prompt_id="p1",
        judge_id="judge-1",
        judge_model="google/gemini-3.1-pro-preview",
        label_map={"Candidate A": "variant-a"},
        parsed=parsed,
    )

    assert rows == [
        {
            "run_id": "run-1",
            "prompt_id": "p1",
            "judge_id": "judge-1",
            "judge_model": "google/gemini-3.1-pro-preview",
            "candidate_label": "Candidate A",
            "candidate_variant_id": "variant-a",
            "correctness": 5,
            "usefulness": 4,
            "reasoning": 5,
            "concision": 3,
            "overall": 4.5,
            "rank": 1,
            "notes": "Best answer.",
            "error_status": None,
        }
    ]


def test_summary_aggregates_variant_scores_and_prompt_winners():
    summary = ij.build_independent_judge_summary(
        {
            "source_run_id": "run-1",
            "judge_model": "google/gemini-3.1-pro-preview",
            "judge_id": "judge-1",
            "prompt_count": 2,
        },
        [
            {"prompt_id": "p1", "candidate_variant_id": "variant-a", "overall": 5, "rank": 1, "error_status": None},
            {"prompt_id": "p1", "candidate_variant_id": "variant-b", "overall": 3, "rank": 2, "error_status": None},
            {"prompt_id": "p2", "candidate_variant_id": "variant-a", "overall": 2, "rank": 2, "error_status": None},
            {"prompt_id": "p2", "candidate_variant_id": "variant-b", "overall": 4, "rank": 1, "error_status": None},
            {"prompt_id": "p3", "candidate_variant_id": "", "overall": "", "rank": "", "error_status": "parse_error"},
        ],
    )

    assert "variant-a` | 3.50" in summary
    assert "variant-b` | 3.50" in summary
    assert "| `p1` | `variant-a` | 5.00 |" in summary
    assert "| `p2` | `variant-b` | 4.00 |" in summary
    assert "Parse errors: 1" in summary
    assert "one independent LLM judge pass rather than human truth" in summary


def test_parse_error_returns_parse_error_row():
    rows, parsed, parse_error = ij.parse_judge_response_to_rows(
        run_id="run-1",
        prompt_id="p1",
        judge_id="judge-1",
        judge_model="google/gemini-3.1-pro-preview",
        label_map={"Candidate A": "variant-a"},
        content="not json",
    )

    assert parsed is None
    assert parse_error
    assert rows[0]["error_status"] == "parse_error"
    assert rows[0]["prompt_id"] == "p1"


def test_malformed_numeric_score_returns_parse_error_and_artifacts_do_not_crash(tmp_path: Path):
    rows, parsed, parse_error = ij.parse_judge_response_to_rows(
        run_id="run-1",
        prompt_id="p1",
        judge_id="judge-1",
        judge_model="google/gemini-3.1-pro-preview",
        label_map={"Candidate A": "variant-a"},
        content=json.dumps(
            {
                "scores": [
                    {
                        "candidate": "Candidate A",
                        "correctness": "not numeric",
                        "usefulness": 4,
                        "reasoning": 4,
                        "concision": 4,
                        "overall": 4,
                        "rank": 1,
                        "notes": "Malformed numeric field.",
                    }
                ]
            }
        ),
    )

    assert parsed is None
    assert "correctness must be numeric" in parse_error
    assert rows[0]["error_status"] == "parse_error"
    summary = ij.build_independent_judge_summary(
        {"source_run_id": "run-1", "judge_model": "judge", "judge_id": "judge", "prompt_count": 1},
        rows,
    )
    assert "Parse errors: 1" in summary
    ij.write_independent_judge_artifacts(
        tmp_path,
        {"source_run_id": "run-1", "judge_model": "judge", "judge_id": "judge", "prompt_count": 1},
        rows,
        [],
    )
    assert (tmp_path / "independent-judge-scores.csv").exists()


@pytest.mark.asyncio
async def test_rejects_candidate_judge_model_and_id_before_budget_or_provider(
    tmp_path: Path,
    monkeypatch,
):
    run_dir, prompt_suite = _write_existing_run(tmp_path)

    def fail_budget(*args, **kwargs):
        raise AssertionError("budget should not be checked before independence invariant")

    async def fail_provider(*args, **kwargs):
        raise AssertionError("provider should not be called when judge is a candidate")

    monkeypatch.setattr("backend.benchmarking.independent_judge._enforce_budget", fail_budget)
    monkeypatch.setattr("backend.benchmarking.independent_judge._call_independent_judge", fail_provider)

    with pytest.raises(ValueError, match="candidate model_id"):
        await ij.run_independent_judge(
            ij.IndependentJudgeConfig(
                run_dir=run_dir,
                judge_model="model-config",
                judge_id="independent-id",
                prompt_suite_path=prompt_suite,
            )
        )

    with pytest.raises(ValueError, match="candidate variant_id"):
        await ij.run_independent_judge(
            ij.IndependentJudgeConfig(
                run_dir=run_dir,
                judge_model="independent-model",
                judge_id="variant-a",
                prompt_suite_path=prompt_suite,
            )
        )


@pytest.mark.asyncio
async def test_run_independent_judge_writes_artifacts_and_handles_provider_error(
    tmp_path: Path,
    monkeypatch,
):
    run_dir, prompt_suite = _write_existing_run(tmp_path)
    calls = []

    async def fake_call(config, messages):
        calls.append(messages)
        if len(calls) == 1:
            return {
                "content": json.dumps(
                    {
                        "scores": [
                            {
                                "candidate": "Candidate A",
                                "correctness": 4,
                                "usefulness": 4,
                                "reasoning": 4,
                                "concision": 4,
                                "overall": 4,
                                "rank": 1,
                                "notes": "Good.",
                            },
                            {
                                "candidate": "Candidate B",
                                "correctness": 3,
                                "usefulness": 3,
                                "reasoning": 3,
                                "concision": 3,
                                "overall": 3,
                                "rank": 2,
                                "notes": "Okay.",
                            },
                        ]
                    }
                ),
                "usage": {},
            }
        return None

    monkeypatch.setattr("backend.benchmarking.independent_judge._call_independent_judge", fake_call)

    summary = await ij.run_independent_judge(
        ij.IndependentJudgeConfig(
            run_dir=run_dir,
            judge_model="google/gemini-3.1-pro-preview",
            judge_id="openrouter-gemini-3.1-pro-independent",
            prompt_suite_path=prompt_suite,
            seed=11,
            budget_usd=5,
        )
    )

    assert summary.judge_call_count == 2
    assert summary.provider_error_count == 1
    assert (run_dir / "independent-judge-scores.csv").exists()
    assert (run_dir / "independent-judge-summary.md").exists()
    assert (run_dir / "independent-judge-raw.jsonl").exists()
    assert (run_dir / "independent-judge-config.json").exists()
    scores = (run_dir / "independent-judge-scores.csv").read_text()
    assert "provider_error" in scores
    assert "variant-a" in scores or "variant-b" in scores
    assert "model-a" not in calls[0][0]["content"]


@pytest.mark.asyncio
async def test_run_independent_judge_retries_once_after_parse_error_success(
    tmp_path: Path,
    monkeypatch,
):
    run_dir, prompt_suite = _write_existing_run(tmp_path)
    responses = [
        {"content": "not json", "usage": {}},
        {"content": _valid_judge_json(), "usage": {}},
        {"content": _valid_judge_json(), "usage": {}},
    ]
    calls = []

    async def fake_call(config, messages):
        calls.append(messages)
        return responses.pop(0)

    monkeypatch.setattr("backend.benchmarking.independent_judge._call_independent_judge", fake_call)

    summary = await ij.run_independent_judge(
        ij.IndependentJudgeConfig(
            run_dir=run_dir,
            judge_model="google/gemini-3.1-pro-preview",
            judge_id="openrouter-gemini-3.1-pro-independent",
            prompt_suite_path=prompt_suite,
            seed=11,
            budget_usd=5,
        )
    )

    assert summary.judge_call_count == 3
    assert summary.parse_error_count == 0
    assert len(calls) == 3
    assert "previous answer could not be parsed" in calls[1][0]["content"]
    raw_rows = [
        json.loads(line)
        for line in (run_dir / "independent-judge-raw.jsonl").read_text().splitlines()
    ]
    assert [row["attempt_index"] for row in raw_rows[:2]] == [1, 2]
    assert raw_rows[0]["error_status"]
    assert raw_rows[1]["error_status"] is None
    assert "parse_error" not in (run_dir / "independent-judge-scores.csv").read_text()
    config_json = json.loads((run_dir / "independent-judge-config.json").read_text())
    assert config_json["prompt_count"] == 2
    assert config_json["judge_call_count"] == 3


@pytest.mark.asyncio
async def test_run_independent_judge_does_not_retry_provider_error(tmp_path: Path, monkeypatch):
    run_dir, prompt_suite = _write_existing_run(tmp_path)
    calls = []

    async def fake_call(config, messages):
        calls.append(messages)
        return None

    monkeypatch.setattr("backend.benchmarking.independent_judge._call_independent_judge", fake_call)

    summary = await ij.run_independent_judge(
        ij.IndependentJudgeConfig(
            run_dir=run_dir,
            judge_model="google/gemini-3.1-pro-preview",
            judge_id="openrouter-gemini-3.1-pro-independent",
            prompt_suite_path=prompt_suite,
            seed=11,
            budget_usd=5,
        )
    )

    assert summary.judge_call_count == 2
    assert summary.provider_error_count == 2
    assert len(calls) == 2
    raw_rows = [
        json.loads(line)
        for line in (run_dir / "independent-judge-raw.jsonl").read_text().splitlines()
    ]
    assert [row["attempt_index"] for row in raw_rows] == [1, 1]


def test_artifact_secret_guard_is_used(tmp_path: Path, monkeypatch):
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    written_paths = []

    def fake_write(path, content):
        written_paths.append(path.name)

    monkeypatch.setattr("backend.benchmarking.independent_judge.write_text_guarded", fake_write)

    ij.write_independent_judge_artifacts(
        run_dir,
        {"source_run_id": "run", "judge_model": "judge", "judge_id": "judge", "prompt_count": 0},
        [],
        [],
    )

    assert set(written_paths) == {
        "independent-judge-scores.csv",
        "independent-judge-summary.md",
        "independent-judge-raw.jsonl",
        "independent-judge-config.json",
    }


def _write_existing_run(tmp_path: Path) -> tuple[Path, Path]:
    prompt_suite = tmp_path / "suite.json"
    prompt_suite.write_text(
        json.dumps(
            {
                "suite_id": "test-suite",
                "version": 1,
                "prompts": [
                    {"id": "p1", "kind": "coding", "title": "Prompt 1", "prompt": "Prompt one?"},
                    {"id": "p2", "kind": "coding", "title": "Prompt 2", "prompt": "Prompt two?"},
                ],
            }
        )
    )
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    (run_dir / "config.json").write_text(
        json.dumps(
            {
                "run_id": "run",
                "created_at": "2026-06-20T16:00:00-05:00",
                "prompt_suite": {"path": str(prompt_suite), "suite_id": "test-suite", "version": 1},
                "variants": [{"variant_id": "variant-config", "model_id": "model-config"}],
            }
        )
    )
    rows = [
        {"run_id": "run", "prompt_id": "p1", "variant_id": "variant-a", "model_id": "model-a", "output": "A1"},
        {"run_id": "run", "prompt_id": "p1", "variant_id": "variant-b", "model_id": "model-b", "output": "B1"},
        {"run_id": "run", "prompt_id": "p2", "variant_id": "variant-a", "model_id": "model-a", "output": "A2"},
        {"run_id": "run", "prompt_id": "p2", "variant_id": "variant-b", "model_id": "model-b", "output": "B2"},
    ]
    (run_dir / "raw-results.jsonl").write_text("".join(json.dumps(row) + "\n" for row in rows))
    return run_dir, prompt_suite


def _valid_judge_json() -> str:
    return json.dumps(
        {
            "scores": [
                {
                    "candidate": "Candidate A",
                    "correctness": 4,
                    "usefulness": 4,
                    "reasoning": 4,
                    "concision": 4,
                    "overall": 4,
                    "rank": 1,
                    "notes": "Good answer",
                },
                {
                    "candidate": "Candidate B",
                    "correctness": 3,
                    "usefulness": 3,
                    "reasoning": 3,
                    "concision": 3,
                    "overall": 3,
                    "rank": 2,
                    "notes": "Adequate answer",
                },
            ]
        }
    )
