# TKE Morning Intelligence - Project Specification

## Status: ACTIVE
## Phase: 1 - Foundation
## Created: 2026-03-04

---

## Vision

Replace the n8n Morning Messages workflow with a GCP-native system that delivers
thematically cohesive, non-repeating daily educational content to The Kidney Experts
team via Google Chat, backed by a self-updating nephrology pharmacopoeia, engagement
analytics, and a role-based web dashboard.

**BHAG Connection**: "Ridding the World of the Need for Dialysis!" - Daily education
keeps staff sharp on prevention strategies, systems thinking, and the latest in
nephrology.

---

## Architecture Overview

```
Cloud Scheduler (6 AM CT) → Pub/Sub → Pipeline Service (TS/Bun)
                                            │
                              ┌─────────────┼─────────────┐
                              ▼             ▼             ▼
                        Data Fetcher   Content Engine  Firestore
                        (internal)     (Python/FastAPI) (dedup + archive)
                              │             │
                              └──────┬──────┘
                                     ▼
                              Format + Validate
                                     │
                              ┌──────┼──────┐
                              ▼      ▼      ▼
                           Mindset  Ops   Celebrations
                           Card    Card   Card
                           (Chat)  (Chat) (Chat)
                                     │
                              Dashboard (React)
                              IAP-protected
```

---

## Services

### 1. Pipeline Service (`services/pipeline/`)
- **Language**: TypeScript / Bun
- **Runtime**: Cloud Run
- **Responsibilities**:
  - Receives Pub/Sub trigger from Cloud Scheduler
  - Fetches external data (weather, calendars, Exa, Grok, PubMed)
  - Calls Content Engine for AI generation
  - Reads daily plan from thematic calendar (Firestore)
  - Validates all outputs via Zod schemas
  - Formats Google Chat cards (cardsV2)
  - Delivers to Google Chat spaces
  - Handles button click callbacks (feedback)
  - Stores results to Firestore archive
  - Logs metrics to Cloud SQL

### 2. Content Engine (`services/content-engine/`)
- **Language**: Python 3.12+ / FastAPI
- **Runtime**: Cloud Run
- **Responsibilities**:
  - `POST /generate` - Generate 6 content sections via Vertex AI
  - `POST /plan-themes` - Monthly/weekly theme planning
  - `POST /enrich-drug` - Enrich drug data from OpenFDA/DailyMed/RxNorm
  - `POST /update-pharmacopoeia` - Weekly auto-scan for new nephrology drugs
  - All Vertex AI calls centralized here
  - Pydantic v2 validation on all LLM outputs
  - Structured prompts with XML tags

### 3. Dashboard (`services/dashboard/`)
- **Language**: TypeScript / React 19 / Bun
- **Runtime**: Cloud Run + IAP
- **Responsibilities**:
  - Today's content view
  - Content archive browser with search
  - Pharmacopoeia admin (view, add, edit drugs)
  - Thematic calendar management
  - Engagement analytics dashboard
  - Role-based views:
    - **Admin**: Full access + system health
    - **Leadership**: Content archive + analytics
    - **Staff**: Today's content + drug lookup

---

## Vertex AI Model Strategy

| Content Section | Model ID | Thinking Level | Rationale |
|----------------|----------|---------------|-----------|
| Systems Thinking | `gemini-3.1-pro-preview` | medium | Complex abstract reasoning |
| Quote | `gemini-3.1-flash-lite-preview` | minimal | Simple lookup task |
| Nephrology History | `gemini-3-flash-preview` | low | Accuracy + grounding |
| AI Ideas | `gemini-3.1-flash-lite-preview` | minimal | Template output |
| Did You Know | `gemini-3.1-flash-lite-preview` | low | Simple fact generation |
| Medication Spotlight | `gemini-3-flash-preview` | low | Accuracy-critical |
| Theme Planning | `gemini-3.1-pro-preview` | high | Complex multi-week planning |

### Cost Estimate
- **Daily**: ~$0.02 (6 generations + validation)
- **Weekly**: ~$0.15 (daily + theme planning)
- **Monthly**: ~$0.65
- **Annual**: ~$8

Compared to current OpenRouter Claude Opus 4.5: ~$180-720/year. **~97% savings.**

---

## Database Schema

### Firestore Collections

#### `content-archive/{date}`
Stores each day's complete generated content.
```
{
  date: "2026-03-04",
  theme: { monthly: "...", weekly: "...", daily: "..." },
  sections: {
    systems_thinking: { concept, emoji, coreIdea, nephrologyExample, ... },
    quote: { quote, author, authorRole, source, connectionToTheme },
    nephrology_history: { event, year, emoji, significance, funFact },
    ai_ideas: { beginner: {...}, advanced: {...} },
    did_you_know: { category, emoji, fact, source, whyItMatters },
    medication: { genericName, brandName, drugClass, ... }
  },
  external_data: {
    weather: {...},
    calendar_events: [...],
    news: [...],
    trending: [...]
  },
  delivery: {
    mindset_message_id: "...",
    operations_message_id: "...",
    celebration_message_id: "...",
    delivered_at: timestamp
  },
  meta: {
    models_used: {...},
    generation_time_ms: number,
    validation_passed: boolean,
    fallbacks_used: [...]
  }
}
```

#### `content-memory/{category}/{item}`
Deduplication tracking with usage history.
```
{
  item: "Feedback Loops",
  category: "systems_concepts",
  use_count: 5,
  last_used: "2026-02-15",
  first_used: "2025-12-01",
  usage_dates: ["2025-12-01", "2025-12-28", ...],
  cooldown_days: 30  // Don't reuse within 30 days
}
```

#### `thematic-calendar/{year-month}`
Monthly and weekly theme plans.
```
{
  year_month: "2026-03",
  monthly_theme: {
    name: "Kidney Health Awareness",
    observance: "National Kidney Month",
    description: "...",
    generated_at: timestamp,
    approved: boolean
  },
  weekly_themes: [
    { week: 1, name: "The Kidney as a System", focus: "..." },
    { week: 2, name: "Prevention in Practice", focus: "..." },
    ...
  ],
  daily_assignments: [
    {
      date: "2026-03-04",
      systems_concept: "Feedback Loops",
      medication: "lisinopril",
      dyk_category: "Kidney Physiology",
      ai_beginner_topic: "Writing discharge instructions",
      ai_advanced_tool: { name: "Perplexity", url: "perplexity.ai" }
    },
    ...
  ]
}
```

#### `pharmacopoeia/{generic_name}`
Curated nephrology drug database with API enrichment.
```
{
  generic_name: "lisinopril",
  brand_names: ["Zestril", "Prinivil"],
  drug_class: "ACE Inhibitor",
  nephrology_use: "Hypertension, proteinuria, diabetic nephropathy",
  mechanism: "Blocks ACE, reducing angiotensin II...",  // From DailyMed, not LLM
  renal_dosing: "Reduce dose if CrCl < 30 mL/min",
  side_effects: ["Cough", "Hyperkalemia", "Angioedema", "Hypotension"],
  interactions: [...],
  source: "dailymed",
  rxcui: "29046",
  last_enriched: timestamp,
  added_by: "seed",  // "seed" | "admin" | "auto"
  is_active: true
}
```

#### `master-lists/{list_name}`
Configurable content pools.

#### `settings/config`
System configuration.

### Cloud SQL Tables

```sql
-- feedback, content_metrics, engagement, pharmacopoeia_updates
-- (See architecture plan for full schema)
```

---

## External APIs

| API | Purpose | Auth | Rate Limits |
|-----|---------|------|-------------|
| Vertex AI | LLM generation | Service account | Pay-per-use |
| Exa | Web search, news, code context | API key | 1000 req/month (free) |
| Grok | X/Twitter trending | API key | TBD |
| PubMed E-utilities | Medical literature | API key (optional) | 3 req/sec (no key), 10/sec (with key) |
| OpenFDA | Drug data, adverse events | None | 240 req/min |
| DailyMed | Package inserts, drug info | None | No documented limits |
| RxNorm | Drug classifications | None | 20 req/sec |
| OpenWeatherMap | Weather | API key | 60 req/min (free) |
| Google Calendar | Calendar events | OAuth2 | Standard quota |
| Google Chat | Message delivery + interactions | Service account | Standard quota |

---

## Phases

### Phase 1: Foundation
- [ ] GCP infrastructure (Terraform)
- [ ] Content Engine with Vertex AI (6 generators)
- [ ] Pipeline Service (orchestration, data fetching)
- [ ] Firestore setup (archive, memory, master lists)
- [ ] Seed pharmacopoeia from existing 57 drugs
- [ ] Google Chat delivery (webhooks initially for faster start)
- [ ] Basic deduplication from Firestore memory
- [ ] Error handling and notification
- **Goal**: Feature parity with n8n, better content quality

### Phase 2: Intelligence
- [ ] Thematic calendar system
- [ ] Cross-section content coherence
- [ ] Drug enrichment from OpenFDA/DailyMed/RxNorm
- [ ] Better deduplication (cooldown periods, usage scoring)
- [ ] PubMed integration
- [ ] Grok/X trending integration
- [ ] Exa replacing Tavily+GNews
- **Goal**: Smarter, themed content that tells daily stories

### Phase 3: Chat App + Feedback
- [ ] Google Chat App setup
- [ ] Interactive button cards
- [ ] Feedback tracking (Cloud SQL)
- [ ] Button click handler endpoint
- [ ] Migrate from webhooks to Chat App
- **Goal**: Two-way engagement

### Phase 4: Dashboard
- [ ] React/Shadcn scaffold
- [ ] IAP configuration
- [ ] Today's content view
- [ ] Content archive browser
- [ ] Pharmacopoeia admin
- [ ] Theme calendar management
- **Goal**: Full visibility and control

### Phase 5: Analytics + Auto-Update
- [ ] Engagement analytics
- [ ] Content quality scoring
- [ ] Theme effectiveness tracking
- [ ] Auto-updating pharmacopoeia (weekly FDA scan)
- [ ] Content recommendations from feedback
- **Goal**: Self-improving system
