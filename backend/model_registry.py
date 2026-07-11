"""Declarative, side-effect-free canonical model registry."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping
from dataclasses import dataclass, replace
from typing import Any


@dataclass(frozen=True)
class ModelRoute:
    route_id: str
    provider: str
    provider_model_id: str
    adapter: str


@dataclass(frozen=True)
class ModelRecord:
    logical_id: str
    display_name: str
    family: str
    aliases: tuple[str, ...]
    lifecycle: str
    roles: tuple[str, ...]
    seats: tuple[int, ...]
    routes: tuple[ModelRoute, ...]
    preferred_route_id: str

    @property
    def preferred_route(self) -> ModelRoute:
        return next(route for route in self.routes if route.route_id == self.preferred_route_id)


@dataclass(frozen=True)
class RegistrySnapshot:
    version: str
    models: tuple[ModelRecord, ...]
    production_roster: tuple[str, ...]
    compact_roster: tuple[str, ...]
    chairman_logical_id: str
    digest: str

    def model(self, logical_id: str) -> ModelRecord:
        try:
            return next(model for model in self.models if model.logical_id == logical_id)
        except StopIteration as exc:
            raise KeyError(logical_id) from exc

    def with_preferred_route(self, logical_id: str, route_id: str) -> RegistrySnapshot:
        model = self.model(logical_id)
        if route_id not in {route.route_id for route in model.routes}:
            raise ValueError(f"unknown route_id: {route_id}")
        models = tuple(
            replace(item, preferred_route_id=route_id) if item.logical_id == logical_id else item
            for item in self.models
        )
        raw = self.to_dict()
        raw["models"] = [_model_dict(item) for item in models]
        raw.pop("digest", None)
        return self.from_dict(raw)

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "models": [_model_dict(model) for model in self.models],
            "production_roster": list(self.production_roster),
            "compact_roster": list(self.compact_roster),
            "chairman_logical_id": self.chairman_logical_id,
            "digest": self.digest,
        }

    @classmethod
    def from_dict(cls, raw: Mapping[str, Any]) -> RegistrySnapshot:
        models = tuple(_model_from_dict(item) for item in raw["models"])
        _validate_unique(models)
        _validate_registry(models, raw)
        canonical = {
            "version": raw["version"],
            "models": [_model_dict(model) for model in models],
            "production_roster": list(raw["production_roster"]),
            "compact_roster": list(raw["compact_roster"]),
            "chairman_logical_id": raw["chairman_logical_id"],
        }
        digest = hashlib.sha256(json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        supplied = raw.get("digest")
        if supplied is not None and supplied != digest:
            raise ValueError("registry digest mismatch")
        return cls(
            version=str(raw["version"]), models=models,
            production_roster=tuple(raw["production_roster"]),
            compact_roster=tuple(raw["compact_roster"]),
            chairman_logical_id=str(raw["chairman_logical_id"]), digest=digest,
        )


@dataclass(frozen=True)
class RegistryProjection:
    surface: str
    registry_version: str
    registry_digest: str
    logical_ids: tuple[str, ...]

    def with_digest(self, digest: str) -> RegistryProjection:
        return replace(self, registry_digest=digest)


def _model_dict(model: ModelRecord) -> dict[str, Any]:
    return {
        "logical_id": model.logical_id, "display_name": model.display_name,
        "family": model.family, "aliases": list(model.aliases), "lifecycle": model.lifecycle,
        "roles": list(model.roles), "seats": list(model.seats),
        "routes": [route.__dict__ for route in model.routes],
        "preferred_route_id": model.preferred_route_id,
    }


def _model_from_dict(raw: Mapping[str, Any]) -> ModelRecord:
    routes = tuple(ModelRoute(**route) for route in raw["routes"])
    preferred = str(raw["preferred_route_id"])
    if preferred not in {route.route_id for route in routes}:
        raise ValueError(f"unknown preferred route_id: {preferred}")
    return ModelRecord(
        logical_id=str(raw["logical_id"]), display_name=str(raw["display_name"]),
        family=str(raw["family"]), aliases=tuple(raw["aliases"]), lifecycle=str(raw["lifecycle"]),
        roles=tuple(raw["roles"]), seats=tuple(raw["seats"]), routes=routes,
        preferred_route_id=preferred,
    )


def _validate_unique(models: tuple[ModelRecord, ...]) -> None:
    for kind, values in (
        ("logical_id", [model.logical_id for model in models]),
        ("alias", [alias for model in models for alias in model.aliases]),
        ("route_id", [route.route_id for model in models for route in model.routes]),
    ):
        if len(values) != len(set(values)):
            raise ValueError(f"duplicate {kind}")


def _validate_registry(models: tuple[ModelRecord, ...], raw: Mapping[str, Any]) -> None:
    by_id = {model.logical_id: model for model in models}
    production = tuple(raw["production_roster"])
    compact = tuple(raw["compact_roster"])
    if not production or len(production) != len(set(production)) or not set(production) <= by_id.keys():
        raise ValueError("production roster contains duplicate or unknown model")
    if len(compact) != len(set(compact)) or not set(compact) <= set(production):
        raise ValueError("compact roster must be a unique production subset")
    for seat, logical_id in enumerate(production, 1):
        model = by_id[logical_id]
        if model.lifecycle != "production" or model.seats != (seat,) or "member" not in model.roles:
            raise ValueError("production lifecycle, role, and seat invariants violated")
    chairman = str(raw["chairman_logical_id"])
    if chairman not in production or "chairman" not in by_id[chairman].roles:
        raise ValueError("chairman must be a production model with chairman role")
    if sum("chairman" in model.roles for model in models) != 1:
        raise ValueError("registry requires exactly one chairman")
    for model in models:
        if not model.logical_id or not model.family or not model.routes:
            raise ValueError("model identity, family, and routes are required")
        if len(model.seats) != len(set(model.seats)) or any(seat < 1 for seat in model.seats):
            raise ValueError("invalid model seats")
        if len(model.roles) != len(set(model.roles)) or len(model.aliases) != len(set(model.aliases)):
            raise ValueError("duplicate model role or alias")
        for route in model.routes:
            if not all((route.route_id, route.provider, route.provider_model_id, route.adapter)):
                raise ValueError("route fields are required")


_PRODUCTION = (
    "openai/gpt-5.5", "anthropic/claude-fable-5", "fireworks/glm-5.2",
    "google/gemini-3.1-pro-preview", "x-ai/grok-4.3", "fireworks/kimi-k2.7-code",
    "deepseek/deepseek-v4-pro", "meta-llama/llama-4-maverick", "qwen/qwen3.7-max",
)
_CHALLENGERS = (
    "openai/gpt-5.6-sol", "openai/gpt-5.6-terra", "openai/gpt-5.6-luna",
    "anthropic/claude-sonnet-5", "anthropic/claude-opus-4.8", "google/gemini-3.5-flash",
    "x-ai/grok-4.5", "deepseek/deepseek-v4-flash", "minimax/minimax-m3",
    "mistralai/mistral-large-3",
)
_ALIASES = ("gpt", "fable", "glm", "gemini", "grok", "kimi", "deepseek", "llama", "qwen")


def _raw_registry() -> dict[str, Any]:
    models = []
    providers = ("openrouter", "vertex", "fireworks", "openrouter", "xai", "fireworks", "openrouter", "openrouter", "openrouter")
    for seat, (logical_id, alias, provider) in enumerate(zip(_PRODUCTION, _ALIASES, providers, strict=True), 1):
        family = logical_id.split("/", 1)[0]
        roles = ["member"] + (["evaluator"] if seat in (1, 2, 7) else []) + (["chairman"] if seat == 2 else [])
        provider_ids = {
            "openai/gpt-5.5": "openai/gpt-5.5",
            "anthropic/claude-fable-5": "claude-fable-5",
            "fireworks/glm-5.2": "accounts/fireworks/models/glm-5p2",
            "google/gemini-3.1-pro-preview": "google/gemini-3.1-pro-preview",
            "x-ai/grok-4.3": "grok-4.3",
            "fireworks/kimi-k2.7-code": "accounts/fireworks/models/kimi-k2p7-code",
            "deepseek/deepseek-v4-pro": "deepseek/deepseek-v4-pro",
            "meta-llama/llama-4-maverick": "meta-llama/llama-4-maverick",
            "qwen/qwen3.7-max": "qwen/qwen3.7-max",
        }
        routes = [{"route_id": f"{provider}:{logical_id}", "provider": provider, "provider_model_id": provider_ids[logical_id], "adapter": f"{provider}_adapter"}]
        if seat == 2:
            routes.append({"route_id": f"openrouter:{logical_id}", "provider": "openrouter", "provider_model_id": logical_id, "adapter": "openrouter_adapter"})
        models.append({"logical_id": logical_id, "display_name": logical_id, "family": family, "aliases": [alias], "lifecycle": "production", "roles": roles, "seats": [seat], "routes": routes, "preferred_route_id": routes[0]["route_id"]})
    for logical_id in _CHALLENGERS:
        provider = "openrouter"
        route = {"route_id": f"challenger:{logical_id}", "provider": provider, "provider_model_id": logical_id, "adapter": "openrouter_adapter"}
        models.append({"logical_id": logical_id, "display_name": logical_id, "family": logical_id.split("/", 1)[0], "aliases": [], "lifecycle": "discovered", "roles": [], "seats": [], "routes": [route], "preferred_route_id": route["route_id"]})
    return {"version": "2026.07.11", "models": models, "production_roster": list(_PRODUCTION), "compact_roster": list(_PRODUCTION[:5]), "chairman_logical_id": _PRODUCTION[1]}


def load_registry() -> RegistrySnapshot:
    return RegistrySnapshot.from_dict(_raw_registry())


def resolve_alias(registry: RegistrySnapshot, alias: str) -> str:
    try:
        return next(model.logical_id for model in registry.models if alias in model.aliases)
    except StopIteration as exc:
        raise KeyError(alias) from exc


def derive_projections(registry: RegistrySnapshot) -> dict[str, RegistryProjection]:
    ids = tuple(model.logical_id for model in registry.models)
    return {surface: RegistryProjection(surface, registry.version, registry.digest, ids) for surface in ("backend", "api", "frontend", "mcp", "benchmark")}


def validate_projection_drift(registry: RegistrySnapshot, projections: Mapping[str, RegistryProjection]) -> None:
    expected = {"backend", "api", "frontend", "mcp", "benchmark"}
    expected_ids = tuple(model.logical_id for model in registry.models)
    if set(projections) != expected or any(
        key != item.surface
        or item.registry_version != registry.version
        or item.registry_digest != registry.digest
        or item.logical_ids != expected_ids
        for key, item in projections.items()
    ):
        raise ValueError("registry projection digest drift")
