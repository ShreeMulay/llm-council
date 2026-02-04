# TKE Renal Performance Clinic

## Version: 1.0
## Date: 2026-02-03
## Owner: Shree Mulay, MD
## Reference: openspec/master-plan.md (Part 8)
## Evidence Base: EWGSOP2 (2019), Fried Frailty Phenotype, KDIGO CKD-Sarcopenia

---

## Overview

Physical function predicts mortality better than many lab markers in CKD. The Renal Performance Clinic integrates physical performance assessment into every nephrology visit, with an escalation pathway to formal assessment and supervised rehabilitation.

**Mission**: Early detection and intervention for sarcopenia, frailty, and functional decline in CKD patients.

**Why This Matters**: 
- CKD patients lose muscle mass 3-5x faster than age-matched controls
- Grip strength below threshold independently predicts CV mortality (HR 1.7-2.3)
- Muscle wasting begins at eGFR <45 and accelerates below eGFR <30
- Early detection enables intervention before functional decline becomes irreversible

---

## Three-Tier Model

### Tier 1: In-Clinic Screening (Every CKD Visit)

| Test | Equipment | Time | Who | Threshold |
|------|-----------|------|-----|-----------|
| Hand Grip Strength | Jamar dynamometer (~$300) | 30 sec | MA | Men <27kg / Women <16kg |
| 30-Second Sit-to-Stand | Chair, stopwatch | 45 sec | MA | <10 reps = high risk |
| 4-Meter Gait Speed | Tape on floor, stopwatch | 30 sec | MA | <0.8 m/s = sarcopenia |

- **When**: Every visit, added to vital signs workflow
- **Billing**: Part of E/M visit (no separate charge)
- **Data flows to**: Section 33 (Physical Performance & Frailty)
- **Total time added**: ~2 minutes
- **Referral trigger**: Any test below threshold -> consider Tier 2 assessment

**See**: `phase-0/tier1-screening-protocol.md` for detailed MA SOP

### Tier 2: Full Physical Performance Assessment (Referral-Based)

| Test | What | Time | Who |
|------|------|------|-----|
| Full SPPB Battery | Balance + gait speed + 5x chair stand (0-12) | 15 min | PT / Exercise Physiologist |
| Timed Up and Go (TUG) | Stand, walk 3m, turn, return, sit | 2 min | PT |
| 6-Minute Walk Test | Max distance walked on flat surface | 8 min | PT |
| Frailty Scoring | Fried phenotype or Clinical Frailty Scale | 5 min | Provider |
| Exercise Prescription | Individualized resistance + aerobic plan | 10 min | PT |

- **When**: Patients flagged from Tier 1 screening
- **Duration**: 30-45 minutes
- **Billing**: CPT 97750, 97161-97163
- **Cash-pay option**: $200-350 comprehensive battery

**See**: `protocols/tier2-assessment.md` for detailed protocol

### Tier 3: Longevity Clinic / Comprehensive Evaluation

| Component | Description | Time |
|-----------|-------------|------|
| Full functional assessment | All Tier 2 tests + additional measures | 30 min |
| Sarcopenia evaluation | DXA lean mass, bioimpedance | 15 min |
| Nutritional assessment | Protein intake, malnutrition screen | 15 min |
| Exercise prescription | Detailed progressive program | 15 min |
| Follow-up planning | Monthly reassessment schedule | 5 min |

- **When**: High-risk patients, longevity-focused patients
- **Duration**: 60-90 minutes
- **Billing**: Cash-pay panel $200-350
- **Includes**: Supervised rehabilitation program (2-3x/week, 8-12 weeks)

---

## Referral Criteria

### Tier 1 -> Tier 2 Referral Triggers

Refer to Tier 2 assessment if ANY of the following:

| Test | Threshold | Action |
|------|-----------|--------|
| Grip strength | Men <27 kg / Women <16 kg | Refer for SPPB + 6MWT |
| Sit-to-stand | <10 reps in 30 seconds | Refer for SPPB + 6MWT |
| Gait speed | <0.8 m/s (>5 sec for 4m) | Refer for SPPB + 6MWT |

### Tier 2 -> Tier 3 Referral Triggers

Refer to Tier 3 / Longevity Clinic if ANY of the following:

| Finding | Threshold | Action |
|---------|-----------|--------|
| SPPB score | <=6 (low performance) | Comprehensive evaluation |
| 6MWT distance | <350 meters | Comprehensive evaluation |
| Clinical Frailty Scale | >=5 (frail) | Comprehensive evaluation |
| Fried criteria | >=3/5 (frail) | Comprehensive evaluation |
| Multiple Tier 2 abnormalities | 2+ tests abnormal | Comprehensive evaluation |

---

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

### CKD-Specific Considerations

- Muscle wasting begins at eGFR <45 and accelerates below eGFR <30
- Uremic myopathy compounds sarcopenia in advanced CKD
- Anemia (low Hgb) reduces exercise capacity independently
- Fluid overload (edema) confounds gait speed measurement
- Resistance training is safe and effective even in dialysis patients (K/DOQI guidelines)

---

## Staffing Model

| Phase | Tier | Staffing | Cost |
|-------|------|----------|------|
| Phase 0 | Tier 1 | MA does screening at intake | $300 dynamometer only |
| Phase 9 | Tier 2 | Partner with local PT practice | Per-referral cost |
| Phase 9+ | Tier 3 | In-house exercise physiologist | ~$60-80k/year |

**Breakeven for in-house hire**: ~25+ assessments/month

---

## Directory Structure

```
renal-performance-clinic/
├── README.md                    # This file
├── protocols/
│   ├── tier2-assessment.md      # Full SPPB + 6MWT protocol
│   ├── tier3-longevity.md       # Comprehensive evaluation (future)
│   └── frailty-scoring.md       # Fried + CFS protocols (future)
├── billing/
│   ├── cpt-codes.md             # Billing codes and documentation
│   └── icd10-codes.md           # Diagnosis codes (future)
└── forms/
    ├── tier2-form.html          # Printable assessment form
    └── tier3-form.html          # Longevity clinic form (future)
```

---

## Integration with Note Template

The Renal Performance Clinic feeds data into **Section 33: Physical Performance & Frailty** of the CKD note template.

| Tier | Data Captured | Note Section Fields |
|------|---------------|---------------------|
| Tier 1 | Grip, STS, gait speed | `grip_strength_dominant`, `sit_to_stand_30sec`, `gait_speed_4m` |
| Tier 2 | SPPB, 6MWT, TUG, frailty | `sppb_score`, `six_min_walk`, `tug_time`, `frailty_status` |
| Tier 3 | DXA lean mass, full battery | `clinical_frailty_scale`, additional fields |

**AI Agent**: `physical_performance_agent` interprets results and generates recommendations.

---

## Related Documents

- `phase-0/tier1-screening-protocol.md` - MA SOP for Tier 1 screening
- `openspec/master-plan.md` Part 8 - Full specification
- `openspec/master-plan.md` Section 33 - Physical Performance fields
