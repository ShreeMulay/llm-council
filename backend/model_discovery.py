"""Dynamic model discovery from OpenRouter and Cerebras APIs."""

import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
import httpx

from .config import CACHE_FILE, CACHE_TTL_SECONDS
from .secrets import OPENROUTER_API_KEY, CEREBRAS_API_KEY


class ModelDiscovery:
    """Fetch and cache models from multiple providers."""
    
    def __init__(self):
        """Initialize model discovery with caching support."""
        self.cache_file = Path(CACHE_FILE)
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        self._cache = self._load_cache()
    
    def _load_cache(self) -> Dict[str, Any]:
        """Load models from cache file."""
        if self.cache_file.exists():
            try:
                with open(self.cache_file) as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return {"openrouter": {}, "cerebras": {}}
        return {"openrouter": {}, "cerebras": {}}
    
    def _save_cache(self) -> None:
        """Save models to cache file."""
        try:
            with open(self.cache_file, "w") as f:
                json.dump(self._cache, f, indent=2)
        except IOError as e:
            print(f"Warning: Could not save cache: {e}")
    
    def _is_cache_valid(self, provider: str) -> bool:
        """Check if cache for a provider is still valid."""
        provider_cache = self._cache.get(provider, {})
        last_fetch = provider_cache.get("last_fetch", 0)
        return (time.time() - last_fetch) < CACHE_TTL_SECONDS
    
    async def fetch_openrouter_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Fetch models from OpenRouter API.
        
        Args:
            force_refresh: If True, bypass cache and fetch fresh data
        
        Returns:
            List of model objects with id, name, pricing, context_length, etc.
        """
        if not force_refresh and self._is_cache_valid("openrouter"):
            return self._cache.get("openrouter", {}).get("models", [])
        
        if not OPENROUTER_API_KEY:
            print("Error: OPENROUTER_API_KEY not configured")
            return self._cache.get("openrouter", {}).get("models", [])
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://openrouter.ai/api/v1/models",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    }
                )
                response.raise_for_status()
                models = response.json().get("data", [])
            
            # Add provider field
            for model in models:
                model["provider"] = "openrouter"
            
            self._cache["openrouter"] = {
                "last_fetch": time.time(),
                "models": models
            }
            self._save_cache()
            
            return models
        except Exception as e:
            print(f"Error fetching OpenRouter models: {e}")
            return self._cache.get("openrouter", {}).get("models", [])
    
    async def fetch_cerebras_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Fetch models from Cerebras API.
        
        Args:
            force_refresh: If True, bypass cache and fetch fresh data
        
        Returns:
            List of model objects with id, owned_by, etc.
        """
        if not force_refresh and self._is_cache_valid("cerebras"):
            return self._cache.get("cerebras", {}).get("models", [])
        
        if not CEREBRAS_API_KEY:
            print("Error: CEREBRAS_API_KEY not configured")
            return self._cache.get("cerebras", {}).get("models", [])
        
        # Estimated pricing for Cerebras models (per million tokens)
        pricing_map = {
            "llama3.1-8b": {"prompt": "0.0001", "completion": "0.0001"},
            "llama-3.3-70b": {"prompt": "0.0006", "completion": "0.0006"},
            "qwen-3-32b": {"prompt": "0.0003", "completion": "0.0003"},
            "gpt-oss-120b": {"prompt": "0.001", "completion": "0.001"},
            "zai-glm-4.6": {"prompt": "0.001", "completion": "0.001"},
            "zai-glm-4.7": {"prompt": "0.001", "completion": "0.001"},
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://api.cerebras.ai/v1/models",
                    headers={
                        "Authorization": f"Bearer {CEREBRAS_API_KEY}",
                    }
                )
                response.raise_for_status()
                models = response.json().get("data", [])
            
            # Enhance model data with provider and pricing
            for model in models:
                model["provider"] = "cerebras"
                model_id = model.get("id", "")
                if model_id in pricing_map:
                    model["pricing"] = pricing_map[model_id]
                else:
                    model["pricing"] = {"prompt": "0.001", "completion": "0.001"}
            
            self._cache["cerebras"] = {
                "last_fetch": time.time(),
                "models": models
            }
            self._save_cache()
            
            return models
        except Exception as e:
            print(f"Error fetching Cerebras models: {e}")
            return self._cache.get("cerebras", {}).get("models", [])
    
    async def get_all_models(
        self,
        provider: Optional[str] = None,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all models from specified provider or all providers.
        
        Args:
            provider: Filter by provider ("openrouter" or "cerebras")
            force_refresh: If True, bypass cache and fetch fresh data
        
        Returns:
            List of model objects from all providers
        """
        if provider == "openrouter":
            return await self.fetch_openrouter_models(force_refresh)
        elif provider == "cerebras":
            return await self.fetch_cerebras_models(force_refresh)
        else:
            # Fetch from both providers
            openrouter_models = await self.fetch_openrouter_models(force_refresh)
            cerebras_models = await self.fetch_cerebras_models(force_refresh)
            return openrouter_models + cerebras_models
    
    def get_cache_info(self) -> Dict[str, Any]:
        """
        Get information about the current cache state.
        
        Returns:
            Dict with cache metadata for each provider
        """
        return {
            "openrouter": {
                "last_fetch": self._cache.get("openrouter", {}).get("last_fetch", 0),
                "model_count": len(self._cache.get("openrouter", {}).get("models", [])),
                "is_valid": self._is_cache_valid("openrouter")
            },
            "cerebras": {
                "last_fetch": self._cache.get("cerebras", {}).get("last_fetch", 0),
                "model_count": len(self._cache.get("cerebras", {}).get("models", [])),
                "is_valid": self._is_cache_valid("cerebras")
            }
        }


# Global instance for convenience
_model_discovery: Optional[ModelDiscovery] = None


def get_model_discovery() -> ModelDiscovery:
    """Get or create the global ModelDiscovery instance."""
    global _model_discovery
    if _model_discovery is None:
        _model_discovery = ModelDiscovery()
    return _model_discovery
