# CORTEX — Hospital Note Documentation System

## Project Overview

**CORTEX** ("The intelligence behind the encounter") is a hospital inpatient note documentation system for The Kidney Experts (TKE). It's a standalone module of TALIA (TKE's Care Delivery Operating System) that uses AI to generate clinical notes from ambient audio transcription, EPIC data extraction, and multi-model LLM consensus.

**Location**: `development/TALIA/cortex/`
**Parent**: TALIA ecosystem
**Status**: OpenSpec planning phase (no code yet)

## Key Principle

3-Phase Encounter (Hallway Huddle, In-Room, Post-Room) with manual encounter triggers. Omi wearable provides ambient + encounter-bound audio capture; PWA mic as fallback. AI generates, provider reviews. "Review, Don't Write."

## Architecture

- **PWA** (React/Next.js), desktop + mobile
- **Cloud**: GCP under TKE's existing BAA
- **Audio Capture**: Omi wearable ($89, BLE 5.2, HIPAA/SOC 2) — ambient + encounter-bound; PWA mic fallback
- **STT**: Chirp 3 (Phase 1) → Voxtral Transcribe 2 self-hosted (Phase 1.5); Omi STT as trial/comparison ($160/mo)
- **Entity Extraction**: Gemini Flash (post-transcription) + Gemini Flash Vision (screenshots)
- **Note Council**: 3-model (Gemini 3.1 Pro, Claude Sonnet 4.6, Mistral Medium 3) → Chairman synthesis
- **RAG**: Vertex AI RAG Engine (fully managed)
- **Ops DB**: Cloud SQL (MySQL 8.4) — shared with TALIA 1.0 (AppSheet); MySQL chosen for AppSheet connection stability
- **Auth**: Identity-Aware Proxy (IAP) — zero-trust, @thekidneyexperts.com, Context-Aware Access
- **Backend**: Cloud Run + FastAPI (Python)

## 18 Inpatient Domains (6 Groups)

| Group | Domains |
|-------|---------|
| Core Kidney | AKI, CKD/ESRD |
| Internal Milieu | Electrolytes, Acid-Base |
| Hemodynamics & CV | Fluid/Volume/Hemodynamics, HF/Cardiorenal, CMK |
| Specialized | Dialysis/RRT, TMA/PLEX, Transplant, Acute GN, Pregnancy-Related |
| Cross-Cutting | Critical Care, Anemia, Nutrition, Medications/Safety |
| Management | GOC/ACP/Palliative, Consult Management/Disposition |

## Project Structure

```
cortex/
├── AGENTS.md              # This file
├── openspec/              # Specifications (source of truth)
│   ├── project.md         # Project overview, architecture, decisions
│   ├── specs/             # Current state specs
│   │   ├── inpatient-domains.md
│   │   ├── ux-design.md
│   │   ├── tech-stack.md
│   │   ├── note-council.md
│   │   └── compliance.md
│   └── changes/           # Change proposals
├── docs/                  # Supporting documents
│   └── cloud-sql-migration-email.html
├── src/                   # Source code (future)
└── tests/                 # Tests (future)
```

## Conventions

- All clinical content follows KDIGO 2024, AHA/ACC, ASFA guidelines
- Domain IDs use snake_case (e.g., `aki`, `heart_failure_cardiorenal`)
- HIPAA: All infrastructure under GCP BAA. Omi BAA required (SOC 2 + HIPAA certified). PHI encrypted at rest + transit.
- Billing language: "accurate code capture" never "optimization"
- High-risk fields (labs, meds, doses, access, anticoag) must have provenance tracing

## Related Projects

- `tke-ckd-note-template/` - Outpatient CKD note (design patterns to inherit)
- `talia-quality-metrics/` - Quality metrics (shared patient data via Cloud SQL)
- `tke-provider-workload-offload/` - Existing MA assessment cards
- `../fax-manager/` - Fax processing (Gemini doc extraction patterns)
- `nephrology_knowledge_base/` - Knowledge base (RAG corpus)
