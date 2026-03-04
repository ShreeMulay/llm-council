# CORTEX — Inpatient Nephrology Domains

> **Version**: 1.0
> **Last Updated**: March 4, 2026
> **Total Domains**: 18
> **Groups**: 6

---

## Domain Architecture

18 clinical domains organized into 6 groups. For any given patient, only a **subset of domains are active** — the system conditionally enables domains based on consult reason, active problems, and transcript content.

---

## Group A: Core Kidney

### Domain 1: AKI (Acute Kidney Injury)

| Property | Value |
|----------|-------|
| **ID** | `aki` |
| **Color** | Red `#EF4444` |
| **Group** | Core Kidney |

**Key Sections:**
- KDIGO Staging (Stage 1/2/3)
- Etiology classification:
  - **Prerenal**: Hypovolemia, sepsis, heart failure, hemorrhage
  - **Intrinsic**: ATN, AIN (drug-induced, infection), vascular
  - **Postrenal/Obstructive**: Stones, BPH, mass, stricture
- Specific AKI syndromes:
  - **CI-AKI** (Contrast-Induced AKI)
  - **HRS** (Hepatorenal Syndrome) — Type 1 and Type 2
  - **CRS** (Cardiorenal Syndrome as AKI etiology)
  - **Obstructive AKI** — with urology consultation tracking
  - **Rhabdomyolysis** — CK levels, aggressive hydration protocol
  - **Tumor Lysis Syndrome** — uric acid, rasburicase, phosphorus
  - **Nephrotoxin-Induced** — aminoglycosides, vancomycin, NSAIDs, contrast
- Urine studies: FeNa, FeUrea, urine lytes, urine microscopy (sediment)
- Recovery trajectory tracking (Cr trend, UOP trend)
- Dialysis initiation criteria assessment
- Renal recovery probability

**High-Risk Fields:** Creatinine, potassium, UOP (all require source provenance)

---

### Domain 2: CKD / ESRD

| Property | Value |
|----------|-------|
| **ID** | `ckd_esrd` |
| **Color** | Blue `#3B82F6` |
| **Group** | Core Kidney |

**Key Sections:**
- Baseline CKD stage (G1-G5, G5D)
- CKD etiology
- In-hospital medication adjustments for renal function
- Progression monitoring (eGFR trend if available)
- ESRD-specific:
  - Dialysis adequacy (Kt/V if applicable)
  - Vascular access status (fistula, graft, catheter)
  - Missed outpatient dialysis sessions
  - Fluid/electrolyte management between sessions
- Medication renal dosing review

---

## Group B: Internal Milieu

### Domain 3: Electrolytes

| Property | Value |
|----------|-------|
| **ID** | `electrolytes` |
| **Color** | Orange `#F97316` |
| **Group** | Internal Milieu |

**Key Sections:**
- **Sodium**: Hyponatremia / Hypernatremia
  - Serum Na, serum osm, urine osm, urine Na
  - Correction rate tracking (0.5 mEq/L/hr max for chronic, ODS risk)
  - Hypertonic saline protocol if indicated
  - Free water restriction
- **Potassium**: Hypokalemia / Hyperkalemia
  - Serum K+, EKG changes, repletion protocol
  - Emergent treatment (calcium gluconate, insulin/D50, kayexalate, dialysis)
  - Potassium binders (patiromer, SZC)
- **Calcium**: Hypocalcemia / Hypercalcemia
  - Corrected calcium (for albumin), ionized calcium
  - PTH, vitamin D levels
  - IV calcium repletion or calcitonin/bisphosphonates
- **Magnesium**: Hypomagnesemia / Hypermagnesemia
  - IV/PO repletion, PPI association
- **Phosphorus**: Hypophosphatemia / Hyperphosphatemia
  - Binders, dietary restriction, IV repletion

**High-Risk Fields:** All electrolyte values require lab-verified provenance.

---

### Domain 4: Acid-Base

| Property | Value |
|----------|-------|
| **ID** | `acid_base` |
| **Color** | Amber `#F59E0B` |
| **Group** | Internal Milieu |

**Key Sections:**
- ABG interpretation (pH, pCO2, pO2, HCO3, base excess)
- Metabolic acidosis:
  - Anion gap calculation (AG = Na - Cl - HCO3)
  - Delta-delta ratio (delta AG / delta HCO3)
  - Non-anion gap (hyperchloremic): urine anion gap, RTA classification
  - Lactic acidosis, ketoacidosis, uremic acidosis
- Metabolic alkalosis:
  - Contraction alkalosis, diuretic-induced
  - Urine chloride (saline-responsive vs resistant)
- Respiratory compensation assessment
- Mixed acid-base disorders
- Bicarbonate therapy (IV bicarb, oral supplementation)
- Lactate trend

---

## Group C: Hemodynamics & Cardiovascular

### Domain 5: Fluid, Volume & Hemodynamics

| Property | Value |
|----------|-------|
| **ID** | `volume_hemodynamics` |
| **Color** | Green `#22C55E` |
| **Group** | Hemodynamics & CV |

**Key Sections:**
- **Fluid Balance**: I&O (intake/output), daily weights, net fluid balance
- **Volume Assessment**:
  - Clinical: edema, JVP, lung exam (crackles), S3, orthopnea
  - Lab: BNP/NT-proBNP, albumin (as colloid oncotic pressure marker)
  - Daxor BVA (blood volume analysis) if available
  - Intravascular volume (anemia as volume factor — low Hgb = low O2 carrying capacity even if euvolemic)
- **Blood Pressure Management**:
  - Current BP, target BP, antihypertensive regimen
  - Hypertensive emergency/urgency protocol (IV labetalol, nicardipine, clevidipine, fenoldapine, nitroprusside)
  - Permissive hypotension in certain contexts (sepsis, post-dialysis)
- **Diuretic Management**:
  - IV vs PO, bolus vs continuous infusion
  - Diuretic resistance assessment (spot urine Na after dose)
  - Combination diuretic therapy (loop + thiazide + metolazone)
  - Diuretic dose escalation protocol

---

### Domain 6: Heart Failure / Cardiorenal

| Property | Value |
|----------|-------|
| **ID** | `heart_failure_cardiorenal` |
| **Color** | Crimson `#DC2626` |
| **Group** | Hemodynamics & CV |

**Key Sections:**
- HF type: HFrEF / HFmrEF / HFpEF
- Ejection fraction, last echo date
- NYHA functional class (I-IV)
- **Cardiorenal Syndrome Classification**:
  - Type 1: Acute HF → Acute AKI
  - Type 2: Chronic HF → Chronic CKD
  - Type 3: Acute AKI → Acute HF
  - Type 4: Chronic CKD → Chronic HF
  - Type 5: Systemic → Both (sepsis, DM, amyloid)
- IV diuretic protocol (furosemide, bumetanide, ethacrynic acid)
- Decongestion monitoring (daily weights, I&O, BNP trend)
- **Aquadex/Ultrafiltration**:
  - Indication, settings, fluid removal targets
  - Access, UF rate, duration
  - Response monitoring
- BNP/NT-proBNP trending
- Inotrope use (milrinone, dobutamine) — interaction with renal perfusion
- Cardiology co-management

---

### Domain 7: CMK (Cardiometabolic-Kidney)

| Property | Value |
|----------|-------|
| **ID** | `cmk` |
| **Color** | Purple `#8B5CF6` |
| **Group** | Hemodynamics & CV |

**Key Sections:**
- **SGLT2i Status** (in-hospital): Is patient on SGLT2i? Hold/continue decision, restart plan
- **GLP-1 RA Status**: Current therapy, in-hospital management
- **4-Pillar GDMT Status**: RAAS / SGLT2i / MRA / GLP-1 — compliance tracking
- **Obesity Assessment**:
  - BMI, weight trend
  - OSA screening → sleep study referral
  - Long-term OSA implications (pulmonary HTN, cardiomyopathy)
- **Metabolic Syndrome**:
  - Insulin levels (future implementation — not yet standard in TKE population)
  - Triglycerides, HDL, waist circumference, fasting glucose
  - Metabolic syndrome criteria tracking
- **Heart-Kidney-Metabolic Integration**:
  - Cross-domain risk assessment
  - Long-term CMK risk stratification
  - Discharge medication optimization for CMK

---

## Group D: Specialized Conditions

### Domain 8: Dialysis & RRT

| Property | Value |
|----------|-------|
| **ID** | `dialysis_rrt` |
| **Color** | Dark Blue `#1E40AF` |
| **Group** | Specialized |

**Key Sections:**
- **Dialysis Initiation**:
  - Criteria assessment (uremia, refractory hyperkalemia, volume overload, acidosis, pericarditis)
  - Timing decision and documentation
  - Modality selection rationale
- **Modalities & Prescriptions**:
  - **HD** (Intermittent Hemodialysis): BFR, DFR, time, bath, UF goal
  - **CVVH** (Continuous Venovenous Hemofiltration): BFR, replacement rate, UF
  - **CVVHDF** (Continuous Venovenous Hemodiafiltration): BFR, dialysate rate, replacement rate, UF
  - **SLED** (Sustained Low-Efficiency Dialysis): BFR, DFR, time, UF
  - **PD** (Peritoneal Dialysis): Volume, dwell time, exchanges, dextrose concentration
  - **PLEX** (Therapeutic Plasma Exchange): See Domain 9 for full PLEX
  - **Aquadex** (Ultrafiltration): UF rate, target removal, duration
- **Vascular Access**:
  - Catheter: Type (tunneled/non-tunneled), site (IJ/femoral/subclavian), function
  - Fistula/Graft: Maturity, thrill/bruit, usability
  - Catheter placement procedure note
- **Anticoagulation**:
  - Heparin (systemic vs regional)
  - Citrate (regional anticoagulation) — iCa monitoring
  - No anticoagulation (HIT, active bleeding)
- **Adequacy & Monitoring**:
  - Kt/V, URR
  - Filter life (CRRT)
  - Access pressures, recirculation
  - Post-dialysis labs

**High-Risk Fields:** All prescription parameters, access type, anticoagulation — require verification.

---

### Domain 9: TMA & Therapeutic Apheresis (PLEX)

| Property | Value |
|----------|-------|
| **ID** | `tma_plex` |
| **Color** | Teal `#14B8A6` |
| **Group** | Specialized |

**Key Sections:**
- **Thrombotic Microangiopathy**:
  - TTP (Thrombotic Thrombocytopenic Purpura) — ADAMTS13, schistocytes, LDH, haptoglobin
  - aHUS (Atypical Hemolytic Uremic Syndrome) — complement studies (C3, C4, CH50, factor H/I/B)
  - Typical HUS (Shiga toxin — E. coli O157:H7)
  - Other TMA: DIC, HELLP, malignant HTN, scleroderma renal crisis, drug-induced (gemcitabine, calcineurin inhibitors)

- **Therapeutic Plasma Exchange Indications** (ASFA Category I-III):
  - **Nephrology/Renal**:
    - TTP (Cat I) — daily PLEX until platelet recovery
    - aHUS (Cat II) — before eculizumab
    - Anti-GBM / Goodpasture's (Cat I) — with cyclophosphamide + steroids
    - ANCA vasculitis with DAH (Cat I) — diffuse alveolar hemorrhage
    - Lupus nephritis, severe/crescentic (Cat III)
    - Cryoglobulinemia, symptomatic severe (Cat I)
    - Antibody-mediated rejection, transplant (Cat II)
    - ABO-incompatible transplant desensitization (Cat II)
    - HLA desensitization, positive crossmatch (Cat II)
    - Recurrent FSGS post-transplant (Cat II)
    - Myeloma cast nephropathy (Cat III)
  - **Neurology**:
    - Guillain-Barre Syndrome / GBS (Cat I)
    - Myasthenia Gravis / myasthenic crisis (Cat I)
    - Chronic Inflammatory Demyelinating Polyneuropathy / CIDP (Cat I)
    - Neuromyelitis Optica / NMOSD (Cat II)
    - Multiple Sclerosis, acute relapse, steroid-refractory (Cat II)
    - NMDA receptor encephalitis (Cat I)
    - Lambert-Eaton Myasthenic Syndrome (Cat II)
    - Paraproteinemic neuropathy (Cat II)
    - Stiff Person Syndrome (Cat II)
  - **Hematology**:
    - Hyperviscosity syndrome / Waldenstrom's (Cat I)
    - Catastrophic antiphospholipid syndrome / CAPS (Cat II)
    - Post-transfusion purpura (Cat III)
    - Sickle cell, acute complications (Cat III — red cell exchange preferred)
  - **Other**:
    - Wilson's disease, fulminant hepatic failure (Cat I)
    - Mushroom poisoning / Amanita phalloides (Cat II)
    - Pemphigus vulgaris, refractory (Cat II)
    - Dilated cardiomyopathy, new-onset severe (Cat III)
    - Drug overdose/toxin removal, protein-bound (Cat III)

- **PLEX Prescription**:
  - Volume exchanged (typically 1-1.5x plasma volume)
  - Replacement fluid: FFP (TTP), albumin 5% (most others), combination
  - Frequency (daily for TTP, every other day for most others)
  - Number of sessions planned
  - Vascular access (apheresis catheter, type, site)
- **Monitoring**:
  - Platelet count trend (TTP)
  - ADAMTS13 activity (TTP)
  - Complement levels (aHUS)
  - Fibrinogen (depleted by PLEX — check after FFP-based exchanges)
  - Ionized calcium (citrate anticoagulation → hypocalcemia)
  - Coagulation studies post-PLEX

---

### Domain 10: Transplant

| Property | Value |
|----------|-------|
| **ID** | `transplant` |
| **Color** | Magenta `#EC4899` |
| **Group** | Specialized |

**Key Sections:**
- Post-transplant management (early and late)
- Rejection surveillance:
  - Clinical: Cr rise, proteinuria, oliguria
  - Biopsy: Banff classification
  - DSA (Donor-Specific Antibodies), C4d staining
  - Borderline changes, T-cell mediated vs antibody-mediated
- Immunosuppression management:
  - Tacrolimus/Cyclosporine levels (target ranges by time post-transplant)
  - MMF/Mycophenolate dosing
  - Prednisone taper schedule
  - Induction agents (basiliximab, ATG, alemtuzumab)
- Infection in immunosuppressed:
  - BK virus (viremia, BK nephropathy)
  - CMV (viremia, prophylaxis, treatment)
  - PJP prophylaxis
  - Opportunistic infections
- Delayed graft function (DGF)
- Donor kidney function monitoring

**High-Risk Fields:** Immunosuppressant levels, drug doses — require lab-verified provenance.

---

### Domain 11: Acute GN / Glomerular Disease

| Property | Value |
|----------|-------|
| **ID** | `acute_gn` |
| **Color** | Deep Teal `#0D9488` |
| **Group** | Specialized |

**Key Sections:**
- Serological workup:
  - ANA, anti-dsDNA, complement (C3, C4, CH50)
  - ANCA (p-ANCA/MPO, c-ANCA/PR3)
  - Anti-GBM antibodies
  - PLA2R antibodies (membranous)
  - Hepatitis B/C, HIV serologies
  - Cryoglobulins, serum free light chains, SPEP/UPEP
  - ASO titer (post-streptococcal)
- Kidney biopsy:
  - Results (light microscopy, immunofluorescence, electron microscopy)
  - Biopsy planning (timing, risk assessment, consent)
  - Post-biopsy monitoring
- Immunosuppression protocols:
  - Pulse IV methylprednisolone
  - Cyclophosphamide (IV vs PO, dosing per protocol)
  - Rituximab
  - Mycophenolate
  - Calcineurin inhibitors (for certain GN)
- Response tracking (proteinuria trend, Cr trend, complement normalization)
- Nephrotic syndrome management:
  - Edema (diuretics, albumin infusion)
  - Thrombosis risk (anticoagulation consideration)
  - Hyperlipidemia
  - Infection risk (pneumococcal vaccine, protein loss)

---

### Domain 12: Pregnancy-Related Kidney Disease

| Property | Value |
|----------|-------|
| **ID** | `pregnancy_kidney` |
| **Color** | Rose `#F43F5E` |
| **Group** | Specialized |

**Key Sections:**
- Pre-eclampsia:
  - BP, proteinuria, platelets, liver enzymes, creatinine
  - Severity assessment (with/without severe features)
  - Magnesium sulfate protocol
- HELLP Syndrome:
  - Hemolysis (LDH, haptoglobin, schistocytes), Elevated Liver enzymes, Low Platelets
  - Differentiation from TTP/aHUS
- Pregnancy-related AKI:
  - Prerenal (hyperemesis, hemorrhage)
  - Obstructive (gravid uterus)
  - Acute cortical necrosis (placental abruption)
  - Acute fatty liver of pregnancy
- Thrombotic microangiopathy of pregnancy:
  - TTP vs HELLP vs aHUS (complement-mediated)
  - ADAMTS13, complement studies
- Lupus flare in pregnancy:
  - Distinguishing lupus nephritis flare from pre-eclampsia
  - Complement levels, anti-dsDNA, SLE activity markers
- Medication safety:
  - Teratogenicity review (ACEi/ARB contraindicated, MMF contraindicated)
  - Safe antihypertensives (labetalol, nifedipine, methyldopa)
  - Safe immunosuppressants if needed (azathioprine, tacrolimus)
- Delivery timing coordination with OB
- Postpartum renal recovery monitoring

---

## Group E: Critical Care & Cross-Cutting

### Domain 13: Critical Care

| Property | Value |
|----------|-------|
| **ID** | `critical_care` |
| **Color** | Charcoal `#374151` |
| **Group** | Cross-Cutting |

**Key Sections:**
- Severity scores: APACHE II, SOFA score
- Vasopressor management:
  - Interaction with RRT (hemodynamic instability during HD → use CRRT instead)
  - MAP targets, pressor doses, trends
- Ventilator-RRT coordination:
  - Fluid management in ARDS
  - Ultrafiltration targets with ventilator weaning
- CRRT in ICU:
  - Settings optimization
  - Hemodynamic monitoring during CRRT
  - Drug dosing adjustments with CRRT (antibiotics, anticoagulants)
- Sepsis-AKI:
  - Sepsis-3 criteria, qSOFA
  - Source control, antibiotics
  - AKI in sepsis (ATN vs prerenal)
- Multiorgan failure assessment
- Prognosis discussion triggers (SOFA trend, renal recovery likelihood)

**Note Type**: Critical Care Note is separately billable. This domain tracks the data needed for that specific note type.

---

### Domain 14: Anemia & Blood Health

| Property | Value |
|----------|-------|
| **ID** | `anemia` |
| **Color** | Maroon `#991B1B` |
| **Group** | Cross-Cutting |

**Key Sections:**
- Hemoglobin/hematocrit trend
- Iron studies: Ferritin, TSAT, iron, TIBC
- Transfusion management:
  - Threshold (7 g/dL restrictive, 8 g/dL cardiac, 9 g/dL ACS)
  - Units transfused, response
  - Transfusion reactions
- Anemia of CKD:
  - EPO/ESA use (if ESRD/CKD)
  - IV iron (iron sucrose, ferric carboxymaltose, ferumoxytol)
  - Iron repletion protocol
- GI bleed screening (stool guaiac, hematemesis, melena)
- Anemia workup (reticulocyte count, LDH, haptoglobin, peripheral smear)
- Intravascular volume impact (anemia → reduced O2 carrying capacity → compensatory volume changes)

---

### Domain 15: Nutrition

| Property | Value |
|----------|-------|
| **ID** | `nutrition` |
| **Color** | Olive `#65A30D` |
| **Group** | Cross-Cutting |

**Key Sections:**
- Renal diet (varies by condition):
  - AKI: Protein 0.8-1.0 g/kg/day
  - CKD 3-5 (non-dialysis): 0.6-0.8 g/kg/day
  - Hemodialysis: 1.0-1.2 g/kg/day
  - CRRT: 1.5-2.5 g/kg/day (high protein losses)
  - Peritoneal dialysis: 1.2-1.3 g/kg/day
- Potassium restriction (if hyperkalemia)
- Phosphorus restriction (if hyperphosphatemia)
- Sodium restriction (<2g/day for edema/HF)
- Fluid restriction (if hyponatremia or volume overload)
- TPN/Tube feeding considerations (NPO patients, ICU)
- Malnutrition screening: SGA (Subjective Global Assessment), MUST score
- Albumin/prealbumin as nutritional markers
- Dietitian consult coordination
- Caloric needs assessment (Harris-Benedict, stress factors)

---

### Domain 16: Medications & Safety

| Property | Value |
|----------|-------|
| **ID** | `medications_safety` |
| **Color** | Slate `#475569` |
| **Group** | Cross-Cutting |

**Key Sections:**
- Renal dosing adjustments:
  - Antibiotics (vancomycin, aminoglycosides, carbapenems, fluoroquinolones)
  - Anticoagulants (enoxaparin dose adjustment for CKD, argatroban for HIT)
  - Opioids (morphine avoid in ESRD, hydromorphone preferred)
  - Antihypertensives
  - Diabetes medications
- Nephrotoxin review:
  - NSAIDs, aminoglycosides, vancomycin, contrast, calcineurin inhibitors
  - "Triple Whammy" (ACEi/ARB + diuretic + NSAID) alert
  - Nephrotoxin exposure timeline
- Drug levels:
  - Vancomycin trough/AUC
  - Tacrolimus/cyclosporine trough
  - Aminoglycoside peak/trough
- Medication reconciliation (admission vs current vs pre-admission)
- Anticoagulation management (heparin, warfarin, DOACs — dose adjust for renal)
- Teratogenicity screening (if pregnancy domain active)

**High-Risk Fields:** All drug names, doses, and levels require verification.

---

## Group F: Management & Disposition

### Domain 17: Goals of Care / ACP / Palliative

| Property | Value |
|----------|-------|
| **ID** | `goc_acp_palliative` |
| **Color** | Warm Gray `#78716C` |
| **Group** | Management |

**Key Sections:**
- Goals of Care (GOC) discussions:
  - Discussion date, participants, summary
  - Patient/family understanding of prognosis
  - Treatment preferences expressed
- Code status:
  - Full code, DNR, DNR/DNI, CMO
  - Changes during admission
- Advance directives:
  - Existing directive reviewed
  - Healthcare proxy / surrogate decision-maker
  - POLST form
- Hospice referral:
  - Criteria met, referral initiated
  - Hospice agency, enrollment status
- Comfort Measures Only (CMO):
  - Transition to comfort care
  - Symptom management (pain, dyspnea, nausea)
  - Discontinuation of aggressive interventions
- Withdrawal/withholding of dialysis:
  - Criteria (poor prognosis, patient wishes, futility)
  - Discussion with patient/family
  - Comfort care plan post-withdrawal
  - Conservative kidney management as alternative
- Palliative care consult
- Family meetings (date, attendees, key decisions)
- **Billing**: CPT 99497/99498 (ACP, 30-minute increments — separately billable)

**Note Type**: Advanced Care Planning Note is separately billable. This domain tracks the data for that specific note type.

---

### Domain 18: Consult Management & Disposition

| Property | Value |
|----------|-------|
| **ID** | `consult_disposition` |
| **Color** | Cool Gray `#6B7280` |
| **Group** | Management |

**Key Sections:**
- Reason for consult (the specific question being asked)
- Consulting question clarity (restated in nephrology terms)
- Primary team and attending physician
- Daily recommendations (updated each day)
- Communication log:
  - Called primary team / attending
  - Spoke with family
  - Coordinated with other consultants
- Discharge recommendations (rolling daily summary):
  - Medication changes to continue outpatient
  - Follow-up appointments needed
  - Labs to check post-discharge
  - Dietary instructions
  - Access care plan (if new access)
- Outpatient transition plan
- Follow-up interval and location

---

## Note Type to Domain Mapping

| Note Type | Typical Active Domains | Billing |
|-----------|----------------------|---------|
| **Consult H&P** | All relevant (comprehensive initial assessment) | 99253-99255 |
| **Daily Progress Note** | Active subset per patient (6-12 typical) | 99231-99233 |
| **Critical Care Note** | Critical Care + AKI + Lytes + AB + Volume + RRT + Meds | 99291-99292 |
| **ACP Note** | GOC/ACP/Palliative (focused) | 99497-99498 |
| **Procedure Note** | Dialysis & RRT (focused) | 90935-90947, 36556-36558 |
| **Discharge Recs** | Consult Mgmt + all active domains (summary) | Included in daily |

---

## Domain Activation Logic

Domains activate based on:

1. **Consult reason** — maps to primary domains
2. **Active problems** — from EPIC paste / prior notes
3. **Lab triggers** — abnormal values activate relevant domains (K+ 6.1 → Electrolytes)
4. **Transcript content** — AI detects discussion topics and suggests domains
5. **Manual override** — provider/scribe can always add/remove domains

### Common Encounter Patterns

| Scenario | Auto-Activated Domains |
|----------|----------------------|
| AKI consult | AKI, Lytes, AB, Volume, Meds, Consult |
| CRS/HF decompensation | AKI, Volume, HF, RRT, Meds, Consult |
| Hyperkalemia | Lytes, AKI, Meds, Consult |
| TTP/PLEX | TMA/PLEX, Anemia, Lytes, Meds, Consult |
| Post-transplant rejection | Transplant, AKI, Meds, Consult |
| ANCA vasculitis | GN, AKI, RRT, Meds, Consult |
| ICU AKI on CRRT | AKI, Critical Care, RRT, Lytes, AB, Volume, Meds, Consult |
| Pre-eclampsia consult | Pregnancy, AKI, Volume, Lytes, Meds, Consult |
| GOC discussion | GOC/ACP, Consult |
| CKD medication mgmt | CKD/ESRD, Meds, CMK, Consult |
