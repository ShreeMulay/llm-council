"""Cerebras API client for direct queries to Cerebras inference."""

import asyncio
import logging
from typing import Any

import httpx

from .secrets import CEREBRAS_API_KEY

# Cerebras API base URL
CEREBRAS_API_URL = "https://api.cerebras.ai/v1"
logger = logging.getLogger("llm-council.cerebras")


async def query_cerebras_model(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    timeout: float = 900.0
) -> dict[str, Any] | None:
    """
    Query a Cerebras model directly.

    Args:
        model_id: Cerebras model ID (e.g., "zai-glm-4.7")
        messages: OpenAI-style message list
        max_tokens: Maximum output tokens
        temperature: Sampling temperature
        timeout: Request timeout in seconds

    Returns:
        Response dict with content, usage, model or None on error
    """
    if not CEREBRAS_API_KEY:
        logger.error("CEREBRAS_API_KEY not configured")
        return None

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                f"{CEREBRAS_API_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {CEREBRAS_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_id,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }
            )
            response.raise_for_status()
            data = response.json()

            msg = data["choices"][0]["message"]
            # GLM 4.7 may return 'reasoning' instead of 'content' for short outputs
            text = msg.get("content") or msg.get("reasoning") or ""
            return {
                "content": text,
                "usage": data.get("usage", {}),
                "model": model_id,
                "provider": "cerebras"
            }
        except httpx.HTTPStatusError as e:
            logger.warning("HTTP error querying Cerebras %s: %s", model_id, e.response.status_code)
            return None
        except httpx.RequestError as e:
            logger.warning("Request error querying Cerebras %s: %s", model_id, e)
            return None
        except Exception as e:
            logger.warning("Error querying Cerebras %s: %s", model_id, e)
            return None


async def query_cerebras_models_parallel(
    model_ids: list[str],
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7
) -> dict[str, dict[str, Any] | None]:
    """
    Query multiple Cerebras models in parallel.

    Args:
        model_ids: List of Cerebras model IDs
        messages: Messages to send to all models
        max_tokens: Maximum output tokens
        temperature: Sampling temperature

    Returns:
        Dict mapping model_id to response (or None on error)
    """
    async def query_single(model_id: str) -> tuple[str, dict[str, Any] | None]:
        result = await query_cerebras_model(
            model_id, messages, max_tokens, temperature
        )
        return model_id, result

    tasks = [query_single(model_id) for model_id in model_ids]
    results = await asyncio.gather(*tasks)

    return dict(results)


async def list_cerebras_models() -> list[dict[str, Any]]:
    """
    List available models from Cerebras API.

    Returns:
        List of model objects with id, owned_by, etc.
    """
    if not CEREBRAS_API_KEY:
        logger.error("CEREBRAS_API_KEY not configured")
        return []

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{CEREBRAS_API_URL}/models",
                headers={
                    "Authorization": f"Bearer {CEREBRAS_API_KEY}",
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
        except Exception as e:
            logger.warning("Error listing Cerebras models: %s", e)
            return []
