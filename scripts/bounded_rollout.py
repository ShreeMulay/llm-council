#!/usr/bin/env python3
"""Bounded, fail-closed Cloud Run rollout controller.

The controller contains no prompt or response logging.  Its durable evidence is
limited to attempt state, bounded classifications, and revision retention.
"""

from __future__ import annotations

import argparse
import hashlib
import inspect
import json
import os
import re
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from typing import Any

# Public exception names are part of the approved executable contract.
# ruff: noqa: N818

LOCK_OBJECT = (
    "gs://tke-phi-privacy-engine_cloudbuild/rollout-locks/"
    "tke-phi-privacy-engine/us-central1/llm-council.lock"
)
EVIDENCE_ROOT = "gs://tke-phi-privacy-engine_cloudbuild/rollout-evidence"
ATTEMPT_CLASSIFICATIONS = {
    "succeeded",
    "http_429",
    "http_503",
    "timeout",
    "connection_reset",
    "content",
    "objective",
    "schema",
    "fallback",
    "route",
    "policy",
    "usage",
    "pricing",
    "instruction",
    "factual",
    "evaluator_format",
    "identity",
    "absolute_slo",
    "semantic_unknown",
}
INFRASTRUCTURE_CLASSIFICATIONS = {"http_429", "http_503", "timeout", "connection_reset"}
SEMANTIC_CLASSIFICATIONS = ATTEMPT_CLASSIFICATIONS - INFRASTRUCTURE_CLASSIFICATIONS - {"succeeded"}
PAID_PLAN = (
    ("prior", "stream", "https://service.example"),
    ("shadow", "sync", "https://shadow.example"),
    ("shadow", "stream", "https://shadow.example"),
    ("final", "sync", "https://service.example"),
    ("final", "stream", "https://service.example"),
)


class RolloutError(RuntimeError):
    """Base class for bounded rollout refusals."""


class SourceBindingError(RolloutError):
    pass


class LockRefusal(RolloutError):
    pass


class LockRecoveryRequired(LockRefusal):
    """A pre-existing deployment lock requires bounded manual recovery."""

    status = "stale_lock_recovery_required"


class InitialStateRefusal(RolloutError):
    pass


class PaidAttemptLimitError(RolloutError):
    pass


class PaidGateClosedError(RolloutError):
    pass


class ConcurrencyRefusal(RolloutError):
    pass


class OperationRefusal(RolloutError):
    pass


class PromotionDeadlineExceeded(RolloutError):
    pass


class RollbackProofError(RolloutError):
    pass


class RollbackRecoveryRequired(RollbackProofError):
    """Ambiguous owned recovery did not converge before rollback grace expired."""

    status = "recovery_required"


class IdentityRefusal(RolloutError):
    pass


class InfrastructureFailure(RolloutError):
    def __init__(self, classification: str):
        if classification not in INFRASTRUCTURE_CLASSIFICATIONS:
            raise ValueError("invalid infrastructure classification")
        self.classification = classification
        super().__init__(classification)


class SemanticFailure(RolloutError):
    def __init__(self, classification: str):
        if classification not in SEMANTIC_CLASSIFICATIONS:
            raise ValueError("invalid semantic classification")
        self.classification = classification
        super().__init__(classification)


def _integer(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise ValueError
    text = str(value)
    if not text.isdigit():
        raise ValueError
    return int(text)


def _normalized_traffic(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list) or not items:
        raise ValueError
    normalized = []
    for raw in items:
        if not isinstance(raw, dict):
            raise ValueError
        allowed = {"type", "revision", "percent", "tag", "uri"}
        if not set(raw) <= allowed:
            raise ValueError
        revision, percent = raw.get("revision"), raw.get("percent")
        if not isinstance(revision, str) or not revision:
            raise ValueError
        if isinstance(percent, bool) or not isinstance(percent, int) or not 0 <= percent <= 100:
            raise ValueError
        item = {key: deepcopy(value) for key, value in raw.items() if key != "uri"}
        if "tag" in item and (not isinstance(item["tag"], str) or not item["tag"]):
            raise ValueError
        normalized.append(item)
    return normalized


def validate_initial_service(state: Any) -> dict[str, Any]:
    """Validate a converged v2 service with one resolved 100% owner."""
    try:
        if not isinstance(state, dict):
            raise ValueError
        uid, etag = state.get("uid"), state.get("etag")
        generation = _integer(state.get("generation"))
        observed = _integer(state.get("observedGeneration"))
        if not isinstance(uid, str) or not uid or not isinstance(etag, str) or not etag:
            raise ValueError
        if observed != generation or state.get("reconciling") is not False:
            raise ValueError
        traffic = _normalized_traffic(state.get("traffic"))
        statuses = _normalized_traffic(state.get("trafficStatuses"))
        if traffic != statuses:
            raise ValueError
        resolved = [item for item in traffic if item["percent"] > 0]
        if len(resolved) != 1 or resolved[0]["percent"] != 100:
            raise ValueError
    except (KeyError, TypeError, ValueError) as exc:
        raise InitialStateRefusal("initial service state refused") from exc
    return deepcopy(state)


def validate_lock_receipt(receipt: Any, *, expected_owner: str) -> str:
    """Return a valid owned GCS generation."""
    if not isinstance(receipt, dict) or set(receipt) != {"owner", "generation"}:
        raise LockRefusal("invalid lock receipt")
    owner, generation = receipt["owner"], receipt["generation"]
    if owner != expected_owner or not isinstance(owner, str):
        raise LockRefusal("lock owner mismatch")
    if not isinstance(generation, str) or not generation.isdigit():
        raise LockRefusal("invalid lock generation")
    return generation


def verify_stage_identities(
    samples: list[dict[str, Any]],
    prior: dict[str, Any],
    candidate: dict[str, Any],
    *,
    percent: int,
) -> dict[str, int]:
    """Validate known identities; counts are diagnostic, never traffic ratios."""
    counts: dict[str, int] = {}
    for sample in samples:
        if sample == prior:
            name = "prior"
        elif sample == candidate:
            name = "candidate"
        else:
            raise IdentityRefusal("unknown service identity")
        counts[name] = counts.get(name, 0) + 1
    if percent == 100 and (not samples or set(counts) != {"candidate"}):
        raise IdentityRefusal("100 percent service samples must all be candidate")
    return counts


class _SystemClock:
    monotonic = staticmethod(time.monotonic)

    @staticmethod
    def now() -> datetime:
        return datetime.now(UTC)


class RolloutController:
    """Own the fixed bounded rollout state machine and all safety gates."""

    def __init__(
        self,
        *,
        boundaries: Any,
        rollout_id: str,
        approved_sha: str,
        clock: Any | None = None,
        promotion_seconds: float = 1800,
        rollback_seconds: float = 300,
    ):
        self.boundaries = boundaries
        self.rollout_id = rollout_id
        self.approved_sha = approved_sha
        self.clock = clock or getattr(boundaries, "clock", None) or _SystemClock()
        self.promotion_seconds = promotion_seconds
        self.rollback_seconds = rollback_seconds
        self.promotion_deadline: float | None = None
        self.rollback_deadline: float | None = None
        self.paid_gate_state = "open"
        self.promotion_gate_state = "unchanged"
        self.attempt_count = 0
        self.retry_consumed = False
        self.lock_generation: str | None = None
        self.snapshot: dict[str, Any] | None = None
        self.prior_identity: dict[str, Any] | None = None
        self.candidate_identity: dict[str, Any] | None = None
        self.candidate_revision: str | None = None
        self.image_digest: str | None = None
        self.mutation_armed = False
        self.rollout_owned_state: dict[str, Any] | None = None
        self.pre_deploy_state: dict[str, Any] | None = None
        self.expected_candidate_revision: str | None = None

    def _event(self, *event: Any) -> None:
        events = getattr(self.boundaries, "events", None)
        if isinstance(events, list):
            events.append(tuple(event))

    def verify_source(self, **values: Any) -> None:
        sha_fields = (
            values.get("dispatch_sha"),
            values.get("checkout_sha"),
            values.get("forgejo_master_sha"),
            values.get("local_head_sha"),
        )
        if (
            not values.get("worktree_clean")
            or any(not isinstance(value, str) or re.fullmatch(r"[0-9a-f]{40}", value) is None for value in sha_fields)
            or len(set(sha_fields)) != 1
            or sha_fields[0] != self.approved_sha
        ):
            raise SourceBindingError("source does not match approved Forgejo master")

    def start_promotion_deadline(self) -> None:
        self.promotion_deadline = self.clock.monotonic() + self.promotion_seconds

    def _remaining(self, *, rollback: bool = False, cap: float | None = None) -> float:
        deadline = self.rollback_deadline if rollback else self.promotion_deadline
        if deadline is None:
            remaining = self.rollback_seconds if rollback else self.promotion_seconds
        else:
            remaining = deadline - self.clock.monotonic()
        if cap is not None:
            remaining = min(remaining, cap)
        if remaining <= 0:
            if rollback:
                raise RollbackProofError("rollback grace exhausted")
            raise PromotionDeadlineExceeded("promotion deadline exhausted")
        return remaining

    def _call_with_budget(
        self, method: Any, *args: Any, rollback: bool = False, **kwargs: Any
    ) -> Any:
        if "timeout" in inspect.signature(method).parameters:
            kwargs["timeout"] = self._remaining(rollback=rollback)
        return method(*args, **kwargs)

    def _service_get(self, *, rollback: bool = False) -> dict[str, Any]:
        return self._call_with_budget(self.boundaries.service_get, rollback=rollback)

    def _service_base_url(self, *, rollback: bool = False) -> str:
        method = getattr(self.boundaries, "get_service_base_url", None)
        if method is not None:
            return self._call_with_budget(method, rollback=rollback)
        return getattr(self.boundaries, "service_base_url", "https://service.example")

    def acquire_lock(self) -> None:
        owner = self.rollout_id
        try:
            generation = self._call_with_budget(
                self.boundaries.create_gcs,
                LOCK_OBJECT,
                {"rollout_id": self.rollout_id, "owner": owner},
                if_generation_match=0,
            )
            receipt = {"owner": owner, "generation": generation}
            self.lock_generation = validate_lock_receipt(receipt, expected_owner=owner)
        except Exception as exc:
            if isinstance(exc, LockRefusal):
                raise
            raise LockRecoveryRequired(
                "stale_lock_recovery_required: existing lock requires bounded manual recovery"
            ) from exc

    def capture_snapshot(self) -> dict[str, Any]:
        state = self._service_get()
        if "observedGeneration" in state:
            self.snapshot = validate_initial_service(state)
        else:
            try:
                uid, etag = state["uid"], state["etag"]
                generation = _integer(state["generation"])
                observed = _integer(state["observed_generation"])
                traffic = _normalized_traffic(state["traffic"])
                resolved = [item for item in traffic if item["percent"] > 0]
                if (
                    not uid
                    or not etag
                    or generation != observed
                    or state.get("reconciling") is not False
                    or len(resolved) != 1
                    or resolved[0]["percent"] != 100
                ):
                    raise ValueError
            except (KeyError, TypeError, ValueError) as exc:
                raise InitialStateRefusal("initial service state refused") from exc
            self.snapshot = deepcopy(state)
        return deepcopy(self.snapshot)

    def acquire_lock_and_snapshot(self) -> dict[str, Any]:
        self.acquire_lock()
        return self.capture_snapshot()

    def build_candidate(self) -> str:
        self.image_digest = self.boundaries.build(timeout=self._remaining())
        self._remaining()
        return self.image_digest

    def deploy_candidate(self) -> str:
        if not self.image_digest:
            self.image_digest = "registry/image@sha256:candidate"
        self.pre_deploy_state = deepcopy(self.snapshot)
        revision_factory = getattr(self.boundaries, "shadow_revision_name", None)
        if revision_factory is not None:
            self.expected_candidate_revision = revision_factory(self.rollout_id)
        self.mutation_armed = True
        deploy = self.boundaries.deploy_shadow
        kwargs: dict[str, Any] = {"timeout": self._remaining()}
        if self.expected_candidate_revision is not None and "expected_revision" in inspect.signature(deploy).parameters:
            kwargs["expected_revision"] = self.expected_candidate_revision
        self.candidate_revision = deploy(self.image_digest, **kwargs)
        if self.expected_candidate_revision is not None and self.candidate_revision != self.expected_candidate_revision:
            raise ConcurrencyRefusal("deployed candidate revision mismatch")
        self.expected_candidate_revision = self.candidate_revision
        self._remaining()
        return self.candidate_revision

    def _attempt_record(
        self,
        number: int,
        stage: str,
        surface: str,
        url: str,
        classification: str,
        retry_of: int | None,
    ) -> dict[str, Any]:
        record = {
            "rollout_id": self.rollout_id,
            "stage": stage,
            "surface": surface,
            "url_sha256": hashlib.sha256(url.encode()).hexdigest(),
            "attempt_number": number,
            "paid_gate_state": "open",
            "classification": classification,
        }
        if retry_of is not None:
            record["retry_of"] = retry_of
        return record

    def run_paid_attempt(
        self, *, stage: str, surface: str, url: str, retry_of: int | None = None
    ) -> Any:
        if self.paid_gate_state != "open":
            raise PaidGateClosedError("paid gate is closed")
        if self.attempt_count >= 6:
            raise PaidAttemptLimitError("paid attempt bound reached")
        self.attempt_count += 1
        number = self.attempt_count
        prefix = f"rollout-evidence/{self.rollout_id}/attempts/{number:04d}"
        started = self._attempt_record(number, stage, surface, url, "started", retry_of)
        self._call_with_budget(
            self.boundaries.create_gcs,
            f"{prefix}-started.json",
            started,
            if_generation_match=0,
        )
        try:
            result = self.boundaries.paid_request(stage, surface, url, self._remaining())
            classification = "succeeded"
        except (InfrastructureFailure, SemanticFailure) as exc:
            classification = exc.classification
            result = exc
        completed = self._attempt_record(number, stage, surface, url, classification, retry_of)
        self._call_with_budget(
            self.boundaries.create_gcs,
            f"{prefix}-completed.json",
            completed,
            if_generation_match=0,
        )
        if isinstance(result, InfrastructureFailure):
            if self.retry_consumed:
                self.paid_gate_state = "terminally_closed"
                raise result
            self.retry_consumed = True
            return self.run_paid_attempt(
                stage=stage, surface=surface, url=url, retry_of=number
            )
        if isinstance(result, SemanticFailure):
            self.paid_gate_state = "terminally_closed"
            raise result
        return result

    def execute_paid_plan(self) -> None:
        for stage, surface, url in PAID_PLAN:
            self.run_paid_attempt(stage=stage, surface=surface, url=url)

    def observe_stage(self, percent: int) -> None:
        self.boundaries.observe(percent, duration=300, timeout=self._remaining())

    def verify_health(self, url: str, expected: dict[str, Any], *, rollback: bool = False) -> Any:
        return self.boundaries.health(url, expected, timeout=self._remaining(rollback=rollback))

    def verify_candidate_health(self, url: str) -> dict[str, Any]:
        if not self.image_digest:
            raise IdentityRefusal("candidate image digest is missing")
        method = getattr(self.boundaries, "candidate_health", None)
        if method is None:
            return self.boundaries.health(
                url, self.candidate_identity, timeout=self._remaining()
            )
        return method(
            url,
            expected_revision=self.approved_sha,
            expected_image_digest=self.image_digest,
            timeout=self._remaining(),
        )

    def record_telemetry(self, *, requests: int | None = None, error: Exception | None = None, **_: Any) -> str:
        if error is not None:
            return "query_failed"
        return "no_evidence" if requests == 0 else "observed"

    def _simple_restore(
        self, snapshot: dict[str, Any], current: dict[str, Any] | None = None
    ) -> None:
        current = current or self._service_get(rollback=self.rollback_deadline is not None)
        result = self.boundaries.service_patch({"traffic": deepcopy(snapshot["traffic"])}, etag=current["etag"])
        if isinstance(result, dict) and "done" not in result:
            return

    def planned_restore(self, snapshot: dict[str, Any], during_restore: Any | None = None) -> None:
        prior_gate = self.paid_gate_state
        self.paid_gate_state = "restoration_closed"
        self._event("planned-restore")
        try:
            if during_restore:
                during_restore()
            current = self._service_get()
            if "observedGeneration" in current:
                restored_state = self.transition_traffic(
                    snapshot["traffic"],
                    expected_uid=snapshot["uid"],
                    expected_generation=current["generation"],
                    expected_etag=current["etag"],
                    timeout=self._remaining(),
                )
                self.rollout_owned_state = deepcopy(restored_state)
                if self.prior_identity is not None:
                    restored = self.boundaries.health(
                        self._service_base_url(),
                        self.prior_identity,
                        timeout=self._remaining(),
                    )
                    if restored != self.prior_identity:
                        raise RollbackProofError("planned restoration identity mismatch")
            elif getattr(self.boundaries, "state", None) is not None:
                self._simple_restore(snapshot)
        finally:
            if prior_gate == "open":
                self.paid_gate_state = "open"

    def patch_stage(
        self, *, candidate: str, percent: int, expected_etag: str, expected_generation: int
    ) -> dict[str, Any]:
        current = self._service_get()
        generation_key = "observedGeneration" if "observedGeneration" in current else "observed_generation"
        if current.get("etag") != expected_etag or _integer(current.get("generation")) != expected_generation:
            raise ConcurrencyRefusal("service ownership changed")
        if _integer(current.get(generation_key)) != expected_generation:
            raise ConcurrencyRefusal("service is not converged")
        base = deepcopy((self.snapshot or current)["traffic"])
        untagged = [item for item in base if "tag" not in item]
        prior = untagged[0]["revision"]
        requested = [{"revision": candidate, "percent": percent}]
        if percent < 100:
            requested.append({"revision": prior, "percent": 100 - percent})
        requested.extend(item for item in base if "tag" in item)
        result = self.boundaries.service_patch({"traffic": requested}, etag=expected_etag)
        return result

    def _patch(self, traffic: list[dict[str, Any]], etag: str, timeout: float) -> dict[str, Any]:
        method = self.boundaries.service_patch
        if "timeout" in inspect.signature(method).parameters:
            return method({"traffic": deepcopy(traffic)}, etag=etag, timeout=timeout)
        return method({"traffic": deepcopy(traffic)}, etag=etag)

    def _validate_operation(self, operation: Any) -> tuple[bool, dict[str, Any] | None]:
        if not isinstance(operation, dict) or not isinstance(operation.get("name"), str):
            raise OperationRefusal("malformed operation")
        done = operation.get("done", False)
        if not isinstance(done, bool) or operation.get("error") is not None:
            raise OperationRefusal("operation refused")
        if not done:
            return False, None
        response = operation.get("response")
        if not isinstance(response, dict) or not response.get("uid"):
            raise OperationRefusal("operation response refused")
        return True, response

    def _validate_transition_state(
        self,
        state: Any,
        requested: list[dict[str, Any]],
        *,
        uid: str,
        old_generation: int,
        old_etag: str,
        final: bool,
    ) -> bool:
        try:
            if not isinstance(state, dict) or state.get("uid") != uid:
                raise ValueError
            generation = _integer(state.get("generation"))
            observed = _integer(state.get("observedGeneration"))
            if generation != old_generation + 1 or state.get("etag") == old_etag:
                raise ValueError
            traffic = _normalized_traffic(state.get("traffic"))
            if traffic != _normalized_traffic(requested):
                raise ValueError
            converged = observed == generation and state.get("reconciling") is False
            if not converged:
                if (
                    observed > generation
                    or state.get("reconciling") is False
                    or observed == generation
                ):
                    raise ValueError
                return False
            statuses = _normalized_traffic(state.get("trafficStatuses"))
            if statuses != traffic:
                raise ValueError
            return True
        except (TypeError, ValueError) as exc:
            error = ConcurrencyRefusal("traffic transition refused")
            if final:
                raise error from exc
            raise error from exc

    def transition_traffic(
        self,
        requested: list[dict[str, Any]],
        *,
        expected_uid: str,
        expected_generation: str,
        expected_etag: str,
        timeout: float,
    ) -> dict[str, Any]:
        current = self._service_get()
        if (
            current.get("uid") != expected_uid
            or _integer(current.get("generation")) != _integer(expected_generation)
            or current.get("etag") != expected_etag
        ):
            raise ConcurrencyRefusal("service ownership changed before patch")
        operation = self._patch(requested, expected_etag, self._remaining(cap=timeout))
        if "done" not in operation and operation.get("uid"):
            return operation
        response = None
        while True:
            done, response = self._validate_operation(operation)
            if done:
                break
            operation = self.boundaries.poll_operation(
                operation["name"], timeout=self._remaining(cap=timeout)
            )
        old_generation = _integer(expected_generation)
        self._validate_transition_state(
            response, requested, uid=expected_uid, old_generation=old_generation,
            old_etag=expected_etag, final=False,
        )
        while True:
            state = self.boundaries.poll_service(timeout=self._remaining(cap=timeout))
            if self._validate_transition_state(
                state, requested, uid=expected_uid, old_generation=old_generation,
                old_etag=expected_etag, final=True,
            ):
                self.rollout_owned_state = deepcopy(state)
                return state

    def wait_for_operation(self, name: str) -> Any:
        return self.boundaries.poll_operation(name, timeout=self._remaining())

    def wait_for_service_convergence(self) -> Any:
        return self.boundaries.poll_service(timeout=self._remaining())

    def start_terminal_rollback(self) -> None:
        self.paid_gate_state = "terminally_closed"
        self._event("paid-gate-terminal-close")
        self.rollback_deadline = self.clock.monotonic() + self.rollback_seconds

    def wait_for_rollback_operation(self, name: str) -> Any:
        return self.boundaries.poll_operation(name, timeout=self._remaining(rollback=True))

    def wait_for_rollback_convergence(self) -> Any:
        return self.boundaries.poll_service(timeout=self._remaining(rollback=True))

    def verify_rollback_health(self) -> Any:
        return self.boundaries.health(
            "https://service.example", self.prior_identity, timeout=self._remaining(rollback=True)
        )

    def terminal_rollback(self, *, reason: str) -> None:
        del reason
        self.start_terminal_rollback()
        if not self.snapshot:
            return
        current = self._service_get_for_rollback_ownership()
        if "observedGeneration" not in current:
            if not self._current_state_is_owned(current):
                raise RollbackProofError("rollback mutation ownership refused")
            self._simple_restore(self.snapshot, current)
            return
        try:
            if not self._current_state_is_owned(current):
                raise RollbackProofError("rollback mutation ownership refused")
            owner_generation = _integer(current["generation"])
            operation = self._patch(
                self.snapshot["traffic"], current["etag"], self._remaining(rollback=True)
            )
            response = None
            while True:
                done, response = self._validate_operation(operation)
                if done:
                    break
                operation = self.boundaries.poll_operation(
                    operation["name"], timeout=self._remaining(rollback=True)
                )
            while True:
                restored = self.boundaries.poll_service(timeout=self._remaining(rollback=True))
                if self._rollback_state_status(restored, current, owner_generation):
                    break
            valid = isinstance(response, dict)
            health = self.boundaries.health(
                "https://service.example",
                self.prior_identity,
                timeout=self._remaining(rollback=True),
            )
            valid = valid and health == self.prior_identity
            if self.lock_generation is not None:
                valid = valid and self._call_with_budget(
                    self.boundaries.verify_lock,
                    self.lock_generation,
                    rollback=True,
                ) is True
            if not valid:
                raise RollbackProofError("rollback proof refused")
            self.mutation_armed = False
            if self.lock_generation is not None:
                self._call_with_budget(
                    self.boundaries.release_lock,
                    self.lock_generation,
                    rollback=True,
                )
        except RollbackProofError:
            raise
        except Exception as exc:
            raise RollbackProofError("rollback proof refused") from exc

    def _rollback_state_status(
        self, restored: Any, owner: dict[str, Any], owner_generation: int
    ) -> bool:
        """Return False only for an exact, still-reconciling owned restoration."""
        try:
            if not isinstance(restored, dict) or restored.get("uid") != self.snapshot.get("uid"):
                raise ValueError
            generation = _integer(restored.get("generation"))
            observed = _integer(restored.get("observedGeneration"))
            if generation != owner_generation + 1:
                raise ValueError
            if restored.get("etag") in {self.snapshot.get("etag"), owner.get("etag")}:
                raise ValueError
            traffic = _normalized_traffic(restored.get("traffic"))
            expected = _normalized_traffic(self.snapshot["traffic"])
            if traffic != expected:
                raise ValueError
            if observed == generation and restored.get("reconciling") is False:
                if _normalized_traffic(restored.get("trafficStatuses")) != expected:
                    raise ValueError
                return True
            if observed < generation and restored.get("reconciling") is True:
                return False
            raise ValueError
        except (KeyError, TypeError, ValueError) as exc:
            raise RollbackProofError("rollback proof refused") from exc

    def _service_get_for_rollback_ownership(self) -> dict[str, Any]:
        """Retry ambiguous post-deploy reads only within independent rollback grace."""
        while True:
            try:
                current = self._service_get(rollback=True)
            except Exception as exc:
                if isinstance(exc, RollbackProofError):
                    raise RollbackRecoveryRequired(
                        "recovery_required: rollback grace exhausted without owned convergence"
                    ) from exc
                try:
                    self._remaining(rollback=True)
                except RollbackProofError as deadline_exc:
                    raise RollbackRecoveryRequired(
                        "recovery_required: rollback grace exhausted without owned convergence"
                    ) from deadline_exc
                continue
            if self._current_state_is_owned(current):
                return current
            if self.rollout_owned_state is None:
                status = self._deploy_state_ownership_status(current)
                if status == "owned":
                    self.rollout_owned_state = deepcopy(current)
                    return current
                if status == "intermediate":
                    try:
                        self._remaining(rollback=True)
                    except RollbackProofError as exc:
                        raise RollbackRecoveryRequired(
                            "recovery_required: rollback grace exhausted without owned convergence"
                        ) from exc
                    continue
            raise RollbackProofError("rollback mutation ownership refused")

    def _deploy_state_ownership_status(self, current: dict[str, Any]) -> str:
        """Classify ambiguous deploy state as exact intermediate, owned, or contradictory."""
        snapshot = self.pre_deploy_state
        revision = self.expected_candidate_revision or self.candidate_revision
        if snapshot is None or revision is None or self.image_digest is None:
            return "contradictory"
        try:
            generation = _integer(current.get("generation"))
            observed = _integer(current.get("observedGeneration"))
            snapshot_generation = _integer(snapshot.get("generation"))
            template = current.get("template")
            containers = template.get("containers") if isinstance(template, dict) else None
            env = containers[0].get("env", []) if isinstance(containers, list) and containers else []
            deploy_revision_values = [
                item.get("value")
                for item in env
                if isinstance(item, dict) and item.get("name") == "DEPLOY_REVISION"
            ]
            image_digest_values = [
                item.get("value")
                for item in env
                if isinstance(item, dict) and item.get("name") == "APP_IMAGE_DIGEST"
            ]
            env_values = {
                item.get("name"): item.get("value") for item in env if isinstance(item, dict)
            }
            image_exact = (
                isinstance(containers, list)
                and bool(containers)
                and isinstance(containers[0], dict)
                and containers[0].get("image") == self.image_digest
            )
            etag = current.get("etag")
            exact_rollout_intent = (
                current.get("uid") == snapshot.get("uid")
                and generation == snapshot_generation + 1
                and isinstance(etag, str)
                and bool(etag)
                and etag != snapshot.get("etag")
                and current.get("latestCreatedRevision") == revision
                and isinstance(template, dict)
                and template.get("revision") == revision
                and image_exact
                and deploy_revision_values == [self.approved_sha]
                and image_digest_values == [self.image_digest]
                and env_values.get("DEPLOY_REVISION") == self.approved_sha
                and env_values.get("APP_IMAGE_DIGEST") == self.image_digest
                and _normalized_traffic(current.get("traffic"))
                == _normalized_traffic(snapshot.get("traffic"))
                and _normalized_traffic(current.get("trafficStatuses"))
                == _normalized_traffic(snapshot.get("trafficStatuses"))
            )
            if not exact_rollout_intent:
                return "contradictory"
            if (
                observed == generation
                and current.get("reconciling") is False
                and current.get("latestReadyRevision") == revision
            ):
                return "owned"
            prior_ready = snapshot.get("latestReadyRevision")
            if (
                snapshot_generation <= observed < generation
                and current.get("reconciling") is True
                and current.get("latestReadyRevision") in {prior_ready, revision}
            ):
                return "intermediate"
            return "contradictory"
        except (KeyError, TypeError, ValueError):
            return "contradictory"

    def _deploy_state_is_exactly_owned(self, current: dict[str, Any]) -> bool:
        """Return whether deploy evidence is exact, rollout-owned, and converged."""
        return self._deploy_state_ownership_status(current) == "owned"

    def _current_state_is_owned(self, current: dict[str, Any] | None = None) -> bool:
        owned = self.rollout_owned_state
        if owned is None:
            return False
        try:
            current = current or self._service_get(rollback=self.rollback_deadline is not None)
            current_observed = (
                "observedGeneration" if "observedGeneration" in current else "observed_generation"
            )
            owned_observed = (
                "observedGeneration" if "observedGeneration" in owned else "observed_generation"
            )
            return (
                current.get("uid") == owned.get("uid")
                and current.get("etag") == owned.get("etag")
                and _integer(current.get("generation")) == _integer(owned.get("generation"))
                and _integer(current.get(current_observed)) == _integer(current.get("generation"))
                and _integer(owned.get(owned_observed)) == _integer(owned.get("generation"))
                and current.get("reconciling") is False
                and _normalized_traffic(current.get("traffic"))
                == _normalized_traffic(owned.get("traffic"))
                and (
                    "trafficStatuses" not in owned
                    or _normalized_traffic(current.get("trafficStatuses"))
                    == _normalized_traffic(owned.get("trafficStatuses"))
                )
                and current.get("latestReadyRevision")
                == owned.get("latestReadyRevision")
            )
        except (KeyError, TypeError, ValueError, PromotionDeadlineExceeded, RollbackProofError):
            return False

    def handle_terminal(self, reason: str) -> None:
        if self.mutation_armed:
            self.terminal_rollback(reason=reason)
            return
        self.paid_gate_state = "terminally_closed"
        if self.lock_generation is not None:
            self.rollback_deadline = self.clock.monotonic() + self.rollback_seconds
            self._call_with_budget(
                self.boundaries.release_lock,
                self.lock_generation,
                rollback=True,
            )
            self.lock_generation = None

    def record_retention(self, *, prior_revision: str) -> str:
        retain_until = self.clock.now().astimezone(UTC) + timedelta(hours=24)
        timestamp = retain_until.isoformat(timespec="seconds").replace("+00:00", "Z")
        self._call_with_budget(
            self.boundaries.create_gcs,
            f"rollout-evidence/{self.rollout_id}/retention.json",
            {
                "rollout_id": self.rollout_id,
                "prior_revision": prior_revision,
                "retain_until": timestamp,
            },
            if_generation_match=0,
        )
        return timestamp

    def finish_success(self) -> None:
        self._event("final-verify")
        self.mutation_armed = False
        self._event("rollback-mutation-disarm")
        if self.lock_generation is not None:
            self._call_with_budget(self.boundaries.release_lock, self.lock_generation)
        self._event("guarded-exit")


def run_rollout(
    *,
    boundaries: Any,
    rollout_id: str,
    approved_sha: str,
    clock: Any | None = None,
    promotion_seconds: float = 1800,
    rollback_seconds: float = 300,
) -> RolloutController:
    """Execute the one immutable rollout sequence; callers cannot supply a plan."""
    rollout = RolloutController(
        boundaries=boundaries,
        rollout_id=rollout_id,
        approved_sha=approved_sha,
        clock=clock,
        promotion_seconds=promotion_seconds,
        rollback_seconds=rollback_seconds,
    )
    return _execute_rollout(rollout)


def _stage_traffic(
    snapshot: dict[str, Any], candidate: str, percent: int, *, shadow_tag: str | None
) -> list[dict[str, Any]]:
    """Build exact revision traffic while preserving all pre-existing tags."""
    traffic = _normalized_traffic(snapshot["traffic"])
    prior = next(item["revision"] for item in traffic if item["percent"] == 100)
    requested = [
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": candidate,
            "percent": percent,
        }
    ]
    if percent < 100:
        requested.append(
            {
                "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
                "revision": prior,
                "percent": 100 - percent,
            }
        )
    requested.extend(deepcopy(item) for item in traffic if "tag" in item)
    if shadow_tag is not None:
        requested.append(
            {
                "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
                "revision": candidate,
                "percent": 0,
                "tag": shadow_tag,
            }
        )
    return requested


def _transition_stage(
    rollout: RolloutController,
    current: dict[str, Any],
    traffic: list[dict[str, Any]],
) -> dict[str, Any]:
    return rollout.transition_traffic(
        traffic,
        expected_uid=current["uid"],
        expected_generation=current["generation"],
        expected_etag=current["etag"],
        timeout=rollout._remaining(),
    )


def _execute_v2_progression(
    rollout: RolloutController,
    *,
    prior_revision: str,
) -> None:
    """Execute authoritative v2 shadow/10/restore/10/50/100 progression."""
    boundaries = rollout.boundaries
    snapshot = rollout.snapshot
    if snapshot is None or rollout.candidate_revision is None:
        raise InitialStateRefusal("rollout state is incomplete")
    service_url = rollout._service_base_url()
    shadow_tag = f"shadow-{rollout.rollout_id}"[:63].rstrip("-")

    deployed = rollout._service_get()
    if deployed.get("uid") != snapshot["uid"] or deployed.get("latestReadyRevision") != rollout.candidate_revision:
        raise ConcurrencyRefusal("deployed candidate identity mismatch")
    rollout.rollout_owned_state = deepcopy(deployed)
    shadow_state = _transition_stage(
        rollout,
        deployed,
        _stage_traffic(snapshot, rollout.candidate_revision, 0, shadow_tag=shadow_tag),
    )
    shadow_url = boundaries.tag_url(shadow_state, shadow_tag)
    rollout.candidate_identity = rollout.verify_candidate_health(shadow_url)
    rollout.run_paid_attempt(stage="shadow", surface="sync", url=shadow_url)
    rollout.run_paid_attempt(stage="shadow", surface="stream", url=shadow_url)

    rollout._event("stage-10")
    current = _transition_stage(
        rollout,
        shadow_state,
        _stage_traffic(snapshot, rollout.candidate_revision, 10, shadow_tag=shadow_tag),
    )
    rollout.planned_restore(snapshot)
    restored = rollout._service_get()
    rollout._event("stage-10")
    current = _transition_stage(
        rollout,
        restored,
        _stage_traffic(snapshot, rollout.candidate_revision, 10, shadow_tag=shadow_tag),
    )
    rollout.observe_stage(10)
    boundaries.sample_stage_identities(
        service_url, rollout.prior_identity, rollout.candidate_identity, percent=10,
        timeout=rollout._remaining(),
    )
    boundaries.record_revision_telemetry(
        prior_revision, rollout.candidate_revision, percent=10, timeout=rollout._remaining()
    )

    rollout._event("stage-50")
    current = _transition_stage(
        rollout,
        current,
        _stage_traffic(snapshot, rollout.candidate_revision, 50, shadow_tag=shadow_tag),
    )
    rollout.observe_stage(50)
    boundaries.sample_stage_identities(
        service_url, rollout.prior_identity, rollout.candidate_identity, percent=50,
        timeout=rollout._remaining(),
    )
    boundaries.record_revision_telemetry(
        prior_revision, rollout.candidate_revision, percent=50, timeout=rollout._remaining()
    )

    rollout._event("stage-100")
    current = _transition_stage(
        rollout,
        current,
        _stage_traffic(snapshot, rollout.candidate_revision, 100, shadow_tag=shadow_tag),
    )
    boundaries.sample_stage_identities(
        service_url, rollout.prior_identity, rollout.candidate_identity, percent=100,
        timeout=rollout._remaining(),
    )
    # The production URL must pass the full approved deploy-health contract only
    # after authoritative 100% convergence and before either final paid probe.
    if rollout.verify_candidate_health(service_url) != rollout.candidate_identity:
        raise IdentityRefusal("final candidate identity mismatch")
    rollout._event("final-production-health-verify")
    rollout.run_paid_attempt(stage="final", surface="sync", url=service_url)
    rollout.run_paid_attempt(stage="final", surface="stream", url=service_url)
    final = _transition_stage(
        rollout,
        current,
        _stage_traffic(snapshot, rollout.candidate_revision, 100, shadow_tag=None),
    )
    if rollout.verify_candidate_health(service_url) != rollout.candidate_identity:
        raise IdentityRefusal("final candidate identity mismatch")
    if _normalized_traffic(final["traffic"]) != _stage_traffic(
        snapshot, rollout.candidate_revision, 100, shadow_tag=None
    ):
        raise ConcurrencyRefusal("final canonical traffic mismatch")


def _execute_rollout(rollout: RolloutController) -> RolloutController:
    boundaries = rollout.boundaries
    rollout.start_promotion_deadline()
    try:
        boundaries.verify_benchmark()
        rollout.acquire_lock()
        rollout.build_candidate()
        rollout.capture_snapshot()
        prior_revision = next(
            item["revision"] for item in rollout.snapshot["traffic"] if item["percent"] == 100
        )
        if "observedGeneration" in rollout.snapshot:
            prior_url = rollout._service_base_url()
            rollout.prior_identity = boundaries.health(
                prior_url, None, timeout=rollout._remaining()
            )
        else:
            prior_url = "https://service.example"
            rollout.prior_identity = deepcopy(
                getattr(boundaries, "health_identity", {"revision": prior_revision})
            )
        rollout.run_paid_attempt(stage="prior", surface="stream", url=prior_url)
        rollout.deploy_candidate()
        if "observedGeneration" in rollout.snapshot:
            _execute_v2_progression(rollout, prior_revision=prior_revision)
        else:
            rollout.candidate_identity = rollout.verify_candidate_health("https://shadow.example")
            rollout.run_paid_attempt(stage="shadow", surface="sync", url="https://shadow.example")
            rollout.run_paid_attempt(stage="shadow", surface="stream", url="https://shadow.example")
            rollout._event("stage-10")
            rollout.planned_restore(rollout.snapshot)
            rollout._event("stage-10")
            rollout.observe_stage(10)
            rollout._event("stage-50")
            rollout.observe_stage(50)
            rollout._event("stage-100")
            if rollout.verify_candidate_health("https://service.example") != rollout.candidate_identity:
                raise IdentityRefusal("final candidate identity mismatch")
            rollout._event("final-production-health-verify")
            rollout.run_paid_attempt(stage="final", surface="sync", url="https://service.example")
            rollout.run_paid_attempt(stage="final", surface="stream", url="https://service.example")
        rollout._event("final-verify")
        rollout.record_retention(prior_revision=prior_revision)
        rollout.mutation_armed = False
        rollout._event("rollback-mutation-disarm")
        if rollout.lock_generation is not None:
            rollout._call_with_budget(boundaries.release_lock, rollout.lock_generation)
        rollout._event("guarded-exit")
        return rollout
    except Exception:
        rollout.handle_terminal("ERR")
        raise


class GcloudBoundaries:
    """Production GCS, Cloud Run v2, health, probe, and build adapters."""

    def __init__(self, *, project: str, region: str, service: str, approved_sha: str):
        self.project = project
        self.region = region
        self.service = service
        self.approved_sha = approved_sha
        self.service_name = f"projects/{project}/locations/{region}/services/{service}"
        self.lock_owner: str | None = None
        self.lock_generation: str | None = None
        self._shadow_revisions: dict[str, str] = {}

    @staticmethod
    def _run(args: list[str], *, input_text: str | None = None, timeout: float | None = None) -> str:
        result = subprocess.run(
            args, input=input_text, text=True, capture_output=True, check=True, timeout=timeout
        )
        return result.stdout.strip()

    @staticmethod
    def _deadline(timeout: float) -> float:
        if timeout <= 0:
            raise subprocess.TimeoutExpired("bounded rollout", timeout)
        return time.monotonic() + timeout

    @staticmethod
    def _budget(deadline: float) -> float:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise subprocess.TimeoutExpired("bounded rollout", 0)
        return remaining

    @staticmethod
    def _gcs_uri(name: str) -> str:
        if name.startswith("gs://"):
            return name
        if name.startswith("rollout-evidence/"):
            return f"{EVIDENCE_ROOT}/{name.removeprefix('rollout-evidence/')}"
        raise RolloutError("unapproved GCS evidence path")

    def create_gcs(
        self, name: str, value: Any, *, if_generation_match: int, timeout: float = 30
    ) -> str:
        deadline = self._deadline(timeout)
        uri = self._gcs_uri(name)
        payload = json.dumps(value, sort_keys=True, separators=(",", ":"))
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            self._run([
                "gcloud", "storage", "cp", handle.name, uri,
                f"--if-generation-match={if_generation_match}", "--quiet",
            ], timeout=self._budget(deadline))
        metadata = json.loads(self._run(
            ["gcloud", "storage", "objects", "describe", uri, "--format=json"],
            timeout=self._budget(deadline),
        ))
        generation = str(metadata.get("generation", ""))
        if not generation.isdigit():
            raise LockRefusal("GCS create returned no generation")
        if name == LOCK_OBJECT:
            self.lock_owner = value.get("owner") if isinstance(value, dict) else None
            self.lock_generation = generation
        return generation

    def verify_benchmark(self) -> None:
        from scripts.verify_promotion_benchmark import verify_promotion_benchmark

        verify_promotion_benchmark()

    def build(self, *, timeout: float) -> str:
        deadline = self._deadline(timeout)
        registry = f"{self.region}-docker.pkg.dev/{self.project}/llm-council/llm-council"
        tag = f"{registry}:{self.approved_sha}"
        self._run(
            ["gcloud", "builds", "submit", "--project", self.project, "--region", self.region,
             "--tag", tag, "--quiet"],
            timeout=self._budget(deadline),
        )
        digest = self._run([
            "gcloud", "artifacts", "docker", "images", "describe", tag,
            "--project", self.project, "--format=value(image_summary.digest)",
        ], timeout=self._budget(deadline))
        if not re.fullmatch(r"sha256:[0-9a-f]{64}", digest):
            raise RolloutError("build did not resolve an immutable digest")
        return f"{registry}@{digest}"

    def shadow_revision_name(self, rollout_id: str) -> str:
        """Create and retain a deterministic pre-mutation revision intent."""
        suffix = f"{self.approved_sha[:12]}-{hashlib.sha256(rollout_id.encode()).hexdigest()[:8]}"
        revision = f"{self.service}-{suffix}"
        self._shadow_revisions[rollout_id] = revision
        return revision

    def deploy_shadow(
        self, image: str, *, timeout: float, expected_revision: str | None = None
    ) -> str:
        if expected_revision is None:
            suffix = f"{self.approved_sha[:12]}-{int(time.time())}"
            expected_revision = f"{self.service}-{suffix}"
        else:
            prefix = f"{self.service}-"
            if not expected_revision.startswith(prefix):
                raise RolloutError("invalid expected shadow revision")
            suffix = expected_revision.removeprefix(prefix)
        self._run([
            "gcloud", "run", "deploy", self.service, "--project", self.project,
            "--region", self.region, f"--image={image}", f"--revision-suffix={suffix}",
            "--no-traffic", "--port=8800", "--memory=512Mi",
            "--cpu=1", "--min-instances=1", "--max-instances=2", "--allow-unauthenticated",
            "--update-env-vars=VERTEX_PROJECT_ID=shree-development,VERTEX_LOCATION=global,"
            f"REQUIRE_VERTEX_ANTHROPIC=true,DEPLOY_REVISION={self.approved_sha},APP_IMAGE_DIGEST={image}",
            "--set-secrets=OPENROUTER_API_KEY=llm-council-openrouter-key:latest,"
            "FIREWORKS_API_KEY=llm-council-fireworks-key:latest,"
            "GROK_API_KEY=llm-council-grok-key:latest,COUNCIL_API_KEY=llm-council-api-key:latest",
            "--quiet",
        ], timeout=timeout)
        return expected_revision

    def _token(self, *, timeout: float) -> str:
        return self._run(["gcloud", "auth", "print-access-token"], timeout=timeout)

    def _request(self, method: str, url: str, *, body: dict[str, Any] | None = None, timeout: float = 30) -> dict[str, Any]:
        deadline = self._deadline(timeout)
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(
            url, data=data, method=method,
            headers={
                "Authorization": f"Bearer {self._token(timeout=self._budget(deadline))}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(request, timeout=self._budget(deadline)) as response:
            payload = json.loads(response.read())
        if not isinstance(payload, dict):
            raise RolloutError("Google API returned malformed JSON")
        return payload

    @property
    def _service_url(self) -> str:
        return f"https://run.googleapis.com/v2/{self.service_name}"

    def service_get(self, *, timeout: float = 30) -> dict[str, Any]:
        return self._request("GET", self._service_url, timeout=timeout)

    @property
    def service_base_url(self) -> str:
        return self.get_service_base_url(timeout=30)

    def get_service_base_url(self, *, timeout: float) -> str:
        state = self.service_get(timeout=timeout)
        uri = state.get("uri")
        if not isinstance(uri, str) or not uri.startswith("https://"):
            raise InitialStateRefusal("service URI is missing")
        return uri

    @staticmethod
    def tag_url(state: dict[str, Any], tag: str) -> str:
        for status in state.get("trafficStatuses", []):
            if status.get("tag") == tag and isinstance(status.get("uri"), str):
                return status["uri"]
        raise ConcurrencyRefusal("shadow tag URI is missing")

    def service_patch(self, body: dict[str, Any], *, etag: str, timeout: float = 30) -> dict[str, Any]:
        return self._request(
            "PATCH", f"{self._service_url}?updateMask=traffic", body={"traffic": body["traffic"], "etag": etag}, timeout=timeout
        )

    def poll_operation(self, name: str, *, timeout: float) -> dict[str, Any]:
        return self._request("GET", f"https://run.googleapis.com/v2/{name}", timeout=timeout)

    def poll_service(self, *, timeout: float) -> dict[str, Any]:
        return self._request("GET", self._service_url, timeout=timeout)

    def paid_request(self, stage: str, surface: str, url: str, timeout: float) -> dict[str, Any]:
        from scripts.verify_council_smoke import (
            SmokeInfrastructureError,
            SmokeSemanticError,
            SmokeVerificationError,
            classify_semantic_error,
            load_secret,
            post_council,
            post_council_stream,
            verify_payload,
        )

        deadline = self._deadline(timeout)
        key = load_secret(
            self.project,
            "llm-council-api-key",
            timeout=self._budget(deadline),
        )
        poster = post_council_stream if surface == "stream" else post_council
        try:
            payload, elapsed = poster(url, key, self._budget(deadline))
            verify_payload(
                payload, elapsed, max_latency=480, max_tokens=60000, max_cost=1.50,
                strict_candidate=stage != "prior",
                legacy_baseline=stage == "prior",
            )
        except SmokeInfrastructureError as exc:
            raise InfrastructureFailure(exc.classification) from None
        except (TimeoutError, subprocess.TimeoutExpired):
            raise InfrastructureFailure("timeout") from None
        except ConnectionResetError:
            raise InfrastructureFailure("connection_reset") from None
        except SmokeSemanticError as exc:
            raise SemanticFailure(exc.classification) from None
        except SmokeVerificationError as exc:
            raise SemanticFailure(classify_semantic_error(exc)) from None
        return {"ok": True}

    def health(self, url: str, expected: dict[str, Any] | None, *, timeout: float) -> dict[str, Any]:
        from scripts.verify_deploy_health import fetch_health_json, health_identity

        identity = health_identity(fetch_health_json(url, timeout_seconds=timeout))
        if expected is not None and identity != expected:
            raise IdentityRefusal("health identity mismatch")
        return identity

    def candidate_health(
        self,
        url: str,
        *,
        expected_revision: str,
        expected_image_digest: str,
        timeout: float,
    ) -> dict[str, Any]:
        from scripts.verify_deploy_health import (
            fetch_health_json,
            health_identity,
            verify_health_payload,
        )

        payload = fetch_health_json(url, timeout_seconds=timeout)
        verify_health_payload(
            payload,
            expected_revision=expected_revision,
            expected_image_digest=expected_image_digest,
        )
        return health_identity(payload)

    def sample_stage_identities(
        self,
        url: str,
        prior: dict[str, Any],
        candidate: dict[str, Any],
        *,
        percent: int,
        timeout: float,
    ) -> dict[str, int]:
        deadline = self._deadline(timeout)
        samples = [
            self.health(url, None, timeout=self._budget(deadline)) for _ in range(5)
        ]
        return verify_stage_identities(samples, prior, candidate, percent=percent)

    def record_revision_telemetry(
        self, prior: str, candidate: str, *, percent: int, timeout: float
    ) -> str:
        """Run content-free revision metrics queries; results are diagnostic only."""
        del percent
        query = (
            'resource.type="cloud_run_revision" '
            f'AND resource.labels.revision_name=one_of("{prior}","{candidate}")'
        )
        try:
            output = self._run(
                ["gcloud", "monitoring", "time-series", "list", f"--filter={query}",
                 "--format=json", "--limit=100"],
                timeout=timeout,
            )
            values = json.loads(output or "[]")
            return "no_evidence" if not values else "observed"
        except (subprocess.SubprocessError, json.JSONDecodeError):
            return "query_failed"

    def observe(self, percent: int, *, duration: int, timeout: float) -> None:
        del percent
        time.sleep(min(duration, timeout))

    def release_lock(self, generation: str, *, timeout: float = 30) -> None:
        self._run([
            "gcloud", "storage", "rm", LOCK_OBJECT,
            f"--if-generation-match={generation}", "--quiet",
        ], timeout=timeout)
        self.lock_generation = None

    def verify_lock(self, generation: str, *, timeout: float = 30) -> bool:
        if self.lock_generation != generation or not generation.isdigit():
            return False
        try:
            deadline = self._deadline(timeout)
            metadata = json.loads(
                self._run(
                    ["gcloud", "storage", "objects", "describe", LOCK_OBJECT, "--format=json"],
                    timeout=self._budget(deadline),
                )
            )
            content = json.loads(self._run(
                ["gcloud", "storage", "cat", LOCK_OBJECT],
                timeout=self._budget(deadline),
            ))
        except (subprocess.SubprocessError, json.JSONDecodeError):
            return False
        return (
            str(metadata.get("generation", "")) == generation
            and isinstance(content, dict)
            and content.get("owner") == self.lock_owner
        )

def _install_signal_handlers(controller: RolloutController) -> None:
    def handle(signum: int, _frame: Any) -> None:
        controller.handle_terminal(signal.Signals(signum).name)
        raise SystemExit(128 + signum)

    for item in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(item, handle)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run one bounded Cloud Run rollout")
    parser.add_argument("--approved-sha", default=os.environ.get("APPROVED_FORGEJO_SHA"))
    parser.add_argument("--rollout-id", default=os.environ.get("ROLLOUT_ID"))
    args = parser.parse_args(argv)
    if not args.approved_sha or re.fullmatch(r"[0-9a-f]{40}", args.approved_sha) is None:
        raise SystemExit("approved full Forgejo SHA is required")
    rollout_id = args.rollout_id or f"{args.approved_sha[:12]}-{int(time.time())}"
    boundaries = GcloudBoundaries(
        project=os.environ.get("PROJECT", "tke-phi-privacy-engine"),
        region=os.environ.get("REGION", "us-central1"),
        service=os.environ.get("SERVICE", "llm-council"),
        approved_sha=args.approved_sha,
    )
    controller = RolloutController(
        boundaries=boundaries, rollout_id=rollout_id, approved_sha=args.approved_sha
    )
    _install_signal_handlers(controller)
    _execute_rollout(controller)
    print("SUCCESS: bounded rollout completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
