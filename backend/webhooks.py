"""Webhook callback support for async council deliberations."""

import asyncio
import ipaddress
import logging
import socket
import time
import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Any
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel, HttpUrl

logger = logging.getLogger("llm-council.webhooks")

_BLOCKED_IP_NETWORKS = tuple(
    ipaddress.ip_network(network)
    for network in (
        "100.64.0.0/10",  # CGNAT, including Tailscale defaults
        "fc00::/7",  # IPv6 Unique Local Address space
    )
)


def _utc_now_iso() -> str:
    """Return a timezone-aware UTC timestamp using the existing trailing-Z format."""
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


class JobStatus(str, Enum):
    """Status of an async council job."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    WEBHOOK_SENT = "webhook_sent"
    WEBHOOK_FAILED = "webhook_failed"


class CouncilAsyncRequest(BaseModel):
    """Request for async council deliberation with webhook callback."""

    query: str
    webhook_url: HttpUrl
    webhook_secret: str | None = None  # Optional HMAC signing secret
    final_only: bool = False
    models: list[str] | None = None
    chairman: str | None = None
    include_details: bool = True
    metadata: dict[str, Any] | None = None  # Pass-through metadata for webhook
    parallel_mode: str = "disabled"
    parallel_classifier_score: float | None = None


class JobInfo(BaseModel):
    """Information about an async council job."""

    job_id: str
    status: JobStatus
    query: str
    webhook_url: str
    created_at: str
    started_at: str | None = None
    completed_at: str | None = None
    error: str | None = None
    result_summary: str | None = None


def _validate_webhook_url(url: str) -> None:
    """Validate webhook URL is safe (not targeting private/internal networks).

    Raises ValueError if the URL resolves to a private, loopback, or
    link-local IP address (SSRF prevention).
    """
    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        raise ValueError(f"Invalid webhook URL: no hostname in {url!r}")

    # Block common internal hostnames
    blocked_hostnames = {"localhost", "metadata.google.internal", "169.254.169.254"}
    if hostname.lower() in blocked_hostnames:
        raise ValueError(f"Webhook URL blocked: {hostname!r} is an internal hostname")

    # Resolve hostname and check all IPs
    try:
        addrs = socket.getaddrinfo(
            hostname, parsed.port or 443, proto=socket.IPPROTO_TCP
        )
    except socket.gaierror as e:
        raise ValueError(f"Cannot resolve webhook hostname {hostname!r}: {e}") from e

    for _family, _, _, _, sockaddr in addrs:
        ip = ipaddress.ip_address(sockaddr[0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or any(ip in network for network in _BLOCKED_IP_NETWORKS)
        ):
            raise ValueError(
                f"Webhook URL blocked: {hostname!r} resolves to private/internal IP {ip}"
            )


# ============================================================================
# Disk-persistent job store — survives process restarts and Cloud Run cold starts.
# In-memory cache (_jobs) is a write-through cache; disk is source of truth.
# ============================================================================

import contextlib
import json as _json
import os as _os
import re as _re
import tempfile as _tempfile

from .config import JOBS_DIR

# Valid job ID: UUID format only
_VALID_JOB_ID_RE = _re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", _re.IGNORECASE
)

# In-memory write-through cache
_jobs: dict[str, dict[str, Any]] = {}


def _job_path(job_id: str) -> str:
    """Get the file path for a job. Validates ID format."""
    if not _VALID_JOB_ID_RE.match(job_id):
        raise ValueError(f"Invalid job ID format: {job_id!r}")
    return str(JOBS_DIR / f"{job_id}.json")


def _save_job(job: dict[str, Any]) -> None:
    """Persist a job to disk (atomic write)."""
    path = _job_path(job["job_id"])
    dir_path = _os.path.dirname(path)
    # Exclude large 'result' from disk and never persist plaintext webhook secrets.
    persist = {k: v for k, v in job.items() if k not in {"result", "webhook_secret"}}
    fd, tmp = _tempfile.mkstemp(dir=dir_path, suffix=".tmp")
    try:
        with _os.fdopen(fd, "w") as f:
            _json.dump(persist, f, indent=2, default=str)
        _os.replace(tmp, path)
    except BaseException:
        with contextlib.suppress(OSError):
            _os.unlink(tmp)
        raise


def _load_job(job_id: str) -> dict[str, Any] | None:
    """Load a job from disk."""
    path = _job_path(job_id)
    if not _os.path.exists(path):
        return None
    with open(path) as f:
        return _json.load(f)


def _load_all_jobs() -> dict[str, dict[str, Any]]:
    """Load all jobs from disk into memory (called once at startup)."""
    jobs = {}
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    for filename in _os.listdir(JOBS_DIR):
        if filename.endswith(".json"):
            path = str(JOBS_DIR / filename)
            try:
                with open(path) as f:
                    job = _json.load(f)
                    jobs[job["job_id"]] = job
            except Exception as e:
                logger.warning("Failed to load job %s: %s", filename, e)
    return jobs


# Load existing jobs from disk on module import
_jobs = _load_all_jobs()
logger.info("Loaded %d persisted jobs from disk", len(_jobs))


def create_job(request: CouncilAsyncRequest) -> str:
    """Create a new async job and return its ID. Persisted to disk."""
    _validate_webhook_url(str(request.webhook_url))
    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "status": JobStatus.PENDING,
        "query": request.query,
        "webhook_url": str(request.webhook_url),
        "webhook_secret": request.webhook_secret,
        "webhook_secret_configured": bool(request.webhook_secret),
        "final_only": request.final_only,
        "models": request.models,
        "chairman": request.chairman,
        "include_details": request.include_details,
        "metadata": request.metadata,
        "parallel_mode": request.parallel_mode,
        "parallel_classifier_score": request.parallel_classifier_score,
        "created_at": _utc_now_iso(),
        "started_at": None,
        "completed_at": None,
        "error": None,
        "result": None,
    }
    _jobs[job_id] = job
    _save_job(job)
    return job_id


def get_job(job_id: str) -> dict[str, Any] | None:
    """Get job information by ID (from memory cache, falls back to disk)."""
    job = _jobs.get(job_id)
    if job is None:
        # Try disk (may have been loaded by another instance)
        job = _load_job(job_id)
        if job:
            _jobs[job_id] = job
    return job


def list_jobs(limit: int = 50, status: JobStatus | None = None) -> list[JobInfo]:
    """List recent jobs, optionally filtered by status."""
    jobs = list(_jobs.values())
    if status:
        jobs = [j for j in jobs if j["status"] == status]
    # Sort by created_at descending
    jobs.sort(key=lambda x: x["created_at"], reverse=True)
    return [
        JobInfo(
            job_id=j["job_id"],
            status=j["status"],
            query=j["query"][:100] + "..." if len(j["query"]) > 100 else j["query"],
            webhook_url=j["webhook_url"],
            created_at=j["created_at"],
            started_at=j["started_at"],
            completed_at=j["completed_at"],
            error=j["error"],
            result_summary=j.get("result_summary"),
        )
        for j in jobs[:limit]
    ]


def update_job(job_id: str, **updates):
    """Update job fields (writes through to disk)."""
    if job_id in _jobs:
        _jobs[job_id].update(updates)
        _save_job(_jobs[job_id])


async def send_webhook(
    webhook_url: str,
    payload: dict[str, Any],
    secret: str | None = None,
    timeout: float = 30.0,
    retries: int = 3,
) -> bool:
    """
    Send webhook POST request with retry logic.

    Args:
        webhook_url: URL to POST to
        payload: JSON payload to send
        secret: Optional HMAC secret for signing (X-Webhook-Signature header)
        timeout: Request timeout in seconds
        retries: Number of retry attempts

    Returns:
        True if webhook was delivered successfully, False otherwise

    Raises:
        ValueError: If webhook_url targets a private/internal IP (SSRF protection)
    """
    # SSRF protection: block private/internal IPs
    _validate_webhook_url(webhook_url)

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "LLM-Council-Webhook/1.0",
    }

    # Serialize payload once — sign and send the exact same bytes
    import json as json_module

    payload_bytes = json_module.dumps(
        payload, sort_keys=True, ensure_ascii=False
    ).encode()

    # Add HMAC signature if secret provided
    if secret:
        import hashlib
        import hmac

        signature = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
        headers["X-Webhook-Signature"] = f"sha256={signature}"

    async with httpx.AsyncClient() as client:
        for attempt in range(retries):
            try:
                response = await client.post(
                    webhook_url,
                    content=payload_bytes,
                    headers=headers,
                    timeout=timeout,
                )
                if response.status_code < 300:
                    return True
                logger.warning(
                    "Webhook attempt %d failed: HTTP %d",
                    attempt + 1,
                    response.status_code,
                )
            except httpx.TimeoutException:
                logger.warning("Webhook attempt %d timed out", attempt + 1)
            except Exception as e:
                logger.warning("Webhook attempt %d error: %s", attempt + 1, e)

            # Exponential backoff
            if attempt < retries - 1:
                await asyncio.sleep(2**attempt)

    return False


async def run_council_async(
    job_id: str,
    handle_council_command,  # Function to call for deliberation
):
    """
    Run council deliberation asynchronously and send webhook when complete.

    This function is meant to be run as a background task.
    """
    job = get_job(job_id)
    if not job:
        return

    update_job(
        job_id, status=JobStatus.RUNNING, started_at=_utc_now_iso()
    )

    try:
        # Run the actual council deliberation
        result = await handle_council_command(
            query=job["query"],
            final_only=job["final_only"],
            models=job["models"],
            chairman=job["chairman"],
            include_details=job["include_details"],
            parallel_mode=job.get("parallel_mode", "disabled"),
            parallel_classifier_score=job.get("parallel_classifier_score"),
        )

        update_job(
            job_id,
            status=JobStatus.COMPLETED,
            completed_at=_utc_now_iso(),
            result=result,
            result_summary=f"Council completed with {len(result.get('stage1', {}))} models",
        )

        # Build webhook payload
        webhook_payload = {
            "event": "council.completed",
            "job_id": job_id,
            "query": job["query"],
            "result": result,
            "metadata": job.get("metadata"),
            "timing": {
                "created_at": job["created_at"],
                "started_at": _jobs[job_id]["started_at"],
                "completed_at": _jobs[job_id]["completed_at"],
            },
        }

        if job.get("webhook_secret_configured") and not job.get("webhook_secret"):
            update_job(
                job_id,
                status=JobStatus.WEBHOOK_FAILED,
                error="Webhook secret was configured but is unavailable after reload; refusing to send unsigned webhook",
            )
            return

        # Send webhook
        success = await send_webhook(
            job["webhook_url"],
            webhook_payload,
            secret=job.get("webhook_secret"),
        )

        if success:
            update_job(job_id, status=JobStatus.WEBHOOK_SENT)
        else:
            update_job(
                job_id,
                status=JobStatus.WEBHOOK_FAILED,
                error="Failed to deliver webhook after retries",
            )

    except Exception as e:
        error_msg = str(e)
        update_job(
            job_id,
            status=JobStatus.FAILED,
            completed_at=_utc_now_iso(),
            error=error_msg,
        )

        if job.get("webhook_secret_configured") and not job.get("webhook_secret"):
            return

        # Send failure webhook (best effort)
        with contextlib.suppress(Exception):
            await send_webhook(
                job["webhook_url"],
                {
                    "event": "council.failed",
                    "job_id": job_id,
                    "query": job["query"],
                    "error": error_msg,
                    "metadata": job.get("metadata"),
                },
                secret=job.get("webhook_secret"),
            )


def cleanup_old_jobs(max_age_hours: int = 24):
    """Remove jobs older than max_age_hours (from memory and disk)."""
    cutoff = time.time() - (max_age_hours * 3600)
    to_remove = []
    for job_id, job in _jobs.items():
        created = datetime.fromisoformat(job["created_at"].replace("Z", "+00:00"))
        if created.timestamp() < cutoff:
            to_remove.append(job_id)
    for job_id in to_remove:
        del _jobs[job_id]
        # Remove from disk too
        try:
            path = _job_path(job_id)
            if _os.path.exists(path):
                _os.remove(path)
        except Exception:
            pass  # Best effort
    return len(to_remove)
