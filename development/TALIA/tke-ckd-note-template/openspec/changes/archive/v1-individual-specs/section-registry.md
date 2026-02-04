# Section Registry - Complete Specification

## Status: APPROVED
## Version: 1.0

---

## Design Pattern (Every Section)

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

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
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

## DOMAIN 1: KIDNEY CORE (Blue)

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
| aki_history | text | - | provider | - | NEW (council addition) |

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

## DOMAIN 2: CARDIOVASCULAR-RENAL (Red)

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

## DOMAIN 3: PHARMACOTHERAPY - THE 4 PILLARS (Purple)

### Section 8: RAAS Inhibition (ACEi/ARB/ARNi)

**Card**: TKE-RAAS | **Mode**: always | **Agent**: raas_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| raas_status | enum | - | provider | On therapy | `{RAAS Inhibition:27018}` |
| raas_drug_dose | text | - | med_list | Max tolerated | - |
| at_max_dose | boolean | - | provider | true | NEW |
| not_on_reason | enum: hyperkalemia/AKI/hypotension/contraindicated/other | - | provider | - | NEW |
| cr_rise_since_start | number | % | calculated | <30% | NEW |
| k_on_therapy | number | mEq/L | labs_api | <5.5 | NEW |

### Section 9: SGLT2 Inhibitor

**Card**: TKE-SGLT | **Mode**: always | **Agent**: sglt2i_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| sglt2i_status | enum | - | provider | On therapy (if eGFR>=20) | `{SGLT2i status:27020}` |
| sglt2i_drug_dose | text | - | med_list | - | - |
| not_on_reason | enum: egfr_too_low/uti/dka_risk/declined/other | - | provider | - | NEW |
| initial_egfr_dip_documented | boolean | - | provider | - | NEW |
| sick_day_rules_reviewed | boolean | - | provider | true | NEW |

### Section 10: MRA (Finerenone / Spironolactone / Eplerenone)

**Card**: TKE-FINE | **Mode**: always | **Agent**: mra_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| mra_status | enum: on/not_indicated/consider/contraindicated | - | provider | - | NEW |
| mra_drug_dose | text | - | med_list | - | - |
| not_on_reason | enum: hyperkalemia/not_indicated/other | - | provider | - | NEW |
| k_monitoring_schedule | text | - | provider | - | NEW |
| potassium_binder | text | - | med_list | - | NEW |

### Section 11: GLP-1 Receptor Agonist

**Card**: TKE-GLP1 | **Mode**: always | **Agent**: glp1_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| glp1_status | enum: on/consider/not_indicated/contraindicated | - | provider | - | NEW |
| glp1_drug_dose | text | - | med_list | - | NEW |
| not_on_reason | enum: not_diabetic/gi_intolerance/cost/declined/other | - | provider | - | NEW |
| weight_response | text | - | calculated | - | NEW |
| kidney_benefit_documented | boolean | - | provider | - | NEW |

---

## DOMAIN 4: METABOLIC (Orange)

### Section 12: Diabetes Management

**Card**: TKE-DM, TKE-EVER | **Mode**: conditional (when diabetic) | **Agent**: diabetes_agent

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
| eversense_cgm | boolean | - | provider | - | NEW |

### Section 13: Gout

**Card**: TKE-GOUT | **Mode**: conditional | **Agent**: gout_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| gout_history | text | - | provider | - | "Regarding gout, ***" |
| uric_acid | number | mg/dL | labs_api | <6.0 | - |
| uric_acid_status | enum | - | provider | - | `{uric acid:27042}` |
| current_therapy | text | - | med_list | - | - |
| krystexxa_status | enum: on/candidate/not_indicated | - | provider | - | NEW |
| last_flare | date | - | patient | - | NEW |

### Section 14: Obesity / Weight Management

**Card**: TKE-OBES | **Mode**: conditional (BMI >= 30) | **Agent**: metabolic_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| bmi | number | kg/m2 | vitals | <30 | `@LASTENCBMI@` |
| weight_trend_6mo | text | - | calculated | - | NEW |
| obesity_clinic_referral | boolean | - | provider | - | NEW |
| bariatric_surgery_history | boolean | - | chart | - | NEW |

---

## DOMAIN 5: CKD COMPLICATIONS (Dark Blue)

### Section 15: Anemia / Blood Health

**Card**: TKE-ANEM | **Mode**: always | **Agent**: anemia_agent

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

### Section 16: Mineral Bone Disease

**Card**: TKE-MBD | **Mode**: always (CKD G3+) | **Agent**: mbd_agent

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

**Card**: TKE-ELEC | **Mode**: always | **Agent**: electrolytes_agent

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
| pruritus | enum: none/mild/moderate/severe | - | patient | none | NEW (council addition) |

---

## DOMAIN 6: RISK MITIGATION (Green)

### Section 18: Tobacco / Substance Use

**Card**: TKE-SMOK | **Mode**: always | **Agent**: general_ckd_agent

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

## DOMAIN 7: PLANNING & TRANSITIONS (Gray)

### Section 24: Transplant Readiness

**Card**: TKE-TXPL | **Mode**: conditional (CKD G4+ or KFRE >20%) | **Agent**: transplant_agent

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

**Card**: TKE-DIAL | **Mode**: conditional (CKD G4+ or KFRE >20%) | **Agent**: transplant_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| dialysis_education | boolean | - | provider | true (by G4) |
| modality_preference | enum: HD/PD/HHD/Conservative/Undecided | - | patient | - |
| vascular_access_status | enum: none/AVF_planned/AVF_maturing/AVG/Catheter | - | provider | - |
| access_location | text | - | provider | - |
| surgery_referral_date | date | - | provider | - |
| timeline_to_dialysis | text | - | calculated (KFRE) | - |
| vein_preservation | boolean | - | provider | true | NEW (council addition) |

### Section 26: Advance Care Planning

**Card**: TKE-ACP | **Mode**: conditional (CKD G4+ or age >75) | **Agent**: general_ckd_agent

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

**Card**: TKE-CCM | **Mode**: always (CKD G3+) | **Agent**: general_ckd_agent

| Field | Type | Unit | Source | Target | Legacy |
|-------|------|------|--------|--------|--------|
| ccm_enrollment | enum | - | coordinator | enrolled | `{CCM Status:27080}` |
| ccm_active | boolean | - | coordinator | true | NEW |
| last_ccm_contact | date | - | coordinator | - | NEW |
| care_gaps | text | - | coordinator | - | NEW |

---

## DOMAIN 8: SCREENING & PREVENTION (Teal)

### Section 28: Immunizations

**Card**: TKE-VACC | **Mode**: always | **Agent**: general_ckd_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| flu_vaccine | enum: current/due/declined | - | chart | current |
| pneumococcal_pcv20 | enum: current/due/na | - | chart | current |
| hep_b | enum: immune/in_progress/due | - | chart | immune (if transplant candidate) |
| covid_vaccine | enum: current/due/declined | - | chart | current |
| shingrix | enum: complete/due/na | - | chart | complete (age 50+) |
| tdap | enum: current/due | - | chart | current |

### Section 29: Depression Screen (PHQ-2/9)

**Card**: TKE-PHQ | **Mode**: always (annual) | **Agent**: general_ckd_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| phq2_score | number | 0-6 | screening | <3 |
| phq9_score | number | 0-27 | screening | - |
| depression_status | enum: negative/mild/moderate/severe | - | calculated | negative |
| treatment_referral | text | - | provider | - |
| cognitive_screen | text | - | provider | - | NEW (council addition) |

### Section 30: Fall Risk

**Card**: TKE-FALL | **Mode**: conditional (age >65 or frail) | **Agent**: physical_performance_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| fall_risk | enum: low/moderate/high | - | screening | low |
| falls_12mo | number | - | patient | 0 |
| contributing_factors | text | - | provider | - |

### Section 31: Sleep Apnea

**Card**: TKE-SLAP | **Mode**: conditional | **Agent**: general_ckd_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| sleep_study_done | boolean | - | chart | - |
| osa_diagnosis | boolean | - | chart | - |
| cpap_compliance | enum: compliant/non_compliant/na | - | patient | compliant |
| stop_bang_score | number | 0-8 | screening | <3 |

### Section 32: SDOH Assessment

**Card**: TKE-SDOH | **Mode**: conditional (initial + annual) | **Agent**: general_ckd_agent

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

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| grip_strength_dominant | number | kg | MA (dynamometer) | Men >=27, Women >=16 (EWGSOP2) |
| grip_strength_non_dominant | number | kg | MA (dynamometer) | - |
| low_grip_flag | boolean | - | calculated | false |
| sit_to_stand_30sec | number | reps | MA | >=10 |
| gait_speed_4m | number | m/s | MA | >=0.8 |
| tug_time | number | seconds | MA | <12 |
| sppb_score | number | 0-12 | calculated | >=10 |
| clinical_frailty_scale | number | 1-9 | provider | <5 |
| six_min_walk | number | meters | by_referral | >=350 |
| frailty_status | enum: robust/pre_frail/frail | - | calculated | robust |

**AI Interpretation**: Correlate physical performance with eGFR, anemia, fluid status. Flag high-risk combinations. Track trends. Recommend renal rehab referral when indicated.

---

## DOMAIN 9: CARE COORDINATION (Pink)

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

### Section 35: Medication Adherence & Barriers

**Card**: None (note-only) | **Mode**: always | **Agent**: medication_safety_agent

| Field | Type | Unit | Source | Target |
|-------|------|------|--------|--------|
| adherence_assessment | enum: good/fair/poor | - | patient/provider | good |
| cost_barriers | boolean | - | patient | false |
| prior_auth_pending | text | - | billing | - |
| pharmacy_access | enum: good/limited | - | patient | good |
| pregnancy_contraception | text | - | provider | - | NEW (council: conditional for reproductive age) |

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
| pcp_name | text | - | chart | - | NEW |
| cardiology | text | - | chart | - | NEW |
| endocrinology | text | - | chart | - | NEW |
| other_specialists | text | - | chart | - | NEW |
| follow_up_interval | text | - | provider | - | NEW |
| next_appointment | date | - | scheduling | - | NEW |
| referrals_placed | text | - | provider | - | NEW (council addition) |
| education_delivered | text | - | auto-populated | - | NEW (council addition) |
| time_complexity | text | - | provider | - | NEW (council: billing) |

---

## Cross-Cutting Alert: Triple Whammy

**NOT a note section** - fires from `medication_safety_agent` when:
- Patient is on RAAS inhibitor (ACEi/ARB/ARNi) AND
- Patient is on diuretic AND
- Patient is on NSAID

**Action**: Red alert in digital note builder + flag in medication adherence section.

---

## Extensibility

New sections are added by:
1. Creating a new entry in this registry
2. Assigning a card code (if physical card needed)
3. Assigning an AI agent (new or existing)
4. The system auto-propagates to: note template, digital builder, report card, quality metrics
