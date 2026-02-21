"""xAI API client for direct queries to Grok models."""

import httpx
from typing import List, Dict, Any, Optional

from .secrets import GROK_API_KEY

XAI_API_URL = "https://api.x.ai/v1"

# Model ID mapping: council ID -> xAI model ID
XAI_MODEL_MAP = {
    "x-ai/grok-4": "grok-4",
    "x-ai/grok-4-fast": "grok-4-fast",
    "x-ai/grok-4.1-fast": "grok-4.1-fast",
    "grok-4": "grok-4",
}


def get_xai_model_id(council_model_id: str) -> str:
    """Convert council model ID to xAI's model ID."""
    return XAI_MODEL_MAP.get(council_model_id, council_model_id.replace("x-ai/", ""))


async def query_xai_model(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    timeout: float = 900.0
) -> Optional[Dict[str, Any]]:
    """Query an xAI Grok model directly via OpenAI-compatible API."""
    if not GROK_API_KEY:
        print("Error: GROK_API_KEY not configured")
        return None

    xai_model = get_xai_model_id(model_id)

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                f"{XAI_API_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": xai_model,
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
                "provider": "xai"
            }
        except httpx.HTTPStatusError as e:
            print(f"HTTP error querying xAI {model_id}: {e.response.status_code} - {e.response.text[:200]}")
            return None
        except Exception as e:
            print(f"Error querying xAI {model_id}: {e}")
            return None
