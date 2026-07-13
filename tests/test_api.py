"""Integration tests for FastAPI endpoints."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.auth import _is_tailscale_ip
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


class TestApiAuth:
    """Test API key auth and Tailscale bypass."""

    def test_tailscale_ip_helper_accepts_ipv4(self):
        assert _is_tailscale_ip("100.106.122.86") is True
        assert _is_tailscale_ip("100.106.122.86:5173") is True

    def test_tailscale_ip_helper_accepts_ipv6(self):
        assert _is_tailscale_ip("fd7a:115c:a1e0::1") is True
        assert _is_tailscale_ip("[fd7a:115c:a1e0::1]:5173") is True

    def test_tailscale_ip_helper_rejects_public_ip(self):
        assert _is_tailscale_ip("8.8.8.8") is False

    def test_tailscale_x_forwarded_for_spoof_requires_api_key(self):
        with patch("backend.auth.COUNCIL_API_KEY", "test-key"):
            response = client.get(
                "/api/info",
                headers={"X-Forwarded-For": "100.106.122.86, 8.8.8.8"},
            )

        assert response.status_code == 401

    def test_cloud_run_x_forwarded_for_tailscale_requires_api_key(self):
        with patch("backend.auth.COUNCIL_API_KEY", "test-key"), patch.dict(
            "os.environ",
            {"K_SERVICE": "llm-council", "ENABLE_TAILSCALE_AUTH_BYPASS": "true"},
        ):
            response = client.get(
                "/api/info",
                headers={"X-Forwarded-For": "100.106.122.86"},
            )

        assert response.status_code == 401

    def test_non_tailscale_request_requires_api_key(self):
        with patch("backend.auth.COUNCIL_API_KEY", "test-key"):
            response = client.get("/api/info", headers={"X-Forwarded-For": "8.8.8.8"})

        assert response.status_code == 401

    def test_monitor_ingest_has_dedicated_fail_closed_auth(self):
        event = {"schema_version":"1.0","event_id":"e1","provider":"p","model":"m","version":"1","source":{"id":"s","url":"https://example.com"},"routes":["p/m"],"confidence":0.9}
        with patch.dict("os.environ", {}, clear=True):
            assert client.post("/api/parallel/monitor/events", json=event).status_code == 404
        with patch.dict("os.environ", {"PARALLEL_MONITOR_INGEST_SECRET":"dedicated"}):
            assert client.post("/api/parallel/monitor/events", json=event, headers={"X-Parallel-Monitor-Secret":"wrong"}).status_code == 401

    def test_monitor_ingest_rejects_oversized_body_before_persistence(self):
        with patch.dict("os.environ", {"PARALLEL_MONITOR_INGEST_SECRET":"dedicated"}):
            response = client.post("/api/parallel/monitor/events", content=b"x" * 32769, headers={"X-Parallel-Monitor-Secret":"dedicated","Content-Type":"application/json"})
        assert response.status_code == 413

    def test_monitor_endpoint_preserves_protected_state_byte_for_byte(self, tmp_path):
        protected = [tmp_path / name for name in ("registry.json", "lifecycle.jsonl", "deployment.json")]
        for index, path in enumerate(protected):
            path.write_bytes(f"protected-{index}\n".encode())
        before = [path.read_bytes() for path in protected]
        event = {"schema_version":"1.0","event_id":"endpoint-e1","provider":"p","model":"m","version":"1","source":{"id":"s","url":"https://example.com"},"routes":["p/m"],"confidence":0.9}
        with patch.dict("os.environ", {"PARALLEL_MONITOR_INGEST_SECRET":"dedicated"}), patch("backend.config.DATA_DIR", tmp_path):
            response = client.post("/api/parallel/monitor/events", json=event, headers={"X-Parallel-Monitor-Secret":"dedicated"})
        assert response.status_code == 200
        assert [path.read_bytes() for path in protected] == before

    @patch("backend.main.stream_council")
    @patch("backend.main.augment_query_with_tool_context")
    def test_council_stream_errors_are_generic(self, mock_augment, mock_stream):
        async def failing_stream(*args, **kwargs):
            raise RuntimeError("raw secret exception")
            if False:
                yield  # pragma: no cover

        mock_augment.return_value = ("test", {"enabled": False})
        mock_stream.return_value = failing_stream()

        response = client.post(
            "/api/council/stream",
            json={"query": "test"},
            headers={"X-Council-Key": "test-key"},
        )

        assert response.status_code == 200
        assert "Council stream failed. Please try again." in response.text
        assert "raw secret exception" not in response.text

    @patch("backend.main.storage.add_user_message")
    @patch("backend.main.storage.get_conversation")
    def test_conversation_stream_errors_are_generic(self, mock_get, mock_add):
        mock_get.return_value = {"id": "conversation-id", "messages": [], "active_models": None}
        mock_add.side_effect = RuntimeError("raw conversation exception")

        response = client.post(
            "/api/conversations/conversation-id/message/stream",
            json={"content": "test"},
            headers={"X-Council-Key": "test-key"},
        )

        assert response.status_code == 200
        assert "Conversation stream failed. Please try again." in response.text
        assert "raw conversation exception" not in response.text


class TestCouncilEndpoint:
    """Test /api/council endpoint with mocked deliberation."""

    @pytest.fixture
    def mock_council_result(self):
        """Mock council deliberation result."""
        return {
            "markdown": "## Test Result\n\nTest synthesis",
            "stage1": [
                {"model": "openai/gpt-5.5", "response": "GPT response", "usage": {}, "provider": "openrouter"},
                {"model": "anthropic/claude-opus-4.8", "response": "Claude response", "usage": {}, "provider": "openrouter"},
            ],
            "stage2": [
                {"model": "anthropic/claude-opus-4.8", "ranking": "FINAL RANKING:\n1. Response A", "parsed_ranking": ["Response A"], "usage": {}},
            ],
            "stage3": {
                "model": "anthropic/claude-opus-4.8",
                "response": "Synthesized answer",
                "usage": {},
                "provider": "openrouter",
            },
            "metadata": {
                "label_to_model": {"Response A": "openai/gpt-5.5"},
                "aggregate_rankings": [],
                "final_only": False,
                "compact": False,
                "evaluators": ["anthropic/claude-opus-4.8", "deepseek/deepseek-v4-pro", "openai/gpt-5.5"],
                "curated_models": ["openai/gpt-5.5", "anthropic/claude-opus-4.8"],
            },
            "timing": {"elapsed_seconds": 15.0},
            "config": {
                "council_models": ["openai/gpt-5.5", "anthropic/claude-opus-4.8"],
                "chairman_model": "anthropic/claude-opus-4.8",
                "final_only": False,
                "compact": False,
            },
        }

    def test_council_async_rejects_internal_webhook_url(self):
        response = client.post(
            "/api/council/async",
            json={
                "query": "test",
                "webhook_url": "http://169.254.169.254/latest/meta-data/",
            },
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Webhook URL rejected: destination not allowed"

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

    @patch("backend.main.handle_council_command")
    def test_request_policy_false_is_forwarded_exactly(self, mock_handle, mock_council_result):
        mock_handle.return_value = mock_council_result

        response = client.post(
            "/api/council",
            json={
                "query": "test",
                "allow_declared_route_failover": False,
                "allow_provider_substitution": False,
            },
        )

        assert response.status_code == 200
        assert mock_handle.await_args.kwargs["allow_declared_route_failover"] is False
        assert mock_handle.await_args.kwargs["allow_provider_substitution"] is False

    @patch("backend.main.handle_council_command")
    def test_request_policy_defaults_preserve_production_behavior(
        self, mock_handle, mock_council_result
    ):
        mock_handle.return_value = mock_council_result

        response = client.post("/api/council", json={"query": "test"})

        assert response.status_code == 200
        assert mock_handle.await_args.kwargs["allow_declared_route_failover"] is True
        assert mock_handle.await_args.kwargs["allow_provider_substitution"] is False

    @pytest.mark.parametrize(
        ("field", "value"),
        [
            ("allow_declared_route_failover", "false"),
            ("allow_declared_route_failover", 0),
            ("allow_provider_substitution", "true"),
            ("allow_provider_substitution", 1),
        ],
    )
    def test_request_policy_rejects_malformed_values(self, field, value):
        response = client.post("/api/council", json={"query": "test", field: value})

        assert response.status_code == 422

    def test_sync_and_stream_capture_identical_false_request_policy(self):
        sync_plans = []
        stream_plans = []

        async def run_full(*_args, **kwargs):
            sync_plans.append(kwargs["execution_plan"])
            return ([{"model": "A", "response": "ok"}], [], {"model": "C", "response": "ok"}, {})

        async def stream_full(*_args, **kwargs):
            stream_plans.append(kwargs["execution_plan"])
            yield {
                "event": "complete",
                "stage1": [],
                "stage2": [],
                "stage3": {"model": "C", "response": "ok"},
                "metadata": {},
            }

        policy = {
            "query": "test",
            "compact": True,
            "tool_context": False,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
        }
        with (
            patch("backend.opencode_integration.run_full_council", side_effect=run_full),
            patch("backend.main.stream_council", side_effect=stream_full),
            patch(
                "backend.opencode_integration.augment_query_with_tool_context",
                new=AsyncMock(return_value=("test", {"enabled": False})),
            ),
            patch(
                "backend.main.augment_query_with_tool_context",
                new=AsyncMock(return_value=("test", {"enabled": False})),
            ),
        ):
            sync_response = client.post("/api/council", json=policy)
            stream_response = client.post("/api/council/stream", json=policy)

        assert sync_response.status_code == stream_response.status_code == 200
        assert len(sync_plans) == len(stream_plans) == 1
        for plan in (*sync_plans, *stream_plans):
            assert plan.settings.allow_declared_route_failover is False
            assert plan.settings.allow_provider_substitution is False
            assert all(
                operation.settings.allow_declared_route_failover is False
                and operation.settings.allow_provider_substitution is False
                for operation in (*plan.stage1, *plan.evaluators, plan.chairman)
            )

    def test_strict_vertex_floor_survives_request_policy_controls(self, monkeypatch):
        plans = []

        async def run_full(*_args, **kwargs):
            plans.append(kwargs["execution_plan"])
            return ([{"model": "A", "response": "ok"}], [], {"model": "C", "response": "ok"}, {})

        monkeypatch.setattr("backend.execution_planning.config.REQUIRE_VERTEX_ANTHROPIC", True)
        with (
            patch("backend.opencode_integration.run_full_council", side_effect=run_full),
            patch(
                "backend.opencode_integration.augment_query_with_tool_context",
                new=AsyncMock(return_value=("test", {"enabled": False})),
            ),
        ):
            response = client.post(
                "/api/council",
                json={
                    "query": "test",
                    "models": ["fable"],
                    "chairman": "fable",
                    "allow_declared_route_failover": True,
                    "allow_provider_substitution": True,
                },
            )

        assert response.status_code == 200
        assert plans[0].require_vertex_anthropic is True
        assert all(
            route.provider == "vertex"
            for operation in (*plans[0].stage1, *plans[0].evaluators, plans[0].chairman)
            for route in operation.routes
        )


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


class TestConversationModelSelection:
    """Test conversation-level and message-level model selection."""

    def test_create_conversation_stores_active_models(self, tmp_path):
        with patch("backend.storage.CONVERSATIONS_DIR", tmp_path):
            active_models = ["openai/gpt-5.5", "anthropic/claude-opus-4.8"]

            response = client.post(
                "/api/conversations",
                json={"active_models": active_models},
                headers={"X-Council-Key": "test-key"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["active_models"] == active_models

            list_response = client.get(
                "/api/conversations",
                headers={"X-Council-Key": "test-key"},
            )
            assert list_response.status_code == 200
            conversations = list_response.json()
            assert conversations[0]["active_models"] == active_models

    @patch("backend.main.generate_conversation_title")
    @patch("backend.main.augment_query_with_tool_context")
    @patch("backend.main.run_full_council")
    def test_send_message_uses_request_model_override(self, mock_run, mock_augment, mock_title, tmp_path):
        with patch("backend.storage.CONVERSATIONS_DIR", tmp_path):
            mock_title.return_value = "Test Title"
            mock_augment.return_value = (
                "AUGMENTED QUERY",
                {"enabled": True, "urls": ["https://example.com/t.txt"], "sources": []},
            )
            mock_run.return_value = (
                [{"model": "A", "response": "A"}],
                [{"model": "B", "ranking": "FINAL RANKING:\n1. Response A"}],
                {"model": "C", "response": "Synthesis"},
                {"aggregate_rankings": []},
            )

            conversation = client.post(
                "/api/conversations",
                json={"active_models": ["openai/gpt-5.5", "anthropic/claude-opus-4.8"]},
                headers={"X-Council-Key": "test-key"},
            ).json()

            override_models = ["google/gemini-3.1-pro-preview", "x-ai/grok-4.3"]
            response = client.post(
                f"/api/conversations/{conversation['id']}/message",
                json={"content": "Test", "models": override_models},
                headers={"X-Council-Key": "test-key"},
            )

            assert response.status_code == 200
            call_kwargs = mock_run.call_args.kwargs
            assert call_kwargs["council_models"] == override_models
            assert mock_run.call_args.args[0] == "AUGMENTED QUERY"
            assert response.json()["metadata"]["tool_context"]["enabled"] is True

    @patch("backend.main.generate_conversation_title")
    @patch("backend.main.augment_query_with_tool_context")
    @patch("backend.main.run_full_council")
    def test_send_message_falls_back_to_conversation_models(self, mock_run, mock_augment, mock_title, tmp_path):
        with patch("backend.storage.CONVERSATIONS_DIR", tmp_path):
            mock_title.return_value = "Test Title"
            mock_augment.return_value = (
                "AUGMENTED QUERY",
                {"enabled": True, "urls": [], "sources": []},
            )
            mock_run.return_value = (
                [{"model": "A", "response": "A"}],
                [],
                {"model": "C", "response": "Synthesis"},
                {},
            )

            active_models = ["openai/gpt-5.5", "anthropic/claude-opus-4.8"]
            conversation = client.post(
                "/api/conversations",
                json={"active_models": active_models},
                headers={"X-Council-Key": "test-key"},
            ).json()

            response = client.post(
                f"/api/conversations/{conversation['id']}/message",
                json={"content": "Test"},
                headers={"X-Council-Key": "test-key"},
            )

            assert response.status_code == 200
            call_kwargs = mock_run.call_args.kwargs
            assert call_kwargs["council_models"] == active_models
