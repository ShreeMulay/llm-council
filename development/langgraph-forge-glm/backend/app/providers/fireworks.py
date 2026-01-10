"""Fireworks provider implementation."""

import httpx
from typing import Any
from app.providers.base import BaseProvider, Model, Pricing


class FireworksProvider(BaseProvider):
    """Fireworks AI API provider."""

    BASE_URL = "https://api.fireworks.ai/inference/v1"

    async def list_models(self) -> list[Model]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            response.raise_for_status()
            data = response.json()

            models: list[Model] = []
            for model_data in data.get("data", []):
                model = Model(
                    id=model_data["id"],
                    name=model_data.get("id", model_data["id"]),
                    context_length=model_data.get("context_length", 8192),
                    pricing=Pricing(
                        input_price_per_million=0.5,
                        output_price_per_million=0.5,
                    ),
                )
                models.append(model)

            return models

    async def invoke(
        self,
        model: str,
        messages: list[dict[str, str]],
        **kwargs: dict[str, str],
    ) -> dict[str, Any]:
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

            content = data["choices"][0]["message"]["content"]

            return {
                "id": data.get("id", ""),
                "content": content,
                "usage": data.get("usage", {}),
            }