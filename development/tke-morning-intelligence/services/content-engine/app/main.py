"""
TKE Morning Intelligence - Content Engine

FastAPI service for AI content generation using Vertex AI Gemini 3.x models.

Endpoints:
    POST /generate              - Generate all 6 content sections
    POST /plan-themes           - Generate monthly/weekly theme plan
    POST /enrich-drug           - Enrich drug data from external APIs
    POST /update-pharmacopoeia  - Scan for new nephrology drugs
    GET  /health                - Health check
"""

import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel as PydanticBaseModel

from app.models.requests import (
    GenerateRequest,
    ThemePlanRequest,
    DrugEnrichRequest,
    WeatherQuipRequest,
    NephMadnessRegionRequest,
    NephMadnessPredictionRequest,
)
from app.models.responses import GenerateResponse, ContentMeta
from app.generators.vertex_client import init_client
from app.generators.systems_thinking import generate_systems_thinking
from app.generators.quote import generate_quote
from app.generators.nephrology_history import generate_nephrology_history
from app.generators.ai_ideas import generate_ai_ideas
from app.generators.did_you_know import generate_did_you_know
from app.generators.medication import generate_medication
from app.generators.weather_quip import generate_weather_quip
from app.generators.nephmadness import generate_nephmadness_region, generate_nephmadness_prediction


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Vertex AI client on startup."""
    try:
        init_client()
        print("[Content Engine] Vertex AI client initialized")
    except Exception as e:
        # Don't crash the server if credentials aren't available at startup.
        # The client will be initialized lazily on first /generate call.
        print(f"[Content Engine] Vertex AI init deferred: {e}")
    yield
    print("[Content Engine] Shutting down...")


app = FastAPI(
    title="TKE Morning Intelligence - Content Engine",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "content-engine"}


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest) -> GenerateResponse:
    """Generate all 6 content sections in parallel."""
    start_time = time.time()
    errors: list[str] = []
    models_used: dict[str, str] = {}

    # Run all generators concurrently
    results = await asyncio.gather(
        generate_systems_thinking(
            concept=request.assignments.systems_concept,
            theme=request.theme,
        ),
        generate_quote(
            systems_concept=request.assignments.systems_concept,
            banned_authors=request.memory.recent_quotes_authors,
        ),
        generate_nephrology_history(
            month_name=request.date_info.month_name,
            day_of_month=request.date_info.day_of_month,
            month=request.date_info.month,
            search_context=request.external_context.nephrology_search if request.external_context else None,
            recent_events=request.memory.recent_nephrology_events,
        ),
        generate_ai_ideas(
            beginner_topic=request.assignments.ai_beginner_topic,
            advanced_tool=request.assignments.ai_advanced_tool,
        ),
        generate_did_you_know(
            category=request.assignments.dyk_category,
        ),
        generate_medication(
            generic_name=request.assignments.medication,
            medication_api_data=request.external_context.medication_api_data if request.external_context else None,
        ),
        return_exceptions=True,
    )

    # Process results, collecting errors
    section_names = [
        "systems_thinking",
        "quote",
        "nephrology_history",
        "ai_ideas",
        "did_you_know",
        "medication",
    ]

    sections: dict[str, PydanticBaseModel | None] = {}
    for name, result in zip(section_names, results):
        if isinstance(result, BaseException):
            errors.append(f"{name}: {result!s}")
            sections[name] = None
        else:
            content, model = result  # type: ignore[misc]
            sections[name] = content
            models_used[name] = model

    # Validate we have minimum required sections
    if sections.get("systems_thinking") is None and sections.get("medication") is None:
        raise HTTPException(
            status_code=500,
            detail=f"Critical sections failed: {errors}",
        )

    generation_time_ms = int((time.time() - start_time) * 1000)

    return GenerateResponse(
        systems_thinking=sections.get("systems_thinking"),
        quote=sections.get("quote"),
        nephrology_history=sections.get("nephrology_history"),
        ai_ideas=sections.get("ai_ideas"),
        did_you_know=sections.get("did_you_know"),
        medication=sections.get("medication"),
        meta=ContentMeta(
            models_used=models_used,
            generation_time_ms=generation_time_ms,
            validation_errors=errors,
        ),
    )


@app.post("/generate-weather-quip")
async def weather_quip(request: WeatherQuipRequest):
    """Generate a fun weather one-liner for weekend cards."""
    try:
        result, model_id = await generate_weather_quip(
            temp_f=request.temp_f,
            description=request.description,
            day_name=request.day_name,
        )
        return {"quip": result.quip, "model": model_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weather quip generation failed: {e!s}")


@app.post("/generate-nephmadness")
async def nephmadness(request: NephMadnessRegionRequest):
    """Generate a NephMadness region/matchup write-up."""
    try:
        result, model_id = await generate_nephmadness_region(
            region_name=request.region_name,
            team_a=request.team_a,
            team_b=request.team_b,
            blurb=request.blurb,
            phase=request.phase,
            phase_description=request.phase_description,
            bracket_url=request.bracket_url,
        )
        return {
            "headline": result.headline,
            "body": result.body,
            "callToAction": result.callToAction,
            "model": model_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NephMadness generation failed: {e!s}")


@app.post("/generate-nephmadness-prediction")
async def nephmadness_prediction(request: NephMadnessPredictionRequest):
    """Generate a NephMadness cross-region prediction."""
    try:
        result, model_id = await generate_nephmadness_prediction(
            all_regions=request.all_regions,
            phase_description=request.phase_description,
            bracket_url=request.bracket_url,
        )
        return {
            "headline": result.headline,
            "body": result.body,
            "callToAction": result.callToAction,
            "model": model_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NephMadness prediction failed: {e!s}")


@app.post("/plan-themes")
async def plan_themes(request: ThemePlanRequest):
    """Generate monthly/weekly theme plan. Called weekly by Cloud Scheduler."""
    # TODO: Phase 2 - Implement theme planning
    raise HTTPException(status_code=501, detail="Theme planning not yet implemented")


@app.post("/enrich-drug")
async def enrich_drug(request: DrugEnrichRequest):
    """Enrich drug data from OpenFDA/DailyMed/RxNorm."""
    # TODO: Phase 2 - Implement drug enrichment
    raise HTTPException(status_code=501, detail="Drug enrichment not yet implemented")


@app.post("/update-pharmacopoeia")
async def update_pharmacopoeia():
    """Scan for new nephrology drug approvals. Called weekly."""
    # TODO: Phase 5 - Implement auto-update
    raise HTTPException(status_code=501, detail="Pharmacopoeia auto-update not yet implemented")
