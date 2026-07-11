"""Focused runtime contracts for immutable execution plans."""

from dataclasses import replace
from unittest.mock import AsyncMock

import pytest

from backend import council
from backend.execution_planning import build_execution_plan, curate_responses
from backend.model_dispatcher import ModelDispatcher
from backend.model_registry import load_registry


def _plan(*, compact: bool = False, mode: str = "sync"):
    return build_execution_plan(
        load_registry(), {"query": "planned question", "compact": compact, "mode": mode}
    )


@pytest.mark.asyncio
async def test_sync_runtime_uses_fixed_stage_roles_and_emits_safe_plan_metadata(monkeypatch):
    plan = _plan(compact=True)
    stage1 = [{"model": op.logical_id, "response": op.logical_id} for op in plan.stage1]
    collect = AsyncMock(return_value=stage1)
    rank = AsyncMock(return_value=([], {}))
    synthesize = AsyncMock(return_value={"model": plan.chairman.logical_id, "response": "done"})
    monkeypatch.setattr(council, "stage1_collect_responses", collect)
    monkeypatch.setattr(council, "stage2_collect_rankings", rank)
    monkeypatch.setattr(council, "stage3_synthesize_final", synthesize)

    _, _, _, metadata = await council.run_full_council("planned question", execution_plan=plan)

    assert collect.await_args.args[1] == [op.logical_id for op in plan.stage1]
    assert rank.await_args.args[2] == [op.logical_id for op in plan.evaluators]
    assert synthesize.await_args.args[3] == plan.chairman.logical_id
    assert metadata["execution_plan"]["digest"] == plan.digest
    assert "messages" not in metadata["execution_plan"]
    assert "normalized_request" not in str(metadata["execution_plan"])


@pytest.mark.asyncio
async def test_stream_without_explicit_plan_executes_captured_operations(monkeypatch):
    plan = _plan(compact=True, mode="stream")
    execute = AsyncMock(side_effect=lambda operation: {
        "model": operation.logical_id, "content": operation.logical_id, "usage": {},
        "provider": operation.route.provider, "route_id": operation.route.route_id,
        "fallback_used": False, "error": None, "terminal_status": "succeeded",
    })
    dispatcher = ModelDispatcher()
    dispatcher.execute = execute
    monkeypatch.setattr(council, "load_registry", lambda: load_registry())
    monkeypatch.setattr(council, "build_execution_plan", lambda *_args, **_kwargs: plan)
    monkeypatch.setattr(council, "_dispatcher", lambda: dispatcher)
    rank = AsyncMock(return_value=([], {}))
    synthesize = AsyncMock(return_value={"model": plan.chairman.logical_id, "response": "done", "provider": "mock"})
    monkeypatch.setattr(council, "stage2_collect_rankings", rank)
    monkeypatch.setattr(council, "stage3_synthesize_final", synthesize)

    events = [event async for event in council.stream_council("planned question")]

    assert [call.args[0].logical_id for call in execute.await_args_list[:len(plan.stage1)]] == [
        operation.logical_id for operation in plan.stage1
    ]
    assert rank.await_args.args[2] == [op.logical_id for op in plan.evaluators]
    assert synthesize.await_args.args[3] == plan.chairman.logical_id
    assert events[-1]["metadata"]["execution_plan"]["digest"] == plan.digest


@pytest.mark.asyncio
async def test_dispatcher_sync_and_stream_stage1_terminal_fold_equivalence(monkeypatch):
    """Real dispatch orchestration preserves failures/provenance and plan seat order."""
    plan = _plan(compact=True)
    route_owner = {
        route.provider_model_id: (operation.logical_id, route.route_id)
        for operation in plan.stage1
        for route in operation.routes
    }
    fallback_model = next(op.logical_id for op in plan.stage1 if len(op.routes) > 1)
    failure_model = plan.stage1[-1].logical_id
    completion_order = []

    async def adapter(provider_model_id, _messages, **_settings):
        model, route_id = route_owner[provider_model_id]
        operation = next(op for op in plan.stage1 if op.logical_id == model)
        if model == failure_model:
            return None
        if model == fallback_model and route_id == operation.routes[0].route_id:
            return None
        delay = 0.001 * (len(plan.stage1) - [op.logical_id for op in plan.stage1].index(model))
        import asyncio
        await asyncio.sleep(delay)
        completion_order.append(model)
        return {"content": f"answer:{model}", "usage": {"total_tokens": len(model)}}

    providers = {route.provider for op in plan.stage1 for route in op.routes}
    dispatcher = ModelDispatcher(adapters=dict.fromkeys(providers, adapter))
    monkeypatch.setattr(council, "_dispatcher", lambda: dispatcher)
    monkeypatch.setattr(council, "build_execution_plan", lambda *_args, **_kwargs: plan)
    monkeypatch.setattr(council, "stage3_synthesize_final", AsyncMock(return_value={"model": plan.chairman.logical_id, "response": "done"}))

    cached_op = plan.stage1[0]
    cached = await dispatcher.execute(cached_op)
    council._stage1_cache.clear()
    council._cache_response(cached_op, "planned question", cached)

    sync_stage1, _, _, sync_metadata = await council.run_full_council(
        "planned question", final_only=True
    )
    council._stage1_cache.clear()
    council._cache_response(cached_op, "planned question", cached)
    events = [event async for event in council.stream_council(
        "planned question", final_only=True
    )]
    complete = events[-1]

    fields = ("model", "response", "route_id", "fallback_used", "provider", "usage", "error", "terminal_status")
    def fold(results):
        return [{field: result.get(field) for field in fields} for result in results]
    assert fold(sync_stage1) == fold(complete["stage1"])
    assert [result["model"] for result in sync_stage1] == [op.logical_id for op in plan.stage1]
    assert completion_order != [op.logical_id for op in plan.stage1 if op.logical_id != cached_op.logical_id]
    assert sync_metadata["execution_plan"]["digest"] == complete["metadata"]["execution_plan"]["digest"] == plan.digest


@pytest.mark.asyncio
async def test_stream_warm_cache_uses_real_flow_and_zero_adapter_calls(monkeypatch):
    plan = _plan(compact=True)
    calls = 0

    async def adapter(provider_model_id, _messages, **_settings):
        nonlocal calls
        calls += 1
        return {"content": f"answer:{provider_model_id}", "usage": {"total_tokens": calls}}

    providers = {route.provider for op in plan.stage1 for route in op.routes}
    dispatcher = ModelDispatcher(adapters=dict.fromkeys(providers, adapter))
    monkeypatch.setattr(council, "_dispatcher", lambda: dispatcher)
    monkeypatch.setattr(council, "build_execution_plan", lambda *_args, **_kwargs: plan)
    monkeypatch.setattr(council, "stage3_synthesize_final", AsyncMock(return_value={"model": plan.chairman.logical_id, "response": "done"}))
    council._stage1_cache.clear()

    seeded, _, _, seeded_metadata = await council.run_full_council("planned question", final_only=True)
    calls = 0
    events = [event async for event in council.stream_council("planned question", final_only=True)]
    complete = events[-1]

    assert calls == 0
    assert complete["stage1"] == seeded
    assert [item["model"] for item in complete["stage1"]] == [op.logical_id for op in plan.stage1]
    assert complete["metadata"]["execution_plan"]["digest"] == seeded_metadata["execution_plan"]["digest"] == plan.digest


def test_stage1_cache_key_changes_with_captured_route_and_settings():
    plan = _plan(compact=True)
    operation = plan.stage1[0]
    changed = replace(operation, settings=replace(operation.settings, temperature=0.1))

    assert council._get_cache_key(operation, "question") != council._get_cache_key(changed, "question")


@pytest.mark.asyncio
async def test_sync_and_stream_total_failure_fold_identically_without_explicit_plan(monkeypatch):
    plan = _plan(compact=True)

    async def adapter(*_args, **_kwargs):
        return None

    providers = {route.provider for op in plan.stage1 for route in op.routes}
    dispatcher = ModelDispatcher(adapters=dict.fromkeys(providers, adapter))
    monkeypatch.setattr(council, "_dispatcher", lambda: dispatcher)
    monkeypatch.setattr(council, "build_execution_plan", lambda *_args, **_kwargs: plan)
    council._stage1_cache.clear()
    sync_stage1, _, sync_stage3, sync_metadata = await council.run_full_council(
        "planned question", final_only=True
    )
    council._stage1_cache.clear()
    complete = [event async for event in council.stream_council(
        "planned question", final_only=True
    )][-1]

    assert complete["stage1"] == sync_stage1
    assert complete["stage3"] == sync_stage3
    assert complete["metadata"]["execution_plan"]["digest"] == sync_metadata["execution_plan"]["digest"] == plan.digest


def test_planner_curation_is_score_first_deterministic_and_provider_diverse():
    plan = _plan()
    responses = [
        {"model": op.logical_id, "response": op.logical_id}
        for op in reversed(plan.stage1)
    ]
    rankings = [
        {"model": op.logical_id, "average_rank": index + 1, "positions": [index + 1]}
        for index, op in enumerate(plan.stage1)
    ]

    selected = curate_responses(plan, responses, rankings)

    assert [item["model"] for item in selected[:3]] == [op.logical_id for op in plan.stage1[:3]]
    providers = {plan.stage1[[op.logical_id for op in plan.stage1].index(item["model"])].route.provider for item in selected}
    assert len(providers) > 1
    assert selected == curate_responses(plan, list(reversed(responses)), rankings)
