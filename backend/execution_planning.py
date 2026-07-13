"""Deterministic provider-neutral execution planning."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping, Sequence
from dataclasses import asdict, dataclass, replace
from typing import Any, Literal
from urllib.parse import urlsplit, urlunsplit

from . import config
from .model_registry import ModelRecord, ModelRoute, RegistrySnapshot


@dataclass(frozen=True)
class DiversityConstraints:
    roster_size: int
    max_per_family: int
    max_per_provider: int
    min_distinct_families: int
    min_distinct_providers: int
    required_seats: tuple[int, ...]


@dataclass(frozen=True)
class ConstraintViolation:
    code: str
    message: str


class PlanningConstraintError(ValueError):
    def __init__(self, violations: Sequence[ConstraintViolation]) -> None:
        self.violations = tuple(violations)
        super().__init__("; ".join(item.message for item in self.violations))


@dataclass(frozen=True)
class CuratedMember:
    logical_id: str
    family: str
    seat: int
    preferred_route: ModelRoute


@dataclass(frozen=True)
class RouteResolution:
    logical_id: str
    route_id: str
    provider: str
    provider_model_id: str
    adapter: str


@dataclass(frozen=True)
class RequestSettings:
    max_tokens: int
    temperature: float
    reasoning_effort: str | None = None
    allow_declared_route_failover: bool = True
    allow_provider_substitution: bool = False

    def __getitem__(self, key: str):
        return getattr(self, key)


@dataclass(frozen=True)
class RetryPolicy:
    timeout_seconds: float
    max_retries: int
    backoff_base_seconds: float


@dataclass(frozen=True)
class PlanOperation:
    logical_id: str
    routes: tuple[RouteResolution, ...]
    messages: tuple[tuple[str, str], ...]
    settings: RequestSettings
    retry: RetryPolicy
    dispatcher_contract: str

    @property
    def route(self) -> RouteResolution:
        """Compatibility view of the captured primary route."""
        return self.routes[0]

    @property
    def normalized_request(self) -> tuple[tuple[str, tuple[tuple[str, str], ...]], ...]:
        return (("messages", self.messages),)


@dataclass(frozen=True)
class Stage0Limits:
    max_requests: int = 1
    max_results: int = 5
    max_chars: int = 8_000
    timeout_seconds: float = 10.0
    max_bytes: int = 1_000_000
    max_spend: float = 1.0


@dataclass(frozen=True)
class Stage0Plan:
    mode: Literal["disabled", "explicit", "classifier"]
    classifier_threshold: float
    classifier_score: float | None
    planned: bool
    gating_reason: str
    target_kind: Literal["url", "search"]
    target: str
    target_digest: str
    query_digest: str
    policy: str
    limits: Stage0Limits
    decision: str

    def __getitem__(self, key: str):
        return getattr(self, key)


@dataclass(frozen=True)
class CouncilRoles:
    by_model: tuple[tuple[str, tuple[str, ...]], ...]

    def __getitem__(self, model: str) -> tuple[str, ...]:
        return dict(self.by_model)[model]


@dataclass(frozen=True)
class CouncilRoutes:
    by_model: tuple[tuple[str, tuple[RouteResolution, ...]], ...]

    def __getitem__(self, model: str) -> tuple[RouteResolution, ...]:
        return dict(self.by_model)[model]


@dataclass(frozen=True)
class CurationPolicy:
    top_consensus: int = 3
    wildcards: int = 1
    diversity_picks: int = 1
    maximum: int = 5

    def __getitem__(self, key: str):
        return getattr(self, key)


@dataclass(frozen=True)
class PlanLimits:
    max_tokens: int

    def __getitem__(self, key: str):
        return getattr(self, key)


@dataclass(frozen=True)
class ExecutionPlan:
    registry_version: str
    registry_digest: str
    projection_digest: str
    roster_mode: str
    roster_version: str
    stage0: Stage0Plan
    stage1: tuple[PlanOperation, ...]
    evaluators: tuple[PlanOperation, ...]
    chairman: PlanOperation
    roles: CouncilRoles
    routes: CouncilRoutes
    messages: tuple[tuple[str, str], ...]
    settings: RequestSettings
    limits: PlanLimits
    curation_constraints: CurationPolicy
    require_vertex_anthropic: bool
    digest: str


def execution_plan_digest(plan: ExecutionPlan) -> str:
    """Hash the canonical serialization of all plan authority except its digest."""
    payload = asdict(plan)
    payload.pop("digest", None)
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(serialized.encode()).hexdigest()


def _canonical_planned_url(value: str) -> str:
    parts = urlsplit(value)
    scheme = parts.scheme.lower()
    host = (parts.hostname or "").lower()
    if not host or scheme not in {"http", "https"}:
        return value
    port = parts.port
    netloc = host if port is None else f"{host}:{port}"
    path_parts: list[str] = []
    for part in parts.path.split("/"):
        if part == "..":
            if path_parts:
                path_parts.pop()
        elif part not in {"", "."}:
            path_parts.append(part)
    path = "/" + "/".join(path_parts) if parts.path else ""
    return urlunsplit((scheme, netloc, path, parts.query, ""))


def curate_roster(candidates: Sequence[ModelRecord], constraints: DiversityConstraints, registry_version: str) -> tuple[CuratedMember, ...]:
    del registry_version
    eligible = sorted((model for model in candidates if model.seats), key=lambda model: (model.logical_id, model.preferred_route.route_id))
    selected: tuple[CuratedMember, ...] | None = None

    def search(index: int, chosen: list[CuratedMember]) -> bool:
        nonlocal selected
        if index == len(constraints.required_seats):
            families = {item.family for item in chosen}
            providers = {item.preferred_route.provider for item in chosen}
            if len(chosen) == constraints.roster_size and len(families) >= constraints.min_distinct_families and len(providers) >= constraints.min_distinct_providers:
                selected = tuple(chosen)
                return True
            return False
        seat = constraints.required_seats[index]
        used = {item.logical_id for item in chosen}
        for model in (item for item in eligible if seat in item.seats and item.logical_id not in used):
            family_count = sum(item.family == model.family for item in chosen)
            provider_count = sum(item.preferred_route.provider == model.preferred_route.provider for item in chosen)
            if family_count >= constraints.max_per_family or provider_count >= constraints.max_per_provider:
                continue
            chosen.append(CuratedMember(model.logical_id, model.family, seat, model.preferred_route))
            if search(index + 1, chosen):
                return True
            chosen.pop()
        return False

    search(0, [])
    violations = []
    if selected is None:
        violations.append(ConstraintViolation("required_seats", "required seats or roster size cannot be satisfied"))
        violations.append(ConstraintViolation("family_diversity", "minimum distinct families cannot be satisfied"))
        violations.append(ConstraintViolation("provider_diversity", "minimum distinct providers cannot be satisfied"))
    if violations:
        raise PlanningConstraintError(violations)
    return selected


def resolve_logical_route(registry: RegistrySnapshot, logical_id: str, route_policy: str = "primary", mode: str = "sync") -> RouteResolution:
    del mode
    if route_policy != "primary":
        raise ValueError(f"unsupported route policy: {route_policy}")
    route = registry.model(logical_id).preferred_route
    return RouteResolution(logical_id, route.route_id, route.provider, route.provider_model_id, route.adapter)


def build_execution_plan(registry: RegistrySnapshot, request: Mapping[str, Any]) -> ExecutionPlan:
    policy_override = request.get("require_vertex_anthropic")
    if policy_override is not None and not isinstance(policy_override, bool):
        raise TypeError("require_vertex_anthropic must be a boolean")
    require_vertex_anthropic = config.REQUIRE_VERTEX_ANTHROPIC or policy_override is True
    model_ids = tuple(request.get("models") or (registry.compact_roster if request.get("compact") else registry.production_roster))
    if len(model_ids) != len(set(model_ids)):
        raise ValueError("execution plan cannot contain duplicate models")
    messages = tuple(filter(None, ((("system", str(request["system"])) if request.get("system") else None), ("user", str(request.get("query", ""))))))
    if request.get("route_policy", "primary") != "primary":
        raise ValueError(f"unsupported route policy: {request['route_policy']}")
    route_failover_value = request.get(
        "allow_declared_route_failover", request.get("allow_fallbacks", True)
    )
    provider_substitution_value = request.get("allow_provider_substitution", False)
    if not isinstance(route_failover_value, bool):
        raise TypeError("allow_declared_route_failover must be a boolean")
    if not isinstance(provider_substitution_value, bool):
        raise TypeError("allow_provider_substitution must be a boolean")
    settings = RequestSettings(
        int(request.get("max_tokens", 8192)),
        float(request.get("temperature", 0.7)),
        allow_declared_route_failover=route_failover_value,
        allow_provider_substitution=provider_substitution_value,
    )
    retry = RetryPolicy(float(request.get("timeout", 180)), int(request.get("max_retries", 2)), float(request.get("backoff_base", 1.5)))
    def captured_routes(model_id: str) -> tuple[ModelRoute, ...]:
        record = registry.model(model_id)
        if require_vertex_anthropic and config.is_vertex_anthropic_model(model_id):
            vertex_routes = tuple(
                route for route in record.routes if route.provider == "vertex"
            )
            if len(vertex_routes) != 1:
                raise PlanningConstraintError((ConstraintViolation(
                    "strict_vertex_route",
                    f"Strict Vertex Anthropic policy requires exactly one Vertex route for {model_id}; found {len(vertex_routes)}",
                ),))
            return vertex_routes
        ordered = (record.preferred_route,) + tuple(
            route for route in record.routes if route != record.preferred_route
        )
        return ordered

    def operation(model_id: str, *, reasoning: str | None = None) -> PlanOperation:
        ordered = captured_routes(model_id)
        routes = tuple(RouteResolution(model_id, route.route_id, route.provider, route.provider_model_id, route.adapter) for route in ordered)
        model_reasoning = registry.model(model_id).reasoning
        effective_reasoning = reasoning or model_reasoning.get("member") or model_reasoning.get("default")
        operation_settings = RequestSettings(
            settings.max_tokens,
            settings.temperature,
            effective_reasoning,
            settings.allow_declared_route_failover,
            settings.allow_provider_substitution,
        )
        return PlanOperation(model_id, routes, messages, operation_settings, retry, "provider-neutral-dispatch/v2")
    operations = tuple(operation(model_id) for model_id in model_ids)
    by_id = {operation.logical_id: operation for operation in operations}
    evaluators = tuple(operation(item, reasoning=registry.model(item).reasoning.get("evaluator")) for item in registry.evaluator_priority if item in by_id)
    chairman_id = str(request.get("chairman") or registry.chairman_logical_id)
    chairman = by_id.get(chairman_id)
    if chairman is None:
        chairman = operation(chairman_id)
    all_ids = tuple(dict.fromkeys((*model_ids, *(item.logical_id for item in evaluators), chairman.logical_id)))
    routes_dict = {
        logical_id: tuple(RouteResolution(logical_id, route.route_id, route.provider, route.provider_model_id, route.adapter) for route in captured_routes(logical_id))
        for logical_id in all_ids
    }
    roles = CouncilRoles(tuple((logical_id, tuple(registry.model(logical_id).roles)) for logical_id in all_ids))
    stage0_mode = str(request.get("parallel_mode", "disabled"))
    threshold = float(request.get("parallel_classifier_threshold", 0.8))
    score = request.get("parallel_classifier_score")
    score = float(score) if score is not None else None
    planned = stage0_mode == "explicit" or (stage0_mode == "classifier" and score is not None and score >= threshold)
    reason = "explicit_request" if stage0_mode == "explicit" else "classifier_threshold" if planned else "below_threshold" if stage0_mode == "classifier" else "disabled"
    query = str(request.get("query", ""))
    import re
    url_match = re.search(r"https?://[^\s<>\"']+", query, re.I)
    target = _canonical_planned_url(url_match.group(0).rstrip(".,;!?)")) if url_match else query
    decision = "explicit" if request.get("models") else "compact" if request.get("compact") else "full"
    stage0 = Stage0Plan(stage0_mode, threshold, score, planned, reason, "url" if url_match else "search", target, hashlib.sha256(target.encode()).hexdigest(), hashlib.sha256(query.encode()).hexdigest(), "parallel-bounded/v1", Stage0Limits(), decision)
    curation = CurationPolicy()
    projection = {"surface": "backend", "registry_version": registry.version, "logical_ids": all_ids, "routes": {key: [route.route_id for route in value] for key, value in routes_dict.items()}}
    projection_digest = hashlib.sha256(json.dumps(projection, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    roster_mode = "explicit" if request.get("models") else "compact" if request.get("compact") else "production"
    plan = ExecutionPlan(registry.version, registry.digest, projection_digest, roster_mode, registry.version, stage0, operations, evaluators, chairman, roles, CouncilRoutes(tuple(routes_dict.items())), messages, settings, PlanLimits(settings.max_tokens), curation, require_vertex_anthropic, "")
    return replace(plan, digest=execution_plan_digest(plan))


def curate_responses(
    plan: ExecutionPlan,
    responses: Sequence[Mapping[str, Any]],
    aggregate_rankings: Sequence[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    """Deterministically curate scored responses while adding route diversity."""
    maximum = plan.curation_constraints.maximum
    if len(responses) <= maximum:
        return [dict(item) for item in responses]

    by_model = {str(item["model"]): dict(item) for item in responses}
    plan_order = {operation.logical_id: index for index, operation in enumerate(plan.stage1)}
    ranked = sorted(
        (item for item in aggregate_rankings if item.get("model") in by_model),
        key=lambda item: (float(item["average_rank"]), plan_order.get(str(item["model"]), 10_000)),
    )
    ranked_ids = [str(item["model"]) for item in ranked]
    ranked_ids.extend(
        operation.logical_id
        for operation in plan.stage1
        if operation.logical_id in by_model and operation.logical_id not in ranked_ids
    )
    consensus_count = plan.curation_constraints.top_consensus
    selected = ranked_ids[:consensus_count]

    remaining_rankings = [item for item in ranked if item["model"] not in selected]
    for _ in range(plan.curation_constraints.wildcards):
        if not remaining_rankings:
            break
        wildcard = max(
            remaining_rankings,
            key=lambda item: (
                max(item.get("positions", [0])) - min(item.get("positions", [0])),
                -float(item["average_rank"]),
                -plan_order.get(str(item["model"]), 10_000),
            ),
        )
        selected.append(str(wildcard["model"]))
        remaining_rankings.remove(wildcard)

    operations = {operation.logical_id: operation for operation in plan.stage1}
    for _ in range(plan.curation_constraints.diversity_picks):
        candidates = [model for model in ranked_ids if model not in selected]
        if not candidates:
            break
        selected_providers = {operations[model].route.provider for model in selected}
        pick = min(
            candidates,
            key=lambda model: (
                operations[model].route.provider in selected_providers,
                ranked_ids.index(model),
                plan_order.get(model, 10_000),
            ),
        )
        selected.append(pick)

    selected.extend(model for model in ranked_ids if model not in selected)
    return [by_model[model] for model in selected[:maximum]]
