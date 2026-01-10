import pytest
from app.executor.parser import parse_graph, find_entry_point


def test_parse_simple_graph():
    code = """
from langgraph.graph import StateGraph

workflow = StateGraph(MyState)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tool_node)
workflow.add_edge("agent", "tools")
workflow.set_entry_point("agent")
"""
    result = parse_graph(code)

    assert len(result["nodes"]) == 2
    assert any(n["id"] == "agent" for n in result["nodes"])
    assert any(n["id"] == "tools" for n in result["nodes"])

    assert len(result["edges"]) == 1
    assert result["edges"][0]["source"] == "agent"
    assert result["edges"][0]["target"] == "tools"


def test_parse_conditional_edges():
    code = """
workflow = StateGraph(MyState)
workflow.add_node("agent", agent_node)
workflow.add_node("end", end_node)
workflow.add_conditional_edges("agent", should_continue)
"""
    result = parse_graph(code)

    assert len(result["edges"]) >= 1

    conditional_edges = [e for e in result["edges"] if e.get("target") is None]
    assert len(conditional_edges) >= 1
    assert conditional_edges[0]["source"] == "agent"


def test_parse_entry_point():
    code = """
workflow = StateGraph(MyState)
workflow.add_node("agent", agent_node)
workflow.set_entry_point("agent")
"""
    result = find_entry_point(code)

    assert result is not None
    assert result["name"] == "agent"


def test_parse_entry_point_via_constant():
    code = """
START = "agent"
workflow = StateGraph(MyState)
workflow.add_node("agent", agent_node)
workflow.set_entry_point(START)
"""
    result = find_entry_point(code)

    assert result is not None
    assert result["name"] == "agent"


def test_parse_empty_code():
    code = ""
    result = parse_graph(code)

    assert result["nodes"] == []
    assert result["edges"] == []


def test_parse_syntax_error():
    code = "this is not valid python code [[["
    result = parse_graph(code)

    # Should return empty structure, not raise an error
    assert result["nodes"] == []
    assert result["edges"] == []


def test_parse_no_graph():
    code = "x = 1\ny = 2\nprint(x + y)"
    result = parse_graph(code)

    assert result["nodes"] == []
    assert result["edges"] == []