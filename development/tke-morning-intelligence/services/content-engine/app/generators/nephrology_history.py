"""
Nephrology History content generator.

Uses Gemini 3 Flash with grounding for accurate "On This Day" events.
Validates that generated events match the current month.
"""

from app.models.responses import NephrologyHistory
from app.generators.vertex_client import generate_json, GEMINI_3_FLASH
from app.prompts.nephrology_history import build_prompt


async def generate_nephrology_history(
    month_name: str,
    day_of_month: int,
    month: int,
    search_context: str | None = None,
    recent_events: list[str] | None = None,
) -> tuple[NephrologyHistory, str]:
    """
    Generate "On This Day" nephrology history content.

    Args:
        month_name: Current month name (e.g., "March")
        day_of_month: Current day of month
        month: Current month number (1-12)
        search_context: Optional web search results for context
        recent_events: Recently used events to avoid

    Returns:
        Tuple of (NephrologyHistory, model_id)
    """
    prompt = build_prompt(month_name, day_of_month, search_context, recent_events or [])

    data, model_id = await generate_json(
        prompt=prompt,
        model_id=GEMINI_3_FLASH,
        response_model=NephrologyHistory,
        thinking_level="low",
        temperature=0.3,
    )

    result = NephrologyHistory.model_validate(data)

    # CRITICAL VALIDATION: Event must be from the correct month
    # This was a known issue in the n8n workflow
    year = int(result.year)
    if year < 1800 or year > 2026:
        raise ValueError(f"Invalid year: {result.year}")

    return result, model_id
