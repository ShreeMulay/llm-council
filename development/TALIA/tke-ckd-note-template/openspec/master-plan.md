# TKE CKD Note Template - AI-Era Rebuild: Master Plan

## Status: APPROVED
## Version: 2.0
## Date: 2026-02-02
## Owner: Shree Mulay, MD
## Practice: The Kidney Experts, PLLC (TKE)
## EHR: CKD EHR by DaVita (DVA CKD) - Epic-based

---

> **"Ridding the World of the Need for Dialysis!"**
>
> Comprehensive structured documentation enables systematic tracking of every intervention that slows CKD progression.

---

# TABLE OF CONTENTS

1. [Part 1: Vision & Principles](#part-1-vision--principles)
2. [Part 2: Architecture Overview](#part-2-architecture-overview)
3. [Part 3: Domain Structure](#part-3-domain-structure-9-domains-37-sections)
4. [Part 4: Complete Section Registry](#part-4-complete-section-registry)
5. [Part 5: Card Inventory](#part-5-card-inventory-42-clinical--3-workflow)
6. [Part 6: AI Architecture](#part-6-ai-architecture)
7. [Part 7: Epic Integration & SmartPhrase Migration](#part-7-epic-integration--smartphrase-migration)
8. [Part 8: Renal Performance Clinic](#part-8-renal-performance-clinic)
9. [Part 9: Fax Manager Cross-Reference](#part-9-fax-manager-cross-reference)
10. [Part 10: Implementation Phases](#part-10-implementation-phases-0-9)
11. [Part 11: Council Review Summary](#part-11-council-review-summary)
12. [Part 12: Tech Stack & Conventions](#part-12-tech-stack--conventions)
13. [Appendix A: Existing Card Files](#appendix-a-existing-card-files)
14. [Appendix B: Glossary](#appendix-b-glossary)
15. [Appendix C: Clinical Evidence Base](#appendix-c-clinical-evidence-base)

---

# Part 1: Vision & Principles

## The Problem

The current CKD clinic note (`@ED@` smart phrase) is a manually-filled template with ~25 `***` fields, SmartList dropdowns, and free-text paragraphs. It produces unstructured narrative text that cannot be queried, analyzed, or automated. Physical report cards exist but are disconnected from the note. No AI integration. No structured data extraction. Same template serves initial and follow-up visits with no adaptive behavior.

## The Vision

Rebuild the CKD clinic note into an **AI-era documentation system** where physical report cards, digital structured data, the clinic note, and AI agents are all expressions of the **same underlying data model**.

**One section registry rules everything.** Adding a new clinical topic means adding it to one registry; it propagates to cards, note, digital, AI, and report card automatically.

## Six Core Principles

1. **One Registry, One Truth** - The section registry JSON is the single source of truth. Every artifact (cards, note, digital UI, AI agents, report card, quality metrics) derives from it.

2. **Every Section Follows the Same Pattern**:
   ```
   Discrete Fields -> AI Interpretation -> Action Items -> Patient Education
   ```

3. **Data Can Enter from Any Source** - Labs API, fax manager, human entry, OCR scan, transcription, previous note. The system is agnostic to input method.

4. **AI Generates, Humans Validate** - AI pre-populates and interprets; the provider reviews, edits, and signs. AI never finalizes a note without human approval.

5. **Same Template, Two View Modes** - Initial visit and follow-up use the same schema. Sections expand/collapse based on what's relevant. Follow-up uses "Delta Mode" (only show changes).

6. **Three Outputs from One Data Model**:
   - **Provider note** (billing/legal/clinical) - the Epic note
   - **Patient-facing summary** (plain language, action list, targets) - the take-home document
   - **Care team task list** (labs due, referrals, education modules) - for CCM/care coordination

## Current State vs Target State

| Metric | Current | Target |
|--------|---------|--------|
| Time to complete note (follow-up) | 5-10 min | <2 min (with AI pre-pop) |
| Time to complete note (initial) | 15-20 min | <5 min (with AI pre-pop) |
| Manual data entry fields | ~25 `***` fields | <5 (exception-only) |
| Structured data extraction | 0% | 100% of discrete fields |
| GDMT compliance tracking | Manual review | Automated per-visit |
| Report card alignment | Partial | 1:1 with note |
| Quality metric extraction | Manual chart review | Automated from schema |
| AI interpretation | None | Per-section, per-visit |
| Physical performance tracking | None | Every visit (Tier 1) |
| Care gap detection | Manual | Automated pre-visit |

---

# Part 2: Architecture Overview

## Unified Data Flow

```
PHYSICAL CARD          DIGITAL SCHEMA         EPIC NOTE SECTION        AI AGENT
(MA marks circles)  ->  (structured JSON)   ->  (formatted text)     ->  (interpretation)
     ^                       ^                      ^                      ^
     |__ Human fills ________|__ API/Fax fills _____|__ Transcription _____|
```

## Per-Section Design Pattern

| Layer | What It Is | Who/What Fills It |
|-------|-----------|-------------------|
| **Discrete Fields** | Raw values (numbers, enums, dates) | Labs API, fax manager, human entry, OCR scan |
| **AI Interpretation** | Clinical assessment paragraph | AI sub-agent (domain-specialized) |
| **Action Items** | Medication changes, orders, referrals | Provider (with AI suggestions) |
| **Patient Education** | Plain-language summary | AI generates from interpretation |

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

---

# Part 3: Domain Structure (9 Domains, 37 Sections)

## Summary

| Domain | Color | Hex | Sections | Count | Cards |
|--------|-------|-----|----------|-------|-------|
| 0. Header & Visit Context | - | - | 0 | 1 | - |
| 1. Kidney Core | Blue | #3B82F6 | 1-4 | 4 | 8 |
| 2. Cardiovascular-Renal | Red | #EF4444 | 5-7 | 3 | 4 |
| 3. Pharmacotherapy (4 Pillars) | Purple | #8B5CF6 | 8-11 | 4 | 4 |
| 4. Metabolic | Orange | #F97316 | 12-14 | 3 | 3 |
| 5. CKD Complications | Dark Blue | #1E40AF | 15-17 | 3 | 3 |
| 6. Risk Mitigation | Green | #22C55E | 18-23 | 6 | 6 |
| 7. Planning & Transitions | Gray | #6B7280 | 24-27 | 4 | 4 |
| 8. Screening & Prevention | Teal | #14B8A6 | 28-34 | 7 | 8 |
| 9. Care Coordination | Pink | #EC4899 | 35-37 | 3 | 2 |
| **Cross-cutting** | - | - | - | - | 1 alert |
| **TOTAL** | | | | **37+1** | **42** |

## Section Quick Reference

| # | Section Name | Domain | Card(s) | Mode | Agent |
|---|-------------|--------|---------|------|-------|
| 0 | Header & Visit Context | Header | - | always | orchestrator |
| 1 | Kidney Function & Progression | Kidney Core | TKE-PROT, TKE-KFRE, TKE-RNLX, TKE-RNAS, TKE-BIOP | always | kidney_function_agent |
| 2 | Hematuria | Kidney Core | TKE-HEMA | conditional | kidney_function_agent |
| 3 | Kidney Stones | Kidney Core | TKE-STONE | conditional | kidney_function_agent |
| 4 | GU History | Kidney Core | TKE-GU | conditional | general_ckd_agent |
| 5 | Blood Pressure & Fluid | CV-Renal | TKE-BPFL, TKE-DAXR | always | bp_fluid_agent |
| 6 | Heart Failure | CV-Renal | TKE-HF | conditional (HF) | heart_failure_agent |
| 7 | Lipid Therapy | CV-Renal | TKE-STAT | always | cv_risk_agent |
| 8 | RAAS Inhibition | 4 Pillars | TKE-RAAS | always | pharmacotherapy_agent |
| 9 | SGLT2 Inhibitor | 4 Pillars | TKE-SGLT | always | pharmacotherapy_agent |
| 10 | MRA (Finerenone) | 4 Pillars | TKE-FINE | always | pharmacotherapy_agent |
| 11 | GLP-1 Receptor Agonist | 4 Pillars | TKE-GLP1 | always | pharmacotherapy_agent |
| 12 | Diabetes Management | Metabolic | TKE-DM | conditional (DM) | complications_agent |
| 13 | Gout | Metabolic | TKE-GOUT | conditional | complications_agent |
| 14 | Obesity / Weight Mgmt | Metabolic | TKE-OBES | conditional (BMI>=30) | complications_agent |
| 15 | Anemia / Blood Health | CKD Complications | TKE-ANEM | always | complications_agent |
| 16 | Mineral Bone Disease | CKD Complications | TKE-MBD | always (G3+) | complications_agent |
| 17 | Electrolytes & Acid-Base | CKD Complications | TKE-ELEC | always | complications_agent |
| 18 | Tobacco / Substance Use | Risk Mitigation | TKE-SMOK | always | medication_safety_agent |
| 19 | NSAID Avoidance | Risk Mitigation | TKE-NSAI | always | medication_safety_agent |
| 20 | PPI Review | Risk Mitigation | TKE-PPI | always | medication_safety_agent |
| 21 | Sick Day Rules | Risk Mitigation | TKE-SICK | conditional | medication_safety_agent |
| 22 | Contrast Precautions | Risk Mitigation | TKE-CONT | conditional | medication_safety_agent |
| 23 | Sodium Restriction | Risk Mitigation | TKE-SODM | always | nutrition_agent |
| 24 | Transplant Readiness | Planning | TKE-TXPL | conditional (G4+) | planning_screening_agent |
| 25 | Dialysis Planning / Vascular Access | Planning | TKE-DIAL | conditional (G4+) | planning_screening_agent |
| 26 | Advance Care Planning | Planning | TKE-ACP | conditional (G4+/age>75) | planning_screening_agent |
| 27 | CCM Enrollment | Planning | TKE-CCM | always (G3+) | planning_screening_agent |
| 28 | Immunizations | Screening | TKE-VACC | always | planning_screening_agent |
| 29 | Depression Screen (PHQ-2/9) | Screening | TKE-PHQ | always (annual) | planning_screening_agent |
| 30 | Fall Risk Assessment | Screening | TKE-FALL | conditional (age>65) | physical_performance_agent |
| 31 | Sleep Apnea | Screening | TKE-SLAP | conditional | planning_screening_agent |
| 32 | SDOH Assessment | Screening | TKE-SDOH | conditional (initial+annual) | planning_screening_agent |
| 33 | Physical Performance & Frailty | Screening | TKE-GRIP, TKE-FUNC | always (Tier 1) | physical_performance_agent |
| 34 | Nutrition / Dietary Assessment | Screening | TKE-NUTR | always | nutrition_agent |
| 35 | Medication Adherence & Barriers | Care Coordination | - (note-only) | always | medication_safety_agent |
| 36 | Special Clinics | Care Coordination | TKE-CRM, TKE-LONG | conditional | general_ckd_agent |
| 37 | PCP / Care Team / Follow-Up | Care Coordination | - (note-only) | always | general_ckd_agent |

---

# Part 4: Complete Section Registry

## Schema Pattern (Every Section)

```
Section {
  section_id: string           // snake_case unique ID
  display_name: string         // Human-readable name
  domain_group: enum           // One of 9 domains
  domain_color: string         // Hex color for domain
  card_codes: string[]         // Physical card(s) feeding this section
  visit_mode: enum             // "always" | "initial_only" | "conditional"
  condition: string?           // When to show (e.g., "ckd_stage >= G3b")
  fields: Field[]              // Discrete data fields
  ai_agent: string             // Agent responsible for interpretation
  interpretation_prompt: string // What the AI generates
  smart_phrase_legacy: string?  // Original SmartList IDs (migration)
  version: string
}

Field {
  field_id: string             // snake_case within section
  display_name: string
  type: enum                   // number | enum | text | date | boolean | calculated
  unit: string?                // mg/dL, mmHg, etc.
  source: enum[]               // labs_api | med_list | vitals | provider | patient | calculated | previous_note | fax_manager | ocr_scan | transcription
  target_range: string?        // e.g., "<130/80", ">= 22 mEq/L"
  required: boolean
  enum_values: string[]?       // For enum type
}
```

---

## Section 0: Header & Visit Context

**Domain**: Header | **Card**: None (note-only) | **Mode**: always

| Field | Type | Unit | Source | Target | Legacy SmartList |
|-------|------|------|--------|--------|-----------------|
| visit_type | enum: New/Follow-up/Urgent/Telehealth | - | staff | - | `@ED@` |
| reason_for_visit | text | - | staff/transcription | - | `{here for:27012}` |
| follow_up_interval | text | - | previous_note | - | `{Follow Up:27013}` |
| companions | text | - | staff | - | `{TKE Who:27081}` |
| weight | number | lbs | vitals | - | `@LASTENCWT@` |
| bmi | number | kg/m2 | calculated | - | `@LASTENCBMI@` |
| weight_trend | text | - | calculated | - | NEW |
| lab_date | date | - | labs_api | - | "labs from ***" |
| ckd_stage | enum: G1/G2/G3a/G3b/G4/G5/G5D/Transplant | - | calculated | - | "CKD Stage ***" |
| ckd_etiology | text | - | provider | - | `{CKD ETIOLOGY:27079}` |
| pathology_confirmation | enum: suspected/biopsy_confirmed | - | provider | - | `{suspected/biopsy confirmed:27058}` |
| albuminuria_stage | enum: A1/A2/A3 | - | calculated | - | NEW |
| kdigo_risk_category | enum: Low/Moderate/High/Very_High | - | calculated | - | NEW |
| gdmt_compliance | text | - | calculated | - | NEW (e.g., "3/4 pillars") |
| ccm_status | enum | - | coordinator | - | `{CCM Status:27080}` |

---

## DOMAIN 1: KIDNEY CORE (Blue #3B82F6)

### Section 1: Kidney Function & Progression

**Card**: TKE-PROT, TKE-KFRE, TKE-RNLX, TKE-RNAS, TKE-BIOP | **Mode**: always | **Agent**: kidney_function_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| egfr_current | number | mL/min/1.73m2 | labs_api | Stage-dependent | - |
| egfr_previous | number | mL/min/1.73m2 | previous_note | - | "GFR has gone from *** to ***" |
| egfr_trend | enum: stable/improving/declining | - | calculated | stable/improving | NEW |
| egfr_slope | number | mL/min/year | calculated | > -3 | NEW |
| creatinine | number | mg/dL | labs_api | - | - |
| bun | number | mg/dL | labs_api | - | - |
| bun_cr_ratio | number | - | calculated | 10-20 | NEW |
| upcr_current | number | mg/g | labs_api | <500 | "UPCr has gone from *** to ***" |
| upcr_previous | number | mg/g | previous_note | - | - |
| uacr_current | number | mg/g | labs_api | <30 (A1) | "UACr has gone from *** to ***" |
| uacr_previous | number | mg/g | previous_note | - | - |
| urine_studies_summary | text | - | provider | - | `{TKE Urine Summary:27014}` |
| urine_studies_detail | text | - | provider | - | `{TKE Urine Studies:27015}` |
| proteinuria_status | enum | - | provider | - | `{proteinuria:27655}` |
| kfre_2yr | number | % | calculated | - | NEW |
| kfre_5yr | number | % | calculated | - | NEW |
| renalytix_result | enum: Low/Medium/High/Not_done | - | manual | - | NEW |
| renalytix_date | date | - | manual | - | NEW |
| renasight_result | text | - | manual | - | NEW |
| kidney_biopsy | text | - | manual | - | NEW |
| aki_history | text | - | provider | - | NEW (council) |

**AI Interpretation**: Generate paragraph assessing kidney function trajectory, proteinuria trend, KFRE risk, and whether current interventions are adequate. Reference KDIGO staging and risk categories.

### Section 2: Hematuria

**Card**: TKE-HEMA | **Mode**: conditional (when hematuria present) | **Agent**: kidney_function_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| hematuria_present | boolean | - | labs_api/provider | false |
| hematuria_type | enum: microscopic/gross/none | - | provider | - |
| ua_rbc | number | /hpf | labs_api | <3 |
| workup_status | enum: not_indicated/in_progress/complete | - | provider | - |
| cystoscopy_date | date | - | provider | - |
| imaging_result | text | - | provider | - |
| urology_referral | boolean | - | provider | - |

### Section 3: Kidney Stones

**Card**: TKE-STONE | **Mode**: conditional | **Agent**: kidney_function_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| stone_history | text | - | provider | - | `{episodes of:27040}` |
| last_episode | date | - | patient | - | - |
| stone_type | text | - | labs/pathology | - | - |
| 24h_urine_collected | boolean | - | labs_api | - | - |
| 24h_urine_date | date | - | labs_api | - | - |
| prevention_meds | text | - | med_list | - | - |

### Section 4: GU History

**Card**: TKE-GU | **Mode**: conditional | **Agent**: general_ckd_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| gu_history | text | - | provider | - | "Regarding GU history, ***" |
| bph | boolean | - | provider | - | - |
| bph_medication | text | - | med_list | - | - |
| prostate_cancer | boolean | - | chart | - | - |
| uti_history | text | - | provider | - | NEW |

---

## DOMAIN 2: CARDIOVASCULAR-RENAL (Red #EF4444)

### Section 5: Blood Pressure & Fluid

**Card**: TKE-BPFL, TKE-DAXR | **Mode**: always | **Agent**: bp_fluid_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| systolic_bp | number | mmHg | vitals | <120 (SPRINT) | `@LASTENCBP@` |
| diastolic_bp | number | mmHg | vitals | <80 | - |
| heart_rate | number | bpm | vitals | - | `@LASTENCPU@` |
| o2_saturation | number | % | vitals | >94 | NEW |
| bp_control_status | enum: controlled/uncontrolled/unknown | - | provider | controlled | `{controlled/uncontrolled/unknown:27016}` |
| bp_target | text | - | protocol | <120 systolic | NEW |
| home_bp_available | boolean | - | patient | - | NEW |
| edema | enum: None/Trace/1+/2+/3+/4+ | - | exam | None | NEW |
| fluid_status | enum: euvolemic/hypervolemic/hypovolemic | - | provider | euvolemic | NEW |
| daxor_bva_result | text | - | manual | - | NEW |
| daxor_bva_date | date | - | manual | - | NEW |

### Section 6: Heart Failure

**Card**: TKE-HF | **Mode**: conditional (when HF present) | **Agent**: heart_failure_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| hf_status | text | - | provider | - | "Regarding heart failure, ***" |
| lvef | number | % | echo | - | - |
| hf_type | enum: HFrEF/HFmrEF/HFpEF/Normal/None | - | provider | - | NEW |
| last_echo_date | date | - | chart | - | NEW |
| gdmt_bb | boolean | - | med_list | - | NEW |
| gdmt_mra_hf | boolean | - | med_list | - | NEW |
| gdmt_sglt2i_hf | boolean | - | med_list | - | NEW |
| gdmt_arni | boolean | - | med_list | - | NEW |
| crs_type | enum: Type1/Type2/Type3/Type4/Type5/NA | - | provider | - | NEW |
| cardiology_followup | text | - | provider | - | NEW |
| furoscix_status | enum: on/not_indicated/consider | - | provider | - | NEW (sub-field) |

### Section 7: Lipid Therapy

**Card**: TKE-STAT | **Mode**: always | **Agent**: cv_risk_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| statin_status | enum | - | provider | - | `{TKE Statin:27055}` |
| statin_drug_dose | text | - | med_list | - | - |
| statin_intolerance | text | - | chart | - | NEW |
| pcsk9i_status | enum: on/not_indicated/consider/prior_auth | - | provider | - | NEW (sub-field) |
| pcsk9i_drug | enum: Repatha/Praluent/Leqvio/none | - | med_list | - | NEW |
| lipid_panel | text | - | labs_api | - | NEW |

---

## DOMAIN 3: PHARMACOTHERAPY - THE 4 PILLARS (Purple #8B5CF6)

### Section 8: RAAS Inhibition (ACEi/ARB/ARNi)

**Card**: TKE-RAAS | **Mode**: always | **Agent**: pharmacotherapy_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| raas_status | enum | - | provider | On therapy | `{RAAS Inhibition:27018}` |
| raas_drug_dose | text | - | med_list | Max tolerated | - |
| at_max_dose | boolean | - | provider | true | NEW |
| not_on_reason | enum: hyperkalemia/AKI/hypotension/contraindicated/other | - | provider | - | NEW |
| cr_rise_since_start | number | % | calculated | <30% | NEW |
| k_on_therapy | number | mEq/L | labs_api | <5.5 | NEW |

**Fax Manager Cross-Ref**: `MEDICATION_SAFETY.ace_arb.monitor_K_above` = 5.5, `monitor_Cr_rise_percent` = 30%. Exact match with section targets.

### Section 9: SGLT2 Inhibitor

**Card**: TKE-SGLT | **Mode**: always | **Agent**: pharmacotherapy_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| sglt2i_status | enum | - | provider | On therapy (if eGFR>=20) | `{SGLT2i status:27020}` |
| sglt2i_drug_dose | text | - | med_list | - | - |
| not_on_reason | enum: egfr_too_low/uti/dka_risk/declined/other | - | provider | - | NEW |
| initial_egfr_dip_documented | boolean | - | provider | - | NEW |
| sick_day_rules_reviewed | boolean | - | provider | true | NEW |

**Fax Manager Cross-Ref**: `MEDICATION_SAFETY.sglt2i.minimum_GFR` = 20. Matches the "if eGFR>=20" condition.

### Section 10: MRA (Finerenone / Spironolactone / Eplerenone)

**Card**: TKE-FINE | **Mode**: always | **Agent**: pharmacotherapy_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| mra_status | enum: on/not_indicated/consider/contraindicated | - | provider | - |
| mra_drug_dose | text | - | med_list | - |
| not_on_reason | enum: hyperkalemia/not_indicated/other | - | provider | - |
| k_monitoring_schedule | text | - | provider | - |
| potassium_binder | text | - | med_list | - |

### Section 11: GLP-1 Receptor Agonist

**Card**: TKE-GLP1 | **Mode**: always | **Agent**: pharmacotherapy_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| glp1_status | enum: on/consider/not_indicated/contraindicated | - | provider | - |
| glp1_drug_dose | text | - | med_list | - |
| not_on_reason | enum: not_diabetic/gi_intolerance/cost/declined/other | - | provider | - |
| weight_response | text | - | calculated | - |
| kidney_benefit_documented | boolean | - | provider | - |

**Note**: GLP-1 RA was elevated to a standalone 4th Pillar section based on the FLOW trial era evidence. The header GDMT Compliance field auto-calculates "X/4 pillars" from sections 8-11.

---

## DOMAIN 4: METABOLIC (Orange #F97316)

### Section 12: Diabetes Management

**Card**: TKE-DM, TKE-EVER (sub) | **Mode**: conditional (when diabetic) | **Agent**: complications_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| diabetic_status | enum | - | provider | - | `{is diabetic?:27021}` |
| hba1c | number | % | labs_api | <7.0 | NEW |
| hba1c_date | date | - | labs_api | - | NEW |
| hba1c_target | number | % | protocol | <7.0 (individualize) | NEW |
| insulin_status | enum: on/not_on/not_needed | - | med_list | - | NEW |
| endocrinology_referral | boolean | - | provider | - | NEW |
| annual_eye_exam | enum: done/due/overdue | - | provider | done | NEW |
| annual_foot_exam | enum: done/due/overdue | - | provider | done | NEW |
| eversense_cgm | boolean | - | provider | - | NEW (sub-field) |

**Fax Manager Cross-Ref**: `MEDICATION_SAFETY.metformin.contraindicated_GFR` = 30, `caution_GFR` = 45. Agent uses these thresholds.

### Section 13: Gout

**Card**: TKE-GOUT | **Mode**: conditional | **Agent**: complications_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| gout_history | text | - | provider | - | "Regarding gout, ***" |
| uric_acid | number | mg/dL | labs_api | <6.0 | - |
| uric_acid_status | enum | - | provider | - | `{uric acid:27042}` |
| current_therapy | text | - | med_list | - | - |
| krystexxa_status | enum: on/candidate/not_indicated | - | provider | - | NEW |
| last_flare | date | - | patient | - | NEW |

### Section 14: Obesity / Weight Management

**Card**: TKE-OBES | **Mode**: conditional (BMI >= 30) | **Agent**: complications_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| bmi | number | kg/m2 | vitals | <30 |
| weight_trend_6mo | text | - | calculated | - |
| obesity_clinic_referral | boolean | - | provider | - |
| bariatric_surgery_history | boolean | - | chart | - |

---

## DOMAIN 5: CKD COMPLICATIONS (Dark Blue #1E40AF)

### Section 15: Anemia / Blood Health

**Card**: TKE-ANEM | **Mode**: always | **Agent**: complications_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| hemoglobin | number | g/dL | labs_api | 10-12 (CKD) | "Hb is ***" |
| mcv | number | fL | labs_api | 80-100 | "MCV of ***" |
| wbc | number | K/uL | labs_api | 4.5-11 | NEW |
| platelets | number | K/uL | labs_api | 150-400 | NEW |
| hematocrit | number | % | labs_api | - | NEW |
| ferritin | number | ng/mL | labs_api | >100 (CKD) | NEW |
| tsat | number | % | labs_api | 20-50% | NEW |
| iron_panel_date | date | - | labs_api | - | NEW |
| anemia_at_goal | enum | - | provider | at goal | `{at goal? TKE Anemia:27025}` |
| anemia_clinic | enum | - | provider | - | `{Anemia Clinic?:27690}` |
| esa_status | text | - | med_list | - | NEW |
| iv_iron_status | text | - | med_list | - | NEW |
| ckd_related | boolean | - | provider | - | NEW |

**Fax Manager Cross-Ref**: `LAB_THRESHOLDS.action.hemoglobin` < 8.0 triggers action. Intelligence.gs anemia rules: Hgb <7 severe, <10 moderate, <12 mild. EPO evaluation when Hgb <10 AND eGFR <60.

### Section 16: Mineral Bone Disease

**Card**: TKE-MBD | **Mode**: always (CKD G3+) | **Agent**: complications_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| pth | number | pg/mL | labs_api | 2-9x ULN (CKD 5) | "PTH ***" |
| vitamin_d25 | number | ng/mL | labs_api | 30-50 | "Vitamin D25 ***" |
| calcium | number | mg/dL | labs_api | 8.4-10.2 | "Ca ***" |
| phosphorus | number | mg/dL | labs_api | 2.5-4.5 (CKD 3-5) | "Phos ***" |
| albumin | number | g/dL | labs_api | >3.5 | "Albumin ***" |
| corrected_calcium | number | mg/dL | calculated | - | NEW |
| mbd_at_goal | enum | - | provider | at goal | `{At Goal? TKE Mineral Bone Disease:27037}` |
| vitamin_d_supplement | text | - | med_list | - | NEW |
| phosphate_binder | text | - | med_list | - | NEW |
| calcimimetic | text | - | med_list | - | NEW |

### Section 17: Electrolytes & Acid-Base

**Card**: TKE-ELEC | **Mode**: always | **Agent**: complications_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| sodium | number | mEq/L | labs_api | 136-145 | "Na ***" |
| potassium | number | mEq/L | labs_api | 3.5-5.0 | "K+ ***" |
| chloride | number | mEq/L | labs_api | 98-106 | NEW |
| bicarbonate | number | mEq/L | labs_api | >= 22 | "Bicarb ***" |
| magnesium | number | mg/dL | labs_api | 1.7-2.2 | NEW |
| glucose | number | mg/dL | labs_api | 70-130 (fasting) | NEW |
| electrolytes_at_goal | enum | - | provider | at goal | `{At Goal? TKE Electrolytes and Acid Base:27038}` |
| bicarb_supplement | text | - | med_list | - | NEW |
| kcl_supplement | text | - | med_list | - | NEW |
| pruritus | enum: none/mild/moderate/severe | - | patient | none | NEW (council) |

**Fax Manager Cross-Ref**: `LAB_THRESHOLDS.action.potassium` 3.0-5.5, `action.co2` < 18, `action.magnesium` 1.5-2.5. Intelligence.gs electrolyte analysis: severe hyperkalemia K+ >= 6.0, severe hyponatremia Na < 125, severe metabolic acidosis CO2 < 15.

---

## DOMAIN 6: RISK MITIGATION (Green #22C55E)

### Section 18: Tobacco / Substance Use

**Card**: TKE-SMOK | **Mode**: always | **Agent**: medication_safety_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| smoking_status | enum | - | provider | never/former | `{TKEcurrentsmokingstatus:27041}` |
| pack_years | number | - | patient | - | NEW |
| quit_date | date | - | patient | - | NEW |
| vaping_status | text | - | patient | - | NEW |
| cessation_counseling | boolean | - | provider | - | NEW |

### Section 19: NSAID Avoidance

**Card**: TKE-NSAI | **Mode**: always | **Agent**: medication_safety_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| nsaid_status | enum | - | provider | Not using | `{TKE NSAID:27043}` |
| specific_nsaid | text | - | patient | - | NEW |
| counseled_on_avoidance | boolean | - | provider | true | NEW |
| alternatives_discussed | text | - | provider | - | NEW |

**Fax Manager Cross-Ref**: `MEDICATION_SAFETY.nsaids.avoid_GFR` = 60, `caution_GFR` = 90. `MEDICATION_CATEGORIES.nsaids[]` provides the drug list for auto-detection.

### Section 20: PPI Review

**Card**: TKE-PPI | **Mode**: always | **Agent**: medication_safety_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| ppi_status | enum | - | provider | - | `{TKE PPI:27044}` |
| ppi_drug_dose | text | - | med_list | - | NEW |
| alternative_recommended | text | - | provider | - | NEW |

### Section 21: Sick Day Rules

**Card**: TKE-SICK | **Mode**: conditional (on RAAS/SGLT2i/MRA) | **Agent**: medication_safety_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| sick_day_rules_reviewed | boolean | - | provider | true |
| meds_to_hold_list_given | boolean | - | provider | true |
| patient_understanding | boolean | - | provider | true |

### Section 22: Contrast Precautions

**Card**: TKE-CONT | **Mode**: conditional | **Agent**: medication_safety_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| contrast_in_30_days | boolean | - | chart | - |
| pre_hydration_used | boolean | - | provider | - |
| hold_nephrotoxins | boolean | - | provider | - |

### Section 23: Sodium Restriction

**Card**: TKE-SODM | **Mode**: always | **Agent**: nutrition_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| sodium_target | text | - | protocol | <2g/day |
| diet_adherence | enum: good/fair/poor | - | patient | good |
| dietitian_referral | boolean | - | provider | - |

---

## DOMAIN 7: PLANNING & TRANSITIONS (Gray #6B7280)

### Section 24: Transplant Readiness

**Card**: TKE-TXPL | **Mode**: conditional (CKD G4+ or KFRE >20%) | **Agent**: planning_screening_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| transplant_candidate | enum: yes/no/evaluating | - | provider | - |
| transplant_centers | text | - | provider | - |
| current_status | enum: not_referred/in_workup/listed/active/inactive | - | provider | - |
| living_donor | boolean | - | patient | - |
| workup_completion_pct | number | % | coordinator | - |
| barriers | text | - | provider | - |
| bmi_barrier | boolean | - | calculated | - |

### Section 25: Dialysis Planning / Vascular Access

**Card**: TKE-DIAL | **Mode**: conditional (CKD G4+ or KFRE >20%) | **Agent**: planning_screening_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| dialysis_education | boolean | - | provider | true (by G4) |
| modality_preference | enum: HD/PD/HHD/Conservative/Undecided | - | patient | - |
| vascular_access_status | enum: none/AVF_planned/AVF_maturing/AVG/Catheter | - | provider | - |
| access_location | text | - | provider | - |
| surgery_referral_date | date | - | provider | - |
| timeline_to_dialysis | text | - | calculated (KFRE) | - |
| vein_preservation | boolean | - | provider | true | NEW (council) |

**Fax Manager Cross-Ref**: Intelligence.gs dialysis planning: eGFR <10 = "Immediate dialysis evaluation," eGFR <15 = "Dialysis initiation evaluation needed," eGFR <20 = "Initiate dialysis education and access planning."

### Section 26: Advance Care Planning

**Card**: TKE-ACP | **Mode**: conditional (CKD G4+ or age >75) | **Agent**: planning_screening_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| acp_documented | boolean | - | chart | true |
| acp_date | date | - | chart | - |
| surprise_question | enum: yes_surprised/no_not_surprised | - | provider | - |
| goals_of_care_discussed | boolean | - | provider | true |
| polst_completed | boolean | - | chart | - |
| healthcare_proxy | text | - | chart | - |
| conservative_mgmt_discussed | boolean | - | provider | - |
| cpt_99497_99498 | boolean | - | billing | - |

### Section 27: CCM Enrollment

**Card**: TKE-CCM | **Mode**: always (CKD G3+) | **Agent**: planning_screening_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| ccm_enrollment | enum | - | coordinator | enrolled | `{CCM Status:27080}` |
| ccm_active | boolean | - | coordinator | true | NEW |
| last_ccm_contact | date | - | coordinator | - | NEW |
| care_gaps | text | - | coordinator | - | NEW |

---

## DOMAIN 8: SCREENING & PREVENTION (Teal #14B8A6)

### Section 28: Immunizations

**Card**: TKE-VACC | **Mode**: always | **Agent**: planning_screening_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| flu_vaccine | enum: current/due/declined | - | chart | current |
| pneumococcal_pcv20 | enum: current/due/na | - | chart | current |
| hep_b | enum: immune/in_progress/due | - | chart | immune (if transplant candidate) |
| covid_vaccine | enum: current/due/declined | - | chart | current |
| shingrix | enum: complete/due/na | - | chart | complete (age 50+) |
| tdap | enum: current/due | - | chart | current |

### Section 29: Depression Screen (PHQ-2/9)

**Card**: TKE-PHQ | **Mode**: always (annual) | **Agent**: planning_screening_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| phq2_score | number | 0-6 | screening | <3 |
| phq9_score | number | 0-27 | screening | - |
| depression_status | enum: negative/mild/moderate/severe | - | calculated | negative |
| treatment_referral | text | - | provider | - |
| cognitive_screen | text | - | provider | - | NEW (council) |

### Section 30: Fall Risk Assessment

**Card**: TKE-FALL | **Mode**: conditional (age >65 or frail) | **Agent**: physical_performance_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| fall_risk | enum: low/moderate/high | - | screening | low |
| falls_12mo | number | - | patient | 0 |
| contributing_factors | text | - | provider | - |

### Section 31: Sleep Apnea

**Card**: TKE-SLAP | **Mode**: conditional | **Agent**: planning_screening_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| sleep_study_done | boolean | - | chart | - |
| osa_diagnosis | boolean | - | chart | - |
| cpap_compliance | enum: compliant/non_compliant/na | - | patient | compliant |
| stop_bang_score | number | 0-8 | screening | <3 |

### Section 32: SDOH Assessment

**Card**: TKE-SDOH | **Mode**: conditional (initial + annual) | **Agent**: planning_screening_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| transportation | enum: own_car/rides/issues | - | patient | - |
| housing_stability | enum: stable/at_risk/homeless | - | patient | stable |
| food_security | enum: secure/insecure | - | patient | secure |
| health_literacy | enum: adequate/limited | - | staff | adequate |
| insurance_barriers | text | - | billing | none |
| caregiver_support | text | - | patient | - |

### Section 33: Physical Performance & Frailty

**Card**: TKE-GRIP, TKE-FUNC | **Mode**: always (Tier 1 screening) | **Agent**: physical_performance_agent

| Field | Type | Unit | Source | Target | Evidence |
|-------|------|------|--------|--------|----------|
| grip_strength_dominant | number | kg | MA (dynamometer) | Men >=27, Women >=16 | EWGSOP2 |
| grip_strength_non_dominant | number | kg | MA (dynamometer) | - | - |
| low_grip_flag | boolean | - | calculated | false | 5-9% mortality/1kg decrease |
| sit_to_stand_30sec | number | reps | MA | >=10 | <8-10 = high risk |
| gait_speed_4m | number | m/s | MA | >=0.8 | <0.8 = sarcopenia |
| tug_time | number | seconds | MA | <12 | >12 = fall risk |
| sppb_score | number | 0-12 | calculated | >=10 | <=9 frailty, <=7 hospitalization |
| clinical_frailty_scale | number | 1-9 | provider | <5 | >=5 = frail |
| six_min_walk | number | meters | by_referral | >=350 | <350 = poor prognosis |
| frailty_status | enum: robust/pre_frail/frail | - | calculated | robust | Fried criteria |

**AI Interpretation**: Correlate physical performance with eGFR, anemia, fluid status. Flag high-risk combinations (low grip + declining eGFR + anemia). Track trends visit-to-visit. Recommend renal rehab referral when indicated. Adjust interpretation for confounders (edema affects gait, anemia affects endurance).

### Section 34: Nutrition / Dietary Assessment

**Card**: TKE-NUTR | **Mode**: always | **Agent**: nutrition_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| protein_intake | enum: appropriate/excessive/insufficient | - | patient/dietitian | appropriate |
| protein_target | text | - | protocol | 0.8 g/kg/day (CKD 3-5) |
| potassium_restriction | enum: not_needed/moderate/strict | - | provider | - |
| phosphorus_restriction | enum: not_needed/moderate/strict | - | provider | - |
| plant_based_diet_discussed | boolean | - | provider | - |
| malnutrition_screen | enum: normal/at_risk/malnourished | - | screening | normal |
| dietitian_referral | boolean | - | provider | - |

---

## DOMAIN 9: CARE COORDINATION (Pink #EC4899)

### Section 35: Medication Adherence & Barriers

**Card**: None (note-only, cross-cutting) | **Mode**: always | **Agent**: medication_safety_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| adherence_assessment | enum: good/fair/poor | - | patient/provider | good |
| cost_barriers | boolean | - | patient | false |
| prior_auth_pending | text | - | billing | - |
| pharmacy_access | enum: good/limited | - | patient | good |
| pregnancy_contraception | text | - | provider | - | NEW (council: conditional for reproductive age) |

**Note**: This section is cross-cutting. Every AI agent should consider adherence when generating interpretations. If a 4 Pillars medication is missing, the pharmacotherapy agent should cross-reference this section for barriers before recommending escalation.

### Section 36: Special Clinics

**Card**: TKE-CRM, TKE-LONG | **Mode**: conditional | **Agent**: general_ckd_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| cardiorenal_metabolic | enum: enrolled/referred/not_indicated | - | provider | - |
| longevity_clinic | enum: enrolled/referred/not_indicated | - | provider | - |
| heart_failure_clinic | enum: enrolled/referred/not_indicated | - | provider | - |

### Section 37: PCP / Care Team / Follow-Up

**Card**: None (note-only) | **Mode**: always | **Agent**: general_ckd_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| pcp_name | text | - | chart | - |
| cardiology | text | - | chart | - |
| endocrinology | text | - | chart | - |
| other_specialists | text | - | chart | - |
| follow_up_interval | text | - | provider | - |
| next_appointment | date | - | scheduling | - |
| referrals_placed | text | - | provider | - | (council) |
| education_delivered | text | - | auto-populated | - | (council) |
| time_complexity | text | - | provider | - | (council: billing) |

---

## Cross-Cutting Alert: Triple Whammy

**NOT a note section** - fires from `medication_safety_agent` when:
- Patient is on RAAS inhibitor (ACEi/ARB/ARNi) AND
- Patient is on diuretic AND
- Patient is on NSAID

**Action**: Red alert in digital note builder + flag in medication adherence section.

**Fax Manager Cross-Ref**: `MEDICATION_CATEGORIES.ace_inhibitors[]`, `MEDICATION_CATEGORIES.arbs[]`, `MEDICATION_CATEGORIES.diuretics[]`, `MEDICATION_CATEGORIES.nsaids[]` provide the drug lists for auto-detection. Intelligence.gs medication safety engine already implements this logic.

---

## Extensibility

New sections are added by:
1. Creating a new entry in this registry (section_id, fields, domain, card code)
2. Assigning a card code (if physical card needed)
3. Assigning an AI agent (new or existing)
4. The system auto-propagates to: note template, digital builder, report card, quality metrics

No code changes required - the digital note builder reads the registry and renders dynamically.

---

# Part 5: Card Inventory (42 Clinical + 3 Workflow)

## Physical Card Standards

- **Size**: TBD (paper prototype first; candidates: 5.5"x8.5" half-letter, 4"x6" index, 5"x7")
- **Stock**: Heavy cardstock (100lb cover)
- **Print**: Double-sided (Front: clinical assessment, Back: patient education)
- **Marking**: OMR-compatible filled circles for OCR scanning (98%+ accuracy target)
- **QR Code**: Per-card linking to patient education video/content
- **Version Tracking**: Footer with TKE-XXXX-v1.0 format
- **Patient ID Zone**: Barcode/label area for patient identification
- **Reading Level**: 6th grade (Flesch-Kincaid) for patient education back

## Card Design Pattern

**FRONT (Clinical - MA/Provider fills)**
```
+-------------------------------------------+
| [COLOR BAR]  CARD TITLE    TKE-XXXX       |
| Patient: _________ Date: ____ MRN: ____   |
|-------------------------------------------|
| SECTION A: Assessment (MA fills)          |
| O Option 1  O Option 2  O Option 3       |
| Value: _____ Unit: _____ Date: _____      |
|-------------------------------------------|
| SECTION B: Current Status                 |
| [ ] Checkbox items                        |
| O Circle-select options                   |
|-------------------------------------------|
| SECTION C: Plan (Provider fills)          |
| [ ] Action items / orders                 |
| [ ] Medication changes                    |
|-------------------------------------------|
| [QR Code]  TKE-XXXX-v1.0  KEEP CARD      |
+-------------------------------------------+
```

**BACK (Patient Education)**
```
+-------------------------------------------+
| [COLOR BAR]  WHAT THIS MEANS FOR YOU      |
|-------------------------------------------|
| Plain language explanation                |
| (6th grade reading level)                 |
|                                           |
| YOUR TARGETS:                             |
| - Target 1: ____                          |
| - Target 2: ____                          |
|                                           |
| WHAT YOU CAN DO:                          |
| - Action 1                               |
| - Action 2                               |
|                                           |
| WHEN TO CALL US:                          |
| - Warning sign 1                          |
| - Warning sign 2                          |
|                                           |
| [QR: Video education link]               |
| THE KIDNEY EXPERTS: (731) xxx-xxxx        |
+-------------------------------------------+
```

## Complete Card Inventory

### Category 1: Kidney Core (Blue #3B82F6) - 8 cards

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 1 | TKE-PROT | Proteinuria / Albuminuria | Kidney Function | Concept |
| 2 | TKE-HEMA | Hematuria Workup | Hematuria | Concept |
| 3 | TKE-STONE | Kidney Stones | Kidney Stones | Concept |
| 4 | TKE-GU | GU History | GU History | Concept |
| 5 | TKE-KFRE | KFRE Risk Assessment | Kidney Function (sub) | Concept |
| 6 | TKE-BIOP | Kidney Biopsy | Kidney Function (sub) | Concept |
| 7 | TKE-RNLX | Renalytix KidneyIntelX | Kidney Function (sub) | Concept |
| 8 | TKE-RNAS | Renasight Genetic Testing | Kidney Function (sub) | Concept |

### Category 2: Cardiovascular-Renal (Red #EF4444) - 4 cards

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 9 | TKE-BPFL | Blood Pressure & Fluid | BP & Fluid | Concept |
| 10 | TKE-HF | Heart Failure / GDMT | Heart Failure | Concept |
| 11 | TKE-STAT | Statin / Lipid Therapy | Lipid Therapy | **BUILT** |
| 12 | TKE-DAXR | Daxor Blood Volume | BP & Fluid (sub) | Concept |

### Category 3: Pharmacotherapy / 4 Pillars (Purple #8B5CF6) - 4 cards

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 13 | TKE-RAAS | RAAS Inhibitor Optimization | RAAS Inhibition | Concept |
| 14 | TKE-SGLT | SGLT2 Inhibitor | SGLT2i | Concept |
| 15 | TKE-FINE | Finerenone (MRA) | MRA | Concept |
| 16 | TKE-GLP1 | GLP-1 Receptor Agonist | GLP-1 RA | Concept |

### Category 4: Metabolic (Orange #F97316) - 3 cards

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 17 | TKE-DM | Diabetes Management | Diabetes | Concept |
| 18 | TKE-GOUT | Gout / Krystexxa | Gout | Concept |
| 19 | TKE-OBES | Obesity Management | Obesity | Concept |

### Category 5: CKD Complications (Dark Blue #1E40AF) - 3 cards

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 20 | TKE-ANEM | Anemia / Blood Health | Anemia | **BUILT** |
| 21 | TKE-MBD | Mineral Bone Disease | MBD | Concept |
| 22 | TKE-ELEC | Electrolytes & Acid-Base | Electrolytes | Concept |

### Category 6: Risk Mitigation (Green #22C55E) - 6 cards

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 23 | TKE-NSAI | NSAID Avoidance | NSAIDs | **BUILT** |
| 24 | TKE-SMOK | Smoking Cessation | Tobacco | **BUILT** |
| 25 | TKE-PPI | PPI Review | PPI | **BUILT** |
| 26 | TKE-SICK | Sick Day Rules | Sick Day Rules | Concept |
| 27 | TKE-CONT | Contrast Precautions | Contrast | Concept |
| 28 | TKE-SODM | Sodium Restriction | Sodium | Concept |

### Category 7: Planning & Transitions (Gray #6B7280) - 4 cards

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 29 | TKE-TXPL | Transplant Readiness | Transplant | Concept |
| 30 | TKE-DIAL | Dialysis Planning / Vascular Access | Dialysis Planning | Concept |
| 31 | TKE-ACP | Advance Care Planning | ACP | Concept |
| 32 | TKE-CCM | CCM Enrollment | CCM | Concept |

### Category 8: Screening & Prevention (Teal #14B8A6) - 7 cards

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 33 | TKE-VACC | Immunizations | Immunizations | Concept |
| 34 | TKE-PHQ | Depression Screen (PHQ-2/9) | Depression | Concept |
| 35 | TKE-FALL | Fall Risk Assessment | Fall Risk | Concept |
| 36 | TKE-SLAP | Sleep Apnea (STOP-BANG) | Sleep Apnea | **BUILT** |
| 37 | TKE-SDOH | SDOH Assessment | SDOH | Concept |
| 38 | TKE-GRIP | Grip Strength & Sarcopenia | Physical Performance | Concept |
| 39 | TKE-FUNC | Functional Mobility Battery | Physical Performance | Concept |

### Category 9: Care Coordination (Pink #EC4899) - 2 cards

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 40 | TKE-CRM | Cardiorenal Metabolic Clinic | Special Clinics | Concept |
| 41 | TKE-LONG | Longevity Clinic | Special Clinics | Concept |

### Category 10: Nutrition (Lime #84CC16) - 1 card

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 42 | TKE-NUTR | Nutrition / Dietary Assessment | Nutrition | Concept |

### Cross-Cutting (AI Alert, Not a Card)

| Code | Alert Name | Trigger |
|------|-----------|---------|
| TKE-TRIP | Triple Whammy Alert | RAASi + Diuretic + NSAID detected |

### Workflow Cards (Non-Clinical, Previously Built)

| Code | Card Name | Status |
|------|-----------|--------|
| TKE-TRIAGE | Receptionist Triage | **BUILT** |
| TKE-PROVQR | Provider Quick Reference | **BUILT** |
| TKE-TRIP-CARD | Triple Whammy (education) | **BUILT** |

## Card Summary

| Category | Color | Total | Built | Concept |
|----------|-------|-------|-------|---------|
| Kidney Core | Blue | 8 | 0 | 8 |
| Cardiovascular-Renal | Red | 4 | 1 | 3 |
| 4 Pillars | Purple | 4 | 0 | 4 |
| Metabolic | Orange | 3 | 0 | 3 |
| CKD Complications | Dark Blue | 3 | 1 | 2 |
| Risk Mitigation | Green | 6 | 3 | 3 |
| Planning | Gray | 4 | 0 | 4 |
| Screening | Teal | 7 | 1 | 6 |
| Care Coordination | Pink | 2 | 0 | 2 |
| Nutrition | Lime | 1 | 0 | 1 |
| **Clinical Total** | | **42** | **6** | **36** |
| Workflow | - | 3 | 3 | 0 |
| **Grand Total** | | **45** | **9** | **36** |

### Existing Card File Locations

Built cards: `development/TALIA/tke-provider-workload-offload/cards/`
- `nsaids.md`, `ppis.md`, `tobacco.md`, `triple-whammy.md`
- `statins.md`, `anemia.md`, `sleep-apnea.md`
- `receptionist-triage.md`, `provider-quick-reference.md`
- `leqvio-patient-faq.md`
- `all-cards-printable.html` (TKE branded, 5.5"x8.5")

---

# Part 6: AI Architecture

## Three-Phase Encounter Model

### Phase 1: Pre-Visit (Automated)

```
TRIGGER: Appointment scheduled (T-24h or on-demand)

1. Pull last note (all 37 sections)
2. Pull latest labs -> populate lab fields
3. Pull medication list -> populate therapy sections
4. Pull vitals (weight, BP) -> populate vital fields
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
+-- Virtual scribe (transcription -> structured extraction)
+-- MA fills physical cards -> OCR scan -> field updates
+-- MA enters vitals, screening results (grip, STS, PHQ-2)
+-- Provider marks decisions on cards / digital interface
+-- Real-time: medication safety agent monitors for alerts

REAL-TIME ALERTS:
+-- Triple Whammy detection
+-- Critical lab values
+-- Drug interaction warnings
+-- Care gap reminders
```

### Phase 3: Post-Visit (AI Generation)

```
1. All sub-agents generate interpretations (in parallel)
2. Orchestrator assembles complete note
3. Apply view mode (Initial vs Follow-up)
4. Apply progressive disclosure (collapse stable sections)
5. Generate three outputs:
   +-- Provider note (billing/legal/clinical)
   +-- Patient-facing summary (plain language, action list, targets)
   +-- Care team task list (labs due, referrals, education)
6. Provider reviews -> edits -> signs
7. Update quality metrics dashboard
8. Update longitudinal patient record
```

## Agent Inventory

### Phase 4: 8 Core Agents

| # | Agent | Domains Covered | Guidelines |
|---|-------|----------------|------------|
| 1 | **orchestrator** | All (traffic control, assembly, conflict resolution) | - |
| 2 | **kidney_function_agent** | Kidney Core (eGFR, proteinuria, KFRE, stones, hematuria, GU) | KDIGO 2024 CKD |
| 3 | **bp_fluid_agent** | BP & Fluid, Daxor | KDIGO BP, SPRINT |
| 4 | **heart_failure_agent** | Heart Failure, GDMT, CRS, Furoscix | AHA/ACC HF |
| 5 | **pharmacotherapy_agent** | 4 Pillars (RAAS, SGLT2i, MRA, GLP-1), Lipids | KDIGO 2024, CREDENCE, DAPA-CKD, FIDELIO, FLOW |
| 6 | **complications_agent** | Anemia, MBD, Electrolytes, Gout, Diabetes, Obesity | KDIGO Anemia/MBD, ADA |
| 7 | **medication_safety_agent** | Risk Mitigation (NSAIDs, PPIs, Sick Day, Contrast), Adherence, Triple Whammy | Cross-cutting |
| 8 | **planning_screening_agent** | Transplant, Dialysis, ACP, CCM, Immunizations, PHQ, Sleep, SDOH | KDIGO Transplant |

### Phase 8: Expansion to 12-15 Specialized Agents

When volume and complexity justify:
- `pharmacotherapy_agent` -> separate RAAS, SGLT2i, MRA, GLP-1 agents
- `complications_agent` -> separate anemia, MBD, electrolytes agents
- `planning_screening_agent` -> separate transplant, physical performance agents
- Add `nutrition_agent` (dedicated)
- Add `scribe_agent` for transcription extraction
- Add `cv_risk_agent` for lipids/statin/PCSK9i
- Add `physical_performance_agent` (dedicated)

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

## Safety Guardrails

1. AI never invents lab values - must cite source + date
2. AI never recommends medications without provider confirmation
3. All interpretations include confidence score
4. Below-threshold confidence triggers "REVIEW NEEDED" flag
5. Medication safety alerts cannot be dismissed without reason
6. All AI outputs logged with version, timestamp, model used
7. Human signature required before any note is finalized

---

# Part 7: Epic Integration & SmartPhrase Migration

## Current SmartPhrase -> New Field Migration

Every legacy SmartList ID maps to a specific field_id in the new registry. This ensures zero data loss during migration.

| Legacy SmartList | ID | New Field ID | Section # |
|---|---|---|---|
| `{here for:27012}` | 27012 | `header.reason_for_visit` | 0 |
| `{Follow Up:27013}` | 27013 | `header.follow_up_interval` | 0 |
| `{TKE Urine Summary:27014}` | 27014 | `kidney_function.urine_studies_summary` | 1 |
| `{TKE Urine Studies:27015}` | 27015 | `kidney_function.urine_studies_detail` | 1 |
| `{proteinuria:27655}` | 27655 | `kidney_function.proteinuria_status` | 1 |
| `{controlled/uncontrolled/unknown:27016}` | 27016 | `bp_fluid.bp_control_status` | 5 |
| `{RAAS Inhibition:27018}` | 27018 | `raas.raas_status` | 8 |
| `{SGLT2i status:27020}` | 27020 | `sglt2i.sglt2i_status` | 9 |
| `{is diabetic?:27021}` | 27021 | `diabetes.diabetic_status` | 12 |
| `{at goal? TKE Anemia:27025}` | 27025 | `anemia.anemia_at_goal` | 15 |
| `{Anemia Clinic?:27690}` | 27690 | `anemia.anemia_clinic` | 15 |
| `{At Goal? TKE Mineral Bone Disease:27037}` | 27037 | `mbd.mbd_at_goal` | 16 |
| `{At Goal? TKE Electrolytes and Acid Base:27038}` | 27038 | `electrolytes.electrolytes_at_goal` | 17 |
| `{episodes of:27040}` | 27040 | `kidney_stones.stone_history` | 3 |
| `{TKEcurrentsmokingstatus:27041}` | 27041 | `tobacco.smoking_status` | 18 |
| `{uric acid:27042}` | 27042 | `gout.uric_acid_status` | 13 |
| `{TKE NSAID:27043}` | 27043 | `nsaid.nsaid_status` | 19 |
| `{TKE PPI:27044}` | 27044 | `ppi.ppi_status` | 20 |
| `{TKE Statin:27055}` | 27055 | `lipid_therapy.statin_status` | 7 |
| `{suspected/biopsy confirmed:27058}` | 27058 | `header.pathology_confirmation` | 0 |
| `{CKD ETIOLOGY:27079}` | 27079 | `header.ckd_etiology` | 0 |
| `{CCM Status:27080}` | 27080 | `header.ccm_status` | 0 |
| `{TKE Who:27081}` | 27081 | `header.companions` | 0 |

**Result**: 23 legacy SmartList IDs -> 23 mapped fields. Zero data loss.

## Epic Auto-Pull Candidates (SmartLinks)

These fields can auto-populate from Epic chart data using `@TAG@` syntax:

| Epic Tag | Maps To | Auto-Populates |
|----------|---------|---------------|
| `@ED@` | `header.visit_type` | Encounter type |
| `@LASTENCBP@` | `bp_fluid.systolic_bp`, `bp_fluid.diastolic_bp` | Blood pressure |
| `@LASTENCPU@` | `bp_fluid.heart_rate` | Heart rate |
| `@LASTENCWT@` | `header.weight` | Weight |
| `@LASTENCBMI@` | `header.bmi` | BMI |
| `@CREAT@` | `kidney_function.creatinine` | Creatinine (if available) |
| `@GFR@` | `kidney_function.egfr_current` | eGFR (if available) |

## Future: FHIR / SmartLinks Roadmap

Phase 3+ may leverage:
- **SmartData Elements** for discrete field storage within Epic
- **SmartLinks** for real-time calculated fields
- **SmartBlocks** for conditional section rendering
- **FHIR R4 APIs** for lab/med/vitals pulls (requires DVA CKD approval)

---

# Part 8: Renal Performance Clinic

## Overview

Physical function predicts mortality better than many lab markers in CKD. The Renal Performance Clinic integrates physical performance assessment into every nephrology visit, with an escalation pathway to formal assessment and supervised rehabilitation.

## Three-Tier Model

### Tier 1: In-Clinic Screening (Every CKD Visit)

| Test | Equipment | Time | Who | Threshold |
|------|-----------|------|-----|-----------|
| Hand Grip Strength (dominant) | Jamar dynamometer (~$300) | 30 sec | MA | Men <27kg / Women <16kg (EWGSOP2) |
| 30-Second Sit-to-Stand | Chair, stopwatch | 45 sec | MA | <8-10 reps = high risk |
| 4-Meter Gait Speed | Tape on floor, stopwatch | 30 sec | MA | <0.8 m/s = sarcopenia; <1.0 m/s = mortality risk |

- **When**: Every visit, added to vital signs workflow
- **Billing**: Part of E/M visit (no separate charge)
- **Data flows to**: Section 33 (Physical Performance & Frailty) fields
- **Starts**: Phase 0 (costs nothing but a $300 dynamometer)
- **Referral trigger**: Any test below threshold -> consider Tier 2 assessment

### Tier 2: Formal Assessment Clinic (Referral-Based)

| Test | What | Time | Who |
|------|------|------|-----|
| Full SPPB Battery | Balance + gait speed + 5x chair stand (scored 0-12) | 15 min | PT / Exercise Physiologist |
| Timed Up and Go (TUG) | Stand, walk 3m, turn, return, sit | 2 min | PT |
| 6-Minute Walk Test | Max distance walked on flat surface | 8 min | PT |
| Body Composition | Bioimpedance (if available) | 5 min | PT |
| Clinical Frailty Scale | Provider assessment (1-9 scale) | 3 min | Provider |
| Fried Frailty Criteria | Weight loss, exhaustion, activity, walk speed, grip | 5 min | Provider |
| Exercise Prescription | Individualized resistance + aerobic plan | 10 min | PT |

**Billing (Tier 2):**

| CPT Code | Description | Approx Reimbursement |
|----------|------------|---------------------|
| 97750 | Physical performance test (per test) | $30-50 |
| 97161 | PT evaluation, low complexity | $80-100 |
| 97162 | PT evaluation, moderate complexity | $100-130 |
| 97163 | PT evaluation, high complexity | $130-150 |

**Cash-Pay Option**: $200-350 comprehensive performance battery + longevity panel crossover

### Tier 3: Supervised Rehabilitation Program

- **Format**: 2-3x/week, 8-12 weeks
- **Content**: Progressive resistance training + aerobic conditioning
- **Reassessment**: Monthly with full battery
- **Outcome tracking**: Performance trends over time vs. CKD progression

**Billing (Tier 3):**

| CPT Code | Description | Approx Reimbursement |
|----------|------------|---------------------|
| 97110 | Therapeutic exercise (per 15 min) | $30-45/unit |
| 97112 | Neuromuscular re-education (per 15 min) | $30-45/unit |
| 97530 | Self-management education | $25-40 |
| 98960-98962 | Patient education services | $25-40 |
| 99490/99439 | CCM time (exercise monitoring can count) | $42-70/month |

### Staffing Model

- **Phase 0 (Tier 1)**: MA does screening at intake. No additional hire.
- **Phase 9 (Tier 2)**: Partner with local PT practice for referrals (option B). Low cost, immediate access.
- **Phase 9+ (Tier 3)**: Hire in-house exercise physiologist when volume justifies (option A). ~25+ assessments/month breakeven.

## Evidence Base

| Measure | Threshold | Clinical Significance |
|---------|-----------|----------------------|
| Hand Grip Strength | Men <27kg, Women <16kg | EWGSOP2 sarcopenia criteria. 5-9% mortality increase per 1kg decrease |
| 30-Second STS | <8-10 reps | Lower extremity strength and endurance marker |
| 4-Meter Gait Speed | <0.8 m/s | Confirms sarcopenia (EWGSOP2). <1.0 m/s = independent mortality risk |
| TUG | >12 seconds | Fall risk + impaired mobility. Correlates with functional decline |
| SPPB | <=9 = frailty risk; <=7 = hospitalization risk | Composite measure: balance + gait + chair stands |
| Clinical Frailty Scale | >=5 = frail | Predicts hospitalization, mortality, institutionalization |
| 6-Minute Walk Test | <350m | Poor prognosis. Correlates with CV mortality in CKD |
| Fried Frailty Phenotype | >=3/5 criteria | Gold standard frailty definition |

**Key CKD-specific evidence**:
- Muscle wasting begins at eGFR <45 and accelerates below eGFR <30
- Uremic myopathy compounds sarcopenia in advanced CKD
- Anemia (low Hgb) reduces exercise capacity independently
- Fluid overload (edema) confounds gait speed measurement
- Resistance training is safe and effective even in dialysis patients (K/DOQI guidelines)

---

# Part 9: Fax Manager Cross-Reference

The fax manager v2 (`development/fax-manager-v2/`) contains clinical intelligence in `Config.gs` and `Intelligence.gs` that directly maps to the section registry. These rules should be imported into (or referenced by) the AI agents to ensure consistency.

## CKD Staging (Config.gs -> Section 0: Header)

| Fax Manager | Value | Registry Field |
|-------------|-------|---------------|
| `CKD_STAGE_DEFS.G1.minGFR` | 90 | `header.ckd_stage = G1` |
| `CKD_STAGE_DEFS.G2.minGFR` | 60 | `header.ckd_stage = G2` |
| `CKD_STAGE_DEFS.G3a.minGFR` | 45 | `header.ckd_stage = G3a` |
| `CKD_STAGE_DEFS.G3b.minGFR` | 30 | `header.ckd_stage = G3b` |
| `CKD_STAGE_DEFS.G4.minGFR` | 15 | `header.ckd_stage = G4` |
| `CKD_STAGE_DEFS.G5.minGFR` | 0 | `header.ckd_stage = G5` |

## Albuminuria & KDIGO Risk (Config.gs -> Section 0: Header)

| Fax Manager | Value | Registry Field |
|-------------|-------|---------------|
| `ALBUMINURIA_CATEGORIES.A1.maxUacr` | 30 | `header.albuminuria_stage = A1` |
| `ALBUMINURIA_CATEGORIES.A2.maxUacr` | 300 | `header.albuminuria_stage = A2` |
| `ALBUMINURIA_CATEGORIES.A3.maxUacr` | Infinity | `header.albuminuria_stage = A3` |
| `KDIGO_RISK_MAP` | GxAy -> risk level | `header.kdigo_risk_category` |

Example: `KDIGO_RISK_MAP.G3bA2` = "very_high" maps directly to `header.kdigo_risk_category = Very_High`.

## Lab Thresholds (Config.gs -> Multiple Sections)

### Panic Values (CRITICAL_VALUES)

| Lab | Panic Low | Panic High | Registry Section | Action |
|-----|-----------|-----------|-----------------|--------|
| Potassium | 2.5 | 6.0 | Electrolytes (#17) | Red alert |
| Sodium | 120 | 160 | Electrolytes (#17) | Red alert |
| Hemoglobin | 6.0 | - | Anemia (#15) | Red alert |
| Calcium | 6.5 | 13.0 | MBD (#16) | Red alert |
| Phosphorus | 1.0 | 7.0 | MBD (#16) | Red alert |
| Creatinine | - | 10.0 | Kidney Function (#1) | Red alert |
| CO2 | 10 | - | Electrolytes (#17) | Red alert |
| Glucose | 40 | 500 | Diabetes (#12) | Red alert |

### Action Thresholds

| Lab | Action Low | Action High | Registry Target | AI Agent Action |
|-----|-----------|------------|----------------|-----------------|
| Potassium | 3.0 | 5.5 | 3.5-5.0 | Flag + check RAAS/MRA doses |
| Hemoglobin | 8.0 | - | 10-12 (CKD) | Flag + evaluate iron/ESA |
| CO2 | 18 | - | >= 22 | Flag + bicarb supplementation |
| Calcium | 8.0 | 10.5 | 8.4-10.2 | Flag + adjust Vit D/binders |
| Magnesium | 1.5 | 2.5 | 1.7-2.2 | Flag + supplement if low |

## Medication Safety Rules (Config.gs -> Sections 8, 9, 12, 19)

| Rule | Fax Manager Threshold | Registry Section | Registry Target |
|------|----------------------|-----------------|-----------------|
| RAAS: hold if K+ high | `ace_arb.monitor_K_above = 5.5` | RAAS (#8) | `k_on_therapy < 5.5` |
| RAAS: acceptable Cr rise | `ace_arb.monitor_Cr_rise_percent = 30` | RAAS (#8) | `cr_rise_since_start < 30%` |
| SGLT2i: minimum GFR | `sglt2i.minimum_GFR = 20` | SGLT2i (#9) | `eGFR >= 20` |
| Metformin: contraindicated | `metformin.contraindicated_GFR = 30` | Diabetes (#12) | Agent flag |
| Metformin: dose reduce | `metformin.caution_GFR = 45` | Diabetes (#12) | Agent flag |
| NSAIDs: avoid | `nsaids.avoid_GFR = 60` | NSAIDs (#19) | Agent flag |
| NSAIDs: caution | `nsaids.caution_GFR = 90` | NSAIDs (#19) | Agent flag |
| Gabapentinoids: dose reduce | `gabapentinoids.dose_reduce_GFR = 30` | Medication Safety Agent | Alert |
| Allopurinol: dose reduce | `allopurinol.dose_reduce_GFR = 30` | Gout (#13) | Agent flag |

## Medication Categories (Config.gs -> Medication Safety Agent)

The `MEDICATION_CATEGORIES` object provides drug lists that the `medication_safety_agent` uses for auto-detection:

| Category | Drugs | Used By |
|----------|-------|---------|
| `nsaids` | ibuprofen, naproxen, diclofenac, celecoxib, meloxicam, indomethacin, ketorolac | Section 19, Triple Whammy |
| `ace_inhibitors` | lisinopril, enalapril, captopril, ramipril, benazepril, fosinopril, quinapril | Section 8, Triple Whammy |
| `arbs` | losartan, valsartan, olmesartan, telmisartan, irbesartan, candesartan, azilsartan | Section 8, Triple Whammy |
| `mras` | spironolactone, eplerenone, finerenone | Section 10 |
| `sglt2i` | empagliflozin, dapagliflozin, canagliflozin, ertugliflozin | Section 9 |
| `diuretics` | furosemide, bumetanide, torsemide, HCTZ, chlorthalidone, metolazone, etc. | Triple Whammy |
| `esas` | epoetin, darbepoetin | Section 15 |
| `phosphate_binders` | sevelamer, lanthanum, calcium acetate, ferric citrate, etc. | Section 16 |
| `potassium_binders` | patiromer, sodium zirconium, kayexalate | Section 10 |
| `immunosuppressants` | tacrolimus, cyclosporine, mycophenolate, etc. | Section 24 |

## Intelligence.gs Rule Engine -> AI Agent Mapping

| Intelligence.gs Module | Maps To Agent | Key Thresholds |
|----------------------|---------------|----------------|
| Electrolyte analysis | `complications_agent` | K+ tiers, Na tiers, CO2 < 22 |
| Anemia assessment | `complications_agent` | Hgb < 7/10/12, EPO eval at Hgb <10 + eGFR <60 |
| HF classification | `heart_failure_agent` | EF < 40% HFrEF, 40-49% HFmrEF, >= 50% HFpEF |
| Medication safety | `medication_safety_agent` | All MEDICATION_SAFETY thresholds + drug lists |
| Risk score computation | `orchestrator` | Weighted severity (0-10+), risk bands |
| Dialysis planning | `planning_screening_agent` | eGFR <10 critical, <15 urgent, <20 planning |
| BUN:Cr ratio | `kidney_function_agent` | >20 pre-renal, 10-20 normal, <10 intrinsic |

## Physiological Bounds (Config.gs -> Validation)

These bounds serve as data validation rules - any value outside these ranges is likely a data entry error:

| Lab | Min | Max | Unit |
|-----|-----|-----|------|
| Potassium | 1.5 | 9.0 | mEq/L |
| Sodium | 100 | 180 | mEq/L |
| Creatinine | 0.1 | 25.0 | mg/dL |
| eGFR | 0 | 200 | mL/min/1.73m2 |
| Hemoglobin | 2.0 | 25.0 | g/dL |
| Calcium | 4.0 | 18.0 | mg/dL |
| Phosphorus | 0.5 | 15.0 | mg/dL |
| Bicarbonate | 3.0 | 50.0 | mEq/L |
| BUN | 1 | 200 | mg/dL |
| Albumin | 0.5 | 7.0 | g/dL |
| PTH | 1 | 3000 | pg/mL |

These should be enforced in the digital note builder and JSON schema validation.

---

# Part 10: Implementation Phases (0-9)

## Phase 0: Governance & Success Metrics

**Duration**: 1-2 weeks | **Dependencies**: None

### Deliverables
- [ ] Define success metrics (note time, completion rate, GDMT adherence, provider satisfaction)
- [ ] Define note output contract (what must always appear, length budgets)
- [ ] Provider focus group (2-3 providers review section list)
- [ ] Stakeholder alignment (providers, MAs, billing, IT)
- [ ] Start Tier 1 physical performance screening (grip + STS at every visit by MA)
- [ ] Purchase Jamar dynamometer (~$300)

### Success Criteria
- Written success metrics document
- 2+ providers have reviewed and approved the 37-section domain structure
- MA workflow for Tier 1 screening piloted

---

## Phase 1: Section Registry JSON Schema

**Duration**: 1-2 weeks | **Dependencies**: Phase 0 approval

### Deliverables
- [ ] `schemas/section-registry.json` - complete JSON schema for all 37 sections
- [ ] `schemas/field-types.json` - enum definitions, validation rules
- [ ] `schemas/agent-config.json` - agent assignments and prompt templates
- [ ] Unit tests validating schema completeness and consistency
- [ ] Migration mapping: every legacy SmartList ID -> new field_id (Part 7 of this document)

### Success Criteria
- Schema passes validation
- Every field from current smart phrase has a mapping
- Every card maps to at least one section

---

## Phase 1.5: Paper Prototype

**Duration**: 1-2 weeks (overlaps with Phase 1) | **Dependencies**: Section list approved (Phase 0)

### Deliverables
- [ ] Print draft cards (paper mockups) for 5-10 highest-priority cards
- [ ] Conduct 3-5 mock patient visits with providers using paper cards
- [ ] Document feedback: what works, what's missing, what's overwhelming
- [ ] Revise section list and field definitions based on feedback

### Success Criteria
- Providers confirm the 37 sections feel intuitive on paper
- No section removal/addition needed after testing
- Time estimate: mock visit completes in target timeframe

---

## Phase 2: Digital Note Builder

**Duration**: 4-6 weeks | **Dependencies**: Phase 1 (schema)

### Deliverables
- [ ] Web application (TypeScript + React + Bun)
- [ ] Renders all 37 sections from JSON schema
- [ ] Two view modes: Initial Visit and Follow-Up (Delta Mode)
- [ ] Progressive disclosure: collapse stable sections
- [ ] Field entry for all types (number, enum, text, date, boolean)
- [ ] Dashboard summary view at top
- [ ] GDMT compliance indicator (X/4 pillars)
- [ ] Export: copy-paste-ready Epic note text
- [ ] Export: patient-facing summary (plain language)
- [ ] Export: care team task list

### Tech Stack
- Bun + React 19 + Shadcn/ui v4 + Tailwind v4
- Zustand (state), Zod (validation), TanStack Query (data fetching)
- Bun.sqlite for local data persistence

### Success Criteria
- All 37 sections render correctly
- Both view modes work
- Note output matches expected format
- Provider can complete a follow-up in <3 minutes using the builder

---

## Phase 3: Epic Template

**Duration**: 2-3 weeks | **Dependencies**: Phase 2

### Deliverables
- [ ] New SmartPhrase: `@TKECKD@` (or similar)
- [ ] All SmartLists updated/created for enum fields
- [ ] SmartLinks mapped for auto-pull fields
- [ ] Initial visit version and follow-up version
- [ ] Testing in Epic sandbox
- [ ] Migration guide from old smart phrase

### Success Criteria
- SmartPhrase renders correctly in Epic
- Auto-pull fields populate from chart data
- Provider can use it for real patient encounters

---

## Phase 4: Core AI Agents (6-10)

**Duration**: 4-6 weeks | **Dependencies**: Phase 1 (schema), Phase 2 (builder for testing)

### Deliverables
- [ ] Orchestrator agent
- [ ] kidney_function_agent
- [ ] bp_fluid_agent
- [ ] heart_failure_agent
- [ ] pharmacotherapy_agent (4 Pillars + Lipids)
- [ ] complications_agent (Anemia, MBD, Electrolytes, Gout, DM, Obesity)
- [ ] medication_safety_agent (Risk Mitigation + Triple Whammy + Adherence)
- [ ] planning_screening_agent
- [ ] Test suite: 50+ test cases per agent (gold standard notes)
- [ ] Confidence scoring and "REVIEW NEEDED" flagging

### Success Criteria
- Agents generate clinically appropriate interpretations
- Interpretations match expected output for test cases
- No hallucinated lab values or medication recommendations
- Average generation time <5 seconds per section

---

## Phase 5: Pre-Visit Engine

**Duration**: 3-4 weeks | **Dependencies**: Phase 4 (agents), Phase 2 (builder)

### Deliverables
- [ ] Lab data ingestion (API or manual import)
- [ ] Medication list ingestion
- [ ] Previous note parsing -> field extraction
- [ ] Auto-population of all available fields
- [ ] Care gap detection (overdue labs, missing screenings, med gaps)
- [ ] Pre-visit brief generation

### Success Criteria
- 80%+ of fields auto-populated before provider opens note
- Care gaps accurately identified
- Pre-visit brief is useful and concise

---

## Phase 6: Report Card + Final Card Designs

**Duration**: 3-4 weeks | **Dependencies**: Phase 2 (schema stable)

### Deliverables
- [ ] Physical report card design (1:1 with digital note)
- [ ] All 42 card designs (front + back)
- [ ] Print-ready files (size TBD from Phase 1.5 feedback)
- [ ] OCR field mapping document
- [ ] QR code content for each card (links to education)

### Success Criteria
- Every card maps cleanly to its note section(s)
- OMR checkboxes are OCR-scannable (test with scanner)
- Patient education content validated at 6th-grade reading level

---

## Phase 7: Virtual Scribe + OCR Scanning

**Duration**: 4-6 weeks | **Dependencies**: Phase 4 (agents), Phase 6 (cards)

### Deliverables
- [ ] Whisper/transcription integration for encounter audio
- [ ] Extraction pipeline: transcription -> structured fields
- [ ] OCR scanning pipeline: physical cards -> digital fields
- [ ] Verification UI: human reviews extracted data before acceptance
- [ ] Error handling and confidence scoring

### Success Criteria
- Transcription extraction accuracy >90% for key fields
- OCR accuracy >95% for OMR checkboxes
- Human verification step catches errors before note generation

---

## Phase 8: Full AI Agent Expansion

**Duration**: 4-6 weeks | **Dependencies**: Phase 4 (core agents proven)

### Deliverables
- [ ] Split pharmacotherapy_agent -> RAAS, SGLT2i, MRA, GLP-1 specialists
- [ ] Split complications_agent -> anemia, MBD, electrolytes specialists
- [ ] Add dedicated nutrition_agent
- [ ] Add dedicated physical_performance_agent
- [ ] Add dedicated transplant_agent
- [ ] Regression testing: all existing test cases still pass
- [ ] Performance monitoring dashboard

### Success Criteria
- Specialized agents produce higher-quality output than generalist
- No regression in existing functionality
- System handles 50+ encounters/day without degradation

---

## Phase 9: Renal Performance Clinic (Tier 2/3)

**Duration**: 6-8 weeks | **Dependencies**: Core system stable, Tier 1 screening data available

### Deliverables
- [ ] Formal assessment protocol (full SPPB, 6MWT, frailty scoring)
- [ ] Referral pathway from Tier 1 screening
- [ ] Billing/coding setup (CPT 97750, 97161-63, 97110, 97112)
- [ ] Cash-pay longevity performance panel ($200-350)
- [ ] Staffing plan (exercise physiologist or PT partnership)
- [ ] Patient education materials
- [ ] Outcome tracking (performance trends over time)

### Success Criteria
- Tier 2 assessment operational for high-risk patients
- Billing codes validated with payers
- At least 10 patients assessed in first month

---

## Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| 0: Governance | 1-2 wk | Week 2 |
| 1: JSON Schema | 1-2 wk | Week 4 |
| 1.5: Paper Prototype | 1-2 wk | Week 5 |
| 2: Digital Note Builder | 4-6 wk | Week 10 |
| 3: Epic Template | 2-3 wk | Week 13 |
| 4: Core AI Agents | 4-6 wk | Week 16 |
| 5: Pre-Visit Engine | 3-4 wk | Week 20 |
| 6: Cards + Report Card | 3-4 wk | Week 22 |
| 7: Scribe + OCR | 4-6 wk | Week 28 |
| 8: Agent Expansion | 4-6 wk | Week 32 |
| 9: Renal Performance Clinic | 6-8 wk | Week 40 |

**Total estimated timeline: ~10 months**

Phases 4 and 2 can overlap (agents can start once schema exists). Phases 6 and 5 can overlap. Phase 1.5 runs in parallel with Phase 1.

---

# Part 11: Council Review Summary

## Review Date: 2026-02-01
## Council: GPT-5.2, GLM-4.7, Gemini-3-Pro, DeepSeek-v3.2, Grok-4.1, Claude Opus 4.5

### Rankings

| Rank | Model | Score | Key Contribution |
|------|-------|-------|-----------------|
| 1st | GPT-5.2 | 1.0 | Data model vs UI distinction; Delta Mode; 3-output model |
| 2nd | GLM-4.7 | 2.0 | Progressive Disclosure; prototype-first; "Operating System for Nephrology" |
| 3rd | Gemini-3-Pro | 4.0 | Digital-first challenge; OCR risk; SmartBlock logic |
| 4th | DeepSeek-v3.2 | 4.0 | Synthesis over summarization; MVP-first; Three-Click Rule |
| 5th | Grok-4.1 | 4.4 | Metrics-driven; JASN evidence; specific CMS measures |
| 6th | Claude Opus 4.5 | 5.6 | Broad coverage, less depth |

### Unanimous Agreements (6/6)

1. 38 sections correct for DATA MODEL; too many for UI -> Progressive disclosure adopted
2. Domain-grouped ordering (Option B) is superior
3. 4 Pillars as standalone domain
4. Triple Whammy = cross-cutting AI alert, NOT a note section
5. Furoscix = sub-field of Heart Failure (not standalone)
6. PCSK9i = sub-field of Lipid Therapy (not standalone)
7. Eversense CGM = sub-field of Diabetes
8. Same template, two VIEW MODES (Initial expanded, Follow-up delta-focused)

### Key Concepts Adopted

| Concept | Source | Description |
|---------|--------|-------------|
| **Delta Mode** | GPT-5.2 | Follow-up shows only changes; stable sections auto-collapse |
| **Three Outputs** | GPT-5.2 | Provider note, patient summary, care team task list from same data |
| **Paper Prototype First** | GLM-4.7 | "Paper is cheap; coding is expensive" |
| **Digital-First Cards** | Gemini | Don't print final cards until digital schema is stable |
| **Three-Click Rule** | DeepSeek | Any data point reachable in <=3 interactions |
| **Operating System for Nephrology** | GLM-4.7 | This system IS the operating system, not just a note |

### Disagreements and Resolutions

| Topic | Consolidate | Keep Many | Resolution |
|-------|------------|-----------|-----------|
| AI Agent Count | GLM, Gemini (5-7) | Claude, DeepSeek (15-20) | Start 8, expand to 12-15 (GPT-5.2) |
| Hematuria + GU History | Gemini, Claude (merge) | GPT, GLM, Grok, DeepSeek (separate) | Keep separate (4/6 majority) |
| Renal Performance Priority | GLM, Claude (early) | GPT, DeepSeek, Gemini, Grok (after core) | Tier 1 Phase 0; Tier 2/3 Phase 9 |

### Missing Sections Identified by Council

| Section | Flagged By | Resolution |
|---------|-----------|------------|
| Nutrition / Dietary Assessment | GLM, GPT-5.2, Gemini, DeepSeek, Grok | **ADDED** as Section 34 |
| Medication Adherence & Barriers | GPT-5.2, Claude, DeepSeek | **ADDED** as Section 35 |
| AKI History / AKI-CKD Transition | GPT-5.2, Grok | **ADDED** as sub-field of Kidney Function |
| Cognitive Function / Dementia | DeepSeek | **ADDED** as sub-field of Depression Screen |
| Pruritus | DeepSeek | **ADDED** as sub-field of Electrolytes |
| Pregnancy / Contraception | GPT-5.2 | **ADDED** as conditional field in Med Adherence |
| Vein Preservation | Gemini | **ADDED** as sub-field of Dialysis Planning |

### Risk Mitigation (Top 7)

1. **Provider Adoption** -> Co-design with champions, prove time savings
2. **Note Bloat** -> Delta Mode, progressive disclosure, strict output budgets
3. **AI Hallucination** -> Citations to source, locked templates, confidence scoring
4. **Epic Integration** -> Prototype in sandbox early, dedicated Epic analyst
5. **OCR Reliability** -> Human verification step before note acceptance
6. **Data Integrity Drift** -> One authoritative registry, versioning, automated tests
7. **Privacy/HIPAA** -> BAAs, access controls, retention policies, audit trails

---

# Part 12: Tech Stack & Conventions

## Technology Choices

| Component | Technology | Notes |
|-----------|-----------|-------|
| Section Registry | JSON Schema | Single source of truth |
| Digital Note Builder | TypeScript + React 19 + Bun | Shadcn/ui v4, Tailwind v4 |
| AI Agents | LLM-based (multi-provider) | OpenRouter, Anthropic, Google, OpenAI |
| Physical Cards | Print design (size TBD) | OCR-optimized, OMR checkboxes |
| Epic Integration | SmartPhrase + paste (Phase 1); FHIR future | DVA CKD environment |
| Data Storage | Bun.sqlite (dev) or PostgreSQL (prod) | Patient encounter data |
| State Management | Zustand (client), TanStack Query (server) | - |
| Validation | Zod | Runtime + TypeScript types |
| Forms | React Hook Form + Zod | - |
| Icons | Lucide React | - |
| Animations | Framer Motion | - |

## Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Section IDs | `snake_case` | `kidney_function`, `raas_inhibition` |
| Card Codes | `TKE-XXXX` | `TKE-RAAS`, `TKE-SGLT` |
| Field IDs | `snake_case` within section | `egfr_current`, `bp_control_status` |
| Field Types | Lowercase enum | `number`, `enum`, `text`, `date`, `boolean`, `calculated` |
| Source Types | Lowercase enum | `labs_api`, `med_list`, `vitals`, `provider`, `patient`, `calculated`, `previous_note`, `fax_manager`, `ocr_scan`, `transcription` |
| Agent IDs | `snake_case` suffix `_agent` | `kidney_function_agent`, `orchestrator` |
| Domain Colors | Hex codes | `#3B82F6` (Blue), `#EF4444` (Red) |

## Clinical Standards

- All clinical content follows **KDIGO 2024-2025** guidelines unless noted
- Drug references include **generic name + common brand**
- Lab ranges include **units and target values**
- All targets are **evidence-based with citation**
- Patient education at **6th grade reading level** (Flesch-Kincaid)

## Change Management

- Proposals go in `changes/<change-id>/proposal.md`
- Status lifecycle: `DRAFT -> PROPOSED -> APPROVED -> IMPLEMENTING -> COMPLETE`
- Archive completed changes to `changes/archive/`

## Key Clinical References

- KDIGO 2024 CKD Guidelines
- KDIGO 2024 BP in CKD
- KDIGO Anemia in CKD
- KDIGO CKD-MBD
- KDIGO Electrolytes
- AHA/ACC Heart Failure Guidelines
- ADA Standards of Care 2025
- EWGSOP2 Sarcopenia Criteria (2019)
- Fried Frailty Phenotype
- CREDENCE, DAPA-CKD, EMPA-KIDNEY, FLOW trials (SGLT2i)
- FIDELIO-DKD, FIGARO-DKD, CONFIDENCE trials (Finerenone)
- SPRINT trial (BP targets)

---

# Appendix A: Existing Card Files

Location: `development/TALIA/tke-provider-workload-offload/cards/`

| File | Card Code | Type | Description |
|------|-----------|------|-------------|
| `nsaids.md` | TKE-NSAI | Clinical | NSAID Avoidance (Red) - Triple Whammy check, alternatives |
| `ppis.md` | TKE-PPI | Clinical | PPI Deprescribing (Purple) - Chronic use management |
| `tobacco.md` | TKE-SMOK | Clinical | Tobacco Cessation (Green) - CPT codes, QuitLine resources |
| `statins.md` | TKE-STAT | Clinical | Statins/PCSK9i (Blue) - KDIGO guidelines, Repatha/Leqvio info |
| `anemia.md` | TKE-ANEM | Clinical | Anemia/Blood Health (Orange) - Hb thresholds, referral criteria |
| `sleep-apnea.md` | TKE-SLAP | Clinical | Sleep Apnea (Teal) - STOP-BANG questionnaire |
| `triple-whammy.md` | TKE-TRIP-CARD | Workflow | Triple Whammy Alert - RAASi + Diuretic + NSAID warning |
| `receptionist-triage.md` | TKE-TRIAGE | Workflow | Receptionist triage checklist - Mini-triage at check-in |
| `provider-quick-reference.md` | TKE-PROVQR | Workflow | Provider reference - All thresholds, escalation triggers |
| `leqvio-patient-faq.md` | - | FAQ | Patient FAQ for Leqvio (PCSK9i in-clinic injection) |
| `all-cards-printable.html` | - | Print | TKE branded printable version, 5.5"x8.5" |

---

# Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **4 Pillars** | The four core pharmacotherapy classes for CKD: RAAS inhibitor, SGLT2i, MRA (finerenone), GLP-1 RA |
| **ACP** | Advance Care Planning |
| **CCM** | Chronic Care Management (CMS billing program, CPT 99490/99439) |
| **CRS** | Cardiorenal Syndrome (Types 1-5) |
| **Delta Mode** | Follow-up view showing only changed/abnormal items since last visit |
| **DVA CKD** | DaVita CKD EHR (Epic-based platform) |
| **EWGSOP2** | European Working Group on Sarcopenia in Older People, 2nd edition (2019) |
| **GDMT** | Guideline-Directed Medical Therapy |
| **KFRE** | Kidney Failure Risk Equation (Tangri 2011, 2016) |
| **KDIGO** | Kidney Disease: Improving Global Outcomes (guideline body) |
| **MRA** | Mineralocorticoid Receptor Antagonist (finerenone, spironolactone, eplerenone) |
| **OMR** | Optical Mark Recognition (filled circles on paper cards) |
| **Progressive Disclosure** | UI pattern: show overview first, expand on interaction |
| **Report Card** | Physical card completed by MA summarizing patient status across all domains |
| **Section Registry** | JSON schema defining all 37 sections - the single source of truth |
| **SmartList** | Epic dropdown selection element with defined ID |
| **SmartLink** | Epic tag that auto-populates from chart data (e.g., `@GFR@`) |
| **SPPB** | Short Physical Performance Battery (balance + gait + chair stands, 0-12) |
| **TALIA** | TKE's AI/automation ecosystem |
| **Tier 1/2/3** | Renal Performance Clinic levels (screening / assessment / rehab) |
| **TKE** | The Kidney Experts, PLLC |
| **Triple Whammy** | Concurrent use of RAASi + Diuretic + NSAID (AKI risk) |
| **TUG** | Timed Up and Go test (stand, walk 3m, turn, return, sit) |
| **View Mode** | Initial visit (all expanded) vs Follow-up (delta/exception-based) |

---

# Appendix C: Clinical Evidence Base

## Physical Performance in CKD

| Study/Source | Finding |
|-------------|---------|
| Isoyama et al. (2014) Kidney Int | Low grip strength independently predicts mortality in CKD G5D |
| Roshanravan et al. (2013) JASN | Gait speed <0.8 m/s associated with 2.2x mortality risk in CKD |
| Painter et al. (2013) AJKD | Exercise training improves physical function in CKD patients |
| K/DOQI Clinical Practice Guidelines | Resistance and aerobic exercise recommended for all CKD stages |
| EWGSOP2 (2019) | Grip strength thresholds: Men <27kg, Women <16kg for sarcopenia |
| Fried et al. (2001) J Gerontol | Frailty phenotype: >=3/5 criteria = frail, 1-2 = pre-frail |
| Guralnik et al. (1994) NEJM | SPPB <=9 predicts disability; <=7 predicts hospitalization |

## Key Nephrology Trials Referenced

| Trial | Drug/Intervention | Key Finding |
|-------|------------------|-------------|
| CREDENCE | Canagliflozin | 30% reduction in kidney events in DKD |
| DAPA-CKD | Dapagliflozin | 39% reduction in kidney events in CKD +/- DM |
| EMPA-KIDNEY | Empagliflozin | 28% reduction in kidney progression |
| FLOW | Semaglutide | 24% reduction in kidney events in DKD |
| FIDELIO-DKD | Finerenone | 18% reduction in kidney events |
| FIGARO-DKD | Finerenone | 13% reduction in CV events |
| CONFIDENCE | Finerenone + SGLT2i | Safety/efficacy of combination |
| SPRINT | Intensive BP | SBP <120 reduces CV events and mortality |

---

# Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-01 | Initial OpenSpec suite (5 separate spec files) |
| 2.0 | 2026-02-02 | Consolidated into single master plan. Added: Epic migration table (Part 7), Renal Performance Clinic details (Part 8), Fax Manager cross-reference (Part 9), Clinical evidence base (Appendix C). Fixed Domain 8/9 numbering (Nutrition moved to Domain 8). Archived individual specs to `changes/archive/v1-individual-specs/`. |
