"""Conditional Edge - Dynamic Flow Control

This example demonstrates conditional edges that route to different nodes based on state.
"""

from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END


class State(TypedDict):
    """State with user input and routing decision."""
    message: str
    category: str


def categorize_node(state: State) -> State:
    """Categorize the input message."""
    message = state["message"].lower()

    if "help" in message:
        category = "help"
    elif "error" in message or "problem" in message:
        category = "support"
    else:
        category = "general"

    return {"category": category}


def help_response_node(state: State) -> State:
    """Generate help response."""
    return {"message": "Here's how to get started with LangGraph..."}


def support_response_node(state: State) -> State:
    """Generate support response."""
    return {"message": "I'll help you troubleshoot the issue..."}


def general_response_node(state: State) -> State:
    """Generate general response."""
    return {"message": "Thanks for your message!"}


def route_condition(state: State) -> Literal["help", "support", "general"]:
    """Route to the appropriate node based on category."""
    return state["category"]


graph = StateGraph(State)

graph.add_node("categorize", categorize_node)
graph.add_node("help", help_response_node)
graph.add_node("support", support_response_node)
graph.add_node("general", general_response_node)

graph.add_edge(START, "categorize")

graph.add_conditional_edges(
    "categorize",
    route_condition,
    {
        "help": "help",
        "support": "support",
        "general": "general",
    }
)

graph.add_edge("help", END)
graph.add_edge("support", END)
graph.add_edge("general", END)

compiled = graph.compile()

test_messages = [
    "I need help",
    "There's an error in my code",
    "Hello there",
]

print("=== Conditional Edge Routing ===\n")

for msg in test_messages:
    result = compiled.invoke({"message": msg})
    print(f"Input: {msg}")
    print(f"Category: {result['category']}")
    print(f"Response: {result['message']}")
    print()