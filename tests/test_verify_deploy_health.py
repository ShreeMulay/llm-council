"""Tests for deploy health verification helper."""

import asyncio
import json

import pytest

from scripts.verify_deploy_health import (
    EXPECTED_CHAIRMAN_MODEL,
    EXPECTED_COMPACT_MODELS,
    EXPECTED_COUNCIL_MODELS,
    EXPECTED_EVALUATOR_MODELS,
    EXPECTED_PRODUCTION_ROUTE_IDS,
    EXPECTED_PROJECTION_DIGESTS,
    EXPECTED_REGISTRY_DIGEST,
    EXPECTED_VERTEX_LOCATION,
    EXPECTED_VERTEX_PROJECT_ID,
    FABLE_MODEL_ID,
    HealthVerificationError,
    health_identity,
    main,
    normalize_health_url,
    verify_deploy_health,
    verify_health_payload,
)


def valid_payload():
    return {
        "status": "healthy",
        "config": {
            "council_models": list(EXPECTED_COUNCIL_MODELS),
            "compact_council_models": list(EXPECTED_COMPACT_MODELS),
            "evaluator_models": list(EXPECTED_EVALUATOR_MODELS),
            "chairman_model": EXPECTED_CHAIRMAN_MODEL,
            "vertex_anthropic_models": [FABLE_MODEL_ID],
            "vertex_project_id": EXPECTED_VERTEX_PROJECT_ID,
            "vertex_location": EXPECTED_VERTEX_LOCATION,
            "require_vertex_anthropic": True,
            "production_route_ids": list(EXPECTED_PRODUCTION_ROUTE_IDS),
        },
        "artifacts": {
            "registry_digest": EXPECTED_REGISTRY_DIGEST,
            "projection_digests": dict(EXPECTED_PROJECTION_DIGESTS),
            "application_revision": "revision-123",
            "image_digest": "sha256:" + "a" * 64,
        },
    }


def test_normalize_health_url_appends_health():
    assert normalize_health_url("https://service.example.com") == "https://service.example.com/health"


def test_normalize_health_url_keeps_existing_health_path():
    assert normalize_health_url("https://service.example.com/health") == "https://service.example.com/health"


def test_verify_health_payload_accepts_strict_vertex_config():
    verify_health_payload(valid_payload())


def test_real_health_payload_passes_semantic_verifier(monkeypatch):
    import backend.main as main

    monkeypatch.setenv("DEPLOY_REVISION", "revision-123")
    monkeypatch.setenv("APP_IMAGE_DIGEST", "sha256:" + "a" * 64)
    monkeypatch.setattr(main, "REQUIRE_VERTEX_ANTHROPIC", True)
    monkeypatch.setattr(main, "VERTEX_PROJECT_ID", EXPECTED_VERTEX_PROJECT_ID)
    monkeypatch.setattr(main, "VERTEX_LOCATION", EXPECTED_VERTEX_LOCATION)

    payload = asyncio.run(main.health())

    verify_health_payload(
        payload,
        expected_revision="revision-123",
        expected_image_digest="sha256:" + "a" * 64,
    )


def test_health_digests_packaged_projection_files(monkeypatch, tmp_path):
    import backend.main as main

    projection = tmp_path / "frontend-projection.json"
    projection.write_text(json.dumps({"packaged": "artifact"}), encoding="utf-8")
    monkeypatch.setitem(main.PROJECTION_PATHS, "frontend", projection)

    payload = asyncio.run(main.health())

    assert (
        payload["artifacts"]["projection_digests"]["frontend"]
        != EXPECTED_PROJECTION_DIGESTS["frontend"]
    )


@pytest.mark.parametrize(
    ("path", "value", "message"),
    [
        (("config", "production_route_ids"), [], "production route IDs"),
        (("artifacts", "registry_digest"), "0" * 64, "registry digest"),
        (("artifacts", "projection_digests"), {}, "projection digests"),
    ],
)
def test_verify_health_payload_rejects_route_or_artifact_drift(path, value, message):
    payload = valid_payload()
    payload[path[0]][path[1]] = value

    with pytest.raises(HealthVerificationError, match=message):
        verify_health_payload(payload)


def test_verify_health_payload_checks_deployed_identity_when_requested():
    payload = valid_payload()

    with pytest.raises(HealthVerificationError, match="application revision"):
        verify_health_payload(payload, expected_revision="different")
    with pytest.raises(HealthVerificationError, match="image digest"):
        verify_health_payload(payload, expected_image_digest="sha256:" + "b" * 64)


@pytest.mark.parametrize(
    ("field_name", "field_value", "message"),
    [
        ("council_models", [], "exact nine-model production order"),
        ("compact_council_models", [], "exact compact model order"),
        ("evaluator_models", [], "exact evaluator model order"),
        ("chairman_model", "openai/gpt-5.6-sol", "chairman model must be"),
    ],
)
def test_verify_health_payload_rejects_wrong_roster_contract(
    field_name: str,
    field_value: object,
    message: str,
):
    payload = valid_payload()
    payload["config"][field_name] = field_value

    with pytest.raises(HealthVerificationError, match=message):
        verify_health_payload(payload)


def test_verify_health_payload_rejects_old_gpt_and_grok_roster():
    payload = valid_payload()
    payload["config"]["council_models"][0] = "openai/gpt-5.5"
    payload["config"]["council_models"][4] = "x-ai/grok-4.3"

    with pytest.raises(HealthVerificationError, match="exact nine-model production order"):
        verify_health_payload(payload)


def test_verify_health_payload_rejects_promoted_models_in_wrong_order():
    payload = valid_payload()
    council_models = payload["config"]["council_models"]
    council_models[0], council_models[4] = council_models[4], council_models[0]

    with pytest.raises(HealthVerificationError, match="exact nine-model production order"):
        verify_health_payload(payload)


@pytest.mark.parametrize(
    ("field_name", "field_value", "message"),
    [
        ("require_vertex_anthropic", False, "require_vertex_anthropic must be true"),
        ("vertex_project_id", "wrong-project", "vertex project must be shree-development"),
        ("vertex_location", "us-central1", "vertex location must be global"),
    ],
)
def test_verify_health_payload_rejects_non_strict_vertex_config(
    field_name: str,
    field_value: object,
    message: str,
):
    payload = valid_payload()
    payload["config"][field_name] = field_value

    with pytest.raises(HealthVerificationError, match=message):
        verify_health_payload(payload)


def test_verify_health_payload_rejects_missing_vertex_project():
    payload = valid_payload()
    del payload["config"]["vertex_project_id"]

    with pytest.raises(HealthVerificationError, match="vertex project must be shree-development"):
        verify_health_payload(payload)


def test_verify_health_payload_rejects_missing_fable_from_model_lists():
    payload = valid_payload()
    payload["config"]["vertex_anthropic_models"] = []

    with pytest.raises(HealthVerificationError, match="Vertex Anthropic model list"):
        verify_health_payload(payload)


def test_verify_deploy_health_uses_injected_fetcher_without_network():
    requested_urls = []

    def fetcher(url: str):
        requested_urls.append(url)
        return valid_payload()

    verify_deploy_health("https://service.example.com", fetcher=fetcher)

    assert requested_urls == ["https://service.example.com"]


def test_legacy_identity_allowance_accepts_only_completely_absent_artifacts():
    payload = {"status": "healthy", "config": {"council_models": ["legacy"]}}

    assert health_identity(
        payload, allow_legacy_identity_without_artifacts=True
    ) == payload
    with pytest.raises(HealthVerificationError, match="identity"):
        health_identity(payload)

    for artifacts in (None, {}, {"application_revision": "partial"}):
        invalid = {**payload, "artifacts": artifacts}
        with pytest.raises(HealthVerificationError, match="identity"):
            health_identity(invalid, allow_legacy_identity_without_artifacts=True)


def test_legacy_identity_flag_is_valid_only_for_identity_capture(monkeypatch, tmp_path):
    monkeypatch.setattr(
        "scripts.verify_deploy_health.fetch_health_json",
        lambda _url: {"status": "healthy", "config": {}},
    )

    assert main(["https://service", "--allow-legacy-identity-without-artifacts"]) == 1
    assert main([
        "https://service", "--identity-only",
        "--allow-legacy-identity-without-artifacts",
        "--identity-out", str(tmp_path / "identity.json"),
    ]) == 0


@pytest.mark.parametrize(
    "arguments",
    [
        ["--identity-only"],
        ["--identity-only", "--identity-out", "capture.json", "--expected-identity", "prior.json"],
        ["--identity-out", "capture.json", "--expected-identity", "prior.json"],
        ["--identity-only", "--identity-out", "capture.json", "--expected-revision", "revision"],
        [
            "--identity-only", "--expected-identity", "prior.json",
            "--expected-image-digest", "sha256:digest",
        ],
        ["--identity-only", "--allow-legacy-identity-without-artifacts"],
    ],
)
def test_identity_only_rejects_missing_conflicting_or_ignored_actions(arguments, monkeypatch):
    def unexpected_fetch(_url):
        raise AssertionError("invalid identity-only invocation must fail before network access")

    monkeypatch.setattr("scripts.verify_deploy_health.fetch_health_json", unexpected_fetch)

    assert main(["https://service", *arguments]) == 1
