"""Request models for the Content Engine API."""

from pydantic import BaseModel, Field


class ThemeInfo(BaseModel):
    monthly: str = Field(description="Monthly theme name")
    weekly: str = Field(description="Weekly sub-theme name")
    daily_focus: str | None = Field(default=None, description="Optional daily focus area")


class AiToolInfo(BaseModel):
    name: str = Field(description="Tool name (e.g., 'Perplexity')")
    url: str = Field(description="Tool URL (e.g., 'perplexity.ai')")


class ContentAssignments(BaseModel):
    systems_concept: str = Field(description="Pre-selected systems thinking concept")
    medication: str = Field(description="Pre-selected medication generic name")
    dyk_category: str = Field(description="Pre-selected Did You Know category")
    ai_beginner_topic: str = Field(description="Pre-selected AI beginner topic")
    ai_advanced_tool: AiToolInfo = Field(description="Pre-selected advanced AI tool")


class DedupMemory(BaseModel):
    recent_quotes_authors: list[str] = Field(default_factory=list)
    recent_nephrology_events: list[str] = Field(default_factory=list)


class DateInfoRequest(BaseModel):
    month_name: str
    day_of_month: int
    month: int
    year: int
    iso_date: str


class ExternalContext(BaseModel):
    nephrology_search: str | None = None
    medication_api_data: dict | None = None


class GenerateRequest(BaseModel):
    """Request to generate all 6 content sections."""

    date_info: DateInfoRequest
    theme: ThemeInfo
    assignments: ContentAssignments
    memory: DedupMemory = Field(default_factory=DedupMemory)
    external_context: ExternalContext | None = None


class ThemePlanRequest(BaseModel):
    """Request to generate monthly/weekly theme plan."""

    year: int
    month: int
    healthcare_observances: list[str] = Field(default_factory=list)
    engagement_data: dict | None = None


class DrugEnrichRequest(BaseModel):
    """Request to enrich a drug entry from external APIs."""

    generic_name: str
    sources: list[str] = Field(default=["openfda", "dailymed", "rxnorm"])
