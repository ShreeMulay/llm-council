"""Error analyzer for LangGraph code execution errors."""

from typing import Any, Dict


def analyze_error(error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze an execution error and provide helpful suggestions.

    Args:
        error: The exception that occurred
        context: Additional context including graph_code and entry_point

    Returns:
        Dictionary with error_type and suggestions
    """
    error_type = _get_error_type(error)
    suggestions = _generate_suggestions(error, error_type, context)

    return {
        "error_type": error_type,
        "suggestions": suggestions,
    }


def _get_error_type(error: Exception) -> str:
    """Classify error into a user-friendly type."""
    error_msg = str(error).lower()

    if isinstance(error, KeyError):
        return "KeyError"
    elif isinstance(error, SyntaxError):
        return "SyntaxError"
    elif isinstance(error, AttributeError) and "attribute" in error_msg:
        return "AttributeError"
    elif isinstance(error, ValueError) and any(
        keyword in error_msg for keyword in ["node", "source", "target", "edge"]
    ):
        return "NodeError"
    elif isinstance(error, (ValueError, PermissionError)) and "api" in error_msg:
        return "AuthenticationError"
    elif isinstance(error, AttributeError):
        return "AttributeError"
    else:
        return "Unknown"


def _generate_suggestions(error: Exception, error_type: str, context: Dict[str, Any]) -> str:
    """Generate helpful suggestions based on error type and context."""
    graph_code = context.get("graph_code", "")
    error_msg = str(error).lower()

    if error_type == "KeyError":
        # Extract key from error message
        key = ""
        if isinstance(error, KeyError):
            key = str(error.args[0]) if error.args else ""

        suggestions = []
        if key:
            suggestions.append(f"Check if key {key} is initialized in the state.")
            suggestions.append(f"Verify that all state keys are defined before access.")
        suggestions.append("Make sure state values are returned from your node functions.")

        return " ".join(suggestions)

    elif error_type == "NodeError":
        suggestions = []
        if "not found" in error_msg:
            suggestions.append("Verify all node names are spelled correctly in the graph.")
            suggestions.append("Make sure nodes are added to the graph before connecting edges.")
            suggestions.append('Check that add_node() is called for each node before add_edge().')
        else:
            suggestions.append("Check your graph structure for invalid node references.")
            suggestions.append("Ensure all edge targets exist as nodes in the workflow.")

        return " ".join(suggestions)

    elif error_type == "AuthenticationError":
        suggestions = []
        suggestions.append("Check that your API keys are set in .env file.")
        suggestions.append("Verify the API key is valid and not expired.")
        suggestions.append('Ensure the provider is selected correctly (openrouter, cerebras, fireworks).')

        return " ".join(suggestions)

    elif error_type == "SyntaxError":
        return "Check your code syntax for typos, missing colons, or incorrect indentation."

    elif error_type == "AttributeError":
        suggestions = []
        if "has no attribute" in error_msg:
            suggestions.append("Verify the module or object has the attribute you're trying to access.")
            suggestions.append("Check for typos in attribute names.")
            suggestions.append("Make sure you're importing the correct module or class.")

        return " ".join(suggestions) if suggestions else "Check if the object or module has the attribute you're trying to use."

    else:  # Unknown error type
        suggestion = (
            "Review your code for logic errors or unexpected behavior. "
            "Try simplifying the code or adding print statements to debug."
        )
        return suggestion