# AI Agent Frameworks Research

**Comprehensive comparison of 46 AI agent and LLM orchestration frameworks**

Last Updated: December 2025

---

## Quick Navigation

| Resource | Description | Best For |
|----------|-------------|----------|
| [Dashboard (HTML)](./ai-agent-frameworks-dashboard.html) | Interactive filterable/sortable table with decision tree | Visual exploration, filtering by criteria |
| [Pricing Calculator (HTML)](./ai-agent-pricing-calculator.html) | LLM cost calculator with 25+ models | Budget planning, model cost comparison |
| [Comparison Spreadsheet (CSV)](./ai-agent-frameworks-comparison.csv) | Raw data: 46 frameworks x 18 columns | Excel/Sheets analysis, custom filtering |
| [Deep Dive Guide (MD)](./ai-agent-frameworks-deep-dive.md) | Detailed analysis of top 15 frameworks | Learning framework internals, code examples |
| [Getting Started Guide (MD)](./ai-agent-getting-started-guide.md) | Beginner's guide from first agent to production | New to AI agents, learning path |

---

## TL;DR Decision Tree

```
What are you building?
│
├─ Simple chatbot or RAG app
│  └─ Start with: LangChain or LlamaIndex
│
├─ Multi-agent collaboration
│  ├─ Role-based teams → CrewAI
│  ├─ Conversation-based → AutoGen/AG2
│  └─ Fast & lightweight → Agno
│
├─ Production enterprise app
│  ├─ Microsoft/.NET shop → Semantic Kernel
│  ├─ Google Cloud → Google ADK or Vertex AI
│  ├─ AWS → Bedrock Agents or Strands SDK
│  └─ OpenAI-only → OpenAI Agents SDK
│
├─ Type-safe Python agents
│  └─ PydanticAI (Pydantic validation built-in)
│
├─ Visual/low-code
│  ├─ Technical users → LangFlow
│  └─ Business automation → n8n or Lindy
│
├─ Coding assistant
│  ├─ Terminal/CLI → Aider
│  └─ Full IDE experience → OpenHands
│
├─ Voice/realtime
│  └─ LiveKit Agents
│
├─ Browser automation
│  └─ BrowserUse (74k+ stars, fastest growing!)
│
├─ State machine agents
│  └─ Burr (Apache Foundation)
│
├─ Enterprise with A2A
│  └─ BeeAI Framework (IBM/Linux Foundation)
│
└─ Research/experimental
   └─ DSPy (prompt optimization) or CAMEL-AI (multi-agent research)
```

---

## Framework Categories

### Core Orchestration (General Purpose)
| Framework | Stars | Best For | Risk |
|-----------|-------|----------|------|
| **LangChain** | 122k | General orchestration, RAG, prototyping | Low |
| **LangGraph** | 22k | Stateful multi-agent, complex workflows | Low |
| **Semantic Kernel** | 27k | Enterprise .NET, Microsoft ecosystem | Low |
| **Google ADK** | 17k | Google Cloud, Gemini models | Low |
| **OpenAI Agents SDK** | N/A | OpenAI-native development | Low |

### Multi-Agent Systems
| Framework | Stars | Best For | Risk |
|-----------|-------|----------|------|
| **CrewAI** | 42k | Role-based teams, workflows | Medium |
| **AutoGen** | 53k | Research, multi-agent conversation | Medium |
| **Agno** | 36k | Fast multi-agent, Teams, AgentOS | Medium |
| **Letta** | 20k | Persistent memory agents | Medium |
| **Langroid** | 4k | Multi-agent RAG, SQL/document chat | Low |

### RAG & Data
| Framework | Stars | Best For | Risk |
|-----------|-------|----------|------|
| **LlamaIndex** | 46k | Data ingestion, RAG, 160+ connectors | Low |
| **Haystack** | 24k | Enterprise RAG, document QA | Low |

### Lightweight & Fast
| Framework | Stars | Best For | Risk |
|-----------|-------|----------|------|
| **PydanticAI** | 14k | Type-safe agents, structured output | Medium |
| **DSPy** | 31k | Prompt optimization, programmatic LLM | High |
| **Smolagents** | 25k | Lightweight agents, HuggingFace | Medium |
| **Mastra** | 19k | Full-stack TypeScript, MCP authoring | High |

### Cloud Platforms (Managed)
| Platform | Provider | Best For |
|----------|----------|----------|
| **Bedrock Agents** | AWS | AWS-native managed agents |
| **Strands SDK** | AWS | AWS ecosystem, MCP support |
| **Azure AI Foundry** | Microsoft | Azure-native enterprise |
| **Vertex AI Agents** | Google | GCP-native, A2A support |

### Visual/Low-Code
| Framework | Stars | Best For |
|-----------|-------|----------|
| **LangFlow** | 50k | Visual prototyping, drag-and-drop |
| **n8n** | N/A | Workflow automation, 500+ integrations |
| **Lindy** | N/A | Business automation, non-technical users |

### Coding Agents
| Framework | Stars | Best For |
|-----------|-------|----------|
| **Aider** | 39k | Terminal pair programming, Git |
| **OpenHands** | 66k | Full dev platform, IDE experience |

### Protocols
| Protocol | Owner | Purpose |
|----------|-------|---------|
| **MCP** | Anthropic | Agent-to-tool connection standard |
| **A2A** | Linux Foundation | Agent-to-agent communication |

### Emerging/Specialized (NEW)
| Framework | Stars | Best For | Risk |
|-----------|-------|----------|------|
| **BrowserUse** | 74k | Web automation, form filling, scraping | Low |
| **BeeAI Framework** | 3k | Enterprise multi-agent, A2A support | Low |
| **Julep** | 7k | Stateful agents with sessions | Medium |
| **Burr** | 2k | State machine agents, chatbots | Low |
| **ControlFlow** | 1k | ~~Task-centric workflows~~ (ARCHIVED - use Marvin) | High |

---

## Quick Start Recommendations

### For Beginners
1. **Start with LangChain** - Best docs, largest community, most examples
2. **Read the [Getting Started Guide](./ai-agent-getting-started-guide.md)** - Covers first agent to production
3. **Use the [Dashboard](./ai-agent-frameworks-dashboard.html)** - Filter by your criteria

### For Production Teams
1. **Check [Pricing Calculator](./ai-agent-pricing-calculator.html)** - Estimate costs early
2. **Review "Production Ready" column** in dashboard
3. **Consider vendor lock-in** - See "Risk Level" in comparison

### For Researchers
1. **DSPy** for prompt optimization
2. **CAMEL-AI** for multi-agent research
3. **AutoGen** for experimental multi-agent systems

---

## Key Insights from Research

### Protocol Support (MCP & A2A)
- **MCP (Model Context Protocol)**: LangChain, LangGraph, PydanticAI, Mastra, Smolagents, Google ADK, Semantic Kernel, AWS Strands, BrowserUse, Langroid, BeeAI
- **A2A (Agent-to-Agent)**: Google ADK, Vertex AI, LangChain, LangGraph, PydanticAI, CrewAI, BeeAI Framework

### Funding & Stability
| Tier | Frameworks |
|------|------------|
| **Big Tech Backed** | Semantic Kernel (Microsoft), Google ADK, OpenAI Agents SDK, AWS Strands, BeeAI (IBM) |
| **Foundation Backed** | Burr (Apache), A2A (Linux Foundation) |
| **VC Unicorn** | LangChain ($125M), CrewAI, Haystack ($18M), BrowserUse |
| **Growing** | PydanticAI, Agno, Mastra, Letta ($10M), Julep |

### Common Limitations
- **LangChain**: Over-engineered for simple tasks, API churn
- **CrewAI**: Higher learning curve, model compatibility issues
- **AutoGen**: Fork drama (AG2), experimental status
- **DSPy**: Academic focus, steep learning curve
- **Mastra**: Not true OSS license, TypeScript only
- **ControlFlow**: ARCHIVED - merged into Marvin, do not use for new projects
- **Julep**: Cloud-first, self-hosting can be complex

---

## Pricing Overview (LLM Models)

See [Pricing Calculator](./ai-agent-pricing-calculator.html) for interactive comparison.

### Budget Tiers (per 1M tokens)

| Tier | Input | Output | Models |
|------|-------|--------|--------|
| **Ultra Budget** | <$0.10 | <$0.50 | Groq Llama, Cerebras, DeepSeek |
| **Budget** | $0.10-0.50 | $0.50-2.00 | GPT-4o-mini, Claude Haiku, Gemini Flash |
| **Standard** | $1-5 | $5-15 | GPT-4o, Claude Sonnet, Gemini Pro |
| **Premium** | $10-15 | $30-75 | GPT-4.5, Claude Opus, o1 reasoning |

---

## Files in This Repository

```
ai-frameworks-research/
├── README.md                              # This file
├── ai-agent-frameworks-comparison.csv     # Raw data (46 frameworks x 18 columns)
├── ai-agent-frameworks-dashboard.html     # Interactive dashboard
├── ai-agent-pricing-calculator.html       # LLM cost calculator
├── ai-agent-frameworks-deep-dive.md       # Detailed framework analysis
└── ai-agent-getting-started-guide.md      # Beginner's learning path
```

---

## How to Use Each File

### Dashboard (HTML)
1. Open `ai-agent-frameworks-dashboard.html` in any browser
2. Use filters: Category, Language, Production Ready, Risk Level
3. Click column headers to sort
4. Switch tabs: Table | Decision Tree | Statistics
5. Export filtered results to CSV

### Pricing Calculator (HTML)
1. Open `ai-agent-pricing-calculator.html` in any browser
2. Enter expected monthly token usage
3. Toggle caching on/off (where supported)
4. Compare costs across 25+ models
5. View visual cost comparisons

### Comparison CSV
1. Import into Excel, Google Sheets, or pandas
2. Columns: Framework, Category, Stars, Funding, Languages, MCP/A2A, Production Ready, Risk, Use Cases, Limitations, etc.
3. Filter and pivot as needed

### Deep Dive Guide
1. Read for detailed understanding of top 15 frameworks
2. Includes: Installation, code examples, strengths, limitations
3. Organized in 3 tiers: Production Ready → Growing → Specialized

### Getting Started Guide
1. Follow the 6-part learning path
2. Part 1: First agent (30 min)
3. Part 2: Tools and function calling
4. Part 3: RAG implementation
5. Part 4: Multi-agent systems
6. Part 5: Production deployment
7. Part 6: Migration paths between frameworks

---

## Research Methodology

### Sources Consulted
- Official documentation for all 46 frameworks
- GitHub repositories (stars, issues, activity)
- Benchmarks: SWE-bench, GAIA, AgentBench, WebArena
- Community: Reddit r/LocalLLaMA, r/MachineLearning, Hacker News
- Enterprise case studies and production deployments

### Criteria Evaluated
1. **Technical**: Language support, MCP/A2A, function calling, multimodal
2. **Maturity**: Production ready, GitHub stars, funding, community size
3. **Risk**: Vendor lock-in, license, maintenance activity
4. **Usability**: Setup time, documentation quality, learning curve

---

## Framework Count by Category

| Category | Count |
|----------|-------|
| Core Orchestration | 6 |
| Multi-Agent | 5 |
| RAG & Data | 2 |
| Lightweight | 6 |
| Cloud Platform | 4 |
| Visual/Low-Code | 4 |
| Coding Agent | 2 |
| Protocol | 2 |
| Infrastructure | 2 |
| Utility | 4 |
| Enterprise | 2 |
| Voice/Realtime | 1 |
| Research | 1 |
| Browser Automation | 1 |
| Workflow Orchestration | 1 |
| Enterprise Multi-Agent | 1 |
| Stateful Agents | 1 |
| State Machine | 1 |
| **Total** | **46** |

---

## Contributing

This research is maintained in the `ai_projects` monorepo. To suggest updates:
1. Check if the framework/information is already covered
2. Provide sources for any new data
3. Focus on production-relevant information

---

## License

Research compiled for internal use. Framework information sourced from public documentation and repositories.
