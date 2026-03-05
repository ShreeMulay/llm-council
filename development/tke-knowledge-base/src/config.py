"""Central configuration for TKE Knowledge Base."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CONTENT_DIR = PROJECT_ROOT / "content"
DATA_DIR = PROJECT_ROOT / "data"
GUIDELINES_DIR = CONTENT_DIR / "guidelines"
PROTOCOLS_DIR = CONTENT_DIR / "protocols"
DRUG_INFO_DIR = CONTENT_DIR / "drug_info"
ALGORITHMS_DIR = CONTENT_DIR / "algorithms"
REFERENCES_DIR = CONTENT_DIR / "references"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Qdrant
    qdrant_url: str = Field(default="http://localhost:6333", description="Qdrant server URL")
    qdrant_api_key: str | None = Field(default=None, description="Qdrant Cloud API key")
    qdrant_collection: str = Field(default="tke_knowledge_base", description="Collection name")

    # Voyage AI
    voyage_api_key: str = Field(default="", description="Voyage AI API key")
    voyage_model: str = Field(default="voyage-4-large", description="Voyage embedding model")
    voyage_batch_size: int = Field(default=96, description="Max texts per embedding request")

    # Gemini
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    gemini_model: str = Field(default="gemini-3.1-pro-preview", description="Gemini model for chat")

    # Chunking
    chunk_size: int = Field(default=600, description="Target chunk size in tokens")
    chunk_overlap: int = Field(default=75, description="Overlap between chunks in tokens")

    # Retrieval
    search_top_k: int = Field(default=10, description="Number of results from vector search")
    score_threshold: float = Field(default=0.45, description="Minimum similarity score")
    context_top_k: int = Field(default=5, description="Number of chunks to include in context")

    # Metadata DB
    db_path: str = Field(default=str(DATA_DIR / "sources.db"), description="SQLite database path")

    # API
    api_host: str = Field(default="0.0.0.0", description="API server host")
    api_port: int = Field(default=8000, description="API server port")

    model_config = {"env_prefix": "TKE_KB_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
