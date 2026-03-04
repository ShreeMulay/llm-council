"""Data models for TKE Knowledge Base."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class Domain(StrEnum):
    """Clinical domains in the knowledge base."""

    PROTEINURIA = "proteinuria"
    RAAS_BLOCKADE = "raas_blockade"
    SGLT2_INHIBITORS = "sglt2_inhibitors"
    FINERENONE_MRA = "finerenone_mra"
    GLP1_AGONISTS = "glp1_agonists"
    CHF_GDMT = "chf_gdmt"
    ANEMIA_CKD_MBD = "anemia_ckd_mbd"
    ELECTROLYTES = "electrolytes"
    DIABETES = "diabetes"
    STATINS_LIPIDS = "statins_lipids"
    NSAID_PPI_AVOIDANCE = "nsaid_ppi_avoidance"
    SMOKING_CESSATION = "smoking_cessation"
    GOUT_URIC_ACID = "gout_uric_acid"
    TRANSPLANT_IMMUNOSUPPRESSION = "transplant_immunosuppression"
    GN_IMMUNOSUPPRESSION = "gn_immunosuppression"
    GENERAL = "general"


class SourceType(StrEnum):
    """Types of authoritative sources."""

    GUIDELINE = "guideline"
    DRUG_LABEL = "drug_label"
    CLINICAL_TRIAL = "clinical_trial"
    REVIEW_ARTICLE = "review_article"
    PRACTICE_PROTOCOL = "practice_protocol"
    REFERENCE_TABLE = "reference_table"
    PATIENT_EDUCATION = "patient_education"
    REGULATORY = "regulatory"


class ContentStatus(StrEnum):
    """Content lifecycle status."""

    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    STALE = "stale"
    ARCHIVED = "archived"


# --- Source Registry ---


class Source(BaseModel):
    """An authoritative source document."""

    id: str = Field(description="Unique source identifier (e.g., 'kdigo-ckd-2024')")
    title: str = Field(description="Full title of the source")
    source_type: SourceType
    organization: str = Field(description="Publishing organization (e.g., 'KDIGO')")
    url: str | None = Field(default=None, description="URL to access the source")
    publication_date: str | None = Field(default=None, description="Publication date (YYYY-MM-DD)")
    version: str | None = Field(default=None, description="Guideline version if applicable")
    domains: list[Domain] = Field(default_factory=list, description="Relevant clinical domains")
    file_path: str | None = Field(default=None, description="Local file path if downloaded")
    last_checked: str | None = Field(default=None, description="Last time source was checked")
    notes: str | None = Field(default=None, description="Additional notes")


class SourceRegistry(BaseModel):
    """Registry of all authoritative sources."""

    version: str = "1.0"
    last_updated: str = Field(default_factory=lambda: datetime.now().isoformat())
    sources: list[Source] = Field(default_factory=list)


# --- Content Chunks ---


class ChunkMetadata(BaseModel):
    """Metadata stored with each vector in Qdrant."""

    text: str = Field(description="The chunk text content")
    source_id: str = Field(description="Reference to source in registry")
    source_title: str = Field(description="Human-readable source title")
    domain: Domain = Field(description="Primary clinical domain")
    domains: list[Domain] = Field(default_factory=list, description="All relevant domains")
    drug_names: list[str] = Field(default_factory=list, description="Drug names (brand+generic)")
    section_title: str | None = Field(default=None, description="Section within the source")
    chunk_index: int = Field(default=0, description="Position within the source document")
    content_type: str = Field(default="text", description="Content type: text, table, list")
    status: ContentStatus = Field(default=ContentStatus.APPROVED)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    last_verified: str = Field(default_factory=lambda: datetime.now().isoformat())
    source_url: str | None = Field(default=None, description="Direct URL to source")


# --- Query & Response ---


class RetrievedChunk(BaseModel):
    """A chunk retrieved from vector search."""

    text: str
    score: float
    source_title: str
    source_id: str
    source_url: str | None = None
    domain: Domain
    drug_names: list[str] = Field(default_factory=list)
    section_title: str | None = None


class ChatQuery(BaseModel):
    """Incoming chat query from a user."""

    question: str = Field(description="The user's question")
    domain_filter: Domain | None = Field(default=None, description="Optional domain filter")
    session_id: str | None = Field(default=None, description="Chat session ID")


class ChatResponse(BaseModel):
    """Response to a chat query."""

    answer: str = Field(description="The generated answer")
    citations: list[RetrievedChunk] = Field(description="Source chunks used")
    confidence: float = Field(description="Confidence score 0-1")
    domains_searched: list[Domain] = Field(description="Domains that were searched")
    query_time_ms: int = Field(description="Total query time in milliseconds")


# --- Drug Mapping ---


class DrugMapping(BaseModel):
    """Mapping between brand and generic drug names."""

    generic: str = Field(description="Generic drug name (e.g., 'dapagliflozin')")
    brands: list[str] = Field(description="Brand names (e.g., ['Farxiga'])")
    drug_class: str = Field(description="Drug class (e.g., 'SGLT2 inhibitor')")
    domains: list[Domain] = Field(description="Related clinical domains")
    aliases: list[str] = Field(default_factory=list, description="Other names/abbreviations")


class DrugMappingRegistry(BaseModel):
    """Complete drug name mapping registry."""

    version: str = "1.0"
    last_updated: str = Field(default_factory=lambda: datetime.now().isoformat())
    drugs: list[DrugMapping] = Field(default_factory=list)


# --- Self-Update ---


class FreshnessReport(BaseModel):
    """Report on content freshness."""

    total_chunks: int
    fresh_count: int
    stale_count: int
    stale_chunks: list[dict] = Field(default_factory=list)
    report_date: str = Field(default_factory=lambda: datetime.now().isoformat())


class GapReport(BaseModel):
    """Report on knowledge gaps detected from user queries."""

    period_start: str
    period_end: str
    total_queries: int
    low_confidence_queries: list[dict] = Field(default_factory=list)
    no_result_queries: list[str] = Field(default_factory=list)
    suggested_topics: list[str] = Field(default_factory=list)
