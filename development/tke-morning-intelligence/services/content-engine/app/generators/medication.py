"""
Medication Spotlight content generator.

Uses Gemini 3 Flash for accuracy-critical drug education.
When available, enriches with real API data from OpenFDA/DailyMed
to ensure mechanism and side effects are factually correct.

KEY IMPROVEMENT over n8n: Drug mechanisms come from API data,
not LLM generation. The LLM only writes the narrative around
verified facts.
"""

from app.models.responses import Medication
from app.generators.vertex_client import generate_json, GEMINI_3_FLASH
from app.prompts.medication import build_prompt


async def generate_medication(
    generic_name: str,
    medication_api_data: dict | None = None,
) -> tuple[Medication, str]:
    """
    Generate medication spotlight content.

    Args:
        generic_name: Pre-selected medication generic name
        medication_api_data: Optional enrichment data from drug APIs
            Contains verified mechanism, side effects, dosing from
            DailyMed/OpenFDA/RxNorm (not LLM-generated)

    Returns:
        Tuple of (Medication, model_id)
    """
    prompt = build_prompt(generic_name, medication_api_data)

    data, model_id = await generate_json(
        prompt=prompt,
        model_id=GEMINI_3_FLASH,
        response_model=Medication,
        thinking_level="low",
        temperature=0.2,  # Low temperature for accuracy
    )

    result = Medication.model_validate(data)

    # Enforce: generic name must match assignment
    result.genericName = generic_name

    # If we have API data, override LLM-generated fields with verified data
    if medication_api_data:
        if "mechanism" in medication_api_data:
            result.howItWorks = medication_api_data["mechanism"]
        if "brand_names" in medication_api_data:
            result.brandName = ", ".join(medication_api_data["brand_names"])
        if "drug_class" in medication_api_data:
            result.drugClass = medication_api_data["drug_class"]
        if "side_effects" in medication_api_data:
            result.commonSideEffects = medication_api_data["side_effects"][:6]

    return result, model_id
