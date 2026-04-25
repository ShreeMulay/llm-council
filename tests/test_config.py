"""Unit tests for backend.config module."""

import pytest
from hypothesis import given, strategies as st

from backend.config import (
    resolve_model_alias,
    get_model_reasoning_effort,
    is_fireworks_model,
    DEFAULT_COUNCIL_MODELS,
    FIREWORKS_MODEL_IDS,
    MODEL_ALIASES,
    EVALUATOR_PRIORITY,
)


class TestResolveModelAlias:
    """Test model alias resolution."""

    def test_gpt_alias(self):
        assert resolve_model_alias("gpt") == "openai/gpt-5.5"

    def test_opus_alias(self):
        assert resolve_model_alias("opus") == "anthropic/claude-opus-4.7"

    def test_glm_alias(self):
        assert resolve_model_alias("glm") == "fireworks/glm-5.1"

    def test_gemini_alias(self):
        assert resolve_model_alias("gemini") == "google/gemini-3.1-pro-preview"

    def test_pro_alias(self):
        assert resolve_model_alias("pro") == "google/gemini-3.1-pro-preview"

    def test_grok_alias(self):
        assert resolve_model_alias("grok") == "x-ai/grok-4.20-0309-reasoning"

    def test_kimi_alias(self):
        assert resolve_model_alias("kimi") == "fireworks/kimi-k2.6"

    def test_deepseek_alias(self):
        assert resolve_model_alias("deepseek") == "deepseek/deepseek-v4-pro"

    def test_llama_alias(self):
        assert resolve_model_alias("llama") == "meta-llama/llama-4-maverick"

    def test_qwen_alias(self):
        assert resolve_model_alias("qwen") == "qwen/qwen3.5-122b-a10b"

    def test_sonnet_alias(self):
        assert resolve_model_alias("sonnet") == "anthropic/claude-sonnet-4.5"

    def test_flash_alias(self):
        assert resolve_model_alias("flash") == "google/gemini-3-flash-preview"

    def test_unknown_alias_returns_input(self):
        assert resolve_model_alias("unknown-model") == "unknown-model"

    def test_case_insensitive(self):
        assert resolve_model_alias("GPT") == "openai/gpt-5.5"
        assert resolve_model_alias("OpUs") == "anthropic/claude-opus-4.7"

    def test_whitespace_stripped(self):
        assert resolve_model_alias("  gpt  ") == "openai/gpt-5.5"


class TestGetModelReasoningEffort:
    """Test dual-mode reasoning effort for GPT-5.5."""

    def test_gpt_5_5_stage1_medium(self):
        """GPT-5.5 as responder uses medium reasoning."""
        assert get_model_reasoning_effort("openai/gpt-5.5") == "medium"

    def test_gpt_5_5_evaluator_high(self):
        """GPT-5.5 as evaluator uses high reasoning."""
        assert get_model_reasoning_effort("openai/gpt-5.5-evaluator") == "high"

    def test_opus_xhigh(self):
        assert get_model_reasoning_effort("anthropic/claude-opus-4.7") == "xhigh"

    def test_unknown_model_returns_none(self):
        assert get_model_reasoning_effort("unknown/model") is None

    def test_gemini_no_reasoning(self):
        assert get_model_reasoning_effort("google/gemini-3.1-pro-preview") is None


class TestIsFireworksModel:
    """Test Fireworks model identification."""

    def test_glm_5_1(self):
        assert is_fireworks_model("fireworks/glm-5.1") is True

    def test_glm_5(self):
        assert is_fireworks_model("fireworks/glm-5") is True

    def test_kimi_k2_6(self):
        assert is_fireworks_model("fireworks/kimi-k2.6") is True

    def test_fireworks_prefix(self):
        assert is_fireworks_model("fireworks/any-model") is True

    def test_non_fireworks(self):
        assert is_fireworks_model("openai/gpt-5.5") is False
        assert is_fireworks_model("anthropic/claude-opus-4.7") is False


class TestDefaultCouncilModels:
    """Test the 9-model council configuration."""

    def test_has_9_models(self):
        assert len(DEFAULT_COUNCIL_MODELS) == 9

    def test_includes_gpt_5_5(self):
        assert "openai/gpt-5.5" in DEFAULT_COUNCIL_MODELS

    def test_includes_opus_4_7(self):
        assert "anthropic/claude-opus-4.7" in DEFAULT_COUNCIL_MODELS

    def test_includes_glm_5_1(self):
        assert "fireworks/glm-5.1" in DEFAULT_COUNCIL_MODELS

    def test_includes_gemini_3_1(self):
        assert "google/gemini-3.1-pro-preview" in DEFAULT_COUNCIL_MODELS

    def test_includes_grok_4_20(self):
        assert "x-ai/grok-4.20-0309-reasoning" in DEFAULT_COUNCIL_MODELS

    def test_includes_kimi_k2_6(self):
        assert "fireworks/kimi-k2.6" in DEFAULT_COUNCIL_MODELS

    def test_includes_deepseek_v4(self):
        assert "deepseek/deepseek-v4-pro" in DEFAULT_COUNCIL_MODELS

    def test_includes_llama_4(self):
        assert "meta-llama/llama-4-maverick" in DEFAULT_COUNCIL_MODELS

    def test_includes_qwen_3_5(self):
        assert "qwen/qwen3.5-122b-a10b" in DEFAULT_COUNCIL_MODELS


class TestEvaluatorPriority:
    """Test evaluator priority list."""

    def test_has_3_evaluators(self):
        assert len(EVALUATOR_PRIORITY) == 3

    def test_opus_first(self):
        assert EVALUATOR_PRIORITY[0] == "anthropic/claude-opus-4.7"

    def test_deepseek_second(self):
        assert EVALUATOR_PRIORITY[1] == "deepseek/deepseek-v4-pro"

    def test_gpt_third(self):
        assert EVALUATOR_PRIORITY[2] == "openai/gpt-5.5"


class TestTieredTruncation:
    """Test tiered truncation allocation."""

    def test_strong_models_get_8k(self):
        """Strong models (concise) get less space."""
        # These functions don't exist yet — they will be added to config.py
        from backend.config import calculate_max_response_chars
        assert calculate_max_response_chars("anthropic/claude-opus-4.7", 9) == 8000
        assert calculate_max_response_chars("openai/gpt-5.5", 9) == 8000
        assert calculate_max_response_chars("deepseek/deepseek-v4-pro", 9) == 8000

    def test_medium_models_get_10k(self):
        """Medium models get moderate space."""
        from backend.config import calculate_max_response_chars
        assert calculate_max_response_chars("google/gemini-3.1-pro-preview", 9) == 10000
        assert calculate_max_response_chars("x-ai/grok-4.20-0309-reasoning", 9) == 10000
        assert calculate_max_response_chars("fireworks/kimi-k2.6", 9) == 10000

    def test_weak_models_get_12k(self):
        """Weaker models (verbose) get more space."""
        from backend.config import calculate_max_response_chars
        assert calculate_max_response_chars("fireworks/glm-5.1", 9) == 12000
        assert calculate_max_response_chars("meta-llama/llama-4-maverick", 9) == 12000
        assert calculate_max_response_chars("qwen/qwen3.5-122b-a10b", 9) == 12000

    def test_compact_mode_all_get_12k(self):
        """With 5 models (compact), all get maximum space."""
        from backend.config import calculate_max_response_chars
        assert calculate_max_response_chars("anthropic/claude-opus-4.7", 5) == 12000
        assert calculate_max_response_chars("fireworks/glm-5.1", 5) == 12000

    def test_unknown_model_defaults_to_12k(self):
        """Unknown models get default maximum."""
        from backend.config import calculate_max_response_chars
        assert calculate_max_response_chars("unknown/model", 9) == 12000


class TestFireworksModelIds:
    """Test Fireworks model ID configuration."""

    def test_includes_kimi_k2_6(self):
        assert "fireworks/kimi-k2.6" in FIREWORKS_MODEL_IDS

    def test_includes_glm_5_1(self):
        assert "fireworks/glm-5.1" in FIREWORKS_MODEL_IDS

    def test_includes_glm_5(self):
        assert "fireworks/glm-5" in FIREWORKS_MODEL_IDS


class TestModelAliasesCompleteness:
    """Test that all 9 models have aliases."""

    def test_all_council_models_have_aliases(self):
        """Every model in DEFAULT_COUNCIL_MODELS should be reachable via an alias."""
        alias_targets = set(MODEL_ALIASES.values())
        for model in DEFAULT_COUNCIL_MODELS:
            assert model in alias_targets, f"Model {model} has no alias"
