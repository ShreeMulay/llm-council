"""OpenRouter provider implementation."""

from typing import Any
import httpx
from app.providers.base import BaseProvider, Model, Pricing


class OpenRouterProvider(BaseProvider):
    """OpenRouter API provider."""

    BASE_URL = "https://openrouter.ai/api/v1"

    async def list_models(self) -> list[Model]:
        """List available models from OpenRouter.

        Returns:
            List of available models
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            response.raise_for_status()
            data = response.json()

            models: list[Model] = []
            for model_data in data.get("data", []):
                pricing_raw = model_data.get("pricing", {})
                model = Model(
                    id=model_data["id"],
                    name=model_data.get("name", model_data["id"]),
                    context_length=model_data.get("context_length", 4096),
                    pricing=Pricing(
                        input_price_per_million=self._parse_price(
                            pricing_raw.get("prompt", "0")
                        ),
                        output_price_per_million=self._parse_price(
                            pricing_raw.get("completion", "0")
                        ),
                    ),
                )
                models.append(model)

            return models

    async def invoke(
        self,
        model: str,
        messages: list[dict[str, str]],
        **kwargs: dict[str, str],
    ) -> dict[str, any]:
        """Invoke a model with messages.

        Args:
            model: Model ID to invoke
            messages: List of message dicts (role, content)
            **kwargs: Additional model-specific parameters

        Returns:
            Response containing content and usage
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    **kwargs,
                },
            )
            response.raise_for_status()
            data = response.json()

            # Extract content from response
            content = data["choices"][0]["message"]["content"]

            return {
                "id": data.get("id", ""),
                "content": content,
                "usage": data.get("usage", {}),
            }

    def _parse_price(self, price_str: str) -> float:
        """Parse price string to USD per million tokens.

        Args:
            price_str: Price string (e.g., "0.000003")

        Returns:
            Price per million tokens
        """
        try:
            return float(price_str) * 1_000_000
        except (ValueError, TypeError):
            return 0.0