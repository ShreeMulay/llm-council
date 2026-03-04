# TKE Morning Intelligence

## Project Overview

GCP-native daily content system for The Kidney Experts, PLLC (Jackson, Tennessee).
Generates thematically cohesive, non-repeating educational content delivered via Google Chat
with interactive feedback, backed by a role-based web dashboard and self-updating nephrology pharmacopoeia.

**Replaces**: n8n "Morning Messages v7" workflow

## Architecture

Three Cloud Run services:

| Service | Language | Purpose |
|---------|----------|---------|
| `pipeline` | TypeScript/Bun | Orchestration, data fetching, Chat delivery, feedback handling |
| `content-engine` | Python/FastAPI | LLM generation (Vertex AI), drug enrichment, theme planning |
| `dashboard` | React/Shadcn v4 | Web UI with IAP auth, role-based views |

## Tech Stack

- **Runtime**: Bun (pipeline, dashboard), Python 3.12+ (content-engine)
- **Cloud**: Cloud Run, Cloud Scheduler, Pub/Sub, Firestore, Cloud SQL, IAP, Secret Manager
- **LLM**: Vertex AI Gemini 3.x (model mixing by task complexity)
- **Frontend**: React 19, Shadcn/ui v4, Tailwind CSS v4, Zustand, TanStack Query
- **Validation**: Zod (TypeScript), Pydantic v2 (Python)
- **Chat**: Google Chat API (App, not webhooks)

## Gemini Model IDs

| Model | Vertex AI ID | Use |
|-------|-------------|-----|
| Gemini 3.1 Pro | `gemini-3.1-pro-preview` | Complex reasoning (systems thinking, theme planning) |
| Gemini 3 Flash | `gemini-3-flash-preview` | Moderate tasks (nephrology history, medication) |
| Gemini 3.1 Flash-Lite | `gemini-3.1-flash-lite-preview` | Simple tasks (quotes, facts, AI ideas) |

## Content Sections (Daily)

1. **Systems Thinking** - Mental model / systems concept with nephrology application
2. **Daily Wisdom** - Curated quote relating to the day's concept
3. **On This Day** - Nephrology/medical history event
4. **AI Ideas** - Beginner ChatGPT tip + advanced tool spotlight
5. **Did You Know** - Fascinating kidney/nephrology fact
6. **Medication Spotlight** - Drug education with real API data

## Data Sources

| Source | API | Replaces |
|--------|-----|----------|
| Exa | `exa.ai` | Tavily + GNews |
| Grok | X/Twitter API | (new) |
| PubMed | E-utilities | (new) |
| OpenFDA | `api.fda.gov` | (new) |
| DailyMed | `dailymed.nlm.nih.gov` | (new) |
| OpenWeatherMap | weather API | (same) |
| Google Calendar | Calendar API | (same) |

## Database Design

- **Firestore**: Content archive, dedup memory, thematic calendar, pharmacopoeia, master lists, settings
- **Cloud SQL**: Feedback tracking, content metrics, engagement analytics, pharma update log

## Key Conventions

### TypeScript (Pipeline + Dashboard)
- Follow `/home/shreemulay/ai_projects/.claude/rules/typescript-bun.md`
- Interfaces over types, const objects over enums
- Zod schemas for all external data validation
- TOON for data structures

### Python (Content Engine)
- Follow `/home/shreemulay/ai_projects/.claude/rules/python.md`
- Pydantic v2 models for all LLM outputs
- Async FastAPI endpoints
- Structured prompts with XML tags

### Google Chat Cards
- Use `cardsV2` format (not legacy `cards`)
- Interactive buttons with action metadata for feedback
- Collapsible sections for optional content
- HTML formatting within `textParagraph` widgets

### Content Quality Rules
- Medication mechanisms MUST come from API data, not LLM generation
- "On This Day" events MUST match the current month
- Quotes MUST be historically verifiable (not fabricated)
- All content validated against Pydantic/Zod schemas before delivery
- Cross-section thematic coherence enforced by daily plan

## Phases

1. **Foundation** - Core pipeline, Vertex AI content generation, Firestore, Chat delivery
2. **Intelligence** - Thematic calendar, cross-section coherence, drug enrichment, PubMed/Grok
3. **Chat App** - Interactive buttons, feedback tracking, Cloud SQL analytics
4. **Dashboard** - React UI, IAP auth, role-based views, archive browser
5. **Analytics** - Engagement scoring, auto-updating pharmacopoeia, content recommendations

## Commands

```bash
# Pipeline service
cd services/pipeline && bun install && bun run dev

# Content engine
cd services/content-engine && uv pip install -e . && uvicorn app.main:app --reload

# Dashboard
cd services/dashboard && bun install && bun run dev

# Deploy
./scripts/deploy.sh [service-name]
```
