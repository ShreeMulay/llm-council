"""OpenRouter API client for making LLM requests."""

import httpx
import asyncio
from typing import List, Dict, Any, Optional

from .secrets import OPENROUTER_API_KEY
from .config import OPENROUTER_API_URL, OPENROUTER_MODELS_URL


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 4096,
    temperature: float = 0.7,
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via OpenRouter API.

    Args:
        model: OpenRouter model identifier (e.g., "openai/gpt-4o")
        messages: List of message dicts with 'role' and 'content'
        max_tokens: Maximum output tokens
        temperature: Sampling temperature
        timeout: Request timeout in seconds

    Returns:
        Response dict with 'content', 'usage', 'model', 'provider' or None if failed
    """
    if not OPENROUTER_API_KEY:
        print("Error: OPENROUTER_API_KEY not configured")
        return None

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8800",
        "X-Title": "LLM Council"
    }

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            message = data['choices'][0]['message']

            return {
                'content': message.get('content', ''),
                'reasoning_details': message.get('reasoning_details'),
                'usage': data.get('usage', {}),
                'model': model,
                'provider': 'openrouter'
            }

    except httpx.HTTPStatusError as e:
        print(f"HTTP error querying OpenRouter {model}: {e.response.status_code} - {e.response.text}")
        return None
    except httpx.RequestError as e:
        print(f"Request error querying OpenRouter {model}: {e}")
        return None
    except Exception as e:
        print(f"Error querying model {model}: {e}")
        return None


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]],
    max_tokens: int = 4096,
    temperature: float = 0.7
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models in parallel via OpenRouter.

    Args:
        models: List of OpenRouter model identifiers
        messages: List of message dicts to send to each model
        max_tokens: Maximum output tokens
        temperature: Sampling temperature

    Returns:
        Dict mapping model identifier to response dict (or None if failed)
    """
    async def query_single(model: str) -> tuple[str, Optional[Dict[str, Any]]]:
        result = await query_model(model, messages, max_tokens, temperature)
        return model, result

    tasks = [query_single(model) for model in models]
    results = await asyncio.gather(*tasks)

    return {model: response for model, response in results}


async def list_openrouter_models() -> List[Dict[str, Any]]:
    """
    List available models from OpenRouter API.

    Returns:
        List of model objects with id, name, pricing, context_length, etc.
    """
    if not OPENROUTER_API_KEY:
        print("Error: OPENROUTER_API_KEY not configured")
        return []

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                OPENROUTER_MODELS_URL,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
    except Exception as e:
        print(f"Error listing OpenRouter models: {e}")
        return []
