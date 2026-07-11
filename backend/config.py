"""Configuration for the LLM Council."""

import os
from pathlib import Path

from .model_registry import load_registry

MODEL_REGISTRY = load_registry()

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

# Vertex AI Anthropic configuration.
# Cloud Run uses ADC/service account auth; do not configure JSON key files.
# BAA policy: Claude Fable 5 through Vertex AI is PHI-eligible only when this
# service runs in covered Google Cloud projects/services under the Google/Vertex
# BAA. The OpenRouter fallback for Fable remains non-PHI/deidentified only.
VERTEX_PROJECT_ID = (
    os.getenv("VERTEX_PROJECT_ID")
    or os.getenv("GOOGLE_CLOUD_PROJECT")
    or os.getenv("GCP_PROJECT")
)
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION") or os.getenv("GOOGLE_CLOUD_LOCATION") or "global"
REQUIRE_VERTEX_ANTHROPIC = os.getenv("REQUIRE_VERTEX_ANTHROPIC", "").lower() in {
    "1",
    "true",
    "yes",
    "on",
}

# Council Models - 9 models for deliberation
# Optimized architecture: 9 collect -> 3 evaluate -> top 5 synthesize
# 1. GPT-5.5 via OpenRouter (Anchor/Fast Thinker, reasoning: medium)
# 2. Claude Fable 5 via Vertex AI Anthropic (Lead Coder + Chairman, reasoning: high)
# 3. GLM-5.2 xHigh via Fireworks Direct (Tool Specialist)
# 4. Gemini 3.1 Pro Preview via OpenRouter (Knowledge Generalist)
# 5. Grok 4.3 via xAI Direct (Real-time Intel)
# 6. Kimi K2.7 Code via Fireworks Direct (Long-Context Specialist)
# 7. DeepSeek V4 Pro via OpenRouter (Deep Reasoner)
# 8. Llama 4 Maverick via OpenRouter (Open-Weights Leader)
# 9. Qwen 3.7 Max via OpenRouter (Agentic/Tools Expert)
ALL_MODEL_IDS = list(MODEL_REGISTRY.production_roster)

DEFAULT_COUNCIL_MODELS = ALL_MODEL_IDS

# Core 5 models for compact mode (faster/cheaper)
COMPACT_COUNCIL_MODELS = list(MODEL_REGISTRY.compact_roster)

# Chairman Model - synthesizes final response
# Claude Fable 5 for best synthesis capability
DEFAULT_CHAIRMAN_MODEL = MODEL_REGISTRY.chairman_logical_id

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

FIREWORKS_MODEL_IDS = [model.logical_id for model in MODEL_REGISTRY.models if model.preferred_route.provider == "fireworks"]

MOONSHOT_MODEL_IDS = [
    "moonshot/kimi-k2.5",
    "kimi-k2.5",
]

XAI_MODEL_IDS = [model.logical_id for model in MODEL_REGISTRY.models if model.preferred_route.provider == "xai"]

# Gemini models routed to Google's Gemini Direct API.
# NOTE: google/gemini-3.1-pro-preview removed Apr 17 2026 — routing via OpenRouter
# instead because the GEMINI_API_KEY env var was not configured (literal placeholder),
# causing HTTP 400 failures. OpenRouter has the exact same model ID available and
# works out of the box with the existing OPENROUTER_API_KEY.
GEMINI_DIRECT_MODEL_IDS = [
    "google/gemini-3-flash",
    "google/gemini-3-flash-preview",
    "google/gemini-3-pro",
    "google/gemini-3-pro-preview",
    "google/gemini-2.0-flash",
]

# Claude models routed to Anthropic-on-Vertex as primary provider.
VERTEX_ANTHROPIC_MODEL_MAP = {
    model.logical_id: route.provider_model_id
    for model in MODEL_REGISTRY.models
    for route in model.routes
    if route.provider == "vertex"
}
VERTEX_ANTHROPIC_MODEL_IDS = list(VERTEX_ANTHROPIC_MODEL_MAP.keys())

# OpenRouter fallback model ID mapping (council ID -> OpenRouter ID)
OPENROUTER_FALLBACK_MAP = {
    model.logical_id: route.provider_model_id
    for model in MODEL_REGISTRY.models
    for route in model.routes
    if route.provider == "openrouter"
}

# OpenAI models (disabled - Codex OAuth uses Responses API, not Chat Completions)
OPENAI_MODEL_IDS = []

# Model name aliases for convenience (used in /council command)
MODEL_ALIASES = {
    alias: model.logical_id for model in MODEL_REGISTRY.models for alias in model.aliases
}

# Evaluator priority list — models best at critical evaluation
# Stage 2 uses top 3 from this list that are present in the active council
EVALUATOR_PRIORITY = list(MODEL_REGISTRY.evaluator_priority)

# Tiered truncation allocation — inverse allocation: weaker models get MORE space
# Strong models are concise; weaker models need more tokens for same quality
TIERED_TRUNCATION = {tier: [model.logical_id for model in MODEL_REGISTRY.models if model.tier == tier] for tier in MODEL_REGISTRY.truncation_limits}

TRUNCATION_LIMITS = dict(MODEL_REGISTRY.truncation_limits)

# Default truncation limit when model tier is unknown
DEFAULT_TRUNCATION_LIMIT = MODEL_REGISTRY.default_truncation_limit


def is_cerebras_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Cerebras."""
    return model_id in CEREBRAS_MODEL_IDS


def is_fireworks_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Fireworks AI."""
    return model_id in FIREWORKS_MODEL_IDS


def is_moonshot_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Moonshot."""
    return model_id in MOONSHOT_MODEL_IDS


def is_xai_model(model_id: str) -> bool:
    """Check if a model ID should be routed to xAI."""
    return model_id in XAI_MODEL_IDS


def is_gemini_direct_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Google Gemini directly."""
    return model_id in GEMINI_DIRECT_MODEL_IDS


def is_vertex_anthropic_model(model_id: str) -> bool:
    """Check if a model ID should be routed to Anthropic-on-Vertex."""
    return model_id in VERTEX_ANTHROPIC_MODEL_MAP


def requires_vertex_anthropic(model_id: str) -> bool:
    """Return whether fallback away from Vertex is disabled for this model."""
    return REQUIRE_VERTEX_ANTHROPIC and is_vertex_anthropic_model(model_id)


def get_vertex_anthropic_model_id(model_id: str) -> str | None:
    """Get the Vertex Anthropic model ID for a council model ID."""
    return VERTEX_ANTHROPIC_MODEL_MAP.get(model_id)


def get_openrouter_fallback(model_id: str) -> str | None:
    """Get the OpenRouter model ID for fallback routing.

    For Fable, OpenRouter fallback is non-PHI/deidentified only. PHI-eligible
    Fable traffic must use the configured Vertex AI Anthropic primary route.
    """
    return OPENROUTER_FALLBACK_MAP.get(model_id)


def is_openai_model(model_id: str) -> bool:
    """Check if a model ID should be routed to OpenAI directly."""
    return model_id in OPENAI_MODEL_IDS


def get_model_tier(model_id: str) -> str:
    """Get the truncation tier for a model (strong/medium/weak)."""
    for tier, models in TIERED_TRUNCATION.items():
        if model_id in models:
            return tier
    return "weak"  # Default to most generous for unknown models


def calculate_max_response_chars(model_id: str, num_models: int) -> int:
    """Calculate max response chars for a model based on tier and council size.

    With compact mode (5 models), all models get maximum space.
    With full council (9 models), allocation is tiered:
    - Strong models (concise): 8K
    - Medium models: 10K
    - Weak models (verbose): 12K
    """
    if num_models <= 5:
        # Compact mode: everyone gets max space
        return DEFAULT_TRUNCATION_LIMIT

    tier = get_model_tier(model_id)
    return TRUNCATION_LIMITS.get(tier, DEFAULT_TRUNCATION_LIMIT)


# Per-model reasoning effort for OpenRouter requests.
# GPT-5.5 dual-mode: medium for Stage 1 (responder), high for Stage 2 (evaluator)
# Fable 5 uses high effort as the default chairman/evaluator.
# Opus 4.8 keeps xhigh for backward-compatible explicit usage.
# Validated 2026-05-29: reasoning_effort=xhigh is honored by Opus 4.8 via
# OpenRouter native Anthropic provider (enables thinking, no API error).
# Models not listed use provider default (no reasoning_effort sent).
MODEL_REASONING_EFFORT = {
    key: effort
    for model in MODEL_REGISTRY.models
    for key, effort in ({model.logical_id: model.reasoning.get("default") or model.reasoning.get("member"),
                         f"{model.logical_id}-evaluator": model.reasoning.get("evaluator")}).items()
    if effort is not None
}


def get_model_reasoning_effort(model_id: str) -> str | None:
    """Get the reasoning effort for a model, or None to use provider default.

    Supports dual-mode for GPT-5.5:
    - "openai/gpt-5.5" -> medium (Stage 1 responder)
    - "openai/gpt-5.5-evaluator" -> high (Stage 2 evaluator)
    """
    return MODEL_REASONING_EFFORT.get(model_id)


def resolve_model_alias(alias: str) -> str:
    """Convert a model alias to its full model ID."""
    alias_lower = alias.lower().strip()
    return MODEL_ALIASES.get(alias_lower, alias)
