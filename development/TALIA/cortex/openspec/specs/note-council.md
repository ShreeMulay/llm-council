# CORTEX — Clinical Note Council Specification

> **Version**: 1.0
> **Last Updated**: March 4, 2026
> **Pattern**: Multi-Model Consensus (3 generators + chairman synthesis)
> **Estimated Latency**: 20-35 seconds
> **Estimated Monthly Cost**: $700-980

---

## 1. Why a Council?

Single-model clinical note generation has inherent risks:

1. **Hallucination** — A single model may fabricate findings, labs, or clinical details
2. **Omission** — A single model may miss key clinical elements from the transcript
3. **Bias** — Each model has training data biases (geographic, temporal, guideline version)
4. **Overconfidence** — A single model cannot flag its own uncertainty reliably

The council pattern mitigates these risks by requiring **independent generation** from models with **decorrelated training data**, followed by **cross-review** and **chairman synthesis** with explicit disagreement flagging.

### Analogy

Like a clinical case conference: three nephrologists independently review the chart, then discuss disagreements before the attending signs the note.

---

## 2. Council Members

| Role | Model | Provider | Access Method | Strengths |
|------|-------|----------|---------------|-----------|
| **Generator + Reviewer** | Gemini 3.1 Pro | Google | Native Vertex AI | Large context window, strong reasoning, native GCP integration |
| **Generator + Reviewer + Chairman** | Claude Sonnet 4.6 | Anthropic | Claude for Healthcare on Vertex AI | FedRAMP High, healthcare fine-tuning, nuanced clinical reasoning, best at synthesis |
| **Generator + Reviewer** | Mistral Medium 3 | Mistral | Vertex AI Model Garden | Different training corpus (French/European), strong medical knowledge, decorrelates US-centric biases |

### Why These Three?

- **Decorrelated errors**: Different architectures, different training data, different fine-tuning approaches. When all three agree, confidence is high. When they disagree, the disagreement itself is valuable clinical signal.
- **Single platform**: All accessible via Vertex AI — one billing account, one BAA, one audit surface.
- **Claude as Chairman**: Best at structured synthesis, following complex instructions, and producing balanced output. Healthcare-specific fine-tuning reinforces clinical accuracy.

---

## 3. Council Pipeline

### Full Pipeline (6 Steps)

```
┌─────────────────────────────────────────────────────────────────┐
│                    COUNCIL PIPELINE                               │
│                                                                  │
│  INPUT                                                           │
│  ├── Finalized transcript (with speaker labels)                 │
│  ├── Extracted entities (symptoms, findings, meds, labs)         │
│  ├── EPIC data (parsed paste + screenshots)                     │
│  ├── RAG context (guidelines, prior notes, protocols)           │
│  ├── Patient context (census data, active domains, day count)   │
│  └── Note type (consult H&P, progress, critical care, etc.)    │
│                                                                  │
│  STEP 1: PARALLEL GENERATION (~8-12 seconds)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Gemini   │  │ Claude   │  │ Mistral  │                      │
│  │ 3.1 Pro  │  │ Sonnet   │  │ Medium 3 │                      │
│  │          │  │ 4.6      │  │          │                      │
│  │ Note A   │  │ Note B   │  │ Note C   │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│       │              │              │                            │
│  STEP 2: PARALLEL CROSS-REVIEW (~6-8 seconds)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Gemini   │  │ Claude   │  │ Mistral  │                      │
│  │ reviews  │  │ reviews  │  │ reviews  │                      │
│  │ B and C  │  │ A and C  │  │ A and B  │                      │
│  │          │  │          │  │          │                      │
│  │ Ranks +  │  │ Ranks +  │  │ Ranks +  │                      │
│  │ critiques│  │ critiques│  │ critiques│                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│       │              │              │                            │
│  STEP 3: CHAIRMAN SYNTHESIS (~6-10 seconds)                     │
│  ┌──────────────────────────────────────────────┐               │
│  │              Claude Sonnet 4.6                │               │
│  │              (Chairman)                        │               │
│  │                                                │               │
│  │  Inputs:                                       │               │
│  │  - All 3 generated notes (A, B, C)            │               │
│  │  - All 3 cross-reviews                         │               │
│  │  - Original transcript + entities              │               │
│  │  - RAG context                                 │               │
│  │                                                │               │
│  │  Outputs:                                      │               │
│  │  - Final synthesized note                      │               │
│  │  - Per-section confidence scores               │               │
│  │  - Disagreement flags + all 3 opinions         │               │
│  │  - High-risk field verification status         │               │
│  │  - Transcript traceability links               │               │
│  └──────────────────────────────────────────────┘               │
│                                                                  │
│  OUTPUT                                                          │
│  ├── Final clinical note (structured by domain)                 │
│  ├── Confidence scores: 🟢 High / 🟡 Medium / 🔴 Low           │
│  ├── Disagreement annotations (all 3 opinions preserved)        │
│  ├── Source provenance (lab-verified, transcript, EPIC paste)   │
│  └── Billing code suggestion with evidence links                │
│                                                                  │
│  TOTAL LATENCY: ~20-35 seconds                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Council Tiering

Not every note needs the full 3-model council. Tiering reduces cost and latency for routine notes.

### Tier Definitions

| Tier | Models | Latency | Cost/Note | Use When |
|------|--------|---------|-----------|----------|
| **Full Council** | All 3 + Chairman | ~25-35s | ~$0.80-1.20 | New consults, complex patients, ICU, multiple active domains, procedures with complications |
| **Quick Council** | 2 models + Chairman | ~15-20s | ~$0.50-0.70 | Standard daily progress notes, single-domain encounters, stable patients |
| **Single Model** | Claude Sonnet 4.6 only | ~8-12s | ~$0.15-0.25 | Templated procedure notes, straightforward encounters, addenda |

### Tier Selection Logic

```python
def select_council_tier(encounter: Encounter) -> CouncilTier:
    # Full council triggers
    if encounter.is_new_consult:
        return CouncilTier.FULL
    if encounter.active_domain_count >= 4:
        return CouncilTier.FULL
    if encounter.is_icu:
        return CouncilTier.FULL
    if encounter.note_type in ["critical_care", "consult_hp"]:
        return CouncilTier.FULL
    if encounter.has_procedure_complications:
        return CouncilTier.FULL
    if encounter.acuity_score >= 8:  # out of 10
        return CouncilTier.FULL
    
    # Quick council triggers
    if encounter.active_domain_count >= 2:
        return CouncilTier.QUICK
    if encounter.note_type == "progress_note":
        return CouncilTier.QUICK
    
    # Single model for simple cases
    if encounter.note_type in ["procedure_note", "addendum"]:
        return CouncilTier.SINGLE
    if encounter.active_domain_count == 1 and encounter.acuity_score <= 3:
        return CouncilTier.SINGLE
    
    # Default to quick
    return CouncilTier.QUICK
```

### Monthly Cost Estimate by Tier Mix

```
Assumption: 15 patients/day × 25 days = 375 notes/month

Estimated tier distribution:
  Full council:   30% = 112 notes × $1.00 = $112
  Quick council:  50% = 188 notes × $0.60 = $113
  Single model:   20% = 75 notes  × $0.20 = $15
  
  Subtotal generation: ~$240/month
  
  + Council overhead (cross-review tokens): ~$460-740/month
  
  TOTAL: ~$700-980/month
```

---

## 5. Confidence Scoring

### Per-Section Confidence Levels

| Level | Icon | Meaning | UI Behavior |
|-------|------|---------|-------------|
| 🟢 **High** | Green circle | All 3 models agree. Data grounded in labs/transcript. | Accept with one click. |
| 🟡 **Medium** | Yellow circle | Minor differences between models. Or partial grounding. | Review recommended. Differences highlighted. |
| 🔴 **Low** | Red circle | Models disagree significantly. Or data not grounded. | Review required. All 3 opinions shown. Cannot auto-accept. |

### Confidence Calculation

```python
def calculate_section_confidence(
    notes: list[GeneratedNote],  # 3 notes from council
    reviews: list[CrossReview],   # 3 cross-reviews
    section_id: str
) -> ConfidenceLevel:
    
    # Extract section content from each note
    sections = [note.get_section(section_id) for note in notes]
    
    # Semantic similarity between all 3 versions
    similarity_scores = pairwise_semantic_similarity(sections)
    avg_similarity = mean(similarity_scores)
    
    # Cross-review agreement (did reviewers flag issues?)
    review_flags = count_flags_for_section(reviews, section_id)
    
    # Data grounding score (are claims backed by labs/transcript?)
    grounding_score = calculate_grounding(sections, source_data)
    
    # High-risk field verification
    has_unverified_high_risk = check_high_risk_fields(sections, verified_labs)
    
    # Scoring
    if avg_similarity > 0.9 and review_flags == 0 and grounding_score > 0.8 and not has_unverified_high_risk:
        return ConfidenceLevel.HIGH  # 🟢
    elif avg_similarity > 0.7 and review_flags <= 1 and grounding_score > 0.5:
        return ConfidenceLevel.MEDIUM  # 🟡
    else:
        return ConfidenceLevel.LOW  # 🔴
```

### High-Risk Fields (Always Require Provenance)

These fields must be traced to a verified source. If source is transcript-only (not lab-verified), they are flagged:

| Field Type | Examples | Acceptable Source |
|------------|----------|-------------------|
| **Lab values** | Creatinine, potassium, sodium, hemoglobin | Lab system (EPIC paste) — gold standard |
| **Medication doses** | Heparin dose, Lasix dose, tacrolimus level | EPIC med list or pharmacy verification |
| **Dialysis parameters** | Blood flow, UF goal, dialysate composition | Order verification or procedure note |
| **Access details** | Catheter type, site, date inserted | Prior procedure note or verified record |
| **Anticoagulation** | Type, dose, protocol | EPIC order or verified |

If a high-risk field value comes only from transcript (provider mentioned it verbally), it's tagged:
```
Cr: 2.4 ◀ Lab (verified) ✅
K: 4.8 ◀ Transcript 5:15 ⚠️ (not yet lab-verified)
```

---

## 6. Disagreement Handling

### When Models Disagree

When the chairman detects significant disagreement between models, the disagreement is preserved and surfaced to the provider:

```json
{
  "section": "aki_assessment",
  "chairman_synthesis": "AKI Stage 2 → 1, improving. Etiology: prerenal (sepsis-related ATN with superimposed prerenal component). Recommend monitoring 48h before confirming HD not needed.",
  "confidence": "medium",
  "disagreement": {
    "topic": "HD recommendation",
    "gemini": "ATN resolving, likely no further HD needed",
    "claude": "ATN resolving, recommend one more BMP before confirming no HD needed",
    "mistral": "Prerenal + ATN overlap, monitor 48h before HD decision",
    "chairman_rationale": "Included all perspectives. The 48h monitoring recommendation from Mistral is most conservative and clinically prudent. Flagged for human decision on HD hold duration."
  }
}
```

### Disagreement Categories

| Category | Description | UI Treatment |
|----------|-------------|--------------|
| **Clinical interpretation** | Models read same data differently | Show all 3 interpretations, chairman picks most defensible |
| **Plan recommendation** | Models suggest different actions | Show all options, flag for provider decision |
| **Severity assessment** | Models differ on acuity/staging | Show range, default to most conservative |
| **Missing data** | One model notes something others missed | Include it, mark as "noted by [model]" |
| **Billing level** | Models suggest different E/M codes | Show all with justification, provider decides |

---

## 7. Prompt Architecture

### Generation Prompt Template (Step 1)

Each model receives the same structured prompt:

```markdown
# Clinical Note Generation

You are a board-certified nephrologist writing a {note_type} for a hospital inpatient.

## Patient Context
- Name: {patient_name} (MRN: {mrn})
- Age: {age} | Sex: {sex}
- Admission Day: {day_count}
- Active Domains: {active_domains}
- Consult Reason: {consult_reason}

## Source Data

### Transcript (Today's Encounter)
{transcript_with_timestamps}

### Extracted Entities
{structured_entities_json}

### EPIC Data (Parsed)
{epic_labs}
{epic_vitals}
{epic_meds}
{epic_notes}

### Prior Notes (Last 3 Days)
{prior_notes_summary}

### Relevant Guidelines (RAG)
{rag_context}

## Instructions

1. Write a complete {note_type} organized by active clinical domains.
2. For each domain, provide:
   - Assessment (what's happening, trajectory)
   - Plan (numbered, specific, actionable items)
3. Every clinical claim MUST be traceable:
   - Lab values: cite "Lab (date/time)"
   - Exam findings: cite "Exam" or "Transcript (timestamp)"
   - Patient-reported: cite "Patient report (timestamp)"
   - Prior record: cite "Prior note (date)"
4. Flag any data you are uncertain about with [UNCERTAIN].
5. Do NOT fabricate any lab values, vital signs, or clinical findings.
6. If information is missing, explicitly state "Not documented" rather than guessing.
7. Use precise medical terminology consistent with KDIGO, AHA/ACC, ASFA guidelines.
8. For billing: document complexity clearly (number of problems, data reviewed, risk).

## Output Format

{note_format_template}
```

### Cross-Review Prompt Template (Step 2)

```markdown
# Clinical Note Peer Review

You are reviewing clinical notes written by two other physicians for the same encounter.

## Original Source Data
{same_source_data_as_generation}

## Note to Review #1
{note_from_model_X}

## Note to Review #2
{note_from_model_Y}

## Review Instructions

For each note, evaluate:

1. **Accuracy**: Are all clinical facts correct and traceable to source data?
2. **Completeness**: Are any important findings or plan items missing?
3. **Hallucination Check**: Is anything stated that is NOT in the source data?
4. **Clinical Reasoning**: Is the assessment logically sound?
5. **Plan Appropriateness**: Are plan items specific, actionable, and evidence-based?
6. **Billing Support**: Does the documentation support the complexity of care?

## Output Format

For each note, provide:
- Overall quality score (1-10)
- Specific issues found (with evidence)
- Missing elements
- Hallucination flags (critical — cite the specific fabrication)
- Recommended improvements
- Ranking: Which note is better and why
```

### Chairman Synthesis Prompt Template (Step 3)

```markdown
# Chairman Synthesis

You are the senior attending synthesizing the final clinical note from a case conference.

## Three Generated Notes
{note_A} (by Gemini)
{note_B} (by Claude)  
{note_C} (by Mistral)

## Three Cross-Reviews
{review_by_gemini} (reviewed B and C)
{review_by_claude} (reviewed A and C)
{review_by_mistral} (reviewed A and B)

## Original Source Data
{all_source_data}

## Synthesis Instructions

1. Create the FINAL note by selecting the best content from all three notes.
2. Where all three agree: Use the best-written version. Confidence = HIGH.
3. Where two agree and one differs: Use the majority view, but note the dissent if clinically relevant. Confidence = MEDIUM.
4. Where all three differ: Include the most conservative/defensible interpretation. Flag for human review. Confidence = LOW.
5. NEVER include content flagged as hallucination by any reviewer.
6. Preserve source citations from the original notes.
7. For each section, output a confidence score and any disagreement annotations.
8. For high-risk fields (labs, meds, doses, access), verify against source data directly.
9. Suggest billing code with transcript-linked justification.

## Output Format

{structured_note_with_metadata}
```

---

## 8. Streaming & Progress

### User Experience During Generation

The council pipeline takes 20-35 seconds. Users see real-time progress:

```
Step 1: Transcription finalized ✅        (0s)
Step 2: Entity extraction complete ✅     (2s)
Step 3: RAG context retrieved ✅          (4s)
Step 4: Council generating...              (4-16s)
  ├── Gemini 3.1 Pro: generating... → complete ✅
  ├── Claude Sonnet 4.6: generating... → complete ✅
  └── Mistral Medium 3: generating... → complete ✅
Step 5: Cross-review in progress...        (16-24s)
  ├── Gemini reviewing... → complete ✅
  ├── Claude reviewing... → complete ✅
  └── Mistral reviewing... → complete ✅
Step 6: Chairman synthesizing...           (24-35s)
  └── Streaming preview...
```

### Streaming Preview

During chairman synthesis (Step 6), the note streams section-by-section via WebSocket/SSE. The provider can begin reading the first sections while later sections are still generating.

---

## 9. Fallback & Degradation

| Failure | Fallback | User Impact |
|---------|----------|-------------|
| One model times out | Proceed with 2-model council | Slightly lower confidence, note still generated |
| Two models time out | Single-model generation (use whichever responded) | Flagged as "Single model — not council reviewed" |
| All models time out | Queue for retry, offer manual dictation | Provider must dictate or wait |
| RAG Engine down | Generate without RAG context | Missing guideline grounding, flagged |
| Chairman times out | Return best-ranked note from cross-review | No synthesis, but still multi-model reviewed |

### Retry Logic

```python
MAX_RETRIES = 2
GENERATION_TIMEOUT = 30  # seconds per model
REVIEW_TIMEOUT = 20      # seconds per review
CHAIRMAN_TIMEOUT = 30    # seconds for synthesis

# Exponential backoff with jitter
retry_delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
```

---

## 10. Quality Feedback Loop

### Provider Feedback Collection

Every note review captures implicit and explicit signals:

| Signal | Type | Data Collected |
|--------|------|---------------|
| **Accept without edit** | Implicit positive | Section was accurate |
| **Edit content** | Implicit negative | Diff between AI and final version |
| **Flag section** | Explicit negative | Provider marks section as problematic |
| **Change billing code** | Explicit | AI suggestion was wrong |
| **Council disagreement resolution** | Explicit | Which model's view the provider agreed with |

### Feedback Storage

```json
{
  "note_id": "uuid",
  "section_id": "aki_assessment",
  "feedback_type": "edit",
  "original_content": "AKI Stage 2, prerenal...",
  "final_content": "AKI Stage 2 → 1, mixed prerenal and intrinsic (ATN)...",
  "diff": "...",
  "provider_id": "uuid",
  "timestamp": "2026-03-04T09:15:00Z",
  "council_tier": "full",
  "models_that_got_it_right": ["mistral"],
  "models_that_got_it_wrong": ["gemini", "claude"]
}
```

### Future: Fine-Tuning Loop

Over time, collected feedback can be used to:
1. Adjust council prompt templates
2. Tune confidence scoring thresholds
3. Improve entity extraction accuracy
4. Build TKE-specific note style preferences
5. Identify which model performs best for which domain

---

## 11. Cost Breakdown

### Per-Note Token Estimates

| Step | Input Tokens | Output Tokens | Models |
|------|-------------|---------------|--------|
| Generation | ~8,000 each | ~2,000 each | 3 models |
| Cross-Review | ~12,000 each | ~1,000 each | 3 models |
| Chairman Synthesis | ~25,000 | ~3,000 | 1 model (Claude) |

### Per-Note Cost (Full Council)

```
Generation:
  Gemini 3.1 Pro:    8K in × $0.00125/1K + 2K out × $0.005/1K = $0.02
  Claude Sonnet 4.6: 8K in × $0.003/1K   + 2K out × $0.015/1K = $0.054
  Mistral Medium 3:  8K in × $0.002/1K   + 2K out × $0.006/1K = $0.028
  Subtotal: ~$0.10

Cross-Review:
  Gemini:  12K in + 1K out = ~$0.02
  Claude:  12K in + 1K out = ~$0.051
  Mistral: 12K in + 1K out = ~$0.030
  Subtotal: ~$0.10

Chairman Synthesis:
  Claude:  25K in + 3K out = ~$0.12

TOTAL PER NOTE (Full Council): ~$0.32

At 375 notes/month with tier mix:
  Full (30%):   112 × $0.32 = $36
  Quick (50%):  188 × $0.20 = $38
  Single (20%): 75  × $0.08 = $6
  
  Subtotal: ~$80/month for generation
  
  Note: Pricing is approximate and will vary with actual model pricing.
  The $700-980 estimate includes overhead for RAG queries, retries,
  longer transcripts, and pricing margin.
```

---

## 12. Open Questions

1. **Note output format** — Awaiting hospital note templates from Dr. Mulay to finalize the structured output format
2. **Council prompt tuning** — Will need iterative refinement once real hospital transcripts are available
3. **Model version pinning** — Should we pin to specific model versions or use "latest"? Pinning is safer but requires manual updates.
4. **Billing code validation** — Should the council suggest billing codes, or should a separate specialized model handle billing?
5. **Multi-language support** — When Spanish encounters begin, do all 3 models handle es-US equally well?
