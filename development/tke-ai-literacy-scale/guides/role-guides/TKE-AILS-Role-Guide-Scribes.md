# TKE-AILS Role Guide: Clinical Scribes

## AI Literacy for Documentation Excellence

> **Target Level: 4 (Integrator)**
> 
> *"AI handles the typing so you can focus on capturing what matters."*

---

## Table of Contents

1. [Your Role in the AI-Powered Practice](#your-role-in-the-ai-powered-practice)
2. [Core AI Competencies for Scribes](#core-ai-competencies-for-scribes)
3. [Top 10 AI Use Cases](#top-10-ai-use-cases)
4. [Prompt Templates Library](#prompt-templates-library)
5. [Workflow Integration](#workflow-integration)
6. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
7. [Advancement Path](#advancement-path)
8. [Quick Reference Card](#quick-reference-card)

---

## Your Role in the AI-Powered Practice

### The Scribe's Mission

As a clinical scribe at The Kidney Experts, you are the **bridge between the clinical encounter and the medical record**. Your documentation captures the story of each patient's kidney health journey.

With AI, your role evolves from **stenographer** to **Clinical Intelligence Preparer**:

| Traditional Scribe | AI-Augmented Scribe |
|--------------------|---------------------|
| Transcribe everything said | Capture key clinical decisions |
| Type during entire encounter | Pre-chart before, refine after |
| Repeat data gathering | Leverage AI-prepared summaries |
| Manual note formatting | AI-assisted structure and polish |
| Reactive documentation | Proactive care gap identification |

### Why Level 4 is Your Target

At Level 4 (Integrator), you:
- Embed AI into every documentation workflow
- Create and share prompt templates with colleagues
- Identify new AI use cases that improve efficiency
- Help train others on AI-assisted documentation

---

## Core AI Competencies for Scribes

### 1. Pre-Charting Excellence

**Before the patient arrives**, use AI to:
- Summarize the last 3-5 visits
- Extract relevant lab trends (eGFR, uric acid, potassium)
- Identify medications requiring attention
- Flag overdue screenings or referrals
- Prepare the HPI shell based on prior notes

### 2. Real-Time Documentation Support

**During the encounter**, use AI to:
- Transcribe dictation (if using voice tools)
- Suggest appropriate ICD-10 codes based on documentation
- Format notes according to TKE templates
- Generate procedure notes from key details

### 3. Post-Visit Refinement

**After the encounter**, use AI to:
- Polish and format the note
- Check for missing required elements
- Generate patient-friendly summaries (AVS)
- Draft referral letters and care coordination notes

### 4. Quality Verification

**Always verify AI outputs for:**
- Correct patient attribution (no mixing up patients)
- Accurate medication names and doses
- Appropriate clinical context
- Proper formatting per TKE standards

---

## Top 10 AI Use Cases

### Use Case 1: Visit Summary Preparation

**Scenario:** Patient arriving in 15 minutes. Need to prepare the provider.

**Prompt Template:**
```
Summarize this patient's nephrology care for provider preparation:

Patient: [Copy relevant chart information]

Please provide:
1. One-paragraph clinical summary (diagnosis, current CKD stage, recent trajectory)
2. Key labs from last 3 visits (eGFR, Cr, K, Bicarb, uric acid, A1c if diabetic)
3. Current kidney-related medications with doses
4. Outstanding issues or care gaps
5. Relevant upcoming appointments or pending referrals

Format as a quick-reference briefing the provider can review in 60 seconds.
```

**Verification:** Check that lab values match the chart; confirm medication list is current.

---

### Use Case 2: HPI Shell Generation

**Scenario:** Need to start the HPI before the visit.

**Prompt Template:**
```
Based on this patient's last visit note, generate an HPI shell for today's follow-up:

Last visit note: [Paste prior HPI and A/P]

Create an HPI template that:
- References the prior visit date and main issues addressed
- Includes placeholders for interval changes [TO BE UPDATED]
- Notes any instructions given and whether they were followed
- Uses nephrology-appropriate language

Format: Ready-to-edit HPI paragraph with clear [PLACEHOLDERS] for information to be gathered.
```

**Verification:** Ensure the referenced information is accurate; update all placeholders during the visit.

---

### Use Case 3: Lab Trend Narrative

**Scenario:** Need to document lab trajectory for the note.

**Prompt Template:**
```
Create a clinical narrative describing this patient's kidney function trajectory:

Labs:
[Paste 3-6 lab panels with dates]

Generate:
1. A 2-3 sentence narrative describing the eGFR trend
2. Note any concerning changes in potassium, bicarbonate, or other values
3. Comment on proteinuria trend if UACR/UPCR available
4. Suggest CKD stage if applicable

Use clinical language appropriate for a nephrology progress note.
```

**Verification:** Confirm all lab values are correctly stated; verify CKD stage calculation.

---

### Use Case 4: Medication Reconciliation Narrative

**Scenario:** Provider reviewed medications; need to document.

**Prompt Template:**
```
Generate a medication reconciliation narrative for a nephrology progress note:

Current medications:
[Paste medication list]

Changes made today:
[List any changes: additions, discontinuations, dose adjustments]

Create a brief narrative that:
- Confirms medications were reviewed with patient
- Notes any changes and rationale
- Highlights nephrology-relevant medications (SGLT2i, ACEi/ARB, diuretics, ESAs, phosphate binders)
- Notes adherence if discussed

Format: 3-4 sentences suitable for the A/P section.
```

**Verification:** Confirm all changes are accurately captured; verify correct medication names.

---

### Use Case 5: Assessment & Plan Formatting

**Scenario:** Provider dictated A/P; need to format properly.

**Prompt Template:**
```
Format this dictated Assessment & Plan into a structured nephrology note:

Dictation: "[Paste or summarize provider's verbal A/P]"

Format into:
1. Problem-based A/P structure
2. Each problem with:
   - Current status
   - Plan (medications, labs, referrals, follow-up)
3. Use standard nephrology terminology
4. Include appropriate ICD-10 codes where clear

Maintain the provider's clinical reasoning; just improve structure and formatting.
```

**Verification:** Ensure clinical content matches provider intent; verify ICD-10 codes are appropriate.

---

### Use Case 6: Patient Education Summary (AVS)

**Scenario:** Need to create patient-friendly visit summary.

**Prompt Template:**
```
Create a patient-friendly After Visit Summary based on this note:

Today's visit summary:
[Paste key elements from the note]

Generate a summary that:
- Uses 8th-grade reading level
- Explains what was discussed in plain language
- Lists any medication changes with simple instructions
- Includes follow-up appointments and what to do before next visit
- Provides warning signs to watch for

Format: Bulleted, easy-to-scan summary suitable for patient handout.
```

**Verification:** Confirm instructions match provider's actual orders; check for medical jargon that patients may not understand.

---

### Use Case 7: Referral Letter Drafting

**Scenario:** Provider requests referral to transplant center.

**Prompt Template:**
```
Draft a referral letter from The Kidney Experts to a transplant center:

Patient information:
- [Age, gender, relevant demographics]
- Primary diagnosis: [CKD stage, etiology]
- Current eGFR: [value and date]
- Key comorbidities: [DM, HTN, etc.]

Reason for referral: Transplant evaluation

Include:
1. Brief clinical summary (2-3 sentences)
2. Current kidney function and trajectory
3. Relevant comorbidities affecting candidacy
4. Current medications
5. Reason we believe patient is a transplant candidate
6. What we're requesting (evaluation, listing, etc.)

Tone: Professional, collegial, concise
Format: Standard referral letter format

Sign as: [Provider name], The Kidney Experts, PLLC
```

**Verification:** Confirm all clinical details are accurate; have provider review before sending.

---

### Use Case 8: Care Gap Documentation

**Scenario:** Need to document why a recommended therapy wasn't prescribed.

**Prompt Template:**
```
Generate documentation for a care gap explanation:

Recommended therapy: [e.g., SGLT2 inhibitor per KDIGO guidelines]
Reason not prescribed: [e.g., patient declined, contraindicated, insurance barrier]

Create a note addendum that:
- States the guideline-recommended therapy
- Documents the specific reason it was not prescribed
- Notes discussion with patient if applicable
- Includes plan for reassessment if appropriate

Format: Brief addendum suitable for compliance documentation.
```

**Verification:** Ensure the reason accurately reflects the clinical discussion; confirm with provider if unclear.

---

### Use Case 9: Procedure Note Generation

**Scenario:** Provider performed dialysis catheter exam; need procedure note.

**Prompt Template:**
```
Generate a procedure note for a dialysis access examination:

Procedure: [Physical examination of AV fistula / AV graft / dialysis catheter]
Access type: [Specify]
Access location: [e.g., left forearm radiocephalic AVF]

Findings:
[List findings: thrill, bruit, arm swelling, signs of infection, etc.]

Create a procedure note that includes:
1. Indication
2. Access type and location
3. Examination technique
4. Findings (normal and abnormal)
5. Assessment and recommendations

Format: Standard procedure note format.
```

**Verification:** Confirm findings match what provider observed; verify anatomical details.

---

### Use Case 10: End-of-Day Note Review

**Scenario:** Reviewing notes before provider sign-off.

**Prompt Template:**
```
Review this nephrology progress note for completeness and quality:

Note:
[Paste complete note]

Check for:
1. Missing required elements (CC, HPI, ROS, PE, A/P)
2. Internal consistency (does A/P match HPI?)
3. Lab values mentioned without dates
4. Medications mentioned without doses
5. Vague language that should be specific
6. Missing ICD-10 codes for problems addressed
7. Grammar and formatting issues

Provide a brief checklist of items needing attention.
```

**Verification:** Use this as a self-check; verify any corrections are clinically appropriate.

---

## Prompt Templates Library

### Quick Prompts for Common Tasks

#### Summarize Labs
```
Summarize these labs in 2-3 clinical sentences focusing on kidney function, electrolytes, and any abnormalities:
[Paste labs]
```

#### Format Med List
```
Format this medication list with generic names, doses, frequencies, and indication category (BP, diabetes, kidney-protective, etc.):
[Paste meds]
```

#### Dictation Cleanup
```
Clean up this dictated text, fixing grammar and formatting while preserving all clinical content:
[Paste dictation]
```

#### Quick A/P for Simple Follow-up
```
Generate a brief A/P for a stable CKD follow-up:
- CKD Stage: [X]
- Etiology: [diabetic/hypertensive/other]
- Current status: Stable / Improved / Worsening
- Labs: [recent eGFR]
- Continue current regimen: [Y/N]
- Follow-up: [timeframe]
```

#### ICD-10 Suggestions
```
Based on this A/P, suggest appropriate ICD-10 codes:
[Paste A/P section]
```

---

## Workflow Integration

### Pre-Visit Workflow (15-30 min before)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Open patient chart                                       │
│ 2. Copy last 2-3 visit notes, recent labs, med list         │
│ 3. Use AI to generate visit summary briefing                │
│ 4. Use AI to prepare HPI shell with placeholders            │
│ 5. Review AI output; correct any errors                     │
│ 6. Save briefing for provider; open HPI template            │
└─────────────────────────────────────────────────────────────┘
```

### During-Visit Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Update HPI placeholders with current information         │
│ 2. Document key clinical findings in real-time              │
│ 3. Capture provider's verbal A/P (notes or shorthand)       │
│ 4. Flag any care gaps mentioned for documentation           │
└─────────────────────────────────────────────────────────────┘
```

### Post-Visit Workflow (Immediately after)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Use AI to format and polish the A/P                      │
│ 2. Use AI to generate patient education summary             │
│ 3. Run AI quality check on complete note                    │
│ 4. Verify all AI outputs; make corrections                  │
│ 5. Queue note for provider review and signature             │
└─────────────────────────────────────────────────────────────┘
```

### Time Savings Estimate

| Task | Without AI | With AI | Savings |
|------|------------|---------|---------|
| Pre-charting | 10 min | 4 min | 6 min |
| HPI draft | 8 min | 3 min | 5 min |
| A/P formatting | 5 min | 2 min | 3 min |
| AVS creation | 5 min | 2 min | 3 min |
| **Per patient total** | **28 min** | **11 min** | **17 min** |

*At 20 patients/day = 5+ hours saved*

---

## Common Pitfalls & Solutions

### Pitfall 1: Trusting AI Blindly

**Problem:** AI hallucinates a medication or lab value that isn't in the chart.

**Solution:** Always verify clinical data against the source. Never assume AI got it right.

**Rule:** If you didn't copy it from the chart, check that AI didn't invent it.

---

### Pitfall 2: Copy-Paste Errors

**Problem:** AI output from one patient accidentally ends up in another patient's chart.

**Solution:** 
- Clear your AI conversation between patients
- Always verify patient name/DOB at the top of any AI output
- Use patient identifiers in your prompts only within TKE Workspace

---

### Pitfall 3: Over-Polishing

**Problem:** AI makes the note sound "too perfect" and loses the provider's voice.

**Solution:** Ask AI to maintain clinical language and provider style. Example:

```
Format this note while maintaining the provider's clinical voice. 
Don't add flowery language or change medical terminology.
Just improve structure and fix obvious errors.
```

---

### Pitfall 4: Missing Context

**Problem:** AI generates a generic response because you didn't give enough context.

**Solution:** Always include:
- What you need (specific deliverable)
- Patient context (relevant clinical info)
- Format expectations (how should it look?)
- Constraints (what to avoid)

---

### Pitfall 5: Not Iterating

**Problem:** First AI output isn't quite right, so you abandon AI and do it manually.

**Solution:** Give feedback! Say:
- "Make it shorter"
- "Add more detail about the transplant referral"
- "Use problem-based format instead of paragraph format"
- "The tone is too casual; make it more professional"

Usually 1-2 iterations gets you what you need.

---

## Advancement Path

### Level 3 → Level 4 (Current Goal)

**Skills to develop:**
- [ ] Use AI for every pre-chart
- [ ] Create 5+ custom prompts for your common tasks
- [ ] Reduce documentation time by 30%+
- [ ] Help train 1+ colleague on AI use
- [ ] Contribute prompts to TKE shared library

### Level 4 → Level 5 (Champion)

**Skills to develop:**
- [ ] Lead AI training for new scribes
- [ ] Develop workflow improvements using AI
- [ ] Contribute to TALIA documentation module design
- [ ] Mentor multiple colleagues
- [ ] Identify and pilot new AI tools

---

## Quick Reference Card

### The 5 Rules (Scribe Version)

1. **Be Specific** — Include patient context, desired format, clinical purpose
2. **Provide Context** — Paste relevant chart data; specify nephrology focus
3. **TKE Workspace Only** — All PHI stays in @thekidneyexperts.com Gemini
4. **Verify Everything** — Check every med, every lab, every date
5. **Iterate & Refine** — "Make it shorter," "Add the labs," "Fix the format"

### Verification Checklist

Before using ANY AI output in a patient note:

- [ ] Patient identifiers correct?
- [ ] Medication names and doses accurate?
- [ ] Lab values and dates match chart?
- [ ] Clinical narrative makes sense?
- [ ] Format matches TKE standards?
- [ ] No invented or hallucinated information?

### Emergency Stop

If AI produces something wrong or concerning:
1. **Don't use it**
2. **Don't just edit it** — start fresh if the error is significant
3. **Document the issue** (screenshot if possible)
4. **Report to AI Champion** — we learn from errors

---

<p align="center">
<strong>The Kidney Experts, PLLC</strong><br>
<em>"Treated like family. Built for impact."</em><br>
<br>
<strong>Ridding the World of the Need for Dialysis!</strong>
</p>

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Target Role:** Clinical Scribes  
**Target Level:** 4 (Integrator)
