"""Immutable, paired prompt contracts for flagship promotion decisions."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .models import FLAGSHIP_PROMPT_SET_VERSION


@dataclass(frozen=True)
class PromotionPromptCase:
    """One deterministic half of a quality/evaluator-format prompt pair."""

    case_id: str
    pair_id: str
    role: str
    prompt: str
    expected_labels: tuple[str, ...] = ()
    expected_output: str | None = None


@dataclass(frozen=True)
class PromotionPromptSet:
    """Versioned immutable promotion prompt set."""

    version: str
    cases: tuple[PromotionPromptCase, ...]


FLAGSHIP_PROMPT_SET = PromotionPromptSet(
    version=FLAGSHIP_PROMPT_SET_VERSION,
    cases=(
        PromotionPromptCase(
            "reasoning-quality", "reasoning", "quality",
            "Return only the integer result of 17 * 19.",
            expected_output="323",
        ),
        PromotionPromptCase(
            "reasoning-evaluator", "reasoning", "evaluator_format",
            "Rank Candidate A then Candidate B. Return exactly two numbered lines.",
            ("A", "B"),
        ),
        PromotionPromptCase(
            "structured-quality", "structured", "quality",
            "Return exactly STATUS_OK with no punctuation or additional text.",
            expected_output="STATUS_OK",
        ),
        PromotionPromptCase(
            "structured-evaluator", "structured", "evaluator_format",
            "Rank Candidate B then Candidate A. Return exactly two numbered lines.",
            ("B", "A"),
        ),
    ),
)


def promotion_prompt_suite() -> dict[str, object]:
    """Return the immutable cases in the generic runner's suite shape."""
    return {
        "suite_id": "flagship_promotion",
        "version": FLAGSHIP_PROMPT_SET.version,
        "prompts": [
            {
                "id": case.case_id,
                "kind": case.pair_id,
                "pair_id": case.pair_id,
                "role": case.role,
                "prompt": case.prompt,
                "expected_labels": list(case.expected_labels),
                "expected_output": case.expected_output,
            }
            for case in FLAGSHIP_PROMPT_SET.cases
        ],
    }


def evaluator_format_status(output: str, expected_labels: tuple[str, ...]) -> str:
    """Validate the council evaluator's exact numbered-ranking behavior."""
    lines = [line.strip() for line in output.strip().splitlines() if line.strip()]
    expected = [f"{index}. Candidate {label}" for index, label in enumerate(expected_labels, 1)]
    if len(lines) != len(expected):
        return "fail"
    normalized = [re.sub(r"\s+", " ", line) for line in lines]
    return "pass" if normalized == expected else "fail"
