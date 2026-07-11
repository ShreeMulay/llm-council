"""Contract tests for validated lifecycle transitions and immutable evidence."""

import json
from concurrent.futures import ThreadPoolExecutor
from dataclasses import FrozenInstanceError
from datetime import datetime, timezone

import pytest

from backend.model_lifecycle import (
    EvidenceRecord,
    LifecycleStore,
    LifecycleTransitionError,
    TransitionRequest,
)


def evidence(identifier="sha256:benchmark-result"):
    return EvidenceRecord(
        evidence_id=identifier,
        schema_version="1.0.0",
        recorded_at=datetime(2026, 7, 11, tzinfo=timezone.utc),
        actor="benchmark-bot",
        kind="benchmark",
        references=("suite:model-council-v1.0.0",),
    )


def transition(source, target, refs=("sha256:benchmark-result",)):
    return TransitionRequest(
        logical_id="openai/gpt-5.6-sol",
        candidate_version="2026-07-11",
        from_state=source,
        to_state=target,
        actor="registry-maintainer",
        occurred_at=datetime(2026, 7, 11, 12, tzinfo=timezone.utc),
        registry_version="2026.07.11",
        evidence_references=refs,
        decision="approved",
        reason="Versioned public benchmark met the gate",
    )


def test_adjacent_transition_appends_complete_event_without_assigning_roles():
    store = LifecycleStore(initial_states={("openai/gpt-5.6-sol", "2026-07-11"): "probed"})
    store.append_evidence(evidence())

    event = store.transition(transition("probed", "benchmark"))

    assert store.state("openai/gpt-5.6-sol", "2026-07-11") == "benchmark"
    assert event.actor == "registry-maintainer"
    assert event.registry_version == "2026.07.11"
    assert event.evidence_references == ("sha256:benchmark-result",)
    assert store.roles("openai/gpt-5.6-sol", "2026-07-11") == ()
    assert store.events == (event,)


@pytest.mark.parametrize(
    ("source", "target"),
    [("discovered", "benchmark"), ("discovered", "production"), ("shadow", "benchmark")],
)
def test_skipped_and_reversed_transitions_fail_closed(source, target):
    key = ("openai/gpt-5.6-sol", "2026-07-11")
    store = LifecycleStore(initial_states={key: source})
    store.append_evidence(evidence())
    before = store.snapshot()

    with pytest.raises(LifecycleTransitionError):
        store.transition(transition(source, target))

    assert store.snapshot() == before


def test_transition_requires_existing_content_addressed_evidence():
    store = LifecycleStore(initial_states={("openai/gpt-5.6-sol", "2026-07-11"): "probed"})

    with pytest.raises(LifecycleTransitionError, match="evidence"):
        store.transition(transition("probed", "benchmark"))
    assert store.events == ()


def test_evidence_and_transition_history_are_append_only_and_frozen():
    store = LifecycleStore(initial_states={("openai/gpt-5.6-sol", "2026-07-11"): "probed"})
    record = evidence()
    store.append_evidence(record)
    event = store.transition(transition("probed", "benchmark"))

    with pytest.raises((FrozenInstanceError, AttributeError, TypeError)):
        record.actor = "rewriter"  # type: ignore[misc]
    with pytest.raises((FrozenInstanceError, AttributeError, TypeError)):
        event.reason = "rewritten"  # type: ignore[misc]
    with pytest.raises(ValueError, match="append-only|duplicate"):
        store.append_evidence(record)
    assert store.evidence == (record,)
    assert store.events == (event,)


def test_retirement_allowed_with_evidence_but_reentry_requires_new_version():
    old_key = ("openai/gpt-5.6-sol", "2026-07-11")
    store = LifecycleStore(initial_states={old_key: "shadow"})
    store.append_evidence(evidence("sha256:retirement-decision"))
    store.transition(transition("shadow", "retired", ("sha256:retirement-decision",)))

    with pytest.raises(LifecycleTransitionError):
        store.transition(transition("retired", "discovered"))

    store.register_candidate("openai/gpt-5.6-sol", "2026-08-01")
    assert store.state("openai/gpt-5.6-sol", "2026-08-01") == "discovered"
    assert store.state(*old_key) == "retired"


def test_jsonl_store_replays_and_idempotently_rejects_same_event(tmp_path):
    path = tmp_path / "lifecycle.jsonl"
    store = LifecycleStore(initial_states={("openai/gpt-5.6-sol", "2026-07-11"): "probed"}, path=path)
    store.append_evidence(evidence())
    event = store.transition(transition("probed", "benchmark"))
    replayed = LifecycleStore(path=path)
    assert replayed.evidence == (evidence(),)
    assert replayed.events == (event,)
    assert replayed.state("openai/gpt-5.6-sol", "2026-07-11") == "benchmark"
    assert event.event_id.startswith("sha256:")


def test_concurrent_store_instances_serialize_full_transition_transaction(tmp_path):
    path = tmp_path / "lifecycle.jsonl"
    first = LifecycleStore(
        initial_states={("openai/gpt-5.6-sol", "2026-07-11"): "probed"}, path=path
    )
    first.append_evidence(evidence())
    second = LifecycleStore(path=path)

    def attempt(store):
        try:
            return store.transition(transition("probed", "benchmark"))
        except LifecycleTransitionError:
            return None

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(attempt, (first, second)))

    assert sum(result is not None for result in results) == 1
    replayed = LifecycleStore(path=path)
    assert len(replayed.events) == 1
    assert replayed.state("openai/gpt-5.6-sol", "2026-07-11") == "benchmark"


@pytest.mark.parametrize("corruption", ["sequence", "evidence", "digest", "duplicate"])
def test_replay_fails_closed_on_corrupt_transition_ledger(tmp_path, corruption):
    path = tmp_path / "lifecycle.jsonl"
    store = LifecycleStore(
        initial_states={("openai/gpt-5.6-sol", "2026-07-11"): "probed"}, path=path
    )
    store.append_evidence(evidence())
    store.transition(transition("probed", "benchmark"))
    records = [json.loads(line) for line in path.read_text().splitlines()]
    event = records[-1]
    if corruption == "sequence":
        event["from_state"] = "discovered"
    elif corruption == "evidence":
        event["evidence_references"] = ["sha256:missing"]
    elif corruption == "digest":
        event["event_id"] = "sha256:tampered"
    else:
        records.append(dict(event))
    path.write_text("".join(json.dumps(record) + "\n" for record in records))

    with pytest.raises(ValueError, match="corrupt|duplicate|transition|evidence|digest"):
        LifecycleStore(path=path)


@pytest.mark.parametrize(
    "record",
    [
        EvidenceRecord("not-content-addressed", "1.0.0", datetime(2026, 7, 11, tzinfo=timezone.utc), "a", "benchmark", ("ref",)),
        EvidenceRecord("sha256:x", "bad", datetime(2026, 7, 11, tzinfo=timezone.utc), "a", "benchmark", ("ref",)),
        EvidenceRecord("sha256:x", "1.0.0", datetime(2026, 7, 11), "a", "benchmark", ("ref",)),
    ],
)
def test_evidence_validation_fails_closed(record):
    with pytest.raises(ValueError):
        LifecycleStore().append_evidence(record)
