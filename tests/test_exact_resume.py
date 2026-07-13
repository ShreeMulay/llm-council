from __future__ import annotations

import hashlib
import json
from copy import deepcopy

import pytest

from scripts import bounded_rollout as rollout
from tests.test_bounded_rollout_red_contract import (
    Boundaries,
    V2Boundaries,
    ambiguous_deploy_state,
    candidate_revision_resource,
    prior_state,
    v2_service,
)

SHA = "a" * 40
MANIFEST_URI = f"{rollout.RESUME_MANIFEST_ROOT}/approved.json"
CANDIDATE_DIGEST = f"sha256:{'d' * 64}"
SERVICE_UID = "123e4567-e89b-42d3-a456-426614174000"
RECOVERY_COMMON_FIELDS = {
    "candidate_image_digest",
    "candidate_revision",
    "candidate_traffic_percent",
    "classification",
    "lock_generation",
    "prior_revision",
    "rollout_id",
    "service_generation",
    "service_uid",
    "traffic_matches_snapshot",
}


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


class ResumeBoundaries(Boundaries):
    def __init__(self):
        super().__init__()
        self.state = prior_state()
        self.state["uri"] = self.service_base_url
        self.generations = {}

    def ensure_lock_absent(self, uri, *, timeout=None):
        self.events.append(("lock-absent", uri))

    def read_gcs_generation(self, uri, generation, *, timeout=None):
        self.events.append(("gcs-read", uri, generation))
        return deepcopy(self.generations[(uri, generation)])


def evidence(boundaries):
    traffic_hash = digest(rollout._normalized_traffic(boundaries.state["traffic"]))
    url_hash = hashlib.sha256(boundaries.service_base_url.encode()).hexdigest()
    sources = []
    for number in (1, 2):
        source_rollout_id = f"old-{number}"
        checkpoint_uri = (
            f"{rollout.EVIDENCE_ROOT}/{source_rollout_id}/attempts/"
            f"{number:04d}-completed.json"
        )
        recovery_uri = f"{rollout.EVIDENCE_ROOT}/old-{number}/recovery.json"
        attestation_uri = f"{rollout.EVIDENCE_ROOT}/old-{number}/source-attestation.json"
        checkpoint = {
            "rollout_id": source_rollout_id,
            "stage": "prior",
            "surface": "stream",
            "url_sha256": url_hash,
            "attempt_number": number,
            "paid_gate_state": "open",
            "classification": "succeeded",
        }
        count_name = "paid_attempts" if number == 1 else "cumulative_paid_attempts"
        recovery = {
            "candidate_image_digest": CANDIDATE_DIGEST,
            "candidate_revision": f"{rollout.FIXED_SERVICE}-candidate-{number}",
            "candidate_traffic_percent": 0,
            "classification": "ALREADY_CONVERGED_NO_TRAFFIC",
            count_name: number,
            "lock_generation": str(100 + number),
            "prior_revision": "prior",
            "rollout_id": source_rollout_id,
            "service_generation": 70 + number,
            "service_uid": SERVICE_UID,
            "traffic_matches_snapshot": True,
        }
        boundaries.generations[(checkpoint_uri, str(number * 10))] = checkpoint
        boundaries.generations[(recovery_uri, str(number * 10 + 1))] = recovery
        attestation = {
            "schema_version": 1,
            "mode": rollout.RESUME_MODE,
            "source_rollout_id": source_rollout_id,
            "source_approved_sha": chr(ord("a") + number) * 40,
            "target_sha": SHA,
            "project": rollout.FIXED_PROJECT,
            "region": rollout.FIXED_REGION,
            "service": rollout.FIXED_SERVICE,
            "checkpoint_uri": checkpoint_uri,
            "checkpoint_generation": str(number * 10),
            "recovery_uri": recovery_uri,
            "recovery_generation": str(number * 10 + 1),
            "expected_attempt_number": number,
            "service_url_sha256": url_hash,
            "traffic_sha256": traffic_hash,
            "prior_revision": "prior",
        }
        boundaries.generations[(attestation_uri, str(number * 10 + 2))] = attestation
        sources.append({
            "source_rollout_id": source_rollout_id,
            "source_approved_sha": chr(ord("a") + number) * 40,
            "checkpoint_uri": checkpoint_uri,
            "checkpoint_generation": str(number * 10),
            "recovery_uri": recovery_uri,
            "recovery_generation": str(number * 10 + 1),
            "source_attestation_uri": attestation_uri,
            "source_attestation_generation": str(number * 10 + 2),
        })
    manifest = {
        "schema_version": 1,
        "mode": rollout.RESUME_MODE,
        "target_sha": SHA,
        "project": rollout.FIXED_PROJECT,
        "region": rollout.FIXED_REGION,
        "service": rollout.FIXED_SERVICE,
        "cumulative_paid_attempts": 2,
        "expected_prior_revision": "prior",
        "service_url_sha256": url_hash,
        "traffic_sha256": traffic_hash,
        "sources": sources,
    }
    boundaries.generations[(MANIFEST_URI, "99")] = manifest
    return manifest


@pytest.mark.parametrize("value", [
    "rev-1",
    "projects/p/locations/r/services/s/revisions/rev-1",
])
def test_revision_normalizer_accepts_short_or_exact_full(value):
    if value.startswith("projects/"):
        value = (
            f"projects/{rollout.FIXED_PROJECT}/locations/{rollout.FIXED_REGION}/"
            f"services/{rollout.FIXED_SERVICE}/revisions/rev-1"
        )
    assert rollout.normalize_revision_reference(value) == "rev-1"


@pytest.mark.parametrize("value", [
    "projects/x/locations/r/services/s/revisions/rev-1",
    "projects/p/locations/x/services/s/revisions/rev-1",
    "projects/p/locations/r/services/x/revisions/rev-1",
    "other/rev-1", "Rev", "rev_1", "-rev", "rev-", "",
])
def test_revision_normalizer_rejects_wrong_namespace_or_malformed(value):
    with pytest.raises(rollout.ConcurrencyRefusal):
        rollout.normalize_revision_reference(value)


def test_deploy_ownership_normalizes_full_latest_names_and_short_template():
    boundaries = V2Boundaries()
    boundaries.project = rollout.FIXED_PROJECT
    boundaries.region = rollout.FIXED_REGION
    boundaries.service = rollout.FIXED_SERVICE
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA
    )
    ctl.snapshot = v2_service()
    ctl.pre_deploy_state = deepcopy(ctl.snapshot)
    ctl.image_digest = "registry/image@sha256:candidate"
    ctl.expected_candidate_revision = "llm-council-candidate"
    ctl.validate_candidate_revision(candidate_revision_resource())
    state = ambiguous_deploy_state(converged=True)
    full = (
        f"projects/{rollout.FIXED_PROJECT}/locations/{rollout.FIXED_REGION}/"
        f"services/{rollout.FIXED_SERVICE}/"
        "revisions/llm-council-candidate"
    )
    state["latestCreatedRevision"] = full
    state["latestReadyRevision"] = full
    assert ctl._deploy_state_ownership_status(state) == "owned"

    state["latestCreatedRevision"] = full.replace(
        f"projects/{rollout.FIXED_PROJECT}/", "projects/wrong/"
    )
    assert ctl._deploy_state_ownership_status(state) == "contradictory"


def test_resume_evidence_is_read_by_generation_and_bound_into_lock():
    boundaries = ResumeBoundaries()
    evidence(boundaries)
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    ctl.start_promotion_deadline()
    ctl.prepare_resume()

    names = [event[0] for event in boundaries.events]
    assert names[0] == "lock-absent"
    assert names.count("gcs-read") == 14  # manifest + six source objects, twice
    lock = next(event for event in boundaries.events if event[0] == "gcs-create")
    assert lock[2]["resume_manifest_generation"] == "99"
    assert lock[2]["target_sha"] == SHA
    assert not any(name in {"build", "deploy-shadow", "paid"} for name in names)


@pytest.mark.parametrize("mutation", [
    lambda m: m.update(schema_version=2),
    lambda m: m.update(target_sha="b" * 40),
    lambda m: m.update(cumulative_paid_attempts=1),
    lambda m: m.update(cumulative_paid_attempts=2.0),
    lambda m: m.update(schema_version=True),
    lambda m: m.update(traffic_sha256="0" * 64),
    lambda m: m.update(extra=True),
    lambda m: m["sources"].pop(),
    lambda m: m["sources"][1].update(source_rollout_id="old-1"),
    lambda m: m["sources"][1].update(
        source_attestation_uri=m["sources"][0]["source_attestation_uri"]
    ),
])
def test_resume_manifest_content_hash_and_source_chain_fail_closed(mutation):
    boundaries = ResumeBoundaries()
    manifest = evidence(boundaries)
    mutation(manifest)
    boundaries.generations[(MANIFEST_URI, "99")] = manifest
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    ctl.start_promotion_deadline()
    with pytest.raises(rollout.ResumeRefusal):
        ctl.prepare_resume()
    assert not any(event[0] in {"build", "deploy-shadow", "paid"} for event in boundaries.events)


@pytest.mark.parametrize("field,value", [
    ("expected_attempt_number", 1.0),
    ("expected_attempt_number", True),
    ("schema_version", 1.0),
    ("schema_version", False),
])
def test_resume_attestation_integer_fields_require_exact_int(field, value):
    boundaries = ResumeBoundaries()
    manifest = evidence(boundaries)
    source = manifest["sources"][0]
    key = (source["source_attestation_uri"], source["source_attestation_generation"])
    boundaries.generations[key][field] = value
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    ctl.start_promotion_deadline()
    with pytest.raises(rollout.ResumeRefusal):
        ctl.prepare_resume()


@pytest.mark.parametrize("field,value", [
    ("source_approved_sha", SHA),
    ("target_sha", "b" * 40),
    ("service_url_sha256", "0" * 64),
    ("traffic_sha256", "0" * 64),
    ("prior_revision", "other"),
])
def test_resume_attestation_binding_mismatch_is_refused(field, value):
    boundaries = ResumeBoundaries()
    manifest = evidence(boundaries)
    source = manifest["sources"][0]
    key = (source["source_attestation_uri"], source["source_attestation_generation"])
    boundaries.generations[key][field] = value
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    ctl.start_promotion_deadline()
    with pytest.raises(rollout.ResumeRefusal):
        ctl.prepare_resume()


@pytest.mark.parametrize("object_kind,field,value", [
    ("checkpoint", "attempt_number", 1.0),
    ("checkpoint", "attempt_number", True),
    ("recovery", "paid_attempts", 1.0),
    ("recovery", "paid_attempts", True),
    ("recovery", "candidate_traffic_percent", 0.0),
    ("recovery", "candidate_traffic_percent", False),
    ("recovery", "service_generation", 71.0),
    ("recovery", "service_generation", True),
])
def test_resume_source_proof_integer_fields_require_exact_int(object_kind, field, value):
    boundaries = ResumeBoundaries()
    manifest = evidence(boundaries)
    source = manifest["sources"][0]
    key = (source[f"{object_kind}_uri"], source[f"{object_kind}_generation"])
    boundaries.generations[key][field] = value
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    ctl.start_promotion_deadline()
    with pytest.raises(rollout.ResumeRefusal):
        ctl.prepare_resume()


@pytest.mark.parametrize("source_number,mutation", [
    (1, lambda r: r.pop("candidate_image_digest")),
    (1, lambda r: r.update(extra=True)),
    (1, lambda r: r.update(status="ALREADY_CONVERGED_NO_TRAFFIC")),
    (1, lambda r: r.update(classification="succeeded")),
    (1, lambda r: r.update(paid_attempts=2)),
    (2, lambda r: r.update(cumulative_paid_attempts=1)),
    (1, lambda r: r.update(traffic_matches_snapshot=1)),
    (1, lambda r: r.update(candidate_traffic_percent=-1)),
    (1, lambda r: r.update(rollout_id="old-2")),
    (1, lambda r: r.update(prior_revision="other")),
    (1, lambda r: r.update(candidate_revision="other-service-candidate")),
    (1, lambda r: r.update(candidate_revision="llm-council_candidate")),
    (1, lambda r: r.update(candidate_image_digest="d" * 64)),
    (1, lambda r: r.update(candidate_image_digest=f"sha256:{'D' * 64}")),
    (1, lambda r: r.update(lock_generation=101)),
    (1, lambda r: r.update(lock_generation="1.0")),
    (1, lambda r: r.update(service_uid="123E4567-E89B-42D3-A456-426614174000")),
    (1, lambda r: r.update(service_uid="not-a-uuid")),
    (1, lambda r: r.update(service_generation=0)),
])
def test_resume_recovery_rejects_missing_extra_or_malformed_fields(
    source_number, mutation
):
    boundaries = ResumeBoundaries()
    manifest = evidence(boundaries)
    source = manifest["sources"][source_number - 1]
    key = (source["recovery_uri"], source["recovery_generation"])
    mutation(boundaries.generations[key])
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    ctl.start_promotion_deadline()
    with pytest.raises(rollout.ResumeRefusal):
        ctl.prepare_resume()
    assert not any(
        event[0] in {"build", "deploy-shadow", "paid"}
        for event in boundaries.events
    )


@pytest.mark.parametrize(
    "source_number,field",
    [
        *((1, field) for field in sorted(RECOVERY_COMMON_FIELDS | {"paid_attempts"})),
        *((2, field) for field in sorted(
            RECOVERY_COMMON_FIELDS | {"cumulative_paid_attempts"}
        )),
    ],
)
def test_resume_recovery_rejects_every_missing_exact_source_field(
    source_number, field
):
    boundaries = ResumeBoundaries()
    manifest = evidence(boundaries)
    source = manifest["sources"][source_number - 1]
    key = (source["recovery_uri"], source["recovery_generation"])
    boundaries.generations[key].pop(field)
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    ctl.start_promotion_deadline()
    with pytest.raises(rollout.ResumeRefusal):
        ctl.prepare_resume()


def test_resume_source_proofs_reject_shared_wrong_rollout_id():
    boundaries = ResumeBoundaries()
    manifest = evidence(boundaries)
    source = manifest["sources"][0]
    for object_kind in ("checkpoint", "recovery"):
        key = (source[f"{object_kind}_uri"], source[f"{object_kind}_generation"])
        boundaries.generations[key]["rollout_id"] = "same-wrong-id"
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    ctl.start_promotion_deadline()
    with pytest.raises(rollout.ResumeRefusal):
        ctl.prepare_resume()


@pytest.mark.parametrize("value", ["0", "2", False, True, 0.0, 2.0])
@pytest.mark.parametrize("entrypoint", ["controller", "run_rollout"])
def test_python_rollout_apis_require_exact_int_prior_paid_attempts(value, entrypoint):
    boundaries = ResumeBoundaries()
    kwargs = {
        "boundaries": boundaries,
        "rollout_id": "new",
        "approved_sha": SHA,
        "prior_paid_attempts": value,
    }
    target = rollout.RolloutController if entrypoint == "controller" else rollout.run_rollout
    with pytest.raises(ValueError, match="prior paid attempts"):
        target(**kwargs)
    assert not any(event[0] in {"build", "deploy-shadow", "paid"} for event in boundaries.events)


@pytest.mark.parametrize("mutation", [
    lambda a: a.update(extra=True),
    lambda a: a.pop("traffic_sha256"),
    lambda a: a.update(checkpoint_uri=a["checkpoint_uri"].replace("attempts", "wrong")),
    lambda a: a.update(recovery_generation="999"),
])
def test_resume_attestation_rejects_unknown_missing_or_reference_mismatch(mutation):
    boundaries = ResumeBoundaries()
    manifest = evidence(boundaries)
    source = manifest["sources"][0]
    key = (source["source_attestation_uri"], source["source_attestation_generation"])
    mutation(boundaries.generations[key])
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    ctl.start_promotion_deadline()
    with pytest.raises(rollout.ResumeRefusal):
        ctl.prepare_resume()


def test_resume_executes_only_attempts_three_through_six_without_retry():
    boundaries = ResumeBoundaries()
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    for stage, surface in (("shadow", "sync"), ("shadow", "stream"), ("final", "sync"), ("final", "stream")):
        ctl.run_paid_attempt(stage=stage, surface=surface, url="https://service.example")
    assert ctl.attempt_count == 6
    assert [event[1:3] for event in boundaries.events if event[0] == "paid"] == [
        ("shadow", "sync"), ("shadow", "stream"), ("final", "sync"), ("final", "stream")
    ]
    with pytest.raises(rollout.PaidAttemptLimitError):
        ctl.run_paid_attempt(stage="extra", surface="sync", url="https://service.example")


def test_resume_infrastructure_failure_is_not_retried():
    boundaries = ResumeBoundaries()
    boundaries.network_outcomes = [rollout.InfrastructureFailure("timeout")]
    ctl = rollout.RolloutController(
        boundaries=boundaries, rollout_id="new", approved_sha=SHA,
        mode=rollout.RESUME_MODE, prior_paid_attempts=2,
        resume_manifest_uri=MANIFEST_URI, resume_manifest_generation="99",
    )
    with pytest.raises(rollout.InfrastructureFailure):
        ctl.run_paid_attempt(stage="shadow", surface="sync", url="https://service.example")
    assert len([event for event in boundaries.events if event[0] == "paid"]) == 1
    assert ctl.paid_gate_state == "terminally_closed"
