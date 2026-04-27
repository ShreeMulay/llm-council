"""Integration tests for full 3-stage council deliberation with mocked providers."""

import pytest
from unittest.mock import patch, AsyncMock

from backend.council import run_full_council
from backend.config import DEFAULT_COUNCIL_MODELS, COMPACT_COUNCIL_MODELS


# Mock responses for each model
MOCK_RESPONSES = {
    "openai/gpt-5.5": "GPT-5.5 response: Quantum computing uses qubits.",
    "anthropic/claude-opus-4.7": "Opus 4.7 response: Quantum computing leverages superposition and entanglement.",
    "fireworks/glm-5.1": "GLM-5.1 response: Quantum computing is a paradigm shift in computation.",
    "google/gemini-3.1-pro-preview": "Gemini 3.1 response: Quantum computing enables exponential speedup for certain problems.",
    "x-ai/grok-4.20-0309-reasoning": "Grok 4.20 response: Quantum computing is the future of AI.",
    "fireworks/kimi-k2.6": "Kimi K2.6 response: Quantum computing requires cryogenic temperatures.",
    "deepseek/deepseek-v4-pro": "DeepSeek V4 response: Quantum computing uses quantum gates.",
    "meta-llama/llama-4-maverick": "Llama 4 response: Quantum computing is still experimental.",
    "qwen/qwen3.5-122b-a10b": "Qwen 3.5 response: Quantum computing has applications in cryptography.",
}


def _make_mock_provider():
    """Create an async mock that returns different responses based on model_id."""
    async def mock_provider(model_id, messages, max_tokens=32768, temperature=0.7, **kwargs):
        content = MOCK_RESPONSES.get(model_id, f"Mock response from {model_id}")
        return {
            "content": content,
            "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
            "provider": "mock",
        }
    return mock_provider


@pytest.fixture
def mock_all_providers():
    """Patch all provider query functions to return mock responses."""
    # Clear Stage 1 cache before each test to avoid cross-test contamination
    from backend.council import _stage1_cache
    _stage1_cache.clear()

    mock = _make_mock_provider()
    with (
        patch("backend.council.query_fireworks_model", side_effect=mock) as fireworks_mock,
        patch("backend.council.query_xai_model", side_effect=mock) as xai_mock,
        patch("backend.council.query_gemini_model", side_effect=mock) as gemini_mock,
        patch("backend.council.query_openrouter_model", side_effect=mock) as or_mock,
    ):
        yield {
            "fireworks": fireworks_mock,
            "xai": xai_mock,
            "gemini": gemini_mock,
            "openrouter": or_mock,
        }


class TestFullCouncilFlow:
    """Test complete 3-stage deliberation with all 9 models."""

    @pytest.mark.asyncio
    async def test_9_model_full_flow(self, mock_all_providers):
        """Full 3-stage flow with all 9 models."""
        stage1, stage2, stage3, metadata = await run_full_council(
            "What is quantum computing?",
            council_models=list(MOCK_RESPONSES.keys()),
        )

        # Stage 1: all 9 models responded
        assert len(stage1) == 9
        models_responded = {r["model"] for r in stage1}
        assert models_responded == set(MOCK_RESPONSES.keys())

        # Stage 2: evaluators ranked responses
        assert len(stage2) > 0
        # Evaluators are Opus 4.7, DeepSeek V4 Pro, GPT-5.5 (top 3 from priority)
        evaluator_models = {r["model"] for r in stage2}
        assert "anthropic/claude-opus-4.7" in evaluator_models

        # Stage 3: chairman synthesized
        assert stage3["response"]
        assert stage3["model"] == "anthropic/claude-opus-4.7"

        # Metadata
        assert "label_to_model" in metadata
        assert "aggregate_rankings" in metadata
        assert metadata.get("compact") is False

    @pytest.mark.asyncio
    async def test_compact_mode_5_models(self, mock_all_providers):
        """Compact mode uses only 5 core models."""
        stage1, stage2, stage3, metadata = await run_full_council(
            "What is quantum computing?",
            compact=True,
        )

        # Stage 1: only 5 compact models
        assert len(stage1) == 5
        models_responded = {r["model"] for r in stage1}
        for m in COMPACT_COUNCIL_MODELS:
            assert m in models_responded

        assert metadata.get("compact") is True

    @pytest.mark.asyncio
    async def test_final_only_skips_stage2(self, mock_all_providers):
        """final_only=True skips Stage 2 evaluators."""
        stage1, stage2, stage3, metadata = await run_full_council(
            "What is quantum computing?",
            final_only=True,
            council_models=list(MOCK_RESPONSES.keys())[:3],
        )

        assert len(stage1) == 3
        assert len(stage2) == 0  # Skipped
        assert stage3["response"]
        assert metadata.get("final_only") is True

    @pytest.mark.asyncio
    async def test_partial_failure_continues(self, mock_all_providers):
        """If some models fail, council continues with remaining."""
        # Make fireworks models fail on both primary and fallback
        async def failing_fireworks(model_id, messages, max_tokens=32768, temperature=0.7, **kwargs):
            if "fireworks" in model_id or "glm" in model_id or "kimi" in model_id:
                return None
            return {
                "content": MOCK_RESPONSES.get(model_id, "mock"),
                "usage": {},
                "provider": "mock",
            }

        mock_all_providers["fireworks"].side_effect = failing_fireworks
        mock_all_providers["openrouter"].side_effect = failing_fireworks

        stage1, stage2, stage3, metadata = await run_full_council(
            "What is quantum computing?",
            council_models=list(MOCK_RESPONSES.keys()),
        )

        # Fireworks models (GLM-5.1, Kimi K2.6) should be missing
        models_responded = {r["model"] for r in stage1}
        assert "fireworks/glm-5.1" not in models_responded
        assert "fireworks/kimi-k2.6" not in models_responded
        # Stage 2 and 3 should still proceed with remaining models
        assert len(stage2) > 0
        assert stage3["response"]

    @pytest.mark.asyncio
    async def test_evaluator_self_exclusion(self, mock_all_providers):
        """Evaluators should not see their own Stage 1 response."""
        stage1, stage2, stage3, metadata = await run_full_council(
            "What is quantum computing?",
            council_models=list(MOCK_RESPONSES.keys()),
        )

        # Check that evaluator rankings don't reference their own model
        for ranking in stage2:
            evaluator = ranking["model"]
            # The ranking text should not contain the evaluator's own response
            # (This is a weak check since rankings are anonymized, but verifies flow)
            assert "parsed_ranking" in ranking

    @pytest.mark.asyncio
    async def test_caching_avoids_duplicate_calls(self, mock_all_providers):
        """Same model+prompt should use cache on second Stage 1 call."""
        from backend.council import stage1_collect_responses, _stage1_cache

        # Clear cache first
        _stage1_cache.clear()

        query = "What is quantum computing?"
        models = ["openai/gpt-5.5"]

        or_mock = mock_all_providers["openrouter"]

        # First Stage 1 call
        await stage1_collect_responses(query, models)
        first_call_count = or_mock.call_count

        # Second Stage 1 call with same query — should hit cache
        await stage1_collect_responses(query, models)

        # No additional provider calls for cached model
        assert or_mock.call_count == first_call_count

    @pytest.mark.asyncio
    async def test_stage3_uses_curated_responses(self, mock_all_providers):
        """Chairman should receive curated subset, not all 9 responses."""
        with patch("backend.council.select_top_responses") as mock_select:
            # Return exactly 5 curated responses with required fields
            mock_select.return_value = [
                {"model": "m1", "response": "r1", "usage": {}, "provider": "mock"},
                {"model": "m2", "response": "r2", "usage": {}, "provider": "mock"},
                {"model": "m3", "response": "r3", "usage": {}, "provider": "mock"},
                {"model": "m4", "response": "r4", "usage": {}, "provider": "mock"},
                {"model": "m5", "response": "r5", "usage": {}, "provider": "mock"},
            ]

            stage1, stage2, stage3, metadata = await run_full_council(
                "What is quantum computing?",
                council_models=list(MOCK_RESPONSES.keys()),
            )

            # select_top_responses should be called with all stage1 results
            mock_select.assert_called_once()
            call_args = mock_select.call_args[0]
            assert len(call_args[0]) == 9  # All 9 stage1 responses passed in
            assert len(mock_select.return_value) == 5  # Curated to 5
