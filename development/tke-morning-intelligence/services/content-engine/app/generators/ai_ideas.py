"""
AI Ideas content generator.

Uses Gemini 3.1 Flash-Lite for structured template output.
Generates beginner (ChatGPT) and advanced (various tools) AI tips.
"""

from app.models.responses import AiIdeas
from app.generators.vertex_client import generate_json, GEMINI_31_FLASH_LITE
from app.prompts.ai_ideas import build_prompt


async def generate_ai_ideas(
    beginner_topic: str,
    advanced_tool: dict,
) -> tuple[AiIdeas, str]:
    """
    Generate AI literacy content with beginner and advanced sections.

    Args:
        beginner_topic: Pre-selected beginner topic
        advanced_tool: Pre-selected advanced tool {name, url}

    Returns:
        Tuple of (AiIdeas, model_id)
    """
    prompt = build_prompt(beginner_topic, advanced_tool)

    data, model_id = await generate_json(
        prompt=prompt,
        model_id=GEMINI_31_FLASH_LITE,
        response_model=AiIdeas,
        thinking_level="minimal",
        temperature=0.4,
    )

    result = AiIdeas.model_validate(data)

    # Enforce: beginner must use ChatGPT, advanced must use assigned tool
    result.beginner.title = beginner_topic
    result.beginner.toolName = "ChatGPT"
    result.beginner.toolUrl = "chat.openai.com"
    result.advanced.toolName = advanced_tool["name"]
    result.advanced.toolUrl = advanced_tool["url"]

    return result, model_id
