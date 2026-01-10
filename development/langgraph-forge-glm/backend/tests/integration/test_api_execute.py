import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import time

from app.main import app


client = TestClient(app)


@pytest.fixture
def mock_langgraph():
    """Mock LangGraph execution"""
    with patch('app.api.execute.execute_code') as mock:
        mock.return_value = (
            "Output result",
            {
                "nodes": [{"id": "agent", "type": "llm"}, {"id": "tools", "type": "tool"}],
                "edges": [{"source": "agent", "target": "tools"}],
            },
            {
                "input_tokens": 100,
                "output_tokens": 50,
                "duration_ms": 500,
            },
        )
        yield mock

@pytest.fixture
def mock_provider():
    """Mock provider for getting pricing"""
    with patch('app.api.execute.get_provider') as mock:
        provider = Mock()
        provider.get_model.return_value = Mock(
            context_length=128000,
            input_price_per_million=0.15,
            output_price_per_million=0.60,
        )
        mock.return_value = provider
        yield mock


def test_execute_simple_code(mock_langgraph, mock_provider):
    response = client.post(
        "/api/execute",
        json={
            "provider": "openrouter",
            "model": "anthropic/claude-3-haiku",
            "code": "print('hello')",
            "timeout": 30,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "output" in data
    assert "metrics" in data


def test_execute_returns_output(mock_langgraph, mock_provider):
    mock_langgraph.return_value = (
        "Custom output",
        {"nodes": [], "edges": []},
        {"input_tokens": 10, "output_tokens": 5, "duration_ms": 100},
    )

    response = client.post(
        "/api/execute",
        json={"provider": "openrouter", "model": "anthropic/claude-3-haiku", "code": "x = 1", "timeout": 30},
    )

    data = response.json()
    assert data["success"] is True
    assert data["output"] == "Custom output"


def test_execute_returns_metrics(mock_langgraph, mock_provider):
    mock_langgraph.return_value = (
        "output",
        {"nodes": [], "edges": []},
        {"input_tokens": 200, "output_tokens": 100, "duration_ms": 1000},
    )

    response = client.post(
        "/api/execute",
        json={
            "provider": "openrouter",
            "model": "anthropic/claude-3-haiku",
            "code": "code",
            "timeout": 30,
        },
    )

    data = response.json()
    metrics = data["metrics"]
    assert metrics["inputTokens"] == 200
    assert metrics["outputTokens"] == 100
    assert metrics["totalTokens"] == 300
    assert metrics["durationMs"] == 1000
    assert metrics["tokensPerSecond"] == 300 / 1.0
    assert metrics["costUsd"] > 0


def test_execute_returns_graph_structure(mock_langgraph, mock_provider):
    graph_structure = {
        "nodes": [{"id": "agent", "type": "llm"}, {"id": "tool", "type": "tool"}],
        "edges": [{"source": "agent", "target": "tool"}],
    }
    mock_langgraph.return_value = (
        "output",
        graph_structure,
        {"input_tokens": 10, "output_tokens": 5, "duration_ms": 100},
    )

    response = client.post(
        "/api/execute",
        json={
            "provider": "openrouter",
            "model": "anthropic/claude-3-haiku",
            "code": "code",
            "timeout": 30,
        },
    )

    data = response.json()
    assert data["graphStructure"]["nodes"] == graph_structure["nodes"]
    assert len(data["graphStructure"]["edges"]) == len(graph_structure["edges"])
    assert data["graphStructure"]["edges"][0]["source"] == graph_structure["edges"][0]["source"]
    assert data["graphStructure"]["edges"][0]["target"] == graph_structure["edges"][0]["target"]


def test_execute_handles_error(mock_langgraph, mock_provider):
    mock_langgraph.side_effect = Exception("Syntax error in code")

    response = client.post(
        "/api/execute",
        json={
            "provider": "openrouter",
            "model": "anthropic/claude-3-haiku",
            "code": "invalid code",
            "timeout": 30,
        },
    )

    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert "Syntax error" in data["error"]


def test_execute_timeout(mock_langgraph, mock_provider):
    def slow_execution(*args):
        raise TimeoutError("Execution timed out after 1 second")

    mock_langgraph.side_effect = slow_execution

    response = client.post(
        "/api/execute",
        json={
            "provider": "openrouter",
            "model": "anthropic/claude-3-haiku",
            "code": "slow code",
            "timeout": 1,
        },
    )

    data = response.json()
    assert data["success"] is False
    assert "timeout" in data["error"].lower()


def test_execute_missing_required_fields():
    response = client.post("/api/execute", json={"provider": "openrouter", "code": "code"})

    assert response.status_code == 422