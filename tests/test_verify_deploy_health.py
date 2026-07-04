"""Tests for deploy health verification helper."""

import pytest

from scripts.verify_deploy_health import (
    EXPECTED_VERTEX_LOCATION,
    EXPECTED_VERTEX_PROJECT_ID,
    FABLE_MODEL_ID,
    HealthVerificationError,
    normalize_health_url,
    verify_deploy_health,
    verify_health_payload,
)


def valid_payload():
    return {
        "status": "healthy",
        "config": {
            "council_models": ["openai/gpt-5.5", FABLE_MODEL_ID],
            "vertex_anthropic_models": [FABLE_MODEL_ID],
            "vertex_project_id": EXPECTED_VERTEX_PROJECT_ID,
            "vertex_location": EXPECTED_VERTEX_LOCATION,
            "require_vertex_anthropic": True,
        },
    }


def test_normalize_health_url_appends_health():
    assert normalize_health_url("https://service.example.com") == "https://service.example.com/health"


def test_normalize_health_url_keeps_existing_health_path():
    assert normalize_health_url("https://service.example.com/health") == "https://service.example.com/health"


def test_verify_health_payload_accepts_strict_vertex_config():
    verify_health_payload(valid_payload())


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
