# TKE CKD Note Template - AI-Era Rebuild

## Status: APPROVED
## Version: 1.0
## Date: 2026-02-01
## Owner: Shree Mulay, MD

---

## Vision

Rebuild The Kidney Experts' CKD clinic note from a traditional Epic SmartPhrase into an AI-era documentation system where physical report cards, digital structured data, the clinic note, and AI agents are all expressions of the same underlying data model.

**BHAG Alignment**: "Ridding the World of the Need for Dialysis!" - comprehensive structured documentation enables systematic tracking of every intervention that slows CKD progression.

## Core Principles

1. **One section registry rules everything** - adding a new clinical topic means adding it to one registry; it propagates to cards, note, digital, AI, and report card automatically
2. **Every section follows the same pattern**: Discrete Fields -> AI Interpretation -> Action Items -> Patient Education
3. **Data can enter from any source**: Labs API, fax manager, human entry, OCR scan, transcription, previous note
4. **AI generates, humans validate** - AI pre-populates and interprets; provider reviews and signs
5. **Same template for initial visit AND follow-up** - two view modes, one data model
6. **Three outputs from one data model**: Provider note (billing/legal), Patient summary (plain language), Care team task list

## Scope

### In Scope
- 37 note sections across 9 clinical domains
- 42 physical assessment/education cards
- Section registry JSON schema (the keystone artifact)
- AI sub-agent architecture (6-10 initial, expandable)
- Epic-ready note template (SmartPhrase format)
- Physical report card design (1:1 with digital)
- Digital note builder web application
- Pre-visit auto-population engine
- Virtual scribe integration architecture
- OCR/card scanning pipeline design
- Renal Performance Clinic (Tier 1 screening)

### Out of Scope (Future)
- FHIR/Epic API deep integration
- Full renal rehabilitation program (Tier 3)
- Multi-practice deployment
- Patient portal integration
- EHR vendor negotiations

## Current State (Before)

The existing CKD smart phrase (`@ED@`) has:
- ~25 sections with `***` manual fill fields
- SmartLists with TKE-specific IDs (e.g., `{TKE Urine Summary:27014}`)
- No structured data extraction capability
- No AI integration
- Manual data entry for all values
- Same template serves initial + follow-up but with no adaptive behavior
- Physical report cards exist but are disconnected from the note
- 9 physical cards built in `tke-provider-workload-offload/` project

## Target State (After)

- 37 sections with discrete, queryable fields
- Every field has a defined data type, source, and target range
- AI sub-agents generate clinical interpretations per section
- Pre-visit engine auto-populates from labs/meds/prior note
- Virtual scribe extracts structured data from encounter transcription
- Physical cards feed data via OCR scanning
- Report card and note are 1:1 aligned
- Quality metrics are trivially extractable from structured data
- New sections can be added via registry without rebuilding the system

## Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Section Registry | JSON Schema | Single source of truth |
| Digital Note Builder | TypeScript + React + Bun | Shadcn/ui v4, Tailwind v4 |
| AI Agents | LLM-based (multi-provider) | OpenRouter, Anthropic, Google, OpenAI |
| Physical Cards | Print design (size TBD) | OCR-optimized, OMR checkboxes |
| Epic Integration | SmartPhrase + paste | FHIR future |
| Data Storage | Bun.sqlite or PostgreSQL | Patient encounter data |
| State Management | Zustand (client) | TanStack Query (server) |
| Validation | Zod | Runtime + types |

## Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to complete note (follow-up) | 5-10 min | <2 min (with AI pre-pop) |
| Time to complete note (initial) | 15-20 min | <5 min (with AI pre-pop) |
| Manual data entry fields | ~25 `***` fields | <5 (exception-only) |
| Structured data extraction | 0% | 100% of discrete fields |
| GDMT compliance tracking | Manual review | Automated per-visit |
| Report card alignment | Partial | 1:1 with note |
| Quality metric extraction | Manual chart review | Automated from schema |

## Domain Structure (9 Domains, 37 Sections)

| Domain | Color | Sections | Cards |
|--------|-------|----------|-------|
| 0. Header & Visit Context | - | 1 | - |
| 1. Kidney Core | Blue | 4 | 8 |
| 2. Cardiovascular-Renal | Red | 3 | 4 |
| 3. Pharmacotherapy (4 Pillars) | Purple | 4 | 4 |
| 4. Metabolic | Orange | 3 | 3 |
| 5. CKD Complications | Dark Blue | 3 | 3 |
| 6. Risk Mitigation | Green | 6 | 6 |
| 7. Planning & Transitions | Gray | 4 | 4 |
| 8. Screening & Prevention | Teal | 7 | 8 |
| 9. Care Coordination | Pink | 3 | 2 |
| **Cross-cutting** | - | - | 1 (Triple Whammy alert) |
| **TOTAL** | | **37** | **42** |

## Council Review

This plan was reviewed by a 6-model LLM Council (GPT-5.2, GLM-4.7, Gemini-3-Pro, DeepSeek-v3.2, Grok-4.1, Claude Opus 4.5) on 2026-02-01. Key findings incorporated:

- Progressive disclosure / exception-based UI (unanimous)
- Domain grouping confirmed superior to traditional flow (unanimous)
- 4 Pillars as standalone domain confirmed (unanimous)
- Delta Mode for follow-ups (GPT-5.2, adopted)
- Start with 6-10 AI agents, expand later (GPT-5.2, adopted)
- Digital-first, cards after schema stable (Gemini, adopted)
- Added: Nutrition/Dietary Assessment section
- Added: Medication Adherence & Barriers section
- Resolved: Furoscix (sub-field HF), PCSK9i (sub-field Lipids), Triple Whammy (AI alert)

Full council review: `specs/council-review.md`

## References

- KDIGO 2024 CKD Guidelines
- KDIGO 2024 BP in CKD
- KDIGO Anemia, MBD, Electrolytes guidelines
- AHA/ACC Heart Failure Guidelines
- ADA Standards of Care 2025
- EWGSOP2 Sarcopenia Criteria
- Fried Frailty Phenotype
- CREDENCE, DAPA-CKD, EMPA-KIDNEY, FLOW, FIDELIO-DKD, FIGARO-DKD, CONFIDENCE trials
