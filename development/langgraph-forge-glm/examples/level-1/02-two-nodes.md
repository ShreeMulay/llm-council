# Two Nodes - Data Flow Between Nodes

Learn how data flows through multiple nodes in sequence.

## What You'll Learn

- How state updates propagate between nodes
- Each node sees the **current state** (all previous updates)
- Partial updates are merged automatically

## The Graph Structure

```
START → double_value → format_result → END
```

The flow:
1. **double_value**: Receives `start_value=5`, returns `doubled_value=10`
2. **format_result**: Receives full state (`start_value=5`, `doubled_value=10`), returns the final message
3. **END**: Returns the complete state with all fields

## Key Concept: State Accumulation

When a node returns a dictionary, LangGraph **merges** it with the current state. Each subsequent node sees **all accumulated state**.

### Step-by-Step Flow

```python
# Initial state
{"start_value": 5}

# After double_value node (partial update merged)
{"start_value": 5, "doubled_value": 10}

# After format_result node (another partial update merged)
{"start_value": 5, "doubled_value": 10, "result_message": "5 doubled is 10"}
```

## Running the Example

```python
# Initial state with start_value
result = compiled.invoke({"start_value": 5})

# Output
# Start: 5
# Doubled: 10
# Message: 5 doubled is 10
```

## Pattern: Sequential Transformation

This example demonstrates the **transformation pipeline** pattern:

```
Node 1 (Transform A) → Node 2 (Transform B) → Node 3 (Transform C)
```

Each node takes the accumulating state and adds to it. This is a common pattern when preparing data for output.

## What's Next

- Add LLM capabilities in [Example 3: LLM Node](./03-llm-node.md)
- Learn about conditional branching in [Example 4: Conditional Edge](./04-conditional-edge.md)