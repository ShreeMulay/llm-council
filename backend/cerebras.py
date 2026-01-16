"""Cerebras API client for direct queries to Cerebras inference."""

import httpx
from typing import List, Dict, Any, Optional
import asyncio

from .secrets import CEREBRAS_API_KEY

# Cerebras API base URL
CEREBRAS_API_URL = "https://api.cerebras.ai/v1"


async def query_cerebras_model(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 4096,
    temperature: float = 0.7,
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
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
        print("Error: CEREBRAS_API_KEY not configured")
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
            
            return {
                "content": data["choices"][0]["message"]["content"],
                "usage": data.get("usage", {}),
                "model": model_id,
                "provider": "cerebras"
            }
        except httpx.HTTPStatusError as e:
            print(f"HTTP error querying Cerebras {model_id}: {e.response.status_code} - {e.response.text}")
            return None
        except httpx.RequestError as e:
            print(f"Request error querying Cerebras {model_id}: {e}")
            return None
        except Exception as e:
            print(f"Error querying Cerebras {model_id}: {e}")
            return None


async def query_cerebras_models_parallel(
    model_ids: List[str],
    messages: List[Dict[str, str]],
    max_tokens: int = 4096,
    temperature: float = 0.7
) -> Dict[str, Optional[Dict[str, Any]]]:
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
    async def query_single(model_id: str) -> tuple[str, Optional[Dict[str, Any]]]:
        result = await query_cerebras_model(
            model_id, messages, max_tokens, temperature
        )
        return model_id, result
    
    tasks = [query_single(model_id) for model_id in model_ids]
    results = await asyncio.gather(*tasks)
    
    return {model_id: result for model_id, result in results}


async def list_cerebras_models() -> List[Dict[str, Any]]:
    """
    List available models from Cerebras API.
    
    Returns:
        List of model objects with id, owned_by, etc.
    """
    if not CEREBRAS_API_KEY:
        print("Error: CEREBRAS_API_KEY not configured")
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
            print(f"Error listing Cerebras models: {e}")
            return []
