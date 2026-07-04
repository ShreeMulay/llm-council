"""Security tests for async council webhooks."""

import json

import pytest

from backend.webhooks import CouncilAsyncRequest, JobStatus, create_job, run_council_async


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/webhook",
        "http://127.0.0.1/webhook",
        "http://10.0.0.1/webhook",
        "http://192.168.1.10/webhook",
        "http://100.64.0.1/webhook",
        "http://169.254.169.254/latest/meta-data",
        "http://[fd00::1]/webhook",
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
    assert persisted["webhook_secret_configured"] is True
    assert "super-secret-value" not in json.dumps(persisted)


@pytest.mark.asyncio
async def test_reloaded_secret_backed_job_does_not_send_unsigned_webhook(tmp_path, monkeypatch):
    job_id = "12345678-1234-4234-9234-123456789abc"
    monkeypatch.setattr("backend.webhooks.JOBS_DIR", tmp_path)
    monkeypatch.setattr(
        "backend.webhooks._jobs",
        {
            job_id: {
                "job_id": job_id,
                "status": JobStatus.PENDING,
                "query": "test",
                "webhook_url": "https://example.com/webhook",
                "webhook_secret_configured": True,
                "final_only": False,
                "models": None,
                "chairman": None,
                "include_details": True,
                "metadata": None,
                "created_at": "2026-07-04T00:00:00Z",
                "started_at": None,
                "completed_at": None,
                "error": None,
                "result": None,
            }
        },
    )

    async def fake_handler(**_kwargs):
        return {"stage1": {"model": "ok"}}

    async def fail_if_called(*_args, **_kwargs):
        raise AssertionError("send_webhook should not be called without original secret")

    monkeypatch.setattr("backend.webhooks.send_webhook", fail_if_called)

    await run_council_async(job_id, fake_handler)

    from backend import webhooks

    assert webhooks._jobs[job_id]["status"] == JobStatus.WEBHOOK_FAILED
    assert "refusing to send unsigned webhook" in webhooks._jobs[job_id]["error"]


@pytest.mark.asyncio
async def test_reloaded_secret_backed_failed_job_preserves_original_error(tmp_path, monkeypatch):
    job_id = "12345678-1234-4234-9234-123456789abd"
    monkeypatch.setattr("backend.webhooks.JOBS_DIR", tmp_path)
    monkeypatch.setattr(
        "backend.webhooks._jobs",
        {
            job_id: {
                "job_id": job_id,
                "status": JobStatus.PENDING,
                "query": "test",
                "webhook_url": "https://example.com/webhook",
                "webhook_secret_configured": True,
                "final_only": False,
                "models": None,
                "chairman": None,
                "include_details": True,
                "metadata": None,
                "created_at": "2026-07-04T00:00:00Z",
                "started_at": None,
                "completed_at": None,
                "error": None,
                "result": None,
            }
        },
    )

    async def failing_handler(**_kwargs):
        raise RuntimeError("model failed before webhook")

    async def fail_if_called(*_args, **_kwargs):
        raise AssertionError("send_webhook should not be called without original secret")

    monkeypatch.setattr("backend.webhooks.send_webhook", fail_if_called)

    await run_council_async(job_id, failing_handler)

    from backend import webhooks

    assert webhooks._jobs[job_id]["status"] == JobStatus.FAILED
    assert webhooks._jobs[job_id]["error"] == "model failed before webhook"
