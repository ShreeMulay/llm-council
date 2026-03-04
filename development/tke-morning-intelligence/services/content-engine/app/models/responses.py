"""Response models for the Content Engine API.

These Pydantic models mirror the Zod schemas in the pipeline service.
They serve as validation for LLM outputs - if the LLM returns invalid
data, Pydantic catches it before delivery.
"""

from pydantic import BaseModel, Field


class SystemsThinking(BaseModel):
    concept: str = Field(min_length=1)
    emoji: str = Field(min_length=1, max_length=4)
    coreIdea: str = Field(min_length=10)
    nephrologyExample: str = Field(min_length=20)
    todayChallenge: str = Field(min_length=10)
    reflectionQuestion: str = Field(min_length=10)


class Quote(BaseModel):
    quote: str = Field(min_length=10)
    author: str = Field(min_length=2)
    authorRole: str = Field(min_length=2)
    source: str = Field(min_length=2)
    connectionToTheme: str = Field(min_length=10)


class NephrologyHistory(BaseModel):
    event: str = Field(min_length=10)
    year: str = Field(pattern=r"^\d{4}$")
    emoji: str = Field(min_length=1, max_length=4)
    significance: str = Field(min_length=10)
    funFact: str = Field(min_length=10)


class AiBeginner(BaseModel):
    title: str = Field(min_length=5)
    toolName: str = "ChatGPT"
    toolUrl: str = "chat.openai.com"
    emoji: str = Field(min_length=1, max_length=4)
    prompt: str = Field(min_length=10)
    expectedResult: str = Field(min_length=10)
    timeSaved: str = Field(min_length=3)


class AiAdvanced(BaseModel):
    toolName: str = Field(min_length=2)
    toolUrl: str = Field(min_length=4)
    emoji: str = Field(min_length=1, max_length=4)
    useCase: str = Field(min_length=10)
    howToStart: str = Field(min_length=10)
    proTip: str = Field(min_length=10)


class AiIdeas(BaseModel):
    beginner: AiBeginner
    advanced: AiAdvanced


class DidYouKnow(BaseModel):
    category: str = Field(min_length=3)
    emoji: str = Field(min_length=1, max_length=4)
    fact: str = Field(min_length=20)
    source: str = Field(min_length=3)
    whyItMatters: str = Field(min_length=10)


class Medication(BaseModel):
    genericName: str = Field(min_length=3)
    brandName: str = Field(min_length=2)
    drugClass: str = Field(min_length=3)
    emoji: str = "💊"
    primaryUse: str = Field(min_length=10)
    howItWorks: str = Field(min_length=20)
    renalDosing: str = Field(min_length=10)
    pearlForPractice: str = Field(min_length=10)
    commonSideEffects: list[str] = Field(min_length=3, max_length=6)
    patientCounselingPoint: str = Field(min_length=10)


class ContentMeta(BaseModel):
    models_used: dict[str, str] = Field(default_factory=dict)
    generation_time_ms: int = 0
    validation_errors: list[str] = Field(default_factory=list)


class GenerateResponse(BaseModel):
    """Complete response with all 6 content sections."""

    systems_thinking: SystemsThinking | None = None
    quote: Quote | None = None
    nephrology_history: NephrologyHistory | None = None
    ai_ideas: AiIdeas | None = None
    did_you_know: DidYouKnow | None = None
    medication: Medication | None = None
    meta: ContentMeta = Field(default_factory=ContentMeta)
