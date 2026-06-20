"""Independent blind judge pass over existing benchmark run artifacts."""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import random
import re
from dataclasses import asdict, dataclass
from io import StringIO
from pathlib import Path
from typing import Any

from .artifacts import write_text_guarded
from .prompts import DEFAULT_PROMPT_SUITE_PATH, load_prompt_suite

DEFAULT_JUDGE_MODEL = "google/gemini-3.1-pro-preview"
DEFAULT_JUDGE_ID = "openrouter-gemini-3.1-pro-independent"
ESTIMATED_JUDGE_CALL_USD = 0.05
REQUIRED_SCORE_FIELDS = ("correctness", "usefulness", "reasoning", "concision", "overall", "rank", "notes")


@dataclass(frozen=True)
class IndependentJudgeConfig:
    """Configuration for an independent judge pass over an existing run."""

    run_dir: Path
    judge_model: str = DEFAULT_JUDGE_MODEL
    judge_id: str = DEFAULT_JUDGE_ID
    budget_usd: float = 5.0
    max_tokens: int = 2048
    temperature: float = 0.0
    seed: int = 0
    clock_iso: str = "1970-01-01T00:00:00Z"
    prompt_suite_path: Path | None = None


@dataclass(frozen=True)
class IndependentJudgeSummary:
    """Summary returned after writing independent judge artifacts."""

    run_dir: Path
    judge_call_count: int
    score_row_count: int
    provider_error_count: int
    parse_error_count: int


def load_existing_run(
    run_dir: Path,
    prompt_suite_path: Path | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
    """Load config, raw results, and prompts for an existing benchmark run."""
    config_path = run_dir / "config.json"
    raw_results_path = run_dir / "raw-results.jsonl"
    if not config_path.exists() or not raw_results_path.exists():
        raise FileNotFoundError("run directory must contain config.json and raw-results.jsonl")

    run_config = json.loads(config_path.read_text())
    suite_path = prompt_suite_path or Path(
        run_config.get("prompt_suite", {}).get("path") or DEFAULT_PROMPT_SUITE_PATH
    )
    prompts = load_prompt_suite(suite_path)["prompts"]
    results = [json.loads(line) for line in raw_results_path.read_text().splitlines() if line.strip()]
    return run_config, results, prompts


def group_results_by_prompt(results: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Group candidate outputs by prompt ID, preserving run order."""
    grouped: dict[str, list[dict[str, Any]]] = {}
    for result in results:
        grouped.setdefault(str(result.get("prompt_id")), []).append(result)
    return grouped


def anonymize_candidates(
    prompt_id: str,
    candidate_results: list[dict[str, Any]],
    seed: int,
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Deterministically shuffle candidates and assign anonymous labels."""
    shuffled = list(candidate_results)
    random.Random(f"independent:{seed}:{prompt_id}").shuffle(shuffled)
    anonymized: list[dict[str, Any]] = []
    label_map: dict[str, str] = {}
    for index, result in enumerate(shuffled):
        label = f"Candidate {chr(ord('A') + index)}"
        label_map[label] = str(result.get("variant_id"))
        anonymized.append(
            {
                "label": label,
                "output": result.get("output") or "",
            }
        )
    return anonymized, label_map


def build_independent_judge_messages(
    prompt: dict[str, Any],
    anonymized_candidates: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Build a blind strict-JSON judging prompt with no model labels."""
    candidate_sections = []
    for candidate in anonymized_candidates:
        candidate_sections.append(
            f"## {candidate['label']}\n```text\n{candidate['output']}\n```"
        )

    labels = [candidate["label"] for candidate in anonymized_candidates]
    content = (
        "You are an independent blind benchmark judge. You are NOT one of the candidate models.\n"
        "Score only the anonymous candidates. Do not infer or mention model/provider identity.\n"
        "Return STRICT JSON only. No markdown fences. No prose before or after JSON.\n"
        "All score/rank values must be numeric values only, not strings.\n"
        "Notes must be <= 12 words and must not contain quotation marks, backticks, braces, or newlines.\n"
        "Include each candidate exactly once. Use every candidate label exactly once.\n"
        "Use this exact shape:\n"
        "{\"scores\":[{\"candidate\":\"Candidate A\",\"correctness\":1-5,"
        "\"usefulness\":1-5,\"reasoning\":1-5,\"concision\":1-5,"
        "\"overall\":1-5,\"rank\":1,\"notes\":\"brief rationale\"}]}\n"
        "Higher score is better; rank 1 is best.\n\n"
        f"Original prompt:\n{prompt.get('prompt', '')}\n\n"
        f"Candidate labels to score: {', '.join(labels)}\n\n"
        + "\n\n".join(candidate_sections)
    )
    return [{"role": "user", "content": content}]


def build_repair_judge_messages(
    prompt: dict[str, Any],
    anonymized_candidates: list[dict[str, Any]],
    parse_error: str,
) -> list[dict[str, str]]:
    """Build a stricter one-shot retry prompt after malformed judge JSON."""
    messages = build_independent_judge_messages(prompt, anonymized_candidates)
    messages[0]["content"] = (
        "Your previous answer could not be parsed as strict JSON. Rejudge from scratch.\n"
        f"Parse failure to avoid: {parse_error}\n"
        "CRITICAL OUTPUT RULES: return one valid JSON object only; no code fences; no markdown; "
        "no commentary; numeric score fields only; notes <= 12 words with no quotes/backticks/braces/newlines.\n\n"
        + messages[0]["content"]
    )
    return messages


def extract_json_object(content: str) -> dict[str, Any]:
    """Extract a JSON object from plain or fenced model output."""
    stripped = content.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        stripped = fenced.group(1).strip()
    elif not stripped.startswith("{"):
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("judge response did not contain a JSON object")
        stripped = stripped[start : end + 1]
    parsed = json.loads(stripped)
    if not isinstance(parsed, dict):
        raise ValueError("judge response JSON root must be an object")
    return parsed


def score_rows_from_judge_json(
    *,
    run_id: str,
    prompt_id: str,
    judge_id: str,
    judge_model: str,
    label_map: dict[str, str],
    parsed: dict[str, Any],
) -> list[dict[str, Any]]:
    """Map blind judge JSON scores back to benchmark variant IDs."""
    scores = parsed.get("scores")
    if not isinstance(scores, list):
        raise ValueError("judge JSON missing scores list")

    rows: list[dict[str, Any]] = []
    for item in scores:
        if not isinstance(item, dict):
            raise ValueError("judge score item must be an object")
        candidate_label = str(item.get("candidate", ""))
        if candidate_label not in label_map:
            raise ValueError(f"unknown candidate label: {candidate_label}")
        missing = [field for field in REQUIRED_SCORE_FIELDS if field not in item]
        if missing:
            raise ValueError(f"judge score missing fields: {', '.join(missing)}")
        correctness = _score_value(item["correctness"], "correctness")
        usefulness = _score_value(item["usefulness"], "usefulness")
        reasoning = _score_value(item["reasoning"], "reasoning")
        concision = _score_value(item["concision"], "concision")
        overall = _score_value(item["overall"], "overall")
        rank = _rank_value(item["rank"])
        rows.append(
            {
                "run_id": run_id,
                "prompt_id": prompt_id,
                "judge_id": judge_id,
                "judge_model": judge_model,
                "candidate_label": candidate_label,
                "candidate_variant_id": label_map[candidate_label],
                "correctness": correctness,
                "usefulness": usefulness,
                "reasoning": reasoning,
                "concision": concision,
                "overall": overall,
                "rank": rank,
                "notes": item["notes"],
                "error_status": None,
            }
        )
    return rows


def _score_value(value: Any, field_name: str) -> float:
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be numeric")
    try:
        score = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be numeric") from exc
    if not 1 <= score <= 5:
        raise ValueError(f"{field_name} must be between 1 and 5")
    return score


def _rank_value(value: Any) -> int:
    if isinstance(value, bool):
        raise ValueError("rank must be numeric")
    try:
        rank_float = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("rank must be numeric") from exc
    if not rank_float.is_integer() or rank_float < 1:
        raise ValueError("rank must be an integer >= 1")
    return int(rank_float)


def parse_judge_response_to_rows(
    *,
    run_id: str,
    prompt_id: str,
    judge_id: str,
    judge_model: str,
    label_map: dict[str, str],
    content: str,
) -> tuple[list[dict[str, Any]], dict[str, Any] | None, str | None]:
    """Parse judge output into rows, returning parse error instead of raising."""
    try:
        parsed = extract_json_object(content)
        return (
            score_rows_from_judge_json(
                run_id=run_id,
                prompt_id=prompt_id,
                judge_id=judge_id,
                judge_model=judge_model,
                label_map=label_map,
                parsed=parsed,
            ),
            parsed,
            None,
        )
    except Exception as exc:
        return ([build_error_row(run_id, prompt_id, judge_id, judge_model, "parse_error", str(exc))], None, str(exc))


def build_error_row(
    run_id: str,
    prompt_id: str,
    judge_id: str,
    judge_model: str,
    error_status: str,
    notes: str,
) -> dict[str, Any]:
    """Build a CSV row for provider/parse failures."""
    return {
        "run_id": run_id,
        "prompt_id": prompt_id,
        "judge_id": judge_id,
        "judge_model": judge_model,
        "candidate_label": "",
        "candidate_variant_id": "",
        "correctness": "",
        "usefulness": "",
        "reasoning": "",
        "concision": "",
        "overall": "",
        "rank": "",
        "notes": notes,
        "error_status": error_status,
    }


async def run_independent_judge(config: IndependentJudgeConfig) -> IndependentJudgeSummary:
    """Run one independent judge call per prompt and persist artifacts."""
    run_config, results, prompts = load_existing_run(config.run_dir, config.prompt_suite_path)
    enforce_independent_judge(config, run_config, results)
    grouped = group_results_by_prompt(results)
    prompts_to_judge = [prompt for prompt in prompts if str(prompt.get("id")) in grouped]
    _enforce_budget(config.budget_usd, len(prompts_to_judge))

    score_rows: list[dict[str, Any]] = []
    raw_rows: list[dict[str, Any]] = []
    judge_call_count = 0

    for prompt in prompts_to_judge:
        prompt_id = str(prompt.get("id"))
        anonymized, label_map = anonymize_candidates(prompt_id, grouped[prompt_id], config.seed)
        messages = build_independent_judge_messages(prompt, anonymized)
        judge_call_count += 1

        response = await _call_independent_judge(config, messages)
        if response is None:
            row = build_error_row(
                str(run_config.get("run_id", config.run_dir.name)),
                prompt_id,
                config.judge_id,
                config.judge_model,
                "provider_error",
                "judge provider returned no response",
            )
            score_rows.append(row)
            raw_rows.append(_raw_row(config, prompt_id, messages, label_map, None, None, "provider_error", 1))
            continue

        content = response.get("content") or ""
        rows, parsed, parse_error = parse_judge_response_to_rows(
            run_id=str(run_config.get("run_id", config.run_dir.name)),
            prompt_id=prompt_id,
            judge_id=config.judge_id,
            judge_model=config.judge_model,
            label_map=label_map,
            content=content,
        )
        raw_rows.append(_raw_row(config, prompt_id, messages, label_map, content, parsed, parse_error, 1))
        if parse_error:
            retry_messages = build_repair_judge_messages(prompt, anonymized, parse_error)
            judge_call_count += 1
            retry_response = await _call_independent_judge(config, retry_messages)
            if retry_response is not None:
                retry_content = retry_response.get("content") or ""
                retry_rows, retry_parsed, retry_parse_error = parse_judge_response_to_rows(
                    run_id=str(run_config.get("run_id", config.run_dir.name)),
                    prompt_id=prompt_id,
                    judge_id=config.judge_id,
                    judge_model=config.judge_model,
                    label_map=label_map,
                    content=retry_content,
                )
                raw_rows.append(
                    _raw_row(
                        config,
                        prompt_id,
                        retry_messages,
                        label_map,
                        retry_content,
                        retry_parsed,
                        retry_parse_error,
                        2,
                    )
                )
                if not retry_parse_error:
                    rows = retry_rows
            else:
                raw_rows.append(
                    _raw_row(config, prompt_id, retry_messages, label_map, None, None, "provider_error", 2)
                )
        score_rows.extend(rows)

    artifact_config = build_independent_judge_config(
        config, run_config, len(prompts_to_judge), judge_call_count
    )
    write_independent_judge_artifacts(config.run_dir, artifact_config, score_rows, raw_rows)
    return IndependentJudgeSummary(
        run_dir=config.run_dir,
        judge_call_count=judge_call_count,
        score_row_count=len(score_rows),
        provider_error_count=sum(1 for row in score_rows if row.get("error_status") == "provider_error"),
        parse_error_count=sum(1 for row in score_rows if row.get("error_status") == "parse_error"),
    )


def enforce_independent_judge(
    config: IndependentJudgeConfig,
    run_config: dict[str, Any],
    results: list[dict[str, Any]],
) -> None:
    """Reject judge model/ID choices that match benchmark candidates."""
    candidate_model_ids = {
        str(variant.get("model_id"))
        for variant in run_config.get("variants", [])
        if variant.get("model_id")
    }
    candidate_model_ids.update(str(result.get("model_id")) for result in results if result.get("model_id"))

    candidate_variant_ids = {
        str(variant.get("variant_id"))
        for variant in run_config.get("variants", [])
        if variant.get("variant_id")
    }
    candidate_variant_ids.update(
        str(result.get("variant_id")) for result in results if result.get("variant_id")
    )

    if config.judge_model in candidate_model_ids:
        raise ValueError(
            f"independent judge model must not match candidate model_id: {config.judge_model}"
        )
    if config.judge_id in candidate_variant_ids:
        raise ValueError(
            f"independent judge ID must not match candidate variant_id: {config.judge_id}"
        )


async def _call_independent_judge(
    config: IndependentJudgeConfig,
    messages: list[dict[str, str]],
) -> dict[str, Any] | None:
    from backend.openrouter import query_model

    return await query_model(
        config.judge_model,
        messages,
        max_tokens=config.max_tokens,
        temperature=config.temperature,
        reasoning_effort=None,
        allow_fallbacks=False,
    )


def _enforce_budget(budget_usd: float, judge_call_count: int) -> None:
    if budget_usd <= 0:
        raise ValueError("budget-usd must be positive")
    projected = judge_call_count * ESTIMATED_JUDGE_CALL_USD
    if projected > budget_usd:
        raise ValueError(
            f"projected judge spend ${projected:.2f} exceeds budget ${budget_usd:.2f}; refusing unbounded run"
        )


def _raw_row(
    config: IndependentJudgeConfig,
    prompt_id: str,
    messages: list[dict[str, str]],
    label_map: dict[str, str],
    content: str | None,
    parsed: dict[str, Any] | None,
    error_status: str | None,
    attempt_index: int,
) -> dict[str, Any]:
    return {
        "prompt_id": prompt_id,
        "attempt_index": attempt_index,
        "judge_id": config.judge_id,
        "judge_model": config.judge_model,
        "messages": messages,
        "label_map": label_map,
        "raw_content": content,
        "parsed": parsed,
        "error_status": error_status,
    }


def build_independent_judge_config(
    config: IndependentJudgeConfig,
    source_run_config: dict[str, Any],
    prompt_count: int,
    judge_call_count: int | None = None,
) -> dict[str, Any]:
    """Build config artifact for the independent judge pass."""
    return {
        **asdict(config),
        "run_dir": str(config.run_dir),
        "prompt_suite_path": str(config.prompt_suite_path) if config.prompt_suite_path else None,
        "source_run_id": source_run_config.get("run_id", config.run_dir.name),
        "source_run_created_at": source_run_config.get("created_at"),
        "prompt_count": prompt_count,
        "judge_call_count": judge_call_count if judge_call_count is not None else prompt_count,
        "estimated_judge_call_usd": ESTIMATED_JUDGE_CALL_USD,
        "estimated_projected_spend_usd": (judge_call_count or prompt_count) * ESTIMATED_JUDGE_CALL_USD,
        "allow_fallbacks": False,
    }


def write_independent_judge_artifacts(
    run_dir: Path,
    config: dict[str, Any],
    score_rows: list[dict[str, Any]],
    raw_rows: list[dict[str, Any]],
) -> None:
    """Write independent judge artifacts with the shared secret guard."""
    write_text_guarded(
        run_dir / "independent-judge-config.json",
        json.dumps(config, indent=2, sort_keys=True) + "\n",
    )
    write_text_guarded(
        run_dir / "independent-judge-scores.csv",
        _csv_content(
            [
                "run_id",
                "prompt_id",
                "judge_id",
                "judge_model",
                "candidate_label",
                "candidate_variant_id",
                "correctness",
                "usefulness",
                "reasoning",
                "concision",
                "overall",
                "rank",
                "notes",
                "error_status",
            ],
            score_rows,
        ),
    )
    write_text_guarded(
        run_dir / "independent-judge-raw.jsonl",
        "".join(json.dumps(row, sort_keys=True) + "\n" for row in raw_rows),
    )
    write_text_guarded(
        run_dir / "independent-judge-summary.md",
        build_independent_judge_summary(config, score_rows),
    )


def build_independent_judge_summary(config: dict[str, Any], rows: list[dict[str, Any]]) -> str:
    """Build Markdown summary ranked by average independent judge overall score."""
    valid_rows = [row for row in rows if not row.get("error_status") and row.get("candidate_variant_id")]
    by_variant: dict[str, list[float]] = {}
    winners: list[tuple[str, str, float]] = []
    by_prompt: dict[str, list[dict[str, Any]]] = {}
    for row in valid_rows:
        by_variant.setdefault(str(row["candidate_variant_id"]), []).append(float(row["overall"]))
        by_prompt.setdefault(str(row["prompt_id"]), []).append(row)

    for prompt_id, prompt_rows in sorted(by_prompt.items()):
        winner = min(prompt_rows, key=lambda row: (int(row["rank"]), -float(row["overall"])))
        winners.append((prompt_id, str(winner["candidate_variant_id"]), float(winner["overall"])))

    ranked = sorted(
        (
            (variant_id, sum(scores) / len(scores), len(scores))
            for variant_id, scores in by_variant.items()
        ),
        key=lambda item: item[1],
        reverse=True,
    )
    provider_errors = sum(1 for row in rows if row.get("error_status") == "provider_error")
    parse_errors = sum(1 for row in rows if row.get("error_status") == "parse_error")

    lines = [
        "# Independent Judge Summary",
        "",
        f"Source run: `{config.get('source_run_id')}`",
        f"Judge model: `{config.get('judge_model')}`",
        f"Judge ID: `{config.get('judge_id')}`",
        f"Prompts judged: {config.get('prompt_count', 0)}",
        f"Judge calls: {config.get('judge_call_count', config.get('prompt_count', 0))}",
        f"Provider errors: {provider_errors}",
        f"Parse errors: {parse_errors}",
        "",
        "Caveat: this is one independent LLM judge pass rather than human truth. Use it as a review aid alongside side-by-side artifacts.",
        "",
        "## Variant ranking by average overall score",
        "",
        "| Rank | Variant | Avg overall | Scored prompts |",
        "|---:|---|---:|---:|",
    ]
    for index, (variant_id, average, count) in enumerate(ranked, start=1):
        lines.append(f"| {index} | `{variant_id}` | {average:.2f} | {count} |")

    lines.extend(["", "## Prompt winners", "", "| Prompt | Winner | Overall |", "|---|---|---:|"])
    for prompt_id, winner, overall in winners:
        lines.append(f"| `{prompt_id}` | `{winner}` | {overall:.2f} |")
    lines.append("")
    return "\n".join(lines)


def _csv_content(fieldnames: list[str], rows: list[dict[str, Any]]) -> str:
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run an independent judge pass over an existing benchmark run")
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--judge-model", default=DEFAULT_JUDGE_MODEL)
    parser.add_argument("--judge-id", default=DEFAULT_JUDGE_ID)
    parser.add_argument("--budget-usd", type=float, default=5.0)
    parser.add_argument("--max-tokens", type=int, default=2048)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--clock", default="1970-01-01T00:00:00Z")
    parser.add_argument("--prompt-suite", type=Path, default=None)
    args = parser.parse_args()

    summary = asyncio.run(
        run_independent_judge(
            IndependentJudgeConfig(
                run_dir=args.run_dir,
                judge_model=args.judge_model,
                judge_id=args.judge_id,
                budget_usd=args.budget_usd,
                max_tokens=args.max_tokens,
                temperature=args.temperature,
                seed=args.seed,
                clock_iso=args.clock,
                prompt_suite_path=args.prompt_suite,
            )
        )
    )
    print(
        "wrote independent judge artifacts: "
        f"{summary.run_dir} ({summary.judge_call_count} judge calls, "
        f"{summary.score_row_count} score rows)"
    )


if __name__ == "__main__":
    main()
