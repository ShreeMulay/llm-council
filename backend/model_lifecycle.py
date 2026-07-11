"""Validated append-only lifecycle ledger with optional durable JSONL storage."""

from __future__ import annotations

import fcntl
import hashlib
import json
import os
import re
from collections.abc import Mapping
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


class LifecycleTransitionError(ValueError):
    pass


@dataclass(frozen=True)
class EvidenceRecord:
    evidence_id: str
    schema_version: str
    recorded_at: datetime
    actor: str
    kind: str
    references: tuple[str, ...]


@dataclass(frozen=True)
class TransitionRequest:
    logical_id: str
    candidate_version: str
    from_state: str
    to_state: str
    actor: str
    occurred_at: datetime
    registry_version: str
    evidence_references: tuple[str, ...]
    decision: str
    reason: str


@dataclass(frozen=True)
class TransitionEvent(TransitionRequest):
    event_id: str


class LifecycleStore:
    _ORDER = ("discovered", "probed", "benchmark", "shadow", "canary", "production", "retired")
    _VERSION = re.compile(r"^\d+\.\d+\.\d+$")
    _CANDIDATE_VERSION = re.compile(r"^\d{4}[-.]\d{2}[-.]\d{2}$")

    def __init__(self, initial_states: Mapping[tuple[str, str], str] | None = None, path: str | Path | None = None) -> None:
        self._states: dict[tuple[str, str], str] = {}
        self._evidence: list[EvidenceRecord] = []
        self._events: list[TransitionEvent] = []
        self._event_ids: set[str] = set()
        self._path = Path(path) if path is not None else None
        with self._transaction():
            for key, state in (initial_states or {}).items():
                if key not in self._states:
                    self._validate_candidate(*key)
                    if state not in self._ORDER:
                        raise ValueError("invalid initial lifecycle state")
                    self._append({"type": "initial", "logical_id": key[0], "candidate_version": key[1], "state": state})
                    self._states[key] = state

    @property
    def evidence(self) -> tuple[EvidenceRecord, ...]: return tuple(self._evidence)

    @property
    def events(self) -> tuple[TransitionEvent, ...]: return tuple(self._events)

    def append_evidence(self, record: EvidenceRecord) -> None:
        with self._transaction():
            self._append_evidence(record)

    def _append_evidence(self, record: EvidenceRecord) -> None:
        self._validate_time(record.recorded_at, "recorded_at")
        if not record.evidence_id.startswith("sha256:") or len(record.evidence_id) <= 7:
            raise ValueError("evidence_id must be content-addressed")
        if not self._VERSION.fullmatch(record.schema_version):
            raise ValueError("invalid evidence schema version")
        if not all((record.actor, record.kind)) or not record.references:
            raise ValueError("evidence metadata is incomplete")
        if any(item.evidence_id == record.evidence_id for item in self._evidence):
            raise ValueError("duplicate evidence violates append-only ledger")
        self._append({"type": "evidence", **self._json_fields(record)})
        self._evidence.append(record)

    def transition(self, request: TransitionRequest) -> TransitionEvent:
        with self._transaction():
            return self._transition(request)

    def _transition(self, request: TransitionRequest) -> TransitionEvent:
        self._validate_candidate(request.logical_id, request.candidate_version)
        self._validate_time(request.occurred_at, "occurred_at")
        if not re.fullmatch(r"^\d{4}\.\d{2}\.\d{2}$", request.registry_version):
            raise LifecycleTransitionError("invalid registry version")
        key = (request.logical_id, request.candidate_version)
        current = self._states.get(key)
        valid_step = current in self._ORDER and request.to_state in self._ORDER and self._ORDER.index(request.to_state) == self._ORDER.index(current) + 1
        valid_retirement = current in self._ORDER[:-1] and request.to_state == "retired"
        if current != request.from_state or not (valid_step or valid_retirement):
            raise LifecycleTransitionError("invalid lifecycle transition")
        evidence_ids = {item.evidence_id for item in self._evidence}
        if not request.evidence_references or not set(request.evidence_references) <= evidence_ids:
            raise LifecycleTransitionError("transition requires existing evidence")
        canonical = self._json_fields(request)
        event_id = "sha256:" + hashlib.sha256(json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        if event_id in self._event_ids:
            raise LifecycleTransitionError("duplicate transition event")
        event = TransitionEvent(**asdict(request), event_id=event_id)
        self._append({"type": "transition", **self._json_fields(event)})
        self._states[key] = request.to_state
        self._events.append(event)
        self._event_ids.add(event_id)
        return event

    def state(self, logical_id: str, candidate_version: str) -> str:
        return self._states[(logical_id, candidate_version)]

    def roles(self, logical_id: str, candidate_version: str) -> tuple[str, ...]:
        self.state(logical_id, candidate_version)
        return ()

    def register_candidate(self, logical_id: str, candidate_version: str) -> None:
        with self._transaction():
            self._validate_candidate(logical_id, candidate_version)
            key = (logical_id, candidate_version)
            if key in self._states:
                raise ValueError("candidate version already registered")
            self._append({"type": "initial", "logical_id": logical_id, "candidate_version": candidate_version, "state": "discovered"})
            self._states[key] = "discovered"

    def snapshot(self) -> tuple[Any, ...]: return tuple(sorted(self._states.items())), self.evidence, self.events

    @classmethod
    def _validate_time(cls, value: datetime, field: str) -> None:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError(f"{field} must be timezone-aware")

    @classmethod
    def _validate_candidate(cls, logical_id: str, version: str) -> None:
        if "/" not in logical_id or not cls._CANDIDATE_VERSION.fullmatch(version):
            raise ValueError("invalid logical ID or candidate version")

    @staticmethod
    def _json_fields(value: Any) -> dict[str, Any]:
        raw = asdict(value)
        return {key: (item.isoformat() if isinstance(item, datetime) else list(item) if isinstance(item, tuple) else item) for key, item in raw.items()}

    def _append(self, record: dict[str, Any]) -> None:
        if self._path is None:
            return
        self._path.parent.mkdir(parents=True, exist_ok=True)
        data = (json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n").encode()
        with self._path.open("ab", buffering=0) as stream:
            stream.write(data)
            os.fsync(stream.fileno())

    @contextmanager
    def _transaction(self):
        if self._path is None:
            yield
            return
        self._path.parent.mkdir(parents=True, exist_ok=True)
        lock_path = self._path.with_name(f"{self._path.name}.lock")
        with lock_path.open("a+b") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            try:
                self._reset()
                if self._path.exists():
                    self._replay()
                yield
            finally:
                fcntl.flock(lock, fcntl.LOCK_UN)

    def _reset(self) -> None:
        self._states.clear()
        self._evidence.clear()
        self._events.clear()
        self._event_ids.clear()

    def _replay(self) -> None:
        with self._path.open("r", encoding="utf-8") as stream:
            records = [json.loads(line) for line in stream if line.strip()]
        try:
            for persisted in records:
                raw = dict(persisted)
                kind = raw.pop("type")
                if kind == "initial":
                    key = (raw["logical_id"], raw["candidate_version"])
                    self._validate_candidate(*key)
                    if key in self._states or raw["state"] not in self._ORDER:
                        raise ValueError("duplicate or invalid initial state")
                    self._states[key] = raw["state"]
                elif kind == "evidence":
                    raw["recorded_at"] = datetime.fromisoformat(raw["recorded_at"])
                    raw["references"] = tuple(raw["references"])
                    record = EvidenceRecord(**raw)
                    self._append_evidence_replay(record)
                elif kind == "transition":
                    raw["occurred_at"] = datetime.fromisoformat(raw["occurred_at"])
                    raw["evidence_references"] = tuple(raw["evidence_references"])
                    event = TransitionEvent(**raw)
                    self._validate_replayed_event(event)
                else:
                    raise ValueError("unknown lifecycle JSONL record")
        except (KeyError, TypeError, ValueError) as exc:
            self._reset()
            raise ValueError(f"corrupt lifecycle ledger: {exc}") from exc

    def _append_evidence_replay(self, record: EvidenceRecord) -> None:
        self._validate_time(record.recorded_at, "recorded_at")
        if not record.evidence_id.startswith("sha256:") or len(record.evidence_id) <= 7:
            raise ValueError("invalid evidence identifier")
        if not self._VERSION.fullmatch(record.schema_version):
            raise ValueError("invalid evidence schema version")
        if not all((record.actor, record.kind)) or not record.references:
            raise ValueError("evidence metadata is incomplete")
        if any(item.evidence_id == record.evidence_id for item in self._evidence):
            raise ValueError("duplicate evidence")
        self._evidence.append(record)

    def _validate_replayed_event(self, event: TransitionEvent) -> None:
        request_fields = {
            key: value for key, value in asdict(event).items() if key != "event_id"
        }
        request = TransitionRequest(**request_fields)
        self._validate_candidate(request.logical_id, request.candidate_version)
        self._validate_time(request.occurred_at, "occurred_at")
        key = (request.logical_id, request.candidate_version)
        current = self._states.get(key)
        valid_step = (
            current in self._ORDER
            and request.to_state in self._ORDER
            and self._ORDER.index(request.to_state) == self._ORDER.index(current) + 1
        )
        valid_retirement = current in self._ORDER[:-1] and request.to_state == "retired"
        if current != request.from_state or not (valid_step or valid_retirement):
            raise ValueError("invalid transition sequence")
        evidence_ids = {item.evidence_id for item in self._evidence}
        if not request.evidence_references or not set(request.evidence_references) <= evidence_ids:
            raise ValueError("transition references missing evidence")
        canonical = self._json_fields(request)
        expected_id = "sha256:" + hashlib.sha256(
            json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        if event.event_id != expected_id:
            raise ValueError("transition event digest mismatch")
        if event.event_id in self._event_ids:
            raise ValueError("duplicate transition event")
        self._events.append(event)
        self._event_ids.add(event.event_id)
        self._states[key] = event.to_state
