#!/usr/bin/env python3
"""Verify deployed /health strict Vertex Anthropic configuration.

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
from typing import Any

EXPECTED_VERTEX_PROJECT_ID = "shree-development"
EXPECTED_VERTEX_LOCATION = "global"
EXPECTED_VERTEX_REQUIRED = True
FABLE_MODEL_ID = "anthropic/claude-fable-5"


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


def verify_health_payload(payload: dict[str, Any]) -> None:
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
    if not isinstance(council_models, list) or FABLE_MODEL_ID not in council_models:
        raise HealthVerificationError("council model list must include Claude Fable 5")

    vertex_models = config.get("vertex_anthropic_models")
    if not isinstance(vertex_models, list) or FABLE_MODEL_ID not in vertex_models:
        raise HealthVerificationError("Vertex Anthropic model list must include Claude Fable 5")


def verify_deploy_health(
    url: str,
    fetcher: Callable[[str], dict[str, Any]] = fetch_health_json,
) -> None:
    """Fetch and verify deploy health JSON."""
    payload = fetcher(url)
    verify_health_payload(payload)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify deployed strict Vertex health config")
    parser.add_argument("url", help="Cloud Run service URL or full /health URL")
    args = parser.parse_args(argv)

    try:
        verify_deploy_health(args.url)
    except HealthVerificationError as exc:
        print(f"FAIL: deploy health verification failed: {exc}", file=sys.stderr)
        return 1

    print("SUCCESS: deploy health verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
