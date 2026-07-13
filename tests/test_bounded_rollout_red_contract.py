"""Executable RED contracts for the prospective bounded rollout controller.

The imported controller is intentionally not implemented in the RED phase. Its
injected boundaries make ordering, persistence, concurrency, and failure
semantics executable without Cloud Run, GCS, git, or paid network access.
"""

from __future__ import annotations

import hashlib
import importlib
import inspect
import urllib.error
from copy import deepcopy
from datetime import UTC, datetime, timedelta

import pytest

EXPECTED_ATTEMPTS = [
    ("prior", "stream", "https://service.example"),
    ("shadow", "sync", "https://shadow.example"),
    ("shadow", "stream", "https://shadow.example"),
    ("final", "sync", "https://service.example"),
    ("final", "stream", "https://service.example"),
]


def api():
    """Load the prospective implementation independently for each RED test."""
    return importlib.import_module("scripts.bounded_rollout")


class Boundaries:
    def __init__(self):
        module = api()
        self.project = module.FIXED_PROJECT
        self.region = module.FIXED_REGION
        self.service = module.FIXED_SERVICE
        self.events = []
        self.objects = {}
        self.network_outcomes = []
        self.state = None
        self.lock_generation = "17"
        self.clock = FakeClock()
        self.operation_polls = []
        self.service_polls = []
        self.health_identity = {"revision": "prior", "digest": "old"}
        self.lock_held = True
        self.service_base_url = "https://live-service-abc-uc.a.run.app"

    def create_gcs(self, name, value, *, if_generation_match):
        self.events.append(("gcs-create", name, deepcopy(value), if_generation_match))
        if name in self.objects or if_generation_match != 0:
            raise RuntimeError("precondition failed")
        self.objects[name] = deepcopy(value)
        return self.lock_generation

    def verify_benchmark(self):
        self.events.append(("benchmark",))

    def build(self, *, timeout):
        self.events.append(("build", timeout))
        return "registry/image@sha256:candidate"

    def deploy_shadow(self, image, *, timeout):
        self.events.append(("deploy-shadow", image, timeout))
        return "candidate"

    def paid_request(self, stage, surface, url, timeout):
        self.events.append(("paid", stage, surface, url, timeout))
        outcome = self.network_outcomes.pop(0) if self.network_outcomes else {"ok": True}
        if isinstance(outcome, BaseException):
            raise outcome
        return outcome

    def service_get(self):
        self.events.append(("service-get",))
        return deepcopy(self.state)

    def service_patch(self, body, *, etag):
        self.events.append(("service-patch", deepcopy(body), etag))
        self.state["traffic"] = deepcopy(body["traffic"])
        self.state["etag"] = "etag-next"
        self.state["generation"] += 1
        self.state["observed_generation"] = self.state["generation"]
        return deepcopy(self.state)

    def poll_operation(self, name, *, timeout):
        self.events.append(("operation-poll", name, timeout))
        return deepcopy(self.operation_polls.pop(0))

    def poll_service(self, *, timeout):
        self.events.append(("service-poll", timeout))
        return deepcopy(self.service_polls.pop(0))

    def health(self, url, expected, *, timeout, allow_legacy_prior=False):
        self.events.append(
            ("health", url, deepcopy(expected), allow_legacy_prior, timeout)
        )
        return deepcopy(self.health_identity)

    def observe(self, percent, *, duration, timeout):
        self.events.append(("observe", percent, duration, timeout))

    def sleep(self, seconds):
        self.events.append(("sleep", seconds))
        self.clock.advance(seconds)

    def release_lock(self, generation):
        self.events.append(("lock-release", generation))
        self.lock_held = False

    def verify_lock(self, generation):
        self.events.append(("lock-verify", generation))
        return self.lock_held

class FakeClock:
    def __init__(self, monotonic=100.0, now=None):
        self.value = monotonic
        self.wall = now or datetime(2026, 7, 13, 12, tzinfo=UTC)

    def monotonic(self):
        return self.value

    def now(self):
        return self.wall

    def advance(self, seconds):
        self.value += seconds
        self.wall += timedelta(seconds=seconds)


class V2Boundaries(Boundaries):
    def revision_resource_name(self, revision):
        return revision

    def revision_get(self, revision, *, timeout=None):
        self.events.append(("revision-get", revision, timeout))
        return candidate_revision_resource(revision)

    def service_patch(self, body, *, etag, timeout=None):
        self.events.append(("service-patch", deepcopy(body), etag, timeout))
        return v2_operation(done=False)


class AdvancingV2Boundaries(V2Boundaries):
    def poll_operation(self, name, *, timeout):
        result = super().poll_operation(name, timeout=timeout)
        self.clock.advance(7)
        return result

    def poll_service(self, *, timeout):
        result = super().poll_service(timeout=timeout)
        self.clock.advance(11)
        return result


class PrematureLockReleaseBoundaries(V2Boundaries):
    def poll_service(self, *, timeout):
        result = super().poll_service(timeout=timeout)
        self.lock_held = False
        return result


def controller(boundaries, **kwargs):
    module = api()
    rollout = module.RolloutController(
        boundaries=boundaries,
        rollout_id="rollout-123",
        approved_sha="a" * 40,
        **kwargs,
    )
    rollout.prior_service_url = boundaries.service_base_url
    return rollout


def prior_state():
    return {
        "uid": "service-uid",
        "etag": "etag-1",
        "generation": 41,
        "observed_generation": 41,
        "reconciling": False,
        "traffic": [
            {"revision": "prior", "percent": 100},
            {"revision": "prior", "percent": 0, "tag": "stable"},
            {"revision": "debug", "percent": 0, "tag": "unrelated"},
        ],
    }


def v2_service(
    *,
    generation="41",
    observed_generation="41",
    etag="etag-41",
    reconciling=False,
    uid="service-uid",
    traffic=None,
    traffic_statuses=None,
):
    """Realistic Cloud Run v2 Service payload with canonical tag assignments."""
    traffic = deepcopy(traffic) if traffic is not None else [
        {"type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION", "revision": "prior", "percent": 100},
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "prior",
            "percent": 0,
            "tag": "stable",
        },
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "debug",
            "percent": 0,
            "tag": "unrelated",
        },
    ]
    traffic_statuses = deepcopy(traffic_statuses) if traffic_statuses is not None else deepcopy(traffic)
    for item in traffic_statuses:
        if "tag" in item:
            item["uri"] = f"https://{item['tag']}---service.example"
    return {
        "name": "projects/project/locations/us-central1/services/llm-council",
        "uri": "https://live-service-abc-uc.a.run.app",
        "uid": uid,
        "generation": generation,
        "observedGeneration": observed_generation,
        "etag": etag,
        "reconciling": reconciling,
        "latestReadyRevision": "prior",
        "traffic": traffic,
        "trafficStatuses": traffic_statuses,
    }


def v2_operation(*, done, response=None):
    operation = {
        "name": "projects/project/locations/us-central1/operations/traffic-42",
        "metadata": {
            "@type": "type.googleapis.com/google.cloud.run.v2.Service",
            "target": "projects/project/locations/us-central1/services/llm-council",
        },
        "done": done,
    }
    if response is not None:
        operation["response"] = deepcopy(response)
    return operation


def ambiguous_deploy_state(*, converged):
    # Live Cloud Run v2 evidence: --no-traffic preserves the pre-deploy
    # traffic and statuses exactly. The automatic candidate target appears
    # only after the subsequent tagged traffic PATCH.
    deployed_traffic = v2_service()["traffic"]
    state = v2_service(
        generation="42",
        observed_generation="42" if converged else "41",
        etag="etag-42",
        reconciling=not converged,
        traffic=deployed_traffic,
        traffic_statuses=deployed_traffic,
    )
    state.update(
        latestCreatedRevision="llm-council-candidate",
        latestReadyRevision="llm-council-candidate" if converged else "prior",
        template={
            "revision": "llm-council-candidate",
            "containers": [
                {
                    "image": "registry/image@sha256:candidate",
                    "env": [
                        {"name": "DEPLOY_REVISION", "value": "a" * 40},
                        {
                            "name": "APP_IMAGE_DIGEST",
                            "value": "registry/image@sha256:candidate",
                        },
                    ],
                }
            ],
        },
    )
    return state


def candidate_revision_resource(name="llm-council-candidate"):
    return {
        "name": name,
        "containers": [{
            "image": "registry/image@sha256:candidate",
            "env": [
                {"name": "DEPLOY_REVISION", "value": "a" * 40},
                {"name": "APP_IMAGE_DIGEST", "value": "registry/image@sha256:candidate"},
            ],
        }],
        "conditions": [
            {
                "type": "Ready",
                "state": "CONDITION_SUCCEEDED",
                "revisionReason": "RETIRED",
            },
            {
                "type": "Active",
                "state": "CONDITION_FAILED",
                "severity": "INFO",
                "revisionReason": "RETIRED",
            },
            {
                "type": "ResourcesAvailable",
                "state": "CONDITION_RECONCILING",
                "revisionReason": "RETIRED",
            },
            {"type": "ContainerReady", "state": "CONDITION_SUCCEEDED"},
            {
                "type": "MinInstancesProvisioned",
                "state": "CONDITION_FAILED",
                "severity": "INFO",
                "revisionReason": "MIN_INSTANCES_NOT_PROVISIONED",
            },
        ],
    }


def candidate_condition(revision, kind):
    return next(item for item in revision["conditions"] if item["type"] == kind)


def retired_ready_deploy_state():
    state = ambiguous_deploy_state(converged=True)
    state["latestReadyRevision"] = "prior"
    state["terminalCondition"] = {"type": "Ready", "state": "CONDITION_SUCCEEDED"}
    state["conditions"] = [{
        "type": "ConfigurationsReady",
        "state": "CONDITION_SUCCEEDED",
        "revisionReason": "RETIRED",
    }]
    return state


def test_approved_full_forgejo_sha_and_clean_local_head_are_preconditions():
    boundaries = Boundaries()
    rollout = controller(boundaries)
    full_sha = "a" * 40

    rollout.verify_source(
        dispatch_sha=full_sha,
        checkout_sha=full_sha,
        forgejo_master_sha=full_sha,
        local_head_sha=full_sha,
        worktree_clean=True,
    )
    assert boundaries.events == []

    for change in (
        {"dispatch_sha": "a" * 12},
        {"checkout_sha": "b" * 40},
        {"forgejo_master_sha": "b" * 40},
        {"local_head_sha": "b" * 40},
        {"worktree_clean": False},
    ):
        values = {
            "dispatch_sha": full_sha,
            "checkout_sha": full_sha,
            "forgejo_master_sha": full_sha,
            "local_head_sha": full_sha,
            "worktree_clean": True,
        }
        values.update(change)
        with pytest.raises(api().SourceBindingError):
            rollout.verify_source(**values)
        assert boundaries.events == []


def test_lock_is_acquired_before_service_read_build_or_paid_access():
    boundaries = Boundaries()
    boundaries.state = prior_state()
    rollout = controller(boundaries)

    rollout.acquire_lock_and_snapshot()

    assert boundaries.events[0][0] == "gcs-create"
    assert boundaries.events[0][3] == 0
    assert boundaries.events[1] == ("service-get",)
    assert not any(event[0] in {"build", "paid", "service-patch"} for event in boundaries.events[:2])


def test_initial_capture_pins_exact_live_service_url_for_both_terminal_rollback_paths():
    live_url = "https://exact-live-service-7xk-uc.a.run.app"
    for already_restored in (False, True):
        boundaries = V2Boundaries()
        snapshot = v2_service()
        snapshot["uri"] = live_url
        rollout = controller(boundaries, clock=boundaries.clock)
        rollout.prior_service_url = None
        boundaries.state = deepcopy(snapshot)
        rollout.capture_snapshot()
        rollout.prior_identity = deepcopy(boundaries.health_identity)
        rollout.lock_generation = "17"
        rollout.mutation_armed = True

        if already_restored:
            current = v2_service(generation="42", observed_generation="42", etag="etag-42")
            current["uri"] = live_url
            boundaries.state = current
            rollout.rollout_owned_state = deepcopy(current)
        else:
            owner = v2_service(
                generation="43", observed_generation="43", etag="etag-43",
                traffic=_candidate_traffic(), traffic_statuses=_candidate_traffic(),
            )
            owner["uri"] = live_url
            restored = v2_service(generation="44", observed_generation="44", etag="etag-44")
            restored["uri"] = live_url
            boundaries.state = owner
            boundaries.operation_polls = [v2_operation(done=True, response=restored)]
            boundaries.service_polls = [restored]
            rollout.rollout_owned_state = deepcopy(owner)

        rollout.terminal_rollback(reason="proof")

        health = [event for event in boundaries.events if event[0] == "health"]
        assert health[-1][1] == live_url


@pytest.mark.parametrize("uri", [None, "", "http://service.example", "https:///missing", "not-a-url"])
def test_initial_capture_fails_closed_without_valid_live_service_url(uri):
    boundaries = V2Boundaries()
    boundaries.state = v2_service()
    if uri is None:
        boundaries.state.pop("uri")
    else:
        boundaries.state["uri"] = uri
    rollout = controller(boundaries)
    rollout.prior_service_url = None

    with pytest.raises(api().InitialStateRefusal, match="service URI"):
        rollout.capture_snapshot()


def test_existing_or_malformed_lock_is_rejected_before_build_or_service_access():
    for existing in (
        {"rollout_id": "other", "owner": "operator", "generation": "17"},
        {"rollout_id": "rollout-123"},
        "malformed-owner-content",
    ):
        boundaries = Boundaries()
        boundaries.objects[
            "gs://tke-phi-privacy-engine_cloudbuild/rollout-locks/"
            "tke-phi-privacy-engine/us-central1/llm-council.lock"
        ] = existing
        rollout = controller(boundaries)

        with pytest.raises(api().LockRecoveryRequired) as caught:
            rollout.acquire_lock_and_snapshot()

        assert caught.value.status == "stale_lock_recovery_required"
        assert not any(event[0] in {"build", "service-get", "paid", "service-patch"} for event in boundaries.events)


@pytest.mark.parametrize(
    "receipt",
    [
        {},
        {"owner": "operator"},
        {"owner": "other", "generation": "17"},
        {"owner": "operator", "generation": "not-a-generation"},
        {"owner": ["operator"], "generation": "17"},
    ],
)
def test_malformed_or_mismatched_acquired_lock_ownership_is_rejected(receipt):
    with pytest.raises(api().LockRefusal):
        api().validate_lock_receipt(receipt, expected_owner="operator")


@pytest.mark.parametrize(
    "mutation",
    [
        lambda state: state.update(observedGeneration="40"),
        lambda state: state.update(reconciling=True),
        lambda state: state.update(generation="not-a-generation"),
        lambda state: state.update(observedGeneration=None),
        lambda state: state.update(uid=""),
        lambda state: state.update(etag=""),
        lambda state: state.update(trafficStatuses=[]),
        lambda state: state["traffic"].append(
            {"type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION", "revision": "other", "percent": 1}
        ),
        lambda state: state["traffic"][0].update(percent=99),
        lambda state: state["traffic"][0].pop("revision"),
    ],
)
def test_initial_service_must_be_converged_well_formed_and_one_resolved_prior(mutation):
    state = v2_service()
    mutation(state)

    with pytest.raises(api().InitialStateRefusal):
        api().validate_initial_service(state)


def test_initial_service_accepts_canonical_protobuf_json_default_omissions():
    traffic = [
        {"type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION", "revision": "prior", "percent": 100},
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "prior",
            "tag": "stable",
        },
    ]
    statuses = deepcopy(traffic)
    statuses[1]["uri"] = "https://stable---service.example"
    state = v2_service(traffic=traffic, traffic_statuses=statuses)
    state.pop("reconciling")

    assert api().validate_initial_service(state) == state
    normalized = api()._normalized_traffic(state["traffic"])
    assert next(item for item in normalized if item.get("tag") == "stable")["percent"] == 0


def test_initial_service_accepts_semantically_equal_reordered_statuses():
    state = v2_service()
    state["trafficStatuses"] = list(reversed(state["trafficStatuses"]))

    assert api().validate_initial_service(state) == state


@pytest.mark.parametrize("reconciling", [None, True, False, 0, "false", {}, []])
def test_initial_service_rejects_true_or_malformed_reconciling(reconciling):
    state = v2_service(reconciling=reconciling)

    if reconciling is False:
        assert api().validate_initial_service(state) == state
    else:
        with pytest.raises(api().InitialStateRefusal):
            api().validate_initial_service(state)


@pytest.mark.parametrize("percent", [None, True, "0", -1, 101, 1.5])
def test_traffic_rejects_invalid_explicit_percent(percent):
    state = v2_service()
    state["traffic"][1]["percent"] = percent
    state["trafficStatuses"][1]["percent"] = percent

    with pytest.raises(api().InitialStateRefusal):
        api().validate_initial_service(state)


def test_invalid_initial_state_refuses_before_build_mutation_or_paid_call_and_releases_lock():
    boundaries = Boundaries()
    boundaries.state = v2_service(reconciling=True)

    with pytest.raises(api().InitialStateRefusal):
        api().run_rollout(
            boundaries=boundaries,
            rollout_id="rollout-123",
            approved_sha="a" * 40,
            clock=boundaries.clock,
        )

    names = [event[0] for event in boundaries.events]
    assert names == ["benchmark", "gcs-create", "service-get", "lock-release"]
    assert not any(name in {"build", "service-patch", "deploy-shadow", "paid"} for name in names)
    assert boundaries.lock_held is False


def test_attempt_object_is_immutable_content_free_and_persisted_before_network():
    boundaries = Boundaries()
    rollout = controller(boundaries)

    rollout.run_paid_attempt(stage="shadow", surface="sync", url="https://shadow.example")

    started, paid, completed = boundaries.events
    assert started[0] == "gcs-create" and paid[0] == "paid" and completed[0] == "gcs-create"
    assert started[1] == "rollout-evidence/rollout-123/attempts/0001-started.json"
    assert completed[1] == "rollout-evidence/rollout-123/attempts/0001-completed.json"
    assert started[3] == completed[3] == 0
    assert started[2] == {
        "rollout_id": "rollout-123",
        "stage": "shadow",
        "surface": "sync",
        "url_sha256": hashlib.sha256(b"https://shadow.example").hexdigest(),
        "attempt_number": 1,
        "paid_gate_state": "open",
        "classification": "started",
    }
    assert completed[2] == {
        "rollout_id": "rollout-123",
        "stage": "shadow",
        "surface": "sync",
        "url_sha256": hashlib.sha256(b"https://shadow.example").hexdigest(),
        "attempt_number": 1,
        "paid_gate_state": "open",
        "classification": "succeeded",
    }
    for record in (started[2], completed[2]):
        assert set(record).isdisjoint({"url", "prompt", "response", "content", "error"})


def test_exact_five_call_workflow_and_no_paid_staged_or_restoration_calls():
    boundaries = Boundaries()
    boundaries.state = prior_state()
    rollout = controller(boundaries)

    rollout.execute_paid_plan()
    rollout.observe_stage(10)
    rollout.planned_restore(prior_state())
    rollout.observe_stage(10)
    rollout.observe_stage(50)

    paid = [(event[1], event[2], event[3]) for event in boundaries.events if event[0] == "paid"]
    assert paid == EXPECTED_ATTEMPTS
    assert all(stage not in {"rehearsal-10", "restoration", "restarted-10", "50"} for stage, _, _ in paid)


def test_top_level_run_rollout_owns_non_reorderable_full_sequence():
    module = api()
    parameters = inspect.signature(module.run_rollout).parameters
    assert "attempts" not in parameters
    assert "paid_plan" not in parameters

    boundaries = Boundaries()
    boundaries.state = prior_state()
    module.run_rollout(
        boundaries=boundaries,
        rollout_id="rollout-123",
        approved_sha="a" * 40,
        clock=boundaries.clock,
    )

    names = [event[0] for event in boundaries.events]
    required_order = [
        "benchmark",
        "gcs-create",  # lock
        "service-get",  # validate prior after lock and before expensive build
        "build",
        "paid",  # prior stream
        "deploy-shadow",
        "health",
        "paid",  # shadow sync
        "paid",  # shadow stream
        "stage-10",
        "planned-restore",
        "stage-10",
        "observe",  # restarted 10%
        "stage-50",
        "observe",
        "stage-100",
        "health",
        "final-production-health-verify",
        "paid",  # final sync
        "paid",  # final stream
        "final-verify",
        "rollback-mutation-disarm",
        "lock-release",
    ]
    cursor = 0
    for name in names:
        if cursor < len(required_order) and name == required_order[cursor]:
            cursor += 1
    assert cursor == len(required_order)
    assert [(event[1], event[2], event[3]) for event in boundaries.events if event[0] == "paid"] == EXPECTED_ATTEMPTS
    strict_final_index = boundaries.events.index(("final-production-health-verify",))
    final_paid_indices = [
        index
        for index, event in enumerate(boundaries.events)
        if len(event) >= 3 and event[0] == "paid" and event[1] == "final"
    ]
    assert final_paid_indices and strict_final_index < min(final_paid_indices)
    retention_index = next(
        index
        for index, event in enumerate(boundaries.events)
        if event[0] == "gcs-create" and event[1] == "rollout-evidence/rollout-123/retention.json"
    )
    assert names.index("final-verify") < retention_index < names.index("rollback-mutation-disarm")


@pytest.mark.parametrize("classification", ["http_429", "http_503", "timeout", "connection_reset"])
def test_one_global_same_stage_infrastructure_retry_allows_at_most_six(classification):
    module = api()
    boundaries = Boundaries()
    boundaries.network_outcomes = [
        {"ok": True},
        module.InfrastructureFailure(classification),
        {"ok": True},
        {"ok": True},
        {"ok": True},
        {"ok": True},
    ]
    rollout = controller(boundaries)

    rollout.execute_paid_plan()

    paid = [event for event in boundaries.events if event[0] == "paid"]
    assert len(paid) == 6
    assert paid[1][1:4] == paid[2][1:4]
    retry = boundaries.objects["rollout-evidence/rollout-123/attempts/0003-started.json"]
    assert retry["retry_of"] == 2
    with pytest.raises(module.PaidAttemptLimitError):
        rollout.run_paid_attempt(stage="extra", surface="sync", url="https://service.example")


@pytest.mark.parametrize("value", [1, 3, 4, 5, 6, "1", "3", "4", "5", "6"])
def test_arbitrary_paid_attempt_carry_forward_is_refused(value):
    with pytest.raises(ValueError, match="fresh mode forbids resume authorization|prior paid attempts"):
        controller(Boundaries(), prior_paid_attempts=value)


def test_default_future_run_starts_paid_ledger_at_one_unchanged():
    boundaries = Boundaries()
    rollout = controller(boundaries)
    rollout.run_paid_attempt(stage="prior", surface="stream", url="https://service.example")
    assert rollout.attempt_count == 1
    assert "rollout-evidence/rollout-123/attempts/0001-started.json" in boundaries.objects


@pytest.mark.parametrize("value", [True, False, 0.0, 2.0, 0.5, 1.5, -1, 1, 3, 6, 7, "-1", "0", "1", "2", "3", "6", "7", "01", "1.0", "2.0", "0.5", "", None, object()])
def test_prior_paid_attempt_input_rejects_bool_negative_over_max_and_malformed(value):
    with pytest.raises(ValueError, match="prior paid attempts"):
        api().validate_prior_paid_attempts(value)


@pytest.mark.parametrize("attribute,value", [
    ("project", "wrong-project"),
    ("region", "wrong-region"),
    ("service", "wrong-service"),
])
def test_controller_rejects_conflicting_production_namespace_before_boundaries(attribute, value):
    module = api()
    boundaries = Boundaries()
    setattr(boundaries, attribute, value)
    with pytest.raises(module.SourceBindingError):
        controller(boundaries)
    assert boundaries.events == []


def test_second_infrastructure_failure_is_terminal_without_another_retry():
    module = api()
    boundaries = Boundaries()
    boundaries.network_outcomes = [
        module.InfrastructureFailure("timeout"),
        module.InfrastructureFailure("http_503"),
    ]
    rollout = controller(boundaries)

    with pytest.raises(module.InfrastructureFailure):
        rollout.run_paid_attempt(stage="shadow", surface="sync", url="https://shadow.example")
    assert len([event for event in boundaries.events if event[0] == "paid"]) == 2
    assert rollout.paid_gate_state == "terminally_closed"


@pytest.mark.parametrize(
    "classification",
    ["content", "objective", "schema", "fallback", "route", "policy", "usage", "pricing"],
)
def test_semantic_failure_is_never_retried_and_terminally_closes_paid_gate(classification):
    module = api()
    boundaries = Boundaries()
    boundaries.state = prior_state()
    boundaries.network_outcomes = [module.SemanticFailure(classification)]
    rollout = controller(boundaries)

    with pytest.raises(module.SemanticFailure):
        rollout.run_paid_attempt(stage="shadow", surface="sync", url="https://shadow.example")

    assert len([event for event in boundaries.events if event[0] == "paid"]) == 1
    assert rollout.paid_gate_state == "terminally_closed"


def test_planned_restore_temporarily_blocks_paid_calls_then_allows_final_calls():
    boundaries = Boundaries()
    boundaries.state = prior_state()
    rollout = controller(boundaries)
    observed_gate = []

    rollout.planned_restore(prior_state(), during_restore=lambda: observed_gate.append(rollout.paid_gate_state))
    rollout.run_paid_attempt(stage="final", surface="sync", url="https://service.example")

    assert observed_gate == ["restoration_closed"]
    assert rollout.paid_gate_state == "open"
    assert [event[1] for event in boundaries.events if event[0] == "paid"] == ["final"]


def test_terminal_rollback_closes_paid_gate_before_exact_restore_and_forever():
    module = api()
    boundaries = Boundaries()
    boundaries.state = prior_state()
    rollout = controller(boundaries)
    rollout.snapshot = prior_state()
    boundaries.state["traffic"] = [{"revision": "candidate", "percent": 100}]
    rollout.rollout_owned_state = deepcopy(boundaries.state)

    rollout.terminal_rollback(reason="failure")

    close_index = boundaries.events.index(("paid-gate-terminal-close",))
    patch_index = next(i for i, event in enumerate(boundaries.events) if event[0] == "service-patch")
    assert close_index < patch_index
    assert boundaries.state["traffic"] == prior_state()["traffic"]
    with pytest.raises(module.PaidGateClosedError):
        rollout.run_paid_attempt(stage="final", surface="stream", url="https://service.example")


def test_rollback_proves_exact_tags_health_uid_generation_etag_before_lock_release():
    boundaries = V2Boundaries()
    snapshot = v2_service()
    restored = v2_service(generation="44", observed_generation="44", etag="etag-44")
    boundaries.state = v2_service(
        generation="43",
        observed_generation="43",
        etag="etag-43",
        traffic=[
            {"type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION", "revision": "candidate", "percent": 0},
            {
                "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
                "revision": "candidate",
                "percent": 100,
                "tag": "shadow-rollout-123",
            },
            {
                "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
                "revision": "debug",
                "percent": 0,
                "tag": "unrelated",
            },
        ],
    )
    boundaries.operation_polls = [v2_operation(done=True, response=restored)]
    boundaries.service_polls = [restored]
    boundaries.health_identity = {"revision": "prior", "digest": "old"}
    rollout = controller(boundaries, clock=boundaries.clock, rollback_seconds=300)
    rollout.snapshot = snapshot
    rollout.prior_identity = deepcopy(boundaries.health_identity)
    rollout.lock_generation = "17"
    rollout.mutation_armed = True
    rollout.rollout_owned_state = deepcopy(boundaries.state)

    rollout.terminal_rollback(reason="failure")

    patch = next(event for event in boundaries.events if event[0] == "service-patch")
    assert patch[1] == {"traffic": snapshot["traffic"]}
    assert patch[2] == "etag-43"
    assert not any(event[0] == "paid" for event in boundaries.events)
    names = [event[0] for event in boundaries.events]
    assert names.index("operation-poll") < names.index("service-poll") < names.index("health")
    assert names.index("health") < names.index("lock-release")
    assert restored["uid"] == snapshot["uid"]
    assert restored["generation"] == restored["observedGeneration"]
    assert restored["reconciling"] is False
    assert restored["etag"] not in {snapshot["etag"], "etag-43"}
    assert restored["traffic"] == snapshot["traffic"]
    assert all(item["revision"] != "candidate" for item in patch[1]["traffic"])


def test_already_restored_terminal_rollback_proves_health_and_cas_lock_without_patch():
    boundaries = V2Boundaries()
    current = v2_service(generation="42", observed_generation="42", etag="etag-42")
    boundaries.state = current
    rollout = controller(boundaries, clock=boundaries.clock)
    rollout.snapshot = v2_service()
    rollout.prior_identity = deepcopy(boundaries.health_identity)
    rollout.lock_generation = "17"
    rollout.mutation_armed = True
    rollout.rollout_owned_state = deepcopy(current)

    rollout.terminal_rollback(reason="deploy-retired")

    assert not any(event[0] == "service-patch" for event in boundaries.events)
    names = [event[0] for event in boundaries.events]
    assert names.index("health") < names.index("lock-verify") < names.index("lock-release")
    assert rollout.mutation_armed is False
    assert rollout.lock_generation is None


def test_already_restored_rollback_retains_lock_when_cas_lock_proof_fails():
    boundaries = V2Boundaries()
    current = v2_service(generation="42", observed_generation="42", etag="etag-42")
    boundaries.state = current
    boundaries.lock_held = False
    rollout = controller(boundaries, clock=boundaries.clock)
    rollout.snapshot = v2_service()
    rollout.prior_identity = deepcopy(boundaries.health_identity)
    rollout.lock_generation = "17"
    rollout.mutation_armed = True
    rollout.rollout_owned_state = deepcopy(current)

    with pytest.raises(api().RollbackProofError):
        rollout.terminal_rollback(reason="deploy-retired")

    assert not any(event[0] in {"service-patch", "lock-release"} for event in boundaries.events)
    assert rollout.mutation_armed is True


def test_failed_rollback_proof_retains_lock_and_never_calls_paid_probe():
    boundaries = V2Boundaries()
    snapshot = v2_service()
    stale = v2_service(generation="44", observed_generation="43", etag="etag-44", reconciling=True)
    boundaries.state = v2_service(
        generation="43", observed_generation="43", etag="etag-43",
        traffic=_candidate_traffic(), traffic_statuses=_candidate_traffic(),
    )
    boundaries.operation_polls = [v2_operation(done=True, response=stale)]
    boundaries.service_polls = [stale]
    boundaries.health_identity = {"revision": "candidate", "digest": "new"}
    rollout = controller(boundaries, clock=boundaries.clock, rollback_seconds=300)
    rollout.snapshot = snapshot
    rollout.prior_identity = {"revision": "prior", "digest": "old"}
    rollout.lock_generation = "17"
    rollout.mutation_armed = True
    rollout.rollout_owned_state = deepcopy(boundaries.state)

    with pytest.raises(api().RollbackProofError):
        rollout.terminal_rollback(reason="failure")

    assert not any(event[0] in {"lock-release", "paid"} for event in boundaries.events)


def test_v2_patch_preserves_unrelated_tags_and_refuses_stale_etag_or_generation():
    module = api()
    boundaries = Boundaries()
    boundaries.state = prior_state()
    rollout = controller(boundaries)
    rollout.snapshot = deepcopy(boundaries.state)

    rollout.patch_stage(candidate="candidate", percent=100, expected_etag="etag-1", expected_generation=41)
    patch = next(event for event in boundaries.events if event[0] == "service-patch")
    assert patch[1] == {
        "traffic": [
            {"revision": "candidate", "percent": 100},
            {"revision": "prior", "percent": 0, "tag": "stable"},
            {"revision": "debug", "percent": 0, "tag": "unrelated"},
        ]
    }
    assert patch[2] == "etag-1"

    for etag, generation in (("stale", 42), ("etag-next", 40)):
        with pytest.raises(module.ConcurrencyRefusal):
            rollout.patch_stage(
                candidate="candidate",
                percent=50,
                expected_etag=etag,
                expected_generation=generation,
            )


def test_realistic_v2_long_running_operation_requires_exact_fresh_convergence():
    boundaries = V2Boundaries()
    initial = v2_service()
    requested = [
        {"type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION", "revision": "candidate", "percent": 100},
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "prior",
            "percent": 0,
            "tag": "stable",
        },
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "debug",
            "percent": 0,
            "tag": "unrelated",
        },
    ]
    reconciling = v2_service(
        generation="42",
        observed_generation="41",
        etag="etag-42",
        reconciling=True,
        traffic=requested,
        traffic_statuses=initial["trafficStatuses"],
    )
    converged = v2_service(
        generation="42",
        observed_generation="42",
        etag="etag-42",
        traffic=requested,
        traffic_statuses=requested,
    )
    converged.pop("reconciling")
    boundaries.state = initial
    boundaries.operation_polls = [
        v2_operation(done=False),
        v2_operation(done=True, response=reconciling),
    ]
    boundaries.service_polls = [reconciling, converged]
    rollout = controller(boundaries)

    result = rollout.transition_traffic(
        requested,
        expected_uid="service-uid",
        expected_generation="41",
        expected_etag="etag-41",
        timeout=120,
    )

    assert result == converged
    patch = next(event for event in boundaries.events if event[0] == "service-patch")
    assert patch[1] == {"traffic": requested}
    assert patch[2] == "etag-41"
    assert [event[0] for event in boundaries.events].count("operation-poll") == 2
    assert [event[0] for event in boundaries.events].count("service-poll") == 2
    assert result["uid"] == initial["uid"]
    assert result["etag"] != initial["etag"]
    assert result["observedGeneration"] == result["generation"]
    assert "reconciling" not in result
    assert [{key: value for key, value in item.items() if key != "uri"} for item in result["trafficStatuses"]] == requested


def test_live_shadow_traffic_preserves_automatic_and_tagged_candidate_targets():
    requested = api()._stage_traffic(
        v2_service(), "candidate", 0, shadow_tag="shadow-rollout-123"
    )

    assert [item for item in requested if item["revision"] == "candidate"] == [
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "candidate",
            "percent": 0,
        },
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "candidate",
            "percent": 0,
            "tag": "shadow-rollout-123",
        },
    ]


def test_live_no_traffic_deploy_preserves_exact_snapshot_without_candidate_target():
    snapshot = v2_service()

    assert api()._deploy_traffic(snapshot) == api()._normalized_traffic(snapshot["traffic"])
    assert not any(
        item["revision"] == "llm-council-candidate"
        for item in api()._deploy_traffic(snapshot)
    )


def test_deploy_ownership_rejects_candidate_target_before_shadow_tag_patch():
    rollout = controller(V2Boundaries())
    rollout.snapshot = v2_service()
    rollout.pre_deploy_state = deepcopy(rollout.snapshot)
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    rollout.validate_candidate_revision(candidate_revision_resource())
    deployed = ambiguous_deploy_state(converged=True)
    candidate_target = {
        "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
        "revision": "llm-council-candidate",
        "percent": 0,
    }
    deployed["traffic"].append(deepcopy(candidate_target))
    deployed["trafficStatuses"].append(deepcopy(candidate_target))

    assert rollout._deploy_state_ownership_status(deployed) == "contradictory"


@pytest.mark.parametrize("missing_tag", [None, "shadow-rollout-123"], ids=["untagged", "tagged"])
def test_tagged_stage_rejects_missing_either_candidate_target(missing_tag):
    boundaries = V2Boundaries()
    initial = v2_service()
    requested = api()._stage_traffic(
        initial, "llm-council-candidate", 0, shadow_tag="shadow-rollout-123"
    )
    incomplete = [
        item
        for item in requested
        if not (
            item["revision"] == "llm-council-candidate"
            and item.get("tag") == missing_tag
        )
    ]
    observed = v2_service(
        generation="42",
        observed_generation="42",
        etag="etag-42",
        traffic=incomplete,
        traffic_statuses=incomplete,
    )
    boundaries.state = initial
    boundaries.operation_polls = [v2_operation(done=True, response=observed)]
    rollout = controller(boundaries)

    with pytest.raises(api().ConcurrencyRefusal, match="traffic transition refused"):
        rollout.transition_traffic(
            requested,
            expected_uid="service-uid",
            expected_generation="41",
            expected_etag="etag-41",
            timeout=120,
        )


@pytest.mark.parametrize(
    ("percent", "shadow_tag"),
    [(0, "shadow-rollout-123"), (10, "shadow-rollout-123"),
     (50, "shadow-rollout-123"), (100, "shadow-rollout-123"), (100, None)],
    ids=["shadow", "ten", "fifty", "authoritative-100", "final"],
)
def test_tagged_positive_prior_is_transformed_in_place_with_exact_stage_total(
    percent, shadow_tag
):
    snapshot = v2_service(traffic=[
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "prior",
            "percent": 100,
            "tag": "stable",
        },
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "debug",
            "percent": 0,
            "tag": "unrelated",
        },
    ])

    requested = api()._stage_traffic(
        snapshot, "candidate", percent, shadow_tag=shadow_tag
    )

    prior_targets = [item for item in requested if item["revision"] == "prior"]
    assert prior_targets == [{
        "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
        "revision": "prior",
        "percent": 100 - percent,
        "tag": "stable",
    }]
    assert sum(item["percent"] for item in requested) == 100
    assert len({(item["revision"], item.get("tag")) for item in requested}) == len(requested)


@pytest.mark.parametrize(
    "traffic",
    [
        [
            {"revision": "prior", "percent": 100},
            {"revision": "prior", "percent": 0},
        ],
        [
            {"revision": "prior", "percent": 100, "tag": "stable"},
            {"revision": "debug", "percent": 0, "tag": "stable"},
        ],
        [
            {"revision": "prior", "percent": 99},
            {"revision": "debug", "percent": 0, "tag": "debug"},
        ],
    ],
    ids=["duplicate-revision-tag-identity", "duplicate-tag", "allocation-sum"],
)
def test_traffic_normalization_rejects_duplicate_identity_tag_and_non_100_sum(traffic):
    with pytest.raises(ValueError):
        api()._normalized_traffic(traffic)


def test_shadow_tag_collision_refuses_before_build_service_mutation_or_paid_call():
    boundaries = V2Boundaries()
    collision = v2_service()
    collision["traffic"][2]["tag"] = "shadow-rollout-123"
    collision["trafficStatuses"][2]["tag"] = "shadow-rollout-123"
    collision["trafficStatuses"][2]["uri"] = (
        "https://shadow-rollout-123---service.example"
    )
    boundaries.state = collision

    with pytest.raises(api().InitialStateRefusal, match="shadow tag collides"):
        api().run_rollout(
            boundaries=boundaries,
            rollout_id="rollout-123",
            approved_sha="a" * 40,
            clock=boundaries.clock,
        )

    assert not any(
        event[0] in {"build", "deploy-shadow", "service-patch", "paid"}
        for event in boundaries.events
    )


def test_live_reordered_candidate_targets_and_statuses_are_accepted():
    boundaries = V2Boundaries()
    requested = api()._stage_traffic(
        v2_service(), "candidate", 10, shadow_tag="shadow-rollout-123"
    )
    live_traffic = list(reversed(requested))
    live_statuses = deepcopy(requested[1:] + requested[:1])
    for item in live_statuses:
        if "tag" in item:
            item["uri"] = f"https://{item['tag']}---service.example"
    converged = v2_service(
        generation="42",
        observed_generation="42",
        etag="etag-42",
        traffic=live_traffic,
        traffic_statuses=live_statuses,
    )
    boundaries.state = v2_service()
    boundaries.operation_polls = [v2_operation(done=True, response=converged)]
    boundaries.service_polls = [converged]

    assert controller(boundaries).transition_traffic(
        requested,
        expected_uid="service-uid",
        expected_generation="41",
        expected_etag="etag-41",
        timeout=120,
    ) == converged


@pytest.mark.parametrize(
    "mutate",
    [
        lambda traffic: traffic.pop(0),
        lambda traffic: traffic.append({
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "other",
            "percent": 0,
        }),
        lambda traffic: traffic[0].update(percent=1),
        lambda traffic: traffic[1].update(tag="wrong-shadow"),
    ],
    ids=["missing", "extra", "wrong-percent", "wrong-tag"],
)
def test_live_candidate_target_mismatch_is_rejected(mutate):
    boundaries = V2Boundaries()
    requested = api()._stage_traffic(
        v2_service(), "candidate", 10, shadow_tag="shadow-rollout-123"
    )
    actual = deepcopy(requested)
    mutate(actual)
    converged = v2_service(
        generation="42",
        observed_generation="42",
        etag="etag-42",
        traffic=actual,
        traffic_statuses=actual,
    )
    boundaries.state = v2_service()
    boundaries.operation_polls = [v2_operation(done=True, response=converged)]

    with pytest.raises(api().ConcurrencyRefusal):
        controller(boundaries).transition_traffic(
            requested,
            expected_uid="service-uid",
            expected_generation="41",
            expected_etag="etag-41",
            timeout=120,
        )


def test_final_traffic_is_exact_single_untagged_candidate_target():
    final = api()._stage_traffic(v2_service(), "candidate", 100, shadow_tag=None)

    assert [item for item in final if item["revision"] == "candidate"] == [{
        "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
        "revision": "candidate",
        "percent": 100,
    }]
    prior = [item for item in final if item["revision"] != "candidate"]
    assert all(item["percent"] == 0 for item in prior)
    assert {
        (item["revision"], item.get("tag")) for item in prior
    } == {
        (item["revision"], item.get("tag")) for item in v2_service()["traffic"]
    }


@pytest.mark.parametrize(
    "unexpected",
    [
        v2_service(generation="42", observed_generation="42", etag="etag-41"),
        v2_service(generation="44", observed_generation="44", etag="etag-44"),
        v2_service(generation="42", observed_generation="42", etag="etag-42", uid="other-uid"),
        v2_service(generation="42", observed_generation="41", etag="etag-42", reconciling=False),
    ],
)
def test_v2_convergence_refuses_stale_or_unexpected_transition(unexpected):
    boundaries = V2Boundaries()
    boundaries.state = v2_service()
    boundaries.operation_polls = [v2_operation(done=True, response=unexpected)]
    boundaries.service_polls = [unexpected]
    rollout = controller(boundaries)

    with pytest.raises(api().ConcurrencyRefusal):
        rollout.transition_traffic(
            deepcopy(unexpected["traffic"]),
            expected_uid="service-uid",
            expected_generation="41",
            expected_etag="etag-41",
            timeout=120,
        )


def test_transition_convergence_rejects_explicit_null_reconciling():
    boundaries = V2Boundaries()
    requested = _candidate_traffic()
    malformed = v2_service(
        generation="42",
        observed_generation="42",
        etag="etag-42",
        reconciling=None,
        traffic=requested,
        traffic_statuses=requested,
    )
    boundaries.state = v2_service()
    boundaries.operation_polls = [v2_operation(done=True, response=malformed)]

    with pytest.raises(api().ConcurrencyRefusal):
        controller(boundaries).transition_traffic(
            requested,
            expected_uid="service-uid",
            expected_generation="41",
            expected_etag="etag-41",
            timeout=120,
        )


def _candidate_traffic():
    return [
        {"type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION", "revision": "candidate", "percent": 100},
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "prior",
            "percent": 0,
            "tag": "stable",
        },
        {
            "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
            "revision": "debug",
            "percent": 0,
            "tag": "unrelated",
        },
    ]


@pytest.mark.parametrize(
    "dimension",
    [
        "canonical-traffic",
        "canonical-tags",
        "traffic-statuses",
        "unchanged-etag",
        "uid-change",
        "observed-generation",
        "reconciling",
    ],
)
def test_independent_v2_convergence_dimensions_fail_closed(dimension):
    initial = v2_service()
    requested = _candidate_traffic()
    converged = v2_service(
        generation="42",
        observed_generation="42",
        etag="etag-42",
        traffic=requested,
        traffic_statuses=requested,
    )
    if dimension == "canonical-traffic":
        converged["traffic"][0]["percent"] = 99
    elif dimension == "canonical-tags":
        converged["traffic"][2]["tag"] = "changed-unrelated"
    elif dimension == "traffic-statuses":
        converged["trafficStatuses"][0]["revision"] = "prior"
    elif dimension == "unchanged-etag":
        converged["etag"] = initial["etag"]
    elif dimension == "uid-change":
        converged["uid"] = "replacement-service-uid"
    elif dimension == "observed-generation":
        converged["observedGeneration"] = "41"
    elif dimension == "reconciling":
        converged["reconciling"] = True

    boundaries = V2Boundaries()
    boundaries.state = initial
    boundaries.operation_polls = [v2_operation(done=True, response=converged)]
    boundaries.service_polls = [converged]

    with pytest.raises(api().ConcurrencyRefusal):
        controller(boundaries).transition_traffic(
            requested,
            expected_uid="service-uid",
            expected_generation="41",
            expected_etag="etag-41",
            timeout=120,
        )


@pytest.mark.parametrize(
    "operation",
    [
        {},
        {"name": "operation", "done": "false"},
        {"name": "operation", "done": True},
        {"name": "operation", "done": True, "error": {"code": 13, "message": "internal"}},
        v2_operation(done=True, response={"malformed": "service"}),
    ],
    ids=["empty", "malformed-done", "missing-result", "error-result", "malformed-response"],
)
def test_malformed_or_error_lro_is_rejected_without_service_acceptance(operation):
    boundaries = V2Boundaries()
    boundaries.state = v2_service()
    boundaries.operation_polls = [operation]

    with pytest.raises((api().OperationRefusal, api().ConcurrencyRefusal)):
        controller(boundaries).transition_traffic(
            _candidate_traffic(),
            expected_uid="service-uid",
            expected_generation="41",
            expected_etag="etag-41",
            timeout=120,
        )

    assert not any(event[0] == "service-poll" for event in boundaries.events)


@pytest.mark.parametrize(
    "dimension",
    [
        "traffic",
        "tags",
        "traffic-statuses",
        "prior-health",
        "uid",
        "etag-snapshot-progression",
        "etag-owner-progression",
        "generation-progression",
        "observed-generation",
        "reconciling",
        "malformed-lro",
        "error-lro",
        "lock",
    ],
)
def test_independent_rollback_proof_dimensions_retain_lock_on_failure(dimension):
    boundaries = PrematureLockReleaseBoundaries() if dimension == "lock" else V2Boundaries()
    snapshot = v2_service()
    restored = v2_service(generation="44", observed_generation="44", etag="etag-44")
    if dimension == "traffic":
        restored["traffic"][0]["percent"] = 99
    elif dimension == "tags":
        restored["traffic"][2]["tag"] = "lost-unrelated-tag"
    elif dimension == "traffic-statuses":
        restored["trafficStatuses"][0]["revision"] = "candidate"
    elif dimension == "uid":
        restored["uid"] = "replacement-service-uid"
    elif dimension == "etag-snapshot-progression":
        restored["etag"] = snapshot["etag"]
    elif dimension == "etag-owner-progression":
        restored["etag"] = "etag-43"
    elif dimension == "generation-progression":
        restored.update(generation="41", observedGeneration="41")
    elif dimension == "observed-generation":
        restored["observedGeneration"] = "43"
    elif dimension == "reconciling":
        restored["reconciling"] = True
    boundaries.state = v2_service(
        generation="43", observed_generation="43", etag="etag-43",
        traffic=_candidate_traffic(), traffic_statuses=_candidate_traffic(),
    )
    if dimension == "malformed-lro":
        boundaries.operation_polls = [{"name": "rollback-operation", "done": True}]
    elif dimension == "error-lro":
        boundaries.operation_polls = [
            {
                "name": "rollback-operation",
                "done": True,
                "error": {"code": 13, "message": "redacted"},
            }
        ]
    else:
        boundaries.operation_polls = [v2_operation(done=True, response=restored)]
    boundaries.service_polls = [restored]
    boundaries.health_identity = (
        {"revision": "candidate", "digest": "new"}
        if dimension == "prior-health"
        else {"revision": "prior", "digest": "old"}
    )
    rollout = controller(boundaries, clock=boundaries.clock, rollback_seconds=300)
    rollout.snapshot = snapshot
    rollout.prior_identity = {"revision": "prior", "digest": "old"}
    rollout.lock_generation = "17"
    rollout.mutation_armed = True
    rollout.rollout_owned_state = deepcopy(boundaries.state)

    with pytest.raises(api().RollbackProofError):
        rollout.terminal_rollback(reason="failure")

    assert not any(event[0] == "paid" for event in boundaries.events)
    assert not any(event[0] == "lock-release" for event in boundaries.events)


def test_rollback_polls_explicit_true_then_accepts_live_omitted_false():
    boundaries = V2Boundaries()
    snapshot = v2_service()
    owner = v2_service(
        generation="43", observed_generation="43", etag="etag-43",
        traffic=_candidate_traffic(), traffic_statuses=_candidate_traffic(),
    )
    reconciling = v2_service(
        generation="44", observed_generation="43", etag="etag-44", reconciling=True
    )
    restored = v2_service(generation="44", observed_generation="44", etag="etag-44")
    restored.pop("reconciling")
    boundaries.state = owner
    boundaries.operation_polls = [v2_operation(done=True, response=reconciling)]
    boundaries.service_polls = [reconciling, restored]
    boundaries.health_identity = {"revision": "prior", "digest": "old"}
    rollout = controller(boundaries, clock=boundaries.clock, rollback_seconds=300)
    rollout.snapshot = snapshot
    rollout.prior_identity = deepcopy(boundaries.health_identity)
    rollout.lock_generation = "17"
    rollout.mutation_armed = True
    rollout.rollout_owned_state = owner

    rollout.terminal_rollback(reason="failure")

    assert [event[0] for event in boundaries.events].count("service-poll") == 2
    assert any(event[0] == "lock-release" for event in boundaries.events)


def test_rollback_classification_rejects_explicit_null_reconciling():
    rollout = controller(V2Boundaries())
    rollout.snapshot = v2_service()
    owner = v2_service(generation="43", observed_generation="43", etag="etag-43")
    restored = v2_service(
        generation="44", observed_generation="44", etag="etag-44", reconciling=None
    )

    with pytest.raises(api().RollbackProofError):
        rollout._rollback_state_status(restored, owner, 43)


def test_live_omission_and_explicit_values_drive_deploy_and_current_ownership():
    rollout = controller(V2Boundaries())
    rollout.snapshot = v2_service()
    rollout.pre_deploy_state = deepcopy(rollout.snapshot)
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    rollout.validate_candidate_revision(candidate_revision_resource())

    converged = ambiguous_deploy_state(converged=True)
    converged.pop("reconciling")
    assert rollout._deploy_state_ownership_status(converged) == "owned"

    intermediate = ambiguous_deploy_state(converged=False)
    assert intermediate["reconciling"] is True
    assert rollout._deploy_state_ownership_status(intermediate) == "intermediate"

    malformed_deploy = ambiguous_deploy_state(converged=True)
    malformed_deploy["reconciling"] = None
    assert rollout._deploy_state_ownership_status(malformed_deploy) == "contradictory"

    rollout.rollout_owned_state = deepcopy(converged)
    assert rollout._current_state_is_owned(deepcopy(converged)) is True

    malformed_current = deepcopy(converged)
    malformed_current["reconciling"] = None
    assert rollout._current_state_is_owned(malformed_current) is False

    malformed_owned = deepcopy(converged)
    malformed_owned["reconciling"] = None
    rollout.rollout_owned_state = malformed_owned
    assert rollout._current_state_is_owned(deepcopy(converged)) is False


def test_live_retired_ready_revision_and_converged_service_are_exactly_owned():
    rollout = controller(V2Boundaries())
    rollout.snapshot = v2_service()
    rollout.pre_deploy_state = deepcopy(rollout.snapshot)
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"

    rollout.fetch_candidate_revision()

    assert rollout._deploy_state_ownership_status(retired_ready_deploy_state()) == "owned"


@pytest.mark.parametrize(
    "mutation",
    [
        lambda value: value.update(name="other"),
        lambda value: candidate_condition(value, "Ready").update(
            state="CONDITION_FAILED"
        ),
        lambda value: candidate_condition(value, "ContainerReady").update(
            state="CONDITION_FAILED"
        ),
        lambda value: candidate_condition(value, "Active").update(
            state="CONDITION_SUCCEEDED"
        ),
        lambda value: candidate_condition(value, "Active").update(status="True"),
        lambda value: value["containers"][0].update(image="registry/image@sha256:other"),
        lambda value: value["containers"][0]["env"][0].update(value="b" * 40),
    ],
)
def test_candidate_revision_resource_failures_are_rejected(mutation):
    rollout = controller(V2Boundaries())
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    revision = candidate_revision_resource()
    mutation(revision)

    with pytest.raises(api().ConcurrencyRefusal, match="revision resource"):
        rollout.validate_candidate_revision(revision)


def test_candidate_revision_accepts_only_omitted_resource_conditions():
    rollout = controller(V2Boundaries())
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    revision = candidate_revision_resource()
    revision["conditions"] = [
        condition
        for condition in revision["conditions"]
        if condition["type"]
        not in {"ResourcesAvailable", "MinInstancesProvisioned"}
    ]

    assert rollout.validate_candidate_revision(revision) == revision


def test_candidate_revision_rejects_missing_active_condition():
    rollout = controller(V2Boundaries())
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    revision = candidate_revision_resource()
    revision["conditions"] = [
        condition for condition in revision["conditions"] if condition["type"] != "Active"
    ]

    with pytest.raises(api().ConcurrencyRefusal, match="revision resource"):
        rollout.validate_candidate_revision(revision)


@pytest.mark.parametrize(
    ("kind", "field", "invalid"),
    [
        ("Ready", "revisionReason", "MIN_INSTANCES_NOT_PROVISIONED"),
        ("Active", "revisionReason", "MIN_INSTANCES_NOT_PROVISIONED"),
        ("ResourcesAvailable", "revisionReason", "MIN_INSTANCES_NOT_PROVISIONED"),
        ("MinInstancesProvisioned", "revisionReason", "RETIRED"),
        ("Active", "severity", "WARNING"),
        ("ResourcesAvailable", "severity", "INFO"),
        ("MinInstancesProvisioned", "severity", "WARNING"),
        ("Ready", "state", "CONDITION_FAILED"),
        ("Active", "state", "CONDITION_SUCCEEDED"),
        ("ResourcesAvailable", "state", "CONDITION_SUCCEEDED"),
        ("ContainerReady", "state", "CONDITION_FAILED"),
        ("MinInstancesProvisioned", "state", "CONDITION_SUCCEEDED"),
    ],
)
def test_candidate_revision_rejects_wrong_retired_condition_shape(kind, field, invalid):
    rollout = controller(V2Boundaries())
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    revision = candidate_revision_resource()
    candidate_condition(revision, kind)[field] = invalid

    with pytest.raises(api().ConcurrencyRefusal, match="revision resource"):
        rollout.validate_candidate_revision(revision)


@pytest.mark.parametrize(
    "unexpected_condition",
    [
        {"type": "HealthCheck", "state": "CONDITION_SUCCEEDED"},
        {"type": "HealthCheck"},
    ],
)
def test_candidate_revision_rejects_unexpected_condition(unexpected_condition):
    rollout = controller(V2Boundaries())
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    revision = candidate_revision_resource()
    revision["conditions"].append(unexpected_condition)

    with pytest.raises(api().ConcurrencyRefusal, match="revision resource"):
        rollout.validate_candidate_revision(revision)


def test_candidate_revision_rejects_unknown_condition_state():
    rollout = controller(V2Boundaries())
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    revision = candidate_revision_resource()
    candidate_condition(revision, "ContainerReady")["state"] = "CONDITION_UNKNOWN"

    with pytest.raises(api().ConcurrencyRefusal, match="revision resource"):
        rollout.validate_candidate_revision(revision)


@pytest.mark.parametrize(
    "mutation",
    [
        lambda value: value.update(latestCreatedRevision="other"),
        lambda value: value["template"].update(revision="other"),
        lambda value: value["template"]["containers"][0].update(image="other"),
        lambda value: value["template"]["containers"][0]["env"][0].update(value="b" * 40),
        lambda value: value["terminalCondition"].update(state="CONDITION_FAILED"),
        lambda value: value["conditions"][0].update(revisionReason="FAILED"),
        lambda value: value["traffic"][0].update(percent=99),
    ],
)
def test_retired_deploy_ownership_mismatch_fails_closed(mutation):
    rollout = controller(V2Boundaries())
    rollout.snapshot = v2_service()
    rollout.pre_deploy_state = deepcopy(rollout.snapshot)
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    rollout.validate_candidate_revision(candidate_revision_resource())
    service = retired_ready_deploy_state()
    mutation(service)

    assert rollout._deploy_state_ownership_status(service) == "contradictory"


@pytest.mark.parametrize(
    "mutation",
    [
        lambda value: value["conditions"].append(deepcopy(value["conditions"][0])),
        lambda value: value["conditions"].append(
            {"type": "Ready", "state": "CONDITION_FAILED", "reason": "Failed"}
        ),
        lambda value: value["conditions"].append(
            {"type": "Ready", "state": "CONDITION_SUCCEEDED"}
        ),
        lambda value: value["conditions"].append(
            {"type": "ContainerReady", "state": "CONDITION_FAILED", "reason": "Failed"}
        ),
        lambda value: value["conditions"].append(
            {"type": "ContainerReady", "state": "CONDITION_SUCCEEDED"}
        ),
        lambda value: value["conditions"].append(
            {"type": "RoutesReady", "state": "CONDITION_FAILED", "reason": "Failed"}
        ),
    ],
)
def test_retired_service_rejects_duplicate_or_contradictory_relevant_conditions(mutation):
    rollout = controller(V2Boundaries())
    rollout.snapshot = v2_service()
    rollout.pre_deploy_state = deepcopy(rollout.snapshot)
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    rollout.validate_candidate_revision(candidate_revision_resource())
    service = retired_ready_deploy_state()
    mutation(service)

    assert rollout._deploy_state_ownership_status(service) == "contradictory"


@pytest.mark.parametrize(
    "kind",
    [
        "Ready",
        "Active",
        "ResourcesAvailable",
        "ContainerReady",
        "MinInstancesProvisioned",
    ],
)
def test_candidate_revision_rejects_duplicate_relevant_conditions(kind):
    rollout = controller(V2Boundaries())
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    revision = candidate_revision_resource()
    revision["conditions"].append(deepcopy(candidate_condition(revision, kind)))

    with pytest.raises(api().ConcurrencyRefusal, match="revision resource"):
        rollout.validate_candidate_revision(revision)


def test_monotonic_remaining_budget_reaches_every_promotion_boundary():
    boundaries = Boundaries()
    boundaries.state = v2_service()
    boundaries.operation_polls = [v2_operation(done=True, response=v2_service())]
    boundaries.service_polls = [v2_service()]
    clock = boundaries.clock
    rollout = controller(boundaries, clock=clock, promotion_seconds=1800)
    rollout.start_promotion_deadline()

    rollout.build_candidate()
    clock.advance(10)
    rollout.deploy_candidate()
    clock.advance(20)
    rollout.wait_for_operation("operation-name")
    clock.advance(30)
    rollout.wait_for_service_convergence()
    clock.advance(40)
    rollout.observe_stage(10)
    clock.advance(50)
    rollout.verify_health("https://service.example", {"revision": "candidate"})
    clock.advance(60)
    rollout.run_paid_attempt(stage="final", surface="stream", url="https://service.example")

    observed = {
        event[0]: event[-1]
        for event in boundaries.events
        if event[0]
        in {"build", "deploy-shadow", "operation-poll", "service-poll", "observe", "health", "paid"}
    }
    assert observed == {
        "build": 1800,
        "deploy-shadow": 1790,
        "operation-poll": 1770,
        "service-poll": 1740,
        "observe": 1700,
        "health": 1650,
        "paid": 1590,
    }


def test_repeated_real_controller_polls_receive_strictly_decreasing_remaining_budget():
    boundaries = AdvancingV2Boundaries()
    requested = _candidate_traffic()
    reconciling = v2_service(
        generation="42",
        observed_generation="41",
        etag="etag-42",
        reconciling=True,
        traffic=requested,
        traffic_statuses=v2_service()["trafficStatuses"],
    )
    converged = v2_service(
        generation="42",
        observed_generation="42",
        etag="etag-42",
        traffic=requested,
        traffic_statuses=requested,
    )
    boundaries.state = v2_service()
    boundaries.operation_polls = [
        v2_operation(done=False),
        v2_operation(done=False),
        v2_operation(done=True, response=reconciling),
    ]
    boundaries.service_polls = [reconciling, converged]
    rollout = controller(boundaries, clock=boundaries.clock, promotion_seconds=1800)
    rollout.start_promotion_deadline()

    assert rollout.transition_traffic(
        requested,
        expected_uid="service-uid",
        expected_generation="41",
        expected_etag="etag-41",
        timeout=1800,
    ) == converged

    budgets = [
        event[-1]
        for event in boundaries.events
        if event[0] in {"operation-poll", "service-poll"}
    ]
    assert len(budgets) == 5
    assert all(later < earlier for earlier, later in zip(budgets, budgets[1:], strict=False))
    assert all(0 < budget <= 1800 for budget in budgets)


def test_top_level_deadline_exhaustion_prevents_all_further_promotion_work():
    class ExpiringBuildBoundaries(Boundaries):
        def build(self, *, timeout):
            result = super().build(timeout=timeout)
            self.clock.advance(timeout + 1)
            return result

    boundaries = ExpiringBuildBoundaries()
    boundaries.state = v2_service()

    with pytest.raises(api().PromotionDeadlineExceeded):
        api().run_rollout(
            boundaries=boundaries,
            rollout_id="rollout-123",
            approved_sha="a" * 40,
            clock=boundaries.clock,
            promotion_seconds=1800,
        )

    build_index = next(i for i, event in enumerate(boundaries.events) if event[0] == "build")
    assert not any(
        event[0] in {"deploy-shadow", "service-get", "service-patch", "health", "observe", "paid"}
        for event in boundaries.events[build_index + 1 :]
    )


def test_actual_controller_stops_between_repeated_polls_then_rollback_gets_fresh_grace():
    class ExpiringBetweenPollsBoundaries(V2Boundaries):
        def __init__(self):
            super().__init__()
            self.expire_promotion = True

        def poll_operation(self, name, *, timeout):
            result = super().poll_operation(name, timeout=timeout)
            if self.expire_promotion:
                self.expire_promotion = False
                self.clock.advance(timeout + 1)
            return result

    boundaries = ExpiringBetweenPollsBoundaries()
    snapshot = v2_service()
    requested = _candidate_traffic()
    boundaries.state = v2_service(
        generation="43", observed_generation="43", etag="etag-43",
        traffic=requested, traffic_statuses=requested,
    )
    boundaries.operation_polls = [v2_operation(done=False)]
    rollout = controller(
        boundaries,
        clock=boundaries.clock,
        promotion_seconds=30,
        rollback_seconds=300,
    )
    rollout.snapshot = snapshot
    rollout.prior_identity = {"revision": "prior", "digest": "old"}
    rollout.lock_generation = "17"
    rollout.mutation_armed = True
    rollout.rollout_owned_state = deepcopy(boundaries.state)
    rollout.start_promotion_deadline()

    with pytest.raises(api().PromotionDeadlineExceeded):
        rollout.transition_traffic(
            requested,
            expected_uid="service-uid",
            expected_generation="43",
            expected_etag="etag-43",
            timeout=30,
        )

    assert [event[0] for event in boundaries.events].count("operation-poll") == 1
    assert not any(event[0] == "service-poll" for event in boundaries.events)
    expired_at = len(boundaries.events)

    restored = v2_service(generation="44", observed_generation="44", etag="etag-44")
    boundaries.operation_polls = [v2_operation(done=True, response=restored)]
    boundaries.service_polls = [restored]
    boundaries.health_identity = deepcopy(rollout.prior_identity)
    rollout.terminal_rollback(reason="promotion-timeout")

    rollback_events = boundaries.events[expired_at:]
    rollback_polls = [event for event in rollback_events if event[0] == "operation-poll"]
    assert len(rollback_polls) == 1
    assert 0 < rollback_polls[0][-1] <= 300
    assert any(event[0] == "service-poll" for event in rollback_events)
    assert not any(event[0] in {"deploy-shadow", "observe", "paid"} for event in rollback_events)


def test_rollback_gets_independent_300_second_grace_after_promotion_expires():
    boundaries = Boundaries()
    boundaries.state = v2_service()
    boundaries.operation_polls = [v2_operation(done=True, response=v2_service())]
    boundaries.service_polls = [v2_service()]
    clock = boundaries.clock
    rollout = controller(boundaries, clock=clock, promotion_seconds=1800, rollback_seconds=300)
    rollout.start_promotion_deadline()
    clock.advance(1801)

    rollout.start_terminal_rollback()
    clock.advance(25)
    rollout.wait_for_rollback_operation("rollback-operation")
    clock.advance(25)
    rollout.wait_for_rollback_convergence()
    clock.advance(25)
    rollout.verify_rollback_health()

    timeouts = [
        event[-1]
        for event in boundaries.events
        if event[0] in {"operation-poll", "service-poll", "health"}
    ]
    assert timeouts == [275, 250, 225]


def test_actual_terminal_rollback_polls_use_independent_decreasing_grace():
    boundaries = AdvancingV2Boundaries()
    snapshot = v2_service()
    restored = v2_service(generation="44", observed_generation="44", etag="etag-44")
    boundaries.state = v2_service(
        generation="43", observed_generation="43", etag="etag-43",
        traffic=_candidate_traffic(), traffic_statuses=_candidate_traffic(),
    )
    boundaries.operation_polls = [v2_operation(done=False), v2_operation(done=True, response=restored)]
    boundaries.service_polls = [restored]
    boundaries.health_identity = {"revision": "prior", "digest": "old"}
    rollout = controller(
        boundaries,
        clock=boundaries.clock,
        promotion_seconds=1800,
        rollback_seconds=300,
    )
    rollout.snapshot = snapshot
    rollout.prior_identity = deepcopy(boundaries.health_identity)
    rollout.lock_generation = "17"
    rollout.mutation_armed = True
    rollout.rollout_owned_state = deepcopy(boundaries.state)
    rollout.start_promotion_deadline()
    boundaries.clock.advance(1801)

    rollout.terminal_rollback(reason="promotion-timeout")

    budgets = [
        event[-1]
        for event in boundaries.events
        if event[0] in {"operation-poll", "service-poll", "health"}
    ]
    assert budgets[0] <= 300
    assert all(later < earlier for earlier, later in zip(budgets, budgets[1:], strict=False))
    assert all(budget > 0 for budget in budgets)


@pytest.mark.parametrize("reason", ["TERM", "INT", "HUP", "ERR", "promotion-timeout", "EXIT"])
def test_signal_timeout_and_guarded_exit_restore_exact_snapshot(reason):
    boundaries = Boundaries()
    boundaries.state = prior_state()
    rollout = controller(boundaries)
    rollout.snapshot = prior_state()
    boundaries.state["traffic"] = api()._stage_traffic(
        rollout.snapshot, "candidate", 50, shadow_tag=None
    )
    rollout.rollout_owned_state = deepcopy(boundaries.state)
    rollout.mutation_armed = True

    rollout.handle_terminal(reason)

    assert boundaries.state["traffic"] == prior_state()["traffic"]
    assert rollout.paid_gate_state == "terminally_closed"


@pytest.mark.parametrize("capture_snapshot", [False, True], ids=["before-snapshot", "after-snapshot"])
def test_signal_after_lock_before_owned_mutation_releases_lock_without_traffic_rollback(
    capture_snapshot,
):
    boundaries = Boundaries()
    boundaries.state = prior_state()
    rollout = controller(boundaries)
    rollout.acquire_lock()
    if capture_snapshot:
        rollout.capture_snapshot()
    event_count = len(boundaries.events)

    rollout.handle_terminal("TERM")

    terminal_events = boundaries.events[event_count:]
    assert terminal_events == [("lock-release", "17")]
    assert rollout.lock_generation is None
    assert not any(event[0] in {"service-get", "service-patch", "paid"} for event in terminal_events)


def test_partial_identity_semantics_and_candidate_only_at_100_percent():
    module = api()
    prior = {"revision": "prior", "digest": "old"}
    candidate = {"revision": "candidate", "digest": "new"}

    assert module.verify_stage_identities([prior] * 5, prior, candidate, percent=10) == {"prior": 5}
    assert module.verify_stage_identities([candidate] * 5, prior, candidate, percent=50) == {"candidate": 5}
    assert module.verify_stage_identities([prior, candidate], prior, candidate, percent=10) == {
        "prior": 1,
        "candidate": 1,
    }
    assert module.verify_stage_identities([candidate] * 5, prior, candidate, percent=100) == {
        "candidate": 5
    }
    with pytest.raises(module.IdentityRefusal):
        module.verify_stage_identities([prior], prior, candidate, percent=100)


def test_telemetry_is_diagnostic_only_for_zero_traffic_and_query_failure():
    boundaries = Boundaries()
    rollout = controller(boundaries)

    assert rollout.record_telemetry(requests=0, errors=None, latency=None) == "no_evidence"
    assert rollout.record_telemetry(error=RuntimeError("query failed")) == "query_failed"
    assert rollout.promotion_gate_state == "unchanged"


def test_terminal_order_disarms_mutation_before_generation_release_and_never_mutates_after():
    boundaries = Boundaries()
    boundaries.state = prior_state()
    rollout = controller(boundaries)
    rollout.lock_generation = "17"

    rollout.finish_success()

    names = [event[0] for event in boundaries.events]
    assert names[-4:] == ["final-verify", "rollback-mutation-disarm", "lock-release", "guarded-exit"]
    release = names.index("lock-release")
    assert boundaries.events[release] == ("lock-release", "17")
    assert not any(name == "service-patch" for name in names[release + 1 :])


def test_controller_creates_only_durable_retention_obligation():
    boundaries = Boundaries()
    clock = FakeClock(now=datetime(2026, 7, 13, 12, tzinfo=UTC))
    rollout = controller(boundaries, clock=clock)

    rollout.record_retention(prior_revision="prior")

    create = next(event for event in boundaries.events if event[0] == "gcs-create")
    assert create[1] == "rollout-evidence/rollout-123/retention.json"
    assert create[2] == {
        "rollout_id": "rollout-123",
        "prior_revision": "prior",
        "retain_until": "2026-07-14T12:00:00Z",
    }
    assert create[3] == 0
    assert len(boundaries.events) == 1
    retain_until = datetime.fromisoformat(create[2]["retain_until"].replace("Z", "+00:00"))
    assert retain_until >= clock.now() + timedelta(hours=24)
    assert not any(event[0] == "revision-delete" for event in boundaries.events)


def test_valid_lro_with_omitted_done_is_pending_and_can_converge():
    class OmittedDoneBoundaries(V2Boundaries):
        def service_patch(self, body, *, etag, timeout=None):
            self.events.append(("service-patch", deepcopy(body), etag, timeout))
            return {"name": "projects/project/locations/us-central1/operations/traffic-42"}

    boundaries = OmittedDoneBoundaries()
    requested = _candidate_traffic()
    converged = v2_service(
        generation="42",
        observed_generation="42",
        etag="etag-42",
        traffic=requested,
        traffic_statuses=requested,
    )
    boundaries.state = v2_service()
    boundaries.operation_polls = [v2_operation(done=True, response=converged)]
    boundaries.service_polls = [converged]

    assert controller(boundaries).transition_traffic(
        requested,
        expected_uid="service-uid",
        expected_generation="41",
        expected_etag="etag-41",
        timeout=120,
    ) == converged


def test_terminal_rollback_refuses_concurrent_transition_before_patch():
    boundaries = V2Boundaries()
    owned = v2_service(generation="43", observed_generation="43", etag="etag-43")
    concurrent = v2_service(generation="44", observed_generation="44", etag="etag-44")
    boundaries.state = concurrent
    rollout = controller(boundaries)
    rollout.snapshot = v2_service()
    rollout.rollout_owned_state = owned
    rollout.mutation_armed = True

    with pytest.raises(api().RollbackProofError, match="ownership"):
        rollout.terminal_rollback(reason="failure")

    assert not any(event[0] == "service-patch" for event in boundaries.events)


def test_ambiguous_deploy_recovery_polls_then_noops_when_snapshot_already_restored():
    class RecoveringDeployBoundaries(V2Boundaries):
        def __init__(self):
            super().__init__()
            self.deploy_reads = [
                ambiguous_deploy_state(converged=False),
                ambiguous_deploy_state(converged=True),
            ]

        def service_get(self):
            self.events.append(("service-get",))
            return deepcopy(self.deploy_reads.pop(0))

    boundaries = RecoveringDeployBoundaries()
    rollout = controller(boundaries, clock=boundaries.clock, rollback_seconds=300)
    rollout.snapshot = v2_service()
    rollout.pre_deploy_state = deepcopy(rollout.snapshot)
    rollout.prior_identity = deepcopy(boundaries.health_identity)
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    rollout.lock_generation = "17"
    rollout.mutation_armed = True

    rollout.terminal_rollback(reason="ambiguous-deploy")

    assert [event[0] for event in boundaries.events].count("service-get") == 2
    assert not any(event[0] == "service-patch" for event in boundaries.events)
    assert any(event[0] == "health" for event in boundaries.events)
    assert any(event[0] == "lock-release" for event in boundaries.events)


def test_ambiguous_deploy_recovery_refuses_contradictory_state_without_mutation():
    boundaries = V2Boundaries()
    contradictory = ambiguous_deploy_state(converged=False)
    contradictory["template"]["containers"][0]["image"] = "registry/image@sha256:external"
    boundaries.state = contradictory
    rollout = controller(boundaries, clock=boundaries.clock, rollback_seconds=300)
    rollout.snapshot = v2_service()
    rollout.pre_deploy_state = deepcopy(rollout.snapshot)
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    rollout.lock_generation = "17"
    rollout.mutation_armed = True

    with pytest.raises(api().RollbackProofError, match="ownership refused"):
        rollout.terminal_rollback(reason="ambiguous-deploy")

    assert not any(event[0] in {"service-patch", "lock-release", "paid"} for event in boundaries.events)


def test_ambiguous_deploy_recovery_expiry_requires_recovery_without_overwrite():
    class ExpiringDeployBoundaries(V2Boundaries):
        def service_get(self):
            self.events.append(("service-get",))
            self.clock.advance(301)
            return ambiguous_deploy_state(converged=False)

    boundaries = ExpiringDeployBoundaries()
    rollout = controller(boundaries, clock=boundaries.clock, rollback_seconds=300)
    rollout.snapshot = v2_service()
    rollout.pre_deploy_state = deepcopy(rollout.snapshot)
    rollout.image_digest = "registry/image@sha256:candidate"
    rollout.expected_candidate_revision = "llm-council-candidate"
    rollout.lock_generation = "17"
    rollout.mutation_armed = True

    with pytest.raises(api().RollbackRecoveryRequired) as caught:
        rollout.terminal_rollback(reason="ambiguous-deploy")

    assert caught.value.status == "recovery_required"
    assert not any(event[0] in {"service-patch", "lock-release", "paid"} for event in boundaries.events)


@pytest.mark.parametrize(
    ("surface", "failure", "classification"),
    [
        ("sync", urllib.error.HTTPError("url", 429, "", {}, None), "http_429"),
        ("stream", urllib.error.HTTPError("url", 503, "", {}, None), "http_503"),
        ("sync", urllib.error.URLError(TimeoutError()), "timeout"),
        ("stream", urllib.error.URLError(ConnectionResetError()), "connection_reset"),
    ],
)
def test_real_smoke_adapters_preserve_retryable_transport_classification(
    monkeypatch, surface, failure, classification
):
    smoke = importlib.import_module("scripts.verify_council_smoke")

    def fail(*args, **kwargs):
        del args, kwargs
        raise failure

    monkeypatch.setattr(smoke.urllib.request, "urlopen", fail)
    poster = smoke.post_council_stream if surface == "stream" else smoke.post_council
    with pytest.raises(smoke.SmokeInfrastructureError) as caught:
        poster("https://service.example", "secret", 10)
    assert caught.value.classification == classification


def test_gcloud_paid_adapter_maps_typed_smoke_infrastructure_failure(monkeypatch):
    smoke = importlib.import_module("scripts.verify_council_smoke")
    boundaries = api().GcloudBoundaries(
        project=api().FIXED_PROJECT, region=api().FIXED_REGION,
        service=api().FIXED_SERVICE, approved_sha="a" * 40
    )
    monkeypatch.setattr(smoke, "load_secret", lambda *args, **kwargs: "secret")

    def fail(*args, **kwargs):
        del args, kwargs
        raise smoke.SmokeInfrastructureError("http_503")

    monkeypatch.setattr(smoke, "post_council", fail)
    with pytest.raises(api().InfrastructureFailure) as caught:
        boundaries.paid_request("shadow", "sync", "https://shadow.example", 10)
    assert caught.value.classification == "http_503"


@pytest.mark.parametrize(
    "classification",
    [
        "objective", "instruction", "factual", "evaluator_format", "schema", "content",
        "fallback", "route", "policy", "usage", "pricing", "identity", "absolute_slo",
    ],
)
def test_gcloud_paid_adapter_preserves_each_typed_semantic_category(monkeypatch, classification):
    smoke = importlib.import_module("scripts.verify_council_smoke")
    boundaries = api().GcloudBoundaries(
        project=api().FIXED_PROJECT, region=api().FIXED_REGION,
        service=api().FIXED_SERVICE, approved_sha="a" * 40
    )
    monkeypatch.setattr(smoke, "load_secret", lambda *args, **kwargs: "secret")
    monkeypatch.setattr(
        smoke,
        "post_council",
        lambda *args, **kwargs: (_ for _ in ()).throw(smoke.SmokeSemanticError(classification)),
    )

    with pytest.raises(api().SemanticFailure) as caught:
        boundaries.paid_request("shadow", "sync", "https://shadow.example", 10)

    assert caught.value.classification == classification


def test_unknown_smoke_semantic_failure_is_bounded_and_raw_message_is_not_recorded(monkeypatch):
    smoke = importlib.import_module("scripts.verify_council_smoke")
    boundaries = api().GcloudBoundaries(
        project=api().FIXED_PROJECT, region=api().FIXED_REGION,
        service=api().FIXED_SERVICE, approved_sha="a" * 40
    )
    monkeypatch.setattr(smoke, "load_secret", lambda *args, **kwargs: "secret")
    monkeypatch.setattr(
        smoke,
        "post_council",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            smoke.SmokeVerificationError("raw unique semantic details")
        ),
    )
    with pytest.raises(api().SemanticFailure) as caught:
        boundaries.paid_request("shadow", "sync", "https://shadow.example", 10)
    assert caught.value.classification == "semantic_unknown"

    ledger = Boundaries()
    ledger.network_outcomes = [caught.value]
    rollout = controller(ledger)
    with pytest.raises(api().SemanticFailure):
        rollout.run_paid_attempt(stage="shadow", surface="sync", url="https://shadow.example")
    completed = ledger.objects["rollout-evidence/rollout-123/attempts/0001-completed.json"]
    assert completed["classification"] == "semantic_unknown"
    assert "raw unique semantic details" not in repr(completed)


def test_gcloud_candidate_health_invokes_strict_verifier_with_approved_values(monkeypatch):
    health = importlib.import_module("scripts.verify_deploy_health")
    boundaries = api().GcloudBoundaries(
        project=api().FIXED_PROJECT, region=api().FIXED_REGION,
        service=api().FIXED_SERVICE, approved_sha="a" * 40
    )
    payload = {"status": "healthy", "config": {}, "artifacts": {"identity": "candidate"}}
    observed = []
    monkeypatch.setattr(
        health,
        "fetch_health_json",
        lambda url, timeout_seconds: observed.append(("fetch", url, timeout_seconds)) or payload,
    )
    monkeypatch.setattr(
        health,
        "verify_health_payload",
        lambda value, **kwargs: observed.append(("verify", value, kwargs)),
    )
    monkeypatch.setattr(health, "health_identity", lambda value: {"identity": value["artifacts"]["identity"]})

    result = boundaries.candidate_health(
        "https://candidate.example",
        expected_revision="a" * 40,
        expected_image_digest="registry/image@sha256:" + "b" * 64,
        timeout=7,
    )

    assert result == {"identity": "candidate"}
    assert observed[1] == (
        "verify",
        payload,
        {
            "expected_revision": "a" * 40,
            "expected_image_digest": "registry/image@sha256:" + "b" * 64,
        },
    )


def test_gcloud_build_and_rest_calls_reduce_one_shared_adapter_budget(monkeypatch):
    module = api()
    boundaries = module.GcloudBoundaries(
        project=module.FIXED_PROJECT, region=module.FIXED_REGION,
        service=module.FIXED_SERVICE, approved_sha="a" * 40
    )
    now = [100.0]
    monkeypatch.setattr(module.time, "monotonic", lambda: now[0])
    run_timeouts = []

    def fake_run(args, *, input_text=None, timeout=None):
        del input_text
        run_timeouts.append(timeout)
        now[0] += 2
        if "describe" in args:
            return "sha256:" + "b" * 64
        if "print-access-token" in args:
            return "token"
        return ""

    monkeypatch.setattr(boundaries, "_run", fake_run)
    boundaries.build(timeout=10)
    assert run_timeouts[:2] == [10, 8]

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            del args

        def read(self):
            return b"{}"

    url_timeouts = []
    monkeypatch.setattr(
        module.urllib.request,
        "urlopen",
        lambda request, timeout: url_timeouts.append(timeout) or Response(),
    )
    boundaries.service_get(timeout=10)
    assert run_timeouts[-1] == 10
    assert url_timeouts == [8]


def _gcloud_boundaries():
    return api().GcloudBoundaries(
        project=api().FIXED_PROJECT, region=api().FIXED_REGION,
        service=api().FIXED_SERVICE, approved_sha="a" * 40
    )


def _artifact_health(name="candidate"):
    return {
        "status": "healthy",
        "config": {"identity": name},
        "artifacts": {
            "registry_digest": "registry",
            "projection_digests": {"backend": "digest"},
            "application_revision": name,
            "image_digest": f"image-{name}",
        },
    }


def test_gcloud_health_defaults_strict_and_rejects_absent_artifacts(monkeypatch):
    health = importlib.import_module("scripts.verify_deploy_health")
    monkeypatch.setattr(
        health,
        "fetch_health_json",
        lambda *args, **kwargs: {"status": "healthy", "config": {"identity": "prior"}},
    )

    with pytest.raises(health.HealthVerificationError):
        _gcloud_boundaries().health("https://service.example", None, timeout=7)


def test_gcloud_health_allows_valid_legacy_status_and_config_only_when_explicit(monkeypatch):
    health = importlib.import_module("scripts.verify_deploy_health")
    payload = {"status": "healthy", "config": {"identity": "prior"}}
    monkeypatch.setattr(health, "fetch_health_json", lambda *args, **kwargs: payload)

    assert _gcloud_boundaries().health(
        "https://service.example", None, timeout=7, allow_legacy_prior=True
    ) == payload


@pytest.mark.parametrize(
    "payload",
    [
        {"status": "unhealthy", "config": {"identity": "prior"}},
        {"status": "healthy", "config": None},
        {"status": "healthy", "config": {"identity": "prior"}, "artifacts": {}},
        {
            "status": "healthy",
            "config": {"identity": "prior"},
            "artifacts": {"registry_digest": "registry"},
        },
    ],
)
def test_gcloud_legacy_health_rejects_unhealthy_malformed_empty_and_partial(
    monkeypatch, payload
):
    health = importlib.import_module("scripts.verify_deploy_health")
    monkeypatch.setattr(health, "fetch_health_json", lambda *args, **kwargs: payload)

    with pytest.raises(health.HealthVerificationError):
        _gcloud_boundaries().health(
            "https://service.example", None, timeout=7, allow_legacy_prior=True
        )


def test_stage_sampling_accepts_mixed_legacy_prior_and_strict_candidate(monkeypatch):
    health = importlib.import_module("scripts.verify_deploy_health")
    prior_payload = {"status": "healthy", "config": {"identity": "prior"}}
    candidate_payload = _artifact_health()
    payloads = iter([prior_payload, candidate_payload, prior_payload, candidate_payload, prior_payload])
    monkeypatch.setattr(health, "fetch_health_json", lambda *args, **kwargs: next(payloads))

    counts = _gcloud_boundaries().sample_stage_identities(
        "https://service.example",
        prior_payload,
        health.health_identity(candidate_payload),
        percent=50,
        timeout=7,
    )

    assert counts == {"prior": 3, "candidate": 2}


def test_stage_sampling_rejects_unknown_legacy_identity(monkeypatch):
    health = importlib.import_module("scripts.verify_deploy_health")
    prior = {"status": "healthy", "config": {"identity": "prior"}}
    unknown = {"status": "healthy", "config": {"identity": "unknown"}}
    monkeypatch.setattr(health, "fetch_health_json", lambda *args, **kwargs: unknown)

    with pytest.raises(api().IdentityRefusal, match="unknown service identity"):
        _gcloud_boundaries().sample_stage_identities(
            "https://service.example",
            prior,
            health.health_identity(_artifact_health()),
            percent=10,
            timeout=7,
        )


def test_stage_sampling_rejects_legacy_prior_at_100_percent(monkeypatch):
    health = importlib.import_module("scripts.verify_deploy_health")
    prior = {"status": "healthy", "config": {"identity": "prior"}}
    monkeypatch.setattr(health, "fetch_health_json", lambda *args, **kwargs: prior)

    with pytest.raises(api().IdentityRefusal, match="must all be candidate"):
        _gcloud_boundaries().sample_stage_identities(
            "https://service.example",
            prior,
            health.health_identity(_artifact_health()),
            percent=100,
            timeout=7,
        )


def test_candidate_health_remains_strict_when_artifacts_are_absent(monkeypatch):
    health = importlib.import_module("scripts.verify_deploy_health")
    monkeypatch.setattr(
        health,
        "fetch_health_json",
        lambda *args, **kwargs: {"status": "healthy", "config": {"identity": "prior"}},
    )

    with pytest.raises(health.HealthVerificationError):
        _gcloud_boundaries().candidate_health(
            "https://candidate.example",
            expected_revision="a" * 40,
            expected_image_digest="registry/image@sha256:" + "b" * 64,
            timeout=7,
        )


def test_planned_and_terminal_rollback_proofs_explicitly_allow_legacy_prior():
    planned_boundaries = V2Boundaries()
    planned_boundaries.state = v2_service(generation="43", observed_generation="43", etag="etag-43")
    planned = controller(planned_boundaries)
    planned.prior_identity = deepcopy(planned_boundaries.health_identity)
    planned.transition_traffic = lambda *args, **kwargs: deepcopy(planned_boundaries.state)
    planned.planned_restore(v2_service())
    planned_health = next(event for event in planned_boundaries.events if event[0] == "health")
    assert planned_health[3] is True

    rollback_boundaries = V2Boundaries()
    snapshot = v2_service()
    restored = v2_service(generation="44", observed_generation="44", etag="etag-44")
    rollback_boundaries.state = v2_service(
        generation="43", observed_generation="43", etag="etag-43"
    )
    rollback_boundaries.operation_polls = [v2_operation(done=True, response=restored)]
    rollback_boundaries.service_polls = [restored]
    rollback = controller(rollback_boundaries, clock=rollback_boundaries.clock)
    rollback.snapshot = snapshot
    rollback.prior_identity = deepcopy(rollback_boundaries.health_identity)
    rollback.lock_generation = "17"
    rollback.mutation_armed = True
    rollback.rollout_owned_state = deepcopy(rollback_boundaries.state)
    rollback.terminal_rollback(reason="proof")
    rollback_health = next(
        event for event in rollback_boundaries.events if event[0] == "health"
    )
    assert rollback_health[3] is True


def test_equal_prior_and_candidate_rejected_before_stage_fetch(monkeypatch):
    health = importlib.import_module("scripts.verify_deploy_health")
    identity = {"status": "healthy", "config": {"identity": "same"}}
    fetched = []
    monkeypatch.setattr(
        health, "fetch_health_json", lambda *args, **kwargs: fetched.append(True) or identity
    )

    with pytest.raises(api().IdentityRefusal, match="must differ"):
        _gcloud_boundaries().sample_stage_identities(
            "https://service.example", identity, identity, percent=10, timeout=7
        )
    assert fetched == []


def test_prior_identity_extraction_failure_prevents_paid_and_mutating_operations():
    class ExtractionFailureBoundaries(V2Boundaries):
        def health(self, url, expected, *, timeout, allow_legacy_prior=False):
            self.events.append(("health", url, expected, allow_legacy_prior, timeout))
            raise ValueError("identity extraction failed")

    boundaries = ExtractionFailureBoundaries()
    boundaries.state = v2_service()

    with pytest.raises(ValueError, match="identity extraction failed"):
        api().run_rollout(
            boundaries=boundaries,
            rollout_id="rollout-123",
            approved_sha="a" * 40,
            clock=boundaries.clock,
        )

    names = [event[0] for event in boundaries.events]
    assert "build" in names
    assert not any(name in {"paid", "deploy-shadow", "service-patch"} for name in names)
