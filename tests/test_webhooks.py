"""Security tests for async council webhooks."""

import json

import pytest

from backend.webhooks import CouncilAsyncRequest, create_job


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/webhook",
        "http://127.0.0.1/webhook",
        "http://10.0.0.1/webhook",
        "http://192.168.1.10/webhook",
        "http://169.254.169.254/latest/meta-data",
    ],
)
def test_create_job_rejects_internal_webhook_urls_before_execution(url):
    request = CouncilAsyncRequest(query="test", webhook_url=url)

    with pytest.raises(ValueError, match="Webhook URL blocked"):
        create_job(request)


def test_create_job_does_not_persist_plaintext_webhook_secret(tmp_path, monkeypatch):
    monkeypatch.setattr("backend.webhooks.JOBS_DIR", tmp_path)
    monkeypatch.setattr("backend.webhooks._jobs", {})
    monkeypatch.setattr("backend.webhooks._validate_webhook_url", lambda url: None)

    request = CouncilAsyncRequest(
        query="test",
        webhook_url="https://example.com/webhook",
        webhook_secret="super-secret-value",
    )
    job_id = create_job(request)

    persisted = json.loads((tmp_path / f"{job_id}.json").read_text())
    assert "webhook_secret" not in persisted
    assert "super-secret-value" not in json.dumps(persisted)
