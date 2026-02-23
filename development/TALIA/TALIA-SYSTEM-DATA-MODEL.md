# TALIA System Data Model

> **Version**: 1.0  
> **Last Updated**: February 23, 2026  
> **Scope**: All 6 TALIA subprojects  
> **Full Reference**: [TALIA-SYSTEM-DATA-MODEL-FULL.md](TALIA-SYSTEM-DATA-MODEL-FULL.md)

---

## 1. What is TALIA

TALIA is a **card-based, pod-centric Care Delivery Operating System** for West Tennessee Nephrology (The Kidney Experts). It replaces the traditional clinic workflow with a structured system where patients sit once in a pod, staff rotate through stations, and every clinical interaction is captured on physical cards that feed into digital tracking.

**BHAG**: "Ridding the World of the Need for Dialysis!"  
**Constraints**: $20K budget, AppSheet + Google Sheets + Chromebooks, Jackson TN pilot site  
**Core Principles**: 95% Rule (staff handles 95% of visit), Barista Model (consistent quality every time), Single Source of Truth

---

## 2. System Architecture

```
+===========================================================================+
|                        TALIA ECOSYSTEM                                     |
+===========================================================================+
|                                                                           |
|  PHYSICAL LAYER                    DIGITAL LAYER                          |
|  ~~~~~~~~~~~~~~                    ~~~~~~~~~~~~~                          |
|                                                                           |
|  +-------------------+            +----------------------------------+    |
|  | Physical Cards    |   entry    | talia-quality-metrics             |    |
|  | 4 Core + 12 Module|----------->| 13 AppSheet Tables               |    |
|  | (paper, 5x7)      |            | (Google Sheets backend)          |    |
|  +-------------------+            +----------------------------------+    |
|         |                                    |                            |
|         | same card                          | patient data               |
|         | content                            | quality scores             |
|         v                                    v                            |
|  +-------------------+            +----------------------------------+    |
|  | talia-impl-plan   |            | tke-ckd-note-template            |    |
|  | Card specs, SOPs, |            | 37 Note Sections                 |    |
|  | Pod model, Roles  |            | 42 Physical Cards                |    |
|  +-------------------+            | 8 AI Sub-Agents                  |    |
|                                   | (TypeScript + AI)                |    |
|                                   +----------------------------------+    |
|                                              |                            |
|  ASSESSMENT LAYER                            | pre-visit data             |
|  ~~~~~~~~~~~~~~~~                            | care gaps                  |
|                                              v                            |
|  +-------------------+            +----------------------------------+    |
|  | tke-provider-     |  content   | tke-clinical-training            |    |
|  | workload-offload  |----------->| 8 PostgreSQL Tables              |    |
|  | 9 AppSheet Tables |  scripts   | 5 Modules, 250 Questions         |    |
|  | (Assessments)     |            | (SvelteKit + PostgreSQL)         |    |
|  +-------------------+            +----------------------------------+    |
|         |                                    |                            |
|         | escalations                        | trained staff              |
|         v                                    v                            |
|  +-------------------+            +----------------------------------+    |
|  | Provider Review   |            | tke-training-chat                |    |
|  | (in AppSheet)     |            | AI Q&A Interface                 |    |
|  +-------------------+            | (Next.js + AI SDK)               |    |
|                                   +----------------------------------+    |
|                                                                           |
|  EXTERNAL INTEGRATIONS                                                    |
|  ~~~~~~~~~~~~~~~~~~~~~                                                    |
|  Epic EHR (CSV import) | CMS NPI Registry | 7 Transplant Centers         |
|                                                                           |
+===========================================================================+
```

### Data Flow Summary

```
Patient Visit
    |
    v
Physical Cards (MA fills at bedside)
    |
    v
Scribe enters into AppSheet  ------>  Quality Metrics calculated
    |                                         |
    v                                         v
Google Sheets (backend)              Dashboards & Scorecards
    |
    v
CKD Note Template (AI agents pull data, generate note)
    |
    +---> Provider Note (billing/legal)
    +---> Patient Summary (take-home)
    +---> Care Team Task List (follow-up)
```

---

## 3. Project Summary

| # | Project | Purpose | Tech Stack | Tables | Status |
|---|---------|---------|------------|--------|--------|
| 1 | **talia-implementation-plan** | Master plan: card specs, pod model, roles, rollout | Documentation only | ~9 conceptual | Planning |
| 2 | **talia-quality-metrics** | Patient tracking, quality measures, transplant workflow | AppSheet + Google Sheets + Python + Inngest | 13 production | Active |
| 3 | **tke-provider-workload-offload** | MA-led assessments: NSAIDs, PPIs, Tobacco, Statins, Anemia, Sleep Apnea | AppSheet + Google Sheets | 9 production | Active |
| 4 | **tke-ckd-note-template** | AI-era CKD clinic note: structured sections + AI agents | TypeScript + React + AI | 37 sections + 42 cards | Design |
| 5 | **tke-clinical-training** | Staff training: quizzes, practice, JIT reference cards | SvelteKit + PostgreSQL + Gemini | 8 production | Active |
| 6 | **tke-training-chat** | AI-powered Q&A for clinical training | Next.js + AI SDK | Unknown | Built |

---

## 4. Shared Entities

### Patient (appears in 4 systems)

The Patient entity exists in multiple systems with different schemas. **talia-quality-metrics** is the **source of truth** for patient demographics and clinical status.

| System | Table Name | Key Fields | Role |
|--------|-----------|------------|------|
| quality-metrics | `Patients` | 90+ fields: demographics, CKD, dialysis, transplant, comorbidities, insurance | **Source of truth** |
| workload-offload | `Patients` | 12 fields: demographics, CKD stage, location, provider | Lightweight reference |
| ckd-note-template | `header` section | visit context, CKD stage, GDMT compliance | Per-visit snapshot |
| implementation-plan | `Patients` | Conceptual: demographics, CKD, transplant status | Design reference |

**Reconciliation**: The workload-offload Patients table is a denormalized subset of quality-metrics. Future integration should sync from quality-metrics as master.

### Provider (appears in 3 systems)

| System | Table Name | Key Fields | Role |
|--------|-----------|------------|------|
| quality-metrics | `Providers` | 50+ fields: NPI, credentials, specialties, contact | **Source of truth** |
| workload-offload | `Providers` (implicit) | Referenced by Encounters and Patients | Lightweight reference |
| implementation-plan | `Providers` | Conceptual: name, type, active | Design reference |

### Clinical Modules (overlap between 3 systems)

| Module Topic | Workload Offload | CKD Note Template | Clinical Training |
|-------------|-----------------|-------------------|-------------------|
| NSAIDs | `NSAID_Assessments` table | Section 19 (`nsaid`) | Module `nsaids` |
| PPIs | `PPI_Assessments` table | Section 20 (`ppi`) | Module `ppis` |
| Tobacco | `Tobacco_Assessments` table | Section 18 (`tobacco`) | Module `tobacco` |
| Statins/PCSK9i | `Statin_Assessments` table | Section 7 (`lipid_therapy`) | Module `statins` |
| Anemia | `Anemia_Assessments` table | Section 15 (`anemia`) | Module `anemia-sleep` |
| Sleep Apnea | `SleepApnea_Assessments` table | Section 31 (`sleep_apnea`) | Module `anemia-sleep` |
| Leqvio | `LeqvioInjections` table | -- | -- |
| Diabetes | -- (planned) | Section 12 (`diabetes`) | -- |
| Heart Failure | -- (planned) | Section 6 (`heart_failure`) | -- |
| Gout | -- (planned) | Section 13 (`gout`) | -- |
| Transplant | -- | Section 24 (`transplant`) | -- |
| Dialysis | -- | Section 25 (`dialysis`) | -- |
| BP/Fluid | -- | Section 5 (`bp_fluid`) | -- |

**Pattern**: Workload-offload defines the MA-led assessment workflow. Clinical-training teaches staff how to do it. CKD-note-template documents the provider's clinical decision. Quality-metrics tracks the outcome.

---

## 5. Per-Project Data Model Summaries

### 5a. Implementation Plan (Conceptual Layer)

The master plan defines TALIA's physical and operational model. Its "data model" is conceptual -- it describes what tables should exist, not production schemas.

**Card System**:

| Card Type | Count | Used By | Timing |
|-----------|-------|---------|--------|
| Core Cards | 4 | Every visit | Always |
| Module Cards | 12 | Condition-specific | When triggered |

**4 Core Cards** (every visit):

| # | Card | Station | Filled By | Key Data |
|---|------|---------|-----------|----------|
| 1 | Measurement | Station 1 | MA | Weight, BP, HR, edema, O2 sat, pain |
| 2 | Assessment | Station 2 | MA | Chief concern, hospitalizations, symptoms, med changes, module triggers |
| 3 | Intervention | Station 4 | Scribe | CKD stage, GDMT decisions, med changes, labs, referrals |
| 4 | Patient Summary | Station 5 | MA | Numbers today, action items, medications, next appointment |

**12 Module Cards**: NSAIDs, Gout/Krystexxa, Diabetes, BP Control, Heart Failure, Anemia, Pre-Dialysis, Transplant, Dialysis, Bone Mineral, AKI Follow-up, New Patient

**Conceptual Tables**: Patients, Visits, Cards, Measurements, GDMT_Status, Quality_Metrics, Providers, Staff, Module data tables (one per module)

**Pod Model**: 3 pods, 4 roles (MA, Scribe, Provider, Front Desk), 5 stations per visit

> Full card field definitions: [TALIA-SYSTEM-DATA-MODEL-FULL.md, Section A1](TALIA-SYSTEM-DATA-MODEL-FULL.md#a1-implementation-plan-conceptual-tables)

---

### 5b. Quality Metrics (13 AppSheet Tables, 14,305 lines)

The production data backbone. All clinical tracking flows through these tables.

| # | Table | Fields | Key Relationships |
|---|-------|--------|-------------------|
| 1 | **Patients** | 90+ | Central entity; refs to Providers |
| 2 | **Providers** | 50+ | Referenced by all clinical tables |
| 3 | **CKD_Stage_History** | 40+ | patient_ref, ordering_provider_ref |
| 4 | **Medications** | 60+ | patient_ref, prescribing_provider_ref |
| 5 | **Lab_Results** | 120+ | patient_ref, ordering_provider_ref |
| 6 | **Vascular_Access** | 60+ | patient_ref, placing_surgeon_ref |
| 7 | **Transplant_Referrals** | 50+ | patient_ref, referring_provider_ref |
| 8 | **Workup_Templates** | 30+ | Standalone reference table |
| 9 | **Workup_Items** | 40+ | referral_ref, template_item_ref |
| 10 | **Transplant_Events** | 40+ | referral_ref, patient_ref |
| 11 | **Living_Donor_Evaluations** | 50+ | recipient_ref, coordinator_ref |
| 12 | **Quality_Metrics_Snapshot** | 60+ | patient_ref, provider_ref |
| 13 | **Epic_Import_Staging** | 70+ | matched_patient_ref |

**6 Bots (automated triggers)**:
1. Update Patient CKD Stage from History
2. Update Dialysis Status from CKD Stage
3. Update Transplant Flag from Referrals
4. Update uACR from Labs
5. Auto-Create Workup Items from Templates
6. Calculate Workup Expiry

> Full schema reference: [talia-quality-metrics/docs/complete-schema-reference.md](talia-quality-metrics/docs/complete-schema-reference.md)  
> Full field-level detail: [TALIA-SYSTEM-DATA-MODEL-FULL.md, Section A2](TALIA-SYSTEM-DATA-MODEL-FULL.md#a2-quality-metrics-13-appsheet-tables)

---

### 5c. Provider Workload Offload (9 AppSheet Tables)

MA-led clinical assessment system. Digitizes the physical assessment cards for structured data capture.

```
Patients (reference)
    |
    v
Encounters (one per visit)
    |
    +---> NSAID_Assessments
    +---> PPI_Assessments
    +---> Tobacco_Assessments
    +---> Statin_Assessments
    +---> Anemia_Assessments
    +---> SleepApnea_Assessments
    +---> LeqvioInjections (also linked directly to Patients)
```

| # | Table | Key Computed Fields | Escalation Triggers |
|---|-------|--------------------|--------------------|
| 1 | **Patients** | Age (from DOB) | -- |
| 2 | **Encounters** | -- | Status = Escalated |
| 3 | **NSAID_Assessments** | TripleWhammyPresent | Triple Whammy = immediate provider alert |
| 4 | **PPI_Assessments** | HasContraindication, NeedsEGDFirst | Contraindication or long-term use |
| 5 | **Tobacco_Assessments** | PackYears, BillingCode (99406/99407) | -- |
| 6 | **Statin_Assessments** | QualifiesForStatin, PCSK9iEligible | PCSK9i interest = provider rx needed |
| 7 | **Anemia_Assessments** | GIScreenPositive, NeedsReferral | GI bleeding = immediate escalation |
| 8 | **SleepApnea_Assessments** | STOPBANGScore, RiskLevel | High risk = mandatory referral |
| 9 | **LeqvioInjections** | NextDoseDate, DoseStatus | Overdue >90 days = restart loading |

> Full field-level detail: [TALIA-SYSTEM-DATA-MODEL-FULL.md, Section A3](TALIA-SYSTEM-DATA-MODEL-FULL.md#a3-provider-workload-offload-9-appsheet-tables)

---

### 5d. CKD Note Template (37 Sections, 42 Cards, 8 AI Agents)

AI-era clinical documentation. One section registry drives everything: physical cards, digital note, AI agents, patient summary, care team tasks.

**9 Domains, 37 Sections**:

| Domain | Color | Sections | AI Agent(s) |
|--------|-------|----------|-------------|
| 0. Header & Visit Context | -- | 1 section | orchestrator |
| 1. Kidney Core | Blue | 4 sections | kidney_function_agent |
| 2. Cardiovascular-Renal | Red | 3 sections | bp_fluid_agent, heart_failure_agent, cv_risk_agent |
| 3. Pharmacotherapy (4 Pillars) | Purple | 4 sections | pharmacotherapy_agent |
| 4. Metabolic | Orange | 3 sections | complications_agent |
| 5. CKD Complications | Dark Blue | 3 sections | complications_agent |
| 6. Risk Mitigation | Green | 6 sections | medication_safety_agent, nutrition_agent |
| 7. Planning & Transitions | Gray | 4 sections | planning_screening_agent |
| 8. Screening & Prevention | Teal | 7 sections | planning_screening_agent, physical_performance_agent |
| 9. Care Coordination | Pink | 3 sections | medication_safety_agent, general_ckd_agent |

**Three-Phase Encounter Model**:
1. **Pre-Visit (Automated)**: Pull labs, meds, vitals. Calculate eGFR slope, KFRE, KDIGO risk, GDMT compliance. Identify care gaps.
2. **During Visit (Human + AI)**: MA fills cards, scribe documents, virtual scribe extracts structured data, real-time safety alerts.
3. **Post-Visit (AI Generation)**: All agents generate interpretations in parallel. Orchestrator assembles 3 outputs: provider note, patient summary, care team task list.

**Three Outputs from One Data Model**:
- Provider Note (billing/legal/clinical)
- Patient Summary (6th grade reading level, take-home)
- Care Team Task List (grouped by role: MA, coordinator, billing, referrals)

> Full section registry: [TALIA-SYSTEM-DATA-MODEL-FULL.md, Section A4](TALIA-SYSTEM-DATA-MODEL-FULL.md#a4-ckd-note-template-37-sections--42-cards--8-ai-agents)

---

### 5e. Clinical Training (8 PostgreSQL Tables)

Staff training platform that teaches the workflows defined in workload-offload.

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 1 | **users** | Staff accounts | firebase_uid, email, role (receptionist/ma/provider/admin) |
| 2 | **modules** | 5 training modules | slug (nsaids/ppis/tobacco/statins/anemia-sleep), question_count |
| 3 | **questions** | 250 training questions | type, difficulty, scenario (JSONB), correct_answer, explanation |
| 4 | **quiz_sessions** | Quiz attempts | user_id, module_id, mode, score, passed |
| 5 | **user_progress** | Per-module progress | practice_correct, quiz_attempts, best_score, is_completed |
| 6 | **attestations** | Completion records | attestation_type (day1/module/full), attested_at |
| 7 | **audit_log** | Compliance trail | action, resource_type, details (JSONB) |
| 8 | **cards** | JIT reference cards | slug, content (JSONB), module_id |

**Content Pipeline**:
```
tke-provider-workload-offload/training/scripts/*.md  (source content)
    |
    v  AI Processing (Gemini)
    |
    v
tke-clinical-training/packages/knowledge-base/  (250 questions)
    |
    v
PostgreSQL database  (training delivery)
```

**5 Training Modules**: NSAIDs, PPIs, Tobacco, Statins, Anemia & Sleep Apnea  
**4 Training Modes**: Practice, Quiz, Just-In-Time, Day 1 Fast-Track

> Full column-level detail: [TALIA-SYSTEM-DATA-MODEL-FULL.md, Section A5](TALIA-SYSTEM-DATA-MODEL-FULL.md#a5-clinical-training-8-postgresql-tables)

---

### 5f. Training Chat

AI-powered Q&A interface. Built artifact exists (Next.js + AI SDK with Anthropic/OpenAI providers). No source code available for schema analysis.

**Known**: Next.js, AI SDK (@ai-sdk/react, @ai-sdk/anthropic, @ai-sdk/openai), React 19, Zustand  
**Unknown**: Database schema, conversation storage, knowledge base structure

---

## 6. Cross-Project Integration Map

### Current Integrations (Active)

| Source | Target | Data | Mechanism |
|--------|--------|------|-----------|
| Physical cards | quality-metrics AppSheet | All clinical data | Manual scribe entry |
| workload-offload training scripts | clinical-training questions | Training content | AI generation (Gemini) |
| workload-offload cards | clinical-training JIT cards | Quick reference | Manual curation |
| CMS NPI Registry | quality-metrics Providers | Provider data | Python script (API) |
| Epic EHR | quality-metrics Epic_Import_Staging | Patient demographics | CSV export/import |

### Planned Integrations (Future)

| Source | Target | Data | Mechanism |
|--------|--------|------|-----------|
| quality-metrics | ckd-note-template | Labs, meds, vitals, CKD stage | API / pre-visit pull |
| quality-metrics | workload-offload Patients | Demographics sync | AppSheet sync |
| ckd-note-template | quality-metrics | Quality metrics extraction | Post-visit update |
| ckd-note-template | Epic SmartPhrase | Provider note | SmartPhrase generation |
| Physical cards | quality-metrics | Card data | OCR pipeline (Phase 2) |
| clinical-training attestations | quality-metrics | Staff readiness | Future integration |
| fax-manager | ckd-note-template | Lab alerts, safety rules | Real-time alerts |

### Integration Architecture (Target State)

```
                    Epic EHR
                   /        \
                  / CSV       \ SmartPhrase
                 v             ^
    +--quality-metrics--+    +--ckd-note-template--+
    | Source of Truth    |--->| AI Documentation     |
    | for patient data   |<---| engine               |
    +-------------------+    +---------------------+
         |       ^                    ^
         |       |                    |
         v       |                    |
    +--workload-offload-+    +--clinical-training--+
    | MA assessments     |    | Staff readiness      |
    | at point of care   |--->| tracking             |
    +-------------------+    +---------------------+
                                      ^
                                      |
                              +--training-chat--+
                              | AI Q&A          |
                              +-----------------+
```

---

## 7. Master Entity Index

Every table/entity across all TALIA projects, sorted alphabetically.

| Entity | Project | Type | Fields | Description |
|--------|---------|------|--------|-------------|
| Anemia_Assessments | workload-offload | AppSheet | 22 | Hb screening, GI bleed check, referral |
| attestations | clinical-training | PostgreSQL | 8 | Training completion records |
| audit_log | clinical-training | PostgreSQL | 10 | Compliance audit trail |
| Cards (conceptual) | implementation-plan | Concept | ~10 | Generic card data container |
| cards | clinical-training | PostgreSQL | 10 | JIT reference cards |
| CKD_Stage_History | quality-metrics | AppSheet | 40+ | KDIGO staging over time |
| Encounters | workload-offload | AppSheet | 8 | Per-visit parent for assessments |
| Epic_Import_Staging | quality-metrics | AppSheet | 70+ | Epic data import/merge workflow |
| GDMT_Status (conceptual) | implementation-plan | Concept | ~10 | GDMT medication tracking |
| Lab_Results | quality-metrics | AppSheet | 120+ | Comprehensive lab tracking |
| LeqvioInjections | workload-offload | AppSheet | 22 | PCSK9i injection tracking |
| Living_Donor_Evaluations | quality-metrics | AppSheet | 50+ | Donor evaluation workflow |
| Measurements (conceptual) | implementation-plan | Concept | ~10 | Vitals from card data |
| Medications | quality-metrics | AppSheet | 60+ | GDMT and nephrology meds |
| modules | clinical-training | PostgreSQL | 10 | 5 training modules |
| NSAID_Assessments | workload-offload | AppSheet | 19 | NSAID use screening |
| Patients | quality-metrics | AppSheet | 90+ | **Master patient record** |
| Patients | workload-offload | AppSheet | 12 | Lightweight patient reference |
| PPI_Assessments | workload-offload | AppSheet | 21 | PPI deprescribing assessment |
| Providers | quality-metrics | AppSheet | 50+ | **Master provider record** |
| Quality_Metrics (conceptual) | implementation-plan | Concept | ~10 | Quality indicators |
| Quality_Metrics_Snapshot | quality-metrics | AppSheet | 60+ | Point-in-time quality scores |
| questions | clinical-training | PostgreSQL | 18 | 250 training questions |
| quiz_sessions | clinical-training | PostgreSQL | 16 | Quiz attempt tracking |
| Section Registry | ckd-note-template | JSON | 37 sections | Note section definitions |
| SleepApnea_Assessments | workload-offload | AppSheet | 22 | STOP-BANG screening |
| Staff (conceptual) | implementation-plan | Concept | ~5 | Staff registry |
| Statin_Assessments | workload-offload | AppSheet | 19 | Statin/PCSK9i eligibility |
| Tobacco_Assessments | workload-offload | AppSheet | 18 | Tobacco cessation + billing |
| Transplant_Events | quality-metrics | AppSheet | 40+ | Milestones and complications |
| Transplant_Referrals | quality-metrics | AppSheet | 50+ | Multi-center referral tracking |
| user_progress | clinical-training | PostgreSQL | 12 | Per-module learning progress |
| users | clinical-training | PostgreSQL | 11 | Staff accounts (Firebase auth) |
| Vascular_Access | quality-metrics | AppSheet | 60+ | Dialysis access management |
| Visits (conceptual) | implementation-plan | Concept | ~12 | Patient encounters |
| Workup_Items | quality-metrics | AppSheet | 40+ | Per-patient workup checklist |
| Workup_Templates | quality-metrics | AppSheet | 30+ | Standard workup definitions |

**Totals**: ~37 distinct entities across 5 projects (excluding training-chat)

---

## 8. Master Enum Index

Key enumerations used across the TALIA ecosystem, grouped by clinical domain.

### CKD Staging (KDIGO 2024)

| Enum | Values | Used In |
|------|--------|---------|
| GFR Stage | G1, G2, G3a, G3b, G4, G5, G5D_HD, G5D_PD, G5D_HHD, Transplant, Transplant_Failed | quality-metrics |
| CKD Stage (simplified) | Stage 1-5, Dialysis | workload-offload |
| Albuminuria | A1 (<30), A2 (30-300), A3 (>300 mg/g) | quality-metrics |
| KDIGO Risk | Low, Moderately_Increased, High, Very_High | quality-metrics |
| CKD Etiology | Diabetic_Nephropathy, Hypertensive_Nephrosclerosis, Glomerulonephritis, PKD, Obstructive_Uropathy, IgA_Nephropathy, FSGS, Lupus_Nephritis, ANCA_Vasculitis, Membranous_Nephropathy, Alport_Syndrome, +5 more | quality-metrics |

### Dialysis

| Enum | Values | Used In |
|------|--------|---------|
| Modality | HD_In_Center, HD_Home, PD_CAPD, PD_APD, CRRT | quality-metrics |
| Access Type | AVF, AVG, Tunneled_Catheter, Non_Tunneled_Catheter, PD_Catheter | quality-metrics |

### Transplant

| Enum | Values | Used In |
|------|--------|---------|
| Candidacy Status | Not_Evaluated, Being_Evaluated, Approved_Not_Listed, Active_Listed, Temporarily_Inactive, Transplanted, Not_A_Candidate | quality-metrics |
| Referral Status | Referred -> Referral_Received -> Scheduling -> In_Evaluation -> Workup_Complete -> Committee_Review -> Approved_For_Listing -> Active_Listed -> Transplanted/Declined/Withdrawn | quality-metrics |
| Transplant Centers | Vanderbilt, Methodist_Memphis, Ascension_St_Thomas, UAMS, UMMC, UK_HealthCare, UofL_Health, Barnes_Jewish, SSM_Health_SLU, UAB | quality-metrics |
| Transplant Type | Deceased_Donor, Living_Related, Living_Unrelated, SPK, PAK | quality-metrics |

### Medications (GDMT)

| Enum | Values | Used In |
|------|--------|---------|
| Med Class | ACEi, ARB, ARNi, MRA, MRA_Finerenone, SGLT2i, GLP1_RA, Statin, PCSK9i, Diuretic_Loop, Diuretic_Thiazide, +20 more | quality-metrics |
| GDMT Status | On_Max, On_Submaximal, Not_On, Contraindicated | implementation-plan |

### Assessment Responses

| Enum | Values | Used In |
|------|--------|---------|
| Patient Response | Accepted, Declined, Considering, Needs_more_info | workload-offload (all assessments) |
| Encounter Status | Draft, Complete, Escalated, Provider_Reviewed | workload-offload |
| Sleep Apnea Risk | Low (0-2), Intermediate (3-4), High (5-8) | workload-offload |
| PPI Duration | <8_weeks, 2-12_months, 1-2_years, 3-5_years, >5_years | workload-offload |
| Tobacco Status | Current_daily, Current_occasional, Former_<1yr, Former_>1yr, Never | workload-offload |

### Training

| Enum | Values | Used In |
|------|--------|---------|
| User Role | receptionist, ma, provider, admin | clinical-training |
| Module Slug | nsaids, ppis, tobacco, statins, anemia-sleep | clinical-training |
| Question Type | multiple_choice, true_false, select_all, scenario | clinical-training |
| Difficulty | easy, medium, hard | clinical-training |
| Training Mode | practice, quiz, jit, day1 | clinical-training |

### Practice Locations

| Enum | Values | Used In |
|------|--------|---------|
| Location | Jackson, Dyersburg, Union_City, Covington | workload-offload, quality-metrics |

---

## 9. What's Missing (Known Gaps)

| Gap | Impact | Priority |
|-----|--------|----------|
| No unified Patient ID across systems | Cannot link quality-metrics patient to workload-offload patient programmatically | High |
| Workload-offload Patients table diverges from quality-metrics | Duplicate data, potential drift | Medium |
| CKD Note Template has no persistent database yet | Section registry is in-memory/JSON only | Medium |
| Training-chat source code missing | Cannot assess data model | Low |
| No Visits table in quality-metrics | Implementation plan calls for it, production schema doesn't have it | Medium |
| Module cards from implementation plan not all digitized | Only 6 of 12 modules exist in workload-offload | Medium |

---

*Full field-level reference: [TALIA-SYSTEM-DATA-MODEL-FULL.md](TALIA-SYSTEM-DATA-MODEL-FULL.md)*
