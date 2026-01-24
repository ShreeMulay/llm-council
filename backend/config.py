"""Configuration for the LLM Council."""

import os
from pathlib import Path

# Import secrets from bash_secrets
from .secrets import OPENROUTER_API_KEY, CEREBRAS_API_KEY, ANTHROPIC_API_KEY

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

# Council Models - 6 models for deliberation
# 1. GPT-5.2 via OpenAI Codex OAuth (Anchor/Reasoning)
# 2. Claude Opus 4.5 via Anthropic OAuth (Lead Coder)
# 3. Gemini 3 Pro Preview via OpenRouter (Generalist)
# 4. DeepSeek V3.2 via OpenRouter (Architect/Reasoner)
# 5. GLM 4.7 via Cerebras Direct (Tool Specialist)
# 6. Grok 4.1 Fast via OpenRouter (Real-time Intel)
DEFAULT_COUNCIL_MODELS = [
    "openai/gpt-5.2",                 # OpenAI Codex OAuth (Anchor)
    "anthropic/claude-opus-4.5",      # Anthropic OAuth (Lead Coder)
    "google/gemini-3-pro-preview",    # OpenRouter (Generalist)
    "deepseek/deepseek-v3.2",         # OpenRouter (Architect)
    "zai-glm-4.7",                    # Cerebras Direct (Tool Specialist)
    "x-ai/grok-4.1-fast",             # OpenRouter (Real-time Intel)
]

# Chairman Model - synthesizes final response
# Claude Opus 4.5 for best synthesis capability (council unanimous decision)
DEFAULT_CHAIRMAN_MODEL = "anthropic/claude-opus-4.5"

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

# OpenAI models that should be routed directly via Codex OAuth
OPENAI_MODEL_IDS = [
    "openai/gpt-5.2",
    "openai/gpt-5.1",
    "openai/gpt-4o",
    "openai/gpt-4-turbo",
]

# Model name aliases for convenience (used in /council command)
MODEL_ALIASES = {
    "gpt": "openai/gpt-5.2",
    "opus": "anthropic/claude-opus-4.5",
    "gemini": "google/gemini-3-pro-preview",
    "pro": "google/gemini-3-pro-preview",
    "deepseek": "deepseek/deepseek-v3.2",
    "glm": "zai-glm-4.7",
    "grok": "x-ai/grok-4.1-fast",
    "sonnet": "anthropic/claude-3.5-sonnet",
    "flash": "google/gemini-3-flash-preview",  # backward compat
}


def is_cerebras_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Cerebras."""
    return model_id in CEREBRAS_MODEL_IDS


def is_openai_model(model_id: str) -> bool:
    """Check if a model ID should be routed to OpenAI directly via Codex OAuth."""
    return model_id.startswith("openai/") or model_id in OPENAI_MODEL_IDS


def resolve_model_alias(alias: str) -> str:
    """Convert a model alias to its full model ID."""
    alias_lower = alias.lower().strip()
    return MODEL_ALIASES.get(alias_lower, alias)
