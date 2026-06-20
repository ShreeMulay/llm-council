"""Prompt suite loading and PHI-safety checks."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

DEFAULT_PROMPT_SUITE_PATH = Path("benchmarks/prompts/internal_suite_v1.json")

_PHI_PATTERNS = [
    re.compile(r"\bMRN\b", re.IGNORECASE),
    re.compile(r"\bDOB\b", re.IGNORECASE),
    re.compile(r"\bSSN\b", re.IGNORECASE),
    re.compile(r"\bpatient\s+identifier\b", re.IGNORECASE),
    re.compile(r"\b[A-Z][a-z]+\s+[A-Z][a-z]+,\s*(?:MRN|DOB)\b"),
]


def load_prompt_suite(path: Path | str = DEFAULT_PROMPT_SUITE_PATH) -> dict[str, Any]:
    """Load a committed JSON prompt suite and reject obvious PHI patterns."""
    suite_path = Path(path)
    suite = json.loads(suite_path.read_text())
    prompts = suite.get("prompts", [])
    if not prompts:
        raise ValueError(f"prompt suite has no prompts: {suite_path}")

    for prompt in prompts:
        text = "\n".join(str(prompt.get(key, "")) for key in ("id", "kind", "title", "prompt"))
        for pattern in _PHI_PATTERNS:
            if pattern.search(text):
                raise ValueError(f"prompt {prompt.get('id')} appears to contain PHI-like text")

    return suite
