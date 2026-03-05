"""
Weather quip generator.

Uses Gemini 3.1 Flash-Lite to produce a fun one-liner about the weekend weather.
Called by the pipeline on Fridays, Saturdays, and Sundays.
"""

from pydantic import BaseModel, Field

from app.generators.vertex_client import generate_json, GEMINI_31_FLASH_LITE
from app.prompts.weather_quip import build_prompt


class WeatherQuip(BaseModel):
    quip: str = Field(min_length=5, max_length=120)


async def generate_weather_quip(
    temp_f: int,
    description: str,
    day_name: str,
) -> tuple[WeatherQuip, str]:
    """
    Generate a fun weather one-liner for the weekend.

    Args:
        temp_f: Temperature in Fahrenheit
        description: Weather description (e.g. "clear sky", "light rain")
        day_name: Day name (e.g. "Saturday", "Sunday")

    Returns:
        Tuple of (WeatherQuip, model_id)
    """
    prompt = build_prompt(temp_f, description, day_name)

    data, model_id = await generate_json(
        prompt=prompt,
        model_id=GEMINI_31_FLASH_LITE,
        response_model=WeatherQuip,
        thinking_level="low",
        temperature=0.8,  # Higher temp for creative variety
    )

    result = WeatherQuip.model_validate(data)
    return result, model_id
