# Nephrology Knowledge Base (Self-Refreshing)

A comprehensive, AI-generated knowledge base covering all aspects of nephrology practice for **The Kidney Experts, PLLC**.

## Overview

This system uses recursive multi-pass LLM generation with multi-model concurrence to create and maintain accurate, citation-backed medical knowledge. The knowledge base is:

- **AI-Generated**: Content created by frontier LLMs (Claude, Gemini, MedGamma)
- **Citation-First**: Every fact has a traceable source
- **Self-Refreshing**: Quarterly automated regeneration
- **Multi-LLM Validated**: Concurrence across multiple models
- **Human-Reviewed**: Flagged content requires expert approval

## Quick Start

### Prerequisites

- Python 3.10+
- API keys for Anthropic (Claude), Google AI (Gemini)

### Installation

```bash
# Clone or navigate to project
cd nephrology-knowledge-base-self-refreshing

# Install dependencies
pip install -r scripts/requirements.txt

# Set API keys (add to ~/.bashrc or export directly)
export ANTHROPIC_API_KEY="your-key"
export GOOGLE_AI_API_KEY="your-key"
```

### Generate Skeleton (Pass 1)

```bash
# Generate all domain skeletons
python scripts/generate_skeleton.py

# Generate single domain
python scripts/generate_skeleton.py --domain 01-clinical

# Preview without saving
python scripts/generate_skeleton.py --dry-run
```

## Project Structure

```
nephrology-knowledge-base-self-refreshing/
├── README.md                   # This file
├── ARCHITECTURE.md             # System design document
├── USAGE.md                    # Detailed usage guide
│
├── openspec/                   # OpenSpec specifications
│   ├── project.md              # Project conventions
│   ├── AGENTS.md               # Agent instructions
│   ├── specs/                  # Source of truth specs
│   │   ├── architecture/       # System architecture spec
│   │   ├── domains/            # Domain definitions spec
│   │   ├── passes/             # Pass system spec
│   │   ├── validation/         # Validation rules spec
│   │   └── sources/            # Source management spec
│   └── changes/                # Active change proposals
│
├── domains/                    # Knowledge base content
│   ├── _index.md               # Master index
│   ├── 00-glossary/            # Terminology
│   ├── 01-clinical/            # Clinical knowledge
│   ├── 02-care-delivery/       # Care models
│   ├── 03-regulatory/          # Compliance
│   ├── 04-business/            # Operations
│   └── 05-emerging/            # New topics
│
├── config/                     # Configuration files
│   ├── llm-configs.yaml        # LLM settings per pass
│   ├── schemas/                # JSON schemas
│   └── prompts/                # Prompt templates
│
├── scripts/                    # Automation scripts
│   ├── generate_skeleton.py    # Pass 1: Structure
│   ├── requirements.txt        # Python dependencies
│   └── utils/                  # Utility modules
│
├── graph/                      # Knowledge graph data
│   ├── entities.json           # Extracted entities
│   ├── relationships.json      # Entity relationships
│   └── wikilink_registry.json  # Link tracking
│
├── sources/                    # Source references
│   ├── _index.md               # Source overview
│   └── _registry.json          # Source metadata
│
├── passes/                     # Generation logs
│   └── 2025-Q1/                # Quarterly folders
│       └── pass-1/             # Per-pass logs
│
└── review-queue/               # Human review items
    ├── unverified-claims/      # Needs sources
    ├── contradictions/         # Conflicting info
    └── pending/                # General review
```

## Knowledge Domains

| Domain | Description | Priority Topics |
|--------|-------------|-----------------|
| **Glossary** | Nephrology terminology | GFR, Kt/V, URR, CKD stages |
| **Clinical** | Medical knowledge | CKD, ESRD, Dialysis, Transplant |
| **Care Delivery** | Care models | Value-based care, Home dialysis |
| **Regulatory** | Compliance | CMS ESRD, QIP, CfC |
| **Business** | Operations | Revenue cycle, Bundled payments |
| **Emerging** | New developments | AI, Precision medicine |

## Generation Passes

| Pass | Name | LLM | Purpose |
|------|------|-----|---------|
| 1 | Skeleton | Sonnet 4.5 | Create structure with topic outlines |
| 2 | Sources | Gemini | Discover authoritative sources |
| 3 | Content | Sonnet 4.5 | Generate content from sources |
| 4 | Validation | Opus 4.5 | Cross-LLM fact checking |
| 5 | Linking | Sonnet 4.5 | Build knowledge graph |

## Key Principles

### Citation-First

Every factual claim must have a traceable citation:
```markdown
CKD Stage 3a is defined as GFR 45-59 mL/min/1.73m² [KDIGO 2024, Chapter 1].
```

### Zero Hallucination

- Content generated only from discovered sources
- Uncitable claims marked with `{{NEEDS_SOURCE: topic}}`
- Multi-LLM concurrence required (80%+ agreement)
- Human review for flagged content

### Cross-Linking

Uses Obsidian-style wikilinks:
```markdown
Patients with [[CKD Stage 3]] should be monitored for [[Hyperphosphatemia]].
```

## OpenSpec Workflow

This project uses [OpenSpec](https://openspec.dev/) for spec-driven development.

### Commands (OpenCode/Claude Code)

- `/openspec:proposal` - Create a change proposal
- `/openspec:apply` - Implement a change
- `/openspec:archive` - Archive completed change

### Current Specs

See `openspec/specs/` for:
- Architecture specification
- Domain definitions
- Pass system rules
- Validation requirements
- Source management

## Contributing

1. Create a change proposal: `openspec/changes/your-change/`
2. Add `proposal.md`, `tasks.md`, and spec deltas
3. Implement tasks with checkboxes
4. Archive when complete

## License

Internal use only - The Kidney Experts, PLLC

## Contact

For questions or issues, contact the project maintainers.
