import pytest
from app.executor.error_analyzer import analyze_error


class TestKeyErrorSuggestions:
    """Test KeyError hint generation."""

    def test_keyerror_on_state_access(self):
        """Should suggest checking state initialization when accessing missing keys."""
        error = KeyError("'messages'")
        context = {
            "graph_code": """
                def agent_node(state):
                    return {"messages": state["messages"] + [new_message]}
            """,
            "entry_point": None,
        }

        result = analyze_error(error, context)

        assert result["error_type"] == "KeyError"
        assert "state initialization" in result["suggestions"].lower() or "'messages'" in result["suggestions"].lower()

    def test_keyerror_unknown_key(self):
        """Should handle KeyError with unknown key."""
        error = KeyError("'output'")
        context = {"graph_code": "print(some_dict['output'])", "entry_point": None}

        result = analyze_error(error, context)

        assert result["error_type"] == "KeyError"
        assert result["suggestions"]
        assert len(result["suggestions"]) > 0


class TestNodeExistsSuggestions:
    """Test node existence validation hints."""

    def test_node_not_found_in_graph(self):
        """Should suggest verifying node names when referencing non-existent nodes."""
        error = ValueError("Node 'missing_node' not found in graph")
        context = {
            "graph_code": """
                workflow.add_edge("agent", "missing_node")
            """,
            "entry_point": None,
        }

        result = analyze_error(error, context)

        assert result["error_type"] == "NodeError"
        assert "node" in result["suggestions"].lower() or "check" in result["suggestions"].lower()

    def test_edge_to_nonexistent_node(self):
        """Should suggest checking edge endpoints."""
        error = ValueError("Source 'source' not found")
        context = {
            "graph_code": """
                workflow.add_edge("source", "target")
            """,
            "entry_point": None,
        }

        result = analyze_error(error, context)

        assert result["error_type"] == "NodeError"
        assert result["suggestions"]


class TestAPIKeySuggestions:
    """Test API key related error hints."""

    def test_missing_api_key_error(self):
        """Should suggest setting API key when authentication fails."""
        error = ValueError("API key not found or empty")
        context = {"graph_code": "llm.invoke('hello')", "entry_point": None}

        result = analyze_error(error, context)

        assert result["error_type"] == "AuthenticationError"
        assert "api key" in result["suggestions"].lower() or ".env" in result["suggestions"].lower()

    def test_invalid_api_key_error(self):
        """Should suggest verifying API key when authentication fails."""
        error = PermissionError("Invalid API key")
        context = {"graph_code": "llm.invoke('hello')", "entry_point": None}

        result = analyze_error(error, context)

        assert result["error_type"] == "AuthenticationError"
        assert result["suggestions"]


class TestGenericErrorHandling:
    """Test fallback behavior for unknown errors."""

    def test_unknown_error_type(self):
        """Should return generic suggestion for unrecognized errors."""
        error = ValueError("Some unknown error")
        context = {"graph_code": "x = 1", "entry_point": None}

        result = analyze_error(error, context)

        assert result["error_type"] == "Unknown"
        assert result["suggestions"]
        assert len(result["suggestions"]) > 0

    def test_syntax_error_handling(self):
        """Should provide syntax error hints."""
        error = SyntaxError("invalid syntax")
        context = {"graph_code": "if True", "entry_point": None}

        result = analyze_error(error, context)

        assert result["error_type"] == "SyntaxError"
        assert result["suggestions"]
        assert "syntax" in result["suggestions"].lower() or "check" in result["suggestions"].lower()

    def test_attribute_error_handling(self):
        """Should provide attribute error hints."""
        error = AttributeError("module 'graph' has no attribute 'add_edge'")
        context = {"graph_code": "graph.add_edge()", "entry_point": None}

        result = analyze_error(error, context)

        assert result["error_type"] == "AttributeError"
        assert result["suggestions"]