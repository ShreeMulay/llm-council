"""Tests for Cerebras provider."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.providers.cerebras import CerebrasProvider
from app.providers.base import Model, Pricing


@pytest.fixture
def provider_with_mock():
    mock_response = AsyncMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock()

    with patch("app.providers.cerebras.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        mock_client.get.return_value = mock_response
        mock_client.post.return_value = mock_response

        yield CerebrasProvider(api_key="test-key"), mock_client, mock_response


@pytest.mark.asyncio
async def test_list_models_returns_models(provider_with_mock):
    provider, mock_client, mock_response = provider_with_mock
    mock_response.json.return_value = {"data": [{"id": "llama3.1-70b", "name": "Llama 3.1 70B"}]}

    models = await provider.list_models()

    assert len(models) == 1
    assert models[0].id == "llama3.1-70b"
    assert models[0].name == "Llama 3.1 70B"


@pytest.mark.asyncio
async def test_fallback_pricing_used(provider_with_mock):
    provider, mock_client, mock_response = provider_with_mock
    mock_response.json.return_value = {
        "data": [{"id": "llama3.1-70b", "object": "model"}]
    }

    models = await provider.list_models()

    assert models[0].pricing.input_price_per_million == 1.0
    assert models[0].pricing.output_price_per_million == 1.0


@pytest.mark.asyncio
async def test_invoke_returns_response(provider_with_mock):
    provider, mock_client, mock_response = provider_with_mock
    mock_response.json.return_value = {
        "id": "gen-123",
        "choices": [
            {"message": {"role": "assistant", "content": "Hello!"}}
        ],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
    }

    response = await provider.invoke(model="llama3.1-70b", messages=[{"role": "user", "content": "Hi"}])

    assert response["content"] == "Hello!"
    assert response["usage"]["prompt_tokens"] == 10