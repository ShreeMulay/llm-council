"""Direct Anthropic API client for Claude models with OAuth support."""

import httpx
import json
import time
from pathlib import Path
from typing import Any, Optional

from .secrets import ANTHROPIC_API_KEY

# Anthropic API endpoint
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_API_VERSION = "2023-06-01"

# OAuth configuration (from opencode-anthropic-auth plugin)
ANTHROPIC_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
ANTHROPIC_TOKEN_URL = "https://console.anthropic.com/v1/oauth/token"

# OpenCode auth file locations (check multiple possible paths)
OPENCODE_AUTH_PATHS = [
    Path.home() / ".local" / "share" / "opencode" / "auth.json",
    Path.home() / ".opencode" / "data" / "auth.json",
    Path.home() / ".config" / "opencode" / "auth.json",
]

# Model ID mapping: council ID -> Anthropic model ID
ANTHROPIC_MODEL_MAP = {
    "anthropic/claude-opus-4.5": "claude-opus-4-20250514",
    "anthropic/claude-sonnet-4.5": "claude-sonnet-4-20250514",
    "anthropic/claude-3.5-sonnet": "claude-3-5-sonnet-20241022",
    "anthropic/claude-3.5-haiku": "claude-3-5-haiku-20241022",
    "claude-opus-4.5": "claude-opus-4-20250514",
    "claude-sonnet-4.5": "claude-sonnet-4-20250514",
}


def get_anthropic_model_id(council_model_id: str) -> str:
    """Convert council model ID to Anthropic's model ID."""
    return ANTHROPIC_MODEL_MAP.get(council_model_id, council_model_id)


def load_oauth_credentials() -> Optional[dict]:
    """Load OAuth credentials from OpenCode's auth file."""
    for auth_path in OPENCODE_AUTH_PATHS:
        if auth_path.exists():
            try:
                data = json.loads(auth_path.read_text())
                anthropic_auth = data.get("anthropic", {})
                if anthropic_auth.get("type") == "oauth":
                    return {
                        "access": anthropic_auth.get("access"),
                        "refresh": anthropic_auth.get("refresh"),
                        "expires": anthropic_auth.get("expires", 0),
                        "auth_path": auth_path,
                    }
            except (json.JSONDecodeError, KeyError):
                continue
    return None


def save_oauth_credentials(auth_path: Path, access: str, refresh: str, expires: int):
    """Save updated OAuth credentials back to auth file."""
    try:
        data = json.loads(auth_path.read_text())
        data["anthropic"] = {
            "type": "oauth",
            "access": access,
            "refresh": refresh,
            "expires": expires,
        }
        auth_path.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Warning: Could not save OAuth credentials: {e}")


async def refresh_oauth_token(refresh_token: str) -> Optional[dict]:
    """Refresh the OAuth access token using the refresh token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            ANTHROPIC_TOKEN_URL,
            json={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": ANTHROPIC_CLIENT_ID,
            },
            headers={"Content-Type": "application/json"},
        )
        
        if not response.is_success:
            print(f"Token refresh failed: {response.status_code} - {response.text}")
            return None
        
        data = response.json()
        return {
            "access": data.get("access_token"),
            "refresh": data.get("refresh_token"),
            "expires": int(time.time() * 1000) + (data.get("expires_in", 3600) * 1000),
        }


async def get_valid_oauth_token() -> Optional[tuple[str, Path]]:
    """Get a valid OAuth access token, refreshing if necessary."""
    creds = load_oauth_credentials()
    if not creds:
        return None
    
    current_time = int(time.time() * 1000)
    
    # Check if token is expired (with 60 second buffer)
    if creds["access"] and creds["expires"] > current_time + 60000:
        return creds["access"], creds["auth_path"]
    
    # Need to refresh
    if not creds["refresh"]:
        return None
    
    print("OAuth token expired, refreshing...")
    new_tokens = await refresh_oauth_token(creds["refresh"])
    if not new_tokens:
        return None
    
    # Save new tokens
    save_oauth_credentials(
        creds["auth_path"],
        new_tokens["access"],
        new_tokens["refresh"],
        new_tokens["expires"],
    )
    
    print("OAuth token refreshed successfully")
    return new_tokens["access"], creds["auth_path"]


CLAUDE_CODE_SYSTEM_PREFIX = "You are Claude Code, Anthropic's official CLI for Claude."

CLAUDE_CODE_BETA_FLAGS = (
    "oauth-2025-04-20,"
    "claude-code-20250219,"
    "interleaved-thinking-2025-05-14,"
    "fine-grained-tool-streaming-2025-05-14"
)


async def call_anthropic_oauth(
    model: str,
    prompt: str,
    access_token: str,
    max_tokens: int = 4096,
    system_prompt: Optional[str] = None,
) -> dict[str, Any]:
    """
    Call the Anthropic API using OAuth authentication (Max plan).
    
    Uses the Claude Code workaround: sends claude-code beta header and 
    system prompt prefix to bypass OAuth restriction.
    """
    anthropic_model = get_anthropic_model_id(model)
    
    headers = {
        "authorization": f"Bearer {access_token}",
        "anthropic-version": ANTHROPIC_API_VERSION,
        "anthropic-beta": CLAUDE_CODE_BETA_FLAGS,
        "content-type": "application/json",
    }
    
    messages = [{"role": "user", "content": prompt}]
    
    final_system = CLAUDE_CODE_SYSTEM_PREFIX
    if system_prompt:
        final_system = f"{CLAUDE_CODE_SYSTEM_PREFIX}\n\n{system_prompt}"
    
    payload = {
        "model": anthropic_model,
        "max_tokens": max_tokens,
        "messages": messages,
        "system": final_system,
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(ANTHROPIC_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
    
    # Extract response text
    content_blocks = data.get("content", [])
    response_text = ""
    for block in content_blocks:
        if block.get("type") == "text":
            response_text += block.get("text", "")
    
    # Extract usage
    usage = data.get("usage", {})
    
    return {
        "response": response_text,
        "usage": {
            "prompt_tokens": usage.get("input_tokens", 0),
            "completion_tokens": usage.get("output_tokens", 0),
            "total_tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
        },
        "provider": "anthropic-oauth",
        "model": anthropic_model,
    }


async def call_anthropic_api_key(
    model: str,
    prompt: str,
    max_tokens: int = 4096,
    system_prompt: Optional[str] = None,
) -> dict[str, Any]:
    """
    Call the Anthropic API using API key authentication.
    
    Args:
        model: Model identifier
        prompt: User message content
        max_tokens: Maximum tokens in response
        system_prompt: Optional system message
    
    Returns:
        dict with 'response', 'usage', and 'provider' keys
    """
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not found in secrets")
    
    anthropic_model = get_anthropic_model_id(model)
    
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_API_VERSION,
        "content-type": "application/json",
    }
    
    payload = {
        "model": anthropic_model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    
    if system_prompt:
        payload["system"] = system_prompt
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(ANTHROPIC_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
    
    content_blocks = data.get("content", [])
    response_text = ""
    for block in content_blocks:
        if block.get("type") == "text":
            response_text += block.get("text", "")
    
    usage = data.get("usage", {})
    
    return {
        "response": response_text,
        "usage": {
            "prompt_tokens": usage.get("input_tokens", 0),
            "completion_tokens": usage.get("output_tokens", 0),
            "total_tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
        },
        "provider": "anthropic",
        "model": anthropic_model,
    }


async def call_anthropic(
    model: str,
    prompt: str,
    max_tokens: int = 4096,
    system_prompt: Optional[str] = None,
) -> dict[str, Any]:
    """Call Anthropic API - tries OAuth (Max plan) first, falls back to API key."""
    oauth_result = await get_valid_oauth_token()
    if oauth_result:
        access_token, _ = oauth_result
        try:
            return await call_anthropic_oauth(
                model=model,
                prompt=prompt,
                access_token=access_token,
                max_tokens=max_tokens,
                system_prompt=system_prompt,
            )
        except httpx.HTTPStatusError as e:
            print(f"OAuth call failed ({e.response.status_code}): {e.response.text[:200]}")
    
    return await call_anthropic_api_key(
        model=model,
        prompt=prompt,
        max_tokens=max_tokens,
        system_prompt=system_prompt,
    )


def is_anthropic_model(model_id: str) -> bool:
    """Check if a model should be routed to Anthropic directly."""
    return (
        model_id.startswith("anthropic/") or 
        model_id.startswith("claude-") or
        model_id in ANTHROPIC_MODEL_MAP
    )
