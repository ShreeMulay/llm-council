"""Tests for OpenRouter provider."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.providers.openrouter import OpenRouterProvider
from app.providers.base import Model, Pricing


@pytest.fixture
def provider_with_mock():
    mock_response = AsyncMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock()

    with patch("app.providers.openrouter.httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        mock_client.get.return_value = mock_response
        mock_client.post.return_value = mock_response

        yield OpenRouterProvider(api_key="test-key"), mock_client, mock_response


@pytest.mark.asyncio
async def test_list_models_returns_models(provider_with_mock):
    provider, mock_client, mock_response = provider_with_mock
    mock_response.json.return_value = {
        "data": [
            {
                "id": "openai/gpt-4",
                "name": "GPT-4",
                "context_length": 8192,
                "pricing": {
                    "prompt": "0.000003",
                    "completion": "0.000006",
                },
            },
            {
                "id": "anthropic/claude-3-opus",
                "name": "Claude 3 Opus",
                "context_length": 200000,
                "pricing": {
                    "prompt": "0.000015",
                    "completion": "0.000075",
                },
            },
        ]
    }

    models = await provider.list_models()

    assert len(models) == 2
    assert models[0].id == "openai/gpt-4"
    assert models[0].name == "GPT-4"
    assert models[1].id == "anthropic/claude-3-opus"


@pytest.mark.asyncio
async def test_list_models_includes_pricing(provider_with_mock):
    provider, mock_client, mock_response = provider_with_mock
    mock_response.json.return_value = {
        "data": [
            {
                "id": "openai/gpt-4",
                "name": "GPT-4",
                "context_length": 8192,
                "pricing": {
                    "prompt": "0.000003",
                    "completion": "0.000006",
                },
            },
        ]
    }

    models = await provider.list_models()

    assert len(models) == 1
    assert models[0].pricing.input_price_per_million == 3.0
    assert models[0].pricing.output_price_per_million == 6.0


@pytest.mark.asyncio
async def test_invoke_returns_response(provider_with_mock):
    provider, mock_client, mock_response = provider_with_mock
    mock_response.json.return_value = {
        "id": "gen-123",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Hello!",
                }
            }
        ],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "total_tokens": 15,
        },
    }

    response = await provider.invoke(
        model="openai/gpt-4",
        messages=[
            {"role": "user", "content": "Hi"},
        ],
    )

    assert response["content"] == "Hello!"
    assert response["usage"]["prompt_tokens"] == 10
    assert response["usage"]["total_tokens"] == 15


@pytest.mark.asyncio
async def test_invoke_returns_usage(provider_with_mock):
    provider, mock_client, mock_response = provider_with_mock
    mock_response.json.return_value = {
        "id": "gen-123",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Test response",
                }
            }
        ],
        "usage": {
            "prompt_tokens": 20,
            "completion_tokens": 10,
            "total_tokens": 30,
        },
    }

    response = await provider.invoke(
        model="openai/gpt-4",
        messages=[{"role": "user", "content": "Test"}],
    )

    assert "usage" in response
    assert response["usage"]["prompt_tokens"] == 20
    assert response["usage"]["completion_tokens"] == 10
    assert response["usage"]["total_tokens"] == 30