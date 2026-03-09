# TKE GLP-1 Kidney Protection Clinic - Epic SmartSet Specification

> **For:** Epic EHR Build Team
> **Version:** 1.0
> **Date:** March 9, 2026

---

## SmartSet: GLP-1 Kidney Protection Clinic

### SmartSet Name: `TKE GLP1 KIDNEY PROTECTION`
### SmartSet Type: Encounter-based (Office Visit)

---

## 1. Note Template (SmartText/SmartPhrase)

### `.GLP1INIT` - Initial GLP-1 Evaluation

```
CHIEF COMPLAINT: GLP-1 Kidney Protection Clinic - Initial Evaluation

HISTORY OF PRESENT ILLNESS:
@NAME@ is a @AGE@ @SEX@ with ***CKD Stage [3a/3b/4]***, eGFR ***[value]*** mL/min/1.73m2, 
Type 2 Diabetes (A1c ***[value]***%), and BMI ***[value]*** kg/m2.

Patient is currently on the following kidney-protective medications:
- RAASi: ***[ACEi/ARB: drug, dose]*** 
- SGLT2i: ***[dapagliflozin/empagliflozin: drug, dose]***
- Finerenone: ***[dose or N/A + reason]***
- GLP-1 RA: ***[NOT currently on / previously on: details]***

UACR: ***[value]*** mg/g (date: ***)
Albuminuria category: ***[A1/A2/A3]***

Reason for GLP-1 initiation:
[x] Diabetic kidney disease with albuminuria (FLOW trial indication)
[x] CKM risk optimization (quadruple therapy completion)
[ ] Obesity-related CKD progression risk
[ ] Cardiovascular risk reduction
[ ] Other: ***

CONTRAINDICATION SCREENING:
[ ] Personal or family history of medullary thyroid carcinoma (MTC) - NEGATIVE
[ ] Personal or family history of MEN2 syndrome - NEGATIVE
[ ] History of pancreatitis - NEGATIVE
[ ] Severe gastroparesis - NEGATIVE
[ ] Active gallbladder disease - NEGATIVE
[ ] Pregnancy or planning pregnancy - NEGATIVE
[ ] Severe malnutrition or frailty concern - NEGATIVE
[ ] Diabetic retinopathy (if rapid A1c reduction expected) - ***[assessed]***

PHYSICAL EXAMINATION:
Vitals: Weight ***[lbs]*** | BMI ***[value]*** | BP ***[value]*** | HR ***[value]***
Weight trend: ***[stable/gaining/losing]*** (***[lbs]*** change over ***[months]***)
General: ***
Pertinent positives/negatives: ***

ASSESSMENT AND PLAN:

1. CHRONIC KIDNEY DISEASE, Stage ***[X]*** (N18.***[X]***)
   - eGFR ***[value]***, trend: ***[stable/declining at X mL/min/yr]***
   - UACR ***[value]***, trend: ***[stable/improving/worsening]***

2. TYPE 2 DIABETES with DIABETIC CKD (E11.22)
   - A1c ***[value]***% (date: ***)
   - Current diabetes management: ***

3. OBESITY (E66.***[01/09]***), BMI ***[value]*** (Z68.***[XX]***)
   - Weight history: ***

4. GLP-1 RA INITIATION - KIDNEY PROTECTION
   Agent selected: ***[semaglutide (Ozempic) / tirzepatide (Mounjaro)]***
   Rationale: FLOW trial demonstrated 24% reduction in major kidney disease events 
   (HR 0.76, NEJM 2024) with semaglutide in T2D+CKD population.
   
   Starting dose: ***[semaglutide 0.25mg SC weekly / tirzepatide 2.5mg SC weekly]***
   Titration plan: ***[increase by 0.25mg q4wk to target 1.0mg]***
   
   Patient counseled on:
   - Expected GI side effects (nausea, decreased appetite) -- usually transient
   - Importance of hydration, especially with CKD
   - Sick-day rules provided (hold GLP-1 + SGLT2i if unable to eat/drink)
   - Injection technique demonstrated by ***[MA/RN]***
   - Storage requirements (refrigerate prior to first use)
   
   Shared decision-making documented: Patient understands benefits (kidney protection,
   CV risk reduction, weight management) and risks (GI effects, rare pancreatitis,
   gallbladder disease). Patient agrees to proceed.

5. QUADRUPLE THERAPY STATUS:
   [x] Pillar 1: RAASi - ***[optimized/suboptimal/contraindicated]***
   [x] Pillar 2: SGLT2i - ***[optimized/suboptimal/contraindicated]***
   [ ] Pillar 3: Finerenone - ***[on therapy/not yet indicated/contraindicated]***
   [x] Pillar 4: GLP-1 RA - INITIATING TODAY

ORDERS:
- ***[Semaglutide 0.25mg SC weekly x 4 weeks, then 0.5mg SC weekly x 4 weeks]***
- Labs in 4 weeks: BMP, A1c (if not recent), lipid panel
- Follow-up: 4 weeks in GLP-1 clinic
- Prior authorization initiated: ***[pharmacy/PA coordinator]***
- RPM enrollment: ***[yes - BP cuff + scale / declined / not eligible]***

MEDICAL DECISION MAKING: Moderate complexity
- Multiple chronic conditions addressed (CKD, T2D, obesity)
- Prescription drug management with monitoring for toxicity
- Independent interpretation of labs (eGFR, UACR, A1c)
- Risk: Moderate (new prescription requiring intensive monitoring)

TOTAL TIME: ***[XX]*** minutes (supports 99214 by time if >=30 min)
```

### `.GLP1FU` - Follow-Up/Titration Visit

```
CHIEF COMPLAINT: GLP-1 Kidney Protection Clinic - Follow-Up

Current GLP-1 therapy: ***[drug]*** ***[dose]*** SC weekly
Duration on current dose: ***[X]*** weeks
Duration on GLP-1 therapy total: ***[X]*** months

INTERVAL HISTORY:
Adherence: ***[100% / missed X doses / reason]***
GI Symptoms:
- Nausea: ***[none / mild / moderate / severe]*** (trend: ***[improving/stable/worsening]***)
- Vomiting: ***[none / occasional / frequent]***
- Constipation: ***[none / mild / moderate]***
- Diarrhea: ***[none / mild / moderate]***
- Appetite change: ***[decreased / normal / increased]***
Hydration status: ***[adequate / concerns]***
Hypoglycemia: ***[none / frequency and severity]***
Other concerns: ***

VITALS:
Weight: ***[lbs]*** | Change from last visit: ***[+/- X lbs]*** | Change from baseline: ***[+/- X lbs]***
BMI: ***[value]*** | BP: ***[value]*** | HR: ***[value]***

LABS REVIEWED (if applicable):
eGFR: ***[value]*** (prior: ***[value]***) | Trend: ***[stable/improving/declining]***
UACR: ***[value]*** (prior: ***[value]***) | Trend: ***[stable/improving/worsening]***
A1c: ***[value]***% (prior: ***[value]***%)
K+: ***[value]*** | Cr: ***[value]***
Other: ***

ASSESSMENT AND PLAN:

1. CKD Stage ***[X]*** - ***[stable / improved / progressing]***
2. T2D + DKD - A1c ***[value]***% (target: ***[<7% / <8% / individualized]***)
3. GLP-1 therapy - ***[tolerating well / side effects managed / concerns]***

GLP-1 TITRATION DECISION:
[ ] INCREASE dose to ***[next step]*** (tolerating current dose, not at target)
[ ] CONTINUE current dose (on target, stable, or recent dose increase)
[ ] HOLD current dose (side effects requiring stabilization)
[ ] DECREASE dose (intolerance at current level)
[ ] DISCONTINUE (***[reason]***)

CONCOMITANT MED ADJUSTMENTS:
[ ] No changes to other kidney-protective medications
[ ] Insulin adjustment: ***[reduced/increased: details]***
[ ] Sulfonylurea adjustment: ***[reduced/discontinued]***
[ ] Diuretic adjustment: ***[details]***
[ ] Other: ***

ORDERS:
- ***[Rx change if applicable]***
- Labs for next visit: ***[BMP / UACR / A1c]***
- Follow-up: ***[4 weeks (titration) / 8-12 weeks (maintenance)]***
- RPM data reviewed: ***[weight trend, BP trend]***

MEDICAL DECISION MAKING: ***[Low (99213) / Moderate (99214) / High (99215)]***
```

---

## 2. Order Sets

### GLP-1 Initiation Order Set

**Medications:**
- Semaglutide (Ozempic) 0.25mg SC weekly x 4 weeks, then 0.5mg SC weekly
- Semaglutide (Ozempic) 1.0mg SC weekly (maintenance target)
- Tirzepatide (Mounjaro) 2.5mg SC weekly x 4 weeks (alternative)
- Ondansetron 4mg PO PRN nausea (as needed for GI side effects)

**Labs:**
- BMP (4 weeks, 3 months, then q3-6mo)
- HbA1c (baseline, 3 months, then q3-6mo)
- UACR (baseline, 3 months, then q3-6mo)
- Lipid panel (baseline, 6 months)
- CBC (baseline)

**Referrals:**
- RPM enrollment (weight + BP monitoring)
- Renal dietitian (if available)
- Diabetes educator (if needed)

**Patient Education:**
- GLP-1 injection technique handout
- Sick-day rules wallet card
- TKE Kidney Protection information sheet

### GLP-1 Follow-Up Order Set

**Labs (as indicated):**
- BMP
- HbA1c
- UACR
- Lipid panel

**Medication Management:**
- Dose titration options pre-populated
- Insulin dose reduction templates
- SU discontinuation template

---

## 3. Best Practice Alerts (BPAs)

### BPA 1: GLP-1 Candidate Identification
**Trigger:** Patient has ALL of:
- CKD Stage 2-4 (N18.2-N18.4)
- Type 2 Diabetes (E11.x)
- BMI >= 27 (Z68.27+)
- NO active GLP-1 RA prescription

**Alert Text:** "This patient may be eligible for the TKE GLP-1 Kidney Protection Clinic. FLOW trial evidence supports GLP-1 RA for kidney protection in T2D+CKD. Consider referral."

**Action:** Link to GLP-1 clinic referral order

### BPA 2: Sick-Day Rule Reminder
**Trigger:** Patient on GLP-1 RA + any of:
- ED visit within 7 days
- Hospitalization within 14 days
- AKI diagnosis (N17.x)

**Alert Text:** "Patient on GLP-1 RA with recent acute event. Review sick-day protocol: consider holding GLP-1 + SGLT2i until eating/drinking normally."

---

## 4. Registry / Patient List

### GLP-1 Kidney Protection Clinic Registry
**Columns:**
- Patient Name / MRN
- CKD Stage / Current eGFR
- UACR (most recent)
- A1c (most recent)
- BMI
- GLP-1 Agent / Current Dose / Start Date
- Quadruple Therapy Status (RAASi / SGLT2i / Finerenone / GLP-1)
- PA Status (approved / pending / denied / appeal)
- RPM Enrolled (Y/N)
- CCM Enrolled (Y/N)
- Next Visit Date
- Last Visit Coding Level (99213/99214/99215)
- Weight Change from Baseline (%)

**Filters:**
- By CKD Stage
- By PA Status
- By Overdue for Visit (>90 days since last visit)
- By Not Yet Started (eligible but not on GLP-1)

---

## 5. Reporting Dashboard

### Monthly Metrics Report
- Total active GLP-1 patients
- New starts this month
- PA approval rate (first submission + post-appeal)
- Average PA turnaround time
- Visit coding distribution (% 99213 / 99214 / 99215)
- Average reimbursement per visit
- RPM enrollment rate
- CCM enrollment rate
- Mean weight change (from baseline)
- Mean A1c change (from baseline)
- eGFR slope comparison (pre vs post GLP-1)
- No-show rate
- Discontinuation rate + reasons

---

## Implementation Notes

1. **Build priority:** Note templates (.GLP1INIT, .GLP1FU) first -- these drive coding and documentation efficiency
2. **BPA 1 is the growth engine** -- it flags eligible patients during routine nephrology visits
3. **Registry is essential for outcomes tracking** and future VBC contract negotiations
4. **Test with 10 pilot patients** before full deployment
5. **Coordinate with TALIA card system** if applicable (GLP-1 clinic as a care station)
