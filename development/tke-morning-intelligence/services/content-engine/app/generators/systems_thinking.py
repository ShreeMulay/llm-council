"""
Systems Thinking content generator.

Uses Gemini 3.1 Pro for complex abstract reasoning about systems concepts
applied to nephrology practice.
"""

from app.models.responses import SystemsThinking
from app.generators.vertex_client import generate_json, GEMINI_31_PRO
from app.prompts.systems_thinking import build_prompt


async def generate_systems_thinking(
    concept: str,
    theme: "dict | object | None" = None,
) -> tuple[SystemsThinking, str]:
    """
    Generate systems thinking content for the assigned concept.

    Args:
        concept: The systems concept to explain (e.g., "Feedback Loops")
        theme: Optional theme context for cross-section coherence

    Returns:
        Tuple of (SystemsThinking, model_id)
    """
    prompt = build_prompt(concept, theme)

    data, model_id = await generate_json(
        prompt=prompt,
        model_id=GEMINI_31_PRO,
        response_model=SystemsThinking,
        thinking_level="medium",
        temperature=0.3,
    )

    result = SystemsThinking.model_validate(data)

    # Enforce: concept name must match assignment
    result.concept = concept

    return result, model_id
