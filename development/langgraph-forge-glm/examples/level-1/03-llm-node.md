# LLM Node - Using Language Models in Graphs

Learn how to use LLM nodes to generate responses.

## What You'll Learn

- How to create an LLM node that processes input
- The node receives state and returns LLM-generated output
- How state flows into and out of the LLM node

## The Graph Structure

```
START → llm_node → END
```

Simple flow: input query → LLM node generates response → END returns response

## Key Concept: LLM Node Pattern

```python
def respond_node(state: State) -> State:
    """Generate a response to the user's query."""
    query = state["user_query"]

    # Call LLM API here (simulated for demo)
    response = call_llm(query)

    return {"llm_response": response}
```

The pattern:
1. **Extract** relevant data from state
2. **Call** LLM (or other API)
3. **Return** result as state update

## Running the Example

```python
# The graph handles multiple queries
queries = ["Hello", "Help", "What is LangGraph", "Something else"]

for query in queries:
    result = compiled.invoke({"user_query": query})
    print(f"Query: {query}")
    print(f"Response: {result['llm_response']}")
```

Output:
```
=== LLM Node Examples ===

Query: Hello
Response: Hello! How can I help you today?

Query: Help
Response: I can help you learn about LangGraph!

Query: What is LangGraph
Response: LangGraph is a framework for building stateful, multi-actor applications with LLMs.

Query: Something else
Response: I'm not sure about that. Try asking about LangGraph!
```

## Real-World Usage

In production, you would replace the simulated logic with an actual LLM call:

```python
from openai import OpenAI

client = OpenAI()

def respond_node(state: State) -> State:
    query = state["user_query"]
    completion = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": query}]
    )
    return {"llm_response": completion.choices[0].message.content}
```

LangGraph provides built-in support for LLM providers with the `ChatOpenAI` integration.

## What's Next

- Learn branching logic in [Example 4: Conditional Edge](./04-conditional-edge.md)
- Build a multi-step agent in [Example 5: Simple Agent](./05-simple-agent.md)