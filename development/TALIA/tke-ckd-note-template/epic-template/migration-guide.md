# Epic SmartPhrase Migration Guide

## From @ED@ to @TKECKD@

This guide helps providers transition from the legacy @ED@ SmartPhrase to the new @TKECKD@ AI-era CKD note template.

---

## Overview

| Aspect | Legacy @ED@ | New @TKECKD@ |
|--------|-------------|--------------|
| Sections | ~15 informal | 37 structured |
| SmartLists | 23 | 76 |
| SmartList ID Range | 27000s | 30000s |
| AI Integration | None | Full (per-section) |
| GDMT Tracking | Partial | Complete (4 pillars) |
| Data Loss | N/A | ZERO |

---

## SmartList ID Migration Map

### Header Fields

| Legacy SmartList | Legacy ID | New SmartList | New ID |
|------------------|-----------|---------------|--------|
| {here for:27012} | 27012 | .TKECKD REASON FOR VISIT | 30008 |
| {Follow Up:27013} | 27013 | .TKECKD FOLLOW UP INTERVAL | 30009 |
| {suspected/biopsy confirmed:27058} | 27058 | .TKECKD PATHOLOGY CONFIRMATION | 30004 |
| {CKD ETIOLOGY:27079} | 27079 | .TKECKD CKD ETIOLOGY | 30003 |
| {CCM Status:27080} | 27080 | .TKECKD CCM STATUS | 30007 |
| {TKE Who:27081} | 27081 | (free text) | N/A |

### Kidney Function

| Legacy SmartList | Legacy ID | New SmartList | New ID |
|------------------|-----------|---------------|--------|
| {TKE Urine Summary:27014} | 27014 | .TKECKD URINE SUMMARY | 30012 |
| {TKE Urine Studies:27015} | 27015 | (free text) | N/A |
| {proteinuria:27655} | 27655 | .TKECKD PROTEINURIA STATUS | 30011 |

### Blood Pressure & Fluid

| Legacy SmartList | Legacy ID | New SmartList | New ID |
|------------------|-----------|---------------|--------|
| {controlled/uncontrolled/unknown:27016} | 27016 | .TKECKD BP CONTROL STATUS | 30016 |

### Pharmacotherapy (4 Pillars)

| Legacy SmartList | Legacy ID | New SmartList | New ID |
|------------------|-----------|---------------|--------|
| {RAAS Inhibition:27018} | 27018 | .TKECKD RAAS STATUS | 30025 |
| {SGLT2i status:27020} | 27020 | .TKECKD SGLT2I STATUS | 30027 |
| (none) | N/A | .TKECKD MRA STATUS | 30029 |
| (none) | N/A | .TKECKD GLP1 STATUS | 30031 |

### Diabetes

| Legacy SmartList | Legacy ID | New SmartList | New ID |
|------------------|-----------|---------------|--------|
| {is diabetic?:27021} | 27021 | .TKECKD DIABETIC STATUS | 30033 |

### CKD Complications

| Legacy SmartList | Legacy ID | New SmartList | New ID |
|------------------|-----------|---------------|--------|
| {at goal? TKE Anemia:27025} | 27025 | .TKECKD ANEMIA AT GOAL | 30039 |
| {Anemia Clinic?:27690} | 27690 | .TKECKD ANEMIA CLINIC | 30040 |
| {At Goal? TKE Mineral Bone Disease:27037} | 27037 | .TKECKD MBD AT GOAL | 30041 |
| {At Goal? TKE Electrolytes and Acid Base:27038} | 27038 | .TKECKD ELECTROLYTES AT GOAL | 30042 |

### Risk Mitigation

| Legacy SmartList | Legacy ID | New SmartList | New ID |
|------------------|-----------|---------------|--------|
| {TKEcurrentsmokingstatus:27041} | 27041 | .TKECKD SMOKING STATUS | 30044 |
| {TKE NSAID:27043} | 27043 | .TKECKD NSAID STATUS | 30045 |
| {TKE PPI:27044} | 27044 | .TKECKD PPI STATUS | 30046 |

### Other

| Legacy SmartList | Legacy ID | New SmartList | New ID |
|------------------|-----------|---------------|--------|
| {episodes of:27040} | 27040 | (free text) | N/A |
| {uric acid:27042} | 27042 | .TKECKD URIC ACID STATUS | 30037 |
| {TKE Statin:27055} | 27055 | .TKECKD STATIN STATUS | 30022 |

---

## New SmartLists (Not in Legacy)

The new template adds 53 new SmartLists for comprehensive CKD documentation:

### Header (Section 0)
- .TKECKD VISIT TYPE (30001)
- .TKECKD CKD STAGE (30002)
- .TKECKD ALBUMINURIA STAGE (30005)
- .TKECKD KDIGO RISK (30006)

### Kidney Function (Section 1)
- .TKECKD EGFR TREND (30010)
- .TKECKD RENALYTIX RESULT (30013)

### Hematuria (Section 2)
- .TKECKD HEMATURIA TYPE (30014)
- .TKECKD WORKUP STATUS (30015)

### Blood Pressure & Fluid (Section 5)
- .TKECKD EDEMA (30017)
- .TKECKD FLUID STATUS (30018)

### Heart Failure (Section 6)
- .TKECKD HF TYPE (30019)
- .TKECKD CRS TYPE (30020)
- .TKECKD FUROSCIX STATUS (30021)

### Lipid Therapy (Section 7)
- .TKECKD PCSK9I STATUS (30023)
- .TKECKD PCSK9I DRUG (30024)

### Pharmacotherapy (Sections 8-11)
- .TKECKD RAAS NOT ON REASON (30026)
- .TKECKD SGLT2I NOT ON REASON (30028)
- .TKECKD MRA NOT ON REASON (30030)
- .TKECKD GLP1 NOT ON REASON (30032)

### Diabetes (Section 12)
- .TKECKD INSULIN STATUS (30034)
- .TKECKD ANNUAL EXAM STATUS (30035, 30036)

### Gout (Section 13)
- .TKECKD KRYSTEXXA STATUS (30038)

### Electrolytes (Section 17)
- .TKECKD PRURITUS (30043)

### Planning (Sections 24-26)
- .TKECKD TRANSPLANT CANDIDATE (30048)
- .TKECKD TRANSPLANT CURRENT STATUS (30049)
- .TKECKD DIALYSIS MODALITY (30050)
- .TKECKD VASCULAR ACCESS STATUS (30051)
- .TKECKD SURPRISE QUESTION (30052)

### CCM (Section 27)
- .TKECKD CCM ENROLLMENT (30053)

### Immunizations (Section 28)
- .TKECKD VACCINE STATUS (30054-30059)
- .TKECKD HEP B STATUS (30056)
- .TKECKD SHINGRIX STATUS (30058)

### Screening (Sections 29-32)
- .TKECKD DEPRESSION STATUS (30060)
- .TKECKD FALL RISK (30061)
- .TKECKD CPAP COMPLIANCE (30062)
- .TKECKD TRANSPORTATION (30063)
- .TKECKD HOUSING STABILITY (30064)
- .TKECKD FOOD SECURITY (30065)
- .TKECKD HEALTH LITERACY (30066)

### Physical Performance (Section 33)
- .TKECKD FRAILTY STATUS (30067)

### Nutrition (Section 34)
- .TKECKD PROTEIN INTAKE (30068)
- .TKECKD RESTRICTION LEVEL (30069, 30070)
- .TKECKD MALNUTRITION SCREEN (30071)

### Medication Adherence (Section 35)
- .TKECKD ADHERENCE ASSESSMENT (30072)
- .TKECKD PHARMACY ACCESS (30073)

### Special Clinics (Section 36)
- .TKECKD SPECIAL CLINIC STATUS (30074-30076)

---

## Epic Auto-Pull Tags

These Epic tags auto-populate data:

| Tag | Description | Maps To |
|-----|-------------|---------|
| @NAME@ | Patient name | Header |
| @DOB@ | Date of birth | Header |
| @MRN@ | Medical record number | Header |
| @TD@ | Today's date | Header |
| @ME@ | Provider name | Header |
| @NOW@ | Current date/time | Footer |
| @LASTENCBP@ | Last BP | bp_fluid.systolic_bp, diastolic_bp |
| @LASTENCPU@ | Last pulse | bp_fluid.heart_rate |
| @LASTENCWT@ | Last weight | header.weight |
| @LASTENCBMI@ | Last BMI | header.bmi |

---

## Training Checklist for Providers

### Before Go-Live

- [ ] Review new template structure (37 sections)
- [ ] Understand GDMT 4 Pillars tracking (RAAS, SGLT2i, MRA, GLP-1)
- [ ] Learn new SmartList options
- [ ] Practice with test patients
- [ ] Review AI interpretation placeholders

### During Transition

- [ ] Use @TKECKD@ for follow-up visits
- [ ] Use @TKECKD-INIT@ for new patient visits
- [ ] Report any missing fields or issues
- [ ] Provide feedback on workflow

### Key Differences to Note

1. **Conditional Sections**: Some sections only appear when relevant (e.g., Hematuria only if hematuria present)

2. **AI Interpretation Placeholders**: Each section has `[AI INTERPRETATION]` where AI-generated insights will appear

3. **4 Pillars GDMT**: Sections 8-11 track the four pillars of CKD GDMT:
   - Pillar 1: RAAS Inhibition (ACEi/ARB/ARNi)
   - Pillar 2: SGLT2 Inhibitor
   - Pillar 3: MRA (Finerenone/Spironolactone)
   - Pillar 4: GLP-1 Receptor Agonist

4. **KDIGO Risk Matrix**: Header now includes KDIGO risk category based on CKD stage + albuminuria

5. **KFRE Integration**: Kidney Failure Risk Equation (2-year and 5-year) prominently displayed

6. **Physical Performance**: New section for grip strength, gait speed, frailty assessment

7. **SDOH Assessment**: Social determinants of health now systematically captured

---

## Rollback Plan

If issues arise, providers can temporarily revert to @ED@ while issues are resolved.

**To rollback:**
1. Type @ED@ instead of @TKECKD@
2. Report issue to IT/informatics
3. Continue with legacy template until fix deployed

---

## Support

For questions or issues:
- Epic Support: [internal contact]
- Template Owner: [informatics team]
- Clinical Questions: [nephrology leadership]

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-02-03 | Initial release |

---

## Appendix: Complete SmartList ID Reference

### ID Range: 30001-30076

| ID | SmartList Name | Section |
|----|----------------|---------|
| 30001 | .TKECKD VISIT TYPE | Header |
| 30002 | .TKECKD CKD STAGE | Header |
| 30003 | .TKECKD CKD ETIOLOGY | Header |
| 30004 | .TKECKD PATHOLOGY CONFIRMATION | Header |
| 30005 | .TKECKD ALBUMINURIA STAGE | Header |
| 30006 | .TKECKD KDIGO RISK | Header |
| 30007 | .TKECKD CCM STATUS | Header |
| 30008 | .TKECKD REASON FOR VISIT | Header |
| 30009 | .TKECKD FOLLOW UP INTERVAL | Header |
| 30010 | .TKECKD EGFR TREND | Kidney Function |
| 30011 | .TKECKD PROTEINURIA STATUS | Kidney Function |
| 30012 | .TKECKD URINE SUMMARY | Kidney Function |
| 30013 | .TKECKD RENALYTIX RESULT | Kidney Function |
| 30014 | .TKECKD HEMATURIA TYPE | Hematuria |
| 30015 | .TKECKD WORKUP STATUS | Hematuria |
| 30016 | .TKECKD BP CONTROL STATUS | BP & Fluid |
| 30017 | .TKECKD EDEMA | BP & Fluid |
| 30018 | .TKECKD FLUID STATUS | BP & Fluid |
| 30019 | .TKECKD HF TYPE | Heart Failure |
| 30020 | .TKECKD CRS TYPE | Heart Failure |
| 30021 | .TKECKD FUROSCIX STATUS | Heart Failure |
| 30022 | .TKECKD STATIN STATUS | Lipid Therapy |
| 30023 | .TKECKD PCSK9I STATUS | Lipid Therapy |
| 30024 | .TKECKD PCSK9I DRUG | Lipid Therapy |
| 30025 | .TKECKD RAAS STATUS | RAAS |
| 30026 | .TKECKD RAAS NOT ON REASON | RAAS |
| 30027 | .TKECKD SGLT2I STATUS | SGLT2i |
| 30028 | .TKECKD SGLT2I NOT ON REASON | SGLT2i |
| 30029 | .TKECKD MRA STATUS | MRA |
| 30030 | .TKECKD MRA NOT ON REASON | MRA |
| 30031 | .TKECKD GLP1 STATUS | GLP-1 |
| 30032 | .TKECKD GLP1 NOT ON REASON | GLP-1 |
| 30033 | .TKECKD DIABETIC STATUS | Diabetes |
| 30034 | .TKECKD INSULIN STATUS | Diabetes |
| 30035 | .TKECKD ANNUAL EXAM STATUS (Eye) | Diabetes |
| 30036 | .TKECKD ANNUAL EXAM STATUS (Foot) | Diabetes |
| 30037 | .TKECKD URIC ACID STATUS | Gout |
| 30038 | .TKECKD KRYSTEXXA STATUS | Gout |
| 30039 | .TKECKD ANEMIA AT GOAL | Anemia |
| 30040 | .TKECKD ANEMIA CLINIC | Anemia |
| 30041 | .TKECKD MBD AT GOAL | MBD |
| 30042 | .TKECKD ELECTROLYTES AT GOAL | Electrolytes |
| 30043 | .TKECKD PRURITUS | Electrolytes |
| 30044 | .TKECKD SMOKING STATUS | Tobacco |
| 30045 | .TKECKD NSAID STATUS | NSAID |
| 30046 | .TKECKD PPI STATUS | PPI |
| 30047 | .TKECKD DIET ADHERENCE | Sodium |
| 30048 | .TKECKD TRANSPLANT CANDIDATE | Transplant |
| 30049 | .TKECKD TRANSPLANT CURRENT STATUS | Transplant |
| 30050 | .TKECKD DIALYSIS MODALITY | Dialysis |
| 30051 | .TKECKD VASCULAR ACCESS STATUS | Dialysis |
| 30052 | .TKECKD SURPRISE QUESTION | ACP |
| 30053 | .TKECKD CCM ENROLLMENT | CCM |
| 30054 | .TKECKD VACCINE STATUS (Flu) | Immunizations |
| 30055 | .TKECKD VACCINE STATUS (Pneumo) | Immunizations |
| 30056 | .TKECKD HEP B STATUS | Immunizations |
| 30057 | .TKECKD VACCINE STATUS (COVID) | Immunizations |
| 30058 | .TKECKD SHINGRIX STATUS | Immunizations |
| 30059 | .TKECKD VACCINE STATUS (Tdap) | Immunizations |
| 30060 | .TKECKD DEPRESSION STATUS | Depression |
| 30061 | .TKECKD FALL RISK | Fall Risk |
| 30062 | .TKECKD CPAP COMPLIANCE | Sleep Apnea |
| 30063 | .TKECKD TRANSPORTATION | SDOH |
| 30064 | .TKECKD HOUSING STABILITY | SDOH |
| 30065 | .TKECKD FOOD SECURITY | SDOH |
| 30066 | .TKECKD HEALTH LITERACY | SDOH |
| 30067 | .TKECKD FRAILTY STATUS | Physical Performance |
| 30068 | .TKECKD PROTEIN INTAKE | Nutrition |
| 30069 | .TKECKD RESTRICTION LEVEL (K) | Nutrition |
| 30070 | .TKECKD RESTRICTION LEVEL (Phos) | Nutrition |
| 30071 | .TKECKD MALNUTRITION SCREEN | Nutrition |
| 30072 | .TKECKD ADHERENCE ASSESSMENT | Med Adherence |
| 30073 | .TKECKD PHARMACY ACCESS | Med Adherence |
| 30074 | .TKECKD SPECIAL CLINIC STATUS (CRM) | Special Clinics |
| 30075 | .TKECKD SPECIAL CLINIC STATUS (Long) | Special Clinics |
| 30076 | .TKECKD SPECIAL CLINIC STATUS (HF) | Special Clinics |
