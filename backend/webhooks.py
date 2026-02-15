"""Webhook callback support for async council deliberations."""

import asyncio
import httpx
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, HttpUrl
from enum import Enum


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
    webhook_secret: Optional[str] = None  # Optional HMAC signing secret
    final_only: bool = False
    models: Optional[List[str]] = None
    chairman: Optional[str] = None
    include_details: bool = True
    metadata: Optional[Dict[str, Any]] = None  # Pass-through metadata for webhook


class JobInfo(BaseModel):
    """Information about an async council job."""
    job_id: str
    status: JobStatus
    query: str
    webhook_url: str
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    result_summary: Optional[str] = None


# In-memory job store (consider Redis/DB for production)
_jobs: Dict[str, Dict[str, Any]] = {}


def create_job(request: CouncilAsyncRequest) -> str:
    """Create a new async job and return its ID."""
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "job_id": job_id,
        "status": JobStatus.PENDING,
        "query": request.query,
        "webhook_url": str(request.webhook_url),
        "webhook_secret": request.webhook_secret,
        "final_only": request.final_only,
        "models": request.models,
        "chairman": request.chairman,
        "include_details": request.include_details,
        "metadata": request.metadata,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "started_at": None,
        "completed_at": None,
        "error": None,
        "result": None,
    }
    return job_id


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Get job information by ID."""
    return _jobs.get(job_id)


def list_jobs(limit: int = 50, status: Optional[JobStatus] = None) -> List[JobInfo]:
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
    """Update job fields."""
    if job_id in _jobs:
        _jobs[job_id].update(updates)


async def send_webhook(
    webhook_url: str,
    payload: Dict[str, Any],
    secret: Optional[str] = None,
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
    """
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "LLM-Council-Webhook/1.0",
    }
    
    # Add HMAC signature if secret provided
    if secret:
        import hashlib
        import hmac
        import json as json_module
        payload_bytes = json_module.dumps(payload, sort_keys=True).encode()
        signature = hmac.new(
            secret.encode(),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        headers["X-Webhook-Signature"] = f"sha256={signature}"
    
    async with httpx.AsyncClient() as client:
        for attempt in range(retries):
            try:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    headers=headers,
                    timeout=timeout,
                )
                if response.status_code < 300:
                    return True
                print(f"Webhook attempt {attempt + 1} failed: HTTP {response.status_code}")
            except httpx.TimeoutException:
                print(f"Webhook attempt {attempt + 1} timed out")
            except Exception as e:
                print(f"Webhook attempt {attempt + 1} error: {e}")
            
            # Exponential backoff
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    
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
    
    update_job(job_id, status=JobStatus.RUNNING, started_at=datetime.utcnow().isoformat() + "Z")
    
    try:
        # Run the actual council deliberation
        result = await handle_council_command(
            query=job["query"],
            final_only=job["final_only"],
            models=job["models"],
            chairman=job["chairman"],
            include_details=job["include_details"],
        )
        
        update_job(
            job_id,
            status=JobStatus.COMPLETED,
            completed_at=datetime.utcnow().isoformat() + "Z",
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
                "started_at": job["started_at"],
                "completed_at": _jobs[job_id]["completed_at"],
            },
        }
        
        # Send webhook
        success = await send_webhook(
            job["webhook_url"],
            webhook_payload,
            secret=job.get("webhook_secret"),
        )
        
        if success:
            update_job(job_id, status=JobStatus.WEBHOOK_SENT)
        else:
            update_job(job_id, status=JobStatus.WEBHOOK_FAILED, error="Failed to deliver webhook after retries")
            
    except Exception as e:
        error_msg = str(e)
        update_job(
            job_id,
            status=JobStatus.FAILED,
            completed_at=datetime.utcnow().isoformat() + "Z",
            error=error_msg,
        )
        
        # Send failure webhook
        try:
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
        except Exception:
            pass  # Best effort


def cleanup_old_jobs(max_age_hours: int = 24):
    """Remove jobs older than max_age_hours."""
    cutoff = time.time() - (max_age_hours * 3600)
    to_remove = []
    for job_id, job in _jobs.items():
        created = datetime.fromisoformat(job["created_at"].rstrip("Z"))
        if created.timestamp() < cutoff:
            to_remove.append(job_id)
    for job_id in to_remove:
        del _jobs[job_id]
    return len(to_remove)
