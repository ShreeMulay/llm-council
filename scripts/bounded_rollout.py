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
import uuid
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
RESUME_MANIFEST_ROOT = f"{EVIDENCE_ROOT}/resume-after-prior-v1"
RESUME_MODE = "resume-after-prior-v1"
SHADOW_RESUME_MANIFEST_ROOT = f"{EVIDENCE_ROOT}/resume-after-shadow-v1"
SHADOW_CLAIMS_ROOT = "rollout-evidence/resume-after-shadow-v1/claims"
RESUME_AFTER_SHADOW_MODE = "resume-after-shadow-v1"
FRESH_MODE = "fresh"
PROJECT = "tke-phi-privacy-engine"
REGION = "us-central1"
SERVICE = "llm-council"
# Compatibility exports for existing pure tests; production code cannot override these.
FIXED_PROJECT = PROJECT
FIXED_REGION = REGION
FIXED_SERVICE = SERVICE
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
MAX_PAID_ATTEMPTS = 6
INCIDENT_TARGET_SHA = "000754f3c963c002b25a35f0b13a7c01a69510f9"
INCIDENT_SOURCE_RUN = "000754f3c963-1783979097"
INCIDENT_PRIOR_MANIFEST_URI = (
    f"{RESUME_MANIFEST_ROOT}/000754f3c963-resume-v2.json"
)
INCIDENT_PRIOR_MANIFEST_GENERATION = "1783979022365682"
INCIDENT_RECOVERY_GENERATION = "1783980208306954"
INCIDENT_CANDIDATE_REVISION = "llm-council-000754f3c963-9b63e747"
INCIDENT_CANDIDATE_DIGEST = (
    "sha256:b34c651fcbc29f8b6491bfd8ecdf0d7abe7b954d814a750c7ea3a7621dec10c2"
)
INCIDENT_SERVICE_UID = "a74ded22-b26a-408d-80e8-dadf4fe454dd"
INCIDENT_SERVICE_GENERATION = 87


def validate_production_namespace(project: Any, region: Any, service: Any) -> None:
    """Refuse every production namespace except the compiled deployment target."""
    if (
        type(project) is not str
        or type(region) is not str
        or type(service) is not str
        or project != FIXED_PROJECT
        or region != FIXED_REGION
        or service != FIXED_SERVICE
    ):
        raise SourceBindingError("production namespace override refused")


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


class ResumeRefusal(RolloutError):
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


def validate_resume_inputs(
    mode: Any,
    prior_paid_attempts: Any,
    manifest_uri: Any = None,
    manifest_generation: Any = None,
) -> tuple[str, int, str | None, str | None]:
    """Accept only the two explicit authorization tuples."""
    if type(prior_paid_attempts) is not int:
        raise ValueError("prior paid attempts must be exactly 0, 2, or 4")
    if mode == FRESH_MODE:
        if prior_paid_attempts != 0 or manifest_uri not in {None, ""} or manifest_generation not in {None, ""}:
            raise ValueError("fresh mode forbids resume authorization")
        return FRESH_MODE, 0, None, None
    if mode == RESUME_AFTER_SHADOW_MODE:
        if prior_paid_attempts != 4:
            raise ValueError("resume-after-shadow-v1 requires prior paid attempts equal to 4")
        if not isinstance(manifest_uri, str) or not manifest_uri.startswith(
            f"{SHADOW_RESUME_MANIFEST_ROOT}/"
        ):
            raise ValueError("shadow resume manifest URI is outside the approved evidence prefix")
        suffix = manifest_uri.removeprefix(f"{SHADOW_RESUME_MANIFEST_ROOT}/")
        if (
            not suffix
            or "/" in suffix
            or not suffix.endswith(".json")
            or any(part in suffix for part in ("#", "?"))
        ):
            raise ValueError("shadow resume manifest URI is malformed")
        if not isinstance(manifest_generation, str) or not re.fullmatch(
            r"[1-9][0-9]*", manifest_generation
        ):
            raise ValueError("exact shadow resume manifest generation is required")
        return RESUME_AFTER_SHADOW_MODE, 4, manifest_uri, manifest_generation
    if mode != RESUME_MODE or prior_paid_attempts != 2:
        raise ValueError("resume-after-prior-v1 requires prior paid attempts equal to 2")
    if not isinstance(manifest_uri, str) or not manifest_uri.startswith(f"{RESUME_MANIFEST_ROOT}/"):
        raise ValueError("resume manifest URI is outside the approved evidence prefix")
    suffix = manifest_uri.removeprefix(f"{RESUME_MANIFEST_ROOT}/")
    if not suffix or "/" in suffix or not suffix.endswith(".json") or any(part in suffix for part in ("#", "?")):
        raise ValueError("resume manifest URI is malformed")
    if not isinstance(manifest_generation, str) or not re.fullmatch(r"[1-9][0-9]*", manifest_generation):
        raise ValueError("exact resume manifest generation is required")
    return RESUME_MODE, 2, manifest_uri, manifest_generation


def validate_prior_paid_attempts(value: Any) -> int:
    """Compatibility validator for a fresh ledger or the sole approved resume count."""
    if type(value) is not int:
        raise ValueError("prior paid attempts must be exactly 0 or 2")
    if value == 0:
        return 0
    if value == 2:
        return 2
    raise ValueError("prior paid attempts must be exactly 0 or 2")


def normalize_revision_reference(value: Any) -> str:
    """Return a short revision ID only from the exact service namespace."""
    if not isinstance(value, str):
        raise ConcurrencyRefusal("revision reference refused")
    revision_pattern = r"[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?"
    if re.fullmatch(revision_pattern, value):
        return value
    prefix = (
        f"projects/{FIXED_PROJECT}/locations/{FIXED_REGION}/services/"
        f"{FIXED_SERVICE}/revisions/"
    )
    if value.startswith(prefix) and re.fullmatch(revision_pattern, value.removeprefix(prefix)):
        return value.removeprefix(prefix)
    raise ConcurrencyRefusal("revision reference refused")


def _canonical_sha256(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _normalized_reconciling(state: Any) -> bool:
    """Normalize only protobuf-JSON omission; reject explicit malformed values."""
    if not isinstance(state, dict):
        raise ValueError
    if "reconciling" not in state:
        return False
    value = state["reconciling"]
    if not isinstance(value, bool):
        raise ValueError
    return value


def _normalized_traffic(items: Any) -> list[dict[str, Any]]:
    """Normalize and validate exact Cloud Run revision+tag target semantics."""
    if not isinstance(items, list) or not items:
        raise ValueError
    normalized = []
    target_identities: set[tuple[str, str | None]] = set()
    tags: set[str] = set()
    for raw in items:
        if not isinstance(raw, dict):
            raise ValueError
        allowed = {"type", "revision", "percent", "tag", "uri"}
        if not set(raw) <= allowed:
            raise ValueError
        target_type = raw.get("type")
        revision = raw.get("revision")
        percent = raw.get("percent", 0)
        if target_type is not None and (
            not isinstance(target_type, str) or not target_type
        ):
            raise ValueError
        if not isinstance(revision, str) or not revision:
            raise ValueError
        if isinstance(percent, bool) or not isinstance(percent, int) or not 0 <= percent <= 100:
            raise ValueError
        item = {key: deepcopy(value) for key, value in raw.items() if key != "uri"}
        item["percent"] = percent
        if "tag" in item and (not isinstance(item["tag"], str) or not item["tag"]):
            raise ValueError
        tag = item.get("tag")
        identity = (revision, tag)
        if identity in target_identities or (tag is not None and tag in tags):
            raise ValueError
        target_identities.add(identity)
        if tag is not None:
            tags.add(tag)
        normalized.append(item)
    if sum(item["percent"] for item in normalized) != 100:
        raise ValueError
    return sorted(
        normalized,
        key=lambda item: (
            item.get("type", ""),
            item["revision"],
            item["percent"],
            "tag" in item,
            item.get("tag", ""),
        ),
    )


def _traffic_equal(left: Any, right: Any) -> bool:
    """Compare complete traffic targets without depending on API response order."""
    return _normalized_traffic(left) == _normalized_traffic(right)


def _expected_traffic_statuses(traffic: Any) -> list[dict[str, Any]]:
    """Project config traffic to the exact targets emitted in trafficStatuses."""
    normalized = _normalized_traffic(traffic)
    tagged_revisions = {
        item["revision"] for item in normalized if "tag" in item
    }
    return [
        item
        for item in normalized
        if not (
            item["percent"] == 0
            and "tag" not in item
            and item["revision"] in tagged_revisions
        )
    ]


def _traffic_sha256(items: Any) -> str:
    """Hash complete traffic semantics in canonical order."""
    return _canonical_sha256(_normalized_traffic(items))


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
        if observed != generation or _normalized_reconciling(state):
            raise ValueError
        traffic = _normalized_traffic(state.get("traffic"))
        statuses = _normalized_traffic(state.get("trafficStatuses"))
        if statuses != _expected_traffic_statuses(traffic):
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
    if prior == candidate:
        raise IdentityRefusal("prior and candidate identities must differ")
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
        prior_paid_attempts: int = 0,
        mode: str = FRESH_MODE,
        resume_manifest_uri: str | None = None,
        resume_manifest_generation: str | None = None,
    ):
        expected_namespace = {
            "project": FIXED_PROJECT,
            "region": FIXED_REGION,
            "service": FIXED_SERVICE,
        }
        for attribute, expected in expected_namespace.items():
            supplied = getattr(boundaries, attribute, None)
            if supplied != expected or type(supplied) is not str:
                raise SourceBindingError("production namespace override refused")
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
        (
            self.mode,
            self.attempt_count,
            self.resume_manifest_uri,
            self.resume_manifest_generation,
        ) = validate_resume_inputs(
            mode, prior_paid_attempts, resume_manifest_uri, resume_manifest_generation
        )
        self.resume_manifest: dict[str, Any] | None = None
        self.target_sha = approved_sha
        self.continuation_claim: str | None = None
        self.retry_consumed = False
        self.lock_generation: str | None = None
        self.snapshot: dict[str, Any] | None = None
        self.prior_identity: dict[str, Any] | None = None
        self.prior_service_url: str | None = None
        self.candidate_identity: dict[str, Any] | None = None
        self.candidate_revision: str | None = None
        self.image_digest: str | None = None
        self.mutation_armed = False
        self.rollout_owned_state: dict[str, Any] | None = None
        self.pre_deploy_state: dict[str, Any] | None = None
        self.expected_candidate_revision: str | None = None
        self.candidate_revision_state: dict[str, Any] | None = None
        self.pending_transition: dict[str, Any] | None = None

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
        del rollback
        if self.prior_service_url is None:
            raise InitialStateRefusal("captured service URI is unavailable")
        return self.prior_service_url

    @staticmethod
    def _condition_truth(condition: dict[str, Any]) -> bool | None:
        value = condition.get("status", condition.get("state"))
        if value is True or value in {"True", "CONDITION_SUCCEEDED"}:
            return True
        if value is False or value in {"False", "CONDITION_FAILED"}:
            return False
        return None

    def validate_candidate_revision(self, state: Any) -> dict[str, Any]:
        """Validate the exact ready revision retained after a zero-traffic deploy."""
        revision = self.expected_candidate_revision or self.candidate_revision
        if revision is None or self.image_digest is None:
            raise ConcurrencyRefusal("candidate revision intent is incomplete")
        name_factory = getattr(self.boundaries, "revision_resource_name", lambda value: value)
        try:
            if (
                not isinstance(state, dict)
                or self._revision(state.get("name")) != self._revision(name_factory(revision))
            ):
                raise ValueError
            containers = state.get("containers")
            if containers is None and isinstance(state.get("spec"), dict):
                containers = state["spec"].get("containers")
            if not isinstance(containers, list) or len(containers) != 1:
                raise ValueError
            container = containers[0]
            if not isinstance(container, dict) or container.get("image") != self.image_digest:
                raise ValueError
            env_values: dict[str, list[Any]] = {}
            for item in container.get("env", []):
                if not isinstance(item, dict) or not isinstance(item.get("name"), str):
                    raise ValueError
                env_values.setdefault(item["name"], []).append(item.get("value"))
            if env_values.get("DEPLOY_REVISION") != [self.target_sha]:
                raise ValueError
            if env_values.get("APP_IMAGE_DIGEST") != [self.image_digest]:
                raise ValueError
            conditions = state.get("conditions")
            if conditions is None and isinstance(state.get("status"), dict):
                conditions = state["status"].get("conditions")
            if not isinstance(conditions, list):
                raise ValueError
            allowed_condition_types = {
                "Ready",
                "ContainerReady",
                "Active",
                "ResourcesAvailable",
                "MinInstancesProvisioned",
            }
            known_condition_states = {
                "CONDITION_SUCCEEDED",
                "CONDITION_FAILED",
                "CONDITION_RECONCILING",
            }
            by_type: dict[str, dict[str, Any]] = {}
            for condition in conditions:
                if not isinstance(condition, dict) or not isinstance(condition.get("type"), str):
                    raise ValueError
                if condition["type"] not in allowed_condition_types:
                    raise ValueError
                if condition.get("state") not in known_condition_states:
                    raise ValueError
                if condition["type"] in by_type:
                    raise ValueError
                if "status" in condition and self._condition_truth({
                    "status": condition["status"]
                }) != self._condition_truth({"state": condition.get("state")}):
                    raise ValueError
                by_type[condition["type"]] = condition
            ready = by_type.get("Ready", {})
            if (
                ready.get("state") != "CONDITION_SUCCEEDED"
                or ready.get("revisionReason") != "RETIRED"
            ):
                raise ValueError
            container_ready = by_type.get("ContainerReady", {})
            if container_ready.get("state") != "CONDITION_SUCCEEDED":
                raise ValueError

            retired_exceptions: dict[str, dict[str, Any]] = {
                "Active": {
                    "state": "CONDITION_FAILED",
                    "severity": "INFO",
                    "revisionReason": "RETIRED",
                },
                "ResourcesAvailable": {
                    "state": "CONDITION_RECONCILING",
                    "severity": None,
                    "revisionReason": "RETIRED",
                },
                "MinInstancesProvisioned": {
                    "state": "CONDITION_FAILED",
                    "severity": "INFO",
                    "revisionReason": "MIN_INSTANCES_NOT_PROVISIONED",
                },
            }
            for kind, expected in retired_exceptions.items():
                condition = by_type.get(kind)
                if kind == "Active" and condition is None:
                    raise ValueError
                if condition is not None and any(
                    condition.get(field) != value for field, value in expected.items()
                ):
                    raise ValueError
            if any(
                condition.get("state")
                in {"CONDITION_FAILED", "CONDITION_RECONCILING"}
                for kind, condition in by_type.items()
                if kind not in retired_exceptions
            ):
                raise ValueError
        except (KeyError, TypeError, ValueError) as exc:
            raise ConcurrencyRefusal("candidate revision resource refused") from exc
        self.candidate_revision_state = deepcopy(state)
        return deepcopy(state)

    def fetch_candidate_revision(self, *, rollback: bool = False) -> dict[str, Any]:
        revision = self.expected_candidate_revision or self.candidate_revision
        method = getattr(self.boundaries, "revision_get", None)
        if revision is None or method is None:
            raise ConcurrencyRefusal("candidate revision boundary is missing")
        state = self._call_with_budget(method, revision, rollback=rollback)
        return self.validate_candidate_revision(state)

    def acquire_lock(self) -> None:
        owner = self.rollout_id
        try:
            lock_value = {"rollout_id": self.rollout_id, "owner": owner}
            if self.mode in {RESUME_MODE, RESUME_AFTER_SHADOW_MODE}:
                if self.resume_manifest_uri is None or self.resume_manifest_generation is None:
                    raise ResumeRefusal("resume lock binding is incomplete")
                lock_value.update(
                    resume_mode=self.mode,
                    resume_manifest_uri=self.resume_manifest_uri,
                    resume_manifest_generation=self.resume_manifest_generation,
                    target_sha=self.target_sha,
                )
                if self.mode == RESUME_AFTER_SHADOW_MODE:
                    lock_value["controller_sha"] = self.approved_sha
            generation = self._call_with_budget(
                self.boundaries.create_gcs,
                LOCK_OBJECT,
                lock_value,
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

    def _read_resume_object(self, uri: Any, generation: Any) -> dict[str, Any]:
        if (
            not isinstance(uri, str)
            or not uri.startswith(f"{EVIDENCE_ROOT}/")
            or "#" in uri
            or "?" in uri
            or not isinstance(generation, str)
            or re.fullmatch(r"[1-9][0-9]*", generation) is None
        ):
            raise ResumeRefusal("resume evidence reference refused")
        method = getattr(self.boundaries, "read_gcs_generation", None)
        if method is None:
            raise ResumeRefusal("exact-generation evidence boundary is missing")
        try:
            value = self._call_with_budget(method, uri, generation)
        except Exception as exc:
            raise ResumeRefusal("resume evidence generation could not be read") from exc
        if not isinstance(value, dict):
            raise ResumeRefusal("resume evidence object must be JSON object")
        return value

    def _revision(self, value: Any) -> str:
        return normalize_revision_reference(value)

    def _validate_resume_service(
        self, state: Any, manifest: dict[str, Any]
    ) -> tuple[dict[str, Any], str]:
        try:
            if "observedGeneration" in state:
                validated = validate_initial_service(state)
            else:
                validated = deepcopy(state)
                generation = _integer(validated["generation"])
                if (
                    _integer(validated["observed_generation"]) != generation
                    or _normalized_reconciling(validated)
                ):
                    raise ValueError
                traffic = _normalized_traffic(validated["traffic"])
                owners = [item for item in traffic if item["percent"] > 0]
                if len(owners) != 1 or owners[0]["percent"] != 100:
                    raise ValueError
                if not validated.get("uid") or not validated.get("etag"):
                    raise ValueError
            traffic = _normalized_traffic(validated["traffic"])
            owners = [item for item in traffic if item["percent"] > 0]
            prior = self._revision(owners[0]["revision"])
            if prior != self._revision(manifest["expected_prior_revision"]):
                raise ValueError
            uri = validated.get("uri")
            parsed = urllib.parse.urlsplit(uri) if isinstance(uri, str) else None
            if (
                parsed is None
                or parsed.scheme != "https"
                or not parsed.netloc
                or parsed.username is not None
                or parsed.password is not None
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError
            if not isinstance(uri, str):
                raise ValueError
            if hashlib.sha256(uri.encode()).hexdigest() != manifest["service_url_sha256"]:
                raise ValueError
            if _traffic_sha256(traffic) != manifest["traffic_sha256"]:
                raise ValueError
        except (KeyError, TypeError, ValueError, InitialStateRefusal, ConcurrencyRefusal) as exc:
            raise ResumeRefusal("resume service preflight refused") from exc
        return validated, prior

    def _verify_resume_evidence(self) -> tuple[dict[str, Any], dict[str, Any], str]:
        manifest = self._read_resume_object(
            self.resume_manifest_uri, self.resume_manifest_generation
        )
        manifest_fields = {
            "schema_version", "mode", "target_sha", "project", "region", "service",
            "cumulative_paid_attempts", "expected_prior_revision", "service_url_sha256",
            "traffic_sha256", "sources",
        }
        try:
            if set(manifest) != manifest_fields:
                raise ValueError
            if (
                type(manifest["schema_version"]) is not int
                or manifest["schema_version"] != 1
                or manifest["mode"] != RESUME_MODE
                or manifest["target_sha"] != self.approved_sha
                or manifest["project"] != FIXED_PROJECT
                or manifest["region"] != FIXED_REGION
                or manifest["service"] != FIXED_SERVICE
                or type(manifest["cumulative_paid_attempts"]) is not int
                or manifest["cumulative_paid_attempts"] != 2
                or not re.fullmatch(r"[0-9a-f]{64}", manifest["service_url_sha256"])
                or not re.fullmatch(r"[0-9a-f]{64}", manifest["traffic_sha256"])
                or not isinstance(manifest["sources"], list)
                or len(manifest["sources"]) != 2
            ):
                raise ValueError
            expected_source_fields = {
                "source_rollout_id", "source_approved_sha", "checkpoint_uri", "checkpoint_generation",
                "recovery_uri", "recovery_generation", "source_attestation_uri",
                "source_attestation_generation",
            }
            source_ids: set[str] = set()
            evidence_uris: set[str] = set()
            evidence_references: set[tuple[str, str]] = set()
            for number, source in enumerate(manifest["sources"], 1):
                if not isinstance(source, dict) or set(source) != expected_source_fields:
                    raise ValueError
                source_id = source["source_rollout_id"]
                if (
                    not isinstance(source_id, str)
                    or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", source_id)
                    or source_id in source_ids
                ):
                    raise ValueError
                source_ids.add(source_id)
                if (
                    not isinstance(source["source_approved_sha"], str)
                    or re.fullmatch(r"[0-9a-f]{40}", source["source_approved_sha"]) is None
                ):
                    raise ValueError
                expected_checkpoint_uri = (
                    f"{EVIDENCE_ROOT}/{source_id}/attempts/{number:04d}-completed.json"
                )
                expected_recovery_uri = f"{EVIDENCE_ROOT}/{source_id}/recovery.json"
                expected_attestation_uri = (
                    f"{EVIDENCE_ROOT}/{source_id}/"
                    f"source-attestation-{self.approved_sha}.json"
                )
                if (
                    source["checkpoint_uri"] != expected_checkpoint_uri
                    or source["recovery_uri"] != expected_recovery_uri
                    or source["source_attestation_uri"] != expected_attestation_uri
                ):
                    raise ValueError
                for uri_field, generation_field in (
                    ("checkpoint_uri", "checkpoint_generation"),
                    ("recovery_uri", "recovery_generation"),
                    ("source_attestation_uri", "source_attestation_generation"),
                ):
                    uri = source[uri_field]
                    generation = source[generation_field]
                    reference = (uri, generation)
                    if uri in evidence_uris or reference in evidence_references:
                        raise ValueError
                    evidence_uris.add(uri)
                    evidence_references.add(reference)
                checkpoint = self._read_resume_object(
                    source["checkpoint_uri"], source["checkpoint_generation"]
                )
                checkpoint_fields = {
                    "rollout_id", "stage", "surface", "url_sha256", "attempt_number",
                    "paid_gate_state", "classification",
                }
                if (
                    set(checkpoint) != checkpoint_fields
                    or checkpoint["rollout_id"] != source_id
                    or type(checkpoint["attempt_number"]) is not int
                    or checkpoint["attempt_number"] != number
                    or checkpoint["classification"] != "succeeded"
                    or checkpoint["paid_gate_state"] != "open"
                    or checkpoint["stage"] != "prior"
                    or checkpoint["surface"] != "stream"
                    or checkpoint["url_sha256"] != manifest["service_url_sha256"]
                ):
                    raise ValueError
                recovery = self._read_resume_object(
                    source["recovery_uri"], source["recovery_generation"]
                )
                count_field = "paid_attempts" if number == 1 else "cumulative_paid_attempts"
                recovery_fields = {
                    "candidate_image_digest", "candidate_revision",
                    "candidate_traffic_percent", "classification", count_field,
                    "lock_generation", "prior_revision", "rollout_id",
                    "service_generation", "service_uid", "traffic_matches_snapshot",
                }
                candidate_revision = normalize_revision_reference(
                    recovery["candidate_revision"]
                )
                service_uid = recovery["service_uid"]
                if (
                    set(recovery) != recovery_fields
                    or recovery["rollout_id"] != source_id
                    or recovery["classification"] != "ALREADY_CONVERGED_NO_TRAFFIC"
                    or type(recovery[count_field]) is not int
                    or recovery[count_field] != number
                    or recovery["traffic_matches_snapshot"] is not True
                    or type(recovery["candidate_traffic_percent"]) is not int
                    or recovery["candidate_traffic_percent"] != 0
                    or re.fullmatch(
                        r"sha256:[0-9a-f]{64}", recovery["candidate_image_digest"]
                    ) is None
                    or not candidate_revision.startswith(f"{FIXED_SERVICE}-")
                    or re.fullmatch(r"[0-9]+", recovery["lock_generation"]) is None
                    or type(recovery["service_generation"]) is not int
                    or recovery["service_generation"] <= 0
                    or not isinstance(service_uid, str)
                    or str(uuid.UUID(service_uid)) != service_uid
                    or self._revision(recovery["prior_revision"])
                    != self._revision(manifest["expected_prior_revision"])
                ):
                    raise ValueError
                attestation = self._read_resume_object(
                    source["source_attestation_uri"],
                    source["source_attestation_generation"],
                )
                attestation_fields = {
                    "schema_version", "mode", "source_rollout_id",
                    "source_approved_sha", "target_sha", "project", "region",
                    "service", "checkpoint_uri", "checkpoint_generation",
                    "recovery_uri", "recovery_generation", "expected_attempt_number",
                    "service_url_sha256", "traffic_sha256", "prior_revision",
                }
                if (
                    set(attestation) != attestation_fields
                    or type(attestation["schema_version"]) is not int
                    or attestation["schema_version"] != 1
                    or attestation["mode"] != RESUME_MODE
                    or attestation["source_rollout_id"] != source_id
                    or attestation["source_approved_sha"] != source["source_approved_sha"]
                    or attestation["target_sha"] != self.approved_sha
                    or attestation["project"] != FIXED_PROJECT
                    or attestation["region"] != FIXED_REGION
                    or attestation["service"] != FIXED_SERVICE
                    or attestation["checkpoint_uri"] != source["checkpoint_uri"]
                    or attestation["checkpoint_generation"] != source["checkpoint_generation"]
                    or attestation["recovery_uri"] != source["recovery_uri"]
                    or attestation["recovery_generation"] != source["recovery_generation"]
                    or type(attestation["expected_attempt_number"]) is not int
                    or attestation["expected_attempt_number"] != number
                    or attestation["service_url_sha256"] != manifest["service_url_sha256"]
                    or attestation["traffic_sha256"] != manifest["traffic_sha256"]
                    or self._revision(attestation["prior_revision"])
                    != self._revision(manifest["expected_prior_revision"])
                ):
                    raise ValueError
        except (KeyError, TypeError, ValueError, ConcurrencyRefusal) as exc:
            raise ResumeRefusal("resume manifest or source chain refused") from exc
        state = self._service_get()
        validated, prior = self._validate_resume_service(state, manifest)
        return manifest, validated, prior

    def prepare_resume(self) -> tuple[dict[str, Any], str]:
        """Verify immutable evidence and unchanged production on both sides of CAS lock."""
        if self.mode != RESUME_MODE:
            raise ResumeRefusal("resume preparation requires exact resume mode")
        ensure_absent = getattr(self.boundaries, "ensure_lock_absent", None)
        if ensure_absent is None:
            raise ResumeRefusal("preexisting-lock boundary is missing")
        self._call_with_budget(ensure_absent, LOCK_OBJECT)
        first_manifest, first_state, first_prior = self._verify_resume_evidence()
        self.acquire_lock()
        second_manifest, second_state, second_prior = self._verify_resume_evidence()
        stable_fields = ("uid", "etag", "generation", "observedGeneration", "observed_generation", "uri")
        if (
            first_manifest != second_manifest
            or first_prior != second_prior
            or any(first_state.get(key) != second_state.get(key) for key in stable_fields)
            or not _traffic_equal(first_state["traffic"], second_state["traffic"])
        ):
            raise ResumeRefusal("resume evidence or service changed during lock acquisition")
        self.resume_manifest = deepcopy(second_manifest)
        self.snapshot = deepcopy(second_state)
        self.prior_service_url = second_state["uri"]
        self.prior_identity = self.boundaries.health(
            self.prior_service_url,
            None,
            timeout=self._remaining(),
            allow_legacy_prior=True,
        )
        # Revalidate the one-owner control plane after the fresh data-plane health call.
        final_state = self._service_get()
        final_validated, final_prior = self._validate_resume_service(final_state, second_manifest)
        if final_prior != second_prior or any(
            second_state.get(key) != final_validated.get(key) for key in stable_fields
        ) or not _traffic_equal(second_state["traffic"], final_validated["traffic"]):
            raise ResumeRefusal("production changed during resume health preflight")
        self.snapshot = deepcopy(final_validated)
        return deepcopy(final_validated), final_prior

    @staticmethod
    def _strict_fields(value: Any, fields: set[str]) -> dict[str, Any]:
        if not isinstance(value, dict) or set(value) != fields:
            raise ValueError
        return value

    def _verify_shadow_resume_evidence(
        self,
    ) -> tuple[dict[str, Any], dict[str, Any], str]:
        """Validate the one Oracle-approved incident continuation without widening it."""
        manifest = self._read_resume_object(
            self.resume_manifest_uri, self.resume_manifest_generation
        )
        try:
            self._strict_fields(manifest, {
                "schema_version", "mode", "continuation_id", "controller_sha",
                "target_sha", "source_run_id", "project", "region", "service",
                "cumulative_paid_attempts", "prior_manifest", "attempts", "recovery",
                "current_service", "candidate",
            })
            if (
                type(manifest["schema_version"]) is not int
                or manifest["schema_version"] != 1
                or manifest["mode"] != RESUME_AFTER_SHADOW_MODE
                or manifest["controller_sha"] != self.approved_sha
                or manifest["target_sha"] != INCIDENT_TARGET_SHA
                or manifest["source_run_id"] != INCIDENT_SOURCE_RUN
                or manifest["project"] != FIXED_PROJECT
                or manifest["region"] != FIXED_REGION
                or manifest["service"] != FIXED_SERVICE
                or type(manifest["cumulative_paid_attempts"]) is not int
                or manifest["cumulative_paid_attempts"] != 4
                or not isinstance(manifest["continuation_id"], str)
                or re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,62})", manifest["continuation_id"])
                is None
            ):
                raise ValueError

            prior_ref = self._strict_fields(
                manifest["prior_manifest"], {"uri", "generation"}
            )
            if prior_ref != {
                "uri": INCIDENT_PRIOR_MANIFEST_URI,
                "generation": INCIDENT_PRIOR_MANIFEST_GENERATION,
            }:
                raise ValueError
            prior_controller = RolloutController(
                boundaries=self.boundaries,
                rollout_id=f"prior-proof-{self.rollout_id}",
                approved_sha=manifest["target_sha"],
                clock=self.clock,
                promotion_seconds=self._remaining(),
                rollback_seconds=self.rollback_seconds,
                prior_paid_attempts=2,
                mode=RESUME_MODE,
                resume_manifest_uri=prior_ref["uri"],
                resume_manifest_generation=prior_ref["generation"],
            )
            prior_manifest, prior_state, prior_revision = (
                prior_controller._verify_resume_evidence()
            )
            if prior_manifest["target_sha"] != manifest["target_sha"]:
                raise ValueError

            attempts = manifest["attempts"]
            if not isinstance(attempts, list) or len(attempts) != 2:
                raise ValueError
            shadow_url_hash: str | None = None
            for number, surface, item in zip((3, 4), ("sync", "stream"), attempts, strict=True):
                self._strict_fields(item, {
                    "attempt_number", "started_uri", "started_generation",
                    "completed_uri", "completed_generation",
                })
                prefix = f"{EVIDENCE_ROOT}/{INCIDENT_SOURCE_RUN}/attempts/{number:04d}"
                if (
                    type(item["attempt_number"]) is not int
                    or item["attempt_number"] != number
                    or item["started_uri"] != f"{prefix}-started.json"
                    or item["completed_uri"] != f"{prefix}-completed.json"
                ):
                    raise ValueError
                started = self._read_resume_object(
                    item["started_uri"], item["started_generation"]
                )
                completed = self._read_resume_object(
                    item["completed_uri"], item["completed_generation"]
                )
                fields = {
                    "rollout_id", "stage", "surface", "url_sha256", "attempt_number",
                    "paid_gate_state", "classification",
                }
                self._strict_fields(started, fields)
                self._strict_fields(completed, fields)
                repeated = fields - {"classification"}
                if (
                    any(started[field] != completed[field] for field in repeated)
                    or started["rollout_id"] != INCIDENT_SOURCE_RUN
                    or started["stage"] != "shadow"
                    or started["surface"] != surface
                    or type(started["attempt_number"]) is not int
                    or started["attempt_number"] != number
                    or started["paid_gate_state"] != "open"
                    or started["classification"] != "started"
                    or completed["classification"] != "succeeded"
                    or re.fullmatch(r"[0-9a-f]{64}", started["url_sha256"]) is None
                ):
                    raise ValueError
                if shadow_url_hash is None:
                    shadow_url_hash = started["url_sha256"]
                elif shadow_url_hash != started["url_sha256"]:
                    raise ValueError

            recovery_ref = self._strict_fields(
                manifest["recovery"], {"uri", "generation"}
            )
            expected_recovery_uri = f"{EVIDENCE_ROOT}/{INCIDENT_SOURCE_RUN}/recovery.json"
            if recovery_ref != {
                "uri": expected_recovery_uri,
                "generation": INCIDENT_RECOVERY_GENERATION,
            }:
                raise ValueError
            recovery = self._read_resume_object(
                recovery_ref["uri"], recovery_ref["generation"]
            )
            self._strict_fields(recovery, {
                "candidate_image_digest", "candidate_revision", "candidate_traffic_percent",
                "classification", "cumulative_paid_attempts", "lock_generation",
                "prior_revision", "rollout_id", "service_generation", "service_uid",
                "traffic_matches_snapshot",
            })
            if (
                recovery["candidate_image_digest"] != INCIDENT_CANDIDATE_DIGEST
                or self._revision(recovery["candidate_revision"])
                != INCIDENT_CANDIDATE_REVISION
                or type(recovery["candidate_traffic_percent"]) is not int
                or recovery["candidate_traffic_percent"] != 0
                or recovery["classification"] != "ALREADY_CONVERGED_NO_TRAFFIC"
                or type(recovery["cumulative_paid_attempts"]) is not int
                or recovery["cumulative_paid_attempts"] != 4
                or recovery["lock_generation"] != "1783979116412357"
                or self._revision(recovery["prior_revision"]) != prior_revision
                or recovery["rollout_id"] != INCIDENT_SOURCE_RUN
                or type(recovery["service_generation"]) is not int
                or recovery["service_generation"] != INCIDENT_SERVICE_GENERATION
                or recovery["service_uid"] != INCIDENT_SERVICE_UID
                or recovery["traffic_matches_snapshot"] is not True
            ):
                raise ValueError

            current = self._strict_fields(manifest["current_service"], {
                "uid", "generation", "etag", "service_url_sha256", "traffic_sha256"
            })
            if (
                current["uid"] != INCIDENT_SERVICE_UID
                or type(current["generation"]) is not int
                or current["generation"] != INCIDENT_SERVICE_GENERATION
                or not isinstance(current["etag"], str) or not current["etag"]
                or re.fullmatch(r"[0-9a-f]{64}", current["service_url_sha256"]) is None
                or re.fullmatch(r"[0-9a-f]{64}", current["traffic_sha256"]) is None
            ):
                raise ValueError
            candidate = self._strict_fields(
                manifest["candidate"], {"revision", "image_digest", "target_sha"}
            )
            if candidate != {
                "revision": INCIDENT_CANDIDATE_REVISION,
                "image_digest": INCIDENT_CANDIDATE_DIGEST,
                "target_sha": INCIDENT_TARGET_SHA,
            }:
                raise ValueError
            validated, live_prior = self._validate_resume_service(
                prior_state,
                {
                    "expected_prior_revision": prior_revision,
                    "service_url_sha256": current["service_url_sha256"],
                    "traffic_sha256": current["traffic_sha256"],
                },
            )
            generation_key = (
                "observedGeneration" if "observedGeneration" in validated
                else "observed_generation"
            )
            if (
                validated.get("uid") != current["uid"]
                or _integer(validated.get("generation")) != current["generation"]
                or _integer(validated.get(generation_key)) != current["generation"]
                or validated.get("etag") != current["etag"]
                or live_prior != prior_revision
            ):
                raise ValueError
        except (KeyError, TypeError, ValueError, ResumeRefusal, ConcurrencyRefusal) as exc:
            raise ResumeRefusal("shadow resume manifest or evidence chain refused") from exc
        return manifest, validated, prior_revision

    def prepare_shadow_resume(self) -> tuple[dict[str, Any], str]:
        if self.mode != RESUME_AFTER_SHADOW_MODE:
            raise ResumeRefusal("shadow resume preparation requires exact mode")
        ensure_absent = getattr(self.boundaries, "ensure_lock_absent", None)
        if ensure_absent is None:
            raise ResumeRefusal("preexisting-lock boundary is missing")
        self._call_with_budget(ensure_absent, LOCK_OBJECT)
        first_manifest, first_state, first_prior = self._verify_shadow_resume_evidence()
        self.target_sha = first_manifest["target_sha"]
        self.acquire_lock()
        second_manifest, second_state, second_prior = self._verify_shadow_resume_evidence()
        stable = ("uid", "etag", "generation", "observedGeneration", "observed_generation", "uri")
        if (
            first_manifest != second_manifest
            or first_prior != second_prior
            or any(first_state.get(key) != second_state.get(key) for key in stable)
            or not _traffic_equal(first_state["traffic"], second_state["traffic"])
        ):
            raise ResumeRefusal("shadow resume evidence changed around lock acquisition")
        claim_key = hashlib.sha256(
            f"{self.resume_manifest_uri}#{self.resume_manifest_generation}".encode()
        ).hexdigest()
        claim_path = f"{SHADOW_CLAIMS_ROOT}/{claim_key}.json"
        claim = {
            "mode": RESUME_AFTER_SHADOW_MODE,
            "manifest_uri": self.resume_manifest_uri,
            "manifest_generation": self.resume_manifest_generation,
            "controller_sha": self.approved_sha,
            "target_sha": second_manifest["target_sha"],
            "continuation_id": second_manifest["continuation_id"],
            "cumulative_paid_attempts": 4,
        }
        try:
            self._call_with_budget(
                self.boundaries.create_gcs, claim_path, claim, if_generation_match=0
            )
        except Exception as exc:
            raise ResumeRefusal("shadow resume continuation already claimed") from exc
        self.continuation_claim = claim_path
        self.resume_manifest = deepcopy(second_manifest)
        self.target_sha = second_manifest["target_sha"]
        self.snapshot = deepcopy(second_state)
        self.prior_service_url = second_state["uri"]
        self.prior_identity = self.boundaries.health(
            self.prior_service_url, None, timeout=self._remaining(), allow_legacy_prior=True
        )
        final_manifest, final_state, final_prior = self._verify_shadow_resume_evidence()
        if (
            final_manifest != second_manifest
            or final_prior != second_prior
            or any(second_state.get(key) != final_state.get(key) for key in stable)
            or not _traffic_equal(second_state["traffic"], final_state["traffic"])
        ):
            raise ResumeRefusal("production changed during shadow resume health preflight")
        self.snapshot = deepcopy(final_state)
        self.candidate_revision = INCIDENT_CANDIDATE_REVISION
        self.expected_candidate_revision = INCIDENT_CANDIDATE_REVISION
        self.image_digest = f"us-central1-docker.pkg.dev/{FIXED_PROJECT}/llm-council/llm-council@{INCIDENT_CANDIDATE_DIGEST}"
        return deepcopy(final_state), final_prior

    def capture_snapshot(self) -> dict[str, Any]:
        state = self._service_get()
        if "observedGeneration" in state:
            self.snapshot = validate_initial_service(state)
            uri = state.get("uri")
            parsed = urllib.parse.urlsplit(uri) if isinstance(uri, str) else None
            if (
                parsed is None
                or parsed.scheme != "https"
                or not parsed.netloc
                or parsed.username is not None
                or parsed.password is not None
                or parsed.query
                or parsed.fragment
            ):
                raise InitialStateRefusal("initial service URI is missing or malformed")
            self.prior_service_url = uri
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
                    or _normalized_reconciling(state)
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
        if (
            self.expected_candidate_revision is not None
            and self._revision(self.candidate_revision)
            != self._revision(self.expected_candidate_revision)
        ):
            raise ConcurrencyRefusal("deployed candidate revision mismatch")
        self.candidate_revision = self._revision(self.candidate_revision)
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
        if self.attempt_count >= MAX_PAID_ATTEMPTS:
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
            if self.mode in {RESUME_MODE, RESUME_AFTER_SHADOW_MODE}:
                self.paid_gate_state = "terminally_closed"
                raise result
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
            expected_revision=self.target_sha,
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
                        allow_legacy_prior=True,
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

    @staticmethod
    def _operation_proves_rejection(operation: Any, expected_name: Any) -> bool:
        """Accept only an exact FAILED_PRECONDITION for the pending Cloud LRO."""
        if (
            not isinstance(operation, dict)
            or set(operation) != {"name", "done", "error"}
            or operation.get("done") is not True
            or not isinstance(expected_name, str)
            or operation.get("name") != expected_name
            or re.fullmatch(
                r"projects/[^/]+/locations/[^/]+/operations/[^/]+", expected_name
            )
            is None
        ):
            return False
        error = operation.get("error")
        if not isinstance(error, dict) or set(error) != {"code", "message"}:
            return False
        message = error.get("message")
        return (
            type(error.get("code")) is int
            and error["code"] == 9
            and isinstance(message, str)
            and message == message.strip()
            and re.search(r"\bprecondition\b", message, re.IGNORECASE) is not None
        )

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
            if not _traffic_equal(traffic, requested):
                raise ValueError
            reconciling = _normalized_reconciling(state)
            converged = observed == generation and not reconciling
            if not converged:
                if (
                    observed > generation
                    or not reconciling
                    or observed == generation
                ):
                    raise ValueError
                return False
            statuses = _normalized_traffic(state.get("trafficStatuses"))
            if statuses != _expected_traffic_statuses(traffic):
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
        self.pending_transition = {
            "uid": expected_uid,
            "generation": _integer(expected_generation),
            "etag": expected_etag,
            "traffic": deepcopy(requested),
        }
        operation = self._patch(requested, expected_etag, self._remaining(cap=timeout))
        if "done" not in operation and operation.get("uid"):
            return operation
        operation_name = operation.get("name") if isinstance(operation, dict) else None
        self.pending_transition["operation_name"] = operation_name
        response = None
        while True:
            if self._operation_proves_rejection(operation, operation_name):
                self.pending_transition = None
                self.rollout_owned_state = deepcopy(current)
                raise OperationRefusal("operation refused")
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
                self.pending_transition = None
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
            self._service_base_url(rollback=True),
            self.prior_identity,
            timeout=self._remaining(rollback=True),
            allow_legacy_prior=True,
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
            if self._snapshot_traffic_is_already_restored(current):
                self._prove_prior_health_and_lock()
                self.mutation_armed = False
                if self.lock_generation is not None:
                    self._call_with_budget(
                        self.boundaries.release_lock, self.lock_generation, rollback=True
                    )
                    self.lock_generation = None
                return
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
            if not valid:
                raise RollbackProofError("rollback proof refused")
            self._prove_prior_health_and_lock()
            self.mutation_armed = False
            if self.lock_generation is not None:
                self._call_with_budget(
                    self.boundaries.release_lock,
                    self.lock_generation,
                    rollback=True,
                )
                self.lock_generation = None
        except RollbackProofError:
            raise
        except Exception as exc:
            raise RollbackProofError("rollback proof refused") from exc

    def _snapshot_traffic_is_already_restored(self, current: Any) -> bool:
        snapshot = self.snapshot
        if snapshot is None:
            return False
        try:
            return (
                isinstance(current, dict)
                and current.get("uid") == snapshot.get("uid")
                and _integer(current.get("observedGeneration"))
                == _integer(current.get("generation"))
                and not _normalized_reconciling(current)
                and _traffic_equal(current.get("traffic"), snapshot.get("traffic"))
                and _normalized_traffic(current.get("trafficStatuses"))
                == _expected_traffic_statuses(snapshot.get("traffic"))
            )
        except (KeyError, TypeError, ValueError):
            return False

    def _prove_prior_health_and_lock(self) -> None:
        valid = self.lock_generation is not None and self.boundaries.health(
            self._service_base_url(rollback=True),
            self.prior_identity,
            timeout=self._remaining(rollback=True),
            allow_legacy_prior=True,
        ) == self.prior_identity
        if self.lock_generation is not None:
            valid = valid and self._call_with_budget(
                self.boundaries.verify_lock, self.lock_generation, rollback=True
            ) is True
        if not valid:
            raise RollbackProofError("rollback proof refused")

    def _rollback_state_status(
        self, restored: Any, owner: dict[str, Any], owner_generation: int
    ) -> bool:
        """Return False only for an exact, still-reconciling owned restoration."""
        snapshot = self.snapshot
        if snapshot is None:
            raise RollbackProofError("rollback snapshot is missing")
        try:
            if not isinstance(restored, dict) or restored.get("uid") != snapshot.get("uid"):
                raise ValueError
            generation = _integer(restored.get("generation"))
            observed = _integer(restored.get("observedGeneration"))
            if generation != owner_generation + 1:
                raise ValueError
            if restored.get("etag") in {snapshot.get("etag"), owner.get("etag")}:
                raise ValueError
            traffic = _normalized_traffic(restored.get("traffic"))
            expected = _normalized_traffic(snapshot["traffic"])
            if not _traffic_equal(traffic, expected):
                raise ValueError
            reconciling = _normalized_reconciling(restored)
            if observed == generation and not reconciling:
                if (
                    _normalized_traffic(restored.get("trafficStatuses"))
                    != _expected_traffic_statuses(expected)
                ):
                    raise ValueError
                return True
            if observed < generation and reconciling:
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
            pending_status = self._pending_transition_ownership_status(current)
            if pending_status == "owned":
                self.rollout_owned_state = deepcopy(current)
                self.pending_transition = None
                return current
            if pending_status in {"pre_patch", "intermediate"}:
                try:
                    self._remaining(rollback=True)
                except RollbackProofError as exc:
                    raise RollbackRecoveryRequired(
                        "recovery_required: rollback grace exhausted without owned convergence"
                    ) from exc
                continue
            if pending_status == "contradictory":
                raise RollbackRecoveryRequired(
                    "recovery_required: pending transition ownership is contradictory"
                )
            if self.rollout_owned_state is None:
                if self.candidate_revision_state is None:
                    try:
                        self.fetch_candidate_revision(rollback=True)
                    except Exception as exc:
                        if isinstance(exc, RollbackProofError):
                            raise RollbackRecoveryRequired(
                                "recovery_required: rollback grace exhausted without owned convergence"
                            ) from exc
                        raise RollbackProofError("rollback revision ownership refused") from exc
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

    def _pending_transition_ownership_status(self, current: Any) -> str:
        """Classify only the exact CAS transition this controller just requested."""
        pending = self.pending_transition
        snapshot = self.snapshot
        if pending is None or snapshot is None or not isinstance(current, dict):
            return "none"
        try:
            if self._snapshot_traffic_is_already_restored(current):
                if (
                    current.get("uid") == pending["uid"]
                    and _integer(current.get("generation")) == pending["generation"]
                    and current.get("etag") == pending["etag"]
                ):
                    return "pre_patch"
                return "contradictory"
            generation = _integer(current.get("generation"))
            observed = _integer(current.get("observedGeneration"))
            if (
                current.get("uid") != pending["uid"]
                or generation != pending["generation"] + 1
                or current.get("etag") == pending["etag"]
                or not _traffic_equal(current.get("traffic"), pending["traffic"])
            ):
                return "contradictory"
            reconciling = _normalized_reconciling(current)
            if observed == generation and not reconciling:
                if (
                    _normalized_traffic(current.get("trafficStatuses"))
                    != _expected_traffic_statuses(pending["traffic"])
                ):
                    return "contradictory"
                return "owned"
            if pending["generation"] <= observed < generation and reconciling:
                return "intermediate"
            return "contradictory"
        except (KeyError, TypeError, ValueError):
            return "contradictory"

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
                and self._revision(current.get("latestCreatedRevision")) == self._revision(revision)
                and isinstance(template, dict)
                and self._revision(template.get("revision")) == self._revision(revision)
                and image_exact
                and deploy_revision_values == [self.target_sha]
                and image_digest_values == [self.image_digest]
                and env_values.get("DEPLOY_REVISION") == self.target_sha
                and env_values.get("APP_IMAGE_DIGEST") == self.image_digest
                and _traffic_equal(
                    current.get("traffic"),
                    _deploy_traffic(snapshot),
                )
                and _normalized_traffic(current.get("trafficStatuses"))
                == _expected_traffic_statuses(_deploy_traffic(snapshot))
            )
            if not exact_rollout_intent:
                return "contradictory"
            if (
                observed == generation
                and not _normalized_reconciling(current)
            ):
                if (
                    self._revision(current.get("latestReadyRevision")) == self._revision(revision)
                    and self.candidate_revision_state is not None
                ):
                    return "owned"
                prior_ready = self._revision(snapshot.get("latestReadyRevision"))
                terminal = current.get("terminalCondition")
                conditions = current.get("conditions")
                if not isinstance(conditions, list) or any(
                    not isinstance(item, dict) or not isinstance(item.get("type"), str)
                    for item in conditions
                ):
                    return "contradictory"
                relevant = {"ConfigurationsReady", "Ready", "ContainerReady"}
                relevant_conditions = [item for item in conditions if item["type"] in relevant]
                if (
                    len({item["type"] for item in relevant_conditions})
                    != len(relevant_conditions)
                    or [item["type"] for item in relevant_conditions]
                    != ["ConfigurationsReady"]
                    or any(self._condition_truth(item) is False for item in conditions)
                ):
                    return "contradictory"
                configurations = [
                    item for item in relevant_conditions
                    if item["type"] == "ConfigurationsReady"
                ]
                configuration = configurations[0] if len(configurations) == 1 else None
                if (
                    self._revision(current.get("latestReadyRevision")) == prior_ready
                    and isinstance(terminal, dict)
                    and terminal.get("type") == "Ready"
                    and self._condition_truth(terminal) is True
                    and isinstance(configuration, dict)
                    and self._condition_truth(configuration) is True
                    and configuration.get("revisionReason") == "RETIRED"
                    and self.candidate_revision_state is not None
                ):
                    return "owned"
                return "contradictory"
            prior_ready = self._revision(snapshot.get("latestReadyRevision"))
            if (
                snapshot_generation <= observed < generation
                and _normalized_reconciling(current)
                and self._revision(current.get("latestReadyRevision"))
                in {prior_ready, self._revision(revision)}
            ):
                return "intermediate"
            return "contradictory"
        except (KeyError, TypeError, ValueError, ConcurrencyRefusal):
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
                and not _normalized_reconciling(current)
                and not _normalized_reconciling(owned)
                and _traffic_equal(current.get("traffic"), owned.get("traffic"))
                and (
                    "trafficStatuses" not in owned
                    or (
                        _normalized_traffic(current.get("trafficStatuses"))
                        == _expected_traffic_statuses(current.get("traffic"))
                        and _normalized_traffic(owned.get("trafficStatuses"))
                        == _expected_traffic_statuses(owned.get("traffic"))
                        and _traffic_equal(
                            current.get("trafficStatuses"), owned.get("trafficStatuses")
                        )
                    )
                )
                and (
                    (
                        "latestReadyRevision" not in current
                        and "latestReadyRevision" not in owned
                    )
                    or self._revision(current.get("latestReadyRevision"))
                    == self._revision(owned.get("latestReadyRevision"))
                )
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
    prior_paid_attempts: int = 0,
    mode: str = FRESH_MODE,
    resume_manifest_uri: str | None = None,
    resume_manifest_generation: str | None = None,
) -> RolloutController:
    """Execute the one immutable rollout sequence; callers cannot supply a plan."""
    rollout = RolloutController(
        boundaries=boundaries,
        rollout_id=rollout_id,
        approved_sha=approved_sha,
        clock=clock,
        promotion_seconds=promotion_seconds,
        rollback_seconds=rollback_seconds,
        prior_paid_attempts=prior_paid_attempts,
        mode=mode,
        resume_manifest_uri=resume_manifest_uri,
        resume_manifest_generation=resume_manifest_generation,
    )
    return _execute_rollout(rollout)


def _stage_traffic(
    snapshot: dict[str, Any], candidate: str, percent: int, *, shadow_tag: str | None
) -> list[dict[str, Any]]:
    """Build exact-sum revision+tag traffic while preserving snapshot identities."""
    traffic = _normalized_traffic(snapshot["traffic"])
    if shadow_tag is not None and any(item.get("tag") == shadow_tag for item in traffic):
        raise ValueError("rollout shadow tag collides with snapshot traffic")
    prior_index = next(index for index, item in enumerate(traffic) if item["percent"] > 0)
    requested = deepcopy(traffic)
    requested[prior_index]["percent"] = 100 - percent
    candidate_target = {
        "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
        "revision": candidate,
        "percent": percent,
    }
    if shadow_tag is not None:
        # Cloud Run creates this target on a no-traffic revision deploy. Preserve it
        # explicitly and route the requested percentage through the tagged target.
        candidate_target["percent"] = 0
        requested.append(
            {
                "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
                "revision": candidate,
                "percent": percent,
                "tag": shadow_tag,
            }
        )
    requested.append(candidate_target)
    return _normalized_traffic(requested)


def _deploy_traffic(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    """Return exact post-no-traffic-deploy traffic from live Cloud Run v2."""
    return _normalized_traffic(snapshot["traffic"])


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
    rollout.fetch_candidate_revision()
    if rollout._deploy_state_ownership_status(deployed) != "owned":
        raise ConcurrencyRefusal("deployed candidate identity mismatch")
    rollout.rollout_owned_state = deepcopy(deployed)
    shadow_state = _transition_stage(
        rollout,
        deployed,
        _stage_traffic(snapshot, rollout.candidate_revision, 0, shadow_tag=shadow_tag),
    )
    shadow_url = boundaries.tag_url(shadow_state, shadow_tag)
    rollout.candidate_identity = rollout.verify_candidate_health(shadow_url)
    if rollout.prior_identity == rollout.candidate_identity:
        raise IdentityRefusal("prior and candidate identities must differ")
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
    if not _traffic_equal(
        final["traffic"],
        _stage_traffic(snapshot, rollout.candidate_revision, 100, shadow_tag=None),
    ):
        raise ConcurrencyRefusal("final canonical traffic mismatch")


def _execute_shadow_resume_progression(
    rollout: RolloutController, *, prior_revision: str
) -> None:
    """Run only the incident-authorized 100% candidate finalization path."""
    del prior_revision
    boundaries = rollout.boundaries
    snapshot = rollout.snapshot
    if snapshot is None or rollout.candidate_revision is None:
        raise InitialStateRefusal("shadow resume state is incomplete")
    service_url = rollout._service_base_url()
    shadow_tag = f"shadow-{INCIDENT_SOURCE_RUN}"[:63].rstrip("-")

    rollout.fetch_candidate_revision()
    current = rollout._service_get()
    if (
        current.get("uid") != snapshot.get("uid")
        or current.get("etag") != snapshot.get("etag")
        or _integer(current.get("generation")) != _integer(snapshot.get("generation"))
        or not _traffic_equal(current.get("traffic"), snapshot.get("traffic"))
    ):
        raise ConcurrencyRefusal("restored service changed before shadow continuation")
    rollout.mutation_armed = True
    tagged = _transition_stage(
        rollout,
        current,
        _stage_traffic(
            snapshot, rollout.candidate_revision, 100, shadow_tag=shadow_tag
        ),
    )
    shadow_url = boundaries.tag_url(tagged, shadow_tag)
    rollout.candidate_identity = rollout.verify_candidate_health(shadow_url)
    if rollout.prior_identity == rollout.candidate_identity:
        raise IdentityRefusal("prior and candidate identities must differ")
    boundaries.sample_stage_identities(
        service_url,
        rollout.prior_identity,
        rollout.candidate_identity,
        percent=100,
        timeout=rollout._remaining(),
    )
    if rollout.verify_candidate_health(service_url) != rollout.candidate_identity:
        raise IdentityRefusal("shadow resume production identity mismatch")
    rollout._event("final-production-health-verify")
    rollout.run_paid_attempt(stage="final", surface="sync", url=service_url)
    rollout.run_paid_attempt(stage="final", surface="stream", url=service_url)

    expected_final = _stage_traffic(
        snapshot, rollout.candidate_revision, 100, shadow_tag=None
    )
    final = _transition_stage(rollout, tagged, expected_final)
    if (
        rollout.verify_candidate_health(service_url) != rollout.candidate_identity
        or not _traffic_equal(final.get("traffic"), expected_final)
        or _normalized_traffic(final.get("trafficStatuses"))
        != _expected_traffic_statuses(expected_final)
    ):
        raise ConcurrencyRefusal("shadow resume final verification refused")


def _execute_rollout(rollout: RolloutController) -> RolloutController:
    boundaries = rollout.boundaries
    rollout.start_promotion_deadline()
    try:
        boundaries.verify_benchmark()
        if rollout.mode == RESUME_AFTER_SHADOW_MODE:
            _, prior_revision = rollout.prepare_shadow_resume()
        elif rollout.mode == RESUME_MODE:
            _, prior_revision = rollout.prepare_resume()
        else:
            rollout.acquire_lock()
            captured = rollout.capture_snapshot()
            prior_revision = next(
                item["revision"]
                for item in _normalized_traffic(captured["traffic"])
                if item["percent"] == 100
            )
        snapshot = rollout.snapshot
        if snapshot is None:
            raise InitialStateRefusal("rollout snapshot is missing")
        shadow_tag = f"shadow-{rollout.rollout_id}"[:63].rstrip("-")
        if any(
            item.get("tag") == shadow_tag
            for item in _normalized_traffic(snapshot["traffic"])
        ):
            raise InitialStateRefusal("rollout shadow tag collides with snapshot traffic")
        if rollout.mode != RESUME_AFTER_SHADOW_MODE:
            rollout.build_candidate()
        if rollout.mode in {RESUME_MODE, RESUME_AFTER_SHADOW_MODE}:
            prior_url = rollout._service_base_url()
        elif "observedGeneration" in snapshot:
            prior_url = rollout._service_base_url()
            rollout.prior_identity = boundaries.health(
                prior_url,
                None,
                timeout=rollout._remaining(),
                allow_legacy_prior=True,
            )
        else:
            prior_url = "https://service.example"
            rollout.prior_identity = deepcopy(
                getattr(boundaries, "health_identity", {"revision": prior_revision})
            )
        if rollout.mode == FRESH_MODE:
            rollout.run_paid_attempt(stage="prior", surface="stream", url=prior_url)
        if rollout.mode != RESUME_AFTER_SHADOW_MODE:
            rollout.deploy_candidate()
        if rollout.mode == RESUME_AFTER_SHADOW_MODE:
            _execute_shadow_resume_progression(rollout, prior_revision=prior_revision)
        elif "observedGeneration" in snapshot:
            _execute_v2_progression(rollout, prior_revision=prior_revision)
        else:
            rollout.candidate_identity = rollout.verify_candidate_health("https://shadow.example")
            rollout.run_paid_attempt(stage="shadow", surface="sync", url="https://shadow.example")
            rollout.run_paid_attempt(stage="shadow", surface="stream", url="https://shadow.example")
            rollout._event("stage-10")
            rollout.planned_restore(snapshot)
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
        validate_production_namespace(project, region, service)
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

    def ensure_lock_absent(self, uri: str, *, timeout: float = 30) -> None:
        if uri != LOCK_OBJECT:
            raise LockRefusal("unexpected lock object")
        try:
            self._run(
                ["gcloud", "storage", "objects", "describe", uri, "--format=json"],
                timeout=timeout,
            )
        except subprocess.CalledProcessError as exc:
            message = (exc.stderr or "").lower()
            if not any(marker in message for marker in ("not found", "does not exist", "404")):
                raise LockRefusal("lock absence could not be proven") from exc
            return
        raise LockRecoveryRequired(
            "stale_lock_recovery_required: existing lock requires bounded manual recovery"
        )

    def read_gcs_generation(
        self, uri: str, generation: str, *, timeout: float = 30
    ) -> dict[str, Any]:
        if (
            not uri.startswith(f"{EVIDENCE_ROOT}/")
            or not re.fullmatch(r"[1-9][0-9]*", generation)
            or "#" in uri
            or "?" in uri
        ):
            raise ResumeRefusal("exact GCS evidence reference refused")
        versioned_uri = f"{uri}#{generation}"
        deadline = self._deadline(timeout)
        metadata = json.loads(
            self._run(
                ["gcloud", "storage", "objects", "describe", versioned_uri, "--format=json"],
                timeout=self._budget(deadline),
            )
        )
        if str(metadata.get("generation", "")) != generation:
            raise ResumeRefusal("GCS evidence generation mismatch")
        value = json.loads(
            self._run(
                ["gcloud", "storage", "cat", versioned_uri],
                timeout=self._budget(deadline),
            )
        )
        if not isinstance(value, dict):
            raise ResumeRefusal("GCS evidence is not an object")
        return value

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

    def revision_resource_name(self, revision: str) -> str:
        short = normalize_revision_reference(revision)
        return f"projects/{self.project}/locations/{self.region}/services/{self.service}/revisions/{short}"

    def revision_get(self, revision: str, *, timeout: float = 30) -> dict[str, Any]:
        revision = normalize_revision_reference(revision)
        if not revision.startswith(f"{self.service}-"):
            raise ConcurrencyRefusal("candidate revision name refused")
        name = self.revision_resource_name(revision)
        return self._request("GET", f"https://run.googleapis.com/v2/{name}", timeout=timeout)

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

    def health(
        self,
        url: str,
        expected: dict[str, Any] | None,
        *,
        timeout: float,
        allow_legacy_prior: bool = False,
    ) -> dict[str, Any]:
        from scripts.verify_deploy_health import fetch_health_json, health_identity

        identity = health_identity(
            fetch_health_json(url, timeout_seconds=timeout),
            allow_legacy_identity_without_artifacts=allow_legacy_prior,
        )
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
        if prior == candidate:
            raise IdentityRefusal("prior and candidate identities must differ")
        deadline = self._deadline(timeout)
        samples = [
            self.health(
                url,
                None,
                timeout=self._budget(deadline),
                allow_legacy_prior=True,
            )
            for _ in range(5)
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
    parser.add_argument(
        "--prior-paid-attempts",
        default=os.environ.get("ROLLOUT_PRIOR_PAID_ATTEMPTS", "0"),
    )
    parser.add_argument("--mode", default=os.environ.get("ROLLOUT_MODE", FRESH_MODE))
    parser.add_argument(
        "--resume-manifest-uri", default=os.environ.get("ROLLOUT_RESUME_MANIFEST_URI")
    )
    parser.add_argument(
        "--resume-manifest-generation",
        default=os.environ.get("ROLLOUT_RESUME_MANIFEST_GENERATION"),
    )
    args = parser.parse_args(argv)
    if not args.approved_sha or re.fullmatch(r"[0-9a-f]{40}", args.approved_sha) is None:
        raise SystemExit("approved full Forgejo SHA is required")
    rollout_id = args.rollout_id or f"{args.approved_sha[:12]}-{int(time.time())}"
    try:
        if args.prior_paid_attempts not in {"0", "2", "4"}:
            raise ValueError("prior paid attempts must be exactly 0, 2, or 4")
        cli_prior_paid_attempts = int(args.prior_paid_attempts)
        mode, prior_paid_attempts, manifest_uri, manifest_generation = validate_resume_inputs(
            args.mode,
            cli_prior_paid_attempts,
            args.resume_manifest_uri,
            args.resume_manifest_generation,
        )
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    project = os.environ.get("PROJECT", FIXED_PROJECT)
    region = os.environ.get("REGION", FIXED_REGION)
    service = os.environ.get("SERVICE", FIXED_SERVICE)
    try:
        validate_production_namespace(project, region, service)
    except SourceBindingError as exc:
        raise SystemExit(str(exc)) from exc
    boundaries = GcloudBoundaries(
        project=FIXED_PROJECT,
        region=FIXED_REGION,
        service=FIXED_SERVICE,
        approved_sha=args.approved_sha,
    )
    controller = RolloutController(
        boundaries=boundaries,
        rollout_id=rollout_id,
        approved_sha=args.approved_sha,
        prior_paid_attempts=prior_paid_attempts,
        mode=mode,
        resume_manifest_uri=manifest_uri,
        resume_manifest_generation=manifest_generation,
    )
    _install_signal_handlers(controller)
    _execute_rollout(controller)
    print("SUCCESS: bounded rollout completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
