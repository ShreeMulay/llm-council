"""
Quote content generator.

Uses Gemini 3.1 Flash-Lite for simple quote selection.
Ensures quote thematically connects to the day's systems concept.
"""

from app.models.responses import Quote
from app.generators.vertex_client import generate_json, GEMINI_31_FLASH_LITE
from app.prompts.quote import build_prompt


async def generate_quote(
    systems_concept: str,
    banned_authors: list[str] | None = None,
) -> tuple[Quote, str]:
    """
    Generate a wisdom quote connected to today's systems concept.

    Args:
        systems_concept: Today's systems thinking concept
        banned_authors: Authors used recently (avoid repeats)

    Returns:
        Tuple of (Quote, model_id)
    """
    prompt = build_prompt(systems_concept, banned_authors or [])

    data, model_id = await generate_json(
        prompt=prompt,
        model_id=GEMINI_31_FLASH_LITE,
        response_model=Quote,
        thinking_level="minimal",
        temperature=0.5,
    )

    result = Quote.model_validate(data)

    # Enforce: author must not be in banned list
    if banned_authors and result.author in banned_authors:
        raise ValueError(f"Generated quote from banned author: {result.author}")

    return result, model_id
