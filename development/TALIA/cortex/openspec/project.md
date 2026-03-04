# CORTEX — Project Overview

> **"The intelligence behind the encounter."**
>
> **Version**: 1.0 (Planning)
> **Last Updated**: March 4, 2026
> **Status**: Architecture Complete, Awaiting Note Templates, UX Approved
> **Phase**: Hospital Inpatient (Phase 1)

---

## 1. What Is CORTEX?

CORTEX is a hospital inpatient note documentation system for **The Kidney Experts (TKE)**, a prevention-focused nephrology practice in West Tennessee. It uses AI to generate clinical notes from ambient audio transcription, EPIC data extraction, and multi-model LLM consensus.

**Dual meaning**: kidney cortex (the outer layer of the kidney) + cerebral cortex (the brain's processing center). The intelligence behind the encounter.

### Key Value Propositions

1. **Accurate, complete, compliant documentation** — never "optimization" (regulatory red flag)
2. **"Review, Don't Write"** — AI generates notes, providers verify and approve
3. **Scribe augmentation** — frees scribes for higher-value QA work, does NOT replace them
4. **Revenue capture** — suggests highest defensible E/M code with transcript-linked justification
5. **Audit trail** — every data point traceable to source (lab, transcript timestamp, EPIC paste)

### Phasing

| Phase | Setting | Timeline |
|-------|---------|----------|
| **Phase 1** | Hospital Inpatient | Build now |
| Phase 2 | Outpatient Clinics | After Phase 1 stable |
| Phase 3 | Dialysis Settings | After Phase 2 |

---

## 2. Users & Form Factors

| User | Device | Primary Actions |
|------|--------|-----------------|
| **Scribe** | Laptop (Chromebook) | EPIC data paste, manage recordings, review/edit notes, data entry |
| **Provider** | Phone (mobile) | Quick review, approve/sign notes, start/stop recordings |
| **Data Entry (Philippines)** | Chromebook via Citrix VDI | Paste EPIC data, upload screenshots, confirm parsed data |

Both scribe and provider are equally important users. Either may be unavailable at times. System must handle various device combinations (2 computers + 1 phone, or just 1 phone, etc.).

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CORTEX PWA                                │
│                   (React/Next.js, PWA)                           │
│                                                                  │
│   Scribe Laptop    Provider Phone    Data Entry (Citrix)        │
└──────────┬───────────────┬──────────────────┬───────────────────┘
           │               │                  │
           ▼               ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Identity-Aware Proxy (IAP)                           │
│       Zero-trust auth + Context-Aware Access policies            │
│       (@thekidneyexperts.com only, IP/geo/time rules)            │
└──────────┬──────────────────────────────────────────────────────┘
           │ X-Goog-IAP-JWT-Assertion (signed JWT)
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CORTEX Backend                               │
│                 (Cloud Run + FastAPI)                             │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────────┐│
│  │ STT      │  │ Entity       │  │ Note Council               ││
│  │ Pipeline │  │ Extraction   │  │ (3 Models + Chairman)      ││
│  │          │  │              │  │                             ││
│  │ Chirp 3  │  │ Gemini Flash │  │ Gemini 3.1 Pro             ││
│  │ → Voxtral│  │ + Vision     │  │ Claude Sonnet 4.6          ││
│  │ (Phase   │  │              │  │ Mistral Medium 3           ││
│  │  1.5)    │  │              │  │                             ││
│  └──────────┘  └──────────────┘  └────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    Vertex AI RAG Engine                       ││
│  │              (Nephrology KB, Guidelines, Note History)        ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Cloud SQL (PostgreSQL)                      │
│                    SHARED WITH TALIA 1.0                         │
│                                                                  │
│  ┌─────────────┐  ┌────────────────┐  ┌───────────────────────┐│
│  │ TALIA 1.0   │  │ CORTEX Tables  │  │ Shared Tables         ││
│  │ Tables      │  │                │  │                        ││
│  │ (13 tables  │  │ Encounters     │  │ Patients (census)     ││
│  │  migrated   │  │ Transcripts    │  │ Providers             ││
│  │  from       │  │ Notes          │  │                        ││
│  │  Sheets)    │  │ Recordings     │  │                        ││
│  └─────────────┘  └────────────────┘  └───────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  GCS (Audio Storage, 10-year retention per TN law)              │
│  BigQuery (Analytics, downstream only)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Frontend** | React/Next.js PWA | Desktop + mobile, offline support, service workers |
| **Backend** | Cloud Run + FastAPI (Python) | Serverless, auto-scaling, Python ML ecosystem |
| **STT (Phase 1)** | Google Cloud STT v2 (Chirp 3) | Fully managed, GCP-native, swap-ready |
| **STT (Phase 1.5)** | Voxtral Transcribe 2 (self-hosted) | 10-21x cheaper, better noise robustness, Apache 2.0 |
| **Entity Extraction** | Gemini Flash | Fast, cheap, structured output |
| **Screenshot OCR** | Gemini Flash Vision | Extract structured data from EPIC screenshots |
| **Embeddings** | gemini-embedding-001 (3072d) | For RAG vector search |
| **RAG** | Vertex AI RAG Engine | Fully managed, Spanner-backed ("I don't want to manage a RAG!") |
| **Council Model 1** | Gemini 3.1 Pro (Vertex AI) | Native GCP, fast |
| **Council Model 2 / Chairman** | Claude Sonnet 4.6 (Vertex AI) | FedRAMP High, Claude for Healthcare |
| **Council Model 3** | Mistral Medium 3 (Vertex AI) | Different training data, decorrelates errors |
| **Ops Database** | Cloud SQL (PostgreSQL) | Shared with TALIA 1.0 AppSheet |
| **Analytics** | BigQuery | Downstream only, not for ops |
| **Audio Storage** | GCS | 10-year retention per TN law |
| **Auth** | Identity-Aware Proxy (IAP) | Zero-trust, infrastructure-level auth, @thekidneyexperts.com, Context-Aware Access policies |
| **Offline** | Service Worker + IndexedDB + Signed GCS URLs | Local recording, session-key encryption, pre-signed upload URLs for background sync |

---

## 5. 3-Phase Encounter Workflow

```
Phase 1: HALLWAY HUDDLE          Phase 2: IN-ROOM              Phase 3: POST-ROOM
(Outside patient room)           (With patient)                (After leaving room)
                                                               
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ • Paste EPIC data   │   │ • Live transcription│   │ • Optional dictation│
│ • AI pre-round brief│──▶│ • Entity extraction │──▶│ • Council generates │
│ • Review trends     │   │ • Quick exam entry  │   │   note              │
│ • Team discussion   │   │ • Pause/mute button │   │ • Review & sign     │
│ • Optional recording│   │ • Manual trigger    │   │ • Smart Copy → EPIC │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

**Manual triggers only** — no ambient always-on recording. Provider presses START when ready. This prevents cross-patient PHI bleed between encounters.

---

## 6. 3-Model Clinical Note Council

```
Step 1: GENERATE (parallel)
  Gemini 3.1 Pro  ──────▶  Note Draft A
  Claude Sonnet 4.6 ────▶  Note Draft B
  Mistral Medium 3  ────▶  Note Draft C

Step 2: CROSS-REVIEW (parallel)
  Each model reviews and ranks the other 2 drafts

Step 3: SYNTHESIZE (Claude Chairman)
  Claude Sonnet 4.6 synthesizes final note with:
  ├── Confidence scores per section (🟢🟡🔴)
  ├── Disagreement flags for human review
  ├── Transcript traceability links
  └── High-risk field verification status
```

### Council Tiering

| Tier | When | Process |
|------|------|---------|
| **Full Council** | Complex notes (H&P, critical care, transplant) | All 3 generate → cross-review → chairman synthesizes |
| **Quick Council** | Standard progress notes | 1 generates → 2 verify | 
| **Single Model** | Templated notes (procedure notes) | 1 generates → provider reviews |

### Estimated Performance

- **Latency**: ~20-35 seconds with parallelism
- **Monthly cost**: ~$700-980 for council layer
- **Total system cost**: ~$2,500-3,000/month (dropping to ~$1,500-2,000 with Voxtral)

---

## 7. Data Integration — TALIA 1.0

### Current State

TALIA 1.0 is an AppSheet application with 13 Google Sheets tables, including the patient roster (90+ fields), lab results, medications, quality metrics, and transplant tracking. **AppSheet Enterprise license confirmed.**

### Migration Plan

Migrate TALIA 1.0 from Google Sheets to Cloud SQL (PostgreSQL) using AppSheet's built-in "Copy App to SQL Database" tool. Both TALIA 1.0 (AppSheet) and CORTEX (Cloud Run) will connect to the same Cloud SQL instance.

**See**: `docs/cloud-sql-migration-email.html` for detailed migration guide sent to IT.

### Architecture

```
TALIA 1.0 (AppSheet)  ──▶  Cloud SQL (PostgreSQL)  ◀──  CORTEX (Cloud Run)
                           Single Source of Truth
```

---

## 8. EPIC Integration

### Phase 1 (Copy/Paste)

- **Text paste**: Copy from EPIC → paste into CORTEX. Gemini Flash parses and structures.
- **Screenshots**: Screenshot EPIC screens → paste/upload into CORTEX. Gemini Flash Vision extracts structured data.
- **Smart Copy out**: CORTEX generates formatted text blocks matching EPIC field layout. Provider copies back into EPIC.

### Phase 2+ (API — Future)

- FHIR R4 read access (patient data, labs, meds, vitals)
- SmartLinks for deep-linking from EPIC to CORTEX
- Note push via FHIR DocumentReference

---

## 9. Compliance & Safety

### HIPAA

| Measure | Implementation |
|---------|---------------|
| BAA | GCP (existing), Vertex AI partner models covered |
| Encryption at rest | Cloud SQL, GCS (AES-256, automatic) |
| Encryption in transit | TLS 1.3 enforced |
| Offline encryption | Session-derived key in IndexedDB |
| Access control | IAP (zero-trust) + Context-Aware Access, @thekidneyexperts.com domain |
| Audit logging | Cloud Audit Logs on all data access |
| Audio retention | 10 years per TN law, GCS with lifecycle policies |
| PHI in Philippines | Citrix VDI on TKE Chromebooks — PHI never leaves US |

### Clinical Safety

| Safeguard | Implementation |
|-----------|---------------|
| High-risk fields | Labs, meds, doses, access, anticoag — each with source provenance |
| Never auto-populate numbers | Numerical values from audio flagged for mandatory human verification |
| Confidence colors | 🟢 all 3 agree, 🟡 2/3 agree, 🔴 disagreement — MUST verify |
| Audio-to-text traceability | Click any sentence → hear source audio |
| Note versioning | Track AI-generated vs physician-modified (diff) |
| Physician attestation | Required before finalization |
| Billing justification | Transcript-linked evidence for every suggested code |
| Patient identity | Hard gate (MRN) at encounter start + fuzzy monitoring throughout |

### Hospital Approval

Not a formal MOU. The hospital already uses DAX and other STT tools — ambient audio capture for clinical documentation is pre-approved. CORTEX needs to demonstrate comparable security standards via notification + compliance documentation.

---

## 10. Consent

- **Logged toggle** at encounter start (patient consent to recording)
- **Refusal workflow** if patient declines
- **"Recording paused" states** for sensitive moments
- **Visual indicator** always visible when recording active
- **Voice identification** at encounter start

---

## 11. Offline Mode

- **Service Worker** caches app shell and recent patient data
- **IndexedDB** stores encounter data locally
- **Local recording** continues even if connectivity lost
- **Session-derived encryption key** protects local PHI
- **Sync on reconnect** uploads audio + data, triggers note generation
- **Visual indicator** shows offline status clearly

---

## 12. Monthly Cost Estimate

| Component | Monthly |
|-----------|---------|
| STT (Chirp Phase 1 → Voxtral Phase 1.5) | ~$1,200 → ~$112 |
| Gemini Flash (entity extraction) | ~$1 |
| Note Council (Gemini + Claude + Mistral) | ~$700-980 |
| Vertex AI RAG Engine | ~$200-400 |
| Cloud Run + Cloud SQL + GCS | ~$200-400 |
| Audio storage (10-year retention) | ~$60 |
| **Total** | **~$2,500-3,000** (dropping to ~$1,500-2,000 with Voxtral) |

---

## 13. Open Items

- [ ] **Hospital note templates** — User to provide example notes (H&P, progress note, critical care, procedure, ACP) to model output format
- [ ] **Scribe design workshop** — Involve scribes in UX design (council recommendation)
- [ ] **Voxtral Cloud Run GPU deployment spec** — Self-hosting details for Phase 1.5
- [ ] **EPIC field mapping** — Map Smart Copy output to specific EPIC fields
- [ ] **User's previous Claude app prototype** — Not found; proceeding without it

---

## 14. Key Decisions Log

| # | Decision | Date | Rationale |
|---|----------|------|-----------|
| 1 | App name: CORTEX | Feb 2026 | Dual meaning: kidney cortex + brain cortex |
| 2 | PWA over native | Feb 2026 | Cross-platform, Chromebook fleet, mobile |
| 3 | GCP only | Feb 2026 | Existing BAA, single cloud |
| 4 | Chirp 3 → Voxtral | Feb 2026 | Start managed, swap to 10x cheaper self-hosted |
| 5 | 3-model council | Feb 2026 | Decorrelated errors, consensus > single model |
| 6 | Cloud SQL shared | Mar 2026 | TALIA 1.0 + CORTEX share real-time patient data |
| 7 | Manual triggers | Feb 2026 | Prevent cross-patient PHI bleed |
| 8 | BUILD not BUY | Feb 2026 | Full TALIA platform vision, tech improving daily |
| 9 | 18 inpatient domains | Mar 2026 | Comprehensive nephrology hospital coverage |
| 10 | Option C (shared DB) | Mar 2026 | AppSheet + CORTEX on same Cloud SQL |
