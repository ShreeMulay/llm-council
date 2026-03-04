# TKE Knowledge Base — Project Specification

## Status: APPROVED
## Version: 1.0
## Last Updated: 2026-03-04

---

## 1. Vision

A comprehensive, self-healing nephrology knowledge base that serves ALL TKE stakeholders
(physicians, APPs, MAs, CCM team, billing, admin, Dr. Mulay) via AI chatbot/RAG.
The system self-updates from authoritative medical sources with physician review gates.

**BHAG Alignment**: "Ridding the World of the Need for Dialysis!" — This KB ensures every
TKE team member has instant access to the latest evidence-based nephrology knowledge,
enabling earlier intervention and better CKD management.

## 2. Problem Statement

TKE has attempted 5 previous knowledge base projects, all stalled by:
- **Scope explosion** (450+ subtopics, 5-pass pipelines)
- **Audience confusion** (conflating physician, staff, patient needs)
- **No delivery vehicle** (unclear how content reaches users)
- **No update mechanism** (content goes stale immediately)

The one project that shipped (CCM Gem) succeeded because it was narrowly scoped.

## 3. Solution: Onion Model

Build in concentric layers, each independently useful:

| Layer | Scope | Users | Timeline |
|-------|-------|-------|----------|
| **L1** | Clinical Core (15 domains) | Physicians/APPs | Weeks 1-8 |
| **L2** | Extended Drug Info + Prior Auth | Physicians + MAs | Weeks 9-12 |
| **L3** | Staff Protocols (replaces CCM Gem) | All clinical staff | Weeks 13-16 |
| **L4** | Operations & Billing | Billing + Admin | Weeks 17-20 |
| **L5** | Training & Onboarding | All staff | Weeks 21-24 |
| **L6** | Business Intelligence | Dr. Mulay | Weeks 25-28 |

## 4. Tech Stack

| Component | Technology | Cost/Month |
|-----------|-----------|-----------|
| Vector DB | Qdrant Cloud (free tier) | $0 |
| Embeddings | Voyage 4-large (1024 dims) | ~$2-5 |
| Chat LLM | Gemini 3.1 Pro | ~$15-40 |
| Backend | Python (FastAPI) | — |
| Frontend | React 19 + Shadcn/ui v4 | — |
| Metadata | SQLite (Bun.sqlite) | — |
| Hosting | Cloud Run or VPS | ~$10-30 |
| **TOTAL** | | **~$25-75/month** |

## 5. L1 Clinical Domains (15 domains)

### Core 12
1. Proteinuria management (UACR/UPCR targets, monitoring)
2. RAAS blockade (ACEi/ARB dosing, titration, hyperkalemia)
3. SGLT2 inhibitors — Farxiga (dapagliflozin), Jardiance (empagliflozin)
4. Finerenone/MRA — Kerendia (finerenone), spironolactone
5. GLP-1 agonists — Ozempic/Wegovy (semaglutide), Mounjaro/Zepbound (tirzepatide)
6. CHF/GDMT optimization — Entresto (sacubitril/valsartan), beta-blockers
7. Anemia/CKD-MBD — Aranesp (darbepoetin), Jesduvroq (daprodustat), phosphorus binders
8. Electrolyte management — Veltassa (patiromer), Lokelma (SZC)
9. Diabetes metrics — A1c targets in CKD, insulin adjustment
10. Statin/Lipid therapy — Repatha (evolocumab), Leqvio (inclisiran)
11. NSAID/PPI avoidance — Nephrotoxin protocols, alternatives
12. Smoking cessation — Chantix (varenicline), Wellbutrin (bupropion)

### Additional 3
13. Gout/Uric acid — Krystexxa (pegloticase), allopurinol, febuxostat
14. Transplant immunosuppression — Prograf (tacrolimus), CellCept (mycophenolate)
15. GN immunosuppression — Rituxan (rituximab), Lupkynis (voclosporin), Filspari (sparsentan)

## 6. Content Per Domain

Each domain document includes:
1. **Clinical Summary** — 500-1000 words, evidence-based
2. **Drug Protocols** — Dosing, titration, monitoring (brand + generic names)
3. **Decision Trees** — When to initiate, escalate, switch, stop
4. **Lab Monitoring** — What to check, frequency, target ranges
5. **Patient Education Points** — Key counseling messages
6. **Coding/Billing Notes** — Relevant ICD-10, CPT codes
7. **TKE-Specific Protocols** — Practice-specific approach (AI-drafted, physician-reviewed)
8. **Source Citations** — Direct links to guidelines, trials, labels

## 7. Self-Updating Pipeline (6 Mechanisms)

1. **Auto-ingest new guidelines** — Monitor KDIGO, CMS, FDA, NKF, ADA, ACC/AHA
2. **Content freshness checks** — Flag chunks >6 months unverified
3. **Source monitoring** — Watch specific URLs/feeds for changes
4. **Usage-driven gap detection** — Log unanswerable queries, surface weekly
5. **Human review loop** — AI drafts, physician approves before publish
6. **Version control** — Full git history of all content changes

## 8. Source Formats (Ingestion)

- PDFs (KDIGO guidelines, FDA prescribing information)
- Web pages / HTML (UpToDate, NIDDK, NKF, CMS)
- Journal articles (PubMed, AJKD, CJASN)
- Structured data (drug databases, lab reference ranges, ICD/CPT codes)

## 9. Delivery Interfaces

- **Web browser** — Desktop/laptop during or between encounters
- **Mobile** — Quick lookups on phone between patients
- **EHR integration** — Future: embedded in EHR workflow
- **Admin UI** — Physician review queue for content approval

## 10. Key Design Decisions

1. Semantic chunking over fixed-size (respect medical section boundaries)
2. Brand + Generic drug mapping on every query (expand for better recall)
3. Domain-aware retrieval (filter by detected domain, fallback to all)
4. Citation-first responses (every answer cites source)
5. Confidence scoring (flag low-confidence for review vs. fabrication)
6. Reranker: deferred — test without, add if accuracy insufficient
7. No PHI ever — purely reference/educational content

## 11. Success Metrics

- **Retrieval accuracy** >90% on golden query test suite
- **Citation accuracy** — every answer has valid, verifiable source
- **Content freshness** — <5% of content flagged as stale at any time
- **User satisfaction** — physicians find answers useful (qualitative feedback)
- **Coverage** — <10% of queries result in "I don't know" responses
- **Latency** — <3 seconds for complete response
