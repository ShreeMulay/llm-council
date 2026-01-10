"""Tests for Fireworks provider."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.providers.fireworks import FireworksProvider
from app.providers.base import Model, Pricing


@pytest.fixture
def provider_with_mock():
    mock_response = AsyncMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock()

    with patch("app.providers.fireworks.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        mock_client.get.return_value = mock_response
        mock_client.post.return_value = mock_response

        yield FireworksProvider(api_key="test-key"), mock_client, mock_response


@pytest.mark.asyncio
async def test_list_models_returns_models(provider_with_mock):
    provider, mock_client, mock_response = provider_with_mock
    mock_response.json.return_value = {
        "data": [{"id": "accounts/fireworks/models/llama-v3p1-70b-instruct", "object": "model"}]
    }

    models = await provider.list_models()

    assert len(models) == 1
    assert "llama" in models[0].id.lower()


@pytest.mark.asyncio
async def test_fallback_pricing_used(provider_with_mock):
    provider, mock_client, mock_response = provider_with_mock
    mock_response.json.return_value = {
        "data": [{"id": "accounts/fireworks/models/llama-v3p1-70b-instruct", "object": "model"}]
    }

    models = await provider.list_models()

    assert models[0].pricing.input_price_per_million == 0.5
    assert models[0].pricing.output_price_per_million == 0.5


@pytest.mark.asyncio
async def test_invoke_returns_response(provider_with_mock):
    provider, mock_client, mock_response = provider_with_mock
    mock_response.json.return_value = {
        "id": "gen-123",
        "choices": [
            {"message": {"role": "assistant", "content": "Test response"}}
        ],
        "usage": {"prompt_tokens": 20, "completion_tokens": 10, "total_tokens": 30},
    }

    response = await provider.invoke(
        model="accounts/fireworks/models/llama-v3p1-70b-instruct",
        messages=[{"role": "user", "content": "Test"}],
    )

    assert response["content"] == "Test response"
    assert response["usage"]["total_tokens"] == 30