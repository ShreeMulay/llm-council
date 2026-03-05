---
content_type: decision_algorithm
domain: anemia_ckd_mbd
generated_by: gemini-3.1-pro-preview
generated_date: 2026-03-05
status: pending_review
reviewer: Dr. Mulay
---

# Clinical Decision Algorithm: CKD Anemia Workup and Treatment

**Disclaimer:** *This document is a clinical reference for healthcare professionals at The Kidney Experts (TKE). It does not constitute patient-specific medical advice. Clinical judgment should be applied to all patient care decisions.*

**Primary Guidelines Referenced:** 
* KDIGO 2012 Clinical Practice Guideline for Anemia in Chronic Kidney Disease
* FDA Prescribing Information for ESAs and HIF-PHIs (Updated 2023)

---

## 1. Initial Workup & Diagnosis
**Trigger:** Hemoglobin (Hgb) < 10.0 g/dL in a patient with Chronic Kidney Disease (CKD).

Before initiating any erythropoiesis-stimulating agents (ESAs), a comprehensive workup must be completed to rule out non-renal causes of anemia.

### Required Laboratory Workup
* **CBC with differential:** Assess for macrocytosis, microcytosis, or pancytopenia.
* **Reticulocyte count:** Calculate Reticulocyte Production Index (RPI) to assess bone marrow response.
* **Iron studies:** Serum Ferritin and Transferrin Saturation (TSAT).
* **Nutritional markers:** Vitamin B12 and Serum Folate.

### Rule Out Gastrointestinal Bleeding
* **Screening:** Stool guaiac / Fecal Immunochemical Test (FIT).
* **Action:** If positive, or if severe absolute iron deficiency is present without clear etiology, place GI referral for endoscopy/colonoscopy.

---

## 2. The Iron-First Approach (KDIGO Decision Tree)
Always optimize iron stores *before* initiating or escalating ESAs. Evaluate Ferritin and TSAT to determine the treatment pathway.

* **Absolute Iron Deficiency:** Ferritin < 100 ng/mL OR TSAT < 20%
  * **Action:** Initiate IV Iron therapy (or oral iron if IV is not feasible/refused). Do not start ESA.
* **Functional Iron Deficiency:** Ferritin 100–500 ng/mL AND TSAT 20–30%
  * **Action:** Trial IV Iron therapy. Iron is present but locked in reticuloendothelial stores (often due to inflammation/hepcidin).
* **Iron Replete:** Ferritin > 500 ng/mL AND TSAT > 30%
  * **Action:** Hold iron therapy. Proceed to ESA evaluation if Hgb remains < 10.0 g/dL.

---

## 3. Iron Replacement Therapy

### Intravenous (IV) Iron Options
IV iron is preferred over oral iron in severe CKD (Stage 4-5) and ESRD due to poor GI absorption secondary to elevated hepcidin levels.

| Agent | Dose & Schedule | Clinical Advantages | Safety & Notes |
| :--- | :--- | :--- | :--- |
| **Injectafer (ferric carboxymaltose)** | 750 mg IV x2 doses, 1 week apart | Fewest clinic visits; high total dose delivery. | Monitor for hypophosphatemia. |
| **Venofer (iron sucrose)** | 200 mg IV x5 doses (Total 1000 mg) | Most clinic experience; highly tolerable. | Requires multiple infusion visits. |
| **Feraheme (ferumoxytol)** | 510 mg IV x2 doses, 3-8 days apart | Rapid infusion time. | **[BBW]** Risk of fatal anaphylaxis; requires 30-min post-infusion observation. |

*[TKE PROTOCOL NEEDED]: Insert local TKE preferred formulary agent and infusion center scheduling workflow here.*

### Oral Iron Option
* **Auryxia (ferric citrate):** 1 tablet (210 mg ferric iron) TID with meals.
  * **Advantage:** Dual-action (iron replacement + phosphate binder).
  * **Indication:** FDA-approved for iron deficiency anemia in non-dialysis CKD (NDD-CKD) and hyperphosphatemia in dialysis-dependent CKD (DD-CKD).
  * **Note:** Traditional oral iron (ferrous sulfate 325 mg daily/every other day) is poorly tolerated (constipation) and poorly absorbed in advanced CKD.

---

## 4. ESA Therapy & HIF-PHIs
**Prerequisite:** Patient must be iron-replete (Ferritin > 500, TSAT > 30%) with Hgb persistently < 10.0 g/dL.

### Target Goals & Safety Warnings
* **Target Hgb:** 10.0 – 11.5 g/dL.
* **[WARNING]:** Do **NOT** intentionally exceed Hgb > 13.0 g/dL. Higher targets are associated with increased risks of cardiovascular events, stroke, venous thromboembolism, and mortality.

### Pharmacologic Options
#### 1. Aranesp (darbepoetin alfa)
* **Starting Dose (NDD-CKD):** 0.45 mcg/kg SC every 4 weeks.
* **Starting Dose (DD-CKD):** 0.45 mcg/kg SC or IV every 1 to 2 weeks.
* **Titration:** Adjust dose by 25% no more frequently than every 4 weeks.

#### 2. Epogen / Procrit (epoetin alfa)
* **Starting Dose (NDD-CKD):** 50–100 units/kg SC weekly or every 2 weeks.
* **Starting Dose (DD-CKD):** 50–100 units/kg SC or IV 3x/week.
* **Titration:** Adjust dose by 25% no more frequently than every 4 weeks.

#### 3. Jesduvroq (daprodustat) - *HIF-PHI*
* **Indication:** FDA-approved **ONLY** for adults on dialysis for at least 4 months. **Contraindicated in non-dialysis CKD** due to cardiovascular safety signals.
* **Starting Dose:** 1 to 4 mg PO daily (dose depends on baseline Hgb and prior ESA use).
* **Advantage:** Oral alternative to injectable ESAs.

### ESA Titration Decision Tree
* **If Hgb rises > 1.0 g/dL in any 2-week period:** Decrease ESA dose by 25%.
* **If Hgb < 10.0 g/dL and has not increased by > 1.0 g/dL after 4 weeks:** Increase ESA dose by 25%.
* **If Hgb reaches 11.5 g/dL:** Hold or reduce ESA dose by 25% to prevent overshooting.

---

## 5. ESA Hyporesponsiveness / Resistance
**Definition:** Failure to achieve target Hgb despite adequate iron stores and high-dose ESA therapy (e.g., > 300 units/kg/week of epoetin alfa or > 1.5 mcg/kg/week of darbepoetin alfa).

### Stepwise Resistance Workup
1. **Recheck Iron Stores:** Verify TSAT > 20% and Ferritin > 100 ng/mL.
2. **Screen for Inflammation/Infection:** Check CRP and ESR. Occult infections (e.g., diabetic foot ulcers, line infections) are common culprits.
3. **Rule Out Secondary Causes:**
   * Malignancy (e.g., multiple myeloma - check SPEP/UPEP).
   * Hemolysis (check LDH, haptoglobin, peripheral smear).
   * Uncorrected B12 or Folate deficiency.
   * Occult blood loss (repeat stool guaiac).
   * Severe hyperparathyroidism (check intact PTH).
4. **Advanced Workup:** Consider Hematology referral for bone marrow evaluation if all above are unrevealing (rule out myelodysplastic syndrome or pure red cell aplasia).

---

## 6. Monitoring Schedules

| Therapy Phase | Hgb / CBC | Iron Studies (Ferritin, TSAT) | Other Labs |
| :--- | :--- | :--- | :--- |
| **Initial Workup** | Baseline | Baseline | B12, Folate, Retic, Stool Guaiac |
| **Post-IV Iron Load** | 4 weeks post-infusion | 4 weeks post-infusion | Phosphorus (if using Injectafer) |
| **ESA Initiation / Titration** | Every 2–4 weeks | Monthly | - |
| **ESA Maintenance (Stable)** | Every 1–3 months | Every 3 months | - |
| **Oral Iron (Auryxia)** | Monthly | Every 3 months | Phosphorus (monthly) |

---

## 7. Billing & Coding Reference
* **ICD-10 Codes:**
  * `D63.1` - Anemia in chronic kidney disease (Must be coded *secondary* to the CKD stage).
  * `N18.x` - Chronic kidney disease (e.g., N18.4 for Stage 4).
  * `D50.9` - Iron deficiency anemia, unspecified.
* **CPT / HCPCS Codes (J-Codes):**
  * `J1439` - Injection, ferric carboxymaltose (Injectafer), 1 mg.
  * `J1756` - Injection, iron sucrose (Venofer), 1 mg.
  * `J0881` - Injection, darbepoetin alfa (Aranesp), 1 mcg (non-ESRD).
  * `J0885` - Injection, epoetin alfa (Epogen), 1000 units (non-ESRD).

---

## 8. Patient Education Talking Points
* **The "Why":** "Your kidneys normally produce a hormone called EPO that tells your bones to make red blood cells. In kidney disease, this stops working, leading to anemia. This causes the severe fatigue and shortness of breath you've been feeling."
* **The Goal:** "Our goal is to get your hemoglobin between 10 and 11.5. We do **not** want to bring it back to 'normal' (13 or higher), because studies show that pushing it too high can increase your risk of blood clots, strokes, and heart attacks."
* **Iron Therapy Expectations:** 
  * *Oral Iron:* "If you take iron pills, your stool will turn dark black—this is normal. Take it with food to reduce stomach upset."
  * *IV Iron:* "You will receive this through an IV. Please let the nurses know immediately if you feel dizzy, short of breath, or itchy during the infusion, as this can be a sign of an allergic reaction."
* **ESA Therapy:** "These injections will be given in the clinic. We will check your blood frequently to ensure we are giving you the exact right dose—not too much, and not too little."