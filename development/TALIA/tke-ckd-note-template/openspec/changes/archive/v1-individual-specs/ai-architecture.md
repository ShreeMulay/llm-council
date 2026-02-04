# AI Architecture Specification

## Status: APPROVED
## Version: 1.0

---

## Overview

Orchestrator + specialized sub-agents model. Start with 6-10 agents, expand to 15-20 as system matures. Every agent output must be traceable to source data and never invent facts.

## Three-Phase Encounter Model

### Phase 1: Pre-Visit (Automated)

```
TRIGGER: Appointment scheduled (T-24h or on-demand)

1. Pull last note (all 37 sections)
2. Pull latest labs → populate lab fields
3. Pull medication list → populate therapy sections
4. Pull vitals (weight, BP) → populate vital fields
5. Calculate derived values:
   - eGFR slope
   - KFRE 2yr/5yr
   - KDIGO risk category (G + A staging)
   - GDMT compliance (X/4 pillars)
   - Albuminuria stage
   - Corrected calcium
   - BUN:Cr ratio
6. Identify care gaps (overdue labs, missing screenings, med gaps)
7. Generate "Pre-Visit Brief" for provider
8. Template ready with pre-populated fields
```

### Phase 2: During Visit (Human + AI)

```
PARALLEL INPUTS:
├── Virtual scribe (transcription → structured extraction)
├── MA fills physical cards → OCR scan → field updates
├── MA enters vitals, screening results (grip, STS, PHQ-2)
├── Provider marks decisions on cards / digital interface
└── Real-time: medication safety agent monitors for alerts

REAL-TIME ALERTS:
├── Triple Whammy detection
├── Critical lab values
├── Drug interaction warnings
└── Care gap reminders
```

### Phase 3: Post-Visit (AI Generation)

```
1. All sub-agents generate interpretations (in parallel)
2. Orchestrator assembles complete note
3. Apply view mode (Initial vs Follow-up)
4. Apply progressive disclosure (collapse stable sections)
5. Generate three outputs:
   ├── Provider note (billing/legal/clinical)
   ├── Patient-facing summary (plain language, action list, targets)
   └── Care team task list (labs due, referrals, education)
6. Provider reviews → edits → signs
7. Update quality metrics dashboard
8. Update longitudinal patient record
```

## Agent Inventory (Phase 1: 8 Core Agents)

| # | Agent | Domains Covered | Guidelines |
|---|-------|----------------|------------|
| 1 | **Orchestrator** | All (traffic control, assembly, conflict resolution) | - |
| 2 | **kidney_function_agent** | Kidney Core (eGFR, proteinuria, KFRE, stones, hematuria, GU) | KDIGO 2024 CKD |
| 3 | **bp_fluid_agent** | BP & Fluid, Furoscix, Daxor | KDIGO BP, SPRINT |
| 4 | **heart_failure_agent** | Heart Failure, GDMT, CRS | AHA/ACC HF |
| 5 | **pharmacotherapy_agent** | 4 Pillars (RAAS, SGLT2i, MRA, GLP-1), Lipids | KDIGO 2024, CREDENCE, DAPA-CKD, FIDELIO, FLOW |
| 6 | **complications_agent** | Anemia, MBD, Electrolytes, Gout, Diabetes, Obesity | KDIGO Anemia/MBD, ADA |
| 7 | **medication_safety_agent** | Risk Mitigation (NSAIDs, PPIs, Sick Day, Contrast), Adherence, Triple Whammy | Cross-cutting |
| 8 | **planning_screening_agent** | Transplant, Dialysis, ACP, CCM, Immunizations, PHQ, Falls, Sleep, SDOH, Performance | KDIGO Transplant, EWGSOP2 |

## Agent Expansion (Phase 2: 12-15 Specialized Agents)

When volume and complexity justify, split:
- `pharmacotherapy_agent` → separate RAAS, SGLT2i, MRA, GLP-1 agents
- `complications_agent` → separate anemia, MBD, electrolytes agents
- `planning_screening_agent` → separate transplant, physical performance agents
- Add `nutrition_agent` for dietary assessment
- Add `scribe_agent` for transcription extraction
- Add `cv_risk_agent` for lipids/statin/PCSK9i

## Agent Design Pattern

```typescript
interface AgentConfig {
  agent_id: string;
  display_name: string;
  sections_owned: string[];        // section_ids from registry
  guidelines: string[];            // clinical guideline references
  system_prompt: string;           // base clinical persona
  interpretation_template: string; // output format
  alert_rules: AlertRule[];        // cross-cutting safety checks
  confidence_threshold: number;    // below this, flag for human review
}

interface AgentInput {
  section_data: Record<string, FieldValue>;  // current discrete values
  previous_section_data: Record<string, FieldValue>;  // last visit
  patient_context: PatientContext;  // demographics, stage, comorbidities
  encounter_context: EncounterContext;  // visit type, reason, transcription
}

interface AgentOutput {
  interpretation: string;          // clinical narrative paragraph
  action_items: ActionItem[];      // medication changes, orders, referrals
  patient_education: string;       // plain language summary
  alerts: Alert[];                 // safety warnings
  confidence: number;              // 0-1
  citations: Citation[];           // source data references
}
```

## View Modes

### Initial Visit Mode
- All sections expanded
- History/etiology sections prominent
- Full workup fields visible
- AI generates comprehensive baseline narrative

### Follow-Up Mode (Delta Mode)
- Only changed/abnormal/active sections expanded
- Stable sections collapsed: "Anemia: at goal (Hb 11.2), no change"
- AI generates interval change narrative
- Care gaps highlighted

## Note Output Contract

### Follow-Up Note Length Budget
- Dashboard summary: 5-8 lines
- Active domains: 2-4 sentences each
- Stable domains: 1 line each ("Reviewed, stable, continue current management")
- Assessment & Plan: <=1.5 pages for most follow-ups

### Initial Visit Note Length Budget
- No strict limit but structured by domain
- Each domain generates its own A&P section
- History sections may be longer

## Safety Guardrails

1. AI never invents lab values - must cite source + date
2. AI never recommends medications without provider confirmation
3. All interpretations include confidence score
4. Below-threshold confidence triggers "REVIEW NEEDED" flag
5. Medication safety alerts cannot be dismissed without reason
6. All AI outputs logged with version, timestamp, model used
7. Human signature required before any note is finalized
