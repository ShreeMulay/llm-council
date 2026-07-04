"""Anthropic-on-Vertex client for BAA-eligible Claude routes.

Uses Cloud Run ADC/service account auth via the Anthropic SDK Vertex backend.
Never logs prompts or model responses. Fable through this route is PHI-eligible
only in covered Google Cloud projects/services under the configured BAA; the
OpenRouter fallback remains non-PHI/deidentified only.
"""

import asyncio
import logging
from typing import Any

from .config import (
    VERTEX_LOCATION,
    VERTEX_PROJECT_ID,
    get_model_reasoning_effort,
    get_vertex_anthropic_model_id,
)

try:  # pragma: no cover - exercised via monkeypatch in tests when unavailable
    from anthropic import AnthropicVertex
except ImportError:  # pragma: no cover
    AnthropicVertex = None  # type: ignore[assignment]

logger = logging.getLogger("llm-council.vertex_anthropic")


def _extract_text(response: Any) -> str:
    """Extract visible text content from an Anthropic SDK response object/dict."""
    content = response.get("content", []) if isinstance(response, dict) else getattr(response, "content", [])
    parts: list[str] = []

    for block in content or []:
        text = block.get("text") if isinstance(block, dict) else getattr(block, "text", None)
        if text:
            parts.append(str(text))

    return "".join(parts)


def _extract_usage(response: Any) -> dict[str, int]:
    """Normalize Anthropic SDK usage to the shape used by other providers."""
    usage = response.get("usage", {}) if isinstance(response, dict) else getattr(response, "usage", None)
    if usage is None:
        return {}

    input_tokens = usage.get("input_tokens", 0) if isinstance(usage, dict) else getattr(usage, "input_tokens", 0)
    output_tokens = usage.get("output_tokens", 0) if isinstance(usage, dict) else getattr(usage, "output_tokens", 0)
    return {
        "prompt_tokens": input_tokens or 0,
        "completion_tokens": output_tokens or 0,
        "total_tokens": (input_tokens or 0) + (output_tokens or 0),
    }


def _query_vertex_anthropic_sync(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int,
) -> dict[str, Any] | None:
    """Run the sync AnthropicVertex SDK call."""
    if AnthropicVertex is None:
        logger.warning("anthropic[vertex] dependency is not available")
        return None

    if not VERTEX_PROJECT_ID:
        logger.warning("VERTEX_PROJECT_ID/GOOGLE_CLOUD_PROJECT not configured; Vertex Fable disabled")
        return None

    vertex_model = get_vertex_anthropic_model_id(model_id)
    if not vertex_model:
        logger.warning("No Vertex Anthropic model mapping for %s", model_id)
        return None

    client = AnthropicVertex(project_id=VERTEX_PROJECT_ID, region=VERTEX_LOCATION)
    payload: dict[str, Any] = {
        "model": vertex_model,
        "max_tokens": max_tokens,
        "messages": messages,
        "thinking": {"type": "adaptive", "display": "omitted"},
        "output_config": {"effort": get_model_reasoning_effort(model_id) or "high"},
    }

    try:
        response = client.messages.create(**payload)
    except TypeError:
        # Older SDK/provider surfaces may not support thinking/output_config yet.
        fallback_payload = {
            "model": vertex_model,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        response = client.messages.create(**fallback_payload)

    return {
        "content": _extract_text(response),
        "usage": _extract_usage(response),
        "model": model_id,
        "raw_model": vertex_model,
        "provider": "vertex-anthropic",
    }


async def query_vertex_anthropic_model(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
) -> dict[str, Any] | None:
    """Query Claude via Anthropic-on-Vertex using async-compatible wrapping.

    The temperature argument is accepted for interface compatibility with other
    provider clients; the Fable Vertex payload intentionally uses adaptive
    thinking + high output effort instead.
    """
    del temperature
    return await asyncio.to_thread(
        _query_vertex_anthropic_sync,
        model_id,
        messages,
        max_tokens,
    )
