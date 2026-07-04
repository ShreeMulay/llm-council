"""Unit tests for backend.config module."""


from backend.config import (
    COMPACT_COUNCIL_MODELS,
    DEFAULT_CHAIRMAN_MODEL,
    DEFAULT_COUNCIL_MODELS,
    EVALUATOR_PRIORITY,
    FIREWORKS_MODEL_IDS,
    MODEL_ALIASES,
    VERTEX_ANTHROPIC_MODEL_IDS,
    get_model_reasoning_effort,
    get_openrouter_fallback,
    get_vertex_anthropic_model_id,
    is_fireworks_model,
    is_gemini_direct_model,
    is_vertex_anthropic_model,
    requires_vertex_anthropic,
    resolve_model_alias,
)


class TestResolveModelAlias:
    """Test model alias resolution."""

    def test_gpt_alias(self):
        assert resolve_model_alias("gpt") == "openai/gpt-5.5"

    def test_opus_alias(self):
        assert resolve_model_alias("opus") == "anthropic/claude-opus-4.8"

    def test_glm_alias(self):
        assert resolve_model_alias("glm") == "fireworks/glm-5.2"

    def test_glm_fireworks_alias(self):
        assert resolve_model_alias("glm-fw") == "fireworks/glm-5.2"

    def test_glm_zai_legacy_alias(self):
        assert resolve_model_alias("glm-zai") == "z-ai/glm-5.2"

    def test_gemini_alias(self):
        assert resolve_model_alias("gemini") == "google/gemini-3.1-pro-preview"

    def test_pro_alias(self):
        assert resolve_model_alias("pro") == "google/gemini-3.1-pro-preview"

    def test_grok_alias(self):
        assert resolve_model_alias("grok") == "x-ai/grok-4.3"

    def test_kimi_alias(self):
        assert resolve_model_alias("kimi") == "fireworks/kimi-k2.7-code"

    def test_kimi26_legacy_alias(self):
        assert resolve_model_alias("kimi26") == "fireworks/kimi-k2.6"

    def test_deepseek_alias(self):
        assert resolve_model_alias("deepseek") == "deepseek/deepseek-v4-pro"

    def test_llama_alias(self):
        assert resolve_model_alias("llama") == "meta-llama/llama-4-maverick"

    def test_qwen_alias(self):
        assert resolve_model_alias("qwen") == "qwen/qwen3.7-max"

    def test_fable_alias_available_as_default_member(self):
        assert resolve_model_alias("fable") == "anthropic/claude-fable-5"

    def test_sonnet_alias(self):
        assert resolve_model_alias("sonnet") == "anthropic/claude-sonnet-5"
        assert MODEL_ALIASES["sonnet"] == "anthropic/claude-sonnet-5"

    def test_minimax_alias_available_as_candidate(self):
        assert resolve_model_alias("minimax") == "minimax/minimax-m3"

    def test_flash_alias(self):
        assert resolve_model_alias("flash") == "google/gemini-3.5-flash"

    def test_unknown_alias_returns_input(self):
        assert resolve_model_alias("unknown-model") == "unknown-model"

    def test_case_insensitive(self):
        assert resolve_model_alias("GPT") == "openai/gpt-5.5"
        assert resolve_model_alias("OpUs") == "anthropic/claude-opus-4.8"

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
        assert get_model_reasoning_effort("anthropic/claude-opus-4.8") == "xhigh"

    def test_fireworks_glm_5_2_xhigh(self):
        assert get_model_reasoning_effort("fireworks/glm-5.2") == "xhigh"

    def test_fable_high(self):
        assert get_model_reasoning_effort("anthropic/claude-fable-5") == "high"

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

    def test_kimi_k2_7_code(self):
        assert is_fireworks_model("fireworks/kimi-k2.7-code") is True

    def test_fireworks_prefix(self):
        assert is_fireworks_model("fireworks/any-model") is True

    def test_non_fireworks(self):
        assert is_fireworks_model("openai/gpt-5.5") is False
        assert is_fireworks_model("anthropic/claude-opus-4.8") is False


class TestVertexAnthropicRouting:
    """Test Anthropic-on-Vertex primary routing metadata."""

    def test_fable_routes_to_vertex_anthropic_primary(self):
        assert is_vertex_anthropic_model("anthropic/claude-fable-5") is True
        assert get_vertex_anthropic_model_id("anthropic/claude-fable-5") == "claude-fable-5"
        assert "anthropic/claude-fable-5" in VERTEX_ANTHROPIC_MODEL_IDS

    def test_vertex_requirement_is_disabled_by_default(self):
        assert requires_vertex_anthropic("anthropic/claude-fable-5") is False

    def test_vertex_requirement_only_applies_to_vertex_models(self, monkeypatch):
        monkeypatch.setattr("backend.config.REQUIRE_VERTEX_ANTHROPIC", True)
        assert requires_vertex_anthropic("anthropic/claude-fable-5") is True
        assert requires_vertex_anthropic("anthropic/claude-opus-4.8") is False

    def test_opus_does_not_route_to_vertex_anthropic_primary(self):
        assert is_vertex_anthropic_model("anthropic/claude-opus-4.8") is False
        assert get_vertex_anthropic_model_id("anthropic/claude-opus-4.8") is None


class TestDefaultCouncilModels:
    """Test the 9-model council configuration."""

    def test_has_9_models(self):
        assert len(DEFAULT_COUNCIL_MODELS) == 9

    def test_includes_gpt_5_5(self):
        assert "openai/gpt-5.5" in DEFAULT_COUNCIL_MODELS

    def test_includes_fable_5(self):
        assert "anthropic/claude-fable-5" in DEFAULT_COUNCIL_MODELS

    def test_default_excludes_opus_4_8(self):
        assert "anthropic/claude-opus-4.8" not in DEFAULT_COUNCIL_MODELS

    def test_default_chairman_is_fable_5(self):
        assert DEFAULT_CHAIRMAN_MODEL == "anthropic/claude-fable-5"

    def test_includes_glm_5_2(self):
        assert "fireworks/glm-5.2" in DEFAULT_COUNCIL_MODELS

    def test_excludes_zai_glm_5_2_from_default(self):
        assert "z-ai/glm-5.2" not in DEFAULT_COUNCIL_MODELS

    def test_default_excludes_legacy_glm_5_1(self):
        assert "fireworks/glm-5.1" not in DEFAULT_COUNCIL_MODELS

    def test_includes_gemini_3_1(self):
        assert "google/gemini-3.1-pro-preview" in DEFAULT_COUNCIL_MODELS

    def test_includes_grok_4_20(self):
        assert "x-ai/grok-4.3" in DEFAULT_COUNCIL_MODELS

    def test_includes_kimi_k2_7_code(self):
        assert "fireworks/kimi-k2.7-code" in DEFAULT_COUNCIL_MODELS

    def test_excludes_kimi_k2_6_from_default(self):
        assert "fireworks/kimi-k2.6" not in DEFAULT_COUNCIL_MODELS

    def test_includes_deepseek_v4(self):
        assert "deepseek/deepseek-v4-pro" in DEFAULT_COUNCIL_MODELS

    def test_includes_llama_4(self):
        assert "meta-llama/llama-4-maverick" in DEFAULT_COUNCIL_MODELS

    def test_includes_qwen_3_7_max(self):
        assert "qwen/qwen3.7-max" in DEFAULT_COUNCIL_MODELS

    def test_default_excludes_legacy_qwen_3_5(self):
        assert "qwen/qwen3.5-122b-a10b" not in DEFAULT_COUNCIL_MODELS

    def test_minimax_remains_challenger_only(self):
        assert "minimax/minimax-m3" not in DEFAULT_COUNCIL_MODELS
        assert "meta-llama/llama-4-maverick" in DEFAULT_COUNCIL_MODELS

    def test_july_challengers_except_promoted_fable_are_not_default_rosters_or_evaluators(self):
        excluded = {
            "anthropic/claude-sonnet-5",
            "minimax/minimax-m3",
        }

        assert excluded.isdisjoint(DEFAULT_COUNCIL_MODELS)
        assert excluded.isdisjoint(COMPACT_COUNCIL_MODELS)
        assert excluded.isdisjoint(EVALUATOR_PRIORITY)

        assert "anthropic/claude-fable-5" in DEFAULT_COUNCIL_MODELS
        assert "anthropic/claude-fable-5" in COMPACT_COUNCIL_MODELS
        assert EVALUATOR_PRIORITY[0] == "anthropic/claude-fable-5"

class TestCompactCouncilModels:
    """Test compact council uses refreshed core roster."""

    def test_has_5_models(self):
        assert len(COMPACT_COUNCIL_MODELS) == 5

    def test_includes_glm_5_2(self):
        assert "fireworks/glm-5.2" in COMPACT_COUNCIL_MODELS

    def test_excludes_zai_glm_5_2(self):
        assert "z-ai/glm-5.2" not in COMPACT_COUNCIL_MODELS

    def test_includes_fable_5(self):
        assert "anthropic/claude-fable-5" in COMPACT_COUNCIL_MODELS

    def test_excludes_opus_4_8(self):
        assert "anthropic/claude-opus-4.8" not in COMPACT_COUNCIL_MODELS

    def test_excludes_legacy_glm_5_1(self):
        assert "fireworks/glm-5.1" not in COMPACT_COUNCIL_MODELS


class TestEvaluatorPriority:
    """Test evaluator priority list."""

    def test_has_3_evaluators(self):
        assert len(EVALUATOR_PRIORITY) == 3

    def test_fable_first(self):
        assert EVALUATOR_PRIORITY[0] == "anthropic/claude-fable-5"

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
        assert calculate_max_response_chars("anthropic/claude-fable-5", 9) == 8000
        assert calculate_max_response_chars("openai/gpt-5.5", 9) == 8000
        assert calculate_max_response_chars("deepseek/deepseek-v4-pro", 9) == 8000

    def test_legacy_opus_stays_strong_for_backcompat(self):
        """Explicit Opus usage keeps its historical truncation tier."""
        from backend.config import calculate_max_response_chars
        assert calculate_max_response_chars("anthropic/claude-opus-4.8", 9) == 8000

    def test_medium_models_get_10k(self):
        """Medium models get moderate space."""
        from backend.config import calculate_max_response_chars
        assert calculate_max_response_chars("google/gemini-3.1-pro-preview", 9) == 10000
        assert calculate_max_response_chars("x-ai/grok-4.3", 9) == 10000
        assert calculate_max_response_chars("fireworks/kimi-k2.6", 9) == 10000
        assert calculate_max_response_chars("fireworks/kimi-k2.7-code", 9) == 10000
        assert calculate_max_response_chars("fireworks/glm-5.2", 9) == 10000

    def test_weak_models_get_12k(self):
        """Weaker models (verbose) get more space."""
        from backend.config import calculate_max_response_chars
        assert calculate_max_response_chars("z-ai/glm-5.2", 9) == 10000
        assert calculate_max_response_chars("meta-llama/llama-4-maverick", 9) == 12000
        assert calculate_max_response_chars("qwen/qwen3.7-max", 9) == 10000

    def test_compact_mode_all_get_12k(self):
        """With 5 models (compact), all get maximum space."""
        from backend.config import calculate_max_response_chars
        assert calculate_max_response_chars("anthropic/claude-fable-5", 5) == 12000
        assert calculate_max_response_chars("z-ai/glm-5.2", 5) == 12000

    def test_unknown_model_defaults_to_12k(self):
        """Unknown models get default maximum."""
        from backend.config import calculate_max_response_chars
        assert calculate_max_response_chars("unknown/model", 9) == 12000


class TestFireworksModelIds:
    """Test Fireworks model ID configuration."""

    def test_includes_kimi_k2_6(self):
        assert "fireworks/kimi-k2.6" in FIREWORKS_MODEL_IDS

    def test_includes_kimi_k2_7_code(self):
        assert "fireworks/kimi-k2.7-code" in FIREWORKS_MODEL_IDS

    def test_includes_glm_5_2(self):
        assert "fireworks/glm-5.2" in FIREWORKS_MODEL_IDS

    def test_includes_glm_5_1(self):
        assert "fireworks/glm-5.1" in FIREWORKS_MODEL_IDS

    def test_includes_glm_5(self):
        assert "fireworks/glm-5" in FIREWORKS_MODEL_IDS


class TestOpenRouterFallbackMap:
    """Test current and legacy model fallback metadata."""

    def test_glm_5_2_routes_to_openrouter_zai_id(self):
        assert get_openrouter_fallback("z-ai/glm-5.2") == "z-ai/glm-5.2"

    def test_fireworks_glm_5_2_falls_back_to_openrouter_zai_id(self):
        assert get_openrouter_fallback("fireworks/glm-5.2") == "z-ai/glm-5.2"

    def test_gemini_3_5_flash_stays_on_openrouter(self):
        assert get_openrouter_fallback("google/gemini-3.5-flash") == "google/gemini-3.5-flash"
        assert is_gemini_direct_model("google/gemini-3.5-flash") is False

    def test_legacy_glm_5_1_keeps_explicit_fallback(self):
        assert get_openrouter_fallback("fireworks/glm-5.1") == "z-ai/glm-5.1"

    def test_qwen_3_7_max_routes_to_openrouter_id(self):
        assert get_openrouter_fallback("qwen/qwen3.7-max") == "qwen/qwen3.7-max"

    def test_legacy_qwen_3_5_keeps_explicit_fallback(self):
        assert get_openrouter_fallback("qwen/qwen3.5-122b-a10b") == "qwen/qwen3.5-122b-a10b"

    def test_fable_keeps_non_phi_openrouter_fallback_id(self):
        assert get_openrouter_fallback("anthropic/claude-fable-5") == "anthropic/claude-fable-5"


class TestModelAliasesCompleteness:
    """Test that all 9 models have aliases."""

    def test_all_council_models_have_aliases(self):
        """Every model in DEFAULT_COUNCIL_MODELS should be reachable via an alias."""
        alias_targets = set(MODEL_ALIASES.values())
        for model in DEFAULT_COUNCIL_MODELS:
            assert model in alias_targets, f"Model {model} has no alias"
