"""Hello State - Your First LangGraph

This example demonstrates the simplest possible LangGraph:
A start node that initialises state, and an end node that returns it.
"""

from typing import TypedDict
from langgraph.graph import StateGraph, START, END


class State(TypedDict):
    """The state schema for this graph."""
    message: str


def start_node(state: State) -> State:
    """Initialise the state with a greeting."""
    return {"message": "Hello, LangGraph!"}


def end_node(state: State) -> State:
    """Pass the message through unchanged."""
    return state


# Create the graph
graph = StateGraph(State)

# Add nodes
graph.add_node("start", start_node)
graph.add_node("end", end_node)

# Add edges: START -> start -> end -> END
graph.add_edge(START, "start")
graph.add_edge("start", "end")
graph.add_edge("end", END)

# Compile the graph
compiled_graph = graph.compile()

# Run the graph
result = compiled_graph.invoke({})

# Print the result
print(f"Result: {result}")
print(f"Message: {result['message']}")