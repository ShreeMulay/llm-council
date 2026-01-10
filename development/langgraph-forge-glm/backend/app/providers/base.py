"""Base provider abstraction for LLM providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class Pricing:
    """Pricing information for a model."""

    input_price_per_million: float
    output_price_per_million: float


@dataclass
class Model:
    """Model information."""

    id: str
    name: str
    context_length: int
    pricing: Pricing


class BaseProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, api_key: str) -> None:
        """Initialize provider with API key.

        Args:
            api_key: API key for the provider
        """
        self.api_key = api_key

    @abstractmethod
    async def list_models(self) -> list[Model]:
        """List available models for this provider.

        Returns:
            List of available models
        """
        pass

    @abstractmethod
    async def invoke(
        self,
        model: str,
        messages: list[dict[str, Any]],
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Invoke a model with messages.

        Args:
            model: Model ID to invoke
            messages: List of message dicts (role, content)
            **kwargs: Additional model-specific parameters

        Returns:
            Response containing content, usage, etc.
        """
        pass