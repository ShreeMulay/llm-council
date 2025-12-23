# AI Agent Frameworks: Getting Started Guide

> Your complete roadmap from zero to production AI agents

**Last Updated**: December 23, 2025

---

## Table of Contents

1. [Who Is This Guide For?](#who-is-this-guide-for)
2. [Prerequisites](#prerequisites)
3. [Part 1: Your First Agent (30 minutes)](#part-1-your-first-agent-30-minutes)
4. [Part 2: Adding Tools (30 minutes)](#part-2-adding-tools-30-minutes)
5. [Part 3: Building a RAG Agent (1 hour)](#part-3-building-a-rag-agent-1-hour)
6. [Part 4: Multi-Agent Systems (1-2 hours)](#part-4-multi-agent-systems-1-2-hours)
7. [Part 5: Production Considerations](#part-5-production-considerations)
8. [Part 6: Framework Migration Paths](#part-6-framework-migration-paths)
9. [Appendix: Cheat Sheets](#appendix-cheat-sheets)

---

## Who Is This Guide For?

| Persona | Background | Recommended Path |
|---------|------------|------------------|
| **Developer** | Python/TypeScript experience | Parts 1-5, then specialize |
| **Data Scientist** | ML experience, new to agents | Parts 1-3, focus on RAG |
| **Enterprise Architect** | System design, evaluating options | Review frameworks, Part 5 |
| **Non-technical** | Business user | Skip to Visual/Low-Code section |

---

## Prerequisites

### Required

- **Python 3.10+** or **Node.js 18+** (depending on framework)
- **API Keys** (at least one of):
  - OpenAI: https://platform.openai.com/api-keys
  - Anthropic: https://console.anthropic.com/
  - Google AI: https://aistudio.google.com/apikey
- **Basic understanding** of LLMs and prompts

### Optional but Recommended

- Git for version control
- Docker for sandboxed code execution
- VS Code with Python/Jupyter extensions

### Free Alternatives (No API Key Needed)

```bash
# Install Ollama for local models
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:8b

# Or use Groq's free tier (fast inference)
# Sign up at https://console.groq.com/
```

---

## Part 1: Your First Agent (30 minutes)

Choose your starting path based on your preferences:

### Option A: Simplest Start → Smolagents

**Best for**: Minimal dependencies, quick experimentation

```bash
pip install smolagents
```

```python
from smolagents import CodeAgent, HfApiModel
import os

# Use Hugging Face Inference API (free tier available)
os.environ["HF_TOKEN"] = "hf_..."  # Get from huggingface.co/settings/tokens

model = HfApiModel()
agent = CodeAgent(tools=[], model=model)

# Run your first agent
result = agent.run("What is the capital of France?")
print(result)
```

**Time to working agent**: ~5 minutes

---

### Option B: Type Safety → PydanticAI

**Best for**: Clean Python patterns, structured outputs

```bash
pip install pydantic-ai
```

```python
from pydantic_ai import Agent
import os

os.environ["OPENAI_API_KEY"] = "sk-..."

# Create agent
agent = Agent(
    'openai:gpt-4o-mini',  # Cheapest OpenAI option
    system_prompt='You are a helpful assistant. Be concise.'
)

# Synchronous run
result = agent.run_sync('Explain AI agents in one sentence.')
print(result.data)

# With structured output
from pydantic import BaseModel

class CityInfo(BaseModel):
    name: str
    country: str
    population: int

structured_agent = Agent(
    'openai:gpt-4o-mini',
    result_type=CityInfo,
    system_prompt='Extract city information.'
)

result = structured_agent.run_sync('Tell me about Tokyo')
print(f"City: {result.data.name}, Pop: {result.data.population:,}")
```

**Time to working agent**: ~5 minutes

---

### Option C: Most Popular → LangChain

**Best for**: Maximum ecosystem, extensive documentation

```bash
pip install langchain langchain-openai
```

```python
import os
os.environ["OPENAI_API_KEY"] = "sk-..."

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

# Create model
model = ChatOpenAI(model="gpt-4o-mini")

# Simple chat
messages = [
    SystemMessage(content="You are a helpful assistant."),
    HumanMessage(content="What is an AI agent?")
]

response = model.invoke(messages)
print(response.content)
```

**Time to working agent**: ~10 minutes

---

### Option D: Local Models → Ollama + Any Framework

**Best for**: No API costs, privacy, offline use

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.1:8b

# Test it
ollama run llama3.1:8b "Hello!"
```

```python
# With LangChain
from langchain_ollama import ChatOllama

model = ChatOllama(model="llama3.1:8b")
response = model.invoke("What is an AI agent?")
print(response.content)
```

```python
# With PydanticAI
from pydantic_ai import Agent

agent = Agent('ollama:llama3.1:8b')
result = agent.run_sync('What is an AI agent?')
print(result.data)
```

---

### Quick Comparison: First Agent

| Framework | Install Command | Lines of Code | Time to First Agent |
|-----------|-----------------|---------------|---------------------|
| Smolagents | `pip install smolagents` | 5 | 5 min |
| PydanticAI | `pip install pydantic-ai` | 6 | 5 min |
| LangChain | `pip install langchain langchain-openai` | 8 | 10 min |
| CrewAI | `pip install crewai` | 15 | 15 min |

---

## Part 2: Adding Tools (30 minutes)

Agents become powerful when they can use tools. Let's add some!

### What Are Tools?

Tools are functions that agents can call to:
- Search the web
- Read/write files
- Query databases
- Call APIs
- Execute code
- And much more...

### LangChain: Adding Tools

```python
from langchain_openai import ChatOpenAI
from langchain.agents import create_react_agent, AgentExecutor
from langchain.tools import tool
from langchain import hub
import os

os.environ["OPENAI_API_KEY"] = "sk-..."

# Define custom tools
@tool
def get_weather(location: str) -> str:
    """Get the current weather for a location."""
    # In real app, call weather API
    return f"Weather in {location}: Sunny, 72°F"

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        return str(eval(expression))
    except:
        return "Error evaluating expression"

@tool
def search_web(query: str) -> str:
    """Search the web for information."""
    # In real app, use search API
    return f"Search results for '{query}': [simulated results]"

# Create agent with tools
model = ChatOpenAI(model="gpt-4o-mini")
prompt = hub.pull("hwchase17/react")  # Pre-built ReAct prompt
tools = [get_weather, calculate, search_web]

agent = create_react_agent(model, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Test it!
result = executor.invoke({"input": "What's the weather in Paris and what's 25 * 4?"})
print(result["output"])
```

### PydanticAI: Adding Tools

```python
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel

class UserContext(BaseModel):
    user_name: str
    user_id: int

agent = Agent(
    'openai:gpt-4o-mini',
    deps_type=UserContext,
    system_prompt='You are a helpful assistant with access to tools.'
)

@agent.tool
def get_user_orders(ctx: RunContext[UserContext]) -> str:
    """Get the user's recent orders."""
    return f"Orders for {ctx.deps.user_name} (ID: {ctx.deps.user_id}): Order #1, Order #2"

@agent.tool
def calculate(expression: str) -> str:
    """Evaluate a math expression."""
    return str(eval(expression))

# Run with context
result = agent.run_sync(
    'What are my orders and what is 100 * 5?',
    deps=UserContext(user_name="Alice", user_id=123)
)
print(result.data)
```

### CrewAI: Adding Tools

```python
from crewai import Agent, Task, Crew
from crewai_tools import SerperDevTool, WebsiteSearchTool
import os

os.environ["OPENAI_API_KEY"] = "sk-..."
os.environ["SERPER_API_KEY"] = "..."  # Get from serper.dev

# Pre-built tools
search_tool = SerperDevTool()
web_tool = WebsiteSearchTool()

# Agent with tools
researcher = Agent(
    role="Research Analyst",
    goal="Find accurate information on any topic",
    backstory="Expert researcher with attention to detail",
    tools=[search_tool, web_tool],
    verbose=True
)

task = Task(
    description="Research the latest developments in AI agents",
    expected_output="Summary of key developments",
    agent=researcher
)

crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()
print(result)
```

### Tool Best Practices

1. **Clear descriptions**: The LLM uses descriptions to decide when to use tools
2. **Type hints**: Help the LLM understand expected inputs
3. **Error handling**: Return helpful error messages
4. **Keep tools focused**: One tool = one purpose

```python
# ❌ Bad: Vague description
@tool
def do_stuff(x: str) -> str:
    """Does stuff."""
    pass

# ✅ Good: Clear description with examples
@tool
def search_database(query: str) -> str:
    """Search the product database for items matching the query.
    
    Args:
        query: Search terms like 'red shoes' or 'laptop under $500'
    
    Returns:
        JSON list of matching products with name, price, and availability
    """
    pass
```

---

## Part 3: Building a RAG Agent (1 hour)

RAG (Retrieval-Augmented Generation) lets agents answer questions from your documents.

### The RAG Pipeline

```
Documents → Chunk → Embed → Store → Retrieve → Generate
```

### LangChain RAG Example

```bash
pip install langchain langchain-openai chromadb
```

```python
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
import os

os.environ["OPENAI_API_KEY"] = "sk-..."

# 1. Load and chunk documents
sample_docs = [
    "AI agents are autonomous systems that can perceive, reason, and act.",
    "LangChain is a framework for building LLM applications.",
    "RAG combines retrieval with generation for better answers.",
    "Vector databases store embeddings for semantic search.",
]

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=200,
    chunk_overlap=20
)
chunks = []
for doc in sample_docs:
    chunks.extend(text_splitter.split_text(doc))

# 2. Create embeddings and store
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_texts(chunks, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 2})

# 3. Create RAG chain
template = """Answer based on the following context:

Context: {context}

Question: {question}

Answer:"""

prompt = ChatPromptTemplate.from_template(template)
model = ChatOpenAI(model="gpt-4o-mini")

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | model
    | StrOutputParser()
)

# 4. Ask questions!
answer = chain.invoke("What is RAG?")
print(answer)
```

### LlamaIndex RAG Example

```bash
pip install llama-index llama-index-llms-openai
```

```python
from llama_index.core import VectorStoreIndex, Document
from llama_index.llms.openai import OpenAI
import os

os.environ["OPENAI_API_KEY"] = "sk-..."

# 1. Create documents
documents = [
    Document(text="AI agents are autonomous systems that can perceive and act."),
    Document(text="LlamaIndex specializes in data ingestion for LLMs."),
    Document(text="RAG improves LLM answers with retrieved context."),
]

# 2. Create index
index = VectorStoreIndex.from_documents(documents)

# 3. Query
query_engine = index.as_query_engine()
response = query_engine.query("What is RAG?")
print(response)
```

### Loading Real Documents

```python
# LangChain document loaders
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    WebBaseLoader,
    CSVLoader
)

# PDF
loader = PyPDFLoader("document.pdf")
docs = loader.load()

# Web page
loader = WebBaseLoader("https://example.com")
docs = loader.load()

# CSV
loader = CSVLoader("data.csv")
docs = loader.load()

# LlamaIndex loaders
from llama_index.core import SimpleDirectoryReader

# Load all files from a directory
documents = SimpleDirectoryReader("./data").load_data()
```

---

## Part 4: Multi-Agent Systems (1-2 hours)

When you need multiple specialized agents working together.

### When Do You Need Multi-Agent?

| Scenario | Single Agent | Multi-Agent |
|----------|--------------|-------------|
| Simple Q&A | ✅ | ❌ Overkill |
| Research + Writing | ⚠️ Can work | ✅ Better |
| Code + Review + Test | ❌ Complex | ✅ Recommended |
| Customer support triage | ⚠️ | ✅ Recommended |

### CrewAI: Role-Based Teams

```python
from crewai import Agent, Task, Crew, Process
import os

os.environ["OPENAI_API_KEY"] = "sk-..."

# Define specialized agents
researcher = Agent(
    role="Senior Research Analyst",
    goal="Uncover comprehensive insights on the topic",
    backstory="""You're a meticulous researcher with years of experience
    in gathering and analyzing information from various sources.""",
    verbose=True
)

writer = Agent(
    role="Content Writer",
    goal="Create engaging, clear content from research",
    backstory="""You're a skilled writer who transforms complex topics
    into accessible, compelling content.""",
    verbose=True
)

editor = Agent(
    role="Editor",
    goal="Ensure content is polished and error-free",
    backstory="""You're a detail-oriented editor with a keen eye
    for clarity, grammar, and flow.""",
    verbose=True
)

# Define tasks
research_task = Task(
    description="Research the topic of AI agents in 2025: trends, frameworks, use cases",
    expected_output="Detailed research notes with key findings",
    agent=researcher
)

writing_task = Task(
    description="Write a blog post based on the research",
    expected_output="A 500-word engaging blog post",
    agent=writer,
    context=[research_task]  # Uses output from research
)

editing_task = Task(
    description="Edit and polish the blog post",
    expected_output="Final polished blog post ready for publication",
    agent=editor,
    context=[writing_task]
)

# Create crew
crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[research_task, writing_task, editing_task],
    process=Process.sequential,  # One after another
    verbose=True
)

result = crew.kickoff()
print(result)
```

### LangGraph: Graph-Based Orchestration

```python
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from typing import TypedDict, Annotated, Literal
from operator import add

class AgentState(TypedDict):
    messages: Annotated[list, add]
    current_agent: str
    task_complete: bool

model = ChatOpenAI(model="gpt-4o-mini")

def researcher(state: AgentState) -> dict:
    """Research agent that gathers information."""
    # Simulate research
    research = "Research findings: AI agents are growing rapidly..."
    return {
        "messages": [f"Researcher: {research}"],
        "current_agent": "writer"
    }

def writer(state: AgentState) -> dict:
    """Writer agent that creates content."""
    # Use research from previous agent
    content = "Blog post based on research..."
    return {
        "messages": [f"Writer: {content}"],
        "current_agent": "reviewer"
    }

def reviewer(state: AgentState) -> dict:
    """Reviewer that checks quality."""
    return {
        "messages": ["Reviewer: Approved!"],
        "task_complete": True
    }

def route(state: AgentState) -> Literal["researcher", "writer", "reviewer", "end"]:
    if state.get("task_complete"):
        return "end"
    return state.get("current_agent", "researcher")

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("researcher", researcher)
workflow.add_node("writer", writer)
workflow.add_node("reviewer", reviewer)

workflow.set_entry_point("researcher")
workflow.add_conditional_edges("researcher", route)
workflow.add_conditional_edges("writer", route)
workflow.add_conditional_edges("reviewer", route, {"end": END})

app = workflow.compile()

# Run
result = app.invoke({
    "messages": [],
    "current_agent": "researcher",
    "task_complete": False
})

for msg in result["messages"]:
    print(msg)
```

### Choosing Between CrewAI and LangGraph

| Factor | CrewAI | LangGraph |
|--------|--------|-----------|
| **Learning curve** | Easier (role metaphor) | Steeper (graph concepts) |
| **Flexibility** | Opinionated | Maximum control |
| **Cycles/loops** | Limited | Full support |
| **State management** | Automatic | Explicit |
| **Best for** | Team collaboration | Complex workflows |

---

## Part 5: Production Considerations

### Observability: LangSmith Setup

```python
import os

# Enable tracing (works with LangChain, LangGraph, CrewAI)
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "ls_..."  # Get from smith.langchain.com
os.environ["LANGCHAIN_PROJECT"] = "my-agent-project"

# All your agent code is now automatically traced!
```

### Error Handling

```python
from langchain_core.runnables import RunnableWithFallbacks

# Primary model with fallback
primary = ChatOpenAI(model="gpt-4o")
fallback = ChatOpenAI(model="gpt-4o-mini")

model_with_fallback = primary.with_fallbacks([fallback])

# Retry logic
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def call_agent(query: str):
    return agent.invoke(query)
```

### Cost Management

```python
# Token tracking with callbacks
from langchain_community.callbacks import get_openai_callback

with get_openai_callback() as cb:
    result = chain.invoke("Your query here")
    print(f"Tokens used: {cb.total_tokens}")
    print(f"Cost: ${cb.total_cost:.4f}")
```

### Rate Limiting

```python
import time
from functools import wraps

def rate_limit(calls_per_minute: int):
    min_interval = 60.0 / calls_per_minute
    last_call = [0.0]
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_call[0]
            if elapsed < min_interval:
                time.sleep(min_interval - elapsed)
            result = func(*args, **kwargs)
            last_call[0] = time.time()
            return result
        return wrapper
    return decorator

@rate_limit(calls_per_minute=60)
def call_api(query):
    return agent.invoke(query)
```

### Security Basics

```python
# Input validation
import re

def sanitize_input(text: str, max_length: int = 1000) -> str:
    # Remove potential prompt injection patterns
    text = re.sub(r'(IGNORE|SYSTEM|INSTRUCTIONS)', '', text, flags=re.I)
    # Limit length
    text = text[:max_length]
    # Remove control characters
    text = ''.join(c for c in text if c.isprintable() or c in '\n\t')
    return text

# Use before passing to agent
user_input = sanitize_input(raw_user_input)
result = agent.invoke(user_input)
```

---

## Part 6: Framework Migration Paths

### LangChain → LangGraph

**When to migrate**: You need cycles, persistent state, or complex multi-agent.

```python
# Before: LangChain chain
chain = prompt | model | parser

# After: LangGraph node
from langgraph.graph import StateGraph

def llm_node(state):
    result = chain.invoke(state["input"])
    return {"output": result}

graph = StateGraph(State)
graph.add_node("llm", llm_node)
```

### LangChain → CrewAI

**When to migrate**: You want role-based multi-agent abstraction.

```python
# Before: LangChain agent
agent = create_react_agent(model, tools, prompt)

# After: CrewAI agent
from crewai import Agent

agent = Agent(
    role="Research Analyst",
    goal="Research topics thoroughly",
    backstory="Expert researcher",
    tools=tools  # Same tools work!
)
```

### Any Framework → Google ADK

**When to migrate**: Moving to Google Cloud, using Gemini.

```python
# Google ADK uses similar patterns
from google.adk.agents import LlmAgent

agent = LlmAgent(
    name="assistant",
    model="gemini-2.0-flash",
    instruction="You are helpful."
)
```

### Any Framework → Semantic Kernel

**When to migrate**: Moving to Azure, .NET team.

```python
# Semantic Kernel Python
import semantic_kernel as sk

kernel = sk.Kernel()
kernel.add_service(OpenAIChatCompletion(...))

# Similar plugin pattern
@kernel_function
def my_tool(input: str) -> str:
    return f"Processed: {input}"
```

---

## Appendix: Cheat Sheets

### Model Provider Comparison

| Provider | Best Model | Cost (Input/Output per 1M) | Speed | Best For |
|----------|-----------|---------------------------|-------|----------|
| **OpenAI** | GPT-4o | $2.50 / $10.00 | Fast | General purpose |
| **OpenAI** | GPT-4o-mini | $0.15 / $0.60 | Fast | Budget |
| **Anthropic** | Claude 3.5 Sonnet | $3.00 / $15.00 | Medium | Reasoning |
| **Google** | Gemini 2.0 Flash | $0.075 / $0.30 | Fast | Budget + multimodal |
| **Groq** | Llama 3.1 70B | $0.59 / $0.79 | Fastest | Speed critical |
| **Ollama** | Llama 3.1 8B | Free | Varies | Privacy, offline |

### Framework Quick Reference

| Task | Framework | Command |
|------|-----------|---------|
| Quick prototype | PydanticAI | `pip install pydantic-ai` |
| RAG application | LangChain + LlamaIndex | `pip install langchain llama-index` |
| Multi-agent team | CrewAI | `pip install crewai` |
| Complex workflows | LangGraph | `pip install langgraph` |
| Microsoft stack | Semantic Kernel | `pip install semantic-kernel` |
| Google Cloud | Google ADK | `pip install google-adk` |
| TypeScript | Mastra | `npm create mastra@latest` |

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `RateLimitError` | Too many API calls | Add rate limiting, use caching |
| `ContextLengthExceeded` | Input too long | Chunk documents, summarize |
| `InvalidAPIKey` | Wrong or expired key | Check env vars, regenerate key |
| `TimeoutError` | Slow response | Increase timeout, use faster model |
| `OutputParserError` | Invalid LLM output | Improve prompt, add retries |

### Environment Variables Template

```bash
# .env file
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_API_KEY=...

# LangSmith (observability)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls_...
LANGCHAIN_PROJECT=my-project

# Search (for tools)
SERPER_API_KEY=...
TAVILY_API_KEY=...
```

---

## Next Steps

1. **Pick a framework** based on your use case (see decision tree in dashboard)
2. **Build a simple agent** (Part 1)
3. **Add tools** for your specific needs (Part 2)
4. **Scale up** to RAG or multi-agent as needed
5. **Add observability** before production (Part 5)

### Resources

- **Dashboard**: `ai-agent-frameworks-dashboard.html`
- **Deep Dives**: `ai-agent-frameworks-deep-dive.md`
- **Pricing Calculator**: `ai-agent-pricing-calculator.html`
- **Full Comparison**: `ai-agent-frameworks-comparison.csv`

Happy building! 🚀
