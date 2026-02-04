# LLM Council Review - Plan Evaluation

## Date: 2026-02-01
## Council: GPT-5.2, GLM-4.7, Gemini-3-Pro, DeepSeek-v3.2, Grok-4.1, Claude Opus 4.5

---

## Rankings

| Rank | Model | Score | Key Contribution |
|------|-------|-------|-----------------|
| 1st | GPT-5.2 | 1.0 | Data model vs UI distinction; Delta Mode; 3-output model |
| 2nd | GLM-4.7 | 2.0 | Progressive Disclosure; prototype-first; "Operating System for Nephrology" |
| 3rd | Gemini-3-Pro | 4.0 | Digital-first challenge; OCR risk; SmartBlock logic |
| 4th | DeepSeek-v3.2 | 4.0 | Synthesis over summarization; MVP-first; Three-Click Rule |
| 5th | Grok-4.1 | 4.4 | Metrics-driven; JASN evidence; specific CMS measures |
| 6th | Claude Opus 4.5 | 5.6 | Broad coverage, less depth |

---

## Unanimous Agreements (6/6)

1. **38 sections correct for DATA MODEL; too many for UI** → Progressive disclosure, conditional visibility, exception-based rendering adopted
2. **Domain-grouped ordering (Option B) is superior** → Caveat: final signed note should still have conventional A&P structure for coders
3. **4 Pillars as standalone domain** → Quality metrics and GDMT compliance tracking require centralized visibility
4. **Triple Whammy = cross-cutting AI alert, NOT a note section**
5. **Furoscix = sub-field** (not standalone) → Placed under Heart Failure
6. **PCSK9i = sub-field** under Lipid Therapy (5/6 agreed)
7. **Eversense CGM = sub-field** of Diabetes (6/6)
8. **Same template, two VIEW MODES** (Initial expanded, Follow-up delta-focused)

## Key Concept Adopted: Delta Mode (GPT-5.2)

For follow-up visits, the system shows only items that changed since the last visit. Stable sections auto-collapse to a one-liner. This prevents note bloat and focuses provider attention on what matters.

## Key Concept Adopted: Three Outputs (GPT-5.2)

One data model produces three distinct outputs:
1. **Provider note** (billing/legal/clinical) - the Epic note
2. **Patient-facing summary** (plain language, action list, targets) - the take-home document
3. **Care team task list** (labs due, referrals, education modules) - for CCM/care coordination

## Key Concept Adopted: Paper Prototype First (GLM-4.7)

"Paper is cheap; coding is expensive." Before building digital tools, print draft cards and do mock visits with real providers. Insert Phase 1.5: Paper Prototype between schema and digital builder.

## Key Concept Adopted: Digital-First Card Production (Gemini)

Don't print final cards until the digital schema is stable. Physical cards are an OUTPUT of the validated digital system, not a parallel development track.

## Disagreements and Resolutions

### AI Agent Count
- **Consolidate to 5-7**: GLM, Gemini (fewer failure points)
- **Keep 15-20**: Claude, DeepSeek (domain-specific fine-tuning)
- **Start 6-10, expand later**: GPT-5.2 (pragmatic)
- **Resolution**: Start with 8 core agents (Phase 4), expand to 12-15 (Phase 8)

### Hematuria + GU History
- **Keep separate**: GPT-5.2, GLM, Grok, DeepSeek (4/6)
- **Merge**: Gemini, Claude (2/6)
- **Resolution**: Keep separate (different clinical logic, different workups)

### Renal Performance Clinic Priority
- **High priority (early)**: GLM, Claude
- **After core stable**: GPT-5.2, DeepSeek, Gemini, Grok (4/6)
- **Resolution**: Tier 1 screening (grip + STS) starts Phase 0 (costs nothing). Formal clinic (Tier 2/3) waits until Phase 9.

## Missing Sections Identified

| Section | Flagged By | Resolution |
|---------|-----------|------------|
| Nutrition / Dietary Assessment | GLM, GPT-5.2, Gemini, DeepSeek, Grok | **ADDED** as Section 34 |
| Medication Adherence & Barriers | GPT-5.2, Claude, DeepSeek | **ADDED** as Section 35 |
| AKI History / AKI-CKD Transition | GPT-5.2, Grok | **ADDED** as sub-field of Kidney Function |
| Cognitive Function / Dementia | DeepSeek | **ADDED** as sub-field of Depression Screen |
| Pruritus | DeepSeek | **ADDED** as sub-field of Electrolytes |
| Pregnancy / Contraception | GPT-5.2 | **ADDED** as conditional field in Med Adherence |
| Vein Preservation | Gemini | **ADDED** as sub-field of Dialysis Planning |

## Risk Mitigation (Top 7)

1. **Provider Adoption** → Co-design with champions, prove time savings
2. **Note Bloat** → Delta Mode, progressive disclosure, strict output budgets
3. **AI Hallucination** → Citations to source, locked templates, confidence scoring
4. **Epic Integration** → Prototype in sandbox early, dedicated Epic analyst
5. **OCR Reliability** → Human verification step before note acceptance
6. **Data Integrity Drift** → One authoritative registry, versioning, automated tests
7. **Privacy/HIPAA** → BAAs, access controls, retention policies, audit trails

## Implementation Phase Adjustments

Original → Revised (per council feedback):
- **Added Phase 0**: Governance, success metrics, stakeholder alignment
- **Added Phase 1.5**: Paper prototype (GLM recommendation)
- **Moved digital builder before cards** (Gemini recommendation)
- **Moved pre-visit engine earlier** (Claude, GPT-5.2: immediate ROI)
- **Split AI agents into Phase 4 (core) + Phase 8 (expansion)** (GPT-5.2)
