#!/usr/bin/env python3
"""Verify the deployed /health roster, roles, and strict Vertex configuration.

This script intentionally logs only configuration pass/fail details. It does not
send or log prompts, model responses, API keys, or secret values.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from collections.abc import Callable
from pathlib import Path
from typing import Any

EXPECTED_VERTEX_PROJECT_ID = "shree-development"
EXPECTED_VERTEX_LOCATION = "global"
EXPECTED_VERTEX_REQUIRED = True
FABLE_MODEL_ID = "anthropic/claude-fable-5"
EXPECTED_COUNCIL_MODELS = (
    "openai/gpt-5.6-sol",
    FABLE_MODEL_ID,
    "fireworks/glm-5.2",
    "google/gemini-3.1-pro-preview",
    "x-ai/grok-4.5",
    "fireworks/kimi-k2.7-code",
    "deepseek/deepseek-v4-pro",
    "meta-llama/llama-4-maverick",
    "qwen/qwen3.7-max",
)
EXPECTED_COMPACT_MODELS = EXPECTED_COUNCIL_MODELS[:5]
EXPECTED_EVALUATOR_MODELS = (
    FABLE_MODEL_ID,
    "deepseek/deepseek-v4-pro",
    "openai/gpt-5.6-sol",
)
EXPECTED_CHAIRMAN_MODEL = FABLE_MODEL_ID
EXPECTED_PRODUCTION_ROUTE_IDS = (
    "openrouter:openai/gpt-5.6-sol",
    "vertex:anthropic/claude-fable-5",
    "fireworks:fireworks/glm-5.2",
    "openrouter:google/gemini-3.1-pro-preview",
    "xai:x-ai/grok-4.5",
    "fireworks:fireworks/kimi-k2.7-code",
    "openrouter:deepseek/deepseek-v4-pro",
    "openrouter:meta-llama/llama-4-maverick",
    "openrouter:qwen/qwen3.7-max",
)
# Reviewed deployment artifact identities. Registry changes require an explicit
# update here rather than allowing a deployment to trust self-reported digests.
EXPECTED_REGISTRY_DIGEST = "eaeb59a2a69d7781e5e699b9649afdf27968a03f1834187a302cb77c07634783"
EXPECTED_PROJECTION_DIGESTS = {
    "backend": "efd97ffbf5fb35805363f475cb121d4d0e2060050ec726e580540903343b9ac7",
    "frontend": "84d1e0965db5154088fcee4d46c697f50346d6c85ea652b9c229b3fa936b38d7",
    "mcp": "9c03309c7f1f7d641826a2178594389c49f8aa980ab1c071a86f60aceafa1467",
}


class HealthVerificationError(ValueError):
    """Raised when deployed health config does not meet production requirements."""


def normalize_health_url(url: str) -> str:
    """Return a /health URL from either a service base URL or health URL."""
    stripped = url.strip().rstrip("/")
    if not stripped:
        raise HealthVerificationError("health URL is required")
    if stripped.endswith("/health"):
        return stripped
    return f"{stripped}/health"


def fetch_health_json(url: str, timeout_seconds: float = 20.0) -> dict[str, Any]:
    """Fetch health JSON from a deployed service."""
    health_url = normalize_health_url(url)
    request = urllib.request.Request(health_url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            status = response.status
            body = response.read()
    except urllib.error.HTTPError as exc:
        raise HealthVerificationError(f"health endpoint returned HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise HealthVerificationError(f"health endpoint request failed: {exc.reason}") from exc

    if status != 200:
        raise HealthVerificationError(f"health endpoint returned HTTP {status}")

    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HealthVerificationError("health endpoint returned invalid JSON") from exc

    if not isinstance(payload, dict):
        raise HealthVerificationError("health endpoint JSON must be an object")
    return payload


def _get_config_string(config: dict[str, Any], *field_names: str) -> str | None:
    for field_name in field_names:
        value = config.get(field_name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def verify_health_payload(
    payload: dict[str, Any],
    *,
    expected_revision: str | None = None,
    expected_image_digest: str | None = None,
) -> None:
    """Validate strict Vertex health config and model list from /health payload."""
    if payload.get("status") != "healthy":
        raise HealthVerificationError("health status is not healthy")

    config = payload.get("config")
    if not isinstance(config, dict):
        raise HealthVerificationError("health config is missing or invalid")

    require_vertex = config.get("require_vertex_anthropic")
    if require_vertex is not EXPECTED_VERTEX_REQUIRED:
        raise HealthVerificationError("require_vertex_anthropic must be true")

    vertex_project = _get_config_string(config, "vertex_project_id", "vertex_project")
    if vertex_project != EXPECTED_VERTEX_PROJECT_ID:
        raise HealthVerificationError(
            f"vertex project must be {EXPECTED_VERTEX_PROJECT_ID}; got {vertex_project or 'missing'}"
        )

    vertex_location = _get_config_string(config, "vertex_location")
    if vertex_location != EXPECTED_VERTEX_LOCATION:
        raise HealthVerificationError(
            f"vertex location must be {EXPECTED_VERTEX_LOCATION}; got {vertex_location or 'missing'}"
        )

    council_models = config.get("council_models")
    if council_models != list(EXPECTED_COUNCIL_MODELS):
        raise HealthVerificationError("council_models must match the exact nine-model production order")

    compact_models = config.get("compact_council_models")
    if compact_models != list(EXPECTED_COMPACT_MODELS):
        raise HealthVerificationError(
            "compact_council_models must match the exact compact model order"
        )

    evaluator_models = config.get("evaluator_models")
    if evaluator_models != list(EXPECTED_EVALUATOR_MODELS):
        raise HealthVerificationError("evaluator_models must match the exact evaluator model order")

    if config.get("chairman_model") != EXPECTED_CHAIRMAN_MODEL:
        raise HealthVerificationError(f"chairman model must be {EXPECTED_CHAIRMAN_MODEL}")

    if config.get("production_route_ids") != list(EXPECTED_PRODUCTION_ROUTE_IDS):
        raise HealthVerificationError("production route IDs must match the exact ordered contract")

    vertex_models = config.get("vertex_anthropic_models")
    if vertex_models != [FABLE_MODEL_ID]:
        raise HealthVerificationError(
            "Vertex Anthropic model list must contain only Claude Fable 5"
        )

    artifacts = payload.get("artifacts")
    if not isinstance(artifacts, dict):
        raise HealthVerificationError("artifact identity is missing or invalid")
    if artifacts.get("registry_digest") != EXPECTED_REGISTRY_DIGEST:
        raise HealthVerificationError("registry digest does not match the reviewed artifact")
    if artifacts.get("projection_digests") != EXPECTED_PROJECTION_DIGESTS:
        raise HealthVerificationError("projection digests do not match the reviewed artifacts")
    if expected_revision is not None and artifacts.get("application_revision") != expected_revision:
        raise HealthVerificationError("application revision does not match the deployed revision")
    if expected_image_digest is not None and artifacts.get("image_digest") != expected_image_digest:
        raise HealthVerificationError("image digest does not match the immutable deployed image")


def verify_deploy_health(
    url: str,
    fetcher: Callable[[str], dict[str, Any]] = fetch_health_json,
    *,
    expected_revision: str | None = None,
    expected_image_digest: str | None = None,
) -> None:
    """Fetch and verify deploy health JSON."""
    payload = fetcher(url)
    verify_health_payload(
        payload,
        expected_revision=expected_revision,
        expected_image_digest=expected_image_digest,
    )


def health_identity(payload: dict[str, Any]) -> dict[str, Any]:
    """Return only secret-free health/config/artifact identity fields."""
    if payload.get("status") != "healthy":
        raise HealthVerificationError("health status is not healthy")
    config, artifacts = payload.get("config"), payload.get("artifacts")
    if not isinstance(config, dict) or not isinstance(artifacts, dict):
        raise HealthVerificationError("health identity is missing")
    return {"status": "healthy", "config": config, "artifacts": artifacts}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Verify the deployed roster, role, and strict Vertex health contract"
    )
    parser.add_argument("url", help="Cloud Run service URL or full /health URL")
    parser.add_argument("--expected-revision")
    parser.add_argument("--expected-image-digest")
    parser.add_argument("--identity-out")
    parser.add_argument("--expected-identity")
    parser.add_argument("--identity-only", action="store_true")
    args = parser.parse_args(argv)

    try:
        payload = fetch_health_json(args.url)
        identity = health_identity(payload)
        if not args.identity_only:
            verify_health_payload(
                payload,
                expected_revision=args.expected_revision,
                expected_image_digest=args.expected_image_digest,
            )
        if args.expected_identity:
            expected = json.loads(Path(args.expected_identity).read_text(encoding="utf-8"))
            if identity != expected:
                raise HealthVerificationError("health/artifact identity does not match baseline")
        if args.identity_out:
            Path(args.identity_out).write_text(
                json.dumps(identity, sort_keys=True, separators=(",", ":")), encoding="utf-8"
            )
    except (HealthVerificationError, OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: deploy health verification failed: {exc}", file=sys.stderr)
        return 1

    print("SUCCESS: deploy health verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
