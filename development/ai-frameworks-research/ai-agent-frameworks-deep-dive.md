# AI Agent Frameworks Deep-Dive Guide

> Comprehensive analysis of the top AI agent frameworks with code examples, strengths, limitations, and production guidance.

**Last Updated**: December 23, 2025

---

## Table of Contents

1. [Tier 1: Core Orchestration Frameworks](#tier-1-core-orchestration-frameworks)
   - [LangChain](#langchain)
   - [LangGraph](#langgraph)
   - [CrewAI](#crewai)
   - [AutoGen](#autogen)
   - [Semantic Kernel](#semantic-kernel)
   - [Google ADK](#google-adk)
2. [Tier 2: RAG & Specialized Frameworks](#tier-2-rag--specialized-frameworks)
   - [LlamaIndex](#llamaindex)
   - [Haystack](#haystack)
   - [PydanticAI](#pydanticai)
   - [Agno](#agno)
   - [OpenAI Agents SDK](#openai-agents-sdk)
3. [Tier 3: Lightweight & Emerging](#tier-3-lightweight--emerging)
   - [DSPy](#dspy)
   - [Mastra](#mastra)
   - [Letta](#letta)
   - [Smolagents](#smolagents)
   - [Genkit](#genkit)

---

# Tier 1: Core Orchestration Frameworks

## LangChain

### Overview

LangChain is the most widely adopted LLM orchestration framework, providing a comprehensive toolkit for building AI applications. Created by Harrison Chase, it became a unicorn company in 2025 with $125M in funding.

**Philosophy**: Modular, composable abstractions that can be mixed and matched to build complex LLM applications.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 122,488 |
| License | MIT |
| First Release | October 2022 |
| Languages | Python, JavaScript/TypeScript |
| Funding | $125M Series B ($1.25B valuation) |

### Core Concepts

- **Chains**: Deterministic sequences of LLM calls and transformations
- **Agents**: LLM-driven decision-making with tool selection
- **Tools**: Wrappers around external APIs and functions
- **Memory**: Conversation state persistence
- **LCEL (LangChain Expression Language)**: Declarative composition syntax

### Installation & Quick Start

```bash
pip install langchain langchain-openai
```

```python
import os
os.environ["OPENAI_API_KEY"] = "sk-..."

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

# Simple chat
model = ChatOpenAI(model="gpt-4o")
response = model.invoke([HumanMessage(content="Hello!")])
print(response.content)
```

### Code Examples

#### Agent with Tools

```python
from langchain_openai import ChatOpenAI
from langchain.agents import create_react_agent, AgentExecutor
from langchain.tools import tool
from langchain import hub

@tool
def search_web(query: str) -> str:
    """Search the web for information."""
    return f"Results for: {query}"

@tool
def calculate(expression: str) -> str:
    """Evaluate a math expression."""
    return str(eval(expression))

model = ChatOpenAI(model="gpt-4o")
prompt = hub.pull("hwchase17/react")
tools = [search_web, calculate]

agent = create_react_agent(model, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

result = executor.invoke({"input": "What is 25 * 4?"})
```

#### RAG Example

```python
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough

# Create vector store
embeddings = OpenAIEmbeddings()
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000)
texts = text_splitter.split_text("Your document content here...")
vectorstore = Chroma.from_texts(texts, embeddings)
retriever = vectorstore.as_retriever()

# RAG chain
prompt = ChatPromptTemplate.from_template("""
Answer based on context:
{context}

Question: {question}
""")

model = ChatOpenAI(model="gpt-4o")

chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | model
)

result = chain.invoke("What does the document say about X?")
```

### Strengths

- **Massive ecosystem**: 150+ document loaders, 60+ vector stores
- **Rapid prototyping**: Get from idea to demo quickly
- **Standardized interfaces**: Easily swap providers
- **Active community**: Extensive tutorials and examples
- **LCEL**: Clean, readable chain composition
- **Enterprise support**: LangSmith for observability

### Limitations & Criticisms

- **Over-engineered**: Too many abstractions for simple use cases
- **Dependency bloat**: Heavy package with many transitive dependencies
- **API churn**: Frequent breaking changes cause migration pain
- **Documentation gaps**: Often outdated or incomplete
- **"Abstraction complexity"**: Can fight you for edge cases

**From Reddit/HN**:
> "LangChain complicates more than it helps: abstractions are leaky, API is not consistent across components"

### When to Use

✅ **Use LangChain when**:
- Building chatbots or conversational AI
- RAG applications with standard patterns
- Quick prototyping and proof-of-concepts
- You need many integrations out of the box
- Team already knows LangChain

❌ **Don't use LangChain when**:
- Simple, single LLM calls (use direct API)
- You need stable, unchanging APIs
- Edge cases that fight abstractions
- Minimal dependencies are important

### Production Deployment

**Recommended Stack**:
- LangChain + LangGraph (orchestration)
- LangSmith (observability)
- Redis/PostgreSQL (state persistence)

**Observability**: 
```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "ls_..."
# All chains are now traced automatically
```

---

## LangGraph

### Overview

LangGraph is LangChain's graph-based orchestration layer for building complex, stateful, multi-agent workflows. Released in early 2024 to address limitations of linear chains.

**Philosophy**: State machines and directed graphs for agent workflows that need cycles, persistence, and human-in-the-loop.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 22,446 |
| License | MIT |
| First Release | January 2024 |
| Languages | Python, JavaScript/TypeScript |

### Core Concepts

- **StateGraph**: Directed graph of nodes with shared state
- **Nodes**: Functions that read/modify state
- **Edges**: Connections (static or conditional)
- **Checkpointer**: State persistence layer
- **Supersteps**: Parallel execution rounds

### Installation & Quick Start

```bash
pip install langgraph langchain-openai
```

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
from operator import add

class State(TypedDict):
    messages: Annotated[list, add]

def chatbot(state: State):
    # Your LLM logic here
    return {"messages": ["Hello from chatbot!"]}

graph = StateGraph(State)
graph.add_node("chatbot", chatbot)
graph.set_entry_point("chatbot")
graph.add_edge("chatbot", END)

app = graph.compile()
result = app.invoke({"messages": ["Hi!"]})
```

### Code Examples

#### Multi-Agent with Conditional Routing

```python
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from typing import TypedDict, Literal

class AgentState(TypedDict):
    messages: list
    next_agent: str

def supervisor(state: AgentState) -> dict:
    """Route to appropriate agent based on task."""
    # Analyze the last message and decide routing
    return {"next_agent": "researcher"}  # or "writer"

def researcher(state: AgentState) -> dict:
    """Research agent that gathers information."""
    return {"messages": state["messages"] + ["Research results..."]}

def writer(state: AgentState) -> dict:
    """Writer agent that creates content."""
    return {"messages": state["messages"] + ["Written content..."]}

def route(state: AgentState) -> Literal["researcher", "writer", "end"]:
    if state["next_agent"] == "researcher":
        return "researcher"
    elif state["next_agent"] == "writer":
        return "writer"
    return "end"

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("supervisor", supervisor)
workflow.add_node("researcher", researcher)
workflow.add_node("writer", writer)

workflow.set_entry_point("supervisor")
workflow.add_conditional_edges("supervisor", route, {
    "researcher": "researcher",
    "writer": "writer",
    "end": END
})
workflow.add_edge("researcher", "supervisor")
workflow.add_edge("writer", END)

app = workflow.compile()
```

#### With Checkpointing (Persistence)

```python
from langgraph.checkpoint.sqlite import SqliteSaver

# Create checkpointer
checkpointer = SqliteSaver.from_conn_string("state.db")

# Compile with checkpointing
app = workflow.compile(checkpointer=checkpointer)

# Resume from checkpoint
config = {"configurable": {"thread_id": "user_123"}}
result = app.invoke({"messages": ["Continue where we left off"]}, config)
```

### Strengths

- **Cycles and loops**: Unlike linear chains
- **Persistent state**: Checkpoints survive restarts
- **Human-in-the-loop**: Pause/resume workflows
- **Multi-agent coordination**: Built for complex orchestration
- **Time travel**: Resume from any checkpoint
- **Visualization**: Built-in graph diagrams

### Limitations

- **Steeper learning curve**: Graph thinking required
- **More complex than chains**: Overkill for simple flows
- **LangChain dependency**: Inherits some complexity

### When to Use

✅ **Use LangGraph when**:
- Workflows with cycles or loops
- Multi-agent coordination needed
- Long-running, pausable workflows
- Complex conditional branching
- Need persistent state across sessions

❌ **Don't use LangGraph when**:
- Simple linear RAG pipeline
- Single agent with tools
- Stateless request/response pattern
- Quick prototype (start with LangChain)

---

## CrewAI

### Overview

CrewAI is a role-based multi-agent framework where AI agents work together as a "crew" to accomplish complex tasks. Popular for its intuitive team-oriented abstractions.

**Philosophy**: Model AI collaboration after human teams with specialized roles.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 41,677 |
| License | MIT |
| First Release | 2024 |
| Languages | Python |

### Core Concepts

- **Agent**: Autonomous unit with role, goal, backstory
- **Task**: Unit of work with description and expected output
- **Crew**: Collaborative group of agents
- **Flow**: Event-driven orchestration layer
- **Process**: Execution strategy (sequential, hierarchical)

### Installation & Quick Start

```bash
pip install crewai crewai-tools
```

```python
from crewai import Agent, Task, Crew

# Define agents
researcher = Agent(
    role="Senior Research Analyst",
    goal="Uncover cutting-edge developments in AI",
    backstory="You're a seasoned researcher with a keen eye for innovation",
    verbose=True
)

writer = Agent(
    role="Tech Content Writer",
    goal="Create engaging content about AI discoveries",
    backstory="You're a skilled writer who makes complex topics accessible"
)

# Define tasks
research_task = Task(
    description="Research the latest AI trends in 2025",
    expected_output="A detailed report on AI trends",
    agent=researcher
)

write_task = Task(
    description="Write a blog post based on the research",
    expected_output="A compelling blog post",
    agent=writer
)

# Create crew
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
    verbose=True
)

result = crew.kickoff()
```

### Code Examples

#### Agent with Tools

```python
from crewai import Agent, Task, Crew
from crewai_tools import SerperDevTool, WebsiteSearchTool

search_tool = SerperDevTool()
web_tool = WebsiteSearchTool()

researcher = Agent(
    role="Research Specialist",
    goal="Find accurate information on any topic",
    backstory="Expert at finding and synthesizing information",
    tools=[search_tool, web_tool],
    verbose=True
)

task = Task(
    description="Research the latest developments in quantum computing",
    expected_output="Summary of key breakthroughs",
    agent=researcher
)

crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()
```

#### Hierarchical Process

```python
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

manager_llm = ChatOpenAI(model="gpt-4o")

# Specialist agents
analyst = Agent(role="Data Analyst", goal="Analyze data patterns", backstory="...")
developer = Agent(role="Developer", goal="Write code solutions", backstory="...")
reviewer = Agent(role="Code Reviewer", goal="Ensure code quality", backstory="...")

crew = Crew(
    agents=[analyst, developer, reviewer],
    tasks=[...],
    process=Process.hierarchical,
    manager_llm=manager_llm,
    verbose=True
)
```

#### Flows (Advanced Orchestration)

```python
from crewai.flow.flow import Flow, listen, start
from pydantic import BaseModel

class BlogState(BaseModel):
    topic: str = ""
    research: str = ""
    draft: str = ""

class BlogFlow(Flow[BlogState]):
    
    @start()
    def get_topic(self):
        self.state.topic = "AI Agents in 2025"
    
    @listen(get_topic)
    def research_topic(self):
        # Use a crew for research
        research_crew = Crew(...)
        self.state.research = research_crew.kickoff()
    
    @listen(research_topic)
    def write_draft(self):
        # Use a crew for writing
        writing_crew = Crew(...)
        self.state.draft = writing_crew.kickoff()

flow = BlogFlow()
result = flow.kickoff()
```

### Strengths

- **Intuitive role-based design**: Maps to human team structures
- **Rich abstractions**: Memory, planning, reasoning built-in
- **Enterprise-ready**: Visual builder (CrewAI AOP)
- **MCP support**: Native Model Context Protocol integration
- **Strong observability**: Langfuse, Datadog integrations

### Limitations

- **Higher learning curve**: Many concepts to learn
- **Model compatibility**: Some issues with newer models
- **Heavier than minimal frameworks**: More abstraction overhead

**From GitHub Issues**:
> "Tool configuration issues with Ollama embedding model"
> "GPT-5 tool calling format doesn't work"

### When to Use

✅ **Use CrewAI when**:
- Complex multi-agent workflows
- Role-based team collaboration
- Production deployment with monitoring
- Human-in-the-loop workflows

❌ **Don't use CrewAI when**:
- Simple single-agent tasks
- Minimal abstraction preferred
- Need fine-grained control

---

## AutoGen

### Overview

AutoGen is Microsoft Research's multi-agent conversation framework. Designed for research and experimentation with multi-agent collaboration patterns.

**Philosophy**: Conversational agents that collaborate through message passing.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 52,767 |
| License | CC-BY-4.0 |
| First Release | 2023 |
| Languages | Python |
| Status | Experimental (v0.4) |

### Core Concepts

- **AssistantAgent**: LLM-powered agent
- **UserProxyAgent**: Human proxy with optional code execution
- **GroupChat**: Multi-agent conversation management
- **ConversableAgent**: Base class for all agents

### Installation & Quick Start

```bash
pip install autogen-agentchat autogen-ext
```

```python
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

model_client = OpenAIChatCompletionClient(model="gpt-4o")

agent = AssistantAgent(
    name="assistant",
    model_client=model_client,
    system_message="You are a helpful assistant."
)

response = await agent.run(task="What is the capital of France?")
print(response.messages[-1].content)
```

### Code Examples

#### Two-Agent Conversation

```python
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_ext.models.openai import OpenAIChatCompletionClient

model = OpenAIChatCompletionClient(model="gpt-4o")

# Create agents
coder = AssistantAgent(
    name="Coder",
    model_client=model,
    system_message="You write Python code."
)

reviewer = AssistantAgent(
    name="Reviewer",
    model_client=model,
    system_message="You review code and suggest improvements."
)

# Create team
team = RoundRobinGroupChat([coder, reviewer], max_turns=4)
result = await team.run(task="Write a function to sort a list")
```

#### With Code Execution

```python
from autogen_ext.code_executors import DockerCommandLineCodeExecutor

code_executor = DockerCommandLineCodeExecutor()

coder = AssistantAgent(
    name="Coder",
    model_client=model,
    code_executor=code_executor
)
```

### Strengths

- **Multi-agent patterns**: Rich conversation orchestration
- **Microsoft backing**: Research-grade quality
- **Code execution**: Built-in sandboxed execution
- **Flexible architecture**: Highly customizable

### Limitations

- **Fork drama**: AG2 community fork adds confusion
- **Experimental status**: Not production-ready
- **Complex documentation**: Steep learning curve
- **Rapid changes**: API instability

**From HN**:
> "Documentation gets quite convoluted"
> "Running these in production? It's a mess"

### When to Use

✅ **Use AutoGen when**:
- Research and experimentation
- Complex multi-agent conversations
- Code generation with execution
- Microsoft ecosystem preference

❌ **Don't use AutoGen when**:
- Production deployment needed
- Stable API required
- Simple agent tasks

---

## Semantic Kernel

### Overview

Semantic Kernel is Microsoft's enterprise-grade SDK for building AI agents. Production-ready with full Microsoft support.

**Philosophy**: Bring AI capabilities to enterprise applications through plugins and skills.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 26,898 |
| License | MIT |
| First Release | 2023 |
| Languages | C#, Python, Java |
| Status | Production (v1.0+) |

### Core Concepts

- **Kernel**: Central orchestration hub
- **Plugins**: Encapsulated function collections
- **Functions**: Native code or prompts exposed to LLM
- **Connectors**: AI service integrations
- **Memory**: Embeddings and vector storage

### Installation & Quick Start

**Python**:
```bash
pip install semantic-kernel
```

```python
import semantic_kernel as sk
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion

kernel = sk.Kernel()
kernel.add_service(OpenAIChatCompletion(
    ai_model_id="gpt-4o",
    api_key="sk-..."
))

result = await kernel.invoke_prompt("What is 2 + 2?")
print(result)
```

**C#**:
```csharp
var kernel = Kernel.CreateBuilder()
    .AddOpenAIChatCompletion("gpt-4o", apiKey)
    .Build();

var result = await kernel.InvokePromptAsync("What is 2 + 2?");
```

### Code Examples

#### Plugin with Functions

```python
from semantic_kernel.functions import kernel_function

class WeatherPlugin:
    @kernel_function(description="Get weather for a location")
    def get_weather(self, location: str) -> str:
        return f"Weather in {location}: Sunny, 72°F"

kernel.add_plugin(WeatherPlugin(), "weather")

# Auto function calling
settings = OpenAIPromptExecutionSettings(
    function_choice_behavior=FunctionChoiceBehavior.Auto()
)

result = await kernel.invoke_prompt(
    "What's the weather in Seattle?",
    settings=settings
)
```

### Strengths

- **Enterprise support**: Microsoft backing
- **Multi-language**: C#, Python, Java
- **Production-ready**: Stable, versioned APIs
- **Azure integration**: Deep Microsoft ecosystem support
- **Copilot extensions**: Build Microsoft 365 add-ons

### Limitations

- **Azure-centric**: Best with Microsoft stack
- **.NET bias**: C# gets features first
- **Less community content**: Smaller ecosystem than LangChain

### When to Use

✅ **Use Semantic Kernel when**:
- Enterprise .NET application
- Microsoft/Azure ecosystem
- Need vendor support
- Building Copilot extensions

❌ **Don't use Semantic Kernel when**:
- Multi-cloud required
- Rapid prototyping
- Maximum community resources

---

## Google ADK

### Overview

Google ADK (Agent Development Kit) is Google's flagship open-source agent framework. Same technology powering Google's internal agent products.

**Philosophy**: Build sophisticated multi-agent systems with enterprise-grade deployment.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 16,635 |
| License | Apache 2.0 |
| First Release | April 2025 |
| Languages | Python, TypeScript, Go, Java |

### Core Concepts

- **LlmAgent**: LLM-powered agent with tools
- **WorkflowAgent**: Deterministic orchestration (Sequential, Parallel, Loop)
- **Multi-Agent Teams**: Hierarchical agent coordination
- **A2A Integration**: Native Agent-to-Agent protocol support

### Installation & Quick Start

```bash
pip install google-adk
```

```python
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

agent = LlmAgent(
    name="assistant",
    model=LiteLlm(model="gemini-2.0-flash"),
    instruction="You are a helpful assistant."
)

response = await agent.run("Hello!")
print(response)
```

### Code Examples

#### Multi-Agent System

```python
from google.adk.agents import LlmAgent

# Specialist agents
greeter = LlmAgent(
    name="greeter",
    model="gemini-2.0-flash",
    description="Handles greetings and pleasantries"
)

researcher = LlmAgent(
    name="researcher", 
    model="gemini-2.0-flash",
    description="Researches topics and provides information"
)

# Coordinator with sub-agents
coordinator = LlmAgent(
    name="Coordinator",
    model="gemini-2.0-flash",
    description="Routes requests to appropriate specialists",
    sub_agents=[greeter, researcher]  # Auto-delegation
)

response = await coordinator.run("Hello! Can you research AI trends?")
```

#### Workflow Agent

```python
from google.adk.agents import SequentialAgent, ParallelAgent

# Sequential execution
pipeline = SequentialAgent(
    name="pipeline",
    sub_agents=[data_fetcher, processor, formatter]
)

# Parallel execution
parallel = ParallelAgent(
    name="parallel_research",
    sub_agents=[web_searcher, doc_reader, api_caller]
)
```

### Strengths

- **Google backing**: Enterprise-grade support
- **Multi-language**: Python, TS, Go, Java
- **A2A protocol**: Native agent interoperability
- **Gemini integration**: Best with Google models
- **Vertex AI deployment**: Managed scaling

### Limitations

- **Google ecosystem bias**: Best with GCP
- **Early stage**: Less battle-tested
- **Over-abstraction concerns**: Can be complex

### When to Use

✅ **Use Google ADK when**:
- Google Cloud ecosystem
- Need A2A interoperability
- Multi-language team
- Gemini models preferred

❌ **Don't use Google ADK when**:
- Non-Google cloud
- Need maximum ecosystem
- Want battle-tested framework

---

# Tier 2: RAG & Specialized Frameworks

## LlamaIndex

### Overview

LlamaIndex specializes in the data-to-LLM layer, providing 160+ data connectors and sophisticated indexing strategies.

**Philosophy**: Data ingestion and retrieval as the foundation for LLM applications.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 45,970 |
| License | MIT |
| Languages | Python |

### Installation & Quick Start

```bash
pip install llama-index llama-index-llms-openai
```

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.llms.openai import OpenAI

# Load documents
documents = SimpleDirectoryReader("./data").load_data()

# Create index
index = VectorStoreIndex.from_documents(documents)

# Query
query_engine = index.as_query_engine()
response = query_engine.query("What is this document about?")
```

### When to Use

✅ Data ingestion is primary challenge, 160+ data sources, knowledge graphs
❌ Simple RAG (use LangChain), general agent orchestration

---

## Haystack

### Overview

Haystack is deepset's production-grade RAG and search framework, focused on enterprise reliability.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 23,704 |
| License | Apache 2.0 |
| Funding | $18M Series A |

### Installation & Quick Start

```bash
pip install haystack-ai
```

```python
from haystack import Pipeline
from haystack.components.generators import OpenAIGenerator

pipeline = Pipeline()
pipeline.add_component("generator", OpenAIGenerator(model="gpt-4o"))
result = pipeline.run({"generator": {"prompt": "Hello!"}})
```

### When to Use

✅ Enterprise search, document QA, production RAG
❌ General agent work, multi-agent systems

---

## PydanticAI

### Overview

Type-safe Python agent framework from the Pydantic team, with native validation and observability.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 13,928 |
| License | MIT |

### Installation & Quick Start

```bash
pip install pydantic-ai
```

```python
from pydantic_ai import Agent

agent = Agent('openai:gpt-4o', system_prompt='Be helpful.')
result = agent.run_sync('What is 2 + 2?')
print(result.data)
```

### When to Use

✅ Type safety required, Pydantic validation, structured output
❌ Complex multi-agent, maximum ecosystem

---

## Agno

### Overview

Ultra-fast multi-agent framework (formerly Phidata) with Teams, Workflows, and AgentOS.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 36,266 |
| License | Apache 2.0 |

### Installation & Quick Start

```bash
pip install agno
```

```python
from agno import Agent

agent = Agent(
    model="gpt-4o",
    description="Helpful assistant"
)

response = agent.run("Hello!")
```

### When to Use

✅ Fast multi-agent, built-in observability
❌ Need MCP/A2A support (not yet available)

---

## OpenAI Agents SDK

### Overview

OpenAI's official agent framework with built-in guardrails, sessions, and tracing.

### Installation & Quick Start

```bash
pip install openai-agents
```

```python
from agents import Agent, Runner

agent = Agent(
    name="assistant",
    instructions="You are helpful."
)

result = await Runner.run(agent, "Hello!")
```

### When to Use

✅ OpenAI models, need guardrails/sessions
❌ Multi-provider, open-source models

---

# Tier 3: Lightweight & Emerging

## DSPy

### Overview

Stanford's framework for programming (not prompting) LLMs with automatic prompt optimization.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 30,971 |
| License | MIT |
| Origin | Stanford NLP |

### Installation & Quick Start

```bash
pip install dspy
```

```python
import dspy

lm = dspy.LM('openai/gpt-4o-mini')
dspy.configure(lm=lm)

# Declarative signature
qa = dspy.Predict('question -> answer')
result = qa(question="What is 2+2?")
```

### When to Use

✅ Prompt optimization research, reproducibility
❌ Production systems, simple tasks

---

## Mastra

### Overview

TypeScript-first AI agent framework with full-stack capabilities.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 18,952 |
| License | Custom |
| Language | TypeScript |

### Installation & Quick Start

```bash
npm create mastra@latest
```

```typescript
import { Agent } from '@mastra/core';

const agent = new Agent({
  name: 'assistant',
  model: 'gpt-4o',
});

const response = await agent.run('Hello!');
```

### When to Use

✅ TypeScript projects, full-stack
❌ Python teams, OSS license requirement

---

## Letta

### Overview

Persistent memory agent framework (formerly MemGPT) focused on long-term agent memory.

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 20,173 |
| License | Apache 2.0 |
| Funding | $10M Seed |

### When to Use

✅ Persistent memory required, self-improving agents
❌ Simple stateless agents

---

## Smolagents

### Overview

Hugging Face's lightweight, code-first agent framework (~1k LOC).

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 24,500 |
| License | Apache 2.0 |

### Installation & Quick Start

```bash
pip install smolagents
```

```python
from smolagents import CodeAgent, HfApiModel

model = HfApiModel()
agent = CodeAgent(tools=[], model=model)
result = agent.run("What is 2+2?")
```

### When to Use

✅ Minimal dependencies, code execution
❌ Production with security concerns

---

## Genkit

### Overview

Google's simpler AI framework for adding AI features to apps (especially Firebase).

### Key Stats

| Metric | Value |
|--------|-------|
| GitHub Stars | 5,200 |
| License | Apache 2.0 |
| Languages | TypeScript, Go, Python |

### Installation & Quick Start

```bash
npm install genkit @genkit-ai/google-genai
```

```typescript
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({ plugins: [googleAI()] });
const { text } = await ai.generate({
  model: googleAI.model('gemini-2.0-flash'),
  prompt: 'Hello!'
});
```

### When to Use

✅ Firebase apps, simple AI features
❌ Complex multi-agent, non-Google stack

---

# Framework Selection Quick Reference

| Use Case | Recommended |
|----------|-------------|
| General orchestration + RAG | **LangChain** |
| Stateful multi-agent | **LangGraph** |
| Role-based teams | **CrewAI** |
| Research/experimentation | **AutoGen** |
| Enterprise .NET | **Semantic Kernel** |
| Google Cloud | **Google ADK** |
| Data ingestion (160+ sources) | **LlamaIndex** |
| Enterprise search | **Haystack** |
| Type-safe Python | **PydanticAI** |
| Fast multi-agent | **Agno** |
| OpenAI-native | **OpenAI Agents SDK** |
| Prompt optimization | **DSPy** |
| TypeScript full-stack | **Mastra** |
| Persistent memory | **Letta** |
| Minimal/lightweight | **Smolagents** |
| Firebase apps | **Genkit** |
