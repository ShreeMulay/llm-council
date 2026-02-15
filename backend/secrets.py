"""Load secrets from ~/.bash_secrets for API keys."""

import subprocess
from pathlib import Path
from typing import Optional


def load_bash_secrets() -> dict:
    """
    Source ~/.bash_secrets and extract environment variables.
    
    Returns:
        dict: API keys and secrets extracted from bash_secrets
    
    Raises:
        FileNotFoundError: If bash_secrets file doesn't exist
        subprocess.CalledProcessError: If sourcing fails
    """
    bash_secrets_path = Path.home() / ".bash_secrets"
    
    if not bash_secrets_path.exists():
        raise FileNotFoundError(f"bash_secrets not found at {bash_secrets_path}")
    
    # Source the file and capture exported variables
    result = subprocess.run(
        ["bash", "-c", f"source {bash_secrets_path} && env"],
        capture_output=True,
        text=True,
        check=True
    )
    
    secrets = {}
    for line in result.stdout.splitlines():
        if "=" in line:
            key, _, value = line.partition("=")
            # Only keep relevant API keys
            if key in (
                "OPENROUTER_API_KEY",
                "CEREBRAS_API_KEY",
                "ANTHROPIC_API_KEY",
                "MOONSHOT_API_KEY",
                "GROK_API_KEY",
                "GEMINI_API_KEY",
                "GOOGLE_AI_API_KEY",
            ):
                secrets[key] = value
    
    return secrets


# Initialize secrets on module load
_secrets: dict = {}

try:
    _secrets = load_bash_secrets()
except FileNotFoundError as e:
    print(f"Warning: {e}")
except subprocess.CalledProcessError as e:
    print(f"Warning: Failed to load bash_secrets: {e}")


def get_secret(key: str) -> Optional[str]:
    """
    Get a secret by key.
    
    Args:
        key: The secret key name
    
    Returns:
        The secret value or None if not found
    """
    return _secrets.get(key)


# Export API keys as module-level constants
OPENROUTER_API_KEY: Optional[str] = _secrets.get("OPENROUTER_API_KEY")
CEREBRAS_API_KEY: Optional[str] = _secrets.get("CEREBRAS_API_KEY")
ANTHROPIC_API_KEY: Optional[str] = _secrets.get("ANTHROPIC_API_KEY")
MOONSHOT_API_KEY: Optional[str] = _secrets.get("MOONSHOT_API_KEY")
GROK_API_KEY: Optional[str] = _secrets.get("GROK_API_KEY")
GEMINI_API_KEY: Optional[str] = _secrets.get("GEMINI_API_KEY") or _secrets.get("GOOGLE_AI_API_KEY")


def validate_required_keys() -> None:
    """
    Validate that all required API keys are present.
    
    Raises:
        ValueError: If a required key is missing
    """
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not found in bash_secrets")
    if not CEREBRAS_API_KEY:
        raise ValueError("CEREBRAS_API_KEY not found in bash_secrets")


# Validate on import
try:
    validate_required_keys()
except ValueError as e:
    print(f"Warning: {e}")
