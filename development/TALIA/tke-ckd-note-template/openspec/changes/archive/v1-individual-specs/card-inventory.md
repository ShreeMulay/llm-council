# Card Inventory - Complete Specification

## Status: APPROVED
## Version: 1.0

---

## Physical Card Standards

- **Size**: TBD (paper prototype first; candidates: 5.5"x8.5" half-letter, 4"x6" index, 5"x7")
- **Stock**: Heavy cardstock (100lb cover)
- **Print**: Double-sided (Front: clinical assessment, Back: patient education)
- **Marking**: OMR-compatible filled circles for OCR scanning (98%+ accuracy target)
- **QR Code**: Per-card linking to patient education video/content
- **Version Tracking**: Footer with TKE-XXXX-v1.0 format
- **Patient ID Zone**: Barcode/label area for patient identification

## Card Design Pattern

**FRONT (Clinical - MA/Provider fills)**
```
┌─────────────────────────────────────────┐
│ [COLOR BAR]  CARD TITLE    TKE-XXXX    │
│ Patient: _________ Date: ____ MRN: ____ │
├─────────────────────────────────────────┤
│ SECTION A: Assessment (MA fills)        │
│ ○ Option 1  ○ Option 2  ○ Option 3     │
│ Value: _____ Unit: _____ Date: _____    │
├─────────────────────────────────────────┤
│ SECTION B: Current Status               │
│ □ Checkbox items                        │
│ ○ Circle-select options                 │
├─────────────────────────────────────────┤
│ SECTION C: Plan (Provider fills)        │
│ □ Action items / orders                 │
│ □ Medication changes                    │
├─────────────────────────────────────────┤
│ [QR Code]  TKE-XXXX-v1.0  KEEP CARD   │
└─────────────────────────────────────────┘
```

**BACK (Patient Education)**
```
┌─────────────────────────────────────────┐
│ [COLOR BAR]  WHAT THIS MEANS FOR YOU    │
├─────────────────────────────────────────┤
│ Plain language explanation              │
│ (6th grade reading level)              │
│                                         │
│ YOUR TARGETS:                           │
│ • Target 1: ____                        │
│ • Target 2: ____                        │
│                                         │
│ WHAT YOU CAN DO:                        │
│ • Action 1                              │
│ • Action 2                              │
│                                         │
│ WHEN TO CALL US:                        │
│ • Warning sign 1                        │
│ • Warning sign 2                        │
│                                         │
│ [QR: Video education link]              │
│ TKE: (731) xxx-xxxx                     │
└─────────────────────────────────────────┘
```

---

## Complete Card Inventory (42 Cards)

### Category 1: Kidney Core (Blue #3B82F6)

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

### Category 2: Cardiovascular-Renal (Red #EF4444)

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 9 | TKE-BPFL | Blood Pressure & Fluid | BP & Fluid | Concept |
| 10 | TKE-HF | Heart Failure / GDMT | Heart Failure | Concept |
| 11 | TKE-STAT | Statin / Lipid Therapy | Lipid Therapy | **BUILT** |
| 12 | TKE-DAXR | Daxor Blood Volume | BP & Fluid (sub) | Concept |

### Category 3: Pharmacotherapy / 4 Pillars (Purple #8B5CF6)

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 13 | TKE-RAAS | RAAS Inhibitor Optimization | RAAS Inhibition | Concept |
| 14 | TKE-SGLT | SGLT2 Inhibitor | SGLT2i | Concept |
| 15 | TKE-FINE | Finerenone (MRA) | MRA | Concept |
| 16 | TKE-GLP1 | GLP-1 Receptor Agonist | GLP-1 RA | Concept |

### Category 4: Metabolic (Orange #F97316)

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 17 | TKE-DM | Diabetes Management | Diabetes | Concept |
| 18 | TKE-GOUT | Gout / Krystexxa | Gout | Concept |
| 19 | TKE-OBES | Obesity Management | Obesity | Concept |

### Category 5: CKD Complications (Dark Blue #1E40AF)

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 20 | TKE-ANEM | Anemia / Blood Health | Anemia | **BUILT** |
| 21 | TKE-MBD | Mineral Bone Disease | MBD | Concept |
| 22 | TKE-ELEC | Electrolytes & Acid-Base | Electrolytes | Concept |

### Category 6: Risk Mitigation (Green #22C55E)

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 23 | TKE-NSAI | NSAID Avoidance | NSAIDs | **BUILT** |
| 24 | TKE-SMOK | Smoking Cessation | Tobacco | **BUILT** |
| 25 | TKE-PPI | PPI Review | PPI | **BUILT** |
| 26 | TKE-SICK | Sick Day Rules | Sick Day Rules | Concept |
| 27 | TKE-CONT | Contrast Precautions | Contrast | Concept |
| 28 | TKE-SODM | Sodium Restriction | Sodium | Concept |

### Category 7: Planning & Transitions (Gray #6B7280)

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 29 | TKE-TXPL | Transplant Readiness | Transplant | Concept |
| 30 | TKE-DIAL | Dialysis Planning / Vascular Access | Dialysis Planning | Concept |
| 31 | TKE-ACP | Advance Care Planning | ACP | Concept |
| 32 | TKE-CCM | CCM Enrollment | CCM | Concept |

### Category 8: Screening & Prevention (Teal #14B8A6)

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 33 | TKE-VACC | Immunizations | Immunizations | Concept |
| 34 | TKE-PHQ | Depression Screen (PHQ-2/9) | Depression | Concept |
| 35 | TKE-FALL | Fall Risk Assessment | Fall Risk | Concept |
| 36 | TKE-SLAP | Sleep Apnea (STOP-BANG) | Sleep Apnea | **BUILT** |
| 37 | TKE-SDOH | SDOH Assessment | SDOH | Concept |
| 38 | TKE-GRIP | Grip Strength & Sarcopenia | Physical Performance | Concept |
| 39 | TKE-FUNC | Functional Mobility Battery | Physical Performance | Concept |

### Category 9: Care Coordination (Pink #EC4899)

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 40 | TKE-CRM | Cardiorenal Metabolic Clinic | Special Clinics | Concept |
| 41 | TKE-LONG | Longevity Clinic | Special Clinics | Concept |

### Category 10: Nutrition (Lime #84CC16)

| # | Code | Card Name | Note Section | Status |
|---|------|-----------|-------------|--------|
| 42 | TKE-NUTR | Nutrition / Dietary Assessment | Nutrition | Concept |

### Cross-Cutting (Not a card - AI Alert)

| Code | Alert Name | Trigger |
|------|-----------|---------|
| TKE-TRIP | Triple Whammy Alert | RAASi + Diuretic + NSAID detected |

### Workflow Cards (Non-Clinical, Previously Built)

| Code | Card Name | Status |
|------|-----------|--------|
| TKE-TRIAGE | Receptionist Triage | **BUILT** |
| TKE-PROVQR | Provider Quick Reference | **BUILT** |
| TKE-TRIP-CARD | Triple Whammy (education) | **BUILT** |

---

## Summary

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
| Workflow (non-clinical) | - | 3 | 3 | 0 |
| **Grand Total** | | **45** | **9** | **36** |

## Existing Card Locations

Built cards are in: `development/TALIA/tke-provider-workload-offload/cards/`
- `nsaids.md`, `ppis.md`, `tobacco.md`, `triple-whammy.md`
- `statins.md`, `anemia.md`, `sleep-apnea.md`
- `receptionist-triage.md`, `provider-quick-reference.md`
- `leqvio-patient-faq.md`
- `all-cards-printable.html` (TKE branded, 5.5"x8.5")
