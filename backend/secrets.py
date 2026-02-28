"""Load API keys from environment variables (Cloud Run) or ~/.bash_secrets (local dev).

Resolution order for each key:
  1. Environment variable (set by Cloud Run via Secret Manager)
  2. ~/.bash_secrets file (local development)

This allows the same code to run in both environments without changes.
"""

import logging
import os
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger("llm-council.secrets")

# All API keys the council uses
_API_KEY_NAMES = (
    "OPENROUTER_API_KEY",
    "CEREBRAS_API_KEY",
    "ANTHROPIC_API_KEY",
    "MOONSHOT_API_KEY",
    "GROK_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_AI_API_KEY",
    "FIREWORKS_API_KEY",
    "COUNCIL_API_KEY",
)


def _load_from_env() -> dict:
    """Load API keys from environment variables (Cloud Run / container mode)."""
    secrets = {}
    for key in _API_KEY_NAMES:
        value = os.environ.get(key)
        if value:
            secrets[key] = value
    return secrets


def _load_from_bash_secrets() -> dict:
    """Load API keys from ~/.bash_secrets (local development mode)."""
    bash_secrets_path = Path.home() / ".bash_secrets"

    if not bash_secrets_path.exists():
        return {}

    try:
        result = subprocess.run(
            ["bash", "-c", f"source {bash_secrets_path} && env"],
            capture_output=True,
            text=True,
            check=True,
        )
    except subprocess.CalledProcessError as e:
        logger.warning("Failed to source ~/.bash_secrets: %s", e)
        return {}

    secrets = {}
    for line in result.stdout.splitlines():
        if "=" in line:
            key, _, value = line.partition("=")
            if key in _API_KEY_NAMES:
                secrets[key] = value

    return secrets


def _load_secrets() -> dict:
    """Load secrets: env vars first, then fill gaps from ~/.bash_secrets."""
    secrets = _load_from_env()
    env_count = len(secrets)

    if env_count >= 3:
        # Enough keys from env — likely running in Cloud Run
        logger.info("Loaded %d API keys from environment variables", env_count)
        return secrets

    # Fill gaps from bash_secrets (local dev mode)
    bash_secrets = _load_from_bash_secrets()
    for key, value in bash_secrets.items():
        if key not in secrets:
            secrets[key] = value

    if bash_secrets:
        logger.info(
            "Loaded %d keys from env, %d from ~/.bash_secrets",
            env_count,
            len(secrets) - env_count,
        )
    elif env_count > 0:
        logger.info("Loaded %d API keys from environment variables", env_count)
    else:
        logger.warning("No API keys found in env or ~/.bash_secrets")

    return secrets


# Initialize secrets on module load
_secrets: dict = _load_secrets()


def get_secret(key: str) -> Optional[str]:
    """Get a secret by key name."""
    return _secrets.get(key)


# Export API keys as module-level constants for backward compatibility
OPENROUTER_API_KEY: Optional[str] = _secrets.get("OPENROUTER_API_KEY")
CEREBRAS_API_KEY: Optional[str] = _secrets.get("CEREBRAS_API_KEY")
ANTHROPIC_API_KEY: Optional[str] = _secrets.get("ANTHROPIC_API_KEY")
MOONSHOT_API_KEY: Optional[str] = _secrets.get("MOONSHOT_API_KEY")
GROK_API_KEY: Optional[str] = _secrets.get("GROK_API_KEY")
GEMINI_API_KEY: Optional[str] = _secrets.get("GEMINI_API_KEY") or _secrets.get(
    "GOOGLE_AI_API_KEY"
)
FIREWORKS_API_KEY: Optional[str] = _secrets.get("FIREWORKS_API_KEY")
COUNCIL_API_KEY: Optional[str] = _secrets.get("COUNCIL_API_KEY")


def validate_required_keys() -> None:
    """Validate that minimum required API keys are present."""
    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY not found — OpenRouter fallback disabled")


# Validate on import
validate_required_keys()
