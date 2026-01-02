# NSAIDs MODULE

## Card Overview

| Attribute | Value |
|-----------|-------|
| **Type** | Module Card |
| **Color** | Coral (#FF6F61) |
| **Size** | 5" × 7" |
| **Paper** | 80-100 lb cardstock, matte |
| **Used By** | MA at Station 2 |
| **Priority** | 1 (Quick Win) |
| **Phase** | Phase 1 (Shadow) |

## Activation Trigger

- Any NSAID detected in medication list
- Patient reports NSAID use (prescription or OTC)
- Patient asks about pain medication options

## Purpose

Identify and reduce nephrotoxic NSAID use. NSAIDs are one of the most preventable causes of kidney damage, making this a high-impact, low-complexity intervention.

---

## FRONT OF CARD (Clinical Side)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ███████████████████████████████████████████████████████████████████ │
│ █                     NSAIDs MODULE                               █ │
│ █            "Protecting Your Kidneys from NSAIDs"                █ │
│ ███████████████████████████████████████████████████████████████████ │
├─────────────────────────────────────────────────────────────────────┤
│ Date: ___/___/______  Patient: ________________________________    │
│ MRN: ______________                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ NSAIDs IDENTIFIED (check all that apply)                            │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ○ Ibuprofen (Advil, Motrin)                                      ││
│ │ ○ Naproxen (Aleve, Naprosyn)                                     ││
│ │ ○ Meloxicam (Mobic)                                              ││
│ │ ○ Diclofenac (Voltaren)                                          ││
│ │ ○ Indomethacin (Indocin)                                         ││
│ │ ○ Celecoxib (Celebrex)                                           ││
│ │ ○ Ketorolac (Toradol)                                            ││
│ │ ○ Aspirin (>325mg daily for pain)                                ││
│ │ ○ Other: _______________________________________________         ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ HOW OFTEN?                                                          │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ○ Daily          ○ Several times per week                        ││
│ │ ○ Weekly         ○ Occasionally (few times/month)                ││
│ │ ○ Rarely         ○ Not currently using                           ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ REASON FOR USE                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ○ Arthritis/Joint pain    ○ Back pain                            ││
│ │ ○ Headaches               ○ Menstrual cramps                     ││
│ │ ○ Gout flares             ○ Other pain: ___________________     ││
│ │ ○ Prescribed by: _________________________________________       ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ ALTERNATIVES DISCUSSED                                              │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ○ Acetaminophen (Tylenol) - up to 3,000mg/day                    ││
│ │ ○ Topical creams/patches (Voltaren gel, lidocaine)               ││
│ │ ○ Physical therapy / Exercise                                    ││
│ │ ○ Heat/Ice therapy                                               ││
│ │ ○ Weight loss (if applicable)                                    ││
│ │ ○ Pain management referral                                       ││
│ │ ○ Other: _______________________________________________         ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ PATIENT EDUCATION COMPLETED                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ○ Explained kidney damage from NSAIDs                            ││
│ │ ○ Discussed OTC medications contain NSAIDs (read labels)         ││
│ │ ○ Provided safe alternative options                              ││
│ │ ○ Reviewed when Tylenol is safe to use                           ││
│ │ ○ Patient understands risks                                      ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ OUTCOME                                                             │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ○ NSAIDs discontinued - patient agrees to stop                   ││
│ │ ○ NSAIDs reduced - patient will limit use                        ││
│ │ ○ Patient declined to change - reason: ____________________     ││
│ │ ○ Referral to pain management                                    ││
│ │ ○ Follow-up discussion needed                                    ││
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
| Patient Name | Text | Yes | |
| MRN | Text | Yes | |
| NSAIDs Identified | Multi-select | Yes | Check all that apply |
| Other NSAID | Text | If other | |
| Frequency | Select | Yes | |
| Reason for Use | Multi-select | Yes | |
| Prescriber | Text | If prescribed | |
| Alternatives Discussed | Multi-select | Yes | |
| Education Completed | Multi-select | Yes | |
| Outcome | Select | Yes | |
| Decline Reason | Text | If declined | |
| MA Initials | Text | Yes | |

---

## BACK OF CARD (Patient Education Side)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│              NSAIDs AND YOUR KIDNEYS                                │
│                                                                     │
│  WHAT ARE NSAIDs?                                                   │
│  ━━━━━━━━━━━━━━━                                                    │
│                                                                     │
│  NSAIDs are pain relievers that can HURT your kidneys.              │
│  Many are sold over the counter - you don't need a prescription.    │
│                                                                     │
│  Common NSAIDs to AVOID:                                            │
│  • Ibuprofen (Advil, Motrin)                                        │
│  • Naproxen (Aleve)                                                 │
│  • Aspirin (high dose for pain, not low-dose for heart)             │
│  • Prescription pain pills like meloxicam, diclofenac               │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  HOW NSAIDs DAMAGE KIDNEYS                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━                                           │
│                                                                     │
│  • NSAIDs reduce blood flow to your kidneys                         │
│  • Even short-term use can cause sudden kidney damage               │
│  • Regular use speeds up chronic kidney disease                     │
│  • Damage may not cause symptoms until it's serious                 │
│                                                                     │
│  The risk is HIGHER if you:                                         │
│  • Already have kidney disease                                      │
│  • Take blood pressure medications                                  │
│  • Are dehydrated                                                   │
│  • Are over age 65                                                  │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  SAFE ALTERNATIVES FOR PAIN                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━                                           │
│                                                                     │
│  ✓ Acetaminophen (Tylenol)                                          │
│    - Up to 3,000mg per day is usually safe                          │
│    - Check with us if you have liver problems                       │
│                                                                     │
│  ✓ Topical creams and patches                                       │
│    - Lidocaine patches                                              │
│    - Capsaicin cream                                                │
│    - Some Voltaren gel (small amounts, short term)                  │
│                                                                     │
│  ✓ Non-medication options                                           │
│    - Heat or ice packs                                              │
│    - Gentle stretching or physical therapy                          │
│    - Rest and activity modification                                 │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  IMPORTANT REMINDERS                                                │
│  ━━━━━━━━━━━━━━━━━━━                                                 │
│                                                                     │
│  ○ Always READ medication labels - many cold and flu                │
│    medicines contain NSAIDs                                         │
│                                                                     │
│  ○ Tell ALL your doctors you have kidney disease and                │
│    should avoid NSAIDs                                              │
│                                                                     │
│  ○ If you must take an NSAID for a short time (like after          │
│    surgery), tell us so we can monitor your kidneys                 │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  QUESTIONS? Call us: (731) 300-6155                                 │
│                                                                     │
│                    THE KIDNEY EXPERTS, PLLC                         │
│           "Ridding the world of the need for dialysis"              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why Priority 1

| Factor | Rationale |
|--------|-----------|
| **Simple to implement** | Binary intervention - stop or continue |
| **High impact** | Prevents direct kidney damage |
| **Easy to measure** | Track % of patients who discontinued |
| **Quick staff training** | One conversation pattern to learn |
| **Immediate education** | Teaching moment at every encounter |
| **Patient compliance** | Alternatives are readily available |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| NSAID identification rate | 100% | Cards completed with NSAID data |
| Education delivery rate | 100% | "Education completed" checkboxes |
| Discontinuation rate | >70% | "NSAIDs discontinued" outcome |
| Reduction rate | >90% | Discontinued + Reduced combined |
| Follow-up compliance | >80% | Patients return for reassessment |

---

## AppSheet Data Entry

| AppSheet Field | Source | Data Type |
|----------------|--------|-----------|
| visit_date | Card | Date |
| patient_id | Card | Text |
| nsaids_identified | Card | EnumList |
| nsaid_other | Card | Text |
| nsaid_frequency | Card | Enum |
| nsaid_reason | Card | EnumList |
| nsaid_prescriber | Card | Text |
| alternatives_discussed | Card | EnumList |
| education_completed | Card | EnumList |
| nsaid_outcome | Card | Enum |
| decline_reason | Card | Text |
| ma_initials | Card | Text |

---

## Print Specifications

| Attribute | Specification |
|-----------|---------------|
| Orientation | Portrait |
| Margins | 0.5" all sides |
| Paper | 80-100 lb cardstock |
| Finish | Matte |
| Header Bar | Coral #FF6F61 |
| Quantity | Initial run: 200 cards |
| Reorder Point | 50 cards remaining |

---

## Training Notes

**For MAs:**
1. Check medication list carefully - NSAIDs have many brand names
2. Ask specifically about OTC pain medication use
3. Don't assume patient knows which medications are NSAIDs
4. Use empathy - many patients rely on these for chronic pain
5. Offer concrete alternatives, not just "stop taking this"

**Key Conversation Points:**
- "I see you're taking [NSAID]. This type of medication can be hard on your kidneys."
- "What are you taking it for? Let's talk about some alternatives that are safer for your kidneys."
- "Tylenol is usually safe for your kidneys - have you tried that?"

**Common Patient Concerns:**
- "But my other doctor prescribed it" → "We'll coordinate with them about your kidney health"
- "Nothing else works" → "Let's explore options - sometimes we need to try a few things"
- "It's just over the counter" → "Even OTC medications can affect your kidneys"
