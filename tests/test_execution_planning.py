"""Contract tests for provider-neutral deterministic execution planning."""

from dataclasses import FrozenInstanceError, replace

import pytest

from backend.execution_planning import (
    DiversityConstraints,
    PlanningConstraintError,
    build_execution_plan,
    curate_roster,
    resolve_logical_route,
)
from backend.model_registry import load_registry


def test_diversity_curation_is_deterministic_across_input_order():
    registry = load_registry()
    candidates = [registry.model(model.logical_id) for model in registry.models]
    constraints = DiversityConstraints(
        roster_size=5,
        max_per_family=1,
        max_per_provider=2,
        min_distinct_families=5,
        min_distinct_providers=3,
        required_seats=(1, 2, 3, 4, 5),
    )

    forward = curate_roster(candidates, constraints, registry.version)
    reverse = curate_roster(list(reversed(candidates)), constraints, registry.version)

    assert forward == reverse
    assert len({member.family for member in forward}) >= 5
    assert len({member.preferred_route.provider for member in forward}) >= 3
    assert {member.seat for member in forward} == {1, 2, 3, 4, 5}


def test_unsatisfied_seat_or_diversity_constraint_is_machine_readable():
    registry = load_registry()
    candidates = [registry.model(registry.production_roster[0])]
    constraints = DiversityConstraints(
        roster_size=2,
        max_per_family=1,
        max_per_provider=1,
        min_distinct_families=2,
        min_distinct_providers=2,
        required_seats=(1, 2),
    )

    with pytest.raises(PlanningConstraintError) as caught:
        curate_roster(candidates, constraints, registry.version)

    assert caught.value.violations
    assert all(item.code and item.message for item in caught.value.violations)


def test_execution_plan_is_deeply_immutable_and_digest_stable():
    registry = load_registry()
    requested_models = list(registry.compact_roster)
    request = {"query": "public non-PHI question", "models": requested_models, "compact": True}
    plan = build_execution_plan(registry, request)
    digest = plan.digest

    requested_models.append("openai/gpt-5.6-sol")
    request["query"] = "mutated after planning"
    assert plan.digest == digest
    assert tuple(operation.logical_id for operation in plan.stage1) == registry.compact_roster
    with pytest.raises((FrozenInstanceError, AttributeError, TypeError)):
        plan.stage1[0].logical_id = "changed"  # type: ignore[misc]
    with pytest.raises(TypeError):
        plan.limits["max_tokens"] = 1  # type: ignore[index]
    with pytest.raises((FrozenInstanceError, AttributeError)):
        plan.stage0.limits.max_results = 1  # type: ignore[misc]
    with pytest.raises((FrozenInstanceError, AttributeError)):
        plan.stage1[0].settings.temperature = 0  # type: ignore[misc]
    with pytest.raises((FrozenInstanceError, AttributeError)):
        plan.stage1[0].routes[0].provider_model_id = "changed"  # type: ignore[misc]


def test_one_logical_route_resolution_contract_is_used_for_every_mode():
    registry = load_registry()
    logical_id = "anthropic/claude-fable-5"

    resolutions = {
        mode: resolve_logical_route(registry, logical_id, route_policy="primary", mode=mode)
        for mode in ("sync", "stream", "benchmark")
    }

    assert len(set(resolutions.values())) == 1
    resolution = resolutions["sync"]
    assert resolution.logical_id == logical_id
    assert resolution.route_id != logical_id
    assert resolution.provider_model_id
    assert resolution.adapter


def test_plans_for_all_modes_share_route_and_normalized_dispatch_contract():
    registry = load_registry()
    request = {
        "query": "same input",
        "models": ["anthropic/claude-fable-5"],
        "route_policy": "primary",
    }

    plans = {
        mode: build_execution_plan(registry, {**request, "mode": mode})
        for mode in ("sync", "stream", "benchmark")
    }
    operations = [plans[mode].stage1[0] for mode in plans]

    assert len({operation.route for operation in operations}) == 1
    assert len({operation.normalized_request for operation in operations}) == 1
    assert len({operation.dispatcher_contract for operation in operations}) == 1


def test_plan_pins_registry_projection_digest():
    registry = load_registry()
    plan = build_execution_plan(
        registry,
        {"query": "digest contract", "models": list(registry.compact_roster)},
    )

    assert plan.registry_version == registry.version
    assert plan.registry_digest == registry.digest
    assert plan.projection_digest != registry.digest
    assert len(plan.projection_digest) == 64


def test_plan_contains_complete_frozen_three_stage_contract():
    registry = load_registry()
    request = {"query": "question", "system": "safe system", "compact": True, "temperature": 0.2}
    plan = build_execution_plan(registry, request)
    assert plan.stage0["decision"] == "compact"
    assert plan.stage1
    assert tuple(op.logical_id for op in plan.evaluators) == (
        "anthropic/claude-fable-5", "openai/gpt-5.5"
    )
    assert plan.chairman.logical_id == registry.chairman_logical_id
    assert plan.roles[registry.chairman_logical_id] == ("member", "evaluator", "chairman")
    assert plan.routes[registry.chairman_logical_id][0].provider == "vertex"
    assert plan.routes[registry.chairman_logical_id][1].provider == "openrouter"
    assert plan.messages == (("system", "safe system"), ("user", "question"))
    assert plan.settings["temperature"] == 0.2
    assert plan.curation_constraints["top_consensus"] == 3
    with pytest.raises(TypeError):
        plan.stage0["decision"] = "full"


def test_backtracking_solver_avoids_duplicate_model_across_multi_seat_records():
    registry = load_registry()
    candidates = (
        replace(registry.models[0], seats=(1, 2)),
        replace(registry.models[1], seats=(1,)),
    )
    constraints = DiversityConstraints(2, 1, 2, 2, 2, (1, 2))
    selected = curate_roster(candidates, constraints, registry.version)
    assert len({member.logical_id for member in selected}) == 2
