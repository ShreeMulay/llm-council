"""xAI API client for direct queries to Grok models."""

import logging
from collections.abc import Mapping
from typing import Any

import httpx

from .provider_errors import XAIInvalidUsageError
from .secrets import GROK_API_KEY

logger = logging.getLogger("llm-council.xai")

XAI_API_URL = "https://api.x.ai/v1"

# Model ID mapping: council ID -> xAI API model ID
# Note: xAI API uses hyphens (grok-4-1-fast-reasoning), not dots (grok-4.1-fast)
XAI_MODEL_MAP = {
    "x-ai/grok-4": "grok-4-0709",
    "x-ai/grok-4-fast": "grok-4-fast-reasoning",
    "x-ai/grok-4.1-fast": "grok-4-1-fast-non-reasoning",
    "x-ai/grok-4.1-fast-reasoning": "grok-4-1-fast-reasoning",
    "x-ai/grok-4.20-0309-reasoning": "grok-4.20-0309-reasoning",
    "x-ai/grok-4.20-0309-non-reasoning": "grok-4.20-0309-non-reasoning",
    "x-ai/grok-4.20-multi-agent-0309": "grok-4.20-multi-agent-0309",
    "x-ai/grok-4.3": "grok-4.3",
    "grok-4": "grok-4-0709",
}


def get_xai_model_id(council_model_id: str) -> str:
    """Convert council model ID to xAI's model ID."""
    return XAI_MODEL_MAP.get(council_model_id, council_model_id.replace("x-ai/", ""))


def normalize_xai_usage(usage: object) -> dict[str, Any]:
    """Validate xAI usage and include hidden reasoning in billed completion."""
    if not isinstance(usage, Mapping):
        raise XAIInvalidUsageError

    required = ("prompt_tokens", "completion_tokens", "total_tokens")
    if any(key not in usage for key in required):
        raise XAIInvalidUsageError

    for key in required:
        value = usage[key]
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise XAIInvalidUsageError

    prompt_tokens = usage["prompt_tokens"]
    completion_tokens = usage["completion_tokens"]
    total_tokens = usage["total_tokens"]
    if total_tokens < prompt_tokens + completion_tokens:
        raise XAIInvalidUsageError

    normalized = dict(usage)
    normalized["completion_tokens"] = total_tokens - prompt_tokens
    return normalized


async def query_xai_model(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    timeout: float = 300.0,
) -> dict[str, Any] | None:
    """Query an xAI Grok model directly via OpenAI-compatible API.

    Prompt caching is automatic on xAI — repeated prefixes in messages
    are cached at $0.20/M (10% of standard input rate). No special
    parameters needed.
    """
    if not GROK_API_KEY:
        logger.error("GROK_API_KEY not configured")
        return None

    xai_model = get_xai_model_id(model_id)

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                f"{XAI_API_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": xai_model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
            )
            response.raise_for_status()
            data = response.json()

            return {
                "content": data["choices"][0]["message"]["content"],
                "usage": normalize_xai_usage(data.get("usage")),
                "model": model_id,
                "provider": "xai",
            }
        except XAIInvalidUsageError:
            logger.error("xAI request failed category=invalid_usage model=%s", model_id)
            raise
        except httpx.HTTPStatusError as e:
            logger.error(
                "xAI request failed category=http_status status=%s model=%s",
                e.response.status_code,
                model_id,
            )
            return None
        except httpx.TimeoutException:
            logger.error("xAI request failed category=timeout model=%s", model_id)
            return None
        except httpx.RequestError:
            logger.error("xAI request failed category=transport_error model=%s", model_id)
            return None
        except Exception:
            logger.error("xAI request failed category=unexpected_error model=%s", model_id)
            return None
