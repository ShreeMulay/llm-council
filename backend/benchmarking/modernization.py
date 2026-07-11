"""Deterministic, offline helpers for versioned benchmark execution."""

from __future__ import annotations

import fcntl
import hashlib
import json
import math
import os
import re
from collections import Counter
from collections.abc import Callable, Iterable, Mapping, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from numbers import Real
from pathlib import Path
from typing import Any

SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
SENSITIVE_MARKERS = re.compile(
    r"(?i)(?:api[_ -]?key\s*[:=]|sk-[a-z0-9_-]{6,}|patient\s+(?:name|id|mrn)|\bmrn\s*[:=]|\bssn\s*[:=])"
)


def _digest(value: object) -> str:
    encoded = json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


@dataclass(frozen=True)
class ValidationError:
    code: str
    message: str


@dataclass(frozen=True)
class ManifestValidation:
    errors: tuple[ValidationError, ...]

    @property
    def is_valid(self) -> bool:
        return not self.errors


def validate_suite_manifest(
    manifest: Mapping[str, Any],
    provider_call: Callable[[object], object] | None = None,
) -> ManifestValidation:
    """Validate a suite locally; ``provider_call`` is accepted but never invoked."""
    del provider_call
    errors: list[ValidationError] = []

    def reject(code: str, message: str) -> None:
        errors.append(ValidationError(code, message))

    for field in ("schema_version", "suite_id", "version", "content_policy", "checksum", "strata", "prompts"):
        if field not in manifest:
            reject("required_field", f"missing required field: {field}")

    for field in ("schema_version", "version"):
        if not isinstance(manifest.get(field), str) or not SEMVER.fullmatch(manifest[field]):
            reject("semantic_version", f"{field} must be a semantic version")
    if not isinstance(manifest.get("suite_id"), str) or not manifest["suite_id"].strip():
        reject("suite_id", "suite_id must be a nonempty string")

    prompts = manifest.get("prompts")
    if not isinstance(prompts, list):
        reject("prompts", "prompts must be a list")
        prompts = []
    if not 60 <= len(prompts) <= 100:
        reject("prompt_count", "suite must contain between 60 and 100 prompts")

    policy = manifest.get("content_policy")
    if not isinstance(policy, Mapping) or policy.get("classification") != "public_non_phi" or policy.get("contains_phi") is not False or policy.get("contains_secrets") is not False:
        reject("content_policy", "suite must be attested public, non-PHI, and secret-free")
    if not isinstance(policy, Mapping) or not isinstance(policy.get("attested_by"), str) or not policy["attested_by"].strip():
        reject("attested_by", "content policy requires a nonempty attested_by")

    checksum = manifest.get("checksum")
    if not isinstance(checksum, Mapping) or checksum.get("algorithm") != "sha256" or checksum.get("canonicalization") != "json-sort-keys-compact" or checksum.get("value") != _digest(prompts):
        reject("checksum", "suite prompt checksum is invalid")

    ids: list[object] = []
    counts: Counter[str] = Counter()
    for index, prompt in enumerate(prompts):
        if not isinstance(prompt, Mapping):
            reject("prompt", f"prompt {index} must be an object")
            continue
        prompt_id = prompt.get("id")
        ids.append(prompt_id)
        if not isinstance(prompt_id, str) or not prompt_id.strip():
            reject("prompt_id", f"prompt {index} id must be a nonempty string")
        for field in ("title", "prompt"):
            if not isinstance(prompt.get(field), str) or not prompt[field].strip():
                reject("prompt_structure", f"prompt {prompt_id!r} requires nonempty {field}")
        if prompt.get("public_non_phi") is not True:
            reject("prompt_structure", f"prompt {prompt_id!r} must attest public_non_phi")
        if SENSITIVE_MARKERS.search(json.dumps(prompt, ensure_ascii=False)):
            reject("sensitive_content", f"prompt {prompt_id!r} contains an obvious secret or PHI marker")
        stratum = prompt.get("stratum")
        if isinstance(stratum, str):
            counts[stratum] += 1
        expected = _digest({key: value for key, value in prompt.items() if key != "checksum"})
        if prompt.get("checksum") != expected:
            reject("prompt_checksum", f"prompt {prompt_id!r} checksum is invalid")
        scoring = prompt.get("scoring")
        if not isinstance(scoring, Mapping):
            reject("scoring", f"prompt {prompt_id!r} has invalid scoring")
        elif scoring.get("type") == "objective":
            validator = scoring.get("validator")
            if not isinstance(validator, Mapping) or not isinstance(validator.get("name"), str) or not validator["name"].strip() or not isinstance(validator.get("version"), str) or not SEMVER.fullmatch(validator["version"]) or not isinstance(validator.get("inputs"), list) or not validator["inputs"] or not all(isinstance(value, str) and value.strip() for value in validator["inputs"]) or validator.get("deterministic") is not True:
                reject("validator", f"prompt {prompt_id!r} lacks a structured deterministic validator")
        elif scoring.get("type") == "subjective":
            families = scoring.get("judge_families")
            rubric = scoring.get("rubric_version")
            if not isinstance(families, list) or len(families) < 2 or not all(isinstance(family, str) and family.strip() for family in families) or len(set(families)) != len(families) or "candidate" in families or not isinstance(rubric, str) or not SEMVER.fullmatch(rubric) or scoring.get("blinded") is not True:
                reject("subjective_judges", f"prompt {prompt_id!r} has invalid judge families")
        else:
            reject("scoring_type", f"prompt {prompt_id!r} has unknown scoring type")
    if len(ids) != len(set(ids)):
        reject("duplicate_prompt_id", "prompt ids must be unique")

    strata = manifest.get("strata")
    if isinstance(strata, Mapping):
        for stratum, declaration in sorted(strata.items()):
            minimum = declaration.get("minimum") if isinstance(declaration, Mapping) else None
            if not isinstance(minimum, int) or minimum < 1 or counts[stratum] < minimum:
                reject("stratum_minimum", f"stratum {stratum!r} does not meet its minimum")
        if set(counts) != set(strata):
            reject("strata", "declared and observed strata differ")
    return ManifestValidation(tuple(errors))


@dataclass(frozen=True)
class ScheduleCell:
    prompt_id: str
    candidate_id: str
    judge_family: str
    judge_id: str
    presentation_index: int


def build_balanced_schedule(
    prompt_ids: Sequence[str],
    candidate_ids: Sequence[str],
    judge_families: Mapping[str, Sequence[str]],
    seed: int = 0,
) -> list[ScheduleCell]:
    """Create one assignment per prompt, candidate, and judge family."""
    if len(set(prompt_ids)) != len(prompt_ids) or len(set(candidate_ids)) != len(candidate_ids):
        raise ValueError("prompt and candidate ids must be unique")
    cells: list[ScheduleCell] = []
    candidate_count = len(candidate_ids)
    for prompt_index, prompt_id in enumerate(prompt_ids):
        for candidate_index, candidate_id in enumerate(candidate_ids):
            position = (candidate_index + prompt_index + seed) % candidate_count if candidate_count else 0
            for family_index, (family, judges) in enumerate(sorted(judge_families.items())):
                eligible = sorted(judge for judge in set(judges) if judge != candidate_id)
                if not eligible:
                    raise ValueError(f"judge family {family!r} cannot judge candidate {candidate_id!r}")
                offset = prompt_index + candidate_index + family_index + seed
                cells.append(ScheduleCell(prompt_id, candidate_id, family, eligible[offset % len(eligible)], position))
    return cells


def composite_attempt_key(**dimensions: object) -> str:
    """Return a stable, collision-resistant key for all supplied dimensions."""
    return _digest(dimensions)


def select_resume_work(
    planned: Iterable[Mapping[str, object]], completed_keys: Iterable[str]
) -> list[Mapping[str, object]]:
    """Select unique planned attempts that have not completed."""
    completed = set(completed_keys)
    seen: set[str] = set()
    result: list[Mapping[str, object]] = []
    for attempt in planned:
        key = composite_attempt_key(**attempt)
        if key not in completed and key not in seen:
            result.append(attempt)
            seen.add(key)
    return result


class LedgerCorruptionError(ValueError):
    """Raised when an attempt ledger cannot be safely replayed."""


@dataclass(frozen=True)
class BenchmarkAttempt:
    """One immutable benchmark attempt persisted by :class:`AttemptLedger`."""

    identity: Mapping[str, object]
    seed: int
    completed: bool
    costs: Mapping[str, Real]
    latency_ms: Real | None
    failures: Sequence[str]
    scoring_version: str
    plan_digest: str
    route_digest: str

    @property
    def attempt_id(self) -> str:
        return composite_attempt_key(**self.identity)


class AttemptLedger:
    """Locked, durable, append-only JSONL storage for benchmark attempts."""

    def __init__(self, path: str | os.PathLike[str]) -> None:
        self.path = Path(path)
        self._lock_path = self.path.with_name(f"{self.path.name}.lock")

    @contextmanager
    def _locked(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock_path.open("a+b") as lock_file:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    @staticmethod
    def _payload(attempt: BenchmarkAttempt) -> dict[str, object]:
        return {
            "attempt_id": attempt.attempt_id,
            "identity": dict(attempt.identity),
            "seed": attempt.seed,
            "completed": attempt.completed,
            "costs": dict(attempt.costs),
            "latency_ms": attempt.latency_ms,
            "failures": list(attempt.failures),
            "scoring_version": attempt.scoring_version,
            "plan_digest": attempt.plan_digest,
            "route_digest": attempt.route_digest,
        }

    @staticmethod
    def _decode(record: object, line_number: int) -> BenchmarkAttempt:
        if not isinstance(record, dict):
            raise LedgerCorruptionError(f"ledger line {line_number} is not an object")
        checksum = record.get("checksum")
        payload = {key: value for key, value in record.items() if key != "checksum"}
        if not isinstance(checksum, str) or checksum != _digest(payload):
            raise LedgerCorruptionError(f"ledger line {line_number} checksum is invalid")
        try:
            attempt = BenchmarkAttempt(
                identity=payload["identity"],
                seed=payload["seed"],
                completed=payload["completed"],
                costs=payload["costs"],
                latency_ms=payload["latency_ms"],
                failures=payload["failures"],
                scoring_version=payload["scoring_version"],
                plan_digest=payload["plan_digest"],
                route_digest=payload["route_digest"],
            )
        except (KeyError, TypeError) as error:
            raise LedgerCorruptionError(
                f"ledger line {line_number} has an invalid attempt schema"
            ) from error
        if payload.get("attempt_id") != attempt.attempt_id:
            raise LedgerCorruptionError(f"ledger line {line_number} attempt ID is invalid")
        return attempt

    def _replay_unlocked(self) -> list[BenchmarkAttempt]:
        if not self.path.exists():
            return []
        attempts: list[BenchmarkAttempt] = []
        seen: set[str] = set()
        try:
            with self.path.open(encoding="utf-8") as ledger:
                for line_number, line in enumerate(ledger, 1):
                    if not line.endswith("\n"):
                        raise LedgerCorruptionError(
                            f"ledger line {line_number} is not durably terminated"
                        )
                    try:
                        record = json.loads(line)
                    except json.JSONDecodeError as error:
                        raise LedgerCorruptionError(
                            f"ledger line {line_number} is invalid JSON"
                        ) from error
                    attempt = self._decode(record, line_number)
                    if attempt.attempt_id in seen:
                        raise LedgerCorruptionError(
                            f"duplicate attempt ID at ledger line {line_number}"
                        )
                    seen.add(attempt.attempt_id)
                    attempts.append(attempt)
        except UnicodeDecodeError as error:
            raise LedgerCorruptionError("ledger is not valid UTF-8") from error
        return attempts

    def replay(self) -> list[BenchmarkAttempt]:
        with self._locked():
            return self._replay_unlocked()

    def append(self, attempt: BenchmarkAttempt) -> None:
        payload = self._payload(attempt)
        record = {**payload, "checksum": _digest(payload)}
        encoded = (json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()
        with self._locked():
            if attempt.attempt_id in {item.attempt_id for item in self._replay_unlocked()}:
                raise ValueError(f"duplicate attempt ID: {attempt.attempt_id}")
            existed = self.path.exists()
            descriptor = os.open(self.path, os.O_APPEND | os.O_CREAT | os.O_WRONLY, 0o600)
            try:
                written = os.write(descriptor, encoded)
                if written != len(encoded):
                    raise OSError("short ledger append")
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
            if not existed:
                directory = os.open(self.path.parent, os.O_RDONLY)
                try:
                    os.fsync(directory)
                finally:
                    os.close(directory)

    def select_resume_work(
        self, planned: Iterable[Mapping[str, object]]
    ) -> list[Mapping[str, object]]:
        completed = {
            attempt.attempt_id for attempt in self.replay() if attempt.completed
        }
        return select_resume_work(planned, completed)


@dataclass(frozen=True)
class IncompleteCellReport:
    complete: bool
    expected_count: int
    completed_count: int
    missing_cells: list[Mapping[str, object]]


def report_incomplete_cells(
    expected: Sequence[Mapping[str, object]], completed: Iterable[Mapping[str, object]]
) -> IncompleteCellReport:
    expected_digests = [_digest(cell) for cell in expected]
    if len(expected_digests) != len(set(expected_digests)):
        raise ValueError("duplicate expected cells require distinct trial/attempt identity")
    completed_digests = {_digest(cell) for cell in completed}
    missing = [cell for cell in expected if _digest(cell) not in completed_digests]
    completed_count = len(expected) - len(missing)
    return IncompleteCellReport(not missing, len(expected), completed_count, missing)


ABLATION_METRICS = (
    "quality", "diversity", "latency", "cost", "failure_rate", "uncertainty", "judge_agreement"
)


@dataclass(frozen=True)
class SeatAblationReport:
    baseline: str
    effects: dict[str, dict[str, dict[str, dict[str, object]]]]
    production_mutations: list[object]


def _mean(rows: Sequence[Mapping[str, object]], metric: str) -> float | None:
    values = [float(row[metric]) for row in rows if isinstance(row.get(metric), Real)]
    return sum(values) / len(values) if values else None


def analyze_seat_ablation(
    rows: Sequence[Mapping[str, object]], frozen_seats: Sequence[str]
) -> SeatAblationReport:
    """Summarize offline seat removal/replacement effects without mutating config."""
    strata = sorted({str(row["stratum"]) for row in rows if "stratum" in row})
    baseline_rows = [row for row in rows if row.get("configuration") == "full"]
    effects: dict[str, dict[str, dict[str, dict[str, object]]]] = {}
    for seat in frozen_seats:
        effects[seat] = {"removed": {}, "replacement": {}}
        for configuration in effects[seat]:
            for stratum in strata:
                selected = [row for row in rows if row.get("seat") == seat and row.get("configuration") == configuration and row.get("stratum") == stratum]
                baseline_by_trial = {row.get("trial_id"): row for row in baseline_rows if row.get("stratum") == stratum and row.get("trial_id") is not None}
                pairs = [(row, baseline_by_trial[row.get("trial_id")]) for row in selected if row.get("trial_id") in baseline_by_trial]
                metrics: dict[str, object] = {metric: _mean(selected, metric) for metric in ABLATION_METRICS if metric != "uncertainty"}
                deltas = [float(row["quality"]) - float(base["quality"]) for row, base in pairs if isinstance(row.get("quality"), Real) and isinstance(base.get("quality"), Real)]
                effect = round(sum(deltas) / len(deltas), 12) if deltas else None
                standard_error = None
                if len(deltas) > 1:
                    mean_delta = sum(deltas) / len(deltas)
                    variance = sum((value - mean_delta) ** 2 for value in deltas) / (len(deltas) - 1)
                    standard_error = math.sqrt(variance / len(deltas))
                metrics["uncertainty"] = {"trial_count": len(deltas), "standard_error": standard_error}
                metrics["marginal_effect"] = effect
                metrics["effect_direction"] = "increase" if effect is not None and effect > 0 else "decrease" if effect is not None and effect < 0 else "no_change" if effect == 0 else "unknown"
                metrics["matched_trials"] = len(pairs)
                limitations: list[str] = []
                if not selected:
                    limitations.append("no ablation observations")
                if len(pairs) < 2:
                    limitations.append("fewer than two matched trials")
                if len(pairs) != len(selected):
                    limitations.append("unmatched ablation observations excluded")
                metrics["limitations"] = limitations
                effects[seat][configuration][stratum] = metrics
    return SeatAblationReport("full", effects, [])
