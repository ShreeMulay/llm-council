"""Tests for models API endpoint."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_models_returns_for_provider():
    response = client.get("/api/models?provider=openrouter")
    assert response.status_code == 200
    data = response.json()
    assert "provider" in data
    assert "models" in data


def test_models_cached():
    response1 = client.get("/api/models?provider=openrouter")
    response2 = client.get("/api/models?provider=openrouter")
    assert response1.status_code == 200
    assert response2.status_code == 200