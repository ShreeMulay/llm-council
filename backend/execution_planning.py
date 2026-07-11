"""Deterministic provider-neutral execution planning."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any

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
class PlanOperation:
    logical_id: str
    route: RouteResolution
    normalized_request: tuple[tuple[str, Any], ...]
    dispatcher_contract: str


@dataclass(frozen=True)
class ExecutionPlan:
    registry_version: str
    registry_digest: str
    projection_digest: str
    stage0: Mapping[str, Any]
    stage1: tuple[PlanOperation, ...]
    evaluators: tuple[PlanOperation, ...]
    chairman: PlanOperation
    roles: Mapping[str, tuple[str, ...]]
    routes: Mapping[str, tuple[RouteResolution, ...]]
    messages: tuple[tuple[str, str], ...]
    settings: Mapping[str, Any]
    limits: Mapping[str, int]
    curation_constraints: Mapping[str, int]
    digest: str


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
    model_ids = tuple(request.get("models") or (registry.compact_roster if request.get("compact") else registry.production_roster))
    if len(model_ids) != len(set(model_ids)):
        raise ValueError("execution plan cannot contain duplicate models")
    messages = tuple(filter(None, ((("system", str(request["system"])) if request.get("system") else None), ("user", str(request.get("query", ""))))))
    normalized = (("messages", messages),)
    policy = str(request.get("route_policy", "primary"))
    operations = tuple(PlanOperation(model_id, resolve_logical_route(registry, model_id, policy), normalized, "provider-neutral-dispatch/v1") for model_id in model_ids)
    by_id = {operation.logical_id: operation for operation in operations}
    evaluators = tuple(by_id[item] for item in ("anthropic/claude-fable-5", "deepseek/deepseek-v4-pro", "openai/gpt-5.5") if item in by_id)
    chairman = by_id.get(registry.chairman_logical_id)
    if chairman is None:
        chairman = PlanOperation(registry.chairman_logical_id, resolve_logical_route(registry, registry.chairman_logical_id, policy), normalized, "provider-neutral-dispatch/v1")
    all_ids = tuple(dict.fromkeys((*model_ids, *(item.logical_id for item in evaluators), chairman.logical_id)))
    routes = {
        logical_id: tuple(RouteResolution(logical_id, route.route_id, route.provider, route.provider_model_id, route.adapter) for route in registry.model(logical_id).routes)
        for logical_id in all_ids
    }
    roles = {logical_id: registry.model(logical_id).roles for logical_id in all_ids}
    stage0_dict = {"decision": "explicit" if request.get("models") else "compact" if request.get("compact") else "full", "mode": str(request.get("mode", "sync")), "model_count": len(model_ids)}
    settings_dict = {"temperature": float(request.get("temperature", 0.7)), "route_policy": policy}
    limits_dict = {"max_tokens": int(request.get("max_tokens", 8192))}
    curation_dict = {"top_consensus": 3, "wildcards": 1, "diversity_picks": 1, "maximum": 5}
    projection = {"surface": "backend", "registry_version": registry.version, "logical_ids": all_ids, "routes": {key: [route.route_id for route in value] for key, value in routes.items()}}
    projection_digest = hashlib.sha256(json.dumps(projection, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    payload = {"registry_version": registry.version, "registry_digest": registry.digest, "projection_digest": projection_digest, "stage0": stage0_dict, "models": model_ids, "routes": projection["routes"], "messages": messages, "settings": settings_dict, "limits": limits_dict, "curation": curation_dict}
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return ExecutionPlan(registry.version, registry.digest, projection_digest, MappingProxyType(stage0_dict), operations, evaluators, chairman, MappingProxyType(roles), MappingProxyType(routes), messages, MappingProxyType(settings_dict), MappingProxyType(limits_dict), MappingProxyType(curation_dict), digest)
