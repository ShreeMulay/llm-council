"""Benchmark artifact writers with secret leak guardrails."""

from __future__ import annotations

import csv
import json
import re
from io import StringIO
from pathlib import Path
from typing import Any


class ArtifactSecretError(ValueError):
    """Raised when an artifact appears to contain a secret."""


SECRET_PATTERNS = [
    re.compile(r"Bearer\s+[A-Za-z0-9._\-]{8,}", re.IGNORECASE),
    re.compile(r"sk-or-v1-[A-Za-z0-9._\-]{8,}", re.IGNORECASE),
    re.compile(r"\b(?:api[_-]?key|secret|token)\b\s*[:=]\s*[\"']?[A-Za-z0-9._\-]{8,}", re.IGNORECASE),
    re.compile(r"\b(?:fw|xai)_[A-Za-z0-9._\-]{12,}\b", re.IGNORECASE),
]


def assert_no_secrets(content: str) -> None:
    """Reject common bearer/API-key patterns before writing artifacts."""
    for pattern in SECRET_PATTERNS:
        if pattern.search(content):
            raise ArtifactSecretError("artifact content matched a common secret/API-key pattern")


def write_text_guarded(path: Path, content: str) -> None:
    """Write text only after passing the artifact secret guard."""
    content = normalize_artifact_text(content)
    assert_no_secrets(content)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


def normalize_artifact_text(content: str) -> str:
    """Normalize generated artifacts for clean diffs without changing meaning."""
    lines = content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(line.rstrip() for line in lines)


def _csv_content(fieldnames: list[str], rows: list[dict[str, Any]]) -> str:
    buffer = StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=fieldnames,
        extrasaction="ignore",
        lineterminator="\n",
    )
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def write_artifacts(
    *,
    run_dir: Path,
    config: dict[str, Any],
    prompts: list[dict[str, Any]],
    results: list[dict[str, Any]],
    judge_scores: list[dict[str, Any]] | None = None,
) -> None:
    """Persist all benchmark artifacts under a run directory."""
    run_dir.mkdir(parents=True, exist_ok=True)
    judge_scores = judge_scores or []

    write_text_guarded(run_dir / "config.json", json.dumps(config, indent=2, sort_keys=True) + "\n")
    write_text_guarded(run_dir / "summary.md", build_summary_markdown(config, results))
    write_text_guarded(run_dir / "side-by-side.md", build_side_by_side_markdown(prompts, results))

    metrics_fields = [
        "run_id",
        "prompt_id",
        "variant_id",
        "provider",
        "model_id",
        "trial_index",
        "latency_seconds",
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "output_tokens_per_second",
        "estimated_input_cost_usd",
        "estimated_output_cost_usd",
        "estimated_total_cost_usd",
        "error_status",
        "fallback_used",
    ]
    write_text_guarded(run_dir / "metrics.csv", _csv_content(metrics_fields, results))

    judge_fields = [
        "run_id",
        "prompt_id",
        "judge_variant_id",
        "candidate_label",
        "candidate_variant_id",
        "correctness",
        "usefulness",
        "reasoning",
        "concision",
        "score",
        "notes",
        "candidate_output_chars",
    ]
    write_text_guarded(run_dir / "judge-scores.csv", _csv_content(judge_fields, judge_scores))

    raw_results = "".join(json.dumps(result, sort_keys=True) + "\n" for result in results)
    write_text_guarded(run_dir / "raw-results.jsonl", raw_results)


def build_summary_markdown(config: dict[str, Any], results: list[dict[str, Any]]) -> str:
    """Build the summary Markdown report."""
    total_cost = sum(result.get("estimated_total_cost_usd") or 0 for result in results)
    errors = [result for result in results if result.get("error_status")]
    budget = config.get("budget", {})
    lines = [
        "# Benchmark Summary",
        "",
        f"Run ID: `{config.get('run_id')}`",
        f"Mode: `{config.get('mode')}`",
        f"Created at: `{config.get('created_at')}`",
        f"Completed calls: {len(results)}",
        f"Estimated total cost: ${total_cost:.8f}",
        f"Errors: {len(errors)}",
    ]
    if budget.get("stopped"):
        lines.extend(["", f"## Budget stop\n{budget.get('stop_reason')}"])
    return "\n".join(lines) + "\n"


def build_side_by_side_markdown(prompts: list[dict[str, Any]], results: list[dict[str, Any]]) -> str:
    """Build side-by-side Markdown with raw outputs and metrics."""
    lines = ["# Benchmark Side-by-Side", ""]
    by_prompt: dict[str, list[dict[str, Any]]] = {}
    for result in results:
        by_prompt.setdefault(str(result.get("prompt_id")), []).append(result)

    for prompt in prompts:
        prompt_id = str(prompt.get("id"))
        lines.extend(
            [
                f"## {prompt_id}: {prompt.get('title', '')}",
                "",
                f"Kind: `{prompt.get('kind', '')}`",
                "",
                "Prompt:",
                "",
                str(prompt.get("prompt", "")),
                "",
            ]
        )
        for result in by_prompt.get(prompt_id, []):
            lines.extend(
                [
                    f"### {result.get('variant_id')}",
                    "",
                    f"Latency: {result.get('latency_seconds')}s",
                    f"Tokens: {result.get('prompt_tokens')} prompt / {result.get('completion_tokens')} completion / {result.get('total_tokens')} total",
                    f"Estimated cost: ${result.get('estimated_total_cost_usd') or 0:.8f}",
                    f"Error status: {result.get('error_status') or 'ok'}",
                    "",
                    "```text",
                    result.get("output") or "",
                    "```",
                    "",
                ]
            )
    return "\n".join(lines)
