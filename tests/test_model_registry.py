"""Contract tests for the canonical, provider-neutral model registry."""

import json
import os
import subprocess
import sys
from dataclasses import FrozenInstanceError, is_dataclass
from pathlib import Path

import pytest

from backend.model_registry import (
    RegistrySnapshot,
    derive_projections,
    load_registry,
    resolve_alias,
    validate_projection_drift,
)

FROZEN_PRODUCTION = (
    "openai/gpt-5.5",
    "anthropic/claude-fable-5",
    "fireworks/glm-5.2",
    "google/gemini-3.1-pro-preview",
    "x-ai/grok-4.3",
    "fireworks/kimi-k2.7-code",
    "deepseek/deepseek-v4-pro",
    "meta-llama/llama-4-maverick",
    "qwen/qwen3.7-max",
)

CHALLENGERS = {
    "openai/gpt-5.6-sol",
    "openai/gpt-5.6-terra",
    "openai/gpt-5.6-luna",
    "anthropic/claude-sonnet-5",
    "anthropic/claude-opus-4.8",
    "google/gemini-3.5-flash",
    "x-ai/grok-4.5",
    "deepseek/deepseek-v4-flash",
    "minimax/minimax-m3",
    "mistralai/mistral-large-3",
}


def test_registry_import_is_side_effect_free_and_deterministic(tmp_path):
    """Import/load must need no credentials, network, cache, or writable project cwd."""
    script = f"""
import sys
sys.path.insert(0, {str(Path(__file__).parents[1])!r})
import json
from backend.model_registry import load_registry
first = load_registry()
second = load_registry()
print(json.dumps({{"digest": first.digest, "same": first == second}}))
"""
    env = {
        "PATH": os.environ["PATH"],
        "HOME": str(tmp_path / "credential-free-home"),
    }
    result = subprocess.run(
        [sys.executable, "-I", "-c", script],
        cwd=tmp_path,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )

    assert json.loads(result.stdout) == {
        "digest": load_registry().digest,
        "same": True,
    }
    assert list(tmp_path.iterdir()) == []


def test_registry_is_typed_and_deeply_frozen():
    registry = load_registry()

    assert isinstance(registry, RegistrySnapshot)
    assert is_dataclass(registry)
    assert isinstance(registry.models, tuple)
    assert all(is_dataclass(model) for model in registry.models)
    assert all(isinstance(model.routes, tuple) for model in registry.models)
    with pytest.raises((FrozenInstanceError, AttributeError, TypeError)):
        registry.models[0].logical_id = "changed"  # type: ignore[misc]


def test_frozen_nine_and_five_rosters_and_fable_chair():
    registry = load_registry()

    assert registry.production_roster == FROZEN_PRODUCTION
    assert registry.compact_roster == FROZEN_PRODUCTION[:5]
    assert registry.chairman_logical_id == "anthropic/claude-fable-5"
    assert all(registry.model(model_id).lifecycle == "production" for model_id in FROZEN_PRODUCTION)
    assert CHALLENGERS.isdisjoint(registry.production_roster)
    assert CHALLENGERS.isdisjoint(registry.compact_roster)


def test_challenger_records_are_explicit_and_not_roster_members():
    registry = load_registry()
    by_id = {model.logical_id: model for model in registry.models}

    assert by_id.keys() >= CHALLENGERS
    for logical_id in CHALLENGERS:
        candidate = by_id[logical_id]
        assert candidate.lifecycle != "production"
        assert candidate.roles == ()
        assert candidate.seats == ()
        assert candidate.routes


def test_logical_identity_is_stable_when_preferred_route_changes():
    registry = load_registry()
    fable = registry.model("anthropic/claude-fable-5")

    assert fable.logical_id == "anthropic/claude-fable-5"
    assert len(fable.routes) >= 2
    assert len({route.route_id for route in fable.routes}) == len(fable.routes)
    assert any(route.provider_model_id != route.route_id for route in fable.routes)
    changed = registry.with_preferred_route(fable.logical_id, fable.routes[-1].route_id)
    assert changed.model(fable.logical_id).logical_id == fable.logical_id
    assert changed.model(fable.logical_id).preferred_route_id == fable.routes[-1].route_id


def test_aliases_roles_lifecycle_and_routes_are_separate_namespaces():
    registry = load_registry()
    fable = registry.model("anthropic/claude-fable-5")

    assert resolve_alias(registry, "fable") == fable.logical_id
    assert "chairman" in fable.roles
    assert fable.lifecycle == "production"
    assert "fable" not in fable.roles
    assert all(route.route_id != fable.logical_id for route in fable.routes)


def test_all_runtime_projections_share_registry_digest_and_detect_drift():
    registry = load_registry()
    projections = derive_projections(registry)

    assert set(projections) == {"backend", "api", "frontend", "mcp", "benchmark"}
    assert {projection.registry_digest for projection in projections.values()} == {
        registry.digest
    }
    validate_projection_drift(registry, projections)

    drifted = dict(projections)
    drifted["frontend"] = drifted["frontend"].with_digest("stale-digest")
    with pytest.raises(ValueError, match="digest|drift"):
        validate_projection_drift(registry, drifted)


def test_projection_validation_recomputes_content_instead_of_trusting_digest():
    registry = load_registry()
    projections = derive_projections(registry)
    tampered = dict(projections)
    frontend = tampered["frontend"]
    tampered["frontend"] = type(frontend)(
        surface=frontend.surface,
        registry_version=frontend.registry_version,
        registry_digest=registry.digest,
        logical_ids=frontend.logical_ids[:-1],
    )

    with pytest.raises(ValueError, match="projection|drift"):
        validate_projection_drift(registry, tampered)


@pytest.mark.parametrize("duplicate_kind", ["alias", "route_id", "logical_id"])
def test_registry_validation_rejects_duplicate_identifiers(duplicate_kind):
    raw = load_registry().to_dict()
    if duplicate_kind == "logical_id":
        raw["models"][1]["logical_id"] = raw["models"][0]["logical_id"]
    elif duplicate_kind == "alias":
        raw["models"][1]["aliases"] = [raw["models"][0]["aliases"][0]]
    else:
        raw["models"][1]["routes"][0]["route_id"] = raw["models"][0]["routes"][0]["route_id"]

    with pytest.raises(ValueError, match=duplicate_kind):
        RegistrySnapshot.from_dict(raw)


def test_frozen_routes_use_provider_exact_model_ids_and_ordered_fallbacks():
    registry = load_registry()
    expected = {
        "openai/gpt-5.5": ("openrouter", "openai/gpt-5.5"),
        "anthropic/claude-fable-5": ("vertex", "claude-fable-5"),
        "fireworks/glm-5.2": ("fireworks", "accounts/fireworks/models/glm-5p2"),
        "google/gemini-3.1-pro-preview": ("openrouter", "google/gemini-3.1-pro-preview"),
        "x-ai/grok-4.3": ("xai", "grok-4.3"),
        "fireworks/kimi-k2.7-code": ("fireworks", "accounts/fireworks/models/kimi-k2p7-code"),
        "deepseek/deepseek-v4-pro": ("openrouter", "deepseek/deepseek-v4-pro"),
        "meta-llama/llama-4-maverick": ("openrouter", "meta-llama/llama-4-maverick"),
        "qwen/qwen3.7-max": ("openrouter", "qwen/qwen3.7-max"),
    }
    for logical_id, (provider, provider_id) in expected.items():
        route = registry.model(logical_id).preferred_route
        assert (route.provider, route.provider_model_id) == (provider, provider_id)
    assert tuple(route.provider for route in registry.model("anthropic/claude-fable-5").routes) == ("vertex", "openrouter")


@pytest.mark.parametrize("mutation", ["unknown_roster", "bad_chairman", "bad_seat", "bad_role"])
def test_registry_rejects_broken_cross_record_invariants(mutation):
    raw = load_registry().to_dict()
    if mutation == "unknown_roster":
        raw["production_roster"][0] = "missing/model"
    elif mutation == "bad_chairman":
        raw["chairman_logical_id"] = raw["production_roster"][0]
    elif mutation == "bad_seat":
        raw["models"][1]["seats"] = [1]
    else:
        raw["models"][1]["roles"].remove("chairman")
    raw.pop("digest")
    with pytest.raises(ValueError):
        RegistrySnapshot.from_dict(raw)
