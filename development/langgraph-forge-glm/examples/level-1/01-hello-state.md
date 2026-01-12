# Hello State - Your First LangGraph

Learn the fundamentals of LangGraph with this simple example.

## What You'll Learn

- How to define a state schema
- How to create nodes that work with state
- How to connect nodes with edges
- How to compile and run a graph

## The Graph Structure

```
START → start_node → end_node → END
```

The flow:
1. **START**: Entry point of the graph
2. **start_node**: Initialises state with a greeting message
3. **end_node**: Returns the message unchanged
4. **END**: Graph termination (returns final state)

## Key Concepts

### State Schema

```python
class State(TypedDict):
    message: str
```

State is a `TypedDict` that defines the shape of data flowing through your graph. Every node receives the entire state and returns updates to it.

### Nodes

```python
def start_node(state: State) -> State:
    return {"message": "Hello, LangGraph!"}
```

- Nodes are **pure functions** that take state and return state updates
- Always return the fields you want to update (partial updates are merged)
- The return type `dict` is merged with the existing state

### Edges

```python
graph.add_edge(START, "start")
graph.add_edge("start", "end")
graph.add_edge("end", END)
```

- Edges define the **flow** between nodes
- `START` is a special entry point
- `END` is a special exit point (returns the final state)

### Compilation & Execution

```python
compiled = graph.compile()
result = compiled.invoke({})
```

- **compile()**: Builds the executable graph
- **invoke({})**: Runs the graph starting with empty state (or provide initial state)

## Running the Example

```python
# Run the graph
result = compiled_graph.invoke({})

# Output
# Result: {'message': 'Hello, LangGraph!'}
# Message: Hello, LangGraph!
```

## What's Next

- Learn about multiple nodes in [Example 2: Two Nodes](./02-two-nodes.md)
- See how to add LLM nodes in [Example 3: LLM Node](./03-llm-node.md)