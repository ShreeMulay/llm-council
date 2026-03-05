"""
NephMadness 2026 bracket write-up generator.

Uses Gemini 3 Flash for accurate, engaging tournament write-ups.
Active only during March 2026.
"""

from pydantic import BaseModel, Field

from app.generators.vertex_client import generate_json, GEMINI_3_FLASH
from app.prompts.nephmadness import build_region_prompt, build_prediction_prompt


class NephMadnessWriteup(BaseModel):
    headline: str = Field(min_length=5, max_length=80)
    body: str = Field(min_length=50, max_length=600)
    callToAction: str = Field(min_length=10, max_length=120)


async def generate_nephmadness_region(
    region_name: str,
    team_a: str,
    team_b: str,
    blurb: str,
    phase: str,
    phase_description: str,
    bracket_url: str,
) -> tuple[NephMadnessWriteup, str]:
    """Generate a region/matchup write-up."""
    prompt = build_region_prompt(
        region_name=region_name,
        team_a=team_a,
        team_b=team_b,
        blurb=blurb,
        phase=phase,
        phase_description=phase_description,
        bracket_url=bracket_url,
    )

    data, model_id = await generate_json(
        prompt=prompt,
        model_id=GEMINI_3_FLASH,
        response_model=NephMadnessWriteup,
        thinking_level="low",
        temperature=0.6,
    )

    return NephMadnessWriteup.model_validate(data), model_id


async def generate_nephmadness_prediction(
    all_regions: list[dict],
    phase_description: str,
    bracket_url: str,
) -> tuple[NephMadnessWriteup, str]:
    """Generate a cross-region prediction/analysis."""
    prompt = build_prediction_prompt(
        all_regions=all_regions,
        phase_description=phase_description,
        bracket_url=bracket_url,
    )

    data, model_id = await generate_json(
        prompt=prompt,
        model_id=GEMINI_3_FLASH,
        response_model=NephMadnessWriteup,
        thinking_level="low",
        temperature=0.6,
    )

    return NephMadnessWriteup.model_validate(data), model_id
