"""Models API endpoint."""

from fastapi import APIRouter, HTTPException
from app.providers.openrouter import OpenRouterProvider
from app.providers.cerebras import CerebrasProvider
from app.providers.fireworks import FireworksProvider
from app.cache.model_cache import ModelCache
from app.config import settings

router = APIRouter()

provider_classes = {
    "openrouter": OpenRouterProvider,
    "cerebras": CerebrasProvider,
    "fireworks": FireworksProvider,
}

caches: dict[str, ModelCache] = {}


def get_provider_instance(provider_name: str) -> ModelCache:
    if provider_name not in provider_classes:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider_name}")

    if provider_name not in caches:
        api_keys = {
            "openrouter": settings.openrouter_api_key,
            "cerebras": settings.cerebras_api_key,
            "fireworks": settings.fireworks_api_key,
        }
        api_key = api_keys.get(provider_name, "")
        provider = provider_classes[provider_name](api_key=api_key)
        caches[provider_name] = ModelCache(provider, ttl_seconds=settings.models_cache_ttl_seconds)

    return caches[provider_name]


@router.get("/api/models")
async def list_models(provider: str):
    cache = get_provider_instance(provider)

    models = await cache.get_models()

    return {
        "provider": provider,
        "models": [
            {
                "id": m.id,
                "name": m.name,
                "contextLength": m.context_length,
                "inputPricePerMillion": m.pricing.input_price_per_million,
                "outputPricePerMillion": m.pricing.output_price_per_million,
            }
            for m in models
        ],
    }