"""FastAPI application for TKE Knowledge Base."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ..ingestion.qdrant_client import ensure_collection, get_collection_info
from ..library import get_article, get_library_index
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


# --- Library endpoints ---


@app.get("/library")
async def library_index(
    content_type: str | None = None,
    domain: str | None = None,
    search: str | None = None,
):
    """List all articles in the knowledge base library.

    Optional query params:
    - content_type: filter by type (protocol, drug_monograph, guideline_summary, etc.)
    - domain: filter by clinical domain
    - search: search article titles (case-insensitive substring)
    """
    index = get_library_index()

    articles = index.articles

    if content_type:
        articles = [a for a in articles if a.content_type == content_type]
    if domain:
        articles = [a for a in articles if a.domain == domain]
    if search:
        search_lower = search.lower()
        articles = [a for a in articles if search_lower in a.title.lower()]

    return {
        "total": len(articles),
        "articles": [a.model_dump() for a in articles],
        "content_types": index.content_types,
        "domains": index.domains,
    }


@app.get("/library/{folder}/{stem}")
async def library_article(folder: str, stem: str):
    """Get a single article by its ID (e.g., /library/protocols/proteinuria)."""
    article_id = f"{folder}/{stem}"
    article = get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail=f"Article '{article_id}' not found")
    return article.model_dump()
