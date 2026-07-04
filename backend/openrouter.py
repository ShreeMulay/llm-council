"""OpenRouter API client for making LLM requests."""

import asyncio
from typing import Any

import httpx

from .config import (
    OPENROUTER_API_URL,
    OPENROUTER_MODELS_URL,
    get_model_reasoning_effort,
)
from .secrets import OPENROUTER_API_KEY


async def query_model(
    model: str,
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    timeout: float = 900.0,
    reasoning_effort: str | None = None,
    allow_fallbacks: bool = True,
) -> dict[str, Any] | None:
    """
    Query a single model via OpenRouter API.

    Args:
        model: OpenRouter model identifier (e.g., "openai/gpt-4o")
        messages: List of message dicts with 'role' and 'content'
        max_tokens: Maximum output tokens
        temperature: Sampling temperature
        timeout: Request timeout in seconds
        reasoning_effort: Override reasoning effort (e.g., "high", "medium", "xhigh").
                         If None, uses config default for the model.
        allow_fallbacks: Whether OpenRouter may silently route to fallback providers.

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
        "X-Title": "LLM Council",
    }

    payload = build_chat_payload(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        reasoning_effort=reasoning_effort,
        allow_fallbacks=allow_fallbacks,
    )

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OPENROUTER_API_URL, headers=headers, json=payload
            )
            response.raise_for_status()

            data = response.json()
            choice = data["choices"][0]
            message = choice["message"]

            return {
                "content": message.get("content") or "",
                "finish_reason": choice.get("finish_reason"),
                "native_finish_reason": choice.get("native_finish_reason"),
                "reasoning": message.get("reasoning") or "",
                "reasoning_details": message.get("reasoning_details"),
                "usage": data.get("usage", {}),
                "model": model,
                "provider": "openrouter",
            }

    except httpx.HTTPStatusError as e:
        print(
            f"HTTP error querying OpenRouter {model}: {e.response.status_code} - {e.response.text}"
        )
        return None
    except httpx.RequestError as e:
        print(f"Request error querying OpenRouter {model}: {e}")
        return None
    except Exception as e:
        print(f"Error querying model {model}: {e}")
        return None


def build_chat_payload(
    model: str,
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    reasoning_effort: str | None = None,
    allow_fallbacks: bool = True,
) -> dict[str, Any]:
    """Build an OpenRouter chat payload with explicit fallback control."""
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "provider": {
            "allow_fallbacks": allow_fallbacks,
        },
    }

    # Add reasoning_effort if configured for this model (e.g., GPT-5.5 Thinking,
    # Fable 5 high, Opus 4.8 xhigh). Supports per-call override for dual-mode models.
    effective_reasoning = reasoning_effort or get_model_reasoning_effort(model)
    if effective_reasoning:
        payload["reasoning_effort"] = effective_reasoning
        # When reasoning effort matters, prefer the native provider. Some
        # providers (e.g., Amazon Bedrock for Anthropic models) silently drop
        # the reasoning_effort parameter, which defeats the purpose.
        # Tested Apr 17 2026: Bedrock returned ~1000 tokens for all efforts,
        # while Anthropic native honored xhigh (1320 vs 1145 for high).
        # allow_fallbacks defaults to true for production council calls but can
        # be disabled by benchmark mode so unsupported efforts are not hidden.
        if model.startswith("anthropic/"):
            payload["provider"]["order"] = ["anthropic"]
        elif model.startswith("openai/"):
            payload["provider"]["order"] = ["openai"]

    return payload


async def query_models_parallel(
    models: list[str],
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
) -> dict[str, dict[str, Any] | None]:
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

    async def query_single(model: str) -> tuple[str, dict[str, Any] | None]:
        result = await query_model(model, messages, max_tokens, temperature)
        return model, result

    tasks = [query_single(model) for model in models]
    results = await asyncio.gather(*tasks)

    return dict(results)


async def list_openrouter_models() -> list[dict[str, Any]]:
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
            response = await client.get(OPENROUTER_MODELS_URL, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
    except Exception as e:
        print(f"Error listing OpenRouter models: {e}")
        return []
