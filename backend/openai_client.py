"""Direct OpenAI API client for GPT models with Codex OAuth support."""

import httpx
import json
import time
from pathlib import Path
from typing import Any, Optional

# OpenAI API endpoint
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

# OpenCode auth file locations (check multiple possible paths)
OPENCODE_AUTH_PATHS = [
    Path.home() / ".local" / "share" / "opencode" / "auth.json",
    Path.home() / ".opencode" / "data" / "auth.json",
    Path.home() / ".config" / "opencode" / "auth.json",
]

# Model ID mapping: council ID -> OpenAI model ID
OPENAI_MODEL_MAP = {
    "openai/gpt-5.2": "gpt-5.2",
    "openai/gpt-5.1": "gpt-5.1",
    "openai/gpt-4o": "gpt-4o",
    "openai/gpt-4-turbo": "gpt-4-turbo",
}

# Default reasoning effort for council deliberation
DEFAULT_REASONING_EFFORT = "high"


def get_openai_model_id(council_model_id: str) -> str:
    """Convert council model ID to OpenAI's model ID."""
    return OPENAI_MODEL_MAP.get(council_model_id, council_model_id.replace("openai/", ""))


def load_oauth_credentials() -> Optional[dict]:
    """Load OAuth credentials from OpenCode's auth file (tries 'codex' then 'openai')."""
    for auth_path in OPENCODE_AUTH_PATHS:
        if auth_path.exists():
            try:
                data = json.loads(auth_path.read_text())
                # Try 'codex' first (OpenAI Codex OAuth), then 'openai'
                for key in ["codex", "openai"]:
                    openai_auth = data.get(key, {})
                    if openai_auth.get("type") == "oauth":
                        return {
                            "access": openai_auth.get("access"),
                            "refresh": openai_auth.get("refresh"),
                            "expires": openai_auth.get("expires", 0),
                            "auth_path": auth_path,
                            "auth_key": key,
                        }
            except (json.JSONDecodeError, KeyError):
                continue
    return None


def save_oauth_credentials(auth_path: Path, auth_key: str, access: str, refresh: str, expires: int):
    """Save updated OAuth credentials back to auth file."""
    try:
        data = json.loads(auth_path.read_text())
        data[auth_key] = {
            "type": "oauth",
            "access": access,
            "refresh": refresh,
            "expires": expires,
        }
        auth_path.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Warning: Could not save OpenAI OAuth credentials: {e}")


async def refresh_oauth_token(refresh_token: str) -> Optional[dict]:
    """Refresh the OAuth access token using the refresh token."""
    # OpenAI uses a different token endpoint
    token_url = "https://auth.openai.com/oauth/token"
    client_id = "app_EMoamEEZ73f0CkXaXp7hrann"  # OpenAI Codex CLI client ID
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            token_url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        
        if not response.is_success:
            print(f"OpenAI token refresh failed: {response.status_code} - {response.text}")
            return None
        
        data = response.json()
        return {
            "access": data.get("access_token"),
            "refresh": data.get("refresh_token"),
            "expires": int(time.time() * 1000) + (data.get("expires_in", 3600) * 1000),
        }


async def get_valid_oauth_token() -> Optional[tuple[str, Path, str]]:
    """Get a valid OAuth access token, refreshing if necessary.
    
    Returns:
        Tuple of (access_token, auth_path, auth_key) or None
    """
    creds = load_oauth_credentials()
    if not creds:
        return None
    
    current_time = int(time.time() * 1000)
    
    # Check if token is expired (with 60 second buffer)
    if creds["access"] and creds["expires"] > current_time + 60000:
        return creds["access"], creds["auth_path"], creds["auth_key"]
    
    # Need to refresh
    if not creds["refresh"]:
        return None
    
    print("OpenAI OAuth token expired, refreshing...")
    new_tokens = await refresh_oauth_token(creds["refresh"])
    if not new_tokens:
        return None
    
    # Save new tokens
    save_oauth_credentials(
        creds["auth_path"],
        creds["auth_key"],
        new_tokens["access"],
        new_tokens["refresh"],
        new_tokens["expires"],
    )
    
    print("OpenAI OAuth token refreshed successfully")
    return new_tokens["access"], creds["auth_path"], creds["auth_key"]


async def call_openai(
    model: str,
    prompt: str,
    max_tokens: int = 4096,
    system_prompt: Optional[str] = None,
    reasoning_effort: str = DEFAULT_REASONING_EFFORT,
) -> dict[str, Any]:
    """
    Call the OpenAI API using Codex OAuth authentication.
    
    Args:
        model: Model identifier (e.g., "openai/gpt-5.2")
        prompt: User message content
        max_tokens: Maximum tokens in response
        system_prompt: Optional system message
        reasoning_effort: Reasoning effort level ("none", "low", "medium", "high", "xhigh")
    
    Returns:
        dict with 'response', 'usage', and 'provider' keys
    """
    oauth_result = await get_valid_oauth_token()
    if not oauth_result:
        raise ValueError("OpenAI OAuth credentials not found. Please authenticate via OpenCode.")
    
    access_token, _, _ = oauth_result
    openai_model = get_openai_model_id(model)
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": openai_model,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    
    # Add reasoning effort for supported models (GPT-5.x)
    if "gpt-5" in openai_model and reasoning_effort != "none":
        payload["reasoning_effort"] = reasoning_effort
    
    async with httpx.AsyncClient(timeout=900.0) as client:
        response = await client.post(OPENAI_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
    
    # Extract response text
    choices = data.get("choices", [])
    response_text = ""
    if choices:
        response_text = choices[0].get("message", {}).get("content", "")
    
    # Extract usage
    usage = data.get("usage", {})
    
    return {
        "response": response_text,
        "usage": {
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        },
        "provider": "openai-oauth",
        "model": openai_model,
    }


def is_openai_model(model_id: str) -> bool:
    """Check if a model should be routed to OpenAI directly."""
    return model_id.startswith("openai/") or model_id in OPENAI_MODEL_MAP
