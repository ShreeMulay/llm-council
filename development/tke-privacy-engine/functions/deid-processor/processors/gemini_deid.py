"""Gemini-based de-identification processor.

Uses Vertex AI Gemini 1.5 Pro via the google.genai SDK to perform
HIPAA Safe Harbor de-identification of clinical text.
"""

import json
import logging
import os
import time

from google import genai
from google.genai import types
from pydantic import BaseModel

from prompts.safe_harbor import get_system_prompt, get_user_message

logger = logging.getLogger(__name__)

# Configuration from environment
GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
GCP_REGION = os.environ.get("GCP_REGION", "us-central1")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")
MAX_OUTPUT_TOKENS = int(os.environ.get("GEMINI_MAX_OUTPUT_TOKENS", "65536"))
MAX_RETRIES = int(os.environ.get("GEMINI_MAX_RETRIES", "3"))
RETRY_DELAY_SECONDS = float(os.environ.get("GEMINI_RETRY_DELAY", "2.0"))


class PHIEntity(BaseModel):
    """A single PHI entity found and replaced."""

    token: str
    entity_type: str
    original: str
    confidence: float
    notes: str = ""


class GeminiDeIDResult(BaseModel):
    """Structured result from Gemini de-identification."""

    deidentified_text: str
    entities: list[PHIEntity]
    providers_preserved: list[str]
    eponyms_preserved: list[str]
    total_phi: int
    total_replaced: int
    age_90_plus_applied: bool
    processing_time_ms: int = 0


def _create_client() -> genai.Client:
    """Create and return a configured Gemini client.

    Uses Vertex AI backend with project and location from environment.

    Returns:
        Configured genai.Client instance.

    Raises:
        ValueError: If GCP_PROJECT_ID is not set.
    """
    if not GCP_PROJECT_ID:
        raise ValueError(
            "GCP_PROJECT_ID environment variable is required. "
            "Set it to your Google Cloud project ID."
        )

    # Gemini 3 models require the global endpoint; earlier models use regional
    location = "global" if GEMINI_MODEL.startswith("gemini-3") else GCP_REGION
    client = genai.Client(
        vertexai=True,
        project=GCP_PROJECT_ID,
        location=location,
    )
    return client


def _parse_gemini_response(raw_text: str) -> dict:
    """Parse Gemini's JSON response, handling common formatting issues.

    Args:
        raw_text: Raw text response from Gemini.

    Returns:
        Parsed JSON dictionary.

    Raises:
        ValueError: If response cannot be parsed as valid JSON.
    """
    text = raw_text.strip()

    # Strip markdown code fences if present (Gemini sometimes adds them)
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # Try to find JSON object in the response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
        raise ValueError(
            f"Failed to parse Gemini response as JSON: {e}\n"
            f"Raw response (first 500 chars): {raw_text[:500]}"
        ) from e


def _validate_response_structure(data: dict) -> None:
    """Validate that the parsed response has the expected structure.

    Args:
        data: Parsed JSON response dictionary.

    Raises:
        ValueError: If required fields are missing.
    """
    required_fields = ["deidentified_text", "entities", "summary"]
    missing = [f for f in required_fields if f not in data]
    if missing:
        raise ValueError(
            f"Gemini response missing required fields: {missing}. "
            f"Got keys: {list(data.keys())}"
        )

    summary = data.get("summary", {})
    summary_fields = ["total_phi", "total_replaced", "age_90_plus_applied"]
    missing_summary = [f for f in summary_fields if f not in summary]
    if missing_summary:
        raise ValueError(
            f"Gemini response summary missing fields: {missing_summary}. "
            f"Got: {list(summary.keys())}"
        )


def _build_result(data: dict, processing_time_ms: int) -> GeminiDeIDResult:
    """Convert parsed Gemini response into a structured result.

    Args:
        data: Validated parsed JSON response.
        processing_time_ms: Time taken for the API call.

    Returns:
        GeminiDeIDResult with all fields populated.
    """
    entities = []
    for entity_data in data.get("entities", []):
        entities.append(
            PHIEntity(
                token=entity_data.get("token", ""),
                entity_type=entity_data.get("type", "Unknown"),
                original=entity_data.get("original", ""),
                confidence=float(entity_data.get("confidence", 0.0)),
                notes=entity_data.get("notes", ""),
            )
        )

    summary = data.get("summary", {})

    return GeminiDeIDResult(
        deidentified_text=data["deidentified_text"],
        entities=entities,
        providers_preserved=data.get("providers_preserved", []),
        eponyms_preserved=data.get("eponyms_preserved", []),
        total_phi=summary.get("total_phi", len(entities)),
        total_replaced=summary.get("total_replaced", len(entities)),
        age_90_plus_applied=summary.get("age_90_plus_applied", False),
        processing_time_ms=processing_time_ms,
    )


async def deidentify_text(
    text: str,
    encounter_date: str | None = None,
    provider_names: list[str] | None = None,
) -> GeminiDeIDResult:
    """De-identify clinical text using Gemini 1.5 Pro.

    Sends the text with the Safe Harbor prompt to Gemini and parses
    the structured JSON response.

    Args:
        text: Clinical text to de-identify.
        encounter_date: Optional encounter date (ISO format) for DOB→age calculation.
        provider_names: List of TKE provider names to preserve.

    Returns:
        GeminiDeIDResult with de-identified text and entity mappings.

    Raises:
        RuntimeError: If all retry attempts fail.
        ValueError: If response cannot be parsed or validated.
    """
    if provider_names is None:
        provider_names = []

    client = _create_client()
    system_prompt = get_system_prompt(provider_names)
    user_message = get_user_message(text, encounter_date)

    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        start_time = time.monotonic()
        try:
            logger.info(
                "Gemini de-ID attempt %d/%d (text length: %d chars)",
                attempt,
                MAX_RETRIES,
                len(text),
            )

            # Build generation config
            gen_config = {
                "system_instruction": system_prompt,
                "temperature": 0.0,
                "max_output_tokens": MAX_OUTPUT_TOKENS,
                "response_mime_type": "application/json",
                "safety_settings": [
                    types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold="BLOCK_NONE",
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_HARASSMENT",
                        threshold="BLOCK_NONE",
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_HATE_SPEECH",
                        threshold="BLOCK_NONE",
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold="BLOCK_NONE",
                    ),
                ],
            }

            # Gemini 3 models support thinking_level; use minimal for speed/cost
            if GEMINI_MODEL.startswith("gemini-3"):
                gen_config["thinking_config"] = types.ThinkingConfig(
                    thinking_level="MINIMAL",
                )

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=user_message,
                config=types.GenerateContentConfig(**gen_config),
            )

            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            # Extract text from response
            if not response.text:
                raise ValueError("Gemini returned empty response text")

            raw_text = response.text
            logger.debug("Gemini raw response length: %d chars", len(raw_text))

            # Parse and validate
            data = _parse_gemini_response(raw_text)
            _validate_response_structure(data)

            result = _build_result(data, elapsed_ms)

            logger.info(
                "Gemini de-ID complete: %d PHI found, %d replaced, %d ms",
                result.total_phi,
                result.total_replaced,
                elapsed_ms,
            )

            return result

        except Exception as e:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            last_error = e
            logger.warning(
                "Gemini de-ID attempt %d failed after %d ms: %s",
                attempt,
                elapsed_ms,
                str(e),
            )

            if attempt < MAX_RETRIES:
                delay = RETRY_DELAY_SECONDS * attempt  # Linear backoff
                logger.info("Retrying in %.1f seconds...", delay)
                # Use synchronous sleep since the genai SDK call is synchronous
                time.sleep(delay)

    raise RuntimeError(
        f"Gemini de-identification failed after {MAX_RETRIES} attempts. "
        f"Last error: {last_error}"
    )


async def deidentify_text_with_raw(
    text: str,
    encounter_date: str | None = None,
    provider_names: list[str] | None = None,
) -> tuple[GeminiDeIDResult, str]:
    """De-identify text and also return the raw Gemini response.

    Useful for debugging and audit logging.

    Args:
        text: Clinical text to de-identify.
        encounter_date: Optional encounter date for DOB→age calculation.
        provider_names: List of TKE provider names to preserve.

    Returns:
        Tuple of (GeminiDeIDResult, raw_response_text).
    """
    if provider_names is None:
        provider_names = []

    client = _create_client()
    system_prompt = get_system_prompt(provider_names)
    user_message = get_user_message(text, encounter_date)

    start_time = time.monotonic()

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.0,
            max_output_tokens=MAX_OUTPUT_TOKENS,
            response_mime_type="application/json",
        ),
    )

    elapsed_ms = int((time.monotonic() - start_time) * 1000)

    if not response.text:
        raise ValueError("Gemini returned empty response text")

    raw_text = response.text
    data = _parse_gemini_response(raw_text)
    _validate_response_structure(data)
    result = _build_result(data, elapsed_ms)

    return result, raw_text
