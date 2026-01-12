"""LLM Node - Using Language Models in Graphs

This example demonstrates how to use LLM nodes to generate responses.
"""

from typing import TypedDict
from langgraph.graph import StateGraph, START, END


class State(TypedDict):
    """State with input query and LLM response."""
    user_query: str
    llm_response: str


def respond_node(state: State) -> State:
    """Generate a response to the user's query.

    In a real application, you would call an LLM API here.
    For demonstration, we'll simulate a response.
    """
    query = state["user_query"].lower()

    responses = {
        "hello": "Hello! How can I help you today?",
        "help": "I can help you learn about LangGraph!",
        "what is langgraph": "LangGraph is a framework for building stateful, multi-actor applications with LLMs.",
    }

    # Find matching response or use generic
    response = responses.get(query, "I'm not sure about that. Try asking about LangGraph!")

    return {"llm_response": response}


graph = StateGraph(State)

graph.add_node("llm", respond_node)

graph.add_edge(START, "llm")
graph.add_edge("llm", END)

compiled = graph.compile()

# Try different queries
queries = [
    "Hello",
    "Help",
    "What is LangGraph",
    "Something else",
]

print("=== LLM Node Examples ===\n")

for query in queries:
    result = compiled.invoke({"user_query": query})
    print(f"Query: {query}")
    print(f"Response: {result['llm_response']}")
    print()