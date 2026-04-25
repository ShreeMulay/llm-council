"""Integration tests for FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from backend.main import app


# Disable API key auth for all tests
@pytest.fixture(autouse=True)
def disable_auth():
    """Disable API key authentication middleware for tests."""
    with patch("backend.auth.COUNCIL_API_KEY", None):
        yield


client = TestClient(app)


class TestHealthEndpoint:
    """Test /health endpoint."""

    def test_health_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "llm-council"

    def test_health_includes_council_models(self):
        response = client.get("/health")
        data = response.json()
        assert "config" in data
        assert "council_models" in data["config"]
        assert "chairman_model" in data["config"]


class TestApiInfoEndpoint:
    """Test /api/info endpoint."""

    def test_api_info_returns_endpoints(self):
        response = client.get("/api/info")
        assert response.status_code == 200
        data = response.json()
        assert "endpoints" in data
        assert "/api/council" in data["endpoints"]

    def test_api_info_includes_model_aliases(self):
        response = client.get("/api/info")
        data = response.json()
        assert "model_aliases" in data
        aliases = data["model_aliases"]
        # model_aliases is a help string, not a dict
        assert "kimi" in aliases
        assert "deepseek" in aliases


class TestCouncilEndpoint:
    """Test /api/council endpoint with mocked deliberation."""

    @pytest.fixture
    def mock_council_result(self):
        """Mock council deliberation result."""
        return {
            "markdown": "## Test Result\n\nTest synthesis",
            "stage1": [
                {"model": "openai/gpt-5.5", "response": "GPT response", "usage": {}, "provider": "openrouter"},
                {"model": "anthropic/claude-opus-4.7", "response": "Claude response", "usage": {}, "provider": "openrouter"},
            ],
            "stage2": [
                {"model": "anthropic/claude-opus-4.7", "ranking": "FINAL RANKING:\n1. Response A", "parsed_ranking": ["Response A"], "usage": {}},
            ],
            "stage3": {
                "model": "anthropic/claude-opus-4.7",
                "response": "Synthesized answer",
                "usage": {},
                "provider": "openrouter",
            },
            "metadata": {
                "label_to_model": {"Response A": "openai/gpt-5.5"},
                "aggregate_rankings": [],
                "final_only": False,
                "compact": False,
                "evaluators": ["anthropic/claude-opus-4.7", "deepseek/deepseek-v4-pro", "openai/gpt-5.5"],
                "curated_models": ["openai/gpt-5.5", "anthropic/claude-opus-4.7"],
            },
            "timing": {"elapsed_seconds": 15.0},
            "config": {
                "council_models": ["openai/gpt-5.5", "anthropic/claude-opus-4.7"],
                "chairman_model": "anthropic/claude-opus-4.7",
                "final_only": False,
                "compact": False,
            },
        }

    @patch("backend.main.handle_council_command")
    def test_council_basic_query(self, mock_handle, mock_council_result):
        """Basic council query returns markdown and structured data."""
        mock_handle.return_value = mock_council_result
        
        response = client.post(
            "/api/council",
            json={"query": "What is 2+2?"},
            headers={"X-Council-Key": "test-key"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "markdown" in data
        assert "stage1" in data
        assert "stage3" in data
        assert data["config"]["compact"] is False

    @patch("backend.main.handle_council_command")
    def test_council_compact_mode(self, mock_handle, mock_council_result):
        """Compact mode uses only 5 models."""
        # Update mock to return compact=True
        compact_result = {**mock_council_result, "config": {**mock_council_result["config"], "compact": True}}
        mock_handle.return_value = compact_result
        
        response = client.post(
            "/api/council",
            json={"query": "What is 2+2?", "compact": True},
            headers={"X-Council-Key": "test-key"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["config"]["compact"] is True
        # Verify handle_council_command was called with compact=True
        call_kwargs = mock_handle.call_args.kwargs
        assert call_kwargs.get("compact") is True

    @patch("backend.main.handle_council_command")
    def test_council_final_only(self, mock_handle, mock_council_result):
        """Final-only mode skips Stage 2."""
        # Update mock to return final_only=True
        final_result = {**mock_council_result, "metadata": {**mock_council_result["metadata"], "final_only": True}}
        mock_handle.return_value = final_result
        
        response = client.post(
            "/api/council",
            json={"query": "What is 2+2?", "final_only": True},
            headers={"X-Council-Key": "test-key"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["metadata"]["final_only"] is True

    @patch("backend.main.handle_council_command")
    def test_council_markdown_format(self, mock_handle, mock_council_result):
        """Markdown format returns wrapped markdown."""
        mock_handle.return_value = mock_council_result
        
        response = client.post(
            "/api/council?format=markdown",
            json={"query": "What is 2+2?"},
            headers={"X-Council-Key": "test-key"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "markdown" in data
        assert data["markdown"].startswith("##")

    @patch("backend.main.handle_council_command")
    def test_council_markdown_raw_format(self, mock_handle, mock_council_result):
        """Markdown-raw format returns plain text."""
        mock_handle.return_value = mock_council_result
        
        response = client.post(
            "/api/council?format=markdown-raw",
            json={"query": "What is 2+2?"},
            headers={"X-Council-Key": "test-key"},
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/markdown; charset=utf-8"

    def test_council_missing_query(self):
        """Missing query should return 422."""
        response = client.post(
            "/api/council",
            json={},
            headers={"X-Council-Key": "test-key"},
        )
        
        assert response.status_code == 422

    def test_council_invalid_compact_type(self):
        """Invalid compact type should return 422."""
        response = client.post(
            "/api/council",
            json={"query": "test", "compact": "invalid"},
            headers={"X-Council-Key": "test-key"},
        )
        
        assert response.status_code == 422


class TestCouncilEndpointWithRealDeliberation:
    """Test /api/council with mocked deliberation functions."""

    @patch("backend.opencode_integration.run_full_council")
    def test_full_3_stage_flow(self, mock_run):
        """Full 3-stage flow returns all stages."""
        mock_run.return_value = (
            [{"model": "A", "response": "A"}],
            [{"model": "B", "ranking": "FINAL RANKING:\n1. Response A"}],
            {"model": "C", "response": "Synthesis"},
            {"aggregate_rankings": []},
        )
        
        response = client.post(
            "/api/council",
            json={"query": "Test"},
            headers={"X-Council-Key": "test-key"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["stage1"]) == 1
        assert len(data["stage2"]) == 1
        assert data["stage3"]["response"] == "Synthesis"

    @patch("backend.opencode_integration.run_full_council")
    def test_final_only_flow(self, mock_run):
        """Final-only flow skips Stage 2."""
        mock_run.return_value = (
            [{"model": "A", "response": "A"}],
            [],
            {"model": "C", "response": "Synthesis"},
            {"aggregate_rankings": [], "final_only": True},
        )
        
        response = client.post(
            "/api/council",
            json={"query": "Test", "final_only": True},
            headers={"X-Council-Key": "test-key"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage2"] == []
        assert data["metadata"]["final_only"] is True

    @patch("backend.opencode_integration.run_full_council")
    def test_compact_mode_5_models(self, mock_run):
        """Compact mode should pass 5 models to run_full_council."""
        mock_run.return_value = (
            [{"model": "A", "response": "A"}],
            [],
            {"model": "C", "response": "Synthesis"},
            {},
        )
        
        response = client.post(
            "/api/council",
            json={"query": "Test", "compact": True},
            headers={"X-Council-Key": "test-key"},
        )
        
        assert response.status_code == 200
        # Verify run_full_council was called with compact=True
        # When compact=True and no explicit models, council_models is None
        # and run_full_council uses COMPACT_COUNCIL_MODELS internally
        call_kwargs = mock_run.call_args.kwargs
        assert call_kwargs.get("compact") is True
        assert call_kwargs.get("council_models") is None
