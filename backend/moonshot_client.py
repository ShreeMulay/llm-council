"""Moonshot API client for direct queries to Kimi models."""

import httpx
from typing import List, Dict, Any, Optional

from .secrets import MOONSHOT_API_KEY

MOONSHOT_API_URL = "https://api.moonshot.ai/v1"

# Model ID mapping: council ID -> Moonshot model ID
MOONSHOT_MODEL_MAP = {
    "moonshot/kimi-k2.5": "kimi-k2.5",
    "kimi-k2.5": "kimi-k2.5",
}


def get_moonshot_model_id(council_model_id: str) -> str:
    """Convert council model ID to Moonshot's model ID."""
    return MOONSHOT_MODEL_MAP.get(council_model_id, council_model_id.replace("moonshot/", ""))


async def query_moonshot_model(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    timeout: float = 900.0
) -> Optional[Dict[str, Any]]:
    """Query a Moonshot model directly via OpenAI-compatible API."""
    if not MOONSHOT_API_KEY:
        print("Error: MOONSHOT_API_KEY not configured")
        return None

    moonshot_model = get_moonshot_model_id(model_id)

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                f"{MOONSHOT_API_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {MOONSHOT_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": moonshot_model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    # Kimi K2.5 only allows temperature=1
                    "temperature": 1.0 if "k2.5" in moonshot_model else temperature,
                }
            )
            response.raise_for_status()
            data = response.json()

            msg = data["choices"][0]["message"]
            # Kimi K2.5 is a thinking model: output may be in reasoning_content
            text = msg.get("content") or msg.get("reasoning_content") or ""
            return {
                "content": text,
                "usage": data.get("usage", {}),
                "model": model_id,
                "provider": "moonshot"
            }
        except httpx.HTTPStatusError as e:
            print(f"HTTP error querying Moonshot {model_id}: {e.response.status_code} - {e.response.text[:200]}")
            return None
        except Exception as e:
            print(f"Error querying Moonshot {model_id}: {e}")
            return None
