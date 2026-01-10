import pytest


def parse_graph(code: str) -> dict:
    """Parse LangGraph code to extract graph structure.

    Args:
        code: Python code containing LangGraph graph definition

    Returns:
        Dict with 'nodes' and 'edges' extracted from the code
    """
    import ast
    import re

    nodes = []
    edges = []

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return {"nodes": [], "edges": []}

    # Find StateGraph calls
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute):
                if node.func.attr == "StateGraph":
                    # Found StateGraph creation
                    pass

            # Look for add_node calls
            if isinstance(node.func, ast.Attribute):
                if node.func.attr == "add_node":
                    if node.args and isinstance(node.args[0], ast.Constant):
                        node_name = node.args[0].value
                        node_type = "llm"  # Default type, could be inferred from context
                        nodes.append({"id": node_name, "type": node_type})

                # Look for add_edge calls
                if node.func.attr == "add_edge":
                    if len(node.args) >= 2 and isinstance(node.args[0], ast.Constant) and isinstance(node.args[1], ast.Constant):
                        source = node.args[0].value
                        target = node.args[1].value
                        edges.append(
                            {
                                "source": source,
                                "target": target,
                            }
                        )

                # Look for add_conditional_edges
                if node.func.attr == "add_conditional_edges":
                    if node.args and isinstance(node.args[0], ast.Constant):
                        source = node.args[0].value
                        edges.append(
                            {
                                "source": source,
                                "target": None,  # Conditional edges don't have single target
                            }
                        )

    # Also search with regex as fallback for simpler cases
    add_node_matches = re.findall(r'add_node\s*\(\s*["\']([^"\']+)["\']', code)
    for match in add_node_matches:
        if not any(n["id"] == match for n in nodes):
            nodes.append({"id": match, "type": "llm"})

    add_edge_matches = re.findall(r'add_edge\s*\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']', code)
    for source, target in add_edge_matches:
        if not any(e["source"] == source and e["target"] == target for e in edges):
            edges.append({"source": source, "target": target})

    return {"nodes": nodes, "edges": edges}


def find_entry_point(code: str) -> dict | None:
    """Find the entry point node in the graph.

    Args:
        code: Python code containing LangGraph graph definition

    Returns:
        Node dict representing the entry point, or None
    """
    import re

    # Look for set_entry_point calls
    match = re.search(r'set_entry_point\s*\(\s*["\']([^"\']+)["\']', code)
    if match:
        return {"name": match.group(1)}

    # Look for START constant references
    start_match = re.search(r'START\s*=\s*["\']([^"\']+)["\']', code)
    if start_match:
        return {"name": start_match.group(1)}

    return None