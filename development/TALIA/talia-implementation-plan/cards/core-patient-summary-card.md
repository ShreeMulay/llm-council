# PATIENT SUMMARY CARD

## Card Overview

| Attribute | Value |
|-----------|-------|
| **Type** | Core Card |
| **Color** | Purple (#9B59B6) |
| **Size** | 5" × 7" |
| **Paper** | 80-100 lb cardstock, glossy option available |
| **Used By** | MA at Station 5 |
| **Timing** | Minutes 33-38 of 40-minute visit |
| **Special** | **THIS CARD GOES HOME WITH THE PATIENT** |

## Purpose

Provide patients with a clear, plain-language summary of their visit to take home. This card reinforces education, documents action items, and provides contact information. Designed for 6th-grade reading level.

---

## FRONT OF CARD (Patient-Facing Side)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ███████████████████████████████████████████████████████████████████ │
│ █                  YOUR VISIT SUMMARY                             █ │
│ █                   THE KIDNEY EXPERTS                            █ │
│ ███████████████████████████████████████████████████████████████████ │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Date: ___/___/______    Patient: ______________________________    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  YOUR NUMBERS TODAY                                                 │
│  ━━━━━━━━━━━━━━━━━━                                                 │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  Blood Pressure:  _______/_______ mmHg                          ││
│  │                   Your Goal: Less than 130/80                   ││
│  │                                                                 ││
│  │  Weight:          _______ lbs                                   ││
│  │                   Change from last visit: _______ lbs           ││
│  │                                                                 ││
│  │  Kidney Function: GFR = _______                                 ││
│  │                   Stage: _______                                ││
│  │                                                                 ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  WHAT WE DID TODAY                                                  │
│  ━━━━━━━━━━━━━━━━━                                                  │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  ○ Reviewed your kidney health                                  ││
│  │                                                                 ││
│  │  ○ Adjusted medications:                                        ││
│  │    ___________________________________________________         ││
│  │                                                                 ││
│  │  ○ Ordered lab work:                                            ││
│  │    ___________________________________________________         ││
│  │                                                                 ││
│  │  ○ Made a referral to:                                          ││
│  │    ___________________________________________________         ││
│  │                                                                 ││
│  │  ○ Discussed:                                                   ││
│  │    ___________________________________________________         ││
│  │    ___________________________________________________         ││
│  │    ___________________________________________________         ││
│  │                                                                 ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  YOUR ACTION ITEMS                                                  │
│  ━━━━━━━━━━━━━━━━━                                                  │
│  These are things for YOU to do:                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  1. ○ _____________________________________________________    ││
│  │                                                                 ││
│  │  2. ○ _____________________________________________________    ││
│  │                                                                 ││
│  │  3. ○ _____________________________________________________    ││
│  │                                                                 ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  MEDICATIONS THAT PROTECT YOUR KIDNEYS                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                              │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  • ______________________ - ______________________________     ││
│  │                                                                 ││
│  │  • ______________________ - ______________________________     ││
│  │                                                                 ││
│  │  • ______________________ - ______________________________     ││
│  │                                                                 ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  YOUR NEXT APPOINTMENT                                              │
│  ━━━━━━━━━━━━━━━━━━━━━                                              │
│                                                                     │
│  Date: ________________    Time: ________________                   │
│                                                                     │
│  ○ Labs needed before visit                                         │
│    Go to the lab _____ days before your appointment                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │         QUESTIONS? CALL US: (731) 300-6155                     ││
│  │                                                                 ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│                    THE KIDNEY EXPERTS, PLLC                         │
│           "Ridding the world of the need for dialysis"              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | Date | Yes | Today's date |
| Patient Name | Text | Yes | Large, readable |
| Blood Pressure | Text | Yes | From Measurement Card |
| Weight | Number | Yes | From Measurement Card |
| Weight Change | Number | Yes | Calculated |
| GFR | Number | Yes | Most recent lab |
| CKD Stage | Text | Yes | Plain language |
| Actions Taken | Checkboxes | Yes | What we did |
| Medication Adjustments | Text | If applicable | Plain language |
| Labs Ordered | Text | If applicable | Plain language |
| Referrals Made | Text | If applicable | Where/why |
| Discussion Points | Text | Yes | From Intervention Card, 3 items |
| Action Items | Text | Yes | 1-3 specific patient tasks |
| Key Medications | Text | Yes | Name + simple purpose |
| Next Appointment | Date/Time | Yes | Scheduled before patient leaves |
| Labs Before Visit | Yes/No + days | If applicable | |

---

## BACK OF CARD (Patient Education Side)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│              TAKING CARE OF YOUR KIDNEYS                            │
│                                                                     │
│  WHAT YOUR NUMBERS MEAN                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━                                             │
│                                                                     │
│  GFR (Kidney Function)                                              │
│  Your GFR tells us how well your kidneys are working.               │
│  • 90 or higher = kidneys working normally                          │
│  • 60-89 = mild decrease                                            │
│  • 45-59 = mild to moderate decrease (Stage 3a)                     │
│  • 30-44 = moderate to severe decrease (Stage 3b)                   │
│  • 15-29 = severe decrease (Stage 4)                                │
│  • Less than 15 = kidney failure (Stage 5)                          │
│                                                                     │
│  Higher GFR = Better kidney function                                │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  WHAT YOU CAN DO EVERY DAY                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━                                           │
│                                                                     │
│  ○ Take all medications as prescribed                               │
│  ○ Check your blood pressure at home                                │
│  ○ Weigh yourself each morning                                      │
│  ○ Limit salt in your diet                                          │
│  ○ Stay active - walk, garden, swim                                 │
│  ○ Don't smoke                                                      │
│  ○ Avoid NSAIDs (Advil, Motrin, Aleve, ibuprofen)                   │
│  ○ Keep your blood sugar controlled if diabetic                     │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  WHEN TO CALL US RIGHT AWAY                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━                                         │
│                                                                     │
│  Call (731) 300-6155 if you have:                                   │
│                                                                     │
│  • Weight gain of 3+ pounds in ONE day                              │
│  • Weight gain of 5+ pounds in ONE week                             │
│  • Blood pressure over 180/110                                      │
│  • Blood pressure under 90/60                                       │
│  • Sudden increase in swelling                                      │
│  • Trouble breathing, especially lying down                         │
│  • Blood in your urine                                              │
│  • Severe headache with blurry vision                               │
│  • Chest pain                                                       │
│  • Fever with chills                                                │
│  • Confusion or trouble thinking                                    │
│  • Unable to keep food or liquids down                              │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  MEDICATIONS THAT HURT KIDNEYS - AVOID THESE                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                         │
│                                                                     │
│  • Ibuprofen (Advil, Motrin)                                        │
│  • Naproxen (Aleve)                                                 │
│  • Any NSAID pain reliever                                          │
│  • Certain herbal supplements                                       │
│                                                                     │
│  SAFE for pain: Tylenol (acetaminophen) - ask us first              │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  BRING TO EVERY VISIT                                               │
│  ━━━━━━━━━━━━━━━━━━━━                                                │
│                                                                     │
│  ○ This summary card                                                │
│  ○ All your medication bottles                                      │
│  ○ Your blood pressure log (if keeping one)                         │
│  ○ Your weight log (if keeping one)                                 │
│  ○ List of questions for the doctor                                 │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│         THE KIDNEY EXPERTS, PLLC                                    │
│         35 Airways Blvd, Jackson, TN 38305                          │
│         Phone: (731) 300-6155                                       │
│         Fax: (731) 300-6156                                         │
│                                                                     │
│         "Ridding the world of the need for dialysis"                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Large Fonts** | Minimum 14pt body text, 18pt headers |
| **Plain Language** | 6th-grade reading level, no medical jargon |
| **Visual Hierarchy** | Clear sections with bold headers |
| **Checkboxes** | Circles (○) for patient action tracking |
| **Action-Oriented** | Specific, achievable tasks |
| **Contact Prominent** | Phone number in large text, multiple locations |

---

## AppSheet Data Entry

Fields captured for digital record:

| AppSheet Field | Source | Data Type |
|----------------|--------|-----------|
| visit_date | Card | Date |
| patient_id | Card/Lookup | Text |
| bp_reading | Measurement Card | Text |
| weight | Measurement Card | Number |
| weight_change | Calculated | Number |
| gfr | Lab lookup | Number |
| ckd_stage | Intervention Card | Text |
| medications_adjusted | Intervention Card | Boolean |
| medication_changes | Intervention Card | Text |
| labs_ordered | Intervention Card | Boolean |
| labs_ordered_list | Intervention Card | Text |
| referral_made | Intervention Card | Boolean |
| referral_to | Intervention Card | Text |
| discussion_points | Intervention Card | List |
| action_item_1 | Card | Text |
| action_item_2 | Card | Text |
| action_item_3 | Card | Text |
| key_medications | Card | List |
| next_appt_date | Card | Date |
| next_appt_time | Card | Time |
| labs_needed_before | Card | Boolean |
| lab_days_before | Card | Number |
| education_delivered | Card | Boolean |
| patient_questions | Card | Text |
| ma_initials | Card | Text |

---

## Print Specifications

| Attribute | Specification |
|-----------|---------------|
| Orientation | Portrait |
| Margins | 0.5" all sides |
| Paper | 80-100 lb cardstock |
| Finish | Glossy preferred (professional appearance) |
| Color | Full color front, full color back |
| Header Bar | Purple #9B59B6 |
| Quantity | Initial run: 500 cards |
| Reorder Point | 125 cards remaining |

---

## Training Notes

**For MAs:**
1. Complete this card BEFORE patient leaves
2. Transfer key information from Intervention Card Discussion Points
3. Use plain language - explain medical terms
4. Make action items SPECIFIC ("Take lisinopril every morning" not "Take medications")
5. Confirm patient understands - ask them to repeat back
6. Schedule next appointment BEFORE completing card
7. Time target: 5 minutes to complete and review with patient

**Education Topics to Cover:**
- What their GFR/stage means in simple terms
- Why each key medication matters
- When to call us (review back of card)
- Importance of labs before next visit (if applicable)

**Confirmation Questions:**
- "Can you tell me your 3 action items?"
- "Do you know when to call us?"
- "Do you have any questions?"

**Common Errors to Avoid:**
- Using medical jargon ("We started an ACEi" → "We started a blood pressure medicine that also protects your kidneys")
- Vague action items
- Forgetting to schedule next appointment
- Not confirming patient understanding
- Rushing through education to save time
