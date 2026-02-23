# TALIA System Data Model - Full Reference

> **Version**: 1.0  
> **Last Updated**: February 23, 2026  
> **Summary Document**: [TALIA-SYSTEM-DATA-MODEL.md](TALIA-SYSTEM-DATA-MODEL.md)  
> **Total Entities**: ~37 across 5 projects

This document contains **every table, every field, every enum, and every relationship** across the entire TALIA ecosystem. For the big-picture overview, see the summary document.

---

## Table of Contents

- [A1. Implementation Plan (Conceptual Tables)](#a1-implementation-plan-conceptual-tables)
- [A2. Quality Metrics (13 AppSheet Tables)](#a2-quality-metrics-13-appsheet-tables)
- [A3. Provider Workload Offload (9 AppSheet Tables)](#a3-provider-workload-offload-9-appsheet-tables)
- [A4. CKD Note Template (37 Sections + 42 Cards + 8 AI Agents)](#a4-ckd-note-template-37-sections--42-cards--8-ai-agents)
- [A5. Clinical Training (8 PostgreSQL Tables)](#a5-clinical-training-8-postgresql-tables)
- [A6. Cross-Reference: Shared Fields Across Systems](#a6-cross-reference-shared-fields-across-systems)

---

# A1. Implementation Plan (Conceptual Tables)

Source: `talia-implementation-plan/TALIA-IMPLEMENTATION-PLAN.md`

These are the *design-level* entities from the master plan. Not all have been implemented as production tables yet.

## A1.1 Patients (Conceptual)

| Field | Type | Description |
|-------|------|-------------|
| patient_id | Key | Unique identifier |
| first_name | Text | |
| last_name | Text | |
| dob | Date | |
| mrn | Text | EHR Medical Record Number |
| ckd_stage | Enum | 1, 2, 3A, 3B, 4, 5, ESRD |
| primary_diagnosis | Text | Etiology of CKD |
| transplant_status | Enum | Not Referred, Referred, Evaluating, Listed, Transplanted |
| primary_provider | Ref | Link to Providers |
| active | Boolean | |
| created_date | DateTime | |
| updated_date | DateTime | |

## A1.2 Visits (Conceptual)

| Field | Type | Description |
|-------|------|-------------|
| visit_id | Key | Unique identifier |
| patient_id | Ref | Link to Patients |
| visit_date | Date | |
| provider_id | Ref | Link to Providers |
| visit_type | Enum | Follow-up, New Problem, Urgent, Annual |
| pod_number | Number | 1, 2, or 3 |
| arrival_time | Time | |
| departure_time | Time | |
| measurement_card_id | Ref | Link to Cards |
| assessment_card_id | Ref | Link to Cards |
| intervention_card_id | Ref | Link to Cards |
| summary_card_id | Ref | Link to Cards |
| modules_activated | List | DM, HF, Tx, etc. |

## A1.3 Cards (Conceptual)

| Field | Type | Description |
|-------|------|-------------|
| card_id | Key | Unique identifier |
| card_type | Enum | Measurement, Assessment, Intervention, Summary, Module |
| visit_id | Ref | Link to Visits |
| patient_id | Ref | Link to Patients |
| created_by | Ref | Link to Staff |
| created_date | DateTime | |
| data | LongText | JSON blob of card fields |
| completed | Boolean | |
| reviewed | Boolean | |

## A1.4 Measurements (Conceptual, normalized from Cards)

| Field | Type | Description |
|-------|------|-------------|
| measurement_id | Key | |
| visit_id | Ref | |
| patient_id | Ref | |
| weight_lbs | Number | |
| bp_systolic | Number | Range: 60-250 |
| bp_diastolic | Number | Range: 60-250 |
| heart_rate | Number | |
| edema_grade | Enum | None, Trace, 1+, 2+, 3+, 4+ |
| edema_location | Text | |
| temp | Number | |
| o2_sat | Number | |
| pain_level | Number | 0-10 |
| pain_location | Text | |

## A1.5 GDMT_Status (Conceptual)

| Field | Type | Description |
|-------|------|-------------|
| gdmt_id | Key | |
| patient_id | Ref | |
| as_of_date | Date | |
| acei_arb_status | Enum | On Max, On Submaximal, Not On, Contraindicated |
| acei_arb_med | Text | |
| acei_arb_dose | Text | |
| sglt2i_status | Enum | On, Not On, Contraindicated |
| sglt2i_med | Text | |
| mra_status | Enum | On, Not On, Contraindicated |
| mra_med | Text | |

## A1.6 Quality_Metrics (Conceptual)

| Field | Type | Description |
|-------|------|-------------|
| metric_id | Key | |
| patient_id | Ref | |
| provider_id | Ref | |
| snapshot_date | Date | |
| bp_at_goal_130 | Boolean | |
| bp_at_goal_140 | Boolean | |
| acei_arb_compliant | Boolean | |
| sglt2i_compliant | Boolean | |
| mra_compliant | Boolean | |
| transplant_referred | Boolean | |
| transplant_listed | Boolean | |

## A1.7 Measurement Card Fields (Physical Card)

| Field | Filled By | Timing |
|-------|-----------|--------|
| Date | MA | Station 1 |
| Patient Name | MA | Station 1 |
| Weight (lbs/kg) | MA | Station 1 |
| Weight Change (auto-calc) | Computed | |
| BP Systolic/Diastolic | MA | Station 1 |
| BP Position (Seated/Standing) | MA | Station 1 |
| Heart Rate | MA | Station 1 |
| Rhythm (Regular/Irregular) | MA | Station 1 |
| Temperature (if indicated) | MA | Station 1 |
| O2 Saturation (if indicated) | MA | Station 1 |
| Edema Grade (None/Trace/1+/2+/3+/4+) | MA | Station 1 |
| Edema Location | MA | Station 1 |
| Pain Level (0-10) | MA | Station 1 |
| Pain Location | MA | Station 1 |
| MA Initials | MA | Station 1 |

**Quality Checks**: Weight change >5 lbs = alert. BP >180/110 = urgent. BP <90/60 = urgent. Edema change flagged.

## A1.8 Assessment Card Fields (Physical Card)

| Field | Type |
|-------|------|
| Visit Reason | Enum: Follow-up, New Problem, Urgent, Annual |
| Chief Concern | Free text (patient's words) |
| Hospitalization Since Last | Yes/No + Details |
| ER Visit Since Last | Yes/No + Details |
| New Diagnoses | Text |
| Surgery/Procedures | Text |
| Symptoms Checklist | Multi-select: Fatigue, SOB, Swelling, Nausea/Vomiting, Loss of appetite, Itching, Muscle cramps, Sleep problems, Confusion/Brain fog, Other |
| New Medications | Text |
| Stopped Medications | Text |
| Dose Changes | Text |
| Medication Adherence | Yes/No |
| Adherence Barriers | Text |
| Modules Activated | Multi-select |

**Module Activation Logic**:
- Diabetes: DM diagnosis OR A1C >6.5
- Heart Failure: HF diagnosis OR BNP elevated
- Transplant: CKD Stage 4+ OR on transplant list
- Pre-Dialysis: CKD Stage 4-5 OR GFR <20
- Gout: Gout diagnosis OR on Krystexxa
- NSAIDs: Any NSAID use detected
- Anemia: Hgb <10 OR on ESA
- BP Control: BP >140/90 at last visit

## A1.9 Intervention Card Fields (Physical Card)

| Field | Type |
|-------|------|
| Primary diagnosis | Text |
| CKD Stage | Enum |
| Secondary diagnoses (up to 3) | Text |
| ACEi/ARB status + action | Enum + decision |
| SGLT2i status + action | Enum + decision |
| MRA status + action | Enum + decision |
| Medications Started | Text |
| Medications Stopped | Text |
| Dose Changed | Text |
| No Changes checkbox | Boolean |
| Labs Ordered | Checkboxes + Other |
| Referrals | Transplant, Vascular, Dietitian, Other |
| Follow-up Timeframe | Enum |
| Discussion Points (3) | Text |
| Provider Signature + Date | Signature |

## A1.10 Patient Summary Card Fields (Goes Home with Patient)

| Section | Content |
|---------|---------|
| Your Numbers Today | BP, Weight, GFR with goals |
| What We Did Today | Checkboxes for actions taken |
| Your Action Items | Specific tasks for patient |
| Medications to Know | Key medications with purposes |
| Next Appointment | Date, time, lab timing |
| Contact Information | Phone number, when to call |

## A1.11 Module Card Summaries

### NSAIDs Module
- NSAIDs identified, frequency, reason
- Alternatives discussed (Acetaminophen, Topical, PT, Other)
- Education completed, outcome (Discontinued/Reduced/Declined/Referred)

### Gout/Krystexxa Module
- Gout status, uric acid, current treatment
- Krystexxa evaluation criteria and status
- Education completed

### Diabetes Module
- Type, A1C, diabetes meds, SGLT2i status
- Home glucose monitoring, hypoglycemia risk
- Education completed

### Heart Failure Module
- HF type (HFrEF/HFmrEF/HFpEF), EF, NYHA class
- Weight trend, GDMT for HF, volume assessment
- Diuretic adjustment, education

### Transplant Evaluation Module
- Transplant status, referral details
- Evaluation/workup status, living donor status
- Education completed

### Pre-Dialysis Module
- GFR, estimated time to dialysis
- Modality education, access planning
- Conservative care discussed, social work referral

### BP Control Module
- Home BP readings, medication escalation
- Lifestyle modifications

### Anemia Module
- Hgb, iron status, ESA dosing
- Transfusion history

### Dialysis Module
- Adequacy (Kt/V), access function
- Fluid management, interdialytic weight gains

### Bone Mineral Module
- Ca/Phos/PTH, binder adherence, Vitamin D

### AKI Follow-up Module
- Recovery trajectory, medication reconciliation
- Prevention education

### New Patient Module
- Comprehensive history, baseline establishment
- Care plan initiation, practice orientation

---

# A2. Quality Metrics (13 AppSheet Tables)

Source: `talia-quality-metrics/schemas/*.yaml` (14,305 lines total)  
Full YAML reference: `talia-quality-metrics/docs/complete-schema-reference.md`

## A2.1 Patients (1,089 lines)

**Key**: `_patientIdentifier` (UNIQUEID())

| Section | Fields | Key Fields |
|---------|--------|------------|
| Identifiers | 6 | epic_mrn, cerner_acct, wth_mrn, ssn_last4, _duplicatecheck |
| Demographics Basic | 10 | last_name, first_name, dob, age (computed), sex, gender_identity, pronouns |
| Race/Ethnicity | 4 | race, ethnicity, preferred_language, interpreter_needed |
| Contact | 10 | address (street/city/state/zip/county), phone (home/mobile/preferred), email, portal, messaging prefs |
| Emergency Contact | 3 | name, relationship, phone |
| Patient Status | 5 | status, status_date, death_date, death_cause, inactive_reason |
| Provider References | 7 | primary_nephrologist_ref, secondary_nephrologist_ref, pcp_ref, cardiologist_ref, endocrinologist_ref, urologist_ref, vascular_surgeon_ref |
| CKD Status (denormalized) | 7 | current_ckd_stage, current_albuminuria_category, kdigo_risk_category, current_egfr, current_egfr_date, current_uacr, ckd_etiology, ckd_diagnosis_date |
| Dialysis Status | 9 | is_on_dialysis, dialysis_modality, dialysis_start_date, vintage_months (computed), unit_name, unit_phone, schedule, dry_weight_kg, was_emergency_start |
| Transplant Status | 8 | is_transplant_candidate, candidate_status, has_active_referral (denorm), is_recipient, transplant_date, type, center |
| Comorbidities | 20 | has_diabetes, diabetes_type, has_hypertension, has_cad, has_chf, chf_ef, chf_classification, has_afib, has_pvd, has_cva_tia, has_copd, has_cirrhosis, has_malignancy, malignancy_type/status, has_gout, has_obesity, bmi, has_depression, has_dementia, functional_status |
| Social History | 10 | smoking_status, pack_years, alcohol_use, substance_use, lives_alone, has_caregiver, caregiver_name, employment_status, transportation_barrier, food_insecurity, housing_instability |
| Allergies/Directives | 6 | allergies, has_drug_allergies, code_status, has_advance_directive, has_healthcare_poa, poa_name/phone |
| Insurance | 6 | primary (type/name/id), secondary (type/name), medicare_esrd_entitled, esrd_start_date |
| Blood Type | 1 | blood_type |
| Clinical Notes | 5 | clinical_notes, is_high_risk, high_risk_reason, needs_followup, followup_reason |
| Timestamps | 4 | created_date, modified_date, last_visit_date, next_appointment_date |

**Relationships**: One-to-many with CKD_Stage_History, Medications, Lab_Results, Quality_Metrics_Snapshot, Vascular_Access, Transplant_Referrals, Living_Donor_Evaluations

**4 Bots**: Update CKD Stage, Update Dialysis Status, Update Transplant Flag, Update uACR

**7 Slices**: Active, Dialysis, Transplant Recipients, CKD 4-5 Pre-Dialysis, High Risk, Needs Followup, Diabetic CKD

**Color Rules**: Red=high risk, Orange=needs followup, Purple=G5/dialysis, Blue=transplant recipient

## A2.2 Providers (864 lines)

**Key**: `_providerIdentifier` (UNIQUEID())

| Section | Key Fields |
|---------|------------|
| Identifiers | npi, provider_type (Internal/External/Transplant_Center_Contact) |
| Demographics | first_name, last_name, credentials, specialty, sub_specialty |
| Practice Info | practice_name, affiliated_center, department |
| Contact | phone_office, phone_cell, fax, email |
| NPI Data | npi_status, npi_entity_type, npi_enumeration_date, npi_last_updated, npi_taxonomy_code, npi_taxonomy_desc |
| Addresses | mailing_address, practice_address (street/city/state/zip) |
| Status | is_active, is_accepting_referrals, notes |
| Timestamps | created_date, modified_date |

## A2.3 CKD_Stage_History (673 lines)

**Key**: `_stageHistoryIdentifier`

| Section | Key Fields |
|---------|------------|
| References | patient_ref, ordering_provider_ref |
| Staging | stage_date, ckd_stage (G1-G5, G5D_*, Transplant), staging_method, staging_notes |
| Lab Values | egfr_value, egfr_equation (CKD_EPI_2021/MDRD/Cystatin_C/Combined), serum_creatinine, cystatin_c |
| Albuminuria | uacr_value, uacr_date, albuminuria_category (A1/A2/A3), upcr_value |
| Risk | kdigo_risk_category, kdigo_risk_color |
| Progression | egfr_slope_per_year (computed), is_rapid_decliner (>5/yr), time_since_last_stage, previous_stage |
| KFRE | kfre_2yr_risk, kfre_5yr_risk, kfre_date |

**Bots**: Calculate eGFR slope, Determine rapid decliner, Update parent patient

## A2.4 Medications (1,084 lines)

**Key**: `_medicationIdentifier`

| Section | Key Fields |
|---------|------------|
| References | patient_ref, prescribing_provider_ref |
| Drug Info | medication_name, generic_name, brand_name, medication_class (50+ enum values), ndc_code |
| GDMT Flags | is_gdmt_medication, gdmt_pillar (RAAS/SGLT2i/MRA/GLP1_RA), is_at_target_dose, target_dose_mg |
| Dosing | dose_value, dose_unit, frequency, route, instructions |
| Status | status (Active/Discontinued/On_Hold/PRN), start_date, end_date, discontinuation_reason |
| Clinical | indication, contraindications, side_effects_reported, adherence_status, adherence_barriers |
| Monitoring | requires_monitoring, monitoring_parameters, last_monitored_date, next_monitoring_date |

## A2.5 Lab_Results (2,095 lines)

**Key**: `_labResultIdentifier`

| Section | Key Fields |
|---------|------------|
| References | patient_ref, ordering_provider_ref |
| Result | lab_name (100+ enum values), lab_category, result_value, result_unit, result_text |
| Reference | reference_range_low, reference_range_high, is_critical, critical_flag_reason |
| Status | collection_date, result_date, review_status, reviewed_by_ref, review_date |
| Context | specimen_type, lab_facility, is_transplant_lab, transplant_context |

**Lab Categories**: Renal_Function, Electrolytes, CBC, Metabolic, Lipids, Diabetes, Liver, Thyroid, Iron_Studies, Bone_Mineral, Urinalysis, Transplant, Immunology, Coagulation, Cardiac, Infectious

## A2.6 Vascular_Access (1,038 lines)

**Key**: `_vascularAccessIdentifier`

| Section | Key Fields |
|---------|------------|
| References | patient_ref, placing_surgeon_ref, managing_provider_ref |
| Access | access_type (AVF/AVG/Tunneled_Catheter/Non_Tunneled/PD_Catheter), access_location, laterality |
| Status | status (Planned/Placed/Maturing/In_Use/Abandoned/Removed), placed_date, first_use_date, maturation_weeks |
| Complications | complications (EnumList: Thrombosis, Stenosis, Infection, Steal_Syndrome, Aneurysm, +more), complication_dates, interventions |
| Monitoring | last_assessment_date, flow_rate_ml_min, access_recirculation_pct |

## A2.7 Transplant_Referrals (976 lines)

**Key**: `_referralIdentifier`

| Section | Key Fields |
|---------|------------|
| References | patient_ref, referring_provider_ref, transplant_coordinator_ref |
| Referral | referral_date, transplant_center (10 regional centers), referral_status (11-step workflow) |
| Clinical | egfr_at_referral, ckd_stage_at_referral, blood_type, is_preemptive |
| Evaluation | initial_eval_date, evaluation_status, workup_completion_pct (computed) |
| Listing | listing_date, listing_status, pra_level, wait_time_months (computed) |
| Living Donor | has_living_donor_candidate, living_donor_status |

## A2.8 Workup_Templates (920 lines)

**Key**: `_templateIdentifier`

Standard workup requirements (not per-patient).

| Section | Key Fields |
|---------|------------|
| Template | template_name, workup_category, description |
| Requirements | is_required, applies_to_age_min/max, applies_to_gender, applies_to_ckd_stage |
| Validity | valid_for_months, requires_repeat, repeat_interval_months |
| Ordering | default_order_set, typical_turnaround_days, requires_referral |

## A2.9 Workup_Items (1,219 lines)

**Key**: `_workupItemIdentifier`

Per-patient instances of template requirements.

| Section | Key Fields |
|---------|------------|
| References | referral_ref, template_item_ref, patient_ref, ordering_provider_ref |
| Status | item_status (Not_Started/Ordered/Scheduled/Completed/Expired/Waived), ordered_date, completed_date, expires_date (computed) |
| Results | result_summary, result_status (Normal/Abnormal/Needs_Followup), result_document |
| Notes | notes, waiver_reason, blocking_issue |

## A2.10 Transplant_Events (855 lines)

**Key**: `_eventIdentifier`

| Section | Key Fields |
|---------|------------|
| References | referral_ref, patient_ref, provider_ref |
| Event | event_type (50+ types), event_date, event_category (Milestone/Complication/Status_Change/Communication) |
| Details | description, severity (Info/Warning/Critical), outcome |
| Follow-up | requires_followup, followup_date, followup_completed |

## A2.11 Living_Donor_Evaluations (995 lines)

**Key**: `_donorEvalIdentifier`

| Section | Key Fields |
|---------|------------|
| References | recipient_ref, coordinator_ref, evaluating_center |
| Donor | donor_first_name, donor_last_name, donor_dob, donor_relationship, donor_blood_type |
| Evaluation | evaluation_status (20-step workflow), evaluation_start_date |
| Medical | donor_egfr, donor_bmi, has_hypertension, has_diabetes, has_malignancy_history |
| Screening | abo_compatible, crossmatch_result, hla_typing_complete |
| Outcome | approval_status, approval_date, scheduled_surgery_date, surgery_outcome |

## A2.12 Quality_Metrics_Snapshot (1,064 lines)

**Key**: `_snapshotIdentifier`

| Section | Key Fields |
|---------|------------|
| References | patient_ref, provider_ref |
| Timing | snapshot_date, snapshot_trigger (Visit/Quarterly/Annual/Manual) |
| BP | bp_systolic, bp_diastolic, bp_at_target_130_80, bp_at_target_140_90 |
| GDMT | on_acei_arb, on_sglt2i, on_mra, on_glp1_ra, four_pillar_count, four_pillar_complete |
| Labs | latest_egfr, latest_a1c, latest_uacr, latest_potassium, latest_hemoglobin |
| Transplant | is_transplant_referred, is_transplant_listed, referral_timeliness |
| Dialysis | planned_dialysis_start, has_permanent_access, emergency_start |
| MIPS | mips_047_acp, mips_110_hiv, mips_117_foot_exam, mips_226_tobacco, mips_236_htn, mips_238_statin, mips_318_falls |
| Gaps | care_gaps (EnumList), gap_count, priority_gap |

## A2.13 Epic_Import_Staging (1,433 lines)

**Key**: `_stagingIdentifier`

| Section | Key Fields |
|---------|------------|
| Import | import_batch_id, import_date, source_system (Epic/Cerner/Manual) |
| Raw Data | raw_mrn, raw_first_name, raw_last_name, raw_dob, raw_* (30+ raw fields) |
| Matching | match_status (New/Matched/Ambiguous/Conflict/Merged), match_confidence, matched_patient_ref |
| Conflict | conflict_fields (EnumList), resolution_status, resolved_by, resolution_date |
| Audit | created_date, processed_date, error_log |

---

# A3. Provider Workload Offload (9 AppSheet Tables)

Source: `tke-provider-workload-offload/openspec/specs/talia-schema.md`

## A3.1 Patients (Reference Table)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| PatientID | Text (Key) | Yes | Unique patient identifier |
| FirstName | Text | Yes | Patient first name |
| LastName | Text | Yes | Patient last name |
| DateOfBirth | Date | Yes | DOB for age calculation |
| Age | Number | Computed | `YEAR(TODAY()) - YEAR([DateOfBirth])` |
| MRN | Text | No | Medical record number |
| PrimaryPhone | Phone | No | Contact number |
| Location | Enum | Yes | Jackson / Dyersburg / Union City / Covington |
| CKDStage | Enum | Yes | Stage 1/2/3a/3b/4/5/Dialysis |
| LatestEGFR | Decimal | No | Most recent eGFR value |
| OnDialysis | Yes/No | Yes | Dialysis status |
| PrimaryProvider | Ref | Yes | Assigned nephrologist |

## A3.2 Encounters

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| EncounterID | Text (Key) | Auto | `CONCATENATE([PatientID], "-", TEXT(NOW(), "YYYYMMDD-HHmmss"))` |
| PatientRef | Ref->Patients | Yes | Link to patient |
| EncounterDate | DateTime | Yes | Date and time |
| EncounterLocation | Enum | Yes | Jackson / Dyersburg / Union City / Covington |
| MAPerforming | Ref->Users | Yes | MA conducting assessment |
| ProviderReviewing | Ref->Providers | No | Provider who reviewed |
| Status | Enum | Yes | Draft / Complete / Escalated / Provider Reviewed |
| Notes | LongText | No | General encounter notes |

## A3.3 NSAID_Assessments

| Column | Type | Required | Computed | Description |
|--------|------|----------|----------|-------------|
| AssessmentID | Text (Key) | Auto | | Unique ID |
| EncounterRef | Ref | Yes | | Parent encounter |
| CurrentNSAID | Text | No | | Name of NSAID(s) |
| NSAIDFrequency | Enum | Yes | | Daily / Weekly / As needed / Rarely / None |
| PainLevel | Number | No | | 0-10 scale |
| PainLocation | Text | No | | Where is the pain |
| OnACEiARB | Yes/No | Yes | | Taking ACE inhibitor or ARB |
| ACEiARBName | Text | No | | Specific medication |
| OnDiuretic | Yes/No | Yes | | Taking diuretic |
| DiureticName | Text | No | | Specific medication |
| TakingNSAID | Yes/No | Yes | | Currently using NSAID |
| **TripleWhammyPresent** | Yes/No | | **Yes** | `AND([OnACEiARB], [OnDiuretic], [TakingNSAID])` |
| AlternativesOffered | EnumList | No | | Tylenol / Voltaren gel / Lidocaine patches / Capsaicin / Heat-Ice / PT referral |
| PatientResponse | Enum | Yes | | Accepted / Declined / Considering / Needs more info |
| EscalatedToProvider | Yes/No | No | | Was provider notified |
| EscalationReason | Text | No | | Why escalated |
| EducationProvided | Yes/No | Yes | | Was card given |
| Timestamp | DateTime | Auto | | Record creation |
| MASignature | Signature | Yes | | MA completing |
| ProviderReview | Signature | No | | Provider review |

**Validation**: Triple Whammy = immediate escalation. Patient declined = escalation required.

## A3.4 PPI_Assessments

| Column | Type | Required | Computed | Description |
|--------|------|----------|----------|-------------|
| AssessmentID | Text (Key) | Auto | | Unique ID |
| EncounterRef | Ref | Yes | | Parent encounter |
| CurrentPPI | Text | Yes | | Name of PPI |
| PPIDose | Text | No | | Current dose |
| PPIDuration | Enum | Yes | | <8 weeks / 2-12 months / 1-2 years / 3-5 years / >5 years |
| HasBarretts | Yes/No | Yes | | Barrett's esophagus |
| HasSevereEsophagitis | Yes/No | Yes | | Grade C/D esophagitis |
| OnAnticoagWithGIBleed | Yes/No | Yes | | Anticoag + GI bleed history |
| ActiveHPylori | Yes/No | Yes | | Treating H. pylori |
| **HasContraindication** | Yes/No | | **Yes** | `OR([HasBarretts], [HasSevereEsophagitis], [OnAnticoagWithGIBleed], [ActiveHPylori])` |
| LastEGDDate | Date | No | | Most recent EGD |
| EGDFindings | Enum | No | | Normal / Hiatal hernia / Barrett's / Esophagitis / Other |
| **NeedsEGDFirst** | Yes/No | | **Yes** | `AND([PPIDuration] = ">5 years", OR(ISBLANK([LastEGDDate]), DATEDIF > 5 years))` |
| SwitchOffered | Yes/No | No | | Switch to famotidine offered |
| ReboundDiscussed | Yes/No | No | | Rebound explained |
| PatientResponse | Enum | Yes | | Accepted switch / Declined / Contraindicated / Needs EGD first / Will consider |
| EscalatedToProvider | Yes/No | No | | Provider notified |
| EscalationReason | Text | No | | Why escalated |
| EducationProvided | Yes/No | Yes | | Card given |
| Timestamp | DateTime | Auto | | Record creation |
| MASignature | Signature | Yes | | MA completing |
| ProviderReview | Signature | No | | Provider review |

**Validation**: Contraindication = block switch. >5yr without EGD = needs EGD first. Rebound must be discussed if switch offered.

## A3.5 Tobacco_Assessments

| Column | Type | Required | Computed | Description |
|--------|------|----------|----------|-------------|
| AssessmentID | Text (Key) | Auto | | Unique ID |
| EncounterRef | Ref | Yes | | Parent encounter |
| TobaccoStatus | Enum | Yes | | Current daily / Current occasional / Former <1yr / Former >1yr / Never |
| TobaccoTypes | EnumList | No | | Cigarettes / Cigars / Pipe / Chew-Dip / Vaping / Other |
| CigarettesPerDay | Number | No | | If cigarette smoker |
| YearsSmoked | Number | No | | Duration of smoking |
| **PackYears** | Decimal | | **Yes** | `([CigarettesPerDay] / 20) * [YearsSmoked]` |
| QuitDate | Date | No | | If former smoker |
| AdviceGiven | Yes/No | Yes | | Quit advice delivered |
| ReadinessToQuit | Enum | No | | Ready now / Not now / Not interested / Unsure |
| QuitDateSet | Date | No | | If ready, target date |
| QuitLineInfoProvided | Yes/No | No | | QuitLine info given |
| NRTDiscussed | Yes/No | No | | Nicotine replacement discussed |
| FollowUpScheduled | Date | No | | Follow-up date |
| CounselingMinutes | Number | Yes | | Exact time spent |
| **BillingCode** | Enum | | **Yes** | `IF(>=3 AND <=10, "99406", IF(>10, "99407", "None"))` |
| EducationProvided | Yes/No | Yes | | Card given |
| Timestamp | DateTime | Auto | | Record creation |
| MASignature | Signature | Yes | | MA completing |

**Validation**: Current smoker = AdviceGiven required. Billing code requires >=3 minutes.

## A3.6 Statin_Assessments

| Column | Type | Required | Computed | Description |
|--------|------|----------|----------|-------------|
| AssessmentID | Text (Key) | Auto | | Unique ID |
| EncounterRef | Ref | Yes | | Parent encounter |
| PatientAge | Number | | **Yes** | From Patients table |
| OnDialysis | Yes/No | | **Yes** | From Patients table |
| CurrentlyOnStatin | Yes/No | Yes | | Taking statin now |
| CurrentStatin | Text | No | | Which statin |
| StatinIntolerant | Yes/No | No | | Statin intolerance |
| StatinsTried | Text | No | | List tried |
| IntoleranceSymptoms | Text | No | | What symptoms |
| HasDMorCVD | Yes/No | No | | For 18-49 age group |
| **QualifiesForStatin** | Yes/No | | **Yes** | `AND(NOT([OnDialysis]), OR(Age>=50, AND(Age>=18, [HasDMorCVD])))` |
| RefusesStatin | Yes/No | No | | Declines all statin therapy |
| **PCSK9iEligible** | Yes/No | | **Yes** | `OR([StatinIntolerant], [RefusesStatin])` |
| InterestedInRepatha | Yes/No | No | | Interested in Repatha |
| InterestedInLeqvio | Yes/No | No | | Interested in Leqvio |
| CopayAssistanceDiscussed | Yes/No | No | | Cost help discussed |
| PatientResponse | Enum | Yes | | Accepted statin / Interested in PCSK9i / Declined / Already on statin / On dialysis |
| EscalatedToProvider | Yes/No | No | | Needs prescription |
| EducationProvided | Yes/No | Yes | | Card given |
| Timestamp | DateTime | Auto | | Record creation |
| MASignature | Signature | Yes | | MA completing |

**Validation**: On dialysis = response must be "On dialysis". PCSK9i interest = escalation required.

## A3.7 Anemia_Assessments

| Column | Type | Required | Computed | Description |
|--------|------|----------|----------|-------------|
| AssessmentID | Text (Key) | Auto | | Unique ID |
| EncounterRef | Ref | Yes | | Parent encounter |
| HemoglobinValue | Decimal | Yes | | Hb in g/dL |
| HemoglobinDate | Date | Yes | | Date of lab |
| DarkTarryStools | Yes/No | Yes | | GI screen |
| BrightRedBlood | Yes/No | Yes | | GI screen |
| VomitingBlood | Yes/No | Yes | | GI screen |
| HeavyMenstrualBleeding | Yes/No | No | | If applicable |
| HistoryGIBleed | Yes/No | Yes | | Prior GI bleeding |
| **GIScreenPositive** | Yes/No | | **Yes** | `OR([DarkTarryStools], [BrightRedBlood], [VomitingBlood])` |
| LastColonoscopyDate | Date | No | | When last colonoscopy |
| ColonoscopyStatus | Enum | No | | Never / Within 5 yrs / 5-10 yrs ago / >10 yrs ago |
| **NeedsReferral** | Yes/No | | **Yes** | `AND(Hb < 10, NOT([GIScreenPositive]))` |
| ReferralInitiated | Yes/No | No | | Referral sent |
| ReferralDestination | Text | No | | Which clinic |
| EscalatedToProvider | Yes/No | No | | Provider notified |
| EscalationReason | Text | No | | Why escalated |
| PatientCounseled | Yes/No | Yes | | Anemia explained |
| EducationProvided | Yes/No | Yes | | Card given |
| Timestamp | DateTime | Auto | | Record creation |
| MASignature | Signature | Yes | | MA completing |
| ProviderReview | Signature | No | | If escalated |

**Validation**: GI positive = immediate escalation, block referral. Hb <7 = urgent provider review.

## A3.8 SleepApnea_Assessments

| Column | Type | Required | Computed | Description |
|--------|------|----------|----------|-------------|
| AssessmentID | Text (Key) | Auto | | Unique ID |
| EncounterRef | Ref | Yes | | Parent encounter |
| S_Snoring | Yes/No | Yes | | Snores loudly |
| T_Tired | Yes/No | Yes | | Tired/sleepy |
| O_Observed | Yes/No | Yes | | Stop breathing observed |
| P_Pressure | Yes/No | Yes | | High blood pressure |
| B_BMI | Yes/No | Yes | | BMI > 35 |
| BMIValue | Decimal | Yes | | Actual BMI |
| A_Age | Yes/No | Yes | | Age > 50 |
| N_Neck | Yes/No | Yes | | Neck > 16 inches |
| NeckCircumference | Decimal | Yes | | Actual measurement |
| G_Gender | Yes/No | Yes | | Male gender |
| **STOPBANGScore** | Number | | **Yes** | Sum of all Yes answers |
| **RiskLevel** | Enum | | **Yes** | 0-2=Low, 3-4=Intermediate, 5-8=High |
| HasResistantHTN | Yes/No | No | | 3+ BP meds, uncontrolled |
| HasPolycythemia | Yes/No | No | | Unexpectedly high Hb |
| **HasRedFlags** | Yes/No | | **Yes** | `OR([HasResistantHTN], [HasPolycythemia])` |
| **ReferralRecommended** | Yes/No | | **Yes** | `OR(High, AND(Intermediate, RedFlags))` |
| ReferralInitiated | Yes/No | No | | Sleep study referral sent |
| ReferralDestination | Text | No | | Which sleep center |
| PatientResponse | Enum | Yes | | Accepted / Declined / Will consider |
| EducationProvided | Yes/No | Yes | | Card given |
| Timestamp | DateTime | Auto | | Record creation |
| MASignature | Signature | Yes | | MA completing |

**Validation**: High risk + no referral = invalid. Intermediate = suggest provider review.

## A3.9 LeqvioInjections

| Column | Type | Required | Computed | Description |
|--------|------|----------|----------|-------------|
| InjectionID | Text (Key) | Auto | | `CONCATENATE("LEQVIO-", [PatientID], "-", timestamp)` |
| PatientRef | Ref | Yes | | Link to patient |
| EncounterRef | Ref | No | | Parent encounter (optional) |
| DoseNumber | Number | Yes | | 1, 2, 3, etc. |
| InjectionDate | DateTime | Yes | | Date and time |
| InjectionSite | Enum | Yes | | Abdomen-L/R, UpperArm-L/R, Thigh-L/R |
| LotNumber | Text | Yes | | Drug lot number |
| ExpirationDate | Date | Yes | | Drug expiration |
| AdministeredBy | Ref | Yes | | Who gave injection |
| AdministeredByRole | Enum | Yes | | Provider / MA |
| PatientTolerated | Yes/No | Yes | | Tolerated injection |
| AdverseReaction | Enum | No | | None / InjectionSiteReaction / Other |
| AdverseReactionNotes | Text | No | | Details if reaction |
| PriorAuthNumber | Text | No | | PA authorization |
| InsuranceType | Enum | Yes | | MedicareFFS / MedicareAdvantage / TennCare / Commercial / Uninsured |
| CopayAssistance | Enum | No | | None / HealthWell / NovartisPAF / Medigap |
| **NextDoseDate** | Date | | **Yes** | Dose 1: +90 days; Dose 2+: +6 months |
| NextDoseScheduled | Yes/No | Yes | | Has next dose been scheduled |
| ScheduledAppointmentDate | Date | No | | When next dose scheduled |
| RecallSetInEHR | Yes/No | Yes | | EHR recall set |
| **DoseStatus** | Enum | | **Yes** | Loading-1 / Loading-2 / Maintenance |
| BillingSubmitted | Yes/No | No | | Claim submitted |
| Timestamp | DateTime | Auto | | Record creation |
| MASignature | Signature | No | | MA documentation |
| ProviderSignature | Signature | No | | Provider signature |

**Validation**: Adverse reaction requires notes. Medicare Advantage/Commercial/TennCare requires prior auth. Dose 1 + not scheduled = warning. Overdue >90 days = may need loading restart.

---

# A4. CKD Note Template (37 Sections + 42 Cards + 8 AI Agents)

Source: `tke-ckd-note-template/openspec/`

## A4.1 Section Registry (Complete)

### Domain 0: Header & Visit Context

| # | Section ID | Display Name | Card Codes | AI Agent |
|---|------------|--------------|------------|----------|
| 0 | `header` | Header & Visit Context | -- | orchestrator |

**Fields**: visit_type, reason_for_visit, follow_up_interval, companions, weight, bmi, weight_trend, lab_date, ckd_stage, ckd_etiology, pathology_confirmation, albuminuria_stage, kdigo_risk_category, gdmt_compliance, ccm_status

### Domain 1: Kidney Core (Blue #3B82F6)

| # | Section ID | Display Name | Card Codes | AI Agent |
|---|------------|--------------|------------|----------|
| 1 | `kidney_function` | Kidney Function & Progression | TKE-PROT, TKE-KFRE, TKE-RNLX, TKE-RNAS, TKE-BIOP | kidney_function_agent |
| 2 | `hematuria` | Hematuria | TKE-HEMA | kidney_function_agent |
| 3 | `kidney_stones` | Kidney Stones | TKE-STONE | kidney_function_agent |
| 4 | `gu_history` | GU History | TKE-GU | general_ckd_agent |

### Domain 2: Cardiovascular-Renal (Red #EF4444)

| # | Section ID | Display Name | Card Codes | AI Agent |
|---|------------|--------------|------------|----------|
| 5 | `bp_fluid` | Blood Pressure & Fluid | TKE-BPFL, TKE-DAXR | bp_fluid_agent |
| 6 | `heart_failure` | Heart Failure | TKE-HF | heart_failure_agent |
| 7 | `lipid_therapy` | Lipid Therapy | TKE-STAT | cv_risk_agent |

### Domain 3: Pharmacotherapy - 4 Pillars (Purple #8B5CF6)

| # | Section ID | Display Name | Card Codes | AI Agent |
|---|------------|--------------|------------|----------|
| 8 | `raas` | RAAS Inhibition (ACEi/ARB/ARNi) | TKE-RAAS | pharmacotherapy_agent |
| 9 | `sglt2i` | SGLT2 Inhibitor | TKE-SGLT | pharmacotherapy_agent |
| 10 | `mra` | MRA (Finerenone/Spironolactone/Eplerenone) | TKE-FINE | pharmacotherapy_agent |
| 11 | `glp1` | GLP-1 Receptor Agonist | TKE-GLP1 | pharmacotherapy_agent |

### Domain 4: Metabolic (Orange #F97316)

| # | Section ID | Display Name | Card Codes | AI Agent |
|---|------------|--------------|------------|----------|
| 12 | `diabetes` | Diabetes Management | TKE-DM | complications_agent |
| 13 | `gout` | Gout | TKE-GOUT | complications_agent |
| 14 | `obesity` | Obesity / Weight Management | TKE-OBES | complications_agent |

### Domain 5: CKD Complications (Dark Blue #1E40AF)

| # | Section ID | Display Name | Card Codes | AI Agent |
|---|------------|--------------|------------|----------|
| 15 | `anemia` | Anemia / Blood Health | TKE-ANEM | complications_agent |
| 16 | `mbd` | Mineral Bone Disease | TKE-MBD | complications_agent |
| 17 | `electrolytes` | Electrolytes & Acid-Base | TKE-ELEC | complications_agent |

### Domain 6: Risk Mitigation (Green #22C55E)

| # | Section ID | Display Name | Card Codes | AI Agent |
|---|------------|--------------|------------|----------|
| 18 | `tobacco` | Tobacco / Substance Use | TKE-SMOK | medication_safety_agent |
| 19 | `nsaid` | NSAID Avoidance | TKE-NSAI | medication_safety_agent |
| 20 | `ppi` | PPI Review | TKE-PPI | medication_safety_agent |
| 21 | `sick_day` | Sick Day Rules | TKE-SICK | medication_safety_agent |
| 22 | `contrast` | Contrast Precautions | TKE-CONT | medication_safety_agent |
| 23 | `sodium` | Sodium Restriction | TKE-SODM | nutrition_agent |

### Domain 7: Planning & Transitions (Gray #6B7280)

| # | Section ID | Display Name | Card Codes | AI Agent |
|---|------------|--------------|------------|----------|
| 24 | `transplant` | Transplant Readiness | TKE-TXPL | planning_screening_agent |
| 25 | `dialysis` | Dialysis Planning / Vascular Access | TKE-DIAL | planning_screening_agent |
| 26 | `acp` | Advance Care Planning | TKE-ACP | planning_screening_agent |
| 27 | `ccm` | CCM Enrollment | TKE-CCM | planning_screening_agent |

### Domain 8: Screening & Prevention (Teal #14B8A6)

| # | Section ID | Display Name | Card Codes | AI Agent |
|---|------------|--------------|------------|----------|
| 28 | `immunizations` | Immunizations | TKE-VACC | planning_screening_agent |
| 29 | `depression` | Depression Screen (PHQ-2/9) | TKE-PHQ | planning_screening_agent |
| 30 | `fall_risk` | Fall Risk Assessment | TKE-FALL | physical_performance_agent |
| 31 | `sleep_apnea` | Sleep Apnea | TKE-SLAP | planning_screening_agent |
| 32 | `sdoh` | SDOH Assessment | TKE-SDOH | planning_screening_agent |
| 33 | `physical_performance` | Physical Performance & Frailty | TKE-GRIP, TKE-FUNC | physical_performance_agent |
| 34 | `nutrition` | Nutrition / Dietary Assessment | TKE-NUTR | nutrition_agent |

### Domain 9: Care Coordination (Pink #EC4899)

| # | Section ID | Display Name | Card Codes | AI Agent |
|---|------------|--------------|------------|----------|
| 35 | `medication_adherence` | Medication Adherence & Barriers | -- | medication_safety_agent |
| 36 | `special_clinics` | Special Clinics | TKE-CRM, TKE-LONG | general_ckd_agent |
| 37 | `follow_up` | PCP / Care Team / Follow-Up | -- | general_ckd_agent |

## A4.2 AI Agent Definitions (8 Core Agents)

| Agent | Sections Owned | Clinical Guidelines | Key Responsibilities |
|-------|----------------|--------------------|--------------------|
| **orchestrator** | header | -- | Dashboard summary, GDMT compliance calc, KDIGO risk calc, note assembly, 3 outputs |
| **kidney_function_agent** | kidney_function, hematuria, kidney_stones, gu_history | KDIGO 2024 CKD | eGFR slope, BUN:Cr, KFRE, albuminuria staging, hematuria workup, stone prevention |
| **bp_fluid_agent** | bp_fluid | KDIGO BP, SPRINT | BP control, fluid status, Daxor BVA interpretation |
| **heart_failure_agent** | heart_failure | AHA/ACC HF | HF GDMT, cardiorenal syndrome, Furoscix candidacy |
| **pharmacotherapy_agent** | raas, sglt2i, mra, glp1, lipid_therapy | KDIGO 2024, CREDENCE, DAPA-CKD, FIDELIO, FLOW | 4 Pillars compliance, statin/PCSK9i, cross-checks |
| **complications_agent** | anemia, mbd, electrolytes, diabetes, gout, obesity | KDIGO Anemia/MBD, ADA | Anemia, CKD-MBD, electrolytes, diabetes, gout, obesity |
| **medication_safety_agent** | tobacco, nsaid, ppi, sick_day, contrast, medication_adherence | Fax manager rules | Triple Whammy, NSAID avoidance, PPI review, sick day, contrast |
| **planning_screening_agent** | transplant, dialysis, acp, ccm, immunizations, depression, sleep_apnea, sdoh | KDIGO Transplant, ACIP, PHQ | Transplant, dialysis planning, ACP, CCM, immunizations, depression, SDOH |

**Phase 2 Expansion Agents**: nutrition_agent, physical_performance_agent, cv_risk_agent, scribe_agent, general_ckd_agent

## A4.3 42 Physical Card Codes

| Domain | Card Code | Card Name |
|--------|-----------|-----------|
| Kidney Core | TKE-PROT | Proteinuria |
| Kidney Core | TKE-KFRE | Kidney Failure Risk Equation |
| Kidney Core | TKE-RNLX | Renalytix |
| Kidney Core | TKE-RNAS | Renasight |
| Kidney Core | TKE-BIOP | Kidney Biopsy |
| Kidney Core | TKE-HEMA | Hematuria |
| Kidney Core | TKE-STONE | Kidney Stones |
| Kidney Core | TKE-GU | GU History |
| Cardiovascular | TKE-BPFL | Blood Pressure & Fluid |
| Cardiovascular | TKE-DAXR | Daxor Blood Volume Analysis |
| Cardiovascular | TKE-HF | Heart Failure |
| Cardiovascular | TKE-STAT | Statin/Lipid Therapy |
| Pharmacotherapy | TKE-RAAS | RAAS Inhibition |
| Pharmacotherapy | TKE-SGLT | SGLT2 Inhibitor |
| Pharmacotherapy | TKE-FINE | Finerenone/MRA |
| Pharmacotherapy | TKE-GLP1 | GLP-1 Receptor Agonist |
| Metabolic | TKE-DM | Diabetes Management |
| Metabolic | TKE-GOUT | Gout |
| Metabolic | TKE-OBES | Obesity/Weight Management |
| CKD Complications | TKE-ANEM | Anemia |
| CKD Complications | TKE-MBD | Mineral Bone Disease |
| CKD Complications | TKE-ELEC | Electrolytes & Acid-Base |
| Risk Mitigation | TKE-SMOK | Tobacco/Substance Use |
| Risk Mitigation | TKE-NSAI | NSAID Avoidance |
| Risk Mitigation | TKE-PPI | PPI Review |
| Risk Mitigation | TKE-SICK | Sick Day Rules |
| Risk Mitigation | TKE-CONT | Contrast Precautions |
| Risk Mitigation | TKE-SODM | Sodium Restriction |
| Planning | TKE-TXPL | Transplant Readiness |
| Planning | TKE-DIAL | Dialysis Planning/Vascular Access |
| Planning | TKE-ACP | Advance Care Planning |
| Planning | TKE-CCM | CCM Enrollment |
| Screening | TKE-VACC | Immunizations |
| Screening | TKE-PHQ | Depression Screen (PHQ-2/9) |
| Screening | TKE-FALL | Fall Risk Assessment |
| Screening | TKE-SLAP | Sleep Apnea |
| Screening | TKE-SDOH | SDOH Assessment |
| Screening | TKE-GRIP | Grip Strength |
| Screening | TKE-FUNC | Functional Assessment |
| Screening | TKE-NUTR | Nutrition/Dietary |
| Care Coordination | TKE-CRM | CRM/Special Clinics |
| Care Coordination | TKE-LONG | Long COVID |
| Cross-Cutting | TKE-TRIP | Triple Whammy Alert |

## A4.4 Data Input Sources

| Source Type | Examples | Used By |
|-------------|---------|---------|
| `labs_api` | eGFR, creatinine, UACR, HbA1c, electrolytes | Pre-visit auto-pull |
| `med_list` | RAAS drugs, SGLT2i, statins, diuretics | Therapy section population |
| `vitals` | BP, weight, heart rate, O2 sat | Header, BP section |
| `provider` | Clinical assessments, decisions | During visit |
| `patient` | Symptoms, adherence, history | During visit (MA-gathered) |
| `calculated` | eGFR slope, BMI, KFRE, GDMT compliance | Pre-visit derivation |
| `previous_note` | Last visit values for delta comparison | Follow-up mode |
| `fax_manager` | Lab thresholds, medication safety alerts | Real-time alerts |
| `ocr_scan` | Physical card data | Card digitization |
| `transcription` | Virtual scribe output | During visit |
| `chart` | Diagnoses, procedures, history | Pre-visit pull |
| `staff` | MA/nurse screening results, vitals | During visit |
| `screening` | PHQ-2, STOP-BANG, grip strength | During visit |
| `coordinator` | CCM status, care gaps | Pre-visit |
| `billing` | Prior auth, insurance barriers | Planning sections |
| `scheduling` | Next appointment, visit type | Follow-up section |
| `exam` | Edema, fluid status | During visit |
| `protocol` | BP targets, protein targets | Guideline references |
| `manual` | Renalytix, Renasight, Daxor results | Special entries |
| `echo` | LVEF | Heart failure section |
| `pathology` | Stone type, biopsy results | Kidney core sections |
| `dietitian` | Nutrition assessment | Nutrition section |
| `by_referral` | TUG time, 6-min walk | Physical performance |
| `auto_populated` | Education delivered flags | Care coordination |

## A4.5 Safety Guardrails

| Rule | Threshold | Action |
|------|-----------|--------|
| AI never invents lab values | -- | Must cite source + date |
| AI never recommends meds | -- | Provider confirmation required |
| Confidence scoring | Auto-accept >=0.9, Review 0.7-0.9, Required 0.5-0.7, Reject <0.3 | Flag for review |
| Safety alerts | -- | Cannot dismiss without reason |
| All outputs logged | -- | Version, timestamp, model used |
| Human signature | -- | Required before note finalized |

---

# A5. Clinical Training (8 PostgreSQL Tables)

Source: `tke-clinical-training/packages/database/src/schema.ts`

## A5.1 Enums

```
userRoleEnum:     'receptionist' | 'ma' | 'provider' | 'admin'
moduleSlugEnum:   'nsaids' | 'ppis' | 'tobacco' | 'statins' | 'anemia-sleep'
questionTypeEnum: 'multiple_choice' | 'true_false' | 'select_all' | 'scenario'
difficultyEnum:   'easy' | 'medium' | 'hard'
quizStatusEnum:   'in_progress' | 'completed' | 'abandoned'
trainingModeEnum: 'practice' | 'quiz' | 'jit' | 'day1'
```

## A5.2 users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, defaultRandom() | |
| firebase_uid | varchar(128) | UNIQUE, NOT NULL | Firebase auth UID |
| email | varchar(255) | UNIQUE, NOT NULL | Must be @thekidneyexperts.com |
| display_name | varchar(255) | NOT NULL | |
| photo_url | varchar(500) | nullable | |
| role | userRoleEnum | NOT NULL, default='ma' | |
| preferred_ai_model | varchar(100) | default='gemini-2.0-flash-preview' | Hot-swappable AI model |
| is_active | boolean | default=true | |
| last_login_at | timestamp | nullable, tz | |
| created_at | timestamp | defaultNow(), tz | |
| updated_at | timestamp | defaultNow(), tz | |

## A5.3 modules

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, defaultRandom() | |
| slug | moduleSlugEnum | UNIQUE, NOT NULL | |
| title | varchar(255) | NOT NULL | |
| description | text | nullable | |
| order_index | integer | NOT NULL | Display order |
| estimated_minutes | integer | NOT NULL | |
| question_count | integer | NOT NULL, default=50 | |
| source_file | varchar(255) | nullable | Training script path |
| is_active | boolean | default=true | |
| created_at | timestamp | defaultNow(), tz | |
| updated_at | timestamp | defaultNow(), tz | |

**Seeded Modules**:

| Order | Slug | Title | Minutes | Questions |
|-------|------|-------|---------|-----------|
| 1 | nsaids | NSAID Avoidance in CKD | 25 | 50 |
| 2 | ppis | PPI Management in CKD | 25 | 50 |
| 3 | tobacco | Tobacco Cessation | 20 | 50 |
| 4 | statins | Statin Therapy in CKD | 25 | 50 |
| 5 | anemia-sleep | Anemia Workup & Sleep Apnea | 30 | 50 |

## A5.4 questions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, defaultRandom() | |
| module_id | uuid | FK->modules(CASCADE) | |
| question_id | varchar(50) | UNIQUE, NOT NULL | e.g. "nsaids-001" |
| type | questionTypeEnum | NOT NULL | |
| difficulty | difficultyEnum | NOT NULL, default='medium' | |
| question | text | NOT NULL | Question text |
| scenario | jsonb | nullable | {patient, setting, symptoms, labs} |
| options | jsonb | NOT NULL | [{id, text}] |
| correct_answer | varchar(10) | nullable | Single answer |
| correct_answers | jsonb | nullable | Multi-answer [ids] |
| explanation | text | NOT NULL | |
| teaching_tip | text | nullable | |
| source_citation | varchar(500) | nullable | Traceability |
| source_chunk | text | nullable | Exact source text |
| concept | varchar(100) | nullable | e.g. "nsaid-alternatives" |
| role_relevance | jsonb | nullable | [roles] |
| is_active | boolean | default=true | |
| created_at | timestamp | defaultNow(), tz | |
| updated_at | timestamp | defaultNow(), tz | |

## A5.5 quiz_sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, defaultRandom() | |
| user_id | uuid | FK->users(CASCADE) | |
| module_id | uuid | FK->modules(CASCADE) | |
| mode | trainingModeEnum | NOT NULL, default='quiz' | |
| total_questions | integer | NOT NULL, default=25 | |
| pass_threshold | real | NOT NULL, default=0.8 | 80% |
| current_question_index | integer | default=0 | |
| questions_answered | integer | default=0 | |
| correct_answers | integer | default=0 | |
| question_ids | jsonb | NOT NULL | Ordered UUID array |
| responses | jsonb | default([]) | Detailed answer history |
| status | quizStatusEnum | NOT NULL, default='in_progress' | |
| passed | boolean | nullable | |
| score | real | nullable | 0-1 percentage |
| started_at | timestamp | defaultNow(), tz | |
| completed_at | timestamp | nullable, tz | |
| time_spent_seconds | integer | default=0 | |
| ai_model | varchar(100) | nullable | Model used for explanations |

## A5.6 user_progress

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, defaultRandom() | |
| user_id | uuid | FK->users(CASCADE) | |
| module_id | uuid | FK->modules(CASCADE) | |
| practice_questions_answered | integer | default=0 | |
| practice_correct_answers | integer | default=0 | |
| quiz_attempts | integer | default=0 | |
| best_quiz_score | real | nullable | 0-1 |
| last_quiz_passed | boolean | nullable | |
| is_completed | boolean | default=false | |
| completed_at | timestamp | nullable, tz | |
| total_time_spent_seconds | integer | default=0 | |
| last_activity_at | timestamp | nullable, tz | |

**Unique Constraint**: (user_id, module_id)

## A5.7 attestations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, defaultRandom() | |
| user_id | uuid | FK->users(CASCADE) | |
| attestation_type | varchar(50) | NOT NULL | 'day1', 'module', 'full' |
| module_id | uuid | FK->modules(SET NULL) | |
| attested_at | timestamp | defaultNow(), tz | |
| ip_address | varchar(45) | nullable | |
| user_agent | text | nullable | |
| quiz_session_id | uuid | FK->quiz_sessions(SET NULL) | |

## A5.8 audit_log

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, defaultRandom() | |
| user_id | uuid | FK->users(SET NULL) | |
| user_email | varchar(255) | nullable | |
| action | varchar(100) | NOT NULL | 'login', 'quiz_completed', etc. |
| resource_type | varchar(50) | nullable | 'quiz', 'module', 'user' |
| resource_id | uuid | nullable | |
| details | jsonb | nullable | Action-specific data |
| ip_address | varchar(45) | nullable | |
| user_agent | text | nullable | |
| created_at | timestamp | defaultNow(), tz | |

## A5.9 cards (JIT Reference)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, defaultRandom() | |
| module_id | uuid | FK->modules(SET NULL) | |
| slug | varchar(100) | UNIQUE, NOT NULL | |
| title | varchar(255) | NOT NULL | |
| category | varchar(100) | nullable | |
| content | jsonb | NOT NULL | {sections, phoneNumbers, keyPoints} |
| source_file | varchar(255) | nullable | |
| order_index | integer | default=0 | |
| is_active | boolean | default=true | |
| created_at | timestamp | defaultNow(), tz | |
| updated_at | timestamp | defaultNow(), tz | |

**8 Seeded Cards**: nsaids-alternatives, nsaids-triple-whammy, ppis-switch-protocol, tobacco-quitline, statins-eligibility, statins-pcsk9i, anemia-workflow, anemia-stopbang

---

# A6. Cross-Reference: Shared Fields Across Systems

## Patient Identifiers

| Field | Quality Metrics | Workload Offload | Implementation Plan | CKD Note Template |
|-------|-----------------|-------------------|--------------------|--------------------|
| Primary Key | _patientIdentifier (UUID) | PatientID (Text) | patient_id (Key) | -- (session-based) |
| Epic MRN | epic_mrn | MRN | mrn | auto-pulled |
| Name | first_name, last_name | FirstName, LastName | first_name, last_name | auto-pulled |
| DOB | dob | DateOfBirth | dob | auto-pulled |
| CKD Stage | current_ckd_stage (G1-G5, G5D_*) | CKDStage (Stage 1-5, Dialysis) | ckd_stage (1-5, ESRD) | ckd_stage (header) |

## GDMT Tracking

| Pillar | Quality Metrics | Implementation Plan | CKD Note Template |
|--------|-----------------|--------------------|--------------------|
| ACEi/ARB | Medications table (is_gdmt, gdmt_pillar=RAAS) | GDMT_Status.acei_arb_status | Section 8 (`raas`) |
| SGLT2i | Medications table (gdmt_pillar=SGLT2i) | GDMT_Status.sglt2i_status | Section 9 (`sglt2i`) |
| MRA | Medications table (gdmt_pillar=MRA) | GDMT_Status.mra_status | Section 10 (`mra`) |
| GLP-1 RA | Medications table (gdmt_pillar=GLP1_RA) | -- | Section 11 (`glp1`) |
| 4-Pillar Complete | Quality_Metrics_Snapshot.four_pillar_complete | -- | header.gdmt_compliance |

## Quality Measures

| Measure | Quality Metrics Field | Implementation Plan | CKD Note Template |
|---------|----------------------|--------------------|--------------------|
| BP <130/80 | bp_at_target_130_80 | bp_at_goal_130 | bp_fluid section |
| BP <140/90 | bp_at_target_140_90 | bp_at_goal_140 | bp_fluid section |
| Transplant Referred | Quality_Metrics_Snapshot | transplant_referred | transplant section |
| Tobacco Screening | mips_226_tobacco | -- | tobacco section |
| ACP | mips_047_acp | -- | acp section |
| Falls | mips_318_falls | -- | fall_risk section |

## Module Topic Cross-Reference

| Topic | Workload Offload Table | CKD Note Section | Training Module | Implementation Card |
|-------|----------------------|------------------|-----------------|-------------------|
| NSAIDs | NSAID_Assessments | 19: nsaid | nsaids | NSAIDs Module |
| PPIs | PPI_Assessments | 20: ppi | ppis | -- |
| Tobacco | Tobacco_Assessments | 18: tobacco | tobacco | -- |
| Statins | Statin_Assessments | 7: lipid_therapy | statins | -- |
| Anemia | Anemia_Assessments | 15: anemia | anemia-sleep | Anemia Module |
| Sleep Apnea | SleepApnea_Assessments | 31: sleep_apnea | anemia-sleep | -- |
| Leqvio | LeqvioInjections | 7: lipid_therapy | -- | -- |
| Diabetes | -- | 12: diabetes | -- | Diabetes Module |
| Heart Failure | -- | 6: heart_failure | -- | Heart Failure Module |
| Gout | -- | 13: gout | -- | Gout/Krystexxa Module |
| Transplant | -- | 24: transplant | -- | Transplant Module |
| Dialysis | -- | 25: dialysis | -- | Dialysis Module |
| Pre-Dialysis | -- | 25: dialysis | -- | Pre-Dialysis Module |
| BP Control | -- | 5: bp_fluid | -- | BP Control Module |
| Bone Mineral | -- | 16: mbd | -- | Bone Mineral Module |
| AKI Follow-up | -- | -- | -- | AKI Follow-up Module |
| New Patient | -- | -- | -- | New Patient Module |

---

*End of Full Reference*  
*Summary: [TALIA-SYSTEM-DATA-MODEL.md](TALIA-SYSTEM-DATA-MODEL.md)*
