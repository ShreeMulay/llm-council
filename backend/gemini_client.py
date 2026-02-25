"""Google Gemini API client for direct queries."""

import httpx
from typing import List, Dict, Any, Optional

from .secrets import GEMINI_API_KEY

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"

GEMINI_MODEL_MAP = {
    "google/gemini-3-flash": "gemini-2.0-flash",
    "google/gemini-3-flash-preview": "gemini-2.0-flash",
    "google/gemini-3-pro-preview": "gemini-2.0-flash",
    "google/gemini-3.1-pro-preview": "gemini-2.0-flash",
    "google/gemini-2.0-flash": "gemini-2.0-flash",
}


def get_gemini_model_id(council_model_id: str) -> str:
    return GEMINI_MODEL_MAP.get(
        council_model_id, council_model_id.replace("google/", "")
    )


def convert_messages_to_gemini(messages: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    contents = []
    for msg in messages:
        role = msg.get("role", "user")
        if role == "assistant":
            role = "model"
        elif role == "system":
            continue
        contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
    return contents


async def query_gemini_model(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    timeout: float = 900.0,
) -> Optional[Dict[str, Any]]:
    if not GEMINI_API_KEY:
        print("Error: GEMINI_API_KEY not configured")
        return None

    gemini_model = get_gemini_model_id(model_id)
    contents = convert_messages_to_gemini(messages)

    system_text = None
    for msg in messages:
        if msg.get("role") == "system":
            system_text = msg.get("content", "")
            break

    payload: Dict[str, Any] = {
        "contents": contents,
        "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature},
    }
    if system_text:
        payload["systemInstruction"] = {"parts": [{"text": system_text}]}

    url = f"{GEMINI_BASE}/models/{gemini_model}:generateContent"

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                url,
                params={"key": GEMINI_API_KEY},
                headers={"Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            candidates = data.get("candidates", [])
            if not candidates:
                print(f"Gemini {model_id}: no candidates in response")
                return None

            parts = candidates[0].get("content", {}).get("parts", [])
            text = "".join(p.get("text", "") for p in parts)
            usage_meta = data.get("usageMetadata", {})

            return {
                "content": text,
                "usage": {
                    "prompt_tokens": usage_meta.get("promptTokenCount", 0),
                    "completion_tokens": usage_meta.get("candidatesTokenCount", 0),
                    "total_tokens": usage_meta.get("totalTokenCount", 0),
                },
                "model": model_id,
                "provider": "gemini",
            }
        except httpx.HTTPStatusError as e:
            print(
                f"HTTP error querying Gemini {model_id}: {e.response.status_code} - {e.response.text[:200]}"
            )
            return None
        except Exception as e:
            print(f"Error querying Gemini {model_id}: {e}")
            return None
