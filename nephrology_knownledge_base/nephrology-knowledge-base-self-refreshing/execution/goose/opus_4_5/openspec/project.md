# Project: Nephrology Knowledge Base (Self-Refreshing)

## Overview

A comprehensive, AI-generated knowledge base covering all aspects of nephrology practice for **The Kidney Experts, PLLC**. The system uses recursive multi-pass LLM generation with multi-model concurrence to create and maintain accurate, citation-backed medical knowledge.

## Organization

- **Name**: The Kidney Experts, PLLC
- **Type**: Internal organizational knowledge base
- **Future**: Will inform public-facing content with layman language

## Tech Stack

### Core Technologies
- **Language**: Python 3.10+
- **Cloud Platform**: Google Cloud Platform (GCP)
- **Primary LLM**: Anthropic Claude (Sonnet 4.5, Opus 4.5) via API
- **Secondary LLMs**: Google Gemini, MedGamma (for medical validation)
- **API Gateway**: OpenRouter (for multi-LLM access)

### Data & Storage
- **Knowledge Format**: Static Markdown files with YAML frontmatter
- **Cross-linking**: Obsidian-style `[[wikilinks]]`
- **Vector/Memory**: Zep (Graphiti) for temporal knowledge graph
- **Graph Format**: JSON (entities.json, relationships.json)

### Orchestration (Future)
- **Workflow Engine**: n8n Cloud (for scheduling and automation)
- **Alternative**: LangGraph, LlamaIndex (installed on local Linux)

## Conventions

### File Naming
- Lowercase with hyphens: `ckd-staging.md`
- Index files: `_index.md` in each directory
- Config files: YAML preferred

### Markdown Structure
- YAML frontmatter required for all knowledge articles
- Headers: H1 for title, H2 for sections, H3 for subsections
- Citations: Inline format `[Source Name, Section/Page]`
- Wikilinks: `[[Topic Name]]` or `[[Display Text|target-file]]`

### Code Style
- Python: Black formatter, type hints required
- Functions: Docstrings with Args/Returns
- Error handling: Explicit exceptions, no silent failures

### Medical Content Requirements
- **Zero tolerance for hallucinations**
- Every factual claim MUST have a citation
- Unverifiable claims marked with `{{NEEDS_SOURCE: topic}}`
- Multi-LLM concurrence required for medical accuracy

## Architecture Principles

1. **Citation-First**: Sources found before content generated
2. **Checkpoint Recovery**: State saved after each operation
3. **Link Integrity**: Wikilink registry tracks all cross-references
4. **Multi-Pass Validation**: Different LLMs validate each pass
5. **Human-in-the-Loop**: Flagged content requires review

## Environment Variables

```bash
ANTHROPIC_API_KEY       # Claude API access
GOOGLE_AI_API_KEY       # Gemini API access
OPENROUTER_API_KEY      # Multi-LLM gateway
```

## Key Directories

```
/domains/           # Knowledge base content (Markdown)
/config/            # LLM configs, schemas, prompts
/scripts/           # Python automation scripts
/graph/             # Knowledge graph (JSON)
/sources/           # Authoritative source references
/passes/            # Generation pass logs and checkpoints
/review-queue/      # Items requiring human review
```

## Success Metrics

- 100% of facts have traceable citations
- Zero broken wikilinks after each pass
- Multi-LLM agreement rate > 80% on medical content
- Quarterly full regeneration cycle completed
- All flagged content reviewed within 1 week
