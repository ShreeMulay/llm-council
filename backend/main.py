"""FastAPI backend for LLM Council with OpenCode integration."""

import contextlib
import hashlib
import hmac
import logging
import os

# Logging: file + stderr locally, stdout only in Cloud Run (captured by Cloud Logging)
_handlers: list[logging.Handler] = [logging.StreamHandler()]
if not os.environ.get("K_SERVICE"):
    # Not in Cloud Run — also log to file for local debugging
    with contextlib.suppress(OSError):
        _handlers.append(logging.FileHandler("/tmp/llm-council.log"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
    handlers=_handlers,
)

import asyncio
import json
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, StrictBool

from . import storage
from .auth import ApiKeyMiddleware
from .config import (
    BACKEND_HOST,
    BACKEND_PORT,
    CHAIRMAN_MODEL,
    COUNCIL_MODELS,
    REQUIRE_VERTEX_ANTHROPIC,
    VERTEX_ANTHROPIC_MODEL_IDS,
    VERTEX_LOCATION,
    VERTEX_PROJECT_ID,
)
from .council import (
    calculate_aggregate_rankings,
    execution_plan_metadata,
    generate_conversation_title,
    run_full_council,
    stage1_collect_responses,
    stage2_collect_rankings,
    stage3_synthesize_final,
    stream_council,
)
from .execution_planning import build_execution_plan
from .model_discovery import get_model_discovery
from .model_registry import PROJECTION_PATHS, load_registry
from .opencode_integration import (
    MCP_TOOL_SCHEMA,
    MODEL_ALIASES_HELP,
    handle_council_command,
)
from .parallel_intelligence import ParallelMonitor, create_parallel_stage0
from .tool_context import augment_query_with_tool_context
from .webhooks import (
    CouncilAsyncRequest,
    JobStatus,
    cleanup_old_jobs,
    create_job,
    get_job,
    list_jobs,
    run_council_async,
)

app = FastAPI(
    title="LLM Council API",
    description="Multi-model LLM deliberation system for OpenCode integration",
    version="1.2.0",
)

# API key auth — protects /api/* routes, skips /health and /
# Disabled when COUNCIL_API_KEY env var is not set (local dev)
app.add_middleware(ApiKeyMiddleware)

# Enable CORS for local development and MCP access
# Note: wildcard origin with credentials is invalid per spec — use explicit origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Request/Response Models
# ============================================================================


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""

    active_models: list[str] | None = None


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""

    content: str
    compact: bool = False
    models: list[str] | None = None
    tool_context: bool = True


class CouncilRequest(BaseModel):
    """Request for /council command or MCP tool."""

    query: str
    final_only: bool = False
    compact: bool = False  # Use core 5 models only (faster/cheaper)
    models: list[str] | None = None
    chairman: str | None = None
    include_details: bool = True
    tool_context: bool = True
    parallel_mode: str = "disabled"
    parallel_classifier_score: float | None = None
    allow_declared_route_failover: StrictBool = True
    allow_provider_substitution: StrictBool = False


class MonitorEventRequest(BaseModel):
    """Versioned discovery event; ingestion can only create proposals."""

    model_config = {"extra": "allow"}
    schema_version: str
    event_id: str
    provider: str
    model: str
    version: str
    source: dict[str, Any]
    routes: list[str]
    confidence: float


class ExportRequest(BaseModel):
    """Request to export a council result as a downloadable file."""

    result: dict[str, Any]  # Full council result payload
    filename: str | None = None  # Custom filename (without extension)


class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""

    id: str
    created_at: str
    title: str
    message_count: int
    active_models: list[str] | None = None


class Conversation(BaseModel):
    """Full conversation with all messages."""

    id: str
    created_at: str
    title: str
    active_models: list[str] | None = None
    messages: list[dict[str, Any]]


# ============================================================================
# Health and Info Endpoints
# ============================================================================


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "LLM Council API",
        "version": "1.2.0",
        "port": BACKEND_PORT,
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    registry = load_registry()

    def packaged_projection_digest(surface: str) -> str:
        projection_path = Path(__file__).parents[1] / PROJECTION_PATHS[surface]
        projection = json.loads(projection_path.read_text(encoding="utf-8"))
        serialized = json.dumps(projection, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode()).hexdigest()

    return {
        "status": "healthy",
        "service": "llm-council",
        "config": {
            "council_models": list(registry.production_roster),
            "compact_council_models": list(registry.compact_roster),
            "evaluator_models": list(registry.evaluator_priority),
            "chairman_model": registry.chairman_logical_id,
            "production_route_ids": [
                registry.model(model_id).preferred_route_id
                for model_id in registry.production_roster
            ],
            "vertex_anthropic_models": VERTEX_ANTHROPIC_MODEL_IDS,
            "vertex_project_id": VERTEX_PROJECT_ID,
            "vertex_location": VERTEX_LOCATION,
            "vertex_project_configured": bool(VERTEX_PROJECT_ID),
            "require_vertex_anthropic": REQUIRE_VERTEX_ANTHROPIC,
            "fable_baa_policy": "Vertex AI primary route is PHI-eligible only in covered Google Cloud projects/services under BAA; OpenRouter fallback is non-PHI/deidentified only.",
        },
        "artifacts": {
            "registry_digest": registry.digest,
            "projection_digests": {
                surface: packaged_projection_digest(surface)
                for surface in ("backend", "frontend", "mcp")
            },
            "application_revision": os.getenv("DEPLOY_REVISION") or os.getenv("K_REVISION"),
            "image_digest": os.getenv("APP_IMAGE_DIGEST"),
        },
    }


@app.get("/api/info")
async def api_info():
    """API information and help."""
    return {
        "name": "LLM Council API",
        "version": "1.2.0",
        "description": "Multi-model LLM deliberation with peer review",
        "safety": {
            "fable_primary": "Claude Fable 5 routes through Vertex AI Anthropic when configured.",
            "phi_policy": "Fable via Vertex AI is PHI-eligible only in covered Google Cloud projects/services under BAA; Fable via OpenRouter fallback is non-PHI/deidentified only.",
        },
        "endpoints": {
            "/api/council": "Execute council deliberation (POST, sync). ?format=markdown|markdown-raw for export.",
            "/api/council/export": "Export council result as downloadable file (POST). ?format=markdown|json",
            "/api/council/stream": "Stream council deliberation as SSE (POST)",
            "/api/council/async": "Execute council with webhook callback (POST, async)",
            "/api/council/jobs": "List async jobs (GET)",
            "/api/council/jobs/{job_id}": "Get job status (GET)",
            "/api/models": "List available models (GET)",
            "/api/mcp/schema": "MCP tool schema (GET)",
        },
        "webhook_events": {
            "council.completed": "Deliberation finished successfully",
            "council.failed": "Deliberation failed with error",
        },
        "model_aliases": MODEL_ALIASES_HELP,
    }


# ============================================================================
# Model Discovery Endpoints
# ============================================================================


@app.get("/api/models")
async def get_models(provider: str | None = None, refresh: bool = False):
    """
    Get available models from all providers.

    Args:
        provider: Filter by provider ("openrouter" or "cerebras")
        refresh: Force refresh from API (bypass cache)
    """
    discovery = get_model_discovery()
    await discovery.get_all_models(provider, force_refresh=refresh)
    cache_info = discovery.get_cache_info()
    from .model_registry import derive_projections, load_registry

    models = derive_projections(load_registry())["api"].to_dict()["models"]
    if provider:
        models = [model for model in models if model["provider"] == provider.lower()]

    return {"models": models, "count": len(models), "cache": cache_info}


@app.get("/api/models/{provider}")
async def get_provider_models(provider: str, refresh: bool = False):
    """Get models from a specific provider."""
    if provider.lower() not in ["openrouter", "cerebras"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: {provider}. Must be 'openrouter' or 'cerebras'",
        )

    discovery = get_model_discovery()
    models = await discovery.get_all_models(provider.lower(), force_refresh=refresh)

    return {"provider": provider, "models": models, "count": len(models)}


# ============================================================================
# Council Deliberation Endpoints (OpenCode Integration)
# ============================================================================


@app.post("/api/council")
async def council_deliberation(request: CouncilRequest, format: str | None = None):
    """
    Execute 3-stage council deliberation.

    This is the main endpoint for OpenCode's /council command and MCP tool.

    Query params:
        format: Response format - "json" (default), "markdown", or "markdown-raw".
                "json" returns the full structured response.
                "markdown" returns the markdown string wrapped in {"markdown": "..."}.
                "markdown-raw" returns plain text markdown with text/markdown content type.

    Returns (default JSON):
        - markdown: Formatted markdown output for display
        - stage1: Individual model responses
        - stage2: Peer rankings (empty if final_only=True)
        - stage3: Chairman's synthesized answer
        - metadata: Aggregate rankings, label mapping
        - timing: Elapsed time
        - config: Models used
    """
    result = await handle_council_command(
        query=request.query,
        final_only=request.final_only,
        compact=request.compact,
        models=request.models,
        chairman=request.chairman,
        include_details=request.include_details,
        tool_context=request.tool_context,
        parallel_mode=request.parallel_mode,
        parallel_classifier_score=request.parallel_classifier_score,
        allow_declared_route_failover=request.allow_declared_route_failover,
        allow_provider_substitution=request.allow_provider_substitution,
    )

    if format == "markdown-raw":
        from fastapi.responses import PlainTextResponse

        return PlainTextResponse(
            content=result.get("markdown", ""),
            media_type="text/markdown",
        )
    elif format == "markdown":
        return {"markdown": result.get("markdown", "")}

    return result


@app.post("/api/council/export")
async def council_export(request: ExportRequest, format: str = "markdown"):
    """
    Export a council deliberation result as a downloadable file.

    Accepts a full council result payload (as returned by /api/council)
    and returns it as a downloadable markdown or JSON file.

    Query params:
        format: "markdown" (default) or "json"

    Request body:
        result: The full council result object from /api/council
        filename: Optional custom filename (without extension)
    """
    import re

    from fastapi.responses import Response

    result = request.result

    # Extract query for filename generation and markdown regeneration
    query = result.get("stage3", {}).get("query", "") or ""
    if not query:
        # Try to extract query from markdown
        md = result.get("markdown", "")
        match = re.search(r"\*\*Query\*\*:\s*(.+)", md)
        query = match.group(1).strip() if match else ""

    # Generate filename from query if not provided
    if request.filename:
        # Sanitize user-provided filename to prevent header injection
        import re as _re

        base_filename = _re.sub(r"[^a-zA-Z0-9._-]", "-", request.filename).strip("-")[
            :80
        ]
        if not base_filename:
            base_filename = "council-deliberation"
    else:
        slug = (
            re.sub(r"[^a-z0-9]+", "-", query.lower()).strip("-")[:60] if query else ""
        )
        base_filename = slug or "council-deliberation"

    if format == "json":
        content = json.dumps(result, indent=2, ensure_ascii=False)
        filename = f"{base_filename}.json"
        media_type = "application/json"
    else:
        # Default to markdown
        content = result.get("markdown", "")
        if not content:
            # Regenerate markdown from structured data if missing
            from .opencode_integration import format_council_markdown

            content = format_council_markdown(
                query=query if query else "Unknown query",
                stage1_results=result.get("stage1", []),
                stage2_results=result.get("stage2", []),
                stage3_result=result.get("stage3", {}),
                metadata=result.get("metadata", {}),
                include_details=True,
                elapsed_seconds=result.get("timing", {}).get("elapsed_seconds", 0),
            )
        filename = f"{base_filename}.md"
        media_type = "text/markdown"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@app.post("/api/council/stream")
async def council_stream(request: CouncilRequest):
    """
    Stream council deliberation as Server-Sent Events.

    Each model's response is sent as it arrives, so the client sees
    incremental progress instead of waiting for all models to finish.

    SSE event format:
        data: {"event": "stage_start", "stage": 1, "models": [...]}
        data: {"event": "model_response", "stage": 1, "model": "...", ...}
        data: {"event": "stage_complete", "stage": 1, "count": "5/5"}
        data: {"event": "stage_start", "stage": 3}
        data: {"event": "synthesis", "model": "...", "response": "..."}
        data: {"event": "complete", "stage1": [...], "stage2": [...], ...}
    """
    import time

    start_time = time.time()
    augmented_query, tool_context_metadata = await augment_query_with_tool_context(
        request.query,
        enabled=request.tool_context,
    )
    stage0_metadata: dict[str, Any] = {"planned": False, "gate_reason": "disabled"}
    evidence_bundle = None

    # Resolve model aliases
    council_models = None
    if request.models:
        from .config import resolve_model_alias

        council_models = [resolve_model_alias(m) for m in request.models]
    elif request.compact:
        from .config import COMPACT_COUNCIL_MODELS

        council_models = COMPACT_COUNCIL_MODELS

    chairman_model = None
    if request.chairman:
        from .config import resolve_model_alias

        chairman_model = resolve_model_alias(request.chairman)

    execution_plan = build_execution_plan(
        load_registry(),
        {
            "query": request.query,
            "models": council_models,
            "compact": request.compact,
            "chairman": chairman_model,
            "mode": "stream",
            "parallel_mode": request.parallel_mode,
            "parallel_classifier_score": request.parallel_classifier_score,
            "allow_declared_route_failover": request.allow_declared_route_failover,
            "allow_provider_substitution": request.allow_provider_substitution,
        },
    )
    stage0 = create_parallel_stage0(request.parallel_mode)
    if stage0 is not None:
        stage0_result = await stage0.run(
            request.query,
            classifier_score=request.parallel_classifier_score,
            execution_plan=execution_plan,
        )
        stage0_metadata = stage0_result.metadata
        evidence_bundle = stage0_result.evidence_bundle

    async def event_generator():
        try:
            async for event in stream_council(
                user_query=augmented_query,
                final_only=request.final_only,
                council_models=council_models,
                chairman_model=chairman_model,
                execution_plan=execution_plan,
                evidence_bundle=evidence_bundle,
            ):
                # On complete event, add timing info and format markdown
                if event.get("event") == "complete":
                    elapsed = time.time() - start_time
                    event["timing"] = {"elapsed_seconds": round(elapsed, 2)}
                    event["config"] = {
                        "council_models": council_models or COUNCIL_MODELS,
                        "chairman_model": chairman_model or CHAIRMAN_MODEL,
                        "final_only": request.final_only,
                        "compact": request.compact,
                        "tool_context": request.tool_context,
                        "allow_declared_route_failover": request.allow_declared_route_failover,
                        "allow_provider_substitution": request.allow_provider_substitution,
                    }
                    event["metadata"] = {
                        **event.get("metadata", {}),
                        "tool_context": tool_context_metadata,
                        "parallel": stage0_metadata,
                    }
                    # Generate markdown for the final result
                    from .opencode_integration import format_council_markdown

                    event["markdown"] = format_council_markdown(
                        query=request.query,
                        stage1_results=event.get("stage1", []),
                        stage2_results=event.get("stage2", []),
                        stage3_result=event.get("stage3", {}),
                        metadata=event.get("metadata", {}),
                        include_details=request.include_details,
                        elapsed_seconds=elapsed,
                    )

                yield f"data: {json.dumps(event)}\n\n"
        except Exception:
            logging.getLogger("llm-council.api").exception("Council stream failed")
            yield f"data: {json.dumps({'event': 'error', 'message': 'Council stream failed. Please try again.'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/mcp/schema")
async def mcp_schema():
    """Return MCP tool schema for registration."""
    return MCP_TOOL_SCHEMA


@app.post("/api/parallel/monitor/events")
async def ingest_parallel_monitor_event(request: Request):
    """Persist a candidate proposal without touching runtime model state."""
    from dataclasses import asdict

    from .config import DATA_DIR

    secret = os.environ.get("PARALLEL_MONITOR_INGEST_SECRET")
    if not secret:
        raise HTTPException(status_code=404, detail="Not found")
    supplied = request.headers.get("X-Parallel-Monitor-Secret", "")
    if not hmac.compare_digest(supplied.encode(), secret.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        if request.headers.get("content-length") and int(request.headers["content-length"]) > 32_768:
            raise HTTPException(status_code=413, detail="Request too large")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid content length") from exc
    body = await request.body()
    if len(body) > 32_768:
        raise HTTPException(status_code=413, detail="Request too large")
    try:
        event = MonitorEventRequest.model_validate_json(body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid event") from exc
    monitor = ParallelMonitor(proposal_store=DATA_DIR / "parallel" / "candidate-proposals.jsonl")
    try:
        proposal = monitor.ingest(event.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return asdict(proposal)


# ============================================================================
# Async Council with Webhook Callbacks
# ============================================================================


@app.post("/api/council/async")
async def council_async(request: CouncilAsyncRequest):
    """
    Execute council deliberation asynchronously with webhook callback.

    Returns immediately with a job_id. When deliberation completes,
    the result is POSTed to the webhook_url.

    Webhook payload format:
    {
        "event": "council.completed" | "council.failed",
        "job_id": "uuid",
        "query": "original query",
        "result": { ... },  // Full council result (on success)
        "error": "...",     // Error message (on failure)
        "metadata": { ... } // Pass-through metadata from request
    }

    If webhook_secret is provided, the payload is signed with HMAC-SHA256
    and the signature is included in the X-Webhook-Signature header.
    """
    # Create job after validating webhook destination. Keep client detail generic;
    # validation errors can include resolved IPs or DNS details.
    try:
        job_id = create_job(request)
    except ValueError as exc:
        logging.getLogger("llm-council.api").warning("Rejected async council webhook URL: %s", exc)
        raise HTTPException(
            status_code=400,
            detail="Webhook URL rejected: destination not allowed",
        ) from exc

    # Start background task
    asyncio.create_task(run_council_async(job_id, handle_council_command))

    return {
        "status": "accepted",
        "job_id": job_id,
        "message": "Council deliberation started. Results will be POSTed to webhook_url when complete.",
        "webhook_url": str(request.webhook_url),
        "poll_url": f"/api/council/jobs/{job_id}",
    }


@app.get("/api/council/jobs")
async def list_council_jobs(
    limit: int = 50,
    status: str | None = None,
):
    """
    List recent async council jobs.

    Args:
        limit: Maximum number of jobs to return (default 50)
        status: Filter by status (pending, running, completed, failed, webhook_sent, webhook_failed)
    """
    status_enum = None
    if status:
        try:
            status_enum = JobStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status: {status}. Valid values: {[s.value for s in JobStatus]}",
            ) from None

    jobs = list_jobs(limit=limit, status=status_enum)
    return {
        "jobs": [j.model_dump() for j in jobs],
        "count": len(jobs),
    }


@app.get("/api/council/jobs/{job_id}")
async def get_council_job(job_id: str, include_result: bool = False):
    """
    Get status of a specific async council job.

    Args:
        job_id: The job UUID
        include_result: If true, include the full result (can be large)
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

    response = {
        "job_id": job["job_id"],
        "status": job["status"],
        "query": job["query"],
        "webhook_url": job["webhook_url"],
        "created_at": job["created_at"],
        "started_at": job["started_at"],
        "completed_at": job["completed_at"],
        "error": job["error"],
    }

    if include_result and job.get("result"):
        response["result"] = job["result"]

    return response


@app.delete("/api/council/jobs/cleanup")
async def cleanup_jobs(max_age_hours: int = 24):
    """Remove jobs older than max_age_hours (default 24)."""
    removed = cleanup_old_jobs(max_age_hours)
    return {"removed": removed, "max_age_hours": max_age_hours}


# ============================================================================
# Conversation Storage Endpoints (Legacy GUI Support)
# ============================================================================


@app.get("/api/conversations", response_model=list[ConversationMetadata])
async def list_conversations():
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation."""
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id, active_models=request.active_models)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation with all its messages."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    success = storage.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted", "id": conversation_id}


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and run the 3-stage council process.
    Returns the complete response with all stages.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Add user message
    await storage.add_user_message(conversation_id, request.content)

    augmented_content, tool_context_metadata = await augment_query_with_tool_context(
        request.content,
        enabled=request.tool_context,
    )

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        await storage.update_conversation_title(conversation_id, title)

    # Determine council models: request.models > conversation.active_models > compact > default
    council_models = None
    if request.models:
        council_models = request.models
    elif conversation.get("active_models"):
        council_models = conversation["active_models"]
    elif request.compact:
        from backend.config import COMPACT_COUNCIL_MODELS
        council_models = COMPACT_COUNCIL_MODELS

    # Run the 3-stage council process
    execution_plan = build_execution_plan(
        load_registry(),
        {"query": request.content, "models": council_models, "compact": request.compact},
    )
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        augmented_content,
        compact=request.compact,
        council_models=council_models,
        execution_plan=execution_plan,
    )
    metadata = {
        **metadata,
        "models": council_models or COUNCIL_MODELS,
        "tool_context": tool_context_metadata,
    }

    # Add assistant message with all stages
    await storage.add_assistant_message(
        conversation_id, stage1_results, stage2_results, stage3_result, metadata
    )

    # Return the complete response with metadata
    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata,
    }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and stream the 3-stage council process.
    Returns Server-Sent Events as each stage completes.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    async def event_generator():
        try:
            # Add user message
            await storage.add_user_message(conversation_id, request.content)

            yield f"data: {json.dumps({'type': 'tool_context_start'})}\n\n"
            augmented_content, tool_context_metadata = await augment_query_with_tool_context(
                request.content,
                enabled=request.tool_context,
            )
            yield f"data: {json.dumps({'type': 'tool_context_complete', 'metadata': tool_context_metadata})}\n\n"

            # Start title generation in parallel (don't await yet)
            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(
                    generate_conversation_title(request.content)
                )

            # Determine council models: request.models > conversation.active_models > compact > default
            council_models = None
            if request.models:
                council_models = request.models
            elif conversation.get("active_models"):
                council_models = conversation["active_models"]
            elif request.compact:
                from backend.config import COMPACT_COUNCIL_MODELS
                council_models = COMPACT_COUNCIL_MODELS

            execution_plan = build_execution_plan(
                load_registry(),
                {
                    "query": request.content,
                    "models": council_models,
                    "compact": request.compact,
                    "mode": "stream",
                },
            )

            # Stage 1: Collect responses
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_results = await stage1_collect_responses(
                augmented_content, council_models, execution_plan
            )
            yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

            # Stage 2: Collect rankings
            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results, label_to_model = await stage2_collect_rankings(
                augmented_content,
                stage1_results,
                [operation.logical_id for operation in execution_plan.evaluators],
                execution_plan,
            )
            aggregate_rankings = calculate_aggregate_rankings(
                stage2_results, label_to_model
            )
            metadata = {
                "label_to_model": label_to_model,
                "aggregate_rankings": aggregate_rankings,
                "compact": request.compact,
                "models": council_models or COUNCIL_MODELS,
                "tool_context": tool_context_metadata,
                "execution_plan": execution_plan_metadata(execution_plan),
            }
            yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': metadata})}\n\n"

            # Stage 3: Synthesize final answer
            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result = await stage3_synthesize_final(
                augmented_content,
                stage1_results,
                stage2_results,
                execution_plan.chairman.logical_id,
                execution_plan,
            )
            yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                await storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Save complete assistant message with metadata
            await storage.add_assistant_message(
                conversation_id, stage1_results, stage2_results, stage3_result, metadata
            )

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception:
            # Send error event
            logging.getLogger("llm-council.api").exception("Conversation stream failed")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Conversation stream failed. Please try again.'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    print(f"Starting LLM Council API on http://{BACKEND_HOST}:{BACKEND_PORT}")
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)
