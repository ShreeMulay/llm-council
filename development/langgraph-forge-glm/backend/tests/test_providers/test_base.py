"""Tests for provider base abstraction."""

import pytest
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any
from app.providers.base import BaseProvider, Model, Pricing


class TestModel:
    """Test Model dataclass behavior."""

    def test_model_creation(self):
        """Model can be instantiated with required fields."""
        model = Model(
            id="gpt-4",
            name="GPT-4",
            context_length=8192,
            pricing=Pricing(
                input_price_per_million=10.0,
                output_price_per_million=30.0,
            ),
        )
        assert model.id == "gpt-4"
        assert model.name == "GPT-4"
        assert model.context_length == 8192
        assert model.pricing.input_price_per_million == 10.0
        assert model.pricing.output_price_per_million == 30.0


class TestPricing:
    """Test Pricing dataclass behavior."""

    def test_pricing_creation(self):
        """Pricing can be instantiated with required fields."""
        pricing = Pricing(
            input_price_per_million=5.0,
            output_price_per_million=15.0,
        )
        assert pricing.input_price_per_million == 5.0
        assert pricing.output_price_per_million == 15.0


class TestBaseProvider:
    """Test BaseProvider abstract class."""

    def test_cannot_instantiate_base_provider(self):
        """BaseProvider cannot be instantiated directly (abstract class)."""
        with pytest.raises(TypeError):
            BaseProvider(api_key="test-key")

    def test_concrete_provider_must_implement_list_models(self):
        """Concrete provider must implement list_models()."""

        class IncompleteProvider(BaseProvider):
            def __init__(self, api_key: str):
                super().__init__(api_key)

        with pytest.raises(TypeError, match="Can't instantiate abstract class"):
            IncompleteProvider(api_key="test-key")


def test_base_provider_interface_contract():
    """BaseProvider defines required interface."""
    # The test passes if BaseProvider has the expected abstract methods
    abstract_methods = BaseProvider.__abstractmethods__
    assert "list_models" in abstract_methods
    assert "invoke" in abstract_methods