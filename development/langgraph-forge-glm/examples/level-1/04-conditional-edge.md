# Conditional Edge - Dynamic Flow Control

Learn how to route execution based on state values.

## What You'll Learn

- How to create conditional routing logic
- Nodes that analyze state and return routing decisions
- Using `add_conditional_edges()` for dynamic flow

## The Graph Structure

```
                      route_condition()
                            ↓
START → categorize → help / support / general → END
```

The flow:
1. **categorize**: Analyzes input, determines category
2. **route_condition**: Returns the routing key ("help", "support", or "general")
3. **Route**: Graph routes to the matching node
4. **END**: Returns final response

## Key Concept: Conditional Edges

Conditional edges let you **branch** execution based on state. This is the foundation of intelligent agents.

### The Routing Function

```python
def route_condition(state: State) -> Literal["help", "support", "general"]:
    """Route to the appropriate node based on category."""
    return state["category"]
```

The routing function:
- Takes the current **state** as input
- Returns a **route key** (one of the valid destination node names)
- Must be annotated with `Literal` for type safety

### Adding Conditional Edges

```python
graph.add_conditional_edges(
    "categorize",              # Source node
    route_condition,           # Routing function
    {
        "help": "help",        # route_key → node mapping
        "support": "support",
        "general": "general",
    }
)
```

The mapping connects route keys to destination nodes.

## Running the Example

```python
test_messages = [
    "I need help",           # Routes to "help" node
    "There's an error",      # Routes to "support" node
    "Hello there",           # Routes to "general" node
]
```

Output:
```
=== Conditional Edge Routing ===

Input: I need help
Category: help
Response: Here's how to get started with LangGraph...

Input: There's an error in my code
Category: support
Response: I'll help you troubleshoot the issue...

Input: Hello there
Category: general
Response: Thanks for your message!
```

## Pattern: Router Node

This example shows the **router node pattern**:

```
Router Node → Condition → Multiple Branch Nodes → Converge to END
```

Common uses:
- Intent classification (chatbots)
- Task routing (workflow automation)
- Priority handling (critical vs normal requests)

## What's Next

- Build a complete multi-step agent in [Example 5: Simple Agent](./05-simple-agent.md)