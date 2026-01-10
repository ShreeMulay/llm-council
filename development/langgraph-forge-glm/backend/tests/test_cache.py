"""Tests for model cache."""

import pytest
import time
from unittest.mock import AsyncMock
from app.cache.model_cache import ModelCache
from app.providers.base import Model, Pricing


@pytest.fixture
def fake_provider():
    provider = AsyncMock()
    provider.list_models = AsyncMock()
    return provider


@pytest.mark.asyncio
async def test_cache_stores_models(fake_provider):
    fake_provider.list_models.return_value = [
        Model(
            id="model-1",
            name="Model 1",
            context_length=8192,
            pricing=Pricing(input_price_per_million=10.0, output_price_per_million=30.0),
        )
    ]

    cache = ModelCache(fake_provider, ttl_seconds=3600)
    models1 = await cache.get_models()

    assert len(models1) == 1
    assert models1[0].id == "model-1"
    assert fake_provider.list_models.call_count == 1

    cached_models = await cache.get_models()
    assert len(cached_models) == 1
    # Should still be 1 since cached
    assert fake_provider.list_models.call_count == 1


@pytest.mark.asyncio
async def test_cache_returns_fresh(fake_provider):
    fake_provider.list_models.return_value = [
        Model(
            id="model-1",
            name="Model 1",
            context_length=8192,
            pricing=Pricing(input_price_per_million=10.0, output_price_per_million=30.0),
        )
    ]

    cache = ModelCache(fake_provider, ttl_seconds=1)
    await cache.get_models()

    # Immediately again should be cached
    await cache.get_models()
    assert fake_provider.list_models.call_count == 1

    # Wait for cache to expire
    time.sleep(1.1)
    await cache.get_models()

    # Should have fetched fresh data
    assert fake_provider.list_models.call_count == 2


@pytest.mark.asyncio
async def test_cache_refetches_when_stale(fake_provider):
    fake_provider.list_models.return_value = [
        Model(
            id="model-1",
            name="Model 1",
            context_length=8192,
            pricing=Pricing(input_price_per_million=10.0, output_price_per_million=30.0),
        )
    ]

    cache = ModelCache(fake_provider, ttl_seconds=1)
    await cache.get_models()

    time.sleep(1.1)
    await cache.get_models()

    assert fake_provider.list_models.call_count == 2


@pytest.mark.asyncio
async def test_cache_returns_stale_on_error(fake_provider):
    call_count = {"count": 0}

    async def failing_after_first():
        call_count["count"] += 1
        if call_count["count"] == 1:
            return [
                Model(
                    id="model-1",
                    name="Model 1",
                    context_length=8192,
                    pricing=Pricing(input_price_per_million=10.0, output_price_per_million=30.0),
                )
            ]
        raise Exception("API error")

    fake_provider.list_models = failing_after_first

    cache = ModelCache(fake_provider, ttl_seconds=1)
    models1 = await cache.get_models()
    assert len(models1) == 1

    time.sleep(1.1)

    # Should return stale cached data on error
    models2 = await cache.get_models()
    assert len(models2) == 1
    assert models2[0].id == "model-1"