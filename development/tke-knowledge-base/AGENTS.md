# TKE Knowledge Base

## Overview

Comprehensive, self-healing nephrology knowledge base for The Kidney Experts.
Serves physicians, APPs, clinical staff, and operational teams via AI chatbot/RAG.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Vector DB | Qdrant Cloud |
| Embeddings | Voyage 4-large |
| Chat LLM | Gemini 3.0 Flash |
| Backend | Python (FastAPI) |
| Frontend | React 19 + Shadcn/ui v4 + Tailwind v4 |
| Metadata | SQLite |

## Project Rules

- **No PHI** — This KB contains only reference/educational content. Never store patient data.
- **Citations required** — Every answer must cite its source (guideline, trial, drug label).
- **Brand + Generic** — Always use both drug names. Farxiga (dapagliflozin), not just one.
- **No hallucination** — Prefer "I don't have information on this" over fabrication.
- **Physician review** — AI drafts content; nothing goes live without Dr. Mulay's approval.

## Key Directories

```
src/ingestion/    — Content ingestion pipeline (parsers, chunkers, embedders)
src/retrieval/    — Query pipeline (search, rerank, generate)
src/self_update/  — Self-healing pipeline (monitoring, freshness, gaps)
src/api/          — FastAPI endpoints
src/web/          — React frontend
content/          — Raw source files (PDFs, protocols)
data/             — SQLite DB, drug mappings, taxonomy
scripts/          — Utility scripts
tests/            — Tests and evaluation datasets
```

## Running

```bash
# Install Python dependencies
uv pip install -e .

# Run ingestion
python scripts/ingest.py

# Start API server
uvicorn src.api.main:app --reload

# Run tests
python -m pytest tests/
```

## Beads Tracking

All work tracked via `bd` commands. See root AGENTS.md for workflow.
