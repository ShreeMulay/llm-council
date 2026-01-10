"""Model cache with TTL support."""

import time
from typing import Any
from app.providers.base import BaseProvider, Model


class ModelCache:
    """Cache model lists with TTL support."""

    def __init__(self, provider: BaseProvider, ttl_seconds: int = 3600) -> None:
        self.provider = provider
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, tuple[list[Model], float]] = {}

    async def get_models(self) -> list[Model]:
        provider_key = self.provider.__class__.__name__
        now = time.time()

        if provider_key in self._cache:
            models, cached_at = self._cache[provider_key]
            age = now - cached_at
            if age < self.ttl_seconds:
                return models

        try:
            models = await self.provider.list_models()
            self._cache[provider_key] = (models, now)
            return models
        except Exception:
            if provider_key in self._cache:
                models, _ = self._cache[provider_key]
                return models
            raise