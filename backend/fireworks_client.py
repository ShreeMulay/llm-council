"""Fireworks AI client for high-throughput inference of open-source models.

Fireworks provides OpenAI-compatible API with optimized inference (up to 200 tok/s
on Kimi K2.5, 3.4x faster than OpenRouter for long-form responses).

Used as primary provider for: Kimi K2.5, GLM-5
Fallback: OpenRouter
"""

import asyncio
import httpx
from typing import List, Dict, Any, Optional, Tuple

from .secrets import FIREWORKS_API_KEY

FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1"

# Model ID mapping: council ID -> Fireworks model ID
# Fireworks uses accounts/fireworks/models/<name> format
FIREWORKS_MODEL_MAP = {
    "fireworks/kimi-k2.5": "accounts/fireworks/models/kimi-k2p5",
    "fireworks/glm-5": "accounts/fireworks/models/glm-5",
    # Allow direct Fireworks IDs to pass through
    "accounts/fireworks/models/kimi-k2p5": "accounts/fireworks/models/kimi-k2p5",
    "accounts/fireworks/models/glm-5": "accounts/fireworks/models/glm-5",
}


def get_fireworks_model_id(council_model_id: str) -> str:
    """Convert council model ID to Fireworks model ID."""
    return FIREWORKS_MODEL_MAP.get(council_model_id, council_model_id)


async def query_fireworks_model(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    timeout: float = 900.0,
) -> Optional[Dict[str, Any]]:
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
    if not FIREWORKS_API_KEY:
        print("Error: FIREWORKS_API_KEY not configured")
        return None

    fireworks_model = get_fireworks_model_id(model_id)

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
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
            )
            response.raise_for_status()
            data = response.json()

            msg = data["choices"][0]["message"]
            text = msg.get("content") or ""
            return {
                "content": text,
                "usage": data.get("usage", {}),
                "model": model_id,
                "provider": "fireworks",
            }
        except httpx.HTTPStatusError as e:
            print(
                f"HTTP error querying Fireworks {model_id}: "
                f"{e.response.status_code} - {e.response.text[:200]}"
            )
            return None
        except Exception as e:
            print(f"Error querying Fireworks {model_id}: {e}")
            return None


async def query_fireworks_single(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int,
    temperature: float = 0.7,
) -> Tuple[str, Optional[Dict[str, Any]]]:
    """Query single Fireworks model and return (model_id, result) tuple."""
    result = await query_fireworks_model(model_id, messages, max_tokens, temperature)
    return model_id, result


async def query_fireworks_models_parallel(
    model_ids: List[str],
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
) -> Dict[str, Optional[Dict[str, Any]]]:
    """Query multiple Fireworks models in parallel."""
    tasks = [
        query_fireworks_single(m, messages, max_tokens, temperature) for m in model_ids
    ]
    results_list = await asyncio.gather(*tasks)
    return dict(results_list)
