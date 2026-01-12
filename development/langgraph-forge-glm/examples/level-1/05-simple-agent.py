"""Simple Agent - Putting It All Together

This example shows a simple agent that combines all concepts:
state, multiple nodes, LLM integration, and conditional routing.
"""

from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END


class State(TypedDict):
    """Agent state with conversation and tools."""
    user_input: str
    intent: str
    response: str


def analyze_intent(state: State) -> State:
    """Analyze user input to determine intent."""
    text = state["user_input"].lower()

    if "time" in text:
        intent = "get_time"
    elif "weather" in text:
        intent = "get_weather"
    elif "help" in text:
        intent = "help"
    else:
        intent = "general"

    return {"intent": intent}


def get_time_node(state: State) -> State:
    """Simulate getting the current time."""
    return {"response": "The current time is 2:30 PM"}


def get_weather_node(state: State) -> State:
    """Simulate getting weather information."""
    return {"response": "It's currently sunny and 72°F outside"}


def help_node(state: State) -> State:
    """Provide help information."""
    return {"response": "I can tell you the time or weather. Just ask!"}


def general_node(state: State) -> State:
    """Handle general queries with LLM."""
    response = f"I heard: {state['user_input']}. Can you tell me more?"
    return {"response": response}


def route_by_intent(state: State) -> Literal["get_time", "get_weather", "help", "general"]:
    """Route based on analyzed intent."""
    return state["intent"]


graph = StateGraph(State)

graph.add_node("analyze_intent", analyze_intent)
graph.add_node("get_time", get_time_node)
graph.add_node("get_weather", get_weather_node)
graph.add_node("help", help_node)
graph.add_node("general", general_node)

graph.add_edge(START, "analyze_intent")

graph.add_conditional_edges(
    "analyze_intent",
    route_by_intent,
    {
        "get_time": "get_time",
        "get_weather": "get_weather",
        "help": "help",
        "general": "general",
    }
)

graph.add_edge("get_time", END)
graph.add_edge("get_weather", END)
graph.add_edge("help", END)
graph.add_edge("general", END)

compiled = graph.compile()

print("=== Simple Agent Demo ===\n")

queries = [
    "What time is it?",
    "How's the weather?",
    "Help me",
    "Tell me about programming",
]

for query in queries:
    result = compiled.invoke({"user_input": query})
    print(f"User: {query}")
    print(f"Intent: {result['intent']}")
    print(f"Agent: {result['response']}")
    print()