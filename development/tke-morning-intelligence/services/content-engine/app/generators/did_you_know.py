"""
Did You Know content generator.

Uses Gemini 3.1 Flash-Lite for simple fact generation.
"""

from app.models.responses import DidYouKnow
from app.generators.vertex_client import generate_json, GEMINI_31_FLASH_LITE
from app.prompts.did_you_know import build_prompt


async def generate_did_you_know(
    category: str,
) -> tuple[DidYouKnow, str]:
    """
    Generate a fascinating fact for the assigned category.

    Args:
        category: Pre-selected DYK category (e.g., "Kidney Anatomy")

    Returns:
        Tuple of (DidYouKnow, model_id)
    """
    prompt = build_prompt(category)

    data, model_id = await generate_json(
        prompt=prompt,
        model_id=GEMINI_31_FLASH_LITE,
        response_model=DidYouKnow,
        thinking_level="low",
        temperature=0.5,
    )

    result = DidYouKnow.model_validate(data)

    # Enforce: category must match assignment
    result.category = category

    return result, model_id
