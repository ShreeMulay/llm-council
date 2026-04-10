"""Configuration for the LLM Council."""

import os
from pathlib import Path

# Cloud Run detection — K_SERVICE is set automatically by Cloud Run
IS_CLOUD_RUN = bool(os.getenv("K_SERVICE"))

# Secrets are loaded via backend.secrets module — import only when needed by
# specific client modules (openrouter.py, xai_client.py, etc.), not here.

# Directories
DATA_DIR = Path("data")
CONVERSATIONS_DIR = DATA_DIR / "conversations"
CACHE_DIR = DATA_DIR / "cache"
JOBS_DIR = DATA_DIR / "jobs"

# Create directories if they don't exist
CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)

# Caching settings
CACHE_TTL_SECONDS = 86400  # 24 hours
CACHE_FILE = CACHE_DIR / "models.json"

# Server configuration
# Cloud Run sets PORT env var; BACKEND_PORT is our custom override; 8800 is default
BACKEND_PORT = int(os.getenv("PORT", os.getenv("BACKEND_PORT", "8800")))
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")

# API endpoints
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
CEREBRAS_MODELS_URL = "https://api.cerebras.ai/v1/models"
FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/chat/completions"
MOONSHOT_API_URL = "https://api.moonshot.ai/v1/chat/completions"
XAI_API_URL = "https://api.x.ai/v1/chat/completions"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta"

# Council Models - 5 models for deliberation
# Kimi K2.5 and DeepSeek V3.2 removed (distilled from Claude — reduces diversity)
# 1. GPT-5.4 via OpenRouter (Anchor/Reasoning, reasoning_effort: high)
# 2. Claude Opus 4.6 via Anthropic OAuth (Lead Coder + Chairman)
# 3. GLM-5.1 via Fireworks Direct (Tool Specialist) — #1 open-weights model (AA Intelligence 51)
#    Upgraded from GLM-5 Apr 2026. SWE-Bench Pro SOTA (58.4), major long-horizon agentic gains.
# 4. Gemini 3.1 Pro Preview via OpenRouter (Generalist)
# 5. Grok 4.20 Reasoning via xAI Direct (Real-time Intel)
DEFAULT_COUNCIL_MODELS = [
    "openai/gpt-5.4",  # OpenRouter (Anchor)
    "anthropic/claude-opus-4.6",  # Anthropic OAuth (Lead Coder)
    "fireworks/glm-5.1",  # Fireworks Direct (Tool Specialist)
    "google/gemini-3.1-pro-preview",  # OpenRouter (Generalist)
    "x-ai/grok-4.20-0309-reasoning",  # xAI Direct (Real-time Intel)
]

# Chairman Model - synthesizes final response
# Claude Opus 4.6 for best synthesis capability (council unanimous decision)
DEFAULT_CHAIRMAN_MODEL = "anthropic/claude-opus-4.6"

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

FIREWORKS_MODEL_IDS = [
    "fireworks/glm-5.1",
    "fireworks/glm-5",
]

MOONSHOT_MODEL_IDS = [
    "moonshot/kimi-k2.5",
    "kimi-k2.5",
]

XAI_MODEL_IDS = [
    "x-ai/grok-4",
    "x-ai/grok-4-fast",
    "x-ai/grok-4.1-fast",
    "x-ai/grok-4.1-fast-reasoning",
    "x-ai/grok-4.20-0309-reasoning",
    "x-ai/grok-4.20-0309-non-reasoning",
    "x-ai/grok-4.20-multi-agent-0309",
]

GEMINI_DIRECT_MODEL_IDS = [
    "google/gemini-3-flash",
    "google/gemini-3-flash-preview",
    "google/gemini-3-pro",
    "google/gemini-3-pro-preview",
    "google/gemini-3.1-pro-preview",
    "google/gemini-2.0-flash",
]

# OpenRouter fallback model ID mapping (council ID -> OpenRouter ID)
OPENROUTER_FALLBACK_MAP = {
    "anthropic/claude-opus-4.6": "anthropic/claude-opus-4-6",
    "fireworks/glm-5.1": "z-ai/glm-5.1",
    "fireworks/glm-5": "z-ai/glm-5",
    "zai-glm-4.7": "z-ai/glm-4.7",
    "z-ai/glm-5.1": "z-ai/glm-5.1",
    "z-ai/glm-5": "z-ai/glm-5",
    "google/gemini-3-flash": "google/gemini-2.0-flash-001",
    "google/gemini-3-pro": "google/gemini-2.5-pro-preview-06-05",
    "openai/gpt-5.4": "openai/gpt-5.4",
    "x-ai/grok-4": "x-ai/grok-4",
    "x-ai/grok-4.20-0309-reasoning": "x-ai/grok-4.20",
}

# OpenAI models (disabled - Codex OAuth uses Responses API, not Chat Completions)
OPENAI_MODEL_IDS = []

# Model name aliases for convenience (used in /council command)
MODEL_ALIASES = {
    "gpt": "openai/gpt-5.4",
    "opus": "anthropic/claude-opus-4.6",
    "glm": "fireworks/glm-5.1",
    "gemini": "google/gemini-3.1-pro-preview",
    "pro": "google/gemini-3.1-pro-preview",
    "grok": "x-ai/grok-4.20-0309-reasoning",
    "sonnet": "anthropic/claude-sonnet-4.5",
    "flash": "google/gemini-3-flash-preview",
}


def is_cerebras_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Cerebras."""
    return model_id in CEREBRAS_MODEL_IDS


def is_fireworks_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Fireworks AI."""
    return model_id in FIREWORKS_MODEL_IDS or model_id.startswith("fireworks/")


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


# Per-model reasoning effort for OpenRouter requests.
# GPT-5.4 defaults to reasoning: none — we override to "high" for Thinking mode.
# Models not listed use provider default (no reasoning_effort sent).
MODEL_REASONING_EFFORT = {
    "openai/gpt-5.4": "high",
}


def get_model_reasoning_effort(model_id: str) -> str | None:
    """Get the reasoning effort for a model, or None to use provider default."""
    return MODEL_REASONING_EFFORT.get(model_id)


def resolve_model_alias(alias: str) -> str:
    """Convert a model alias to its full model ID."""
    alias_lower = alias.lower().strip()
    return MODEL_ALIASES.get(alias_lower, alias)
