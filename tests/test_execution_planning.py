"""Contract tests for provider-neutral deterministic execution planning."""

from dataclasses import FrozenInstanceError, fields, replace

import pytest

from backend.execution_planning import (
    DiversityConstraints,
    PlanningConstraintError,
    build_execution_plan,
    curate_roster,
    execution_plan_digest,
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
    assert tuple(op.logical_id for op in plan.evaluators) == tuple(
        model_id
        for model_id in registry.evaluator_priority
        if model_id in registry.compact_roster
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


def test_execution_plan_digest_is_deterministic_for_identical_construction():
    registry = load_registry()
    request = {
        "query": "https://example.com/a/../evidence?q=1",
        "compact": True,
        "parallel_mode": "explicit",
        "timeout": 17,
        "max_retries": 4,
        "backoff_base": 0.25,
    }

    assert build_execution_plan(registry, request).digest == build_execution_plan(registry, dict(request)).digest


def test_strict_vertex_policy_is_captured_for_every_fable_operation(monkeypatch):
    monkeypatch.setattr("backend.config.REQUIRE_VERTEX_ANTHROPIC", True)
    plan = build_execution_plan(load_registry(), {"query": "protected", "compact": True})

    fable_operations = [
        operation
        for operation in (*plan.stage1, *plan.evaluators, plan.chairman)
        if operation.logical_id == "anthropic/claude-fable-5"
    ]
    assert plan.require_vertex_anthropic is True
    assert fable_operations
    assert all([route.provider for route in operation.routes] == ["vertex"] for operation in fable_operations)
    assert [route.provider for route in plan.routes["anthropic/claude-fable-5"]] == ["vertex"]


def test_strict_vertex_selects_explicit_route_when_openrouter_is_preferred():
    registry = load_registry()
    fable = registry.model("anthropic/claude-fable-5")
    openrouter = next(route for route in fable.routes if route.provider == "openrouter")
    registry = registry.with_preferred_route(fable.logical_id, openrouter.route_id)

    plan = build_execution_plan(registry, {
        "query": "protected", "compact": True, "require_vertex_anthropic": True
    })

    assert [route.provider for route in plan.routes[fable.logical_id]] == ["vertex"]
    assert [route.route_id for route in plan.routes[fable.logical_id]] == [
        "vertex:anthropic/claude-fable-5"
    ]


@pytest.mark.parametrize("vertex_count", [0, 2])
def test_strict_vertex_plan_fails_closed_for_invalid_vertex_routes(vertex_count):
    registry = load_registry()
    fable = registry.model("anthropic/claude-fable-5")
    vertex = next(route for route in fable.routes if route.provider == "vertex")
    non_vertex = tuple(route for route in fable.routes if route.provider != "vertex")
    malformed = replace(
        registry,
        models=tuple(
            replace(model, routes=non_vertex + ((vertex,) * vertex_count))
            if model == fable else model
            for model in registry.models
        ),
    )

    with pytest.raises(PlanningConstraintError) as error:
        build_execution_plan(malformed, {
            "query": "protected", "compact": True, "require_vertex_anthropic": True
        })

    assert error.value.violations[0].code == "strict_vertex_route"
    assert f"found {vertex_count}" in str(error.value)


def test_non_strict_fable_fallback_and_policy_digest_are_captured():
    registry = load_registry()
    strict = build_execution_plan(
        registry, {"query": "same", "compact": True, "require_vertex_anthropic": True}
    )
    public = build_execution_plan(
        registry, {"query": "same", "compact": True, "require_vertex_anthropic": False}
    )

    assert [route.provider for route in public.routes["anthropic/claude-fable-5"]] == [
        "vertex", "openrouter"
    ]
    assert strict.digest != public.digest


def test_independent_fallback_policies_are_frozen_and_digest_covered():
    registry = load_registry()
    base = {"query": "same", "models": ["x-ai/grok-4.5"]}
    production = build_execution_plan(registry, base)
    no_route_failover = build_execution_plan(
        registry, {**base, "allow_declared_route_failover": False}
    )
    substitution = build_execution_plan(
        registry, {**base, "allow_provider_substitution": True}
    )

    assert production.settings.allow_declared_route_failover is True
    assert production.settings.allow_provider_substitution is False
    assert production.stage1[0].settings.allow_declared_route_failover is True
    assert production.stage1[0].settings.allow_provider_substitution is False
    assert len({production.digest, no_route_failover.digest, substitution.digest}) == 3


def test_legacy_allow_fallbacks_only_controls_declared_route_failover():
    plan = build_execution_plan(
        load_registry(),
        {"query": "legacy", "models": ["x-ai/grok-4.3"], "allow_fallbacks": True},
    )

    assert plan.settings.allow_declared_route_failover is True
    assert plan.settings.allow_provider_substitution is False


def test_promoted_gpt_5_6_sol_plan_uses_registry_member_and_evaluator_effort():
    plan = build_execution_plan(
        load_registry(), {"query": "promoted", "models": ["openai/gpt-5.6-sol"]}
    )

    assert plan.stage1[0].logical_id == "openai/gpt-5.6-sol"
    assert plan.stage1[0].route.provider_model_id == "openai/gpt-5.6-sol"
    assert plan.stage1[0].settings.reasoning_effort == "medium"
    evaluator = next(op for op in plan.evaluators if op.logical_id == "openai/gpt-5.6-sol")
    assert evaluator.settings.reasoning_effort == "high"


@pytest.mark.parametrize(
    ("deployment_strict", "request_strict", "expected_strict"),
    [
        (False, False, False),
        (False, True, True),
        (True, False, True),
        (True, True, True),
    ],
)
def test_vertex_policy_composes_fail_closed(
    monkeypatch, deployment_strict, request_strict, expected_strict
):
    registry = load_registry()
    monkeypatch.setattr(
        "backend.config.REQUIRE_VERTEX_ANTHROPIC", deployment_strict
    )
    plan = build_execution_plan(
        registry,
        {
            "query": "same protected request",
            "compact": True,
            "require_vertex_anthropic": request_strict,
        },
    )
    strict_reference = build_execution_plan(
        registry,
        {
            "query": "same protected request",
            "compact": True,
            "require_vertex_anthropic": True,
        },
    )

    expected_providers = ["vertex"] if expected_strict else ["vertex", "openrouter"]
    assert plan.require_vertex_anthropic is expected_strict
    assert [
        route.provider for route in plan.routes["anthropic/claude-fable-5"]
    ] == expected_providers
    assert (plan.digest == strict_reference.digest) is expected_strict


def test_vertex_policy_override_must_be_typed_boolean():
    with pytest.raises(TypeError, match="require_vertex_anthropic"):
        build_execution_plan(
            load_registry(), {"query": "invalid", "require_vertex_anthropic": "false"}
        )


@pytest.mark.parametrize(
    ("field", "mutate"),
    [
        ("registry_version", lambda p: replace(p, registry_version=p.registry_version + "-changed")),
        ("registry_digest", lambda p: replace(p, registry_digest="1" * 64)),
        ("projection_digest", lambda p: replace(p, projection_digest="2" * 64)),
        ("roster_mode", lambda p: replace(p, roster_mode="changed")),
        ("roster_version", lambda p: replace(p, roster_version=p.roster_version + "-changed")),
        ("stage0", lambda p: replace(p, stage0=replace(p.stage0, classifier_threshold=p.stage0.classifier_threshold + 0.01))),
        ("stage1", lambda p: replace(p, stage1=(replace(p.stage1[0], dispatcher_contract="changed"), *p.stage1[1:]))),
        ("evaluators", lambda p: replace(p, evaluators=(replace(p.evaluators[0], logical_id="changed"), *p.evaluators[1:]))),
        ("chairman", lambda p: replace(p, chairman=replace(p.chairman, retry=replace(p.chairman.retry, max_retries=99)))),
        ("roles", lambda p: replace(p, roles=replace(p.roles, by_model=(("changed", ("member",)),)))),
        ("routes", lambda p: replace(p, routes=replace(p.routes, by_model=(("changed", p.stage1[0].routes),)))),
        ("messages", lambda p: replace(p, messages=(("user", "changed"),))),
        ("settings", lambda p: replace(p, settings=replace(p.settings, temperature=0.123))),
        ("limits", lambda p: replace(p, limits=replace(p.limits, max_tokens=1))),
        ("curation_constraints", lambda p: replace(p, curation_constraints=replace(p.curation_constraints, maximum=4))),
    ],
)
def test_every_authoritative_execution_plan_section_changes_digest(field, mutate):
    plan = build_execution_plan(load_registry(), {"query": "digest all authority", "compact": True})
    changed = mutate(plan)
    assert field in {item.name for item in fields(plan)}
    assert execution_plan_digest(changed) != plan.digest
