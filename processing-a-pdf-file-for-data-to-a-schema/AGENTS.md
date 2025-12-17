# TKE Fax Extractor

## Overview

Medical fax processing CLI tool for The Kidney Experts. Extracts structured clinical data from incoming faxes using Google Vertex AI (Gemini).

## Tech Stack

- **Language**: Python 3.11+
- **AI**: Google Vertex AI (Gemini 1.5 Pro/Flash)
- **Validation**: Pydantic v2
- **Output Format**: TOON (Token-Oriented Object Notation)

## Quick Commands

```bash
# Setup
pip install -e ".[dev]"

# Process fax
python -m tke_fax process <fax.pdf>

# Run tests
python -m pytest
```

## Project Structure

```
processing-a-pdf-file-for-data-to-a-schema/
├── src/tke_fax/      # Main package
│   ├── extract.py    # PDF extraction
│   ├── classify.py   # Document classification
│   └── schemas/      # Pydantic models
├── prompts/          # LLM prompts
├── templates/        # Output templates
└── tests/            # Test suites
```

## Beads Integration

Use `bd` for task tracking:
```bash
bd ready              # Find available work
bd create "Task" --description="Details" -t task -p 1 --json
bd sync               # End of session
```

## Key Patterns

- Follow Python conventions (see `../.claude/rules/python.md`)
- HIPAA compliant - no PHI in logs or error messages
- Use TOON format for AI-friendly data structures
- See `SPEC.md` for detailed specification

## Document Types

- Lab Results
- Referrals
- Hospital Records
- Insurance/Auth
- Patient Demographics
