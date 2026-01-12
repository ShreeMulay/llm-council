# Simple Agent - Putting It All Together

Combine all concepts to build a simple conversational agent.

## What You'll Learn

- How state flows through a multi-step agent
- Intent analysis and conditional routing
- Multiple specialized nodes handling different tasks
- Building a complete agent from scratch

## The Graph Structure

```
                    route_by_intent()
                         ↓
START → analyze_intent → get_time / get_weather / help / general → END
```

The flow:
1. **analyze_intent**: Detects what the user wants (time, weather, help, or general)
2. **route_by_intent**: Routes to appropriate tool node
3. **Tool Nodes**: Execute specific task and generate response
4. **END**: Returns the final response

## Complete Agent Architecture

### State Schema
```python
class State(TypedDict):
    user_input: str    # What the user said
    intent: str        # What the user wants (detected)
    response: str      # Agent's reply
```

### Intent Analysis Node
```python
def analyze_intent(state: State) -> State:
    """Detect user intent from natural language."""
    text = state["user_input"].lower()

    if "time" in text:
        return {"intent": "get_time"}
    elif "weather" in text:
        return {"intent": "get_weather"}
    # ... more patterns
```

This node uses simple keyword matching. Real agents would use an LLM for intent detection.

### Tool Nodes
Each node handles a specific task:
- **get_time**: Returns current time
- **get_weather**: Returns weather information
- **help**: Provides usage instructions
- **general**: Fallback to general response

### Conditional Routing
```python
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
```

The routing function returns the intent, which maps to the appropriate node.

## Running the Example

```python
queries = [
    "What time is it?",        # Routes to get_time
    "How's the weather?",      # Routes to get_weather
    "Help me",                 # Routes to help
    "Tell me about programming",  # Routes to general
]
```

Output:
```
=== Simple Agent Demo ===

User: What time is it?
Intent: get_time
Agent: The current time is 2:30 PM

User: How's the weather?
Intent: get_weather
Agent: It's currently sunny and 72°F outside

User: Help me
Intent: help
Agent: I can tell you the time or weather. Just ask!

User: Tell me about programming
Intent: general
Agent: I heard: Tell me about programming. Can you tell me more?
```

## Agent Pattern Summary

This example demonstrates the **agent pattern**:

```
User Input → Intent Analysis → Conditional Routing → Tool Execution → Response
```

### Key Components

1. **State Schema**: Defines conversation state
2. **Intent Detection**: Understands user goal
3. **Tool Routing**: Chooses right tool for job
4. **Tool Execution**: Performs the task
5. **Response Generation**: Provides helpful answer

### Real-World Extensions

To make this a production agent:

1. **Use LLM for Intent Detection**: Replace keyword matching with semantic understanding
2. **Add Real Tools**: Call actual APIs (time service, weather API, etc.)
3. **Memory Integration**: Track conversation history
4. **Error Handling**: Graceful fallback for failed tool calls
5. **Feedback Loop**: Allow user to refine queries

## You've Completed Level 1!

You now understand:
- ✅ State schemas and data flow
- ✅ Creating and connecting nodes
- ✅ Conditional routing with edges
- ✅ Building simple agents

**Next Steps:**
- Experiment with more complex graphs
- Add real LLM integrations
- Explore LangGraph's built-in tools and agents
- Check out [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)