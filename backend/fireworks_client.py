"""Fireworks AI client for high-throughput inference of open-source models.

Fireworks provides an OpenAI-compatible API for selected direct-provider models.

Used as primary provider for: Kimi K2.6. Legacy explicit Fireworks GLM IDs remain
available, with OpenRouter fallback to their Z.ai equivalents.
"""

import asyncio
import json
from typing import Any

import httpx

from .secrets import FIREWORKS_API_KEY

FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1"
SPARSE_VISIBLE_CONTENT_THRESHOLD = 50

# Model ID mapping: council ID -> Fireworks model ID
# Fireworks uses accounts/fireworks/models/<name> format
# GLM-5.1 uses "glm-5p1" slug on Fireworks (not "glm-5.1")
FIREWORKS_MODEL_MAP = {
    "fireworks/glm-5.2": "accounts/fireworks/models/glm-5p2",
    "fireworks/glm-5.1": "accounts/fireworks/models/glm-5p1",
    "fireworks/glm-5": "accounts/fireworks/models/glm-5",
    "fireworks/kimi-k2.6": "accounts/fireworks/models/kimi-k2p6",
    "fireworks/kimi-k2.7-code": "accounts/fireworks/models/kimi-k2p7-code",
    # Allow direct Fireworks IDs to pass through
    "accounts/fireworks/models/glm-5p2": "accounts/fireworks/models/glm-5p2",
    "accounts/fireworks/models/glm-5p1": "accounts/fireworks/models/glm-5p1",
    "accounts/fireworks/models/glm-5": "accounts/fireworks/models/glm-5",
    "accounts/fireworks/models/kimi-k2p6": "accounts/fireworks/models/kimi-k2p6",
    "accounts/fireworks/models/kimi-k2p7-code": "accounts/fireworks/models/kimi-k2p7-code",
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
    reasoning_effort: str | None = None,
) -> dict[str, Any] | None:
    """
    Query a model via Fireworks AI's OpenAI-compatible API.

    Args:
        model_id: Council model ID (will be mapped to Fireworks ID)
        messages: Chat messages in OpenAI format
        max_tokens: Maximum output tokens
        temperature: Sampling temperature
        timeout: Request timeout in seconds
        reasoning_effort: Optional reasoning effort for Fireworks models that support it

    Returns:
        Dict with 'content', 'usage', 'model', 'provider' keys, or None on error
    """
    import logging

    logger = logging.getLogger("llm-council.fireworks")

    if not FIREWORKS_API_KEY:
        logger.error("FIREWORKS_API_KEY not configured")
        return None

    fireworks_model = get_fireworks_model_id(model_id)

    use_streaming = max_tokens > 4096
    logger.info(
        f"Querying Fireworks {model_id} -> {fireworks_model} "
        f"(max_tokens={max_tokens}, stream={use_streaming})"
    )

    payload: dict[str, Any] = {
        "model": fireworks_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if reasoning_effort:
        payload["reasoning_effort"] = reasoning_effort
    if use_streaming:
        payload["stream"] = True

    headers = {
        "Authorization": f"Bearer {FIREWORKS_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            if use_streaming:
                async with client.stream(
                    "POST",
                    f"{FIREWORKS_API_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    data = await _parse_streaming_response(response)

                text = _merge_sparse_reasoning(
                    data["visible_content"],
                    data["reasoning_content"],
                    ordered_text=data["ordered_content"],
                )
                result = {
                    "content": text,
                    "usage": data.get("usage", {}),
                    "model": model_id,
                    "provider": "fireworks",
                }
                if data.get("finish_reason") is not None:
                    result["finish_reason"] = data["finish_reason"]
                if data.get("native_finish_reason") is not None:
                    result["native_finish_reason"] = data["native_finish_reason"]
                logger.info(
                    f"Fireworks {model_id} streamed: {len(text)} chars "
                    f"(reasoning: {len(data['reasoning_content'])} chars)"
                )
                return result

            response = await client.post(
                f"{FIREWORKS_API_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            msg = data["choices"][0]["message"]
            text = msg.get("content") or ""
            reasoning = msg.get("reasoning_content") or ""
            text = _merge_sparse_reasoning(text, reasoning)
            logger.info(
                f"Fireworks {model_id} responded: {len(text)} chars (reasoning: {len(reasoning)} chars)"
            )
            result = {
                "content": text,
                "usage": data.get("usage", {}),
                "model": model_id,
                "provider": "fireworks",
            }
            choice = data.get("choices", [{}])[0]
            if choice.get("finish_reason") is not None:
                result["finish_reason"] = choice.get("finish_reason")
            if choice.get("native_finish_reason") is not None:
                result["native_finish_reason"] = choice.get("native_finish_reason")
            return result
        except httpx.HTTPStatusError as e:
            logger.error(
                f"HTTP error querying Fireworks {model_id}: "
                f"{e.response.status_code} - {e.response.text[:200]}"
            )
            return None
        except Exception as e:
            logger.error(f"Error querying Fireworks {model_id}: {e}", exc_info=True)
            return None


def _merge_sparse_reasoning(
    text: str, reasoning: str, ordered_text: str | None = None
) -> str:
    """Merge reasoning into sparse visible content for GLM thinking responses."""
    # GLM-5/5.1/5.2 can put most output in reasoning_content; combine when visible
    # output is sparse so callers still receive a useful response body.
    if reasoning and len(text) < SPARSE_VISIBLE_CONTENT_THRESHOLD:
        if ordered_text:
            return ordered_text
        return text + "\n\n" + reasoning if text else reasoning
    return text


async def _parse_streaming_response(response: Any) -> dict[str, Any]:
    """Parse OpenAI-compatible Fireworks SSE chat completion chunks."""
    visible_parts: list[str] = []
    reasoning_parts: list[str] = []
    ordered_parts: list[str] = []
    usage: dict[str, Any] = {}
    finish_reason: str | None = None
    native_finish_reason: str | None = None

    async for line in response.aiter_lines():
        if not line:
            continue
        line = line.strip()
        if not line.startswith("data: "):
            continue

        payload = line.removeprefix("data: ").strip()
        if payload == "[DONE]":
            break

        try:
            chunk = json.loads(payload)
        except json.JSONDecodeError:
            continue

        if isinstance(chunk.get("usage"), dict):
            usage = chunk["usage"]

        choices = chunk.get("choices") or []
        if not choices:
            continue

        choice = choices[0]
        delta = choice.get("delta") or {}
        reasoning = delta.get("reasoning_content")
        content = delta.get("content")
        if reasoning:
            reasoning_parts.append(reasoning)
            ordered_parts.append(reasoning)
        if content:
            visible_parts.append(content)
            ordered_parts.append(content)
        if choice.get("finish_reason") is not None:
            finish_reason = choice.get("finish_reason")
        if choice.get("native_finish_reason") is not None:
            native_finish_reason = choice.get("native_finish_reason")

    return {
        "visible_content": "".join(visible_parts),
        "reasoning_content": "".join(reasoning_parts),
        "ordered_content": "".join(ordered_parts),
        "usage": usage,
        "finish_reason": finish_reason,
        "native_finish_reason": native_finish_reason,
    }


async def query_fireworks_single(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int,
    temperature: float = 0.7,
    reasoning_effort: str | None = None,
) -> tuple[str, dict[str, Any] | None]:
    """Query single Fireworks model and return (model_id, result) tuple."""
    result = await query_fireworks_model(
        model_id,
        messages,
        max_tokens=max_tokens,
        temperature=temperature,
        reasoning_effort=reasoning_effort,
    )
    return model_id, result


async def query_fireworks_models_parallel(
    model_ids: list[str],
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    reasoning_effort: str | None = None,
) -> dict[str, dict[str, Any] | None]:
    """Query multiple Fireworks models in parallel."""
    tasks = [
        query_fireworks_single(
            m, messages, max_tokens, temperature, reasoning_effort=reasoning_effort
        )
        for m in model_ids
    ]
    results_list = await asyncio.gather(*tasks)
    return dict(results_list)
