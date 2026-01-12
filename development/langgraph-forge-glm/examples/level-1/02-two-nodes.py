"""Two Nodes - Data Flow Between Nodes

This example demonstrates how data flows through multiple nodes in sequence.
"""

from typing import TypedDict
from langgraph.graph import StateGraph, START, END


class State(TypedDict):
    """State schema with multiple fields."""
    start_value: int
    doubled_value: int
    result_message: str


def double_value(state: State) -> State:
    """Double the start value."""
    doubled = state["start_value"] * 2
    return {"doubled_value": doubled}


def format_result(state: State) -> State:
    """Format the result into a message."""
    message = f"{state['start_value']} doubled is {state['doubled_value']}"
    return {"result_message": message}


graph = StateGraph(State)

graph.add_node("double", double_value)
graph.add_node("format", format_result)

graph.add_edge(START, "double")
graph.add_edge("double", "format")
graph.add_edge("format", END)

compiled = graph.compile()

result = compiled.invoke({"start_value": 5})

print(f"Start: {result['start_value']}")
print(f"Doubled: {result['doubled_value']}")
print(f"Message: {result['result_message']}")