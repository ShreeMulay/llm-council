"""Configuration for the LLM Council."""

import os
from pathlib import Path

# Import secrets from bash_secrets
from .secrets import (
    OPENROUTER_API_KEY, CEREBRAS_API_KEY, ANTHROPIC_API_KEY,
    MOONSHOT_API_KEY, GROK_API_KEY, GEMINI_API_KEY,
)

# Directories
DATA_DIR = Path("data")
CONVERSATIONS_DIR = DATA_DIR / "conversations"
CACHE_DIR = DATA_DIR / "cache"

# Create directories if they don't exist
CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Caching settings
CACHE_TTL_SECONDS = 86400  # 24 hours
CACHE_FILE = CACHE_DIR / "models.json"

# Server configuration
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8800"))
BACKEND_HOST = os.getenv("BACKEND_HOST", "localhost")

# API endpoints
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
CEREBRAS_MODELS_URL = "https://api.cerebras.ai/v1/models"
MOONSHOT_API_URL = "https://api.moonshot.ai/v1/chat/completions"
XAI_API_URL = "https://api.x.ai/v1/chat/completions"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta"

# Council Models - 7 models for deliberation
# 1. GPT-5.2 via OpenRouter (Anchor/Reasoning)
# 2. Claude Opus 4.6 via Anthropic Direct (Chairman + Lead)
# 3. GLM 4.7 via Cerebras Direct (Tool Specialist)
# 4. Gemini 3 Pro via Google Direct (Generalist)
# 5. Grok 4 via xAI Direct (Real-time Intel)
# 6. Kimi K2.5 via Moonshot Direct (Reasoning)
# 7. DeepSeek V3.1 via OpenRouter (Architect)
# All models fall back to OpenRouter if primary provider fails.
DEFAULT_COUNCIL_MODELS = [
    "openai/gpt-5.2",                  # OpenRouter (Anchor)
    "anthropic/claude-opus-4-6",       # Anthropic Direct (Lead)
    "zai-glm-4.7",                     # Cerebras Direct (Tool Specialist)
    "google/gemini-3-pro",             # Google Direct (Generalist)
    "x-ai/grok-4",                     # xAI Direct (Real-time Intel)
    "moonshot/kimi-k2.5",              # Moonshot Direct (Reasoning)
    "deepseek/deepseek-chat",          # OpenRouter (Architect)
]

# Chairman Model - synthesizes final response
DEFAULT_CHAIRMAN_MODEL = "anthropic/claude-opus-4-6"

# Override via environment
COUNCIL_MODELS = (
    os.getenv("COUNCIL_MODELS", "").split(",")
    if os.getenv("COUNCIL_MODELS")
    else DEFAULT_COUNCIL_MODELS
)
CHAIRMAN_MODEL = os.getenv("CHAIRMAN_MODEL", "") or DEFAULT_CHAIRMAN_MODEL

# Model providers - which models go to which API
CEREBRAS_MODEL_IDS = [
    "zai-glm-4.6",
    "zai-glm-4.7",
    "llama3.1-8b",
    "llama-3.3-70b",
    "qwen-3-32b",
    "gpt-oss-120b",
]

MOONSHOT_MODEL_IDS = [
    "moonshot/kimi-k2.5",
    "kimi-k2.5",
]

XAI_MODEL_IDS = [
    "x-ai/grok-4",
    "x-ai/grok-4-fast",
    "x-ai/grok-4.1-fast",
]

GEMINI_DIRECT_MODEL_IDS = [
    "google/gemini-3-flash",
    "google/gemini-3-flash-preview",
    "google/gemini-3-pro",
    "google/gemini-3-pro-preview",
    "google/gemini-2.0-flash",
]

# OpenRouter fallback model ID mapping (council ID -> OpenRouter ID)
OPENROUTER_FALLBACK_MAP = {
    "anthropic/claude-opus-4-6": "anthropic/claude-opus-4-6",
    "zai-glm-4.7": "z-ai/glm-4.7",
    "google/gemini-3-flash": "google/gemini-2.0-flash-001",
    "google/gemini-3-pro": "google/gemini-2.5-pro-preview-06-05",
    "openai/gpt-5.2": "openai/gpt-5.2",
    "x-ai/grok-4": "x-ai/grok-4",
    "moonshot/kimi-k2.5": "moonshotai/kimi-k2.5",
    "deepseek/deepseek-chat": "deepseek/deepseek-chat",
}

# OpenAI models (disabled - Codex OAuth uses Responses API, not Chat Completions)
OPENAI_MODEL_IDS = []

# Model name aliases for convenience (used in /council command)
MODEL_ALIASES = {
    "gpt": "openai/gpt-5.2",
    "opus": "anthropic/claude-opus-4-6",
    "gemini": "google/gemini-3-pro",
    "pro": "google/gemini-3-pro",
    "flash": "google/gemini-3-flash",
    "deepseek": "deepseek/deepseek-chat",
    "glm": "zai-glm-4.7",
    "grok": "x-ai/grok-4",
    "kimi": "moonshot/kimi-k2.5",
    "sonnet": "anthropic/claude-sonnet-4.5",
}


def is_cerebras_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Cerebras."""
    return model_id in CEREBRAS_MODEL_IDS


def is_moonshot_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Moonshot."""
    return model_id in MOONSHOT_MODEL_IDS or model_id.startswith("moonshot/")


def is_xai_model(model_id: str) -> bool:
    """Check if a model ID should be routed to xAI."""
    return model_id in XAI_MODEL_IDS or model_id.startswith("x-ai/")


def is_gemini_direct_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Google Gemini directly."""
    return model_id in GEMINI_DIRECT_MODEL_IDS


def get_openrouter_fallback(model_id: str) -> str | None:
    """Get the OpenRouter model ID for fallback routing."""
    return OPENROUTER_FALLBACK_MAP.get(model_id)


def is_openai_model(model_id: str) -> bool:
    """Check if a model ID should be routed to OpenAI directly."""
    return model_id in OPENAI_MODEL_IDS


def resolve_model_alias(alias: str) -> str:
    """Convert a model alias to its full model ID."""
    alias_lower = alias.lower().strip()
    return MODEL_ALIASES.get(alias_lower, alias)
