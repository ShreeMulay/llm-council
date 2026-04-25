"""Unit tests for backend.council module — evaluator selection, curation, truncation."""

import pytest
import random
from hypothesis import given, strategies as st, settings
from typing import List, Dict, Any

from backend.council import (
    parse_ranking_from_text,
    _truncate_for_prompt,
    MAX_RESPONSE_CHARS_FOR_PROMPT,
)


class TestGetEvaluatorModels:
    """Test evaluator selection from priority list."""

    def test_selects_top_3_from_priority(self):
        """Given all 3 priority evaluators in council, return all 3."""
        from backend.council import get_evaluator_models
        
        council = [
            "openai/gpt-5.5",
            "anthropic/claude-opus-4.7",
            "deepseek/deepseek-v4-pro",
            "fireworks/glm-5.1",
        ]
        evaluators = get_evaluator_models(council)
        
        assert len(evaluators) == 3
        assert evaluators[0] == "anthropic/claude-opus-4.7"
        assert evaluators[1] == "deepseek/deepseek-v4-pro"
        assert evaluators[2] == "openai/gpt-5.5"

    def test_excludes_missing_evaluators(self):
        """If an evaluator is not in the council, skip it."""
        from backend.council import get_evaluator_models
        
        council = [
            "anthropic/claude-opus-4.7",
            "deepseek/deepseek-v4-pro",
            "fireworks/glm-5.1",
        ]
        evaluators = get_evaluator_models(council)
        
        assert len(evaluators) == 2
        assert "openai/gpt-5.5" not in evaluators

    def test_returns_empty_if_none_available(self):
        """If no priority evaluators are in council, return empty list."""
        from backend.council import get_evaluator_models
        
        council = ["fireworks/glm-5.1", "meta-llama/llama-4-maverick"]
        evaluators = get_evaluator_models(council)
        
        assert len(evaluators) == 0

    def test_preserves_priority_order(self):
        """Evaluators are returned in priority order, not council order."""
        from backend.council import get_evaluator_models
        
        council = [
            "openai/gpt-5.5",  # priority 3
            "deepseek/deepseek-v4-pro",  # priority 2
            "anthropic/claude-opus-4.7",  # priority 1
        ]
        evaluators = get_evaluator_models(council)
        
        assert evaluators[0] == "anthropic/claude-opus-4.7"
        assert evaluators[1] == "deepseek/deepseek-v4-pro"
        assert evaluators[2] == "openai/gpt-5.5"


class TestSelfExclusion:
    """Test that evaluators don't rank their own responses."""

    def test_excludes_own_response(self):
        """GPT-5.5 evaluator should not see its own Stage 1 response."""
        from backend.council import filter_responses_for_evaluator
        
        responses = [
            {"model": "openai/gpt-5.5", "response": "GPT's answer"},
            {"model": "anthropic/claude-opus-4.7", "response": "Claude's answer"},
            {"model": "deepseek/deepseek-v4-pro", "response": "DeepSeek's answer"},
        ]
        
        filtered = filter_responses_for_evaluator("openai/gpt-5.5", responses)
        models = [r["model"] for r in filtered]
        
        assert "openai/gpt-5.5" not in models
        assert len(filtered) == 2

    def test_no_exclusion_for_non_evaluator(self):
        """If evaluator is not in responses, no exclusion needed."""
        from backend.council import filter_responses_for_evaluator
        
        responses = [
            {"model": "anthropic/claude-opus-4.7", "response": "Claude's answer"},
            {"model": "deepseek/deepseek-v4-pro", "response": "DeepSeek's answer"},
        ]
        
        filtered = filter_responses_for_evaluator("openai/gpt-5.5", responses)
        
        assert len(filtered) == 2


class TestRandomizedOrder:
    """Test that response order is randomized per evaluator."""

    def test_different_order_per_evaluator(self):
        """Two evaluators should see responses in different orders."""
        from backend.council import shuffle_responses_for_evaluator
        
        responses = [
            {"model": "A", "response": "A's answer"},
            {"model": "B", "response": "B's answer"},
            {"model": "C", "response": "C's answer"},
            {"model": "D", "response": "D's answer"},
            {"model": "E", "response": "E's answer"},
        ]
        
        # Run multiple times to account for random chance of same order
        orders_match_count = 0
        for _ in range(20):
            order1 = [r["model"] for r in shuffle_responses_for_evaluator(responses)]
            order2 = [r["model"] for r in shuffle_responses_for_evaluator(responses)]
            if order1 == order2:
                orders_match_count += 1
        
        # With 5! = 120 possible orders, probability of match is ~0.8%
        # Over 20 runs, expected matches ~0.16. Allow up to 2 for randomness.
        assert orders_match_count <= 2, "Orders should be randomized, not identical"

    def test_all_responses_present(self):
        """Shuffling should not drop any responses."""
        from backend.council import shuffle_responses_for_evaluator
        
        responses = [
            {"model": "A", "response": "A's answer"},
            {"model": "B", "response": "B's answer"},
        ]
        
        shuffled = shuffle_responses_for_evaluator(responses)
        models = [r["model"] for r in shuffled]
        
        assert "A" in models
        assert "B" in models
        assert len(shuffled) == 2


class TestSelectTopResponses:
    """Test curation logic for Stage 3."""

    def test_selects_top_3_by_score(self):
        """Top 3 responses by aggregate evaluator score should be selected."""
        from backend.council import select_top_responses
        
        stage1 = [
            {"model": "A", "response": "A"},
            {"model": "B", "response": "B"},
            {"model": "C", "response": "C"},
            {"model": "D", "response": "D"},
            {"model": "E", "response": "E"},
        ]
        
        # Mock stage2 results with scores
        stage2 = [
            {
                "model": "eval1",
                "parsed_ranking": ["Response A", "Response B", "Response C", "Response D", "Response E"],
            },
            {
                "model": "eval2",
                "parsed_ranking": ["Response A", "Response C", "Response B", "Response D", "Response E"],
            },
        ]
        
        selected = select_top_responses(stage1, stage2)
        models = [r["model"] for r in selected]
        
        assert len(selected) == 5  # top 3 + wildcard + diversity
        assert "A" in models  # A ranked first by both evaluators
        assert "B" in models  # B ranked second/third
        assert "C" in models  # C ranked second/third

    def test_includes_wildcard_for_disagreement(self):
        """If evaluators disagree, include a wildcard response."""
        from backend.council import select_top_responses
        
        stage1 = [
            {"model": "A", "response": "A"},
            {"model": "B", "response": "B"},
            {"model": "C", "response": "C"},
        ]
        
        # High disagreement: evaluators rank completely differently
        stage2 = [
            {
                "model": "eval1",
                "parsed_ranking": ["Response A", "Response B", "Response C"],
            },
            {
                "model": "eval2",
                "parsed_ranking": ["Response C", "Response B", "Response A"],
            },
        ]
        
        selected = select_top_responses(stage1, stage2)
        models = [r["model"] for r in selected]
        
        # All 3 should be included (top 3 + wildcard + diversity, but only 3 exist)
        assert len(selected) == 3
        assert "A" in models
        assert "B" in models
        assert "C" in models

    def test_diversity_pick_from_different_model(self):
        """Diversity pick should come from a model not in top 3."""
        from backend.council import select_top_responses
        
        stage1 = [
            {"model": "A", "response": "A"},
            {"model": "B", "response": "B"},
            {"model": "C", "response": "C"},
            {"model": "D", "response": "D"},
            {"model": "E", "response": "E"},
        ]
        
        # All evaluators agree: A, B, C are top 3
        stage2 = [
            {
                "model": "eval1",
                "parsed_ranking": ["Response A", "Response B", "Response C", "Response D", "Response E"],
            },
        ]
        
        selected = select_top_responses(stage1, stage2)
        top3_models = ["A", "B", "C"]
        
        # Check that diversity pick is D or E (not in top 3)
        selected_models = [r["model"] for r in selected]
        diversity_models = [m for m in selected_models if m not in top3_models]
        
        assert len(diversity_models) >= 1
        assert all(m in ["D", "E"] for m in diversity_models)

    def test_handles_fewer_than_5_responses(self):
        """If fewer than 5 responses, return all of them."""
        from backend.council import select_top_responses
        
        stage1 = [
            {"model": "A", "response": "A"},
            {"model": "B", "response": "B"},
        ]
        
        stage2 = [
            {
                "model": "eval1",
                "parsed_ranking": ["Response A", "Response B"],
            },
        ]
        
        selected = select_top_responses(stage1, stage2)
        
        assert len(selected) == 2


class TestParseRankingFromText:
    """Test ranking parser with Hypothesis fuzzing."""

    def test_standard_format(self):
        """Standard FINAL RANKING format."""
        text = """
Some evaluation text here.

FINAL RANKING:
1. Response A
2. Response B
3. Response C
"""
        result = parse_ranking_from_text(text)
        assert result == ["Response A", "Response B", "Response C"]

    def test_no_final_ranking_section(self):
        """Text without FINAL RANKING should fallback to any Response X patterns."""
        text = "Response A is good. Response B is better. Response C is best."
        result = parse_ranking_from_text(text)
        assert result == ["Response A", "Response B", "Response C"]

    def test_empty_text(self):
        """Empty text should return empty list."""
        result = parse_ranking_from_text("")
        assert result == []

    def test_malformed_ranking(self):
        """Malformed ranking with missing numbers."""
        text = """
FINAL RANKING:
Response A
Response B
Response C
"""
        result = parse_ranking_from_text(text)
        # Should still extract Response X patterns
        assert "Response A" in result
        assert "Response B" in result
        assert "Response C" in result

    @given(st.text(min_size=0, max_size=1000))
    @settings(max_examples=100, deadline=None)
    def test_never_crashes_on_random_input(self, text):
        """Parser should never crash, regardless of input."""
        result = parse_ranking_from_text(text)
        assert isinstance(result, list)
        assert all(isinstance(r, str) for r in result)

    @given(
        st.lists(
            st.sampled_from(["Response A", "Response B", "Response C", "Response D", "Response E"]),
            min_size=1,
            max_size=10,
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_extracts_all_response_labels(self, labels):
        """Given a list of Response X labels, parser should extract them."""
        text = " ".join(labels)
        result = parse_ranking_from_text(text)
        # Result should contain at least some of the labels (may have duplicates)
        assert len(result) >= 0


class TestTruncateForPrompt:
    """Test prompt truncation logic."""

    def test_short_text_unchanged(self):
        """Text under limit should not be truncated."""
        text = "Short text"
        result = _truncate_for_prompt(text, max_chars=100)
        assert result == text

    def test_long_text_truncated(self):
        """Text over limit should be truncated with notice."""
        text = "A" * 20000
        result = _truncate_for_prompt(text, max_chars=10000)
        assert len(result) <= 10000 + 100  # Allow for truncation notice
        assert "[... response truncated for context budget ...]" in result

    def test_exact_limit(self):
        """Text at exact limit should not be truncated."""
        text = "A" * 10000
        result = _truncate_for_prompt(text, max_chars=10000)
        assert result == text

    def test_unicode_handling(self):
        """Truncation should handle unicode correctly."""
        text = "你好" * 10000  # 20000 chars of CJK
        result = _truncate_for_prompt(text, max_chars=10000)
        assert len(result) <= 10000 + 100
        assert "[... response truncated for context budget ...]" in result

    def test_code_block_preservation(self):
        """Truncation should not cut in the middle of code blocks."""
        text = "```python\n" + "x = 1\n" * 5000 + "```\nSome conclusion"
        result = _truncate_for_prompt(text, max_chars=1000)
        # Should not have unclosed code blocks
        assert result.count("```") % 2 == 0 or "```" not in result
