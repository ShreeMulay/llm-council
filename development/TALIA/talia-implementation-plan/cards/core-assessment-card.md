# ASSESSMENT CARD

## Card Overview

| Attribute | Value |
|-----------|-------|
| **Type** | Core Card |
| **Color** | Green (#50C878) |
| **Size** | 5" × 7" |
| **Paper** | 80-100 lb cardstock, matte |
| **Used By** | MA at Station 2 |
| **Timing** | Minutes 8-15 of 40-minute visit |

## Purpose

Capture subjective patient information including symptoms, recent events, medication adherence, and determine which Module Cards to activate. This card documents the "story" that informs clinical decisions.

---

## FRONT OF CARD (Clinical Side)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ███████████████████████████████████████████████████████████████████ │
│ █                    ASSESSMENT CARD                              █ │
│ █                   THE KIDNEY EXPERTS                            █ │
│ ███████████████████████████████████████████████████████████████████ │
├─────────────────────────────────────────────────────────────────────┤
│ Date: ___/___/______  Patient: ________________________________    │
│ MRN: ______________   Visit Type: ○ Follow-up  ○ New Problem       │
│                                   ○ Urgent     ○ Annual Review     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ CHIEF CONCERN (patient's own words)                                 │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ _______________________________________________________________ ││
│ │ _______________________________________________________________ ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ SINCE LAST VISIT                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Hospitalization?  ○ No  ○ Yes → Where: ____________________    ││
│ │                              Why: _________________________     ││
│ │                                                                  ││
│ │ ER Visit?         ○ No  ○ Yes → Where: ____________________    ││
│ │                              Why: _________________________     ││
│ │                                                                  ││
│ │ New Diagnoses?    ○ No  ○ Yes → ___________________________    ││
│ │                                                                  ││
│ │ Surgery/Procedure? ○ No  ○ Yes → __________________________    ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ SYMPTOM CHECKLIST (check all that apply)                            │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ○ Fatigue (severity: ___/10)    ○ Shortness of breath          ││
│ │ ○ Swelling (see Measurement)    ○ Nausea / Vomiting            ││
│ │ ○ Loss of appetite              ○ Itching                       ││
│ │ ○ Muscle cramps                 ○ Sleep problems                ││
│ │ ○ Confusion / Brain fog         ○ Chest pain                    ││
│ │ ○ Frequent urination            ○ Blood in urine                ││
│ │ ○ Foamy urine                   ○ Decreased urine               ││
│ │ ○ Other: _______________________________________________        ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ MEDICATION REVIEW                                                   │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Taking all medications as prescribed? ○ Yes  ○ No               ││
│ │                                                                  ││
│ │ If No, barrier: ○ Cost  ○ Side effects  ○ Forgot  ○ Other      ││
│ │ Details: ___________________________________________________    ││
│ │                                                                  ││
│ │ New medications started: _________________________________      ││
│ │ Medications stopped: ____________________________________       ││
│ │ Dose changes: __________________________________________        ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ MODULE ACTIVATION (check all that apply)                            │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ○ Diabetes    ○ Heart Failure   ○ Transplant   ○ Pre-Dialysis  ││
│ │ ○ Gout/Krystexxa  ○ NSAIDs     ○ Anemia       ○ BP Control     ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Completed by: _____________ (initials)  Time: _______              │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | Date | Yes | Today's date |
| Patient Name | Text | Yes | Pre-printed or written |
| MRN | Text | Yes | Medical record number |
| Visit Type | Select | Yes | Follow-up/New Problem/Urgent/Annual |
| Chief Concern | Text | Yes | Patient's own words |
| Hospitalization | Yes/No + Details | Yes | Where and Why |
| ER Visit | Yes/No + Details | Yes | Where and Why |
| New Diagnoses | Yes/No + Text | Yes | |
| Surgery/Procedure | Yes/No + Text | Yes | |
| Symptoms | Multi-select | Yes | Checklist |
| Fatigue Severity | Number 0-10 | If fatigue | |
| Adherence | Yes/No | Yes | Taking as prescribed |
| Adherence Barrier | Select | If No | Cost/Side effects/Forgot/Other |
| Barrier Details | Text | If barrier | |
| New Medications | Text | If applicable | |
| Stopped Medications | Text | If applicable | |
| Dose Changes | Text | If applicable | |
| Modules Activated | Multi-select | Yes | Triggers module cards |
| MA Initials | Text | Yes | |
| Time Completed | Time | Yes | |

### Module Activation Triggers

| Module | Activation Criteria |
|--------|---------------------|
| Diabetes | Known diabetic OR A1c >6.5% OR on diabetes meds |
| Heart Failure | Known HF OR EF <50% OR on HF meds |
| Transplant | eGFR <25 OR on transplant list OR referral pending |
| Pre-Dialysis | eGFR <20 OR AV fistula/graft present |
| Gout/Krystexxa | Gout diagnosis OR on Krystexxa OR uric acid >9 |
| NSAIDs | NSAID on med list OR patient reports NSAID use |
| Anemia | Hgb <10 OR on ESA OR iron therapy |
| BP Control | BP >140/90 on 2+ visits OR on 3+ BP meds |

---

## BACK OF CARD (Patient Education Side)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│              TALKING TO YOUR KIDNEY TEAM                            │
│                                                                     │
│  WHY WE ASK THESE QUESTIONS                                         │
│  ─────────────────────────────                                      │
│                                                                     │
│  We want to understand how you're really doing, not just            │
│  what the numbers say. Your symptoms and experiences help           │
│  us take better care of you.                                        │
│                                                                     │
│  • Tell us about hospital or ER visits - we may not know yet        │
│  • Share ALL symptoms, even if you think they're not related        │
│  • Be honest about medications - we're here to help, not judge      │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  COMMON KIDNEY DISEASE SYMPTOMS                                     │
│  ─────────────────────────────────                                  │
│                                                                     │
│  These symptoms may mean your kidneys need attention:               │
│                                                                     │
│  • Feeling very tired all the time                                  │
│  • Trouble sleeping or restless legs at night                       │
│  • Swelling in legs, ankles, or around eyes                         │
│  • Nausea or loss of appetite                                       │
│  • Itchy skin                                                       │
│  • Muscle cramps, especially at night                               │
│  • Foamy, bubbly, or dark urine                                     │
│  • Needing to urinate more often, especially at night               │
│  • Trouble thinking clearly ("brain fog")                           │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  MEDICATION TIPS                                                    │
│  ─────────────────                                                  │
│                                                                     │
│  ○ Take medications at the same time every day                      │
│  ○ Use a pill organizer or phone reminder                           │
│  ○ Don't stop or change doses without talking to us                 │
│  ○ If cost is a problem, tell us - we can often help                │
│  ○ Bring all your pill bottles to each visit                        │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  WHEN TO CALL US                                                    │
│  ─────────────────                                                  │
│                                                                     │
│  Call (731) 300-6155 right away if you have:                        │
│                                                                     │
│  • Chest pain or trouble breathing                                  │
│  • Blood in your urine                                              │
│  • Fever with chills                                                │
│  • Severe headache with blurry vision                               │
│  • Vomiting that won't stop                                         │
│  • Any sudden, severe symptom                                       │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│                    THE KIDNEY EXPERTS, PLLC                         │
│           "Ridding the world of the need for dialysis"              │
│                                                                     │
│                    Phone: (731) 300-6155                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AppSheet Data Entry

Fields captured for digital record:

| AppSheet Field | Source | Data Type |
|----------------|--------|-----------|
| visit_date | Card | Date |
| patient_id | Card/Lookup | Text |
| visit_type | Card | Enum |
| chief_concern | Card | LongText |
| hospitalization | Card | Boolean |
| hospitalization_where | Card | Text |
| hospitalization_why | Card | Text |
| er_visit | Card | Boolean |
| er_visit_where | Card | Text |
| er_visit_why | Card | Text |
| new_diagnoses | Card | Text |
| surgery_procedure | Card | Text |
| symptoms | Card | EnumList |
| fatigue_severity | Card | Number |
| med_adherence | Card | Boolean |
| adherence_barrier | Card | Enum |
| barrier_details | Card | Text |
| new_medications | Card | Text |
| stopped_medications | Card | Text |
| dose_changes | Card | Text |
| modules_activated | Card | EnumList |
| ma_initials | Card | Text |

---

## Print Specifications

| Attribute | Specification |
|-----------|---------------|
| Orientation | Portrait |
| Margins | 0.5" all sides |
| Paper | 80-100 lb cardstock |
| Finish | Matte (writable) |
| Color | Full color front, full color back |
| Header Bar | Green #50C878 |
| Quantity | Initial run: 500 cards |
| Reorder Point | 125 cards remaining |

---

## Training Notes

**For MAs:**
1. Use patient's own words for Chief Concern - don't interpret
2. Ask about ER/hospital visits even if patient doesn't mention them
3. Go through symptom checklist systematically - patients forget
4. Check medication adherence without judgment
5. Pull correct Module Cards based on checkboxes
6. Time target: 7 minutes to complete this card

**Probing Questions:**
- "Have you been to any hospital or ER since we saw you last?"
- "How are you doing with taking your medications every day?"
- "Any new symptoms, even small ones?"
- "Anything worrying you about your health?"

**Common Errors to Avoid:**
- Summarizing instead of using patient's exact words
- Missing medication changes made by other doctors
- Not asking about over-the-counter medications and supplements
- Forgetting to activate appropriate Module Cards
