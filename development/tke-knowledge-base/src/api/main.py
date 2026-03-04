"""FastAPI application for TKE Knowledge Base."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ..ingestion.qdrant_client import ensure_collection, get_collection_info
from ..models import ChatQuery, ChatResponse
from ..retrieval.search import query


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Ensure Qdrant collection exists on startup
    try:
        ensure_collection()
    except Exception as e:
        print(f"Warning: Could not connect to Qdrant on startup: {e}")
    yield


app = FastAPI(
    title="TKE Knowledge Base",
    description="AI-powered nephrology knowledge base for The Kidney Experts",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "tke-knowledge-base"}


@app.get("/info")
async def collection_info():
    """Get knowledge base collection info."""
    try:
        info = get_collection_info()
        return {"status": "ok", "collection": info}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/chat", response_model=ChatResponse)
async def chat(chat_query: ChatQuery):
    """Chat endpoint — answer questions from the knowledge base."""
    if not chat_query.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        response = query(chat_query)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


@app.get("/domains")
async def list_domains():
    """List available clinical domains."""
    from ..models import Domain

    return {"domains": [{"id": d.value, "name": d.value.replace("_", " ").title()} for d in Domain]}
