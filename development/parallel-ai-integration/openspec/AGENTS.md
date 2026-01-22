# Parallel AI Integration - High-Performance Web Search for AI

## Project Overview

Integration of [Parallel](https://parallel.ai) - the highest accuracy web search API built specifically for AI agents.

**Why Parallel?**
- **47% accuracy** on HLE-Search benchmark vs 24% (Exa) vs 21% (Tavily)
- **58% accuracy** on BrowseComp vs GPT-5 (41%) and humans (25%)
- **$82/CPM** cheaper than Exa ($138/CPM) and Tavily ($190/CPM)
- **16,000 free requests** vs Tavily's 1,000 credits/month

## What is Parallel?

Parallel is an AI-native web search infrastructure that redesigns search from the ground up for AI agents:

### Core Philosophy
Traditional search engines (Google, Bing) were built for humans:
- Rank URLs for clicking
- Optimize for keywords and ad revenue
- Return teaser snippets

Parallel optimizes for what AI actually needs:
- **Token-efficient excerpts** for LLM context windows
- **Semantic objectives** (intent-based, not keyword-based)
- **Evidence-based outputs** with provenance tracking
- **Fewer API round-trips** (less latency, lower LLM token costs)

### Available APIs

| API | Purpose | Use Case |
|-----|---------|----------|
| **Search** | Ranked URLs + compressed excerpts | Simple web search for agents |
| **Extract** | Full page content + compressed excerpts | URL content extraction |
| **Task** | Deep research + structured enrichment | Complex multi-step research |
| **Chat** | Interactive conversational search | Chat interfaces with web access |
| **FindAll** | Entity discovery + structured data | Build custom datasets from web |
| **Monitor** | Continuous web monitoring | Track changes on the web |

## Getting Started

### 1. Get API Key

Visit [https://parallel.ai/](https://parallel.ai) and:
1. Sign up for free account
2. Get 16,000 free requests automatically
3. Production: Pay per query (flexible compute budget)

### 2. Set Environment Variable

```bash
export PARALLEL_API_KEY="your-api-key-here"
```

The key is already configured in `~/.bash_secrets` for this project.

### 3. API Usage Examples

#### Quick Search (Python)
```python
import os
from parallel import SearchClient

client = SearchClient(api_key=os.environ["PARALLEL_API_KEY"])

results = client.search({
    "objective": "What are the latest developments in AI agents?",
    "num_results": 5
})

for result in results:
    print(f"Title: {result.title}")
    print(f"URL: {result.url}")
    print(f"Excerpt: {result.compressed_excerpt}\n")
```

#### Deep Research
```python
from parallel import TaskClient

client = TaskClient(api_key=os.environ["PARALLEL_API_KEY"])

# Complex research task
research = client.run({
    "objective": "Compare pricing models of top AI search APIs",
    "target_depth": "deep",
    "num_stems": 3  # Explore 3 different angles
})

print(research.output)  # Structured, citation-backed answer
```

#### FindAll (Entity Discovery)
```python
from parallel import FindAllClient

client = FindAllClient(api_key=os.environ["PARALLEL_API_KEY"])

# Find all Y Combinator companies in healthcare
companies = client.findall({
    "query": "Y Combinator companies in healthcare",
    "filters": {
        "industry": "healthcare"
    },
    "num_results": 50
})
```

## Benchmark Comparison

### Accuracy (Independent Benchmarks)

| Benchmark | Parallel | Exa | Tavily | GPT-5 |
|-----------|----------|-----|--------|-------|
| **HLE-Search** | 47% | 24% | 21% | 45% |
| **BrowseComp** | 58% | — | — | 41% |
| **DeepResearch Bench** | 82% win rate | — | — | 66% |

### Cost per 1,000 Queries (CPM)

| Platform | Cost/CPM | Notes |
|----------|----------|-------|
| **Parallel** | $82 | Highest accuracy, lowest cost |
| Exa | $138 | Semantic search focus |
| Tavily | $190 | Structured results, easy setup |
| Perplexity | $126 | Citation-rich answers |

### Response Time

| Platform | Avg Response |
|----------|--------------|
| Exa | ~1.180s |
| Tavily | ~800ms |
| Parallel | Varies by compute tier |

## When to Use Parallel vs Others

### Use Parallel when:
- ✅ Accuracy is critical (research, fact-checking)
- ✅ Token efficiency matters (reducing LLM costs)
- ✅ Complex multi-perspective research needed
- ✅ Building custom datasets from web
- ✅ Need provenance/citations for sources
- ✅ High volume usage (CPM advantage compounds)

### Use Exa when:
- Simple semantic search requirements
- Need neural embeddings
- Multilingual support priority

### Use Tavily when:
- Fastest possible search needed
- Simple use cases where accuracy gains marginal
- Want easiest setup/getting started

## Integration Resources

### Official Documentation
- [Parallel Docs](https://docs.parallel.ai)
- [API Reference](https://docs.parallel.ai/api-reference)
- [Python SDK](https://docs.parallel.ai/python-sdk)
- [TypeScript SDK](https://docs.parallel.ai/typescript-sdk)

### Integrations
- [n8n](https://docs.parallel.ai/integrations/n8n)
- [LangChain](https://docs.parallel.ai/integrations/langchain)
- [Google Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-parallel)
- [AWS Marketplace](https://docs.parallel.ai/integrations/aws-marketplace)

## Configuration Notes

### Environment Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| `PARALLEL_API_KEY` | API authentication | `~/.bash_secrets` |

### Free Tier

- **16,000 requests** free automatically
- No credit card required for signup
- Pay per query after free tier exhausted

### Security

- SOC-II Type 2 Certified
- No data retention (configurable)
- Enterprise options: SLAs, MSAs, compliance

## Project Structure

```
development/parallel-ai-integration/
├── AGENTS.md              # Project-specific rules
├── openspec/
│   └── AGENTS.md          # This file - Parallel integration guide
└── [future implementation files]
```

## References

- [Parallel Website](https://parallel.ai)
- [Parallel Benchmarks](https://parallel.ai/benchmarks)
- [Parallel Blog - Search API Launch](https://parallel.ai/blog/introducing-parallel-search)
- [Parallel Blog - Deep Research](https://parallel.ai/blog/introducing-parallel)

---

**Status**: Ready for Implementation
**Last Updated**: 2026-01-22