"""Blind judge prompt construction for benchmark scoring."""

from __future__ import annotations

import random
from hashlib import sha256
from typing import Any

from .models import BenchmarkVariant


def build_blind_judge_payload(
    *,
    judge_variant: BenchmarkVariant,
    prompt: dict[str, Any],
    candidate_results: list[dict[str, Any]],
    seed: int = 0,
    allow_self_judge: bool = False,
) -> dict[str, Any]:
    """Build an anonymized judge payload, excluding self by default."""
    candidates = []
    excluded: list[str] = []
    for result in candidate_results:
        if not allow_self_judge and result.get("variant_id") == judge_variant.variant_id:
            excluded.append(str(result.get("variant_id")))
            continue
        candidates.append(result)

    rng = random.Random(f"{seed}:{prompt.get('id', '')}:{judge_variant.variant_id}")
    rng.shuffle(candidates)

    labels = [f"Candidate {chr(ord('A') + index)}" for index in range(len(candidates))]
    sections = []
    label_map: dict[str, str] = {}
    for label, result in zip(labels, candidates, strict=True):
        label_map[label] = str(result.get("variant_id"))
        sections.append(f"## {label}\n{result.get('output', '')}")

    content = (
        "You are a blind benchmark judge. Score each anonymous candidate from 1-5 for "
        "correctness, usefulness, reasoning quality, and concision. Do not infer model identity.\n\n"
        f"Original prompt:\n{prompt.get('prompt', '')}\n\n"
        + "\n\n".join(sections)
        + "\n\nReturn CSV columns: candidate,correctness,usefulness,reasoning,concision,notes."
    )

    return {
        "judge_variant_id": judge_variant.variant_id,
        "messages": [{"role": "user", "content": content}],
        "label_map": label_map,
        "excluded_variant_ids": excluded,
    }


def generate_mock_judge_scores(
    *,
    run_id: str,
    prompts: list[dict[str, Any]],
    results: list[dict[str, Any]],
    judge_variants: list[BenchmarkVariant],
    seed: int,
) -> list[dict[str, Any]]:
    """Generate deterministic blind-judge scores without provider calls."""
    rows: list[dict[str, Any]] = []
    results_by_prompt: dict[str, list[dict[str, Any]]] = {}
    for result in results:
        results_by_prompt.setdefault(str(result.get("prompt_id")), []).append(result)

    for prompt in prompts:
        prompt_id = str(prompt.get("id"))
        prompt_results = results_by_prompt.get(prompt_id, [])
        if not prompt_results:
            continue

        for judge_variant in judge_variants:
            payload = build_blind_judge_payload(
                judge_variant=judge_variant,
                prompt=prompt,
                candidate_results=prompt_results,
                seed=seed,
                allow_self_judge=False,
            )
            for candidate_label, candidate_variant_id in payload["label_map"].items():
                result = next(
                    item for item in prompt_results if item.get("variant_id") == candidate_variant_id
                )
                correctness = _stable_score(seed, prompt_id, judge_variant.variant_id, candidate_variant_id, "correctness")
                usefulness = _stable_score(seed, prompt_id, judge_variant.variant_id, candidate_variant_id, "usefulness")
                reasoning = _stable_score(seed, prompt_id, judge_variant.variant_id, candidate_variant_id, "reasoning")
                concision = _stable_score(seed, prompt_id, judge_variant.variant_id, candidate_variant_id, "concision")
                score = round((correctness + usefulness + reasoning + concision) / 4, 2)
                rows.append(
                    {
                        "run_id": run_id,
                        "prompt_id": prompt_id,
                        "judge_variant_id": judge_variant.variant_id,
                        "candidate_label": candidate_label,
                        "candidate_variant_id": candidate_variant_id,
                        "correctness": correctness,
                        "usefulness": usefulness,
                        "reasoning": reasoning,
                        "concision": concision,
                        "score": score,
                        "notes": (
                            "deterministic mock blind score; judge prompt anonymized candidate labels "
                            f"and excluded {judge_variant.variant_id} self-output"
                        ),
                        "candidate_output_chars": len(str(result.get("output", ""))),
                    }
                )
    return rows


def _stable_score(
    seed: int,
    prompt_id: str,
    judge_variant_id: str,
    candidate_variant_id: str,
    dimension: str,
) -> int:
    digest = sha256(
        f"{seed}:{prompt_id}:{judge_variant_id}:{candidate_variant_id}:{dimension}".encode()
    ).hexdigest()
    return int(digest[:8], 16) % 5 + 1
