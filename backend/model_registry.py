"""Typed validation and deterministic projections for the canonical JSON registry."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections.abc import Mapping
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Any

REGISTRY_PATH = Path(__file__).parents[1] / "model_registry.json"
PROJECTION_PATHS = {
    "backend": Path("backend/generated/model-registry.json"),
    "frontend": Path("frontend/src/generated/model-registry.json"),
    "mcp": Path("mcp/src/generated/model-registry.json"),
}
VALID_ROLES = frozenset({"member", "evaluator", "chairman"})


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
    capabilities: tuple[str, ...]
    tier: str
    reasoning: Mapping[str, str]
    legacy: bool
    challenger: bool

    @property
    def preferred_route(self) -> ModelRoute:
        return next(route for route in self.routes if route.route_id == self.preferred_route_id)


@dataclass(frozen=True)
class RegistrySnapshot:
    schema_version: int
    version: str
    models: tuple[ModelRecord, ...]
    production_roster: tuple[str, ...]
    compact_roster: tuple[str, ...]
    chairman_logical_id: str
    evaluator_priority: tuple[str, ...]
    truncation_limits: Mapping[str, int]
    default_truncation_limit: int
    digest: str

    def model(self, logical_id: str) -> ModelRecord:
        for model in self.models:
            if model.logical_id == logical_id:
                return model
        raise KeyError(logical_id)

    def with_preferred_route(self, logical_id: str, route_id: str) -> RegistrySnapshot:
        model = self.model(logical_id)
        if route_id not in {route.route_id for route in model.routes}:
            raise ValueError(f"unknown route_id: {route_id}")
        return replace(self, models=tuple(replace(item, preferred_route_id=route_id) if item == model else item for item in self.models))

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "registry_version": self.version,
            "models": [_model_dict(model) for model in self.models],
            "defaults": {
                "production_roster": list(self.production_roster),
                "compact_roster": list(self.compact_roster),
                "chairman": self.chairman_logical_id,
                "evaluator_priority": list(self.evaluator_priority),
                "truncation_limits": dict(self.truncation_limits),
                "default_truncation_limit": self.default_truncation_limit,
            },
            "digest": self.digest,
            # Legacy keys retained for callers constructing validation mutations.
            "version": self.version,
            "production_roster": list(self.production_roster),
            "compact_roster": list(self.compact_roster),
            "chairman_logical_id": self.chairman_logical_id,
        }

    @classmethod
    def from_dict(cls, raw: Mapping[str, Any]) -> RegistrySnapshot:
        defaults = raw.get("defaults") or {
            "production_roster": raw["production_roster"], "compact_roster": raw["compact_roster"],
            "chairman": raw["chairman_logical_id"], "evaluator_priority": [],
            "truncation_limits": {"strong": 8000, "medium": 10000, "weak": 12000},
            "default_truncation_limit": 12000,
        }
        defaults = dict(defaults)
        if "production_roster" in raw:
            defaults["production_roster"] = raw["production_roster"]
        if "compact_roster" in raw:
            defaults["compact_roster"] = raw["compact_roster"]
        if "chairman_logical_id" in raw:
            defaults["chairman"] = raw["chairman_logical_id"]
        models = tuple(_model_from_dict(item) for item in raw["models"])
        version = str(raw.get("registry_version", raw.get("version")))
        canonical = {"schema_version": int(raw.get("schema_version", 1)), "registry_version": version,
                     "models": [_model_dict(model) for model in models], "defaults": defaults}
        digest = hashlib.sha256(json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        snapshot = cls(canonical["schema_version"], version, models,
                       tuple(defaults["production_roster"]), tuple(defaults["compact_roster"]),
                       str(defaults["chairman"]), tuple(defaults.get("evaluator_priority", ())),
                       defaults["truncation_limits"], int(defaults["default_truncation_limit"]), digest)
        _validate(snapshot)
        supplied = raw.get("digest")
        if supplied is not None and supplied != digest:
            raise ValueError("registry digest mismatch")
        return snapshot


def _model_dict(model: ModelRecord) -> dict[str, Any]:
    result = asdict(model)
    result["aliases"], result["roles"], result["seats"], result["capabilities"] = (
        list(model.aliases), list(model.roles), list(model.seats), list(model.capabilities))
    result["routes"] = [asdict(route) for route in model.routes]
    result["reasoning"] = dict(model.reasoning)
    return result


def _model_from_dict(raw: Mapping[str, Any]) -> ModelRecord:
    routes = tuple(ModelRoute(**route) for route in raw["routes"])
    return ModelRecord(str(raw["logical_id"]), str(raw["display_name"]), str(raw["family"]),
                       tuple(raw["aliases"]), str(raw["lifecycle"]), tuple(raw["roles"]),
                       tuple(raw["seats"]), routes, str(raw["preferred_route_id"]),
                       tuple(raw.get("capabilities", ("text",))), str(raw.get("tier", "weak")),
                       dict(raw.get("reasoning", {})), bool(raw.get("legacy", False)),
                       bool(raw.get("challenger", False)))


def _validate(registry: RegistrySnapshot) -> None:
    if registry.schema_version != 1:
        raise ValueError(f"unsupported registry schema_version: {registry.schema_version}")
    ids = [model.logical_id for model in registry.models]
    aliases = [alias for model in registry.models for alias in model.aliases]
    routes = [route.route_id for model in registry.models for route in model.routes]
    for kind, values in (("logical_id", ids), ("alias", aliases), ("route_id", routes)):
        if len(values) != len(set(values)):
            raise ValueError(f"duplicate {kind}")
    by_id = {model.logical_id: model for model in registry.models}
    referenced = (*registry.production_roster, *registry.compact_roster, registry.chairman_logical_id, *registry.evaluator_priority)
    if any(item not in by_id for item in referenced):
        raise ValueError("unknown model ID in role or roster reference")
    if len(set(registry.production_roster)) != len(registry.production_roster) or not set(registry.compact_roster) <= set(registry.production_roster):
        raise ValueError("production/compact roster contains duplicate or unknown model")
    for seat, logical_id in enumerate(registry.production_roster, 1):
        model = by_id[logical_id]
        if model.lifecycle != "production" or model.seats != (seat,) or "member" not in model.roles:
            raise ValueError("production lifecycle, role, and seat invariants violated")
    if "chairman" not in by_id[registry.chairman_logical_id].roles or any("evaluator" not in by_id[item].roles for item in registry.evaluator_priority):
        raise ValueError("invalid chairman/evaluator role reference")
    for model in registry.models:
        if not model.routes or model.preferred_route_id not in {route.route_id for route in model.routes}:
            raise ValueError(f"unknown preferred route_id: {model.preferred_route_id}")
        if not set(model.roles) <= VALID_ROLES:
            raise ValueError(f"invalid role for {model.logical_id}")


def load_registry(path: Path = REGISTRY_PATH) -> RegistrySnapshot:
    return RegistrySnapshot.from_dict(json.loads(path.read_text(encoding="utf-8")))


def resolve_alias(registry: RegistrySnapshot, alias: str) -> str:
    for model in registry.models:
        if alias in model.aliases:
            return model.logical_id
    raise KeyError(alias)


@dataclass(frozen=True)
class RegistryProjection:
    surface: str
    registry_version: str
    registry_digest: str
    logical_ids: tuple[str, ...]

    def with_digest(self, digest: str) -> RegistryProjection:
        return replace(self, registry_digest=digest)

    def to_dict(self) -> dict[str, Any]:
        return projection_dict(load_registry(), self.surface)


def projection_dict(registry: RegistrySnapshot, surface: str) -> dict[str, Any]:
    return {"schema_version": registry.schema_version, "registry_version": registry.version,
            "registry_digest": registry.digest, "surface": surface,
            "default_roster": list(registry.production_roster), "compact_roster": list(registry.compact_roster),
            "eligible_roster": [m.logical_id for m in registry.models],
            "experimental_roster": [m.logical_id for m in registry.models if m.lifecycle != "production"],
            "chairman": registry.chairman_logical_id, "evaluator_priority": list(registry.evaluator_priority),
            "models": [{"id": m.logical_id, "provider": m.preferred_route.provider,
                        "provider_model_id": m.preferred_route.provider_model_id, "aliases": list(m.aliases),
                        "label": m.display_name, "family": m.family, "capabilities": list(m.capabilities),
                        "lifecycle": m.lifecycle, "roles": list(m.roles), "tier": m.tier,
                        "reasoning": dict(m.reasoning), "legacy": m.legacy, "challenger": m.challenger,
                        "role_eligible": {role: role in m.roles for role in sorted(VALID_ROLES)}} for m in registry.models]}


def derive_projections(registry: RegistrySnapshot) -> dict[str, RegistryProjection]:
    ids = tuple(model.logical_id for model in registry.models)
    return {surface: RegistryProjection(surface, registry.version, registry.digest, ids) for surface in ("backend", "api", "frontend", "mcp", "benchmark")}


def validate_projection_drift(registry: RegistrySnapshot, projections: Mapping[str, RegistryProjection]) -> None:
    expected = set(derive_projections(registry))
    if set(projections) != expected or any(item != derive_projections(registry)[key] for key, item in projections.items()):
        raise ValueError("registry projection digest drift")


def write_generated_projections(root: Path | str = Path(".")) -> tuple[Path, ...]:
    root, registry = Path(root), load_registry()
    written = []
    for surface, relative in PROJECTION_PATHS.items():
        target = root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(projection_dict(registry, surface), indent=2, sort_keys=True) + "\n", encoding="utf-8")
        written.append(target)
    return tuple(written)


def check_generated_projections(root: Path | str = Path(".")) -> None:
    import tempfile
    with tempfile.TemporaryDirectory() as directory:
        generated = write_generated_projections(directory)
        for candidate in generated:
            relative = candidate.relative_to(directory)
            committed = Path(root) / relative
            if not committed.exists() or committed.read_bytes() != candidate.read_bytes():
                raise ValueError(f"stale generated registry projection: {relative}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    check_generated_projections() if args.check else write_generated_projections()
