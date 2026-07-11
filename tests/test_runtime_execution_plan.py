"""Focused runtime contracts for immutable execution plans."""

from unittest.mock import AsyncMock

import pytest

from backend import council
from backend.execution_planning import build_execution_plan, curate_responses
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
async def test_stream_runtime_keeps_evaluators_distinct_from_chairman(monkeypatch):
    plan = _plan(compact=True, mode="stream")
    monkeypatch.setattr(
        council,
        "_query_single_with_retry",
        AsyncMock(side_effect=lambda model, _messages: {"model": model, "response": model, "usage": {}, "provider": "mock"}),
    )
    rank = AsyncMock(return_value=([], {}))
    synthesize = AsyncMock(return_value={"model": plan.chairman.logical_id, "response": "done", "provider": "mock"})
    monkeypatch.setattr(council, "stage2_collect_rankings", rank)
    monkeypatch.setattr(council, "stage3_synthesize_final", synthesize)

    events = [event async for event in council.stream_council("planned question", execution_plan=plan)]

    assert rank.await_args.args[2] == [op.logical_id for op in plan.evaluators]
    assert synthesize.await_args.args[3] == plan.chairman.logical_id
    assert events[-1]["metadata"]["execution_plan"]["digest"] == plan.digest


@pytest.mark.asyncio
async def test_mocked_sync_and_stream_fold_to_identical_terminal_result(monkeypatch):
    plan = _plan(compact=True)
    stage1 = [
        {
            "model": op.logical_id,
            "response": f"answer:{op.logical_id}",
            "usage": {"prompt_tokens": 2, "completion_tokens": 3, "total_tokens": 5},
            "provider": op.routes[-1].provider,
            "route_id": op.routes[-1].route_id,
            "fallback_used": True,
            "error": None,
        }
        for op in plan.stage1
    ]
    stage2 = [{"model": plan.evaluators[0].logical_id, "parsed_ranking": [], "usage": {"total_tokens": 7}, "error": None}]
    stage3 = {
        "model": plan.chairman.logical_id,
        "response": "final content",
        "usage": {"total_tokens": 11},
        "provider": plan.chairman.route.provider,
        "route_id": plan.chairman.route.route_id,
        "fallback_used": False,
        "error": None,
    }
    monkeypatch.setattr(council, "stage1_collect_responses", AsyncMock(return_value=stage1))
    monkeypatch.setattr(council, "_query_planned_operation", AsyncMock(side_effect=stage1))
    monkeypatch.setattr(council, "stage2_collect_rankings", AsyncMock(return_value=(stage2, {})))
    monkeypatch.setattr(council, "stage3_synthesize_final", AsyncMock(return_value=stage3))

    sync_stage1, sync_stage2, sync_stage3, sync_metadata = await council.run_full_council(
        "planned question", execution_plan=plan
    )
    events = [event async for event in council.stream_council("planned question", execution_plan=plan)]
    complete = events[-1]

    def folded(stage1_results, stage2_results, stage3_result, metadata, status):
        all_results = [*stage1_results, *stage2_results, stage3_result]
        return {
            "content": stage3_result["response"],
            "routes": [(item.get("route_id"), item.get("fallback_used")) for item in [*stage1_results, stage3_result]],
            "errors": [item.get("error") for item in all_results],
            "usage_total": sum(item.get("usage", {}).get("total_tokens", 0) for item in all_results),
            "terminal_status": status,
            "plan_digest": metadata["execution_plan"]["digest"],
        }

    assert folded(sync_stage1, sync_stage2, sync_stage3, sync_metadata, "complete") == folded(
        complete["stage1"], complete["stage2"], complete["stage3"], complete["metadata"], complete["event"]
    )


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
