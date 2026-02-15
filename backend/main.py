"""FastAPI backend for LLM Council with OpenCode integration."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import json
import asyncio

from . import storage
from .config import BACKEND_PORT, BACKEND_HOST, COUNCIL_MODELS, CHAIRMAN_MODEL
from .council import (
    run_full_council,
    generate_conversation_title,
    stage1_collect_responses,
    stage2_collect_rankings,
    stage3_synthesize_final,
    calculate_aggregate_rankings
)
from .model_discovery import get_model_discovery
from .opencode_integration import handle_council_command, MCP_TOOL_SCHEMA, MODEL_ALIASES_HELP
from .webhooks import (
    CouncilAsyncRequest,
    JobInfo,
    JobStatus,
    create_job,
    get_job,
    list_jobs,
    run_council_async,
    cleanup_old_jobs,
)

app = FastAPI(
    title="LLM Council API",
    description="Multi-model LLM deliberation system for OpenCode integration",
    version="1.0.0"
)

# Enable CORS for local development and any origin (for MCP access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Request/Response Models
# ============================================================================

class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    pass


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str


class CouncilRequest(BaseModel):
    """Request for /council command or MCP tool."""
    query: str
    final_only: bool = False
    models: Optional[List[str]] = None
    chairman: Optional[str] = None
    include_details: bool = True


class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    """Full conversation with all messages."""
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]


# ============================================================================
# Health and Info Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "LLM Council API",
        "version": "1.0.0",
        "port": BACKEND_PORT
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "service": "llm-council",
        "config": {
            "council_models": COUNCIL_MODELS,
            "chairman_model": CHAIRMAN_MODEL
        }
    }


@app.get("/api/info")
async def api_info():
    """API information and help."""
    return {
        "name": "LLM Council API",
        "version": "1.1.0",
        "description": "Multi-model LLM deliberation with peer review",
        "endpoints": {
            "/api/council": "Execute council deliberation (POST, sync)",
            "/api/council/async": "Execute council with webhook callback (POST, async)",
            "/api/council/jobs": "List async jobs (GET)",
            "/api/council/jobs/{job_id}": "Get job status (GET)",
            "/api/models": "List available models (GET)",
            "/api/mcp/schema": "MCP tool schema (GET)"
        },
        "webhook_events": {
            "council.completed": "Deliberation finished successfully",
            "council.failed": "Deliberation failed with error"
        },
        "model_aliases": MODEL_ALIASES_HELP
    }


# ============================================================================
# Model Discovery Endpoints
# ============================================================================

@app.get("/api/models")
async def get_models(provider: Optional[str] = None, refresh: bool = False):
    """
    Get available models from all providers.
    
    Args:
        provider: Filter by provider ("openrouter" or "cerebras")
        refresh: Force refresh from API (bypass cache)
    """
    discovery = get_model_discovery()
    models = await discovery.get_all_models(provider, force_refresh=refresh)
    cache_info = discovery.get_cache_info()
    
    return {
        "models": models,
        "count": len(models),
        "cache": cache_info
    }


@app.get("/api/models/{provider}")
async def get_provider_models(provider: str, refresh: bool = False):
    """Get models from a specific provider."""
    if provider.lower() not in ["openrouter", "cerebras"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: {provider}. Must be 'openrouter' or 'cerebras'"
        )
    
    discovery = get_model_discovery()
    models = await discovery.get_all_models(provider.lower(), force_refresh=refresh)
    
    return {
        "provider": provider,
        "models": models,
        "count": len(models)
    }


# ============================================================================
# Council Deliberation Endpoints (OpenCode Integration)
# ============================================================================

@app.post("/api/council")
async def council_deliberation(request: CouncilRequest):
    """
    Execute 3-stage council deliberation.
    
    This is the main endpoint for OpenCode's /council command and MCP tool.
    
    Returns:
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
        models=request.models,
        chairman=request.chairman,
        include_details=request.include_details
    )
    
    return result


@app.get("/api/mcp/schema")
async def mcp_schema():
    """Return MCP tool schema for registration."""
    return MCP_TOOL_SCHEMA


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
    # Create job
    job_id = create_job(request)
    
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
    status: Optional[str] = None,
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
                detail=f"Invalid status: {status}. Valid values: {[s.value for s in JobStatus]}"
            )
    
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

@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations():
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation."""
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id)
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
    storage.add_user_message(conversation_id, request.content)

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        storage.update_conversation_title(conversation_id, title)

    # Run the 3-stage council process
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content
    )

    # Add assistant message with all stages
    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result
    )

    # Return the complete response with metadata
    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata
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
            storage.add_user_message(conversation_id, request.content)

            # Start title generation in parallel (don't await yet)
            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(generate_conversation_title(request.content))

            # Stage 1: Collect responses
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_results = await stage1_collect_responses(request.content)
            yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

            # Stage 2: Collect rankings
            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results, label_to_model = await stage2_collect_rankings(request.content, stage1_results)
            aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
            yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}})}\n\n"

            # Stage 3: Synthesize final answer
            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result = await stage3_synthesize_final(request.content, stage1_results, stage2_results)
            yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Save complete assistant message
            storage.add_assistant_message(
                conversation_id,
                stage1_results,
                stage2_results,
                stage3_result
            )

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    print(f"Starting LLM Council API on http://{BACKEND_HOST}:{BACKEND_PORT}")
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)
