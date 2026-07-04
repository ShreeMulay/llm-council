# The LLM Council: Collaborative AI Intelligence for Complex Problem Solving

## Overview

The LLM Council is a groundbreaking multi-agent AI system that transforms how you interact with artificial intelligence. Instead of relying on a single model's perspective, we bring together **nine specialized AI models** in a structured deliberation process, delivering solutions that are more accurate, nuanced, and actionable than any individual AI could provide alone.

Think of us as your personal AI advisory board – a collective intelligence system where diverse models debate, critique, and synthesize their expertise to tackle your most challenging problems. Integrated seamlessly as an **MCP (Model Context Protocol) server for OpenCode**, we auto-spawn our backend infrastructure on demand and deliberate for up to 10 minutes on complex queries.

**Why Choose the Council?**
- **Reduced Hallucinations**: Peer review catches errors that single models miss
- **Diverse Perspectives**: Nine different approaches to every problem
- **Battle-Tested Solutions**: Ideas survive rigorous critique before reaching you
- **Seamless Integration**: Works directly within your OpenCode environment

## How It Works

Our three-stage deliberation process ensures rigorous, multi-perspective analysis:

### Stage 1: Independent Analysis (~2-4 minutes)
Each Council member receives your query simultaneously and generates an independent response without seeing others' work. This preserves diverse thinking and prevents groupthink, ensuring you get nine genuinely different approaches to your problem.

### Stage 2: Peer Review & Ranking (~3-4 minutes)
Council members review and rank each other's responses based on:
- Technical accuracy and completeness
- Practical feasibility
- Code quality and security
- Adherence to requirements
- Creative problem-solving

This internal quality control surfaces the best ideas while identifying weaknesses and edge cases.

### Stage 3: Chairman Synthesis (~1-2 minutes)
Claude Opus 4.8, serving as Chairman, reviews all ranked responses and critiques to produce a final, unified solution that:
- Integrates the strongest elements from each perspective
- Resolves contradictions between approaches
- Delivers a polished, implementation-ready answer
- Includes confidence levels and trade-off analysis where relevant

## Council Members

| Member | Role | Specialty |
|--------|------|-----------|
| **Claude Opus 4.8** | **Chairman & Lead Coder** | Synthesis, code architecture, and final decision-making. Upgraded to 4.8 on May 29 2026 — improved reasoning and software engineering. Ensures outputs are clean, practical, and well-structured. |
| **GPT-5.5** | **Anchor & Reasoning Specialist** | Deep multi-step reasoning with extended thinking. Logical analysis, first-principles thinking, and systematic problem decomposition. Keeps deliberations grounded. |
| **Fireworks GLM-5.2 xHigh** | **Tool & Integration Specialist** | Practical implementation, API integration, and workflow automation through Fireworks direct routing with xHigh reasoning. Promoted after the 2026-07-04 benchmark tied z-ai GLM quality while improving latency under the cost gate. |
| **Gemini 3.1 Pro Preview** | **Knowledge Generalist** | Broad interdisciplinary knowledge, creative connections, and comprehensive context across domains. |
| **Grok 4.3** | **Real-time Intelligence** | Current information, rapid prototyping, and pragmatic reality checks. |
| **Kimi K2.7 Code** | **Long-context/Coding Generalist** | Long-context review, coding/debugging, and synthesis through Fireworks direct routing. Promoted after the 2026-07-04 benchmark beat Kimi K2.6 overall while tying coding/debugging and improving speed. |
| **DeepSeek V4 Pro** | **Code & Math Specialist** | Rigorous code, math, and structured reasoning; priority evaluator. |
| **Llama 4 Maverick** | **Open-weight Generalist** | Open-weight perspective for diversity and practical critique. |
| **Qwen 3.7 Max** | **Multilingual Specialist** | Multilingual and agentic/tool-use perspective via OpenRouter. |

### Explicit Challengers

| Alias | Model | Notes |
|-------|-------|-------|
| `glm-zai` | `z-ai/glm-5.2` | Explicit legacy GLM baseline after Fireworks GLM-5.2 xHigh promotion. |
| `kimi26` | `fireworks/kimi-k2.6` | Explicit legacy Kimi baseline after Kimi K2.7 Code promotion. |
| `minimax` | `minimax/minimax-m3` | Explicit challenger only; MiniMax beat Llama quality in the 2026-07-04 benchmark but failed latency/cost gates, so Llama 4 Maverick remains default. |
| `fable` | `anthropic/claude-fable-5` | Explicit challenger only; never default or chairman in this roster refresh. |
| `sonnet` | `anthropic/claude-sonnet-5` | Convenience alias only; not a default council member. |

## Use Cases

The Council excels at problems requiring depth, nuance, and multiple perspectives:

### Software Engineering
- **Architecture Design**: "Design a microservices architecture for a high-frequency trading platform"
- **Complex Debugging**: Hunt down elusive bugs with nine different debugging strategies
- **Code Reviews**: Security audits and performance optimization with multi-angle analysis
- **Legacy Refactoring**: Modernization strategies balancing new features with stability

### Strategic Planning
- **Technical Decisions**: Evaluate technology choices with comprehensive trade-off analysis
- **Risk Assessment**: Identify vulnerabilities and edge cases through adversarial thinking
- **Product Strategy**: Develop go-to-market plans with technical and business perspectives

### Research & Analysis
- **Knowledge Synthesis**: Combine insights from multiple domains into cohesive understanding
- **Documentation**: Create comprehensive guides with expert review built-in
- **Problem Investigation**: Explore complex topics from multiple analytical angles

## Getting Started

### Prerequisites
- OpenCode with MCP support enabled
- Python 3.11+ with `uv` package manager
- API keys configured for model providers

### Quick Start

1. **Start the backend:**
```bash
cd ~/ai_projects/development/llm-council
uv run python -m backend.main
```

2. **Use via OpenCode:**
```
/council What are the trade-offs between microservices and monoliths?
/council --quick Should I use Rust or Go for this CLI?
```

3. **Or call the MCP tool directly:**
```
mcp_llm-council_llm_council(query="Your question", final_only=false)
```

### Command Options
| Flag | Effect |
|------|--------|
| `--quick`, `-q` | Skip peer review (~2x faster) |
| `--summary`, `-s` | Hide individual responses |
| `--help`, `-h` | Show help |

### Best Practices
- **Be Specific**: Provide constraints, requirements, and context
- **Request Deliverables**: Ask for "code + tests + documentation"
- **Allow Time**: Complex problems deserve the full 10-minute deliberation
- **Use Quick Mode**: For simpler questions where speed matters more than depth

---

**The LLM Council**: Because the best decisions come from diverse perspectives working in harmony. We don't just answer questions – we deliberate, debate, and deliver solutions worthy of your most challenging problems.

*Ready to convene the Council? We're standing by to deliberate on your behalf.*

---

*This description was written by the LLM Council itself, demonstrating collaborative AI synthesis in action.*
