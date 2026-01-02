# TALIA: Complete Implementation Plan

## The Kidney Experts Care Delivery Operating System

### "Ridding the world of the need for dialysis"

---

**Document Version:** 1.0  
**Created:** January 2026  
**Last Updated:** January 2026  
**Author:** Dr. Shree Mulay, Executive Sponsor  
**Status:** APPROVED FOR EXECUTION

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The TALIA Vision](#2-the-talia-vision)
3. [Core Principles](#3-core-principles)
4. [The Three-Layer Architecture](#4-the-three-layer-architecture)
5. [The Patient Journey](#5-the-patient-journey)
6. [The Card System](#6-the-card-system)
7. [Role Definitions](#7-role-definitions)
8. [The Measurement System](#8-the-measurement-system)
9. [Technology Architecture](#9-technology-architecture)
10. [Jackson Pilot Implementation](#10-jackson-pilot-implementation)
11. [Success Metrics & Evaluation](#11-success-metrics--evaluation)
12. [Risk Assessment & Mitigation](#12-risk-assessment--mitigation)
13. [Budget Allocation](#13-budget-allocation)
14. [Multi-Site Rollout Plan](#14-multi-site-rollout-plan)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

### What is TALIA?

TALIA (The Application Layer Intelligence Artificial) is a comprehensive **Care Delivery Operating System** designed to transform how The Kidney Experts delivers nephrology care. It is not merely software - it is a complete reimagining of clinic workflow, data capture, quality measurement, and patient engagement.

### The Problem We're Solving

Current nephrology practice suffers from:
- **Fragmented workflows** - Patients move between rooms, staff scramble to prepare
- **Inconsistent data capture** - Critical metrics missed, quality gaps undetected
- **Provider cognitive overload** - Too much information, too little context
- **Invisible quality** - No real-time feedback on clinical performance
- **Education as afterthought** - Patients leave confused about their care

### The TALIA Solution

TALIA implements a **pod-based care model** where:
- **Patients sit once and never move** - All care comes to them
- **Structured cards guide every interaction** - Nothing gets missed
- **Real-time metrics drive accountability** - Quality becomes visible
- **Education is integrated, not added** - Every visit teaches

### Key Outcomes Expected

| Metric | Current State | Target (6 months) | Target (12 months) |
|--------|--------------|-------------------|---------------------|
| Visit Duration | Variable (30-60 min) | 40 minutes | 38 minutes |
| Data Capture Completeness | ~60% | 90% | 95% |
| GDMT Compliance | Unknown | 70% | 80% |
| Patient Education Delivery | Inconsistent | 100% | 100% |
| Emergency Dialysis Starts | Unknown | <15% | <10% |
| Staff Satisfaction | Variable | +20% | +30% |

### Investment Summary

- **Total Budget:** $20,000
- **Timeline:** 24 weeks (6 months) to full Jackson rollout
- **Pilot Start:** January 2026 (NOW)
- **Full Jackson Rollout:** June 2026

---

## 2. The TALIA Vision

### Mission Statement

> **"To create a care delivery system so effective that dialysis becomes unnecessary for every patient who could have been saved."**

### The Vision in Practice

Imagine a patient visit where:

1. **Mrs. Johnson arrives** for her CKD Stage 4 follow-up
2. **She weighs herself** at the self-service station near the entrance
3. **She walks to Pod 2** and sits down - she won't move again until departure
4. **The MA takes vitals** using the Measurement Card - weight already captured
5. **The MA gathers data** using the Assessment Card - symptoms, medications, concerns
6. **The Scribe prepares context** - pulling together labs, trends, and alerts
7. **Dr. Mulay arrives** with a complete briefing - no chart review needed
8. **The visit focuses on decisions** - medication adjustments, transplant discussion
9. **The MA completes wrap-up** - education delivered, follow-up scheduled
10. **Mrs. Johnson walks out** at 40 minutes - no checkout desk, no confusion

### What Makes TALIA Different

| Traditional Clinic | TALIA Model |
|-------------------|-------------|
| Patient moves 3-4 times | Patient sits once |
| Staff searches for patients | Staff flows to pods |
| Data scattered in EHR | Data on structured cards |
| Quality measured quarterly | Quality visible daily |
| Education if time permits | Education guaranteed |
| Providers review charts | Scribes prepare briefs |
| Checkout desk required | Direct departure |

### The Name: TALIA

**T**he **A**pplication **L**ayer **I**ntelligence **A**rtificial

TALIA represents the intelligent layer between raw clinical data and actionable care decisions. Like a skilled assistant, TALIA:
- Gathers what's needed
- Organizes information logically
- Presents context clearly
- Tracks what matters
- Learns and improves

---

## 3. Core Principles

### Principle 1: The 95% Rule

> **"If something should happen 95% of the time, the system must make it happen automatically."**

**What this means in practice:**

- Every diabetic CKD patient gets an A1C check → **Card prompts automatically**
- Every CKD 4/5 patient gets transplant education → **Module card ensures it**
- Every visit captures weight and BP → **Measurement Card mandates it**
- Every patient gets a summary → **Patient Summary Card is required**

**The corollary:** If staff must remember to do something, it will eventually be forgotten. TALIA removes the need to remember.

### Principle 2: The Barista Model

> **"Like a coffee shop, patients wait comfortably while their order comes to them."**

**The traditional clinic** operates like a bad restaurant:
- Patients move from waiting room to vitals to exam room to checkout
- Staff chase patients through the building
- Time is wasted in transitions
- Patients feel shuffled

**The TALIA clinic** operates like a great coffee shop:
- Patient sits once in their "pod" (their table)
- All services come to them
- They see their care being prepared
- They leave satisfied

**Physical implementation:**
- 3 pods in central hub area
- Weight station near entrance (self-service)
- Staff rotate through pods
- No back hallway exam rooms for standard visits

### Principle 3: Single Source of Truth

> **"Every data point lives in one place and flows to all who need it."**

**The problem today:**
- Patient weight in EHR vitals
- Med list in Epic
- Quality metrics in spreadsheet
- Transplant status in someone's head
- Education tracking nowhere

**The TALIA solution:**
- **TALIA is the source of truth** for care delivery data
- **Cards capture data at point of care**
- **AppSheet stores and organizes**
- **Dashboards make it visible**
- **EHR remains for billing/legal** (but not workflow)

**Critical distinction:** TALIA is NOT an EHR replacement. It is a **care delivery operating system** that sits alongside the EHR. EHR handles documentation and billing. TALIA handles workflow and quality.

### Principle 4: Education as Integration

> **"Education is not an add-on - it is woven into every interaction."**

**Traditional education:**
- Handed a pamphlet at discharge
- "Do you have any questions?"
- Forgotten by the parking lot

**TALIA education:**
- **Module cards include education prompts**
- **Patient Summary Card is educational**
- **Every vital sign explained**
- **Every medication purpose stated**
- **Every lab result contextualized**

**The mechanism:**
- Condition-specific modules (Diabetes, Heart Failure, etc.) include education checkboxes
- Patient Summary Card includes personalized teaching points
- MA/Scribe trained to explain as they work
- Provider reinforces key messages

---

## 4. The Three-Layer Architecture

TALIA operates as three integrated layers, each essential to the system's function:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAYER 3: MEASUREMENT & ACCOUNTABILITY            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │   Report    │ │  Scorecard  │ │  Provider   │ │  Practice   │       │
│  │    Card     │ │  (Patient)  │ │  Scorecard  │ │   Metrics   │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
├─────────────────────────────────────────────────────────────────────────┤
│                         LAYER 2: DATA & INTELLIGENCE                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │  AppSheet   │ │   Google    │ │   Manual    │ │    OCR      │       │
│  │    App      │ │   Sheets    │ │    Entry    │ │  (Planned)  │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
├─────────────────────────────────────────────────────────────────────────┤
│                         LAYER 1: PHYSICAL WORKFLOW                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │    Pods     │ │   Weight    │ │    Card     │ │    Staff    │       │
│  │   (3 hubs)  │ │   Station   │ │   System    │ │    Flow     │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer 1: Physical Workflow

**Purpose:** Transform the physical space and movement patterns to support the TALIA model.

**Components:**

| Component | Description | Location |
|-----------|-------------|----------|
| **Pod 1** | Patient care station with chair, small table, card holder | Central hub area |
| **Pod 2** | Patient care station with chair, small table, card holder | Central hub area |
| **Pod 3** | Patient care station with chair, small table, card holder | Central hub area |
| **Weight Station** | Digital scale with clear display, self-service | Near entrance |
| **Card Station** | Card storage, blank cards, organizers | Staff area |
| **Scribe Station** | Computer, phone, reference materials | Adjacent to pods |

**Staff Flow Pattern:**
```
                    ┌─────────────────┐
                    │  Weight Station │
                    │  (Self-Service) │
                    └────────┬────────┘
                             │
                             ▼
     ┌───────────────────────────────────────────────┐
     │                  CENTRAL HUB                   │
     │  ┌─────────┐   ┌─────────┐   ┌─────────┐     │
     │  │  Pod 1  │   │  Pod 2  │   │  Pod 3  │     │
     │  └─────────┘   └─────────┘   └─────────┘     │
     │                                               │
     │         ┌─────────────────────┐              │
     │         │   Scribe Station    │              │
     │         └─────────────────────┘              │
     └───────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     EXIT        │
                    │ (Direct, no     │
                    │  checkout)      │
                    └─────────────────┘
```

### Layer 2: Data & Intelligence

**Purpose:** Capture, store, organize, and surface clinical data to drive care decisions.

**Components:**

| Component | Function | Technology |
|-----------|----------|------------|
| **AppSheet App** | Primary data entry and display | AppSheet (existing) |
| **Google Sheets** | Data storage and processing | Google Workspace |
| **Card System** | Structured data capture at point of care | Physical cards + manual entry |
| **Chromebook Kiosks** | Data entry stations at each pod | Chromebook in kiosk mode |
| **OCR Pipeline** | Future: Automatic card digitization | Planned Phase 2 |

**Data Flow:**
```
Physical Card → Manual Entry → AppSheet → Google Sheets → Dashboards
     ↓              ↓              ↓            ↓             ↓
  Patient      Staff enters    Validates    Calculates    Displays
  Encounter    data on         and stores   metrics and   real-time
              Chromebook                    aggregates    scores
```

### Layer 3: Measurement & Accountability

**Purpose:** Make quality visible, drive improvement, and create accountability.

**Components:**

| Component | Audience | Frequency | Purpose |
|-----------|----------|-----------|---------|
| **Report Card** | Patient | Each visit | Personal health snapshot |
| **Scorecard** | Patient | Quarterly | Progress over time |
| **Provider Scorecard** | Provider | Weekly | Individual performance |
| **Practice Metrics** | Leadership | Daily/Weekly | Aggregate quality |

**Accountability Loop:**
```
Data Captured → Metrics Calculated → Displayed → Actions Taken → Data Captured
      ↑                                              │
      └──────────────────────────────────────────────┘
                     CONTINUOUS IMPROVEMENT
```

---

## 5. The Patient Journey

### Overview: The 40-Minute Visit

The TALIA patient journey is choreographed minute-by-minute to ensure consistency, completeness, and quality. Every patient experiences the same structured flow, regardless of which staff members are working.

```
TIMELINE (minutes)
0    2    5    7    10   15   20   25   30   35   40
│    │    │    │    │    │    │    │    │    │    │
▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼
┌────┬────┬─────────┬─────────┬─────────────┬─────┬────┐
│ A  │ W  │    S1   │   S2    │     S3/4    │ S5  │ D  │
│ R  │ E  │ VITALS  │  DATA   │  PROVIDER   │WRAP │ E  │
│ R  │ I  │   MA    │GATHER   │  ENCOUNTER  │ UP  │ P  │
│ I  │ G  │         │MA+SCRIBE│PROVIDER+SCR │ MA  │ A  │
│ V  │ H  │         │         │             │     │ R  │
│ E  │ T  │         │         │             │     │ T  │
└────┴────┴─────────┴─────────┴─────────────┴─────┴────┘
```

### Detailed Station Breakdown

---

#### ARRIVAL (0:00 - 0:02)

**Location:** Entrance / Waiting Area  
**Staff:** Front Desk (observation only)  
**Patient Action:** Self-directed

**What Happens:**
1. Patient arrives and checks in (verbal or electronic)
2. Patient is directed to weight station
3. Patient proceeds to assigned pod number

**Key Points:**
- No paperwork shuffle
- Minimal waiting room time
- Clear signage directs flow

**Data Captured:** Arrival time logged

---

#### WEIGHT STATION (0:02 - 0:03)

**Location:** Self-service scale near entrance  
**Staff:** None (self-service)  
**Patient Action:** Steps on scale, records weight

**What Happens:**
1. Patient steps on digital scale
2. Weight displays clearly
3. Patient (or greeter) notes weight on Measurement Card
4. Patient proceeds to assigned pod

**Equipment:**
- High-quality digital scale (medical grade)
- Large, clear display
- Positioned for privacy but accessibility
- Laminated instructions posted

**Key Points:**
- Self-service reduces staff burden
- Weight captured before sitting (most accurate)
- Sets tone of patient participation

**Data Captured:** Weight (lbs or kg)

---

#### STATION 1: VITALS (0:03 - 0:07)

**Location:** Patient's assigned pod  
**Staff:** Medical Assistant (MA)  
**Duration:** 4-5 minutes

**What Happens:**
1. MA greets patient already seated in pod
2. MA has Measurement Card ready
3. Blood pressure taken (seated, proper cuff size)
4. Heart rate recorded
5. Temperature if indicated
6. O2 saturation if indicated
7. Weight transferred from self-service (or confirmed)

**Card Used:** MEASUREMENT CARD

**Measurement Card Fields:**
```
┌─────────────────────────────────────────────────────────────┐
│                    MEASUREMENT CARD                         │
├─────────────────────────────────────────────────────────────┤
│ Date: __________ Patient: ______________________________   │
│                                                            │
│ VITALS                                                     │
│ Weight: _______ lbs/kg    Change from last: _______ lbs   │
│ BP: _______/_______ mmHg  Position: □ Seated □ Standing   │
│ Heart Rate: _______ bpm   Regular: □ Yes □ No             │
│ Temperature: _______ °F   (if indicated)                   │
│ O2 Sat: _______ %         (if indicated)                   │
│                                                            │
│ EDEMA ASSESSMENT                                           │
│ □ None  □ Trace  □ 1+  □ 2+  □ 3+  □ 4+                   │
│ Location: □ Ankles □ Legs □ Sacral □ Other: _________     │
│                                                            │
│ PAIN ASSESSMENT (if applicable)                            │
│ Level (0-10): _______  Location: ______________________   │
│                                                            │
│ MA Initials: _______                                       │
└─────────────────────────────────────────────────────────────┘
```

**MA Script:**
> "Good morning, Mrs. Johnson! I see you've already gotten your weight - thank you. Let me just get your blood pressure and we'll get started. I'm going to use the large cuff to make sure we get an accurate reading..."

**Key Points:**
- MA comes to patient (patient doesn't move)
- Proper BP technique emphasized
- Weight trend calculated immediately
- Edema assessment standard for CKD patients

**Data Captured:** BP, HR, Temp, O2, Weight, Edema grade, Pain

---

#### STATION 2: DATA GATHERING (0:08 - 0:15)

**Location:** Patient's pod  
**Staff:** MA (primary), Scribe (observing/preparing)  
**Duration:** 7-8 minutes

**What Happens:**
1. MA uses Assessment Card to guide interview
2. Medication reconciliation (using patient's medication list)
3. Symptom assessment
4. Interval history since last visit
5. Scribe listens and begins preparing context

**Card Used:** ASSESSMENT CARD + applicable MODULE CARDS

**Assessment Card Fields:**
```
┌─────────────────────────────────────────────────────────────┐
│                    ASSESSMENT CARD                          │
├─────────────────────────────────────────────────────────────┤
│ Date: __________ Patient: ______________________________   │
│                                                            │
│ REASON FOR VISIT                                           │
│ □ Follow-up  □ New Problem  □ Urgent  □ Annual Review     │
│ Chief Concern: ________________________________________   │
│                                                            │
│ INTERVAL HISTORY                                           │
│ Since last visit:                                          │
│ □ Hospitalization  Where: ____________ Why: ___________   │
│ □ ER Visit        Where: ____________ Why: ___________    │
│ □ New Diagnosis   What: _______________________________   │
│ □ Surgery/Procedure What: _____________________________   │
│ □ Nothing significant                                      │
│                                                            │
│ SYMPTOM REVIEW                                             │
│ □ Fatigue (0-10): ___    □ Nausea/Vomiting               │
│ □ Shortness of breath     □ Loss of appetite              │
│ □ Swelling (see vitals)   □ Itching                       │
│ □ Muscle cramps           □ Sleep problems                │
│ □ Confusion/brain fog     □ Other: __________________    │
│                                                            │
│ MEDICATION CHANGES                                         │
│ New medications since last visit: ______________________  │
│ Stopped medications: ___________________________________  │
│ Dose changes: _________________________________________   │
│                                                            │
│ MEDICATION ADHERENCE                                       │
│ Taking all medications as prescribed? □ Yes □ No          │
│ If no, which ones and why: ____________________________   │
│                                                            │
│ MODULES ACTIVATED (check all that apply)                   │
│ □ Diabetes  □ Heart Failure  □ Transplant  □ Pre-Dialysis │
│ □ Gout      □ NSAIDs         □ Anemia      □ BP Control   │
│                                                            │
│ MA Initials: _______                                       │
└─────────────────────────────────────────────────────────────┘
```

**Module Activation Logic:**
- **Diabetes Module**: Activated if patient has DM diagnosis or A1C >6.5
- **Heart Failure Module**: Activated if HF diagnosis or BNP elevated
- **Transplant Module**: Activated if CKD Stage 4+ or on transplant list
- **Pre-Dialysis Module**: Activated if CKD Stage 4-5 or GFR <20
- **Gout Module**: Activated if gout diagnosis or on Krystexxa
- **NSAIDs Module**: Activated if any NSAID use detected
- **Anemia Module**: Activated if Hgb <10 or on ESA
- **BP Control Module**: Activated if BP >140/90 at last visit

**Scribe Role During Station 2:**
- Listens to patient-MA conversation
- Notes key concerns for provider briefing
- Pulls relevant labs on Chromebook
- Identifies gaps or alerts
- Does NOT interact with patient directly (yet)

**Data Captured:** Chief concern, interval history, symptoms, medication changes, module activations

---

#### STATION 3: CONTEXT PREPARATION (0:16 - 0:20)

**Location:** Scribe station (adjacent to pods)  
**Staff:** Scribe  
**Duration:** 4-5 minutes

**What Happens:**
1. Scribe synthesizes information from Stations 1-2
2. Scribe reviews recent labs (already in AppSheet)
3. Scribe identifies trends and alerts
4. Scribe prepares verbal briefing for provider
5. Scribe completes Intervention Card template

**Scribe Preparation Template:**
```
PROVIDER BRIEFING TEMPLATE

Patient: _________________ Pod: _______

ONE-LINER:
[Age] y/o [M/F] with [CKD Stage X] due to [etiology], here for [reason]

KEY NUMBERS:
- Last GFR: _____ (trend: ↑↓→)
- Today BP: _____/_____ (trend: ↑↓→)
- Weight: _____ (change: +/- _____ lbs)
- Last A1C: _____ (if DM)

ACTIVE ALERTS:
□ BP above goal (>130/80)
□ Weight gain (>3 lbs since last visit)
□ GFR decline (>5 mL/min since last)
□ Medication gap (specify: ___________)
□ Overdue labs (specify: ___________)
□ Transplant milestone due

PATIENT CONCERNS:
1. _________________________________
2. _________________________________

SUGGESTED FOCUS:
□ GDMT optimization (specify: _________)
□ BP control
□ Volume management
□ Transplant discussion
□ Dialysis planning
□ Medication education
□ Other: ___________________________

MODULES ACTIVE: □ DM □ HF □ Tx □ Pre-D □ Gout □ NSAIDs □ Anemia □ BP
```

**Key Points:**
- Scribe does the cognitive work of chart review
- Provider receives synthesized, actionable information
- Briefing takes 30-60 seconds to deliver
- Allows provider to enter encounter focused

**Data Captured:** Briefing prepared (not yet entered in system)

---

#### STATION 4: PROVIDER ENCOUNTER (0:21 - 0:32)

**Location:** Patient's pod  
**Staff:** Provider + Scribe  
**Duration:** 10-12 minutes

**What Happens:**

**Phase 1: Briefing (0:21 - 0:22)** - 1 minute
1. Scribe gives verbal briefing outside pod (or quietly)
2. Provider confirms understanding
3. Provider enters pod

**Phase 2: Patient Engagement (0:22 - 0:30)** - 8 minutes
1. Provider greets patient warmly
2. Provider addresses patient's concerns first
3. Physical exam as needed
4. Decision-making discussion
5. Scribe documents in real-time (on Intervention Card)

**Phase 3: Plan Communication (0:30 - 0:32)** - 2 minutes
1. Provider summarizes plan clearly
2. Provider answers questions
3. Provider hands off to MA for wrap-up

**Card Used:** INTERVENTION CARD

**Intervention Card Fields:**
```
┌─────────────────────────────────────────────────────────────┐
│                    INTERVENTION CARD                        │
├─────────────────────────────────────────────────────────────┤
│ Date: __________ Patient: ______________________________   │
│ Provider: _______________                                  │
│                                                            │
│ ASSESSMENT                                                 │
│ Primary Diagnosis: _________________ CKD Stage: _______   │
│ Secondary Diagnoses Addressed:                             │
│ 1. _________________________________________________     │
│ 2. _________________________________________________     │
│ 3. _________________________________________________     │
│                                                            │
│ GDMT STATUS                                                │
│ ACEi/ARB: □ On max □ On submaximal □ Not on □ Contraind.  │
│   Action: □ Continue □ Increase □ Start □ None            │
│ SGLT2i:   □ On □ Not on □ Contraindicated                 │
│   Action: □ Continue □ Start □ None                       │
│ MRA:      □ On □ Not on □ Contraindicated                 │
│   Action: □ Continue □ Start □ None                       │
│                                                            │
│ MEDICATION CHANGES                                         │
│ □ No changes                                               │
│ Started: ____________________________________________     │
│ Stopped: ____________________________________________     │
│ Dose Changed: _______________________________________     │
│                                                            │
│ LABS ORDERED                                               │
│ □ BMP  □ CBC  □ Iron Panel  □ PTH  □ Vit D  □ A1C        │
│ □ Urine Studies  □ Other: ____________________________   │
│                                                            │
│ REFERRALS                                                  │
│ □ Transplant Center: __________________________________   │
│ □ Vascular Access                                          │
│ □ Dietitian                                                │
│ □ Other: ______________________________________________   │
│                                                            │
│ FOLLOW-UP                                                  │
│ □ 1 week  □ 2 weeks  □ 1 month  □ 2 months  □ 3 months   │
│ □ 6 months  □ PRN  □ Other: __________________________   │
│                                                            │
│ KEY DISCUSSION POINTS (for patient summary)                │
│ 1. _________________________________________________     │
│ 2. _________________________________________________     │
│ 3. _________________________________________________     │
│                                                            │
│ Provider Signature: _______________ Date: ______________   │
└─────────────────────────────────────────────────────────────┘
```

**Provider Focus Areas:**
- Address patient concerns first (builds trust)
- Make concrete decisions (not "we'll see")
- Explain rationale for each change
- Give specific targets ("BP goal is 130/80")
- Confirm patient understanding

**Scribe Role During Station 4:**
- Documents in real-time on Intervention Card
- Captures verbatim when possible
- Fills in module cards as discussed
- Does NOT interrupt flow
- Clarifies after provider leaves if needed

**Data Captured:** Diagnoses, GDMT status, medication changes, labs, referrals, follow-up, discussion points

---

#### STATION 5: WRAP-UP (0:33 - 0:38)

**Location:** Patient's pod  
**Staff:** MA  
**Duration:** 5-6 minutes

**What Happens:**
1. MA returns to pod after provider departs
2. MA reviews Patient Summary Card with patient
3. MA ensures patient understands next steps
4. MA delivers any module-specific education
5. MA confirms follow-up appointment
6. MA ensures patient has all necessary paperwork

**Card Used:** PATIENT SUMMARY CARD

**Patient Summary Card Fields:**
```
┌─────────────────────────────────────────────────────────────┐
│                  PATIENT SUMMARY CARD                       │
│              (Patient takes this home)                      │
├─────────────────────────────────────────────────────────────┤
│ Date: __________ Patient: ______________________________   │
│                                                            │
│ YOUR NUMBERS TODAY                                         │
│ ┌──────────────────┬──────────────────┐                   │
│ │ Blood Pressure   │ _______/________ │ Goal: <130/80     │
│ │ Weight           │ ________ lbs     │ Change: ______    │
│ │ Kidney Function  │ GFR: _______     │ Stage: ______     │
│ └──────────────────┴──────────────────┘                   │
│                                                            │
│ WHAT WE DID TODAY                                          │
│ □ Reviewed your kidney health                              │
│ □ Adjusted medications: ______________________________    │
│ □ Ordered lab work: _________________________________     │
│ □ Made a referral to: _______________________________     │
│ □ Discussed: ________________________________________     │
│                                                            │
│ YOUR ACTION ITEMS                                          │
│ 1. □ ________________________________________________    │
│ 2. □ ________________________________________________    │
│ 3. □ ________________________________________________    │
│                                                            │
│ MEDICATIONS TO KNOW                                        │
│ These medications protect your kidneys:                    │
│ • __________________ - Purpose: _____________________     │
│ • __________________ - Purpose: _____________________     │
│                                                            │
│ YOUR NEXT APPOINTMENT                                      │
│ Date: _____________ Time: _____________                    │
│ □ Labs needed before visit (go _____ days before)         │
│                                                            │
│ QUESTIONS? Call us: (731) 300-6155                        │
│                                                            │
│ THE KIDNEY EXPERTS, PLLC                                   │
│ "Ridding the world of the need for dialysis"              │
└─────────────────────────────────────────────────────────────┘
```

**MA Education Topics:**
- Medication purposes (brief, simple language)
- When to call the office
- Lab timing before next visit
- Diet reminders if applicable
- Module-specific teaching (from module cards)

**Key Points:**
- Patient Summary Card goes home with patient
- All information in plain language
- Action items are specific and achievable
- Patient confirms understanding before leaving

**Data Captured:** Education delivered (checkbox), patient questions noted

---

#### DEPARTURE (0:38 - 0:40)

**Location:** From pod directly to exit  
**Staff:** None required  
**Duration:** 2 minutes

**What Happens:**
1. Patient stands from pod
2. Patient walks directly to exit
3. No checkout desk required
4. Patient has all information on Summary Card

**Key Points:**
- No checkout desk creates efficiency
- Appointment already scheduled during wrap-up
- Labs ordered electronically
- Patient leaves feeling informed and cared for

**Total Visit Time:** 40 minutes

---

### Journey Summary Table

| Time | Station | Staff | Activity | Card(s) Used |
|------|---------|-------|----------|--------------|
| 0:00-0:02 | Arrival | - | Check in, directed to scale | - |
| 0:02-0:03 | Weight | Self | Self-service weight | Measurement |
| 0:03-0:07 | Station 1 | MA | Vitals, edema check | Measurement |
| 0:08-0:15 | Station 2 | MA + Scribe | Data gathering, history | Assessment + Modules |
| 0:16-0:20 | Station 3 | Scribe | Context preparation | Briefing prep |
| 0:21-0:32 | Station 4 | Provider + Scribe | Encounter, decisions | Intervention |
| 0:33-0:38 | Station 5 | MA | Wrap-up, education | Patient Summary |
| 0:38-0:40 | Departure | - | Direct exit | - |

---

## 6. The Card System

### Card System Overview

The TALIA Card System is the physical manifestation of structured care delivery. Cards ensure:
- **Completeness**: Nothing gets missed
- **Consistency**: Every patient gets the same thoroughness
- **Efficiency**: Staff don't have to think about what to ask
- **Data Quality**: Clean, structured data capture
- **Education**: Teaching embedded in workflow

### Card Hierarchy

```
                    ┌─────────────────────────────┐
                    │       CORE CARDS            │
                    │    (Every Single Visit)     │
                    └─────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MEASUREMENT   │    │   ASSESSMENT    │    │  INTERVENTION   │
│      CARD       │    │      CARD       │    │      CARD       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │    PATIENT SUMMARY CARD     │
                    │     (Given to Patient)      │
                    └─────────────────────────────┘

                    ┌─────────────────────────────┐
                    │       MODULE CARDS          │
                    │  (Condition-Specific)       │
                    └─────────────────────────────┘
                                  │
    ┌──────────┬──────────┬──────────┬──────────┬──────────┐
    │          │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Diabetes│ │Heart   │ │Transpl.│ │Pre-    │ │Gout/   │ │NSAIDs  │
│Module  │ │Failure │ │Eval    │ │Dialysis│ │Krystex.│ │Module  │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

---

### CORE CARDS (Every Visit)

#### Card 1: MEASUREMENT CARD

**Purpose:** Capture objective clinical measurements  
**Used By:** MA at Station 1  
**Timing:** Minutes 3-7

**Card Design Specifications:**
- Size: Half letter (5.5" x 8.5")
- Color: Blue header (TKE Primary #0360b7)
- Paper: 80lb cardstock
- Finish: Matte (easy to write on)

**Data Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | Date | Yes | Auto-populated |
| Patient Name | Text | Yes | Pre-printed or written |
| Weight | Number (lbs) | Yes | From scale or self-report |
| Weight Change | Number | Auto-calc | Compared to last visit |
| BP Systolic | Number | Yes | mmHg |
| BP Diastolic | Number | Yes | mmHg |
| BP Position | Checkbox | Yes | Seated/Standing |
| Heart Rate | Number | Yes | bpm |
| Rhythm | Checkbox | Yes | Regular/Irregular |
| Temperature | Number | If indicated | °F |
| O2 Saturation | Number | If indicated | % |
| Edema Grade | Select | Yes | None/Trace/1+/2+/3+/4+ |
| Edema Location | Multi-select | If edema | Ankles/Legs/Sacral/Other |
| Pain Level | Number 0-10 | If applicable | |
| Pain Location | Text | If pain | |
| MA Initials | Text | Yes | Accountability |

**Quality Checks Built In:**
- Weight change >5 lbs triggers alert flag
- BP >180/110 triggers urgent flag
- BP <90/60 triggers urgent flag
- Edema change from last visit flagged

---

#### Card 2: ASSESSMENT CARD

**Purpose:** Capture subjective patient information and history  
**Used By:** MA at Station 2  
**Timing:** Minutes 8-15

**Card Design Specifications:**
- Size: Half letter (5.5" x 8.5")
- Color: Green header (TKE Secondary #38a169)
- Paper: 80lb cardstock
- Finish: Matte

**Data Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Visit Reason | Select | Yes | Follow-up/New Problem/Urgent/Annual |
| Chief Concern | Text | Yes | Patient's words |
| Hospitalization Since Last | Yes/No + Details | Yes | Where/Why |
| ER Visit Since Last | Yes/No + Details | Yes | Where/Why |
| New Diagnoses | Text | If applicable | |
| Surgery/Procedures | Text | If applicable | |
| Symptoms (checklist) | Multi-select | Yes | See list below |
| New Medications | Text | If applicable | |
| Stopped Medications | Text | If applicable | |
| Dose Changes | Text | If applicable | |
| Adherence | Yes/No | Yes | Taking as prescribed |
| Adherence Barriers | Text | If no | |
| Modules Activated | Multi-select | Yes | Triggers module cards |
| MA Initials | Text | Yes | |

**Symptom Checklist:**
- [ ] Fatigue (severity 0-10)
- [ ] Shortness of breath
- [ ] Swelling (see Measurement Card)
- [ ] Nausea/Vomiting
- [ ] Loss of appetite
- [ ] Itching
- [ ] Muscle cramps
- [ ] Sleep problems
- [ ] Confusion/Brain fog
- [ ] Other (specify)

---

#### Card 3: INTERVENTION CARD

**Purpose:** Document provider decisions and plan  
**Used By:** Scribe at Station 4  
**Timing:** Minutes 21-32

**Card Design Specifications:**
- Size: Full letter (8.5" x 11")
- Color: Dark Blue header
- Paper: 80lb cardstock
- Finish: Matte

**Data Fields:**

| Section | Fields |
|---------|--------|
| **Assessment** | Primary diagnosis, CKD Stage, Secondary diagnoses (up to 3) |
| **GDMT Status** | ACEi/ARB status + action, SGLT2i status + action, MRA status + action |
| **Medication Changes** | Started, Stopped, Dose changed, No changes checkbox |
| **Labs Ordered** | Checkboxes for common + other field |
| **Referrals** | Transplant center, Vascular access, Dietitian, Other |
| **Follow-up** | Timeframe selection |
| **Discussion Points** | 3 key points for patient summary |
| **Provider Signature** | Signature + Date |

**GDMT Decision Tree (built into card back):**
```
ACEi/ARB Decision:
├─ On max dose → Continue
├─ On submaximal → Consider increase if BP/proteinuria allow
├─ Not on → Start if no contraindication
└─ Contraindicated → Document reason

SGLT2i Decision:
├─ On → Continue
├─ Not on, GFR >20 → Start (preferred: Jardiance, Farxiga)
├─ Not on, GFR <20 → May consider if already on
└─ Contraindicated → Document reason

MRA Decision:
├─ On → Continue, monitor K+
├─ Not on, K+ <5.0 → Consider starting
└─ K+ ≥5.0 → Hold, reassess
```

---

#### Card 4: PATIENT SUMMARY CARD

**Purpose:** Patient-facing summary to take home  
**Used By:** MA at Station 5  
**Timing:** Minutes 33-38

**Card Design Specifications:**
- Size: Half letter (5.5" x 8.5")
- Color: Light Blue background (#e6f2ff)
- Paper: 80lb cardstock, glossy option available
- Finish: Professional appearance
- **THIS CARD GOES HOME WITH PATIENT**

**Design Principles:**
- Large, readable fonts (14pt minimum)
- Plain language (no medical jargon)
- Visual indicators (checkboxes, icons)
- Clear action items
- Contact information prominent

**Content Sections:**
1. **Your Numbers Today** - BP, Weight, GFR with goals
2. **What We Did Today** - Checkboxes for actions taken
3. **Your Action Items** - Specific tasks for patient
4. **Medications to Know** - Key medications with purposes
5. **Next Appointment** - Date, time, lab timing
6. **Contact Information** - Phone number, when to call

---

### MODULE CARDS (Condition-Specific)

Module cards are activated based on patient conditions identified during the Assessment Card phase. They provide condition-specific prompts, data capture, and education.

#### Module Implementation Priority

| Priority | Module | Rationale | Implementation Phase |
|----------|--------|-----------|---------------------|
| 1 | NSAIDs Module | Quick win, high impact, simple | Phase 1 (Shadow) |
| 2 | Gout/Krystexxa Module | Revenue opportunity, new therapy | Phase 1 (Shadow) |
| 3 | Diabetes Module | Most common comorbidity | Phase 2 (Full Pilot) |
| 4 | BP Control Module | Universal need | Phase 2 (Full Pilot) |
| 5 | Heart Failure Module | Common, complex | Phase 2 (Full Pilot) |
| 6 | Anemia Module | Quality metric | Phase 2 (Full Pilot) |
| 7 | Pre-Dialysis Module | Critical transition | Phase 3 (Iterate) |
| 8 | Transplant Evaluation Module | Existing workflow integration | Phase 3 (Iterate) |
| 9 | Dialysis Module | For established ESRD | Phase 4 (Rollout) |
| 10 | Bone Mineral Module | Specialized | Phase 4 (Rollout) |
| 11 | AKI Follow-up Module | Hospital transitions | Phase 4 (Rollout) |
| 12 | New Patient Module | Onboarding workflow | Phase 4 (Rollout) |

---

#### NSAIDs MODULE (Priority 1)

**Activation Trigger:** Any NSAID detected in medication list OR patient reports NSAID use

**Purpose:** Identify and reduce nephrotoxic NSAID use

**Card Content:**
```
┌─────────────────────────────────────────────────────────────┐
│                    NSAIDs MODULE                            │
│            "Protecting Your Kidneys from NSAIDs"            │
├─────────────────────────────────────────────────────────────┤
│ NSAIDs IDENTIFIED:                                          │
│ □ Ibuprofen (Advil, Motrin)                                │
│ □ Naproxen (Aleve)                                          │
│ □ Meloxicam (Mobic)                                         │
│ □ Diclofenac (Voltaren)                                     │
│ □ Indomethacin                                              │
│ □ Other: _____________________                              │
│                                                            │
│ FREQUENCY OF USE:                                           │
│ □ Daily  □ Several times/week  □ Occasionally  □ Rarely    │
│                                                            │
│ REASON FOR USE: _______________________________________    │
│                                                            │
│ ALTERNATIVE DISCUSSED:                                      │
│ □ Acetaminophen (Tylenol) - safe for kidneys               │
│ □ Topical creams/patches                                    │
│ □ Physical therapy                                          │
│ □ Other: _____________________                              │
│                                                            │
│ PATIENT EDUCATION COMPLETED:                                │
│ □ Explained kidney damage from NSAIDs                       │
│ □ Provided safe alternative options                         │
│ □ Patient agrees to stop/reduce NSAIDs                      │
│ □ Patient needs more discussion                             │
│                                                            │
│ OUTCOME:                                                    │
│ □ NSAIDs discontinued                                       │
│ □ NSAIDs reduced                                            │
│ □ Patient declined to change                                │
│ □ Referral to pain management                               │
└─────────────────────────────────────────────────────────────┘
```

**Why Priority 1:**
- Simple to implement
- High impact on kidney health
- Easy to measure success
- Staff can be trained quickly
- Immediate patient education opportunity

---

#### GOUT/KRYSTEXXA MODULE (Priority 2)

**Activation Trigger:** Gout diagnosis OR elevated uric acid OR Krystexxa candidate/patient

**Purpose:** Manage gout effectively and identify Krystexxa candidates

**Card Content:**
```
┌─────────────────────────────────────────────────────────────┐
│                 GOUT/KRYSTEXXA MODULE                       │
│              "Managing Gout, Protecting Kidneys"            │
├─────────────────────────────────────────────────────────────┤
│ GOUT STATUS:                                                │
│ □ Active flare currently                                    │
│ □ Recent flare (past 3 months)                              │
│ □ Chronic tophaceous gout                                   │
│ □ Well-controlled                                           │
│                                                            │
│ CURRENT URIC ACID: _______ mg/dL  Goal: <6.0               │
│                                                            │
│ CURRENT TREATMENT:                                          │
│ □ Allopurinol - Dose: _______                              │
│ □ Febuxostat - Dose: _______                               │
│ □ Colchicine (prophylaxis)                                 │
│ □ None currently                                            │
│                                                            │
│ KRYSTEXXA EVALUATION:                                       │
│ Criteria (check if met):                                    │
│ □ Uric acid >6 despite oral therapy                         │
│ □ Intolerant to oral urate-lowering therapy                │
│ □ Visible tophi present                                     │
│ □ ≥2 flares per year                                        │
│                                                            │
│ KRYSTEXXA STATUS:                                           │
│ □ Not a candidate                                           │
│ □ Candidate - discussed with patient                        │
│ □ Patient interested - schedule infusion consult            │
│ □ Currently on Krystexxa                                    │
│   - Infusion #: _______  Last infusion: __________         │
│   - Pre-infusion uric acid: _______                        │
│                                                            │
│ EDUCATION COMPLETED:                                        │
│ □ Gout and kidney connection explained                      │
│ □ Dietary triggers discussed                                │
│ □ Medication importance emphasized                          │
│ □ Krystexxa option discussed (if applicable)               │
└─────────────────────────────────────────────────────────────┘
```

**Why Priority 2:**
- Revenue opportunity (Krystexxa administration)
- Clear clinical pathway
- Measurable outcomes (uric acid levels)
- Differentiator for practice

---

#### DIABETES MODULE (Priority 3)

**Activation Trigger:** Diabetes diagnosis OR A1C >6.5

**Card Content:**
```
┌─────────────────────────────────────────────────────────────┐
│                   DIABETES MODULE                           │
│             "Blood Sugar and Kidney Health"                 │
├─────────────────────────────────────────────────────────────┤
│ DIABETES TYPE: □ Type 1  □ Type 2  □ Other                 │
│                                                            │
│ LAST A1C: _______ %  Date: __________  Goal: <7.0          │
│ □ A1C due - order today                                     │
│                                                            │
│ CURRENT DIABETES MEDICATIONS:                               │
│ □ Metformin - Dose: _______                                │
│ □ SGLT2 inhibitor - Which: _______ Dose: _______           │
│ □ GLP-1 agonist - Which: _______ Dose: _______             │
│ □ Insulin - Type: _______ Dose: _______                    │
│ □ Other: _______________________                           │
│                                                            │
│ SGLT2 INHIBITOR STATUS (Kidney Protection):                │
│ □ Already on SGLT2i → Continue                              │
│ □ Not on - GFR >20 → Recommend starting                     │
│ □ Not on - GFR <20 → Discuss with provider                  │
│ □ Contraindicated - Reason: _______________                │
│                                                            │
│ HOME GLUCOSE MONITORING:                                    │
│ □ Checking regularly - Avg: _______ Range: _______         │
│ □ Not checking - Discussed importance                       │
│ □ CGM user - Time in range: _______%                       │
│                                                            │
│ HYPOGLYCEMIA RISK:                                          │
│ □ Low risk  □ Moderate risk  □ High risk                   │
│ Recent hypoglycemia events? □ Yes (# _____) □ No           │
│                                                            │
│ EDUCATION COMPLETED:                                        │
│ □ A1C goal and importance                                   │
│ □ Medication purposes explained                             │
│ □ Hypoglycemia awareness                                    │
│ □ Diet impact on blood sugar                                │
└─────────────────────────────────────────────────────────────┘
```

---

#### HEART FAILURE MODULE (Priority 5)

**Activation Trigger:** Heart failure diagnosis OR elevated BNP OR cardiomegaly

**Card Content:**
```
┌─────────────────────────────────────────────────────────────┐
│                 HEART FAILURE MODULE                        │
│              "Heart and Kidney Connection"                  │
├─────────────────────────────────────────────────────────────┤
│ HF TYPE: □ HFrEF (EF <40%)  □ HFmrEF (40-49%)  □ HFpEF (≥50%)│
│ Last EF: _______ %  Date: __________                       │
│                                                            │
│ CURRENT SYMPTOMS:                                           │
│ NYHA Class: □ I  □ II  □ III  □ IV                         │
│ □ Dyspnea on exertion                                       │
│ □ Orthopnea (# pillows: ___)                               │
│ □ PND (paroxysmal nocturnal dyspnea)                       │
│ □ Lower extremity edema (see Measurement Card)              │
│                                                            │
│ WEIGHT TREND:                                               │
│ Today: _______ lbs  Last visit: _______ lbs                │
│ Dry weight goal: _______ lbs                               │
│ □ Weight gain >3 lbs - assess volume status                │
│                                                            │
│ GDMT FOR HF:                                                │
│ □ Beta-blocker: _____________ Dose: _______                │
│ □ ACEi/ARB/ARNI: ____________ Dose: _______                │
│ □ MRA: _________________ Dose: _______                     │
│ □ SGLT2i: ______________ Dose: _______                     │
│ □ Diuretic: ____________ Dose: _______                     │
│                                                            │
│ VOLUME ASSESSMENT:                                          │
│ □ Euvolemic - Continue current regimen                      │
│ □ Hypervolemic - Increase diuretic / restrict fluid        │
│ □ Hypovolemic - Decrease diuretic                          │
│                                                            │
│ DIURETIC ADJUSTMENT:                                        │
│ □ No change  □ Increase by _______  □ Decrease by _______  │
│ □ Add: _______________________                              │
│                                                            │
│ EDUCATION COMPLETED:                                        │
│ □ Daily weight importance                                   │
│ □ Fluid restriction: _______ L/day                         │
│ □ Low sodium diet                                           │
│ □ When to call (weight gain >3 lbs in 1-2 days)            │
└─────────────────────────────────────────────────────────────┘
```

---

#### TRANSPLANT EVALUATION MODULE (Priority 8)

**Activation Trigger:** CKD Stage 4+ OR GFR <25 OR existing transplant referral

**Card Content:**
```
┌─────────────────────────────────────────────────────────────┐
│              TRANSPLANT EVALUATION MODULE                   │
│              "Your Path to Transplantation"                │
├─────────────────────────────────────────────────────────────┤
│ TRANSPLANT STATUS:                                          │
│ □ Not yet referred  □ Referred  □ Being evaluated          │
│ □ Listed  □ Transplanted  □ Not a candidate                │
│                                                            │
│ IF NOT YET REFERRED:                                        │
│ GFR: _______ (Refer when <25 or declining rapidly)         │
│ □ Patient interested in transplant discussion              │
│ □ Patient declined discussion - document reason            │
│ □ Medical contraindication - specify: ______________       │
│                                                            │
│ REFERRAL DETAILS (if referred):                             │
│ Center(s): □ Vanderbilt  □ Methodist Memphis              │
│            □ St. Thomas  □ Other: ______________           │
│ Referral date: __________                                  │
│ Evaluation appointment: __________                          │
│                                                            │
│ EVALUATION STATUS:                                          │
│ □ Initial visit completed - Date: __________               │
│ □ Workup in progress                                        │
│   - Cardiac clearance: □ Done □ Pending □ Needed           │
│   - Cancer screening: □ Done □ Pending □ Needed            │
│   - Dental clearance: □ Done □ Pending □ Needed            │
│   - Other: _____________________                           │
│ □ Workup complete - awaiting committee                      │
│ □ Listed - Date: __________                                │
│   - Blood type: _______                                     │
│   - PRA: _______%                                          │
│                                                            │
│ LIVING DONOR:                                               │
│ □ No potential donors identified                            │
│ □ Potential donor(s) being evaluated: ______________       │
│ □ Living donor approved                                     │
│                                                            │
│ EDUCATION COMPLETED:                                        │
│ □ Transplant benefits vs. dialysis                          │
│ □ Evaluation process explained                              │
│ □ Living donor option discussed                             │
│ □ Wait times discussed                                      │
└─────────────────────────────────────────────────────────────┘
```

---

#### PRE-DIALYSIS MODULE (Priority 7)

**Activation Trigger:** CKD Stage 4-5 OR GFR <20 OR anticipated dialysis within 12 months

**Card Content:**
```
┌─────────────────────────────────────────────────────────────┐
│                  PRE-DIALYSIS MODULE                        │
│              "Preparing for the Best Outcome"               │
├─────────────────────────────────────────────────────────────┤
│ CURRENT STATUS:                                             │
│ GFR: _______  CKD Stage: □ 4  □ 5                          │
│ Estimated time to dialysis: _______                         │
│                                                            │
│ DIALYSIS MODALITY EDUCATION:                                │
│ □ In-center hemodialysis explained                          │
│ □ Home hemodialysis explained                               │
│ □ Peritoneal dialysis explained                             │
│ □ Patient preference: _______________________               │
│                                                            │
│ VASCULAR ACCESS PLANNING (for HD):                          │
│ □ Not yet needed (GFR >15)                                  │
│ □ Referred to vascular surgery - Date: __________          │
│ □ AVF placed - Date: __________ Location: ________         │
│   Maturing: □ Yes  □ No - usable                           │
│ □ AVG placed - Date: __________ Location: ________         │
│ □ Will need catheter (not a fistula candidate)             │
│                                                            │
│ PD ACCESS PLANNING (for PD):                                │
│ □ PD catheter placed - Date: __________                    │
│ □ PD training scheduled - Date: __________                 │
│ □ PD training completed                                     │
│                                                            │
│ CONSERVATIVE CARE:                                          │
│ □ Patient choosing conservative (non-dialysis) management  │
│ □ Hospice/palliative care discussed                        │
│                                                            │
│ SOCIAL WORK/SUPPORT:                                        │
│ □ Social work consult completed                             │
│ □ Disability application discussed                          │
│ □ Transportation needs assessed                             │
│ □ Financial counseling provided                             │
│                                                            │
│ EDUCATION COMPLETED:                                        │
│ □ What to expect when starting dialysis                     │
│ □ Access care (if applicable)                               │
│ □ Diet changes for dialysis                                 │
│ □ Emergency signs to watch for                              │
└─────────────────────────────────────────────────────────────┘
```

---

#### Additional Module Cards (Brief Descriptions)

**BP CONTROL MODULE:**
- Triggers when BP >140/90 at any visit
- Tracks home BP readings
- Medication escalation pathway
- Lifestyle modification checklist
- Education on target goals

**ANEMIA MODULE:**
- Triggers when Hgb <10 or on ESA therapy
- Iron status tracking
- ESA dosing and response
- Transfusion history
- Education on anemia and CKD

**DIALYSIS MODULE:**
- For patients already on dialysis
- Tracks adequacy (Kt/V)
- Access function
- Fluid management
- Interdialytic weight gains

**BONE MINERAL MODULE:**
- Triggers when PTH elevated or on phosphate binders
- Calcium/Phosphorus/PTH tracking
- Binder adherence
- Vitamin D status
- Education on bone health

**AKI FOLLOW-UP MODULE:**
- Triggers after hospitalization for AKI
- Recovery trajectory
- Medication reconciliation post-discharge
- Prevention education
- Follow-up lab timing

**NEW PATIENT MODULE:**
- For first visit to practice
- Comprehensive history gathering
- Baseline establishment
- Care plan initiation
- Practice orientation

---

### Card Production Specifications

**In-House Printing Setup:**

| Item | Specification | Vendor | Est. Cost |
|------|---------------|--------|-----------|
| Printer | Color laser, duplex capable | Existing | $0 |
| Cardstock | 80lb, 8.5x11 and 5.5x8.5 | Amazon/Staples | $50/500 sheets |
| Cutting | Paper cutter or guillotine | Amazon | $40 |
| Card Organizers | Desktop file organizers | Amazon | $30 each |
| Laminating (optional) | For reference cards only | Amazon | $100 |

**Print Runs:**
- Initial: 500 of each Core Card, 200 of each Module Card
- Ongoing: Monthly reorder based on usage
- Budget: ~$200/month for consumables

**Card Organization at Each Pod:**
```
┌─────────────────────────────────────────────────┐
│              CARD ORGANIZER                     │
│  ┌─────────┬─────────┬─────────┬─────────┐    │
│  │MEASURE- │ASSESS-  │INTERVEN-│PATIENT  │    │
│  │MENT     │MENT     │TION     │SUMMARY  │    │
│  │CARDS    │CARDS    │CARDS    │CARDS    │    │
│  └─────────┴─────────┴─────────┴─────────┘    │
│  ┌─────────────────────────────────────────┐  │
│  │         MODULE CARDS                     │  │
│  │  (Organized by condition)               │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 7. Role Definitions

### The TALIA Team Model

TALIA redefines traditional roles to optimize for the care delivery model. Each role has clear responsibilities, boundaries, and accountabilities.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TALIA TEAM STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                         ┌─────────────────┐                              │
│                         │    PROVIDER     │                              │
│                         │ Decision Maker  │                              │
│                         └────────┬────────┘                              │
│                                  │                                       │
│               ┌──────────────────┼──────────────────┐                   │
│               │                  │                  │                    │
│               ▼                  ▼                  ▼                    │
│    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │
│    │      MA         │ │     SCRIBE      │ │   FRONT DESK    │         │
│    │Care Flow Spec.  │ │Intel. Preparer  │ │  Flow Manager   │         │
│    └─────────────────┘ └─────────────────┘ └─────────────────┘         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Role 1: Medical Assistant (MA) - "Care Flow Specialist"

**New Title Suggestion:** Care Flow Specialist

**Core Philosophy:** The MA is the conductor of the patient's visit, ensuring smooth flow and complete data capture. They are the patient's primary point of contact and the guardian of the card system.

**Key Responsibilities:**

| Phase | Responsibility | Deliverable |
|-------|---------------|-------------|
| Station 1 | Take vitals, complete Measurement Card | Accurate vital signs, edema assessment |
| Station 2 | Gather history, complete Assessment Card | Complete interval history, medication reconciliation |
| Station 5 | Wrap-up, education, Patient Summary Card | Patient leaves informed, has summary |
| Throughout | Ensure patient comfort in pod | Positive patient experience |

**Detailed Duties:**

**Before Patient Arrives:**
- [ ] Prepare pod with fresh cards
- [ ] Review schedule for any special needs
- [ ] Ensure equipment is functional (BP cuff, thermometer)
- [ ] Check card supplies

**Station 1 (Vitals):**
- [ ] Greet patient warmly in pod
- [ ] Confirm weight from self-service station
- [ ] Take blood pressure (correct technique)
- [ ] Record heart rate and rhythm
- [ ] Assess edema (visual and palpation)
- [ ] Complete Measurement Card fully
- [ ] Flag any urgent values to provider

**Station 2 (Data Gathering):**
- [ ] Review reason for visit
- [ ] Document chief concern in patient's words
- [ ] Ask about hospitalizations/ER visits
- [ ] Complete medication reconciliation
- [ ] Assess symptoms using card prompts
- [ ] Determine which modules to activate
- [ ] Complete Assessment Card fully

**Station 5 (Wrap-Up):**
- [ ] Return to pod after provider leaves
- [ ] Complete Patient Summary Card
- [ ] Review summary with patient
- [ ] Deliver module-specific education
- [ ] Confirm follow-up appointment
- [ ] Ensure patient understands next steps
- [ ] Walk patient to exit if needed

**What MA Does NOT Do:**
- Does not interpret results (provider's job)
- Does not make medication recommendations
- Does not enter data into AppSheet (Scribe's job during pilot)
- Does not leave patient waiting in pod unnecessarily

**Reporting Structure:** MA reports to the provider seeing the patient that day.

**Performance Metrics:**
- Card completion rate (target: 100%)
- Patient satisfaction scores
- Vital sign accuracy (spot checks)
- Education delivery rate

---

### Role 2: Scribe - "Intelligence Preparer"

**Core Philosophy:** The Scribe transforms raw data into actionable intelligence. They do the cognitive work of chart review so providers can focus on patient care and decision-making.

**Key Responsibilities:**

| Phase | Responsibility | Deliverable |
|-------|---------------|-------------|
| Station 2 | Observe MA-patient interaction | Understanding of patient concerns |
| Station 3 | Prepare provider briefing | Synthesized context, alerts, suggestions |
| Station 4 | Document during encounter | Complete Intervention Card |
| Post-visit | Data entry into AppSheet | All cards digitized |

**Detailed Duties:**

**Before Clinic:**
- [ ] Review day's schedule
- [ ] Pre-pull recent labs for all patients
- [ ] Identify any overdue items or alerts
- [ ] Prepare briefing templates

**During Station 2 (Observing):**
- [ ] Listen to MA-patient conversation
- [ ] Note key patient concerns
- [ ] Identify discrepancies or red flags
- [ ] Begin mental synthesis

**Station 3 (Context Preparation):**
- [ ] Pull recent labs from AppSheet/EHR
- [ ] Identify trends (improving, stable, declining)
- [ ] Note medication gaps or opportunities
- [ ] Check transplant status if applicable
- [ ] Prepare verbal briefing using template
- [ ] Have alerts ready to communicate

**Station 4 (During Encounter):**
- [ ] Deliver 30-60 second briefing to provider
- [ ] Enter pod with provider
- [ ] Document provider decisions on Intervention Card
- [ ] Capture verbatim when possible
- [ ] Do not interrupt flow
- [ ] Clarify after encounter if needed

**Post-Visit:**
- [ ] Enter all card data into AppSheet
- [ ] Flag any incomplete items
- [ ] Prepare for next patient

**Scribe Briefing Template:**
```
"This is [Name], [age] year-old [M/F] with CKD Stage [X] due to [cause], 
here for [reason].

Key numbers: GFR is [X], [trending up/down/stable]. Today's BP is [X/Y], 
weight is [X] pounds, [up/down/stable] from last visit.

Alerts: [List any - BP above goal, weight gain, overdue labs, etc.]

Patient's main concern today is [X].

Suggested focus: [GDMT optimization / BP control / volume management / etc.]"
```

**What Scribe Does NOT Do:**
- Does not provide medical advice
- Does not interact with patient during MA interview
- Does not contradict provider in front of patient
- Does not make independent clinical decisions

**Performance Metrics:**
- Briefing quality (provider feedback)
- Documentation completeness
- Data entry accuracy
- Turnaround time

---

### Role 3: Provider - "Decision Maker"

**Core Philosophy:** The provider's time is the scarcest resource. TALIA ensures that provider time is spent on what only providers can do: clinical decision-making, patient relationships, and complex problem-solving.

**What TALIA Takes Off Provider's Plate:**
- Chart review (Scribe does this)
- Data gathering (MA does this)
- Documentation (Scribe does this)
- Routine education (MA does this)
- Data entry (Scribe does this)

**What Provider Focuses On:**
- Receiving synthesized briefing
- Engaging meaningfully with patient
- Making clinical decisions
- Explaining rationale to patient
- Supervising MA/Scribe work

**Provider Flow in TALIA:**

| Time | Activity | With |
|------|----------|------|
| 0:21 | Receive briefing | Scribe |
| 0:22 | Enter pod, greet patient | Patient + Scribe |
| 0:22-0:30 | Engage, examine, decide | Patient + Scribe |
| 0:30-0:32 | Summarize plan, answer questions | Patient |
| 0:32 | Hand off to MA | MA |

**Provider Responsibilities:**
- [ ] Review Scribe briefing before entering pod
- [ ] Address patient concerns first
- [ ] Make concrete decisions (not "we'll see")
- [ ] Explain rationale clearly
- [ ] Verify Scribe captured plan correctly
- [ ] Sign Intervention Card

**Provider Quality Metrics:**
- GDMT optimization rates
- BP control rates
- Transplant referral timeliness
- Patient satisfaction
- Visit efficiency (time per patient)

---

### Role 4: Front Desk - "Flow Manager"

**Core Philosophy:** The front desk manages patient flow and ensures the pod system works smoothly. They are the traffic controllers of the clinic.

**Key Responsibilities:**
- Check patients in efficiently
- Direct patients to weight station
- Assign patients to pods
- Manage schedule disruptions
- Handle check-out tasks (if any)

**What Front Desk Does NOT Do:**
- Does not walk patients to pods (self-directed)
- Does not take vitals
- Does not gather clinical information

---

### Team Communication Protocol

**Handoff Scripts:**

**MA to Scribe (After Station 2):**
> "Patient in Pod 2 is ready for provider. Chief concern is [X]. I activated [Diabetes/HF/etc.] modules. [Any urgent flags]."

**Scribe to Provider (Station 3):**
> [Full briefing as per template]

**Provider to MA (After Station 4):**
> "Mrs. Johnson is ready for wrap-up. Focus on [specific education point]. Follow-up in [timeframe]."

---

## 8. The Measurement System

### Measurement Philosophy

> **"What gets measured gets managed. What gets measured transparently gets managed excellently."**

TALIA's measurement system operates on four levels, each with a specific audience and purpose:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MEASUREMENT HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Level 4: PRACTICE METRICS                                              │
│  Audience: Leadership / Dr. Mulay                                        │
│  Frequency: Daily dashboard, Weekly review                               │
│  Purpose: Aggregate quality, operational efficiency                      │
│                                                                          │
│  Level 3: PROVIDER SCORECARD                                            │
│  Audience: Individual providers                                          │
│  Frequency: Weekly                                                       │
│  Purpose: Individual performance, peer comparison                        │
│                                                                          │
│  Level 2: PATIENT SCORECARD                                             │
│  Audience: Patient (quarterly)                                           │
│  Purpose: Track progress over time, motivate engagement                  │
│                                                                          │
│  Level 1: REPORT CARD                                                   │
│  Audience: Patient (each visit)                                          │
│  Purpose: Current snapshot, immediate feedback                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Level 1: Report Card (Every Visit)

**Purpose:** Give patients immediate feedback on their kidney health status.

**Audience:** Patient

**Frequency:** Every visit

**Delivery:** Part of Patient Summary Card (take-home)

**Content:**
```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR REPORT CARD                         │
├─────────────────────────────────────────────────────────────┤
│                                                            │
│  BLOOD PRESSURE                                             │
│  Today: 142/88 mmHg                                        │
│  Goal: <130/80                                              │
│  Status: ⚠️ NEEDS WORK                                      │
│                                                            │
│  KIDNEY FUNCTION (GFR)                                      │
│  Current: 34 mL/min                                        │
│  Stage: 3B                                                  │
│  Trend: → Stable (good!)                                   │
│                                                            │
│  KIDNEY PROTECTION MEDICATIONS                              │
│  ACEi/ARB: ✅ ON (Lisinopril 40mg)                         │
│  SGLT2i: ✅ ON (Jardiance 10mg)                            │
│  MRA: ❌ NOT ON - Discuss with your doctor                 │
│                                                            │
│  DIABETES CONTROL (if applicable)                           │
│  A1C: 7.8%                                                  │
│  Goal: <7.0%                                                │
│  Status: ⚠️ GETTING CLOSER                                 │
│                                                            │
│  OVERALL GRADE: B-                                          │
│  You're doing many things right! Let's work on BP.         │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

**Grading Logic:**
| Grade | Criteria |
|-------|----------|
| A | All metrics at goal, GDMT optimized |
| B | Most metrics at goal, minor gaps |
| C | Some metrics off goal, active work needed |
| D | Multiple metrics off goal, significant gaps |
| F | Critical issues, urgent intervention needed |

---

### Level 2: Patient Scorecard (Quarterly)

**Purpose:** Show patients their progress over time, celebrate wins, identify trends.

**Audience:** Patient

**Frequency:** Quarterly (every 3 months)

**Delivery:** Printed at quarterly visit, mailed if no visit

**Content:**
```
┌─────────────────────────────────────────────────────────────┐
│              YOUR KIDNEY HEALTH SCORECARD                   │
│                    Q1 2026 (Jan-Mar)                        │
├─────────────────────────────────────────────────────────────┤
│                                                            │
│  NAME: Mary Johnson                                        │
│  CKD STAGE: 3B                                              │
│                                                            │
│  ═══════════════════════════════════════════════════════   │
│  KIDNEY FUNCTION TREND                                      │
│                                                            │
│  GFR  50 ┤                                                  │
│       40 ┤    ●━━━●━━━●━━━●                                │
│       30 ┤                                                  │
│       20 ┤                                                  │
│          └──────────────────                                │
│            Jan  Feb  Mar  Apr                               │
│                                                            │
│  Your GFR has been STABLE - Great job!                     │
│                                                            │
│  ═══════════════════════════════════════════════════════   │
│  BLOOD PRESSURE TREND                                       │
│                                                            │
│  Jan: 148/92  →  Feb: 142/88  →  Mar: 138/84               │
│  📈 IMPROVING! Keep it up!                                  │
│                                                            │
│  ═══════════════════════════════════════════════════════   │
│  MEDICATION ADHERENCE                                       │
│                                                            │
│  You reported taking all medications: 3/3 visits           │
│  ⭐ EXCELLENT!                                              │
│                                                            │
│  ═══════════════════════════════════════════════════════   │
│  GOALS FOR NEXT QUARTER                                     │
│                                                            │
│  ☐ Get BP to goal (<130/80)                                │
│  ☐ Continue taking all medications                          │
│  ☐ Reduce sodium in diet                                    │
│                                                            │
│  ═══════════════════════════════════════════════════════   │
│  YOUR QUARTERLY GRADE: B+                                   │
│  Improvement from last quarter (B-)!                        │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

### Level 3: Provider Scorecard (Weekly)

**Purpose:** Individual provider performance tracking, drive improvement, enable peer comparison.

**Audience:** Individual provider (private)

**Frequency:** Weekly (generated Monday morning)

**Content:**
```
┌─────────────────────────────────────────────────────────────┐
│               PROVIDER SCORECARD                            │
│         Dr. Sarah Johnson, NP - Week of 1/13/2026          │
├─────────────────────────────────────────────────────────────┤
│                                                            │
│  PATIENTS SEEN THIS WEEK: 42                                │
│  AVG VISIT TIME: 38 min (Target: 40)  ✅                   │
│                                                            │
│  ═══════════════════════════════════════════════════════   │
│  QUALITY METRICS (Your Panel)                               │
│                                                            │
│  Metric              Your Rate   Target   Practice Avg     │
│  ─────────────────────────────────────────────────────     │
│  ACEi/ARB on GDMT      74%        70%        72%     ✅    │
│  SGLT2i on GDMT        62%        60%        58%     ✅    │
│  MRA on GDMT           28%        30%        25%     ⚠️    │
│  BP <130/80            68%        70%        65%     ⚠️    │
│  BP <140/90            82%        85%        80%     ⚠️    │
│                                                            │
│  ═══════════════════════════════════════════════════════   │
│  PROCESS METRICS                                            │
│                                                            │
│  Card Completion:      98%        100%       95%     ✅    │
│  Education Delivered:  100%       100%       92%     ✅    │
│  Follow-up Scheduled:  100%       100%       98%     ✅    │
│                                                            │
│  ═══════════════════════════════════════════════════════   │
│  TRANSPLANT METRICS                                         │
│                                                            │
│  CKD 4+ patients seen:           12                        │
│  Transplant referral rate:       83%    (Target: 80%)  ✅  │
│  Patients listed this quarter:   2                          │
│                                                            │
│  ═══════════════════════════════════════════════════════   │
│  OPPORTUNITIES THIS WEEK                                    │
│                                                            │
│  • 3 patients could start MRA (K+ <5.0, not on)            │
│  • 2 patients overdue for transplant referral              │
│  • 1 patient with BP consistently >140/90 - intensify?     │
│                                                            │
│  ═══════════════════════════════════════════════════════   │
│  OVERALL GRADE: A-                                          │
│  Great week! Focus on MRA starts for next week.            │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

### Level 4: Practice Metrics (Daily/Weekly)

**Purpose:** Aggregate view of practice quality, operational metrics, leadership visibility.

**Audience:** Dr. Mulay, Practice Leadership

**Frequency:** Daily dashboard, Weekly review meeting

**Dashboard Sections:**

**Section 1: Volume Metrics**
| Metric | Today | This Week | This Month | Target |
|--------|-------|-----------|------------|--------|
| Patients Seen | 24 | 112 | 380 | 400 |
| Avg Visit Time | 39 min | 38 min | 39 min | 40 min |
| No-Shows | 2 | 8 | 25 | <30 |
| New Patients | 3 | 12 | 45 | 50 |

**Section 2: Quality Metrics (Practice-Wide)**
| Metric | Current | Target | Trend |
|--------|---------|--------|-------|
| ACEi/ARB Compliance | 72% | 70-80% | ↑ |
| SGLT2i Compliance | 58% | 60-70% | ↑ |
| MRA Compliance | 25% | 30-40% | → |
| BP <130/80 | 65% | 70-80% | ↑ |
| Emergency Dialysis Starts | 8% | <10% | ↓ |
| Timely Transplant Referral | 81% | 80%+ | → |
| Fistula Rate | 62% | 60%+ | ✅ |

**Section 3: Process Metrics**
| Metric | Current | Target |
|--------|---------|--------|
| Card Completion Rate | 95% | 100% |
| Education Delivery Rate | 92% | 100% |
| Follow-up Scheduling Rate | 98% | 100% |
| Data Entry Same-Day | 88% | 95% |

**Section 4: Revenue Metrics**
| Metric | This Month | Last Month | YTD |
|--------|------------|------------|-----|
| Visits Billed | 380 | 365 | 380 |
| CCM Patients | 45 | 42 | - |
| CCM Revenue | $4,500 | $4,200 | $4,500 |
| Krystexxa Infusions | 4 | 3 | 4 |

---

### Metric Calculation Definitions

**GDMT Compliance Metrics:**

| Metric | Numerator | Denominator | Notes |
|--------|-----------|-------------|-------|
| ACEi/ARB Compliance | Patients on ACEi or ARB | Eligible CKD patients (no contraindication) | Max dose = bonus |
| SGLT2i Compliance | Patients on SGLT2i | Eligible patients (GFR >20, no contraindication) | |
| MRA Compliance | Patients on MRA | Eligible patients (K+ <5.0, no contraindication) | |

**BP Control Metrics:**

| Metric | Definition | Measurement |
|--------|------------|-------------|
| BP <130/80 | Most recent BP <130 AND <80 | Last documented BP |
| BP <140/90 | Most recent BP <140 AND <90 | Last documented BP |

**Transplant Metrics:**

| Metric | Definition |
|--------|------------|
| Timely Transplant Referral | Referral sent within 30 days of GFR <25 or CKD Stage 4 diagnosis |
| Listing Rate | Patients listed / Patients referred |

**Dialysis Metrics:**

| Metric | Definition |
|--------|------------|
| Emergency Dialysis Start | Dialysis initiated via ER/hospital without prior nephrology plan |
| Fistula Rate | Patients starting HD with functional AVF / All HD starts |

---

## 9. Technology Architecture

### System Overview

TALIA's technology stack is intentionally simple and pragmatic, prioritizing:
- Low cost (within $20K budget)
- Rapid deployment
- Minimal training burden
- Integration with existing tools (AppSheet)
- Manual processes first, automation later

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TALIA TECHNOLOGY ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    PRESENTATION LAYER                            │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │   │
│  │  │  Physical Cards │  │ Chromebook      │  │  Dashboards    │  │   │
│  │  │  (Printed)      │  │ Kiosks          │  │  (HTML/JS)     │  │   │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                      │                                   │
│                                      ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    APPLICATION LAYER                             │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │                    AppSheet App                          │   │   │
│  │  │  • Patient records      • Visit tracking                 │   │   │
│  │  │  • Card data entry      • Metrics calculation            │   │   │
│  │  │  • Module management    • Reporting                      │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                      │                                   │
│                                      ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      DATA LAYER                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │                  Google Sheets                           │   │   │
│  │  │  • Patients table       • Visits table                   │   │   │
│  │  │  • Cards table          • Metrics table                  │   │   │
│  │  │  • Providers table      • Reference data                 │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### AppSheet Data Model

**Core Tables:**

#### 1. Patients Table
| Field | Type | Description |
|-------|------|-------------|
| patient_id | Key | Unique identifier |
| first_name | Text | |
| last_name | Text | |
| dob | Date | |
| mrn | Text | EHR Medical Record Number |
| ckd_stage | Enum | 1, 2, 3A, 3B, 4, 5, ESRD |
| primary_diagnosis | Text | Etiology of CKD |
| transplant_status | Enum | Not Referred, Referred, Evaluating, Listed, Transplanted |
| primary_provider | Ref | Link to Providers table |
| active | Boolean | |
| created_date | DateTime | |
| updated_date | DateTime | |

#### 2. Visits Table
| Field | Type | Description |
|-------|------|-------------|
| visit_id | Key | Unique identifier |
| patient_id | Ref | Link to Patients |
| visit_date | Date | |
| provider_id | Ref | Link to Providers |
| visit_type | Enum | Follow-up, New Problem, Urgent, Annual |
| pod_number | Number | 1, 2, or 3 |
| arrival_time | Time | |
| departure_time | Time | |
| measurement_card_id | Ref | Link to Cards |
| assessment_card_id | Ref | Link to Cards |
| intervention_card_id | Ref | Link to Cards |
| summary_card_id | Ref | Link to Cards |
| modules_activated | List | DM, HF, Tx, etc. |

#### 3. Cards Table
| Field | Type | Description |
|-------|------|-------------|
| card_id | Key | Unique identifier |
| card_type | Enum | Measurement, Assessment, Intervention, Summary, Module |
| visit_id | Ref | Link to Visits |
| patient_id | Ref | Link to Patients |
| created_by | Ref | Link to staff |
| created_date | DateTime | |
| data | LongText | JSON blob of card fields |
| completed | Boolean | |
| reviewed | Boolean | |

#### 4. Measurements Table (Normalized from Cards)
| Field | Type | Description |
|-------|------|-------------|
| measurement_id | Key | |
| visit_id | Ref | |
| patient_id | Ref | |
| weight_lbs | Number | |
| bp_systolic | Number | |
| bp_diastolic | Number | |
| heart_rate | Number | |
| edema_grade | Enum | None, Trace, 1+, 2+, 3+, 4+ |
| temp | Number | |
| o2_sat | Number | |

#### 5. GDMT_Status Table
| Field | Type | Description |
|-------|------|-------------|
| gdmt_id | Key | |
| patient_id | Ref | |
| as_of_date | Date | |
| acei_arb_status | Enum | On Max, On Submaximal, Not On, Contraindicated |
| acei_arb_med | Text | Specific medication |
| acei_arb_dose | Text | |
| sglt2i_status | Enum | On, Not On, Contraindicated |
| sglt2i_med | Text | |
| mra_status | Enum | On, Not On, Contraindicated |
| mra_med | Text | |

#### 6. Quality_Metrics Table
| Field | Type | Description |
|-------|------|-------------|
| metric_id | Key | |
| patient_id | Ref | |
| provider_id | Ref | |
| snapshot_date | Date | |
| bp_at_goal_130 | Boolean | |
| bp_at_goal_140 | Boolean | |
| acei_arb_compliant | Boolean | |
| sglt2i_compliant | Boolean | |
| mra_compliant | Boolean | |
| transplant_referred | Boolean | |
| transplant_listed | Boolean | |

---

### Chromebook Kiosk Setup

**Hardware:**
- 3x Chromebooks (one per pod)
- Budget: ~$300-400 each
- Recommendation: Lenovo Chromebook Duet or HP Chromebook x360

**Kiosk Mode Configuration:**
1. Enroll Chromebooks in Google Admin (TKE domain)
2. Configure Managed Guest Session
3. Set AppSheet as single allowed app
4. Disable all other Chrome features
5. Auto-launch AppSheet on startup

**Kiosk User Flow:**
```
Power On → Auto-login to Managed Session → AppSheet Launches → 
Ready for Data Entry → Idle Timeout (5 min) → Return to Login
```

**Network Requirements:**
- Wi-Fi access in clinic
- Backup: Mobile hotspot capability
- Offline mode: AppSheet supports limited offline, but not recommended for pilot

---

### Data Entry Workflow

**Current State (Pilot):** Manual entry from physical cards to AppSheet

**Workflow:**
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Physical   │    │    Scribe    │    │   AppSheet   │    │    Google    │
│    Card      │───▶│   Enters     │───▶│  Validates   │───▶│    Sheets    │
│  Completed   │    │    Data      │    │   & Stores   │    │   (Backend)  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**Entry Timing:**
- Ideal: Same-day entry (within 2 hours of visit end)
- Acceptable: Next business day
- Unacceptable: >48 hours delay

**Quality Controls:**
- Required fields enforced by AppSheet
- Range validation (e.g., BP 60-250)
- Completeness check before save
- Daily audit of incomplete entries

---

### Future: OCR Pipeline (Planned Phase 2)

**Concept:** Photograph cards, extract data automatically

**Pipeline:**
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Physical   │    │   Photo via  │    │     OCR      │    │   AppSheet   │
│    Card      │───▶│   Phone/     │───▶│  Processing  │───▶│   Review &   │
│              │    │   Tablet     │    │   (Claude)   │    │   Confirm    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**Technology Options:**
- Google Cloud Vision API
- Claude with vision capability
- AWS Textract

**Budget Consideration:** OCR implementation deferred to Phase 2, budget ~$2-3K

---

### Dashboard Architecture

**Dashboard Types:**

| Dashboard | Audience | Technology | Location |
|-----------|----------|------------|----------|
| Provider Scorecard | Individual provider | HTML/JS | Local file or hosted |
| Practice Metrics | Leadership | HTML/JS | Local file or hosted |
| Patient Report | Patient | Printed | Part of Summary Card |

**Dashboard Tech Stack:**
- Pure HTML/CSS/JavaScript
- No build process required
- Chart.js for visualizations
- Data pulled from Google Sheets API or exported CSV

**Example Dashboard Files:**
- `dashboards/provider-scorecard.html`
- `dashboards/practice-metrics.html`
- `dashboards/quality-trends.html`

---

### Integration Points

**Current Integrations:**
| System | Integration Type | Data Flow |
|--------|------------------|-----------|
| Epic (EHR) | NONE | Manual reference only |
| Google Workspace | Native | AppSheet + Sheets |
| Printing | Local | Card printing on-site |

**Future Integrations (Not in Pilot):**
- Epic → TALIA: Lab results import
- TALIA → Epic: Visit summary export
- Automated appointment reminders

**Critical Decision:** TALIA operates **independently** of Epic during pilot. No integration. This is intentional to:
- Avoid IT complexity
- Enable rapid iteration
- Maintain flexibility
- Reduce risk

---

## 10. Jackson Pilot Implementation

### Pilot Overview

| Parameter | Value |
|-----------|-------|
| Location | Jackson, TN (The Kidney Experts main office) |
| Start Date | January 2026 (NOW) |
| Duration | 24 weeks (6 months) |
| End Date | June 2026 |
| Providers | Dr. Shree Mulay + All APPs |
| Staff | All MAs, 1-2 Scribes |
| Pods | 3 pods in central hub |

---

### 24-Week Implementation Timeline

```
JANUARY 2026                    JUNE 2026
    │                               │
    ▼                               ▼
────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────
W1-4│W5-8│W9  │W10 │W11 │W12 │W13 │W14 │W15 │W16 │W17-│W21-
    │    │    │    │    │    │    │    │    │    │W20 │W24
────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────
PHASE 0  PHASE 1      PHASE 2                PHASE  PHASE
Design   Shadow       Full Pilot             3      4
& Prep   Mode                                Iterate Rollout
```

---

### PHASE 0: Design & Preparation (Weeks 1-4)

**Dates:** January 6-31, 2026

**Objective:** Complete all preparation before any patient interaction

#### Week 1 (Jan 6-10): Physical Setup

**Tasks:**
- [ ] Identify pod locations in clinic
- [ ] Order/acquire equipment (see list below)
- [ ] Set up weight station location
- [ ] Order initial card printing supplies
- [ ] Begin card design finalization

**Equipment to Order:**
| Item | Quantity | Est. Cost | Vendor |
|------|----------|-----------|--------|
| Digital Scale (medical grade) | 1 | $150 | Amazon |
| Card Organizers | 3 | $90 | Amazon |
| Cardstock (500 sheets) | 2 packs | $60 | Staples |
| Chromebooks | 3 | $900 | Best Buy |
| Tablet Stands | 3 | $60 | Amazon |

**Deliverables:**
- Pod layout diagram approved
- Equipment ordered
- Card design drafts for all Core Cards

#### Week 2 (Jan 13-17): Card Production & AppSheet Setup

**Tasks:**
- [ ] Finalize card designs (all 4 Core Cards)
- [ ] Print initial card batch (200 each)
- [ ] Configure AppSheet tables
- [ ] Set up Chromebook kiosk mode
- [ ] Create data entry forms in AppSheet

**Deliverables:**
- Printed cards ready for use
- AppSheet forms functional
- Chromebooks configured

#### Week 3 (Jan 20-24): Training Preparation

**Tasks:**
- [ ] Develop MA training materials
- [ ] Develop Scribe training materials
- [ ] Create role-play scenarios
- [ ] Schedule training sessions
- [ ] Prepare patient communication

**Training Materials:**
- MA Station Guide (laminated quick reference)
- Scribe Briefing Template
- Card Completion Checklist
- FAQ Document

**Deliverables:**
- All training materials complete
- Training schedule published
- Patient notification plan ready

#### Week 4 (Jan 27-31): Staff Training

**Training Schedule:**
| Date | Time | Audience | Topic |
|------|------|----------|-------|
| Mon 1/27 | 7:00-8:00 AM | All Staff | TALIA Overview & Vision |
| Tue 1/28 | 7:00-8:30 AM | MAs | Station 1 & 2 Deep Dive |
| Wed 1/29 | 7:00-8:30 AM | MAs | Station 5 & Education |
| Thu 1/30 | 7:00-8:30 AM | Scribes | Station 3 & 4 Deep Dive |
| Fri 1/31 | 7:00-9:00 AM | All | Full Workflow Simulation |

**Training Methods:**
- Classroom instruction (30 min)
- Demonstration (30 min)
- Role-play practice (60 min)
- Q&A (30 min)

**Deliverables:**
- All staff trained
- Competency verification complete
- Go/No-Go decision for Shadow Mode

**Phase 0 Success Criteria:**
- [ ] All equipment installed and functional
- [ ] 200+ cards printed and organized
- [ ] AppSheet forms tested and working
- [ ] All staff trained and confident
- [ ] Patient communication ready
- [ ] Executive approval for Shadow Mode

---

### PHASE 1: Shadow Mode (Weeks 5-8)

**Dates:** February 3-28, 2026

**Objective:** Test TALIA workflow alongside existing workflow, identify issues, refine processes

**Shadow Mode Rules:**
1. TALIA workflow runs IN PARALLEL with normal workflow
2. Normal workflow takes priority if conflict
3. Cards are completed but DO NOT replace normal documentation
4. Data is entered into AppSheet for testing
5. Patient experience should not be affected
6. All feedback is documented immediately

#### Week 5 (Feb 3-7): Soft Launch - Dr. Mulay Only

**Configuration:**
- Dr. Mulay patients only
- 1 pod active
- Dedicated MA assigned
- Scribe observing and practicing

**Daily Rhythm:**
- 7:00 AM: Pre-clinic huddle
- 7:30 AM: Clinic starts
- 12:00 PM: Mid-day debrief
- 5:00 PM: End-of-day feedback session

**Focus Areas:**
- Card completion flow
- Time management
- Patient reaction
- Staff confidence

**Metrics to Track:**
- Cards completed per patient
- Time per station
- Issues encountered
- Staff feedback scores

#### Week 6 (Feb 10-14): Expand to 2 Providers

**Configuration:**
- Dr. Mulay + 1 APP
- 2 pods active
- 2 MAs rotating
- 1 Scribe

**Focus Areas:**
- Multi-provider coordination
- Pod assignment
- Scribe managing 2 providers

#### Week 7 (Feb 17-21): Full Provider Team

**Configuration:**
- All providers
- 3 pods active
- All MAs participating
- All Scribes participating

**Focus Areas:**
- Full team coordination
- Workflow bottlenecks
- Card supply management
- Data entry backlog

#### Week 8 (Feb 24-28): Shadow Mode Refinement

**Activities:**
- Address all identified issues
- Refine card designs if needed
- Optimize workflow timing
- Finalize processes for Full Pilot
- Go/No-Go decision for Phase 2

**Shadow Mode Success Criteria:**
- [ ] 80%+ card completion rate
- [ ] Average visit time <45 minutes
- [ ] No major patient complaints
- [ ] Staff confidence >7/10 self-rating
- [ ] Data entry <24 hour lag
- [ ] All critical issues resolved

**Phase 1 Deliverables:**
- Shadow Mode completion report
- Issue log with resolutions
- Refined workflow documentation
- Go/No-Go recommendation for Full Pilot

---

### PHASE 2: Full Pilot (Weeks 9-16)

**Dates:** March 3 - April 25, 2026

**Objective:** TALIA becomes the primary workflow for Jackson clinic

**Full Pilot Rules:**
1. TALIA IS the workflow (not parallel)
2. Cards are required for every visit
3. Data entry required same-day
4. Metrics tracked and reported weekly
5. Normal EHR documentation continues (for billing/legal)

#### Week 9-10 (Mar 3-14): Full Implementation Launch

**Configuration:**
- All providers, all patients
- 3 pods fully operational
- Full card system active
- Priority Modules: NSAIDs, Gout/Krystexxa

**Launch Day (Mar 3) Schedule:**
```
6:30 AM - Final equipment check
6:45 AM - Team huddle, review workflow
7:00 AM - First patient arrives
12:00 PM - Mid-day check-in
5:00 PM - Day 1 debrief
```

**Week 9 Focus:**
- Execution of full workflow
- Real-time problem solving
- Daily feedback collection

**Week 10 Focus:**
- Rhythm establishment
- Edge case handling
- First weekly metrics review

#### Week 11-12 (Mar 17-28): Stabilization

**Focus Areas:**
- Consistency across all providers
- Card completion rates >95%
- Visit time optimization
- Patient education delivery

**New This Phase:**
- Diabetes Module activation
- BP Control Module activation

**Weekly Metrics Review:**
- Every Monday at 7:00 AM
- Review prior week metrics
- Identify improvement areas
- Assign action items

#### Week 13-14 (Mar 31 - Apr 11): Expansion

**New This Phase:**
- Heart Failure Module activation
- Anemia Module activation
- Provider Scorecard distribution begins

**Focus Areas:**
- Module integration
- Provider performance visibility
- Patient feedback collection

#### Week 15-16 (Apr 14-25): Full Operation

**All systems operational:**
- All Core Cards
- All Priority Modules (NSAIDs, Gout, DM, HF, BP, Anemia)
- All measurement levels active
- Weekly scorecards distributed

**Phase 2 Success Criteria:**
- [ ] Card completion rate >95%
- [ ] Visit time average <42 minutes
- [ ] Patient satisfaction stable or improved
- [ ] Staff satisfaction >7/10
- [ ] Data entry same-day >90%
- [ ] All priority modules active
- [ ] Weekly metrics review established

---

### PHASE 3: Iterate & Optimize (Weeks 17-20)

**Dates:** April 28 - May 23, 2026

**Objective:** Refine based on 2 months of data, prepare for full rollout

#### Week 17-18 (Apr 28 - May 9): Analysis & Refinement

**Activities:**
- Comprehensive data analysis
- Identify optimization opportunities
- Card design refinements
- Workflow adjustments

**Analysis Questions:**
- Which stations have bottlenecks?
- Which cards need redesign?
- What education is most effective?
- Where are metrics lagging?

#### Week 19-20 (May 12-23): Advanced Features

**New This Phase:**
- Pre-Dialysis Module activation
- Transplant Evaluation Module activation
- Patient Scorecard pilot (quarterly patients)

**Preparation for Phase 4:**
- Documentation finalization
- Training material updates
- Rollout plan confirmation

**Phase 3 Success Criteria:**
- [ ] All metrics trending toward targets
- [ ] Refined cards and workflows documented
- [ ] All 8 priority modules active
- [ ] Patient Scorecard validated
- [ ] Ready for full rollout

---

### PHASE 4: Jackson Full Rollout (Weeks 21-24)

**Dates:** May 26 - June 20, 2026

**Objective:** TALIA is fully operational and sustainable in Jackson

#### Week 21-22 (May 26 - Jun 6): Final Modules

**New This Phase:**
- Dialysis Module (for ESRD patients)
- Bone Mineral Module
- AKI Follow-up Module
- New Patient Module

**All 12 modules now active.**

#### Week 23-24 (Jun 9-20): Sustainment & Documentation

**Activities:**
- Final process documentation
- Training program established for new staff
- Quality metrics baselined
- Multi-site rollout planning begins

**Phase 4 Deliverables:**
- Complete TALIA Operations Manual
- Staff training program
- Quality baseline report
- Multi-site rollout plan draft

---

### Pilot Roles & Responsibilities

| Role | Person | Primary Responsibilities |
|------|--------|--------------------------|
| Executive Sponsor | Dr. Shree Mulay | Final decisions, budget approval, physician champion |
| Project Lead | TBD (likely Office Manager) | Day-to-day coordination, issue escalation |
| MA Lead | Senior MA | MA training, card supply, workflow enforcement |
| Scribe Lead | Lead Scribe | Scribe training, data entry quality |
| IT Support | External/Internal | Chromebook setup, AppSheet configuration |

---

### Weekly Meeting Cadence

| Meeting | Day/Time | Attendees | Purpose |
|---------|----------|-----------|---------|
| Daily Huddle | Daily 6:45 AM | All clinical staff | Day's plan, issues |
| Weekly Review | Monday 7:00 AM | Project Lead + Leads | Metrics review, planning |
| Provider Feedback | Friday 12:00 PM | Providers + Dr. Mulay | Provider-specific issues |
| Executive Update | Friday 5:00 PM | Dr. Mulay + Project Lead | Status, decisions needed |

---

### Issue Escalation Process

```
Level 1: Staff resolves immediately
    │
    ▼ (If unresolved in 1 hour)
Level 2: MA/Scribe Lead resolves
    │
    ▼ (If unresolved same day)
Level 3: Project Lead resolves
    │
    ▼ (If impacts patients or requires budget)
Level 4: Dr. Mulay decides
```

---

## 11. Success Metrics & Evaluation

### Primary Success Metrics

| Metric | Baseline | 3-Month Target | 6-Month Target | Measurement Method |
|--------|----------|----------------|----------------|-------------------|
| Card Completion Rate | N/A | 90% | 98% | AppSheet data |
| Average Visit Time | ~45 min | 42 min | 40 min | Time tracking |
| GDMT Compliance (ACEi/ARB) | Unknown | 65% | 75% | AppSheet data |
| GDMT Compliance (SGLT2i) | Unknown | 55% | 65% | AppSheet data |
| BP <130/80 | Unknown | 60% | 70% | AppSheet data |
| Patient Satisfaction | Baseline survey | Stable | +10% | Survey |
| Staff Satisfaction | Baseline survey | Stable | +15% | Survey |

### Secondary Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Data Entry Same-Day | >95% | AppSheet timestamps |
| Education Delivery Rate | 100% | Card checkbox completion |
| Transplant Referral Timeliness | >80% | AppSheet tracking |
| NSAIDs Discontinued Rate | >60% | Module tracking |
| New Patient Module Completion | 100% | Module tracking |

### Evaluation Schedule

| Evaluation | Timing | Evaluator | Deliverable |
|------------|--------|-----------|-------------|
| Weekly Review | Every Monday | Project Lead | Metrics dashboard |
| Monthly Report | Last Friday of month | Project Lead | Written report |
| Phase Gate Review | End of each phase | Dr. Mulay | Go/No-Go decision |
| Final Pilot Evaluation | Week 24 | External + Internal | Comprehensive report |

### Go/No-Go Criteria by Phase

**Phase 0 → Phase 1 (Shadow Mode):**
- [ ] All equipment functional
- [ ] Staff trained and confident
- [ ] Cards printed and ready
- [ ] AppSheet configured

**Phase 1 → Phase 2 (Full Pilot):**
- [ ] Card completion >80%
- [ ] Visit time <45 min average
- [ ] No major patient complaints
- [ ] Staff confidence >7/10

**Phase 2 → Phase 3 (Iterate):**
- [ ] Card completion >95%
- [ ] Visit time <42 min average
- [ ] Patient satisfaction stable
- [ ] All priority modules live

**Phase 3 → Phase 4 (Rollout):**
- [ ] All metrics on track
- [ ] No critical issues open
- [ ] All modules validated
- [ ] Documentation complete

---

## 12. Risk Assessment & Mitigation

### Risk Matrix

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Staff resistance to change | Medium | High | Early involvement, clear communication, quick wins |
| Visit time increases initially | High | Medium | Buffer scheduling first 2 weeks, expect adjustment |
| Card completion inconsistency | Medium | High | Daily audits, immediate feedback, recognition |
| Technology failure (Chromebook) | Low | Medium | Paper backup process, spare device |
| Patient confusion with new flow | Medium | Low | Clear signage, verbal guidance, patience |
| Data entry backlog | Medium | Medium | Daily targets, overtime if needed, temporary help |
| Provider pushback | Low | High | Dr. Mulay leadership, demonstrate value early |
| Budget overrun | Low | Medium | 25% contingency, prioritize essentials |
| Module complexity overwhelming | Medium | Medium | Phased rollout, start simple |
| EHR/TALIA dual documentation burden | High | Medium | Clear delineation, eventual integration planning |

### Contingency Plans

**Scenario: Staff openly resisting TALIA**
- Action: One-on-one meetings to understand concerns
- Action: Identify and address specific pain points
- Action: Share early wins and patient feedback
- Escalation: Dr. Mulay direct conversation

**Scenario: Visit times consistently >50 minutes**
- Action: Time-motion study to identify bottlenecks
- Action: Reduce scope (fewer modules initially)
- Action: Add buffer to schedule
- Escalation: Consider partial implementation

**Scenario: Technology failure on clinic day**
- Action: Immediate switch to paper-only
- Action: Data entry backlog accepted
- Action: IT support escalation
- Recovery: Same-day fix or next-day workaround

**Scenario: Patient complaints about new process**
- Action: Document specific feedback
- Action: Immediate process adjustment if valid
- Action: Patient communication explaining benefits
- Escalation: Dr. Mulay patient interaction

---

## 13. Budget Allocation

### Total Budget: $20,000

### Budget Breakdown

| Category | Allocation | Details |
|----------|------------|---------|
| **Equipment** | $3,000 | Scale, Chromebooks, organizers, stands |
| **Card Production** | $2,000 | Initial print + 6 months supply |
| **Training** | $5,000 | Materials, staff time coverage, meals |
| **Technology** | $5,000 | AppSheet enhancements, potential OCR setup |
| **Contingency** | $5,000 | Unexpected needs, overruns |
| **TOTAL** | $20,000 | |

### Detailed Equipment Budget

| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Medical-grade digital scale | 1 | $150 | $150 |
| Chromebook (Lenovo Duet) | 3 | $350 | $1,050 |
| Tablet/laptop stands | 3 | $40 | $120 |
| Card organizers (desktop) | 6 | $25 | $150 |
| Wall-mount card holders | 3 | $30 | $90 |
| Laminator | 1 | $80 | $80 |
| Paper cutter | 1 | $50 | $50 |
| Miscellaneous | - | - | $310 |
| **Equipment Total** | | | **$2,000** |

### Detailed Card Production Budget

| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Cardstock (80lb, 500 sheets) | 10 reams | $30 | $300 |
| Color laser toner (initial) | 1 set | $200 | $200 |
| Color laser toner (6-month) | 3 sets | $200 | $600 |
| Laminating pouches | 200 | $0.50 | $100 |
| Design/printing setup | - | - | $300 |
| Contingency | - | - | $500 |
| **Card Production Total** | | | **$2,000** |

### Detailed Training Budget

| Item | Cost | Notes |
|------|------|-------|
| Training materials printing | $200 | Guides, checklists, posters |
| Overtime for extended training | $2,000 | Staff time for 4 training sessions |
| Temporary coverage during training | $1,500 | Agency staff if needed |
| Training meals/refreshments | $300 | 4 sessions x $75 |
| External facilitator (optional) | $1,000 | If needed for change management |
| **Training Total** | **$5,000** | |

### Detailed Technology Budget

| Item | Cost | Notes |
|------|------|-------|
| AppSheet enhancements | $1,000 | Custom forms, automation |
| Google Workspace (already have) | $0 | Existing subscription |
| Dashboard development | $500 | HTML/JS dashboards |
| OCR pilot setup | $2,500 | API costs, development |
| IT support hours | $1,000 | Setup, troubleshooting |
| **Technology Total** | **$5,000** | |

### Budget Monitoring

- **Monthly Budget Review:** First Monday of each month
- **Spend Approval:** <$500 = Project Lead, >$500 = Dr. Mulay
- **Contingency Release:** Requires Dr. Mulay approval with justification

---

## 14. Multi-Site Rollout Plan

### Post-Jackson Vision

After successful Jackson pilot (June 2026), TALIA will expand to:

1. **Other TKE Locations** (if applicable)
2. **Acquired Practices** (M&A strategy)
3. **Partner Practices** (licensing/SaaS model)

### Rollout Phases (Post-Pilot)

**Phase A: Jackson Optimization (Q3 2026)**
- Refine based on 6-month data
- Full automation of data entry (OCR)
- Integration planning with Epic

**Phase B: Second Location (Q4 2026)**
- If TKE expands or acquires
- Use Jackson playbook
- 8-week implementation

**Phase C: Scale Planning (2027)**
- SaaS considerations
- Multi-tenant architecture
- Commercial licensing model

### Playbook for New Sites

The Jackson pilot will produce a **TALIA Implementation Playbook** including:
- Equipment list and setup guide
- Card templates and printing guide
- AppSheet configuration export
- Training curriculum
- Change management guide
- Metrics and evaluation framework

### Estimated Per-Site Costs (Post-Playbook)

| Category | Cost | Notes |
|----------|------|-------|
| Equipment | $2,000 | Scale, Chromebooks, organizers |
| Training | $3,000 | Staff time, materials |
| Implementation Support | $2,000 | TKE team time |
| Contingency | $1,000 | |
| **Total Per Site** | **$8,000** | Significantly lower than pilot |

---

## 15. Appendices

### Appendix A: Card Design Files

**Location:** `/talia-implementation-plan/cards/`

| File | Description |
|------|-------------|
| `measurement-card-v1.pdf` | Print-ready Measurement Card |
| `assessment-card-v1.pdf` | Print-ready Assessment Card |
| `intervention-card-v1.pdf` | Print-ready Intervention Card |
| `patient-summary-card-v1.pdf` | Print-ready Patient Summary Card |
| `module-nsaids-v1.pdf` | NSAIDs Module Card |
| `module-gout-v1.pdf` | Gout/Krystexxa Module Card |
| `module-diabetes-v1.pdf` | Diabetes Module Card |
| `module-hf-v1.pdf` | Heart Failure Module Card |
| `module-bp-v1.pdf` | BP Control Module Card |
| `module-anemia-v1.pdf` | Anemia Module Card |
| `module-predialysis-v1.pdf` | Pre-Dialysis Module Card |
| `module-transplant-v1.pdf` | Transplant Evaluation Module Card |

### Appendix B: Training Materials

**Location:** `/talia-implementation-plan/training/`

| File | Description |
|------|-------------|
| `ma-station-guide.pdf` | Quick reference for MAs |
| `scribe-briefing-guide.pdf` | Briefing template and tips |
| `provider-overview.pdf` | Provider role summary |
| `full-workflow-diagram.pdf` | Visual workflow reference |
| `roleplay-scenarios.pdf` | Training scenarios |
| `faq-document.pdf` | Common questions and answers |

### Appendix C: Standard Operating Procedures

**Location:** `/talia-implementation-plan/sops/`

| File | Description |
|------|-------------|
| `sop-001-patient-arrival.md` | Patient arrival and weight station |
| `sop-002-vitals-station.md` | Station 1 procedures |
| `sop-003-data-gathering.md` | Station 2 procedures |
| `sop-004-context-preparation.md` | Station 3 procedures |
| `sop-005-provider-encounter.md` | Station 4 procedures |
| `sop-006-wrap-up.md` | Station 5 procedures |
| `sop-007-data-entry.md` | AppSheet data entry |
| `sop-008-card-management.md` | Card printing and inventory |
| `sop-009-issue-escalation.md` | Problem resolution process |

### Appendix D: AppSheet Configuration

**Location:** `/talia-implementation-plan/appsheet/`

| File | Description |
|------|-------------|
| `table-definitions.md` | All table schemas |
| `form-configurations.md` | Data entry form specs |
| `automation-rules.md` | AppSheet automations |
| `dashboard-queries.md` | Report queries |

### Appendix E: Reference Documents

**Location:** `/talia-implementation-plan/references/`

| File | Description |
|------|-------------|
| `gdmt-guidelines.pdf` | KDIGO and AHA guidelines |
| `bp-targets.pdf` | Blood pressure target evidence |
| `transplant-referral-criteria.pdf` | When to refer for transplant |
| `quality-benchmarks.csv` | Industry quality benchmarks |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Dr. Shree Mulay | Initial release |

---

## Approval

**This implementation plan is approved for execution.**

**Executive Sponsor:**

_________________________________  
Dr. Shree Mulay, MD  
The Kidney Experts, PLLC  
Date: January 2026

---

*"TALIA represents our commitment to excellence in kidney care. Every patient deserves a system that ensures nothing falls through the cracks. This is that system."*

— Dr. Shree Mulay

---

**THE KIDNEY EXPERTS, PLLC**  
*Ridding the world of the need for dialysis*

Jackson, TN | (731) 300-6155 | thekidneyexperts.com
