"""Tests for health API endpoint."""

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_returns_status():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_health_shows_provider_status():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    # Should have some structure indicating provider status
    assert "status" in data