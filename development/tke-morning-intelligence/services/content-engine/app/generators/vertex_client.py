"""
Google AI Gemini 3.x client wrapper.

Uses the google-genai SDK with API key authentication to access
Gemini 3.x preview models (not available via Vertex AI on this project).

Centralizes all LLM calls with:
- Model selection (3.1 Pro, 3 Flash, 3.1 Flash-Lite)
- Structured JSON output with schema enforcement
- Thinking level configuration (Gemini 3.x uses thinking_level string)
- Retry logic with exponential backoff
- Pydantic validation of LLM responses
"""

import asyncio
import json
import logging
import os

from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ── Model IDs (Gemini 3.x preview) ──────────────────────────
GEMINI_31_PRO = "gemini-3.1-pro-preview"
GEMINI_3_FLASH = "gemini-3-flash-preview"
GEMINI_31_FLASH_LITE = "gemini-3.1-flash-lite-preview"

# Singleton client - initialized in init_client()
_client = None


def init_client(api_key: str | None = None):
    """
    Initialize the google-genai client using API key authentication.

    Uses GOOGLE_AI_API_KEY env var for Gemini 3.x preview access.
    Call this once at startup (in FastAPI lifespan).
    """
    global _client

    from google import genai

    resolved_key = api_key or os.environ.get("GOOGLE_AI_API_KEY", "")

    if not resolved_key:
        raise ValueError(
            "GOOGLE_AI_API_KEY must be set via env var or passed to init_client(). "
            "This key is required for Gemini 3.x preview model access."
        )

    _client = genai.Client(api_key=resolved_key)

    logger.info("Google AI client initialized with API key (Gemini 3.x preview)")


def get_client():
    """Get the initialized genai client. Lazy-initializes if not yet done."""
    if _client is None:
        init_client()
    return _client


async def generate_json(
    prompt: str,
    model_id: str = GEMINI_3_FLASH,
    response_model: type[BaseModel] | None = None,
    thinking_level: str = "low",
    temperature: float = 0.3,
    max_retries: int = 2,
) -> tuple[dict, str]:
    """
    Generate structured JSON from a Gemini 3.x model.

    Args:
        prompt: The full prompt text (with XML tags, instructions, etc.)
        model_id: Which Gemini model to use
        response_model: Optional Pydantic model for response validation
        thinking_level: 'low', 'medium', 'high' (Gemini 3.x string format)
                        Note: gemini-3.1-pro-preview minimum is 'low' (no 'minimal')
        temperature: Sampling temperature (lower = more deterministic)
        max_retries: Number of retries on parse/validation failure

    Returns:
        Tuple of (parsed_dict, model_id_used)

    Raises:
        ValueError: If response cannot be parsed/validated after all retries
    """
    client = get_client()

    # Gemini 3.x uses thinking_level as a string.
    # gemini-3.1-pro-preview does NOT support "minimal" — minimum is "low".
    valid_levels = {"low", "medium", "high"}
    if thinking_level not in valid_levels:
        thinking_level = "low"

    # Build generation config
    config: dict = {
        "temperature": temperature,
        "response_mime_type": "application/json",
    }

    # Add thinking config — Gemini 3.x uses thinking_level (string)
    config["thinking_config"] = {"thinking_level": thinking_level}

    # Add JSON schema enforcement if we have a Pydantic model
    if response_model is not None:
        config["response_json_schema"] = response_model.model_json_schema()

    last_error: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            response = await client.aio.models.generate_content(
                model=model_id,
                contents=prompt,
                config=config,
            )

            # Extract text from response
            raw_text = response.text
            if not raw_text:
                raise ValueError("Empty response from model")

            # Parse JSON
            parsed = parse_json_response(raw_text)

            # Validate against Pydantic model if provided
            if response_model is not None:
                validate_response(parsed, response_model)

            # Log token usage if available
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                usage = response.usage_metadata
                logger.info(
                    "Model=%s | prompt_tokens=%s | output_tokens=%s | thinking_tokens=%s",
                    model_id,
                    getattr(usage, "prompt_token_count", "?"),
                    getattr(usage, "candidates_token_count", "?"),
                    getattr(usage, "thoughts_token_count", "?"),
                )

            return parsed, model_id

        except Exception as e:
            last_error = e
            if attempt < max_retries:
                wait_seconds = 2**attempt
                logger.warning(
                    "Attempt %d/%d failed for model %s: %s. Retrying in %ds...",
                    attempt + 1,
                    max_retries + 1,
                    model_id,
                    e,
                    wait_seconds,
                )
                await asyncio.sleep(wait_seconds)
            else:
                logger.error(
                    "All %d attempts failed for model %s: %s",
                    max_retries + 1,
                    model_id,
                    e,
                )

    raise ValueError(f"Failed after {max_retries + 1} attempts with model {model_id}: {last_error}")


def parse_json_response(text: str) -> dict:
    """Parse JSON from LLM response, handling common issues."""
    if not text:
        raise ValueError("Empty response from LLM")

    # Strip markdown code blocks if present
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON from LLM response: {e}") from e


def validate_response(data: dict, model: type[BaseModel]) -> BaseModel:
    """Validate parsed JSON against a Pydantic model."""
    try:
        return model.model_validate(data)
    except Exception as e:
        raise ValueError(f"Pydantic validation failed: {e}") from e
