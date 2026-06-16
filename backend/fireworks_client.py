"""Fireworks AI client for high-throughput inference of open-source models.

Fireworks provides an OpenAI-compatible API for selected direct-provider models.

Used as primary provider for: Kimi K2.6. Legacy explicit Fireworks GLM IDs remain
available, with OpenRouter fallback to their Z.ai equivalents.
"""

import asyncio
from typing import Any

import httpx

from .secrets import FIREWORKS_API_KEY

FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1"

# Model ID mapping: council ID -> Fireworks model ID
# Fireworks uses accounts/fireworks/models/<name> format
# GLM-5.1 uses "glm-5p1" slug on Fireworks (not "glm-5.1")
FIREWORKS_MODEL_MAP = {
    "fireworks/glm-5.1": "accounts/fireworks/models/glm-5p1",
    "fireworks/glm-5": "accounts/fireworks/models/glm-5",
    "fireworks/kimi-k2.6": "accounts/fireworks/models/kimi-k2p6",
    # Allow direct Fireworks IDs to pass through
    "accounts/fireworks/models/glm-5p1": "accounts/fireworks/models/glm-5p1",
    "accounts/fireworks/models/glm-5": "accounts/fireworks/models/glm-5",
    "accounts/fireworks/models/kimi-k2p6": "accounts/fireworks/models/kimi-k2p6",
}


def get_fireworks_model_id(council_model_id: str) -> str:
    """Convert council model ID to Fireworks model ID."""
    return FIREWORKS_MODEL_MAP.get(council_model_id, council_model_id)


async def query_fireworks_model(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    timeout: float = 900.0,
) -> dict[str, Any] | None:
    """
    Query a model via Fireworks AI's OpenAI-compatible API.

    Args:
        model_id: Council model ID (will be mapped to Fireworks ID)
        messages: Chat messages in OpenAI format
        max_tokens: Maximum output tokens
        temperature: Sampling temperature
        timeout: Request timeout in seconds

    Returns:
        Dict with 'content', 'usage', 'model', 'provider' keys, or None on error
    """
    import logging

    logger = logging.getLogger("llm-council.fireworks")

    if not FIREWORKS_API_KEY:
        logger.error("FIREWORKS_API_KEY not configured")
        return None

    fireworks_model = get_fireworks_model_id(model_id)

    # Fireworks requires stream=true for max_tokens > 4096 (non-streaming).
    # Cap at 4096 for non-streaming requests to avoid 400 errors.
    effective_max_tokens = min(max_tokens, 4096)
    logger.info(
        f"Querying Fireworks {model_id} -> {fireworks_model} "
        f"(max_tokens={effective_max_tokens})"
    )

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                f"{FIREWORKS_API_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {FIREWORKS_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": fireworks_model,
                    "messages": messages,
                    "max_tokens": effective_max_tokens,
                    "temperature": temperature,
                },
            )
            response.raise_for_status()
            data = response.json()

            msg = data["choices"][0]["message"]
            text = msg.get("content") or ""
            reasoning = msg.get("reasoning_content") or ""
            # GLM-5/5.1 puts most output in reasoning_content; combine if content is sparse.
            # GLM-5.1 has thinking mode ON by default, so this merging is critical.
            if reasoning and len(text) < 50:
                text = text + "\n\n" + reasoning if text else reasoning
            logger.info(
                f"Fireworks {model_id} responded: {len(text)} chars (reasoning: {len(reasoning)} chars)"
            )
            return {
                "content": text,
                "usage": data.get("usage", {}),
                "model": model_id,
                "provider": "fireworks",
            }
        except httpx.HTTPStatusError as e:
            logger.error(
                f"HTTP error querying Fireworks {model_id}: "
                f"{e.response.status_code} - {e.response.text[:200]}"
            )
            return None
        except Exception as e:
            logger.error(f"Error querying Fireworks {model_id}: {e}", exc_info=True)
            return None


async def query_fireworks_single(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int,
    temperature: float = 0.7,
) -> tuple[str, dict[str, Any] | None]:
    """Query single Fireworks model and return (model_id, result) tuple."""
    result = await query_fireworks_model(model_id, messages, max_tokens, temperature)
    return model_id, result


async def query_fireworks_models_parallel(
    model_ids: list[str],
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
) -> dict[str, dict[str, Any] | None]:
    """Query multiple Fireworks models in parallel."""
    tasks = [
        query_fireworks_single(m, messages, max_tokens, temperature) for m in model_ids
    ]
    results_list = await asyncio.gather(*tasks)
    return dict(results_list)
