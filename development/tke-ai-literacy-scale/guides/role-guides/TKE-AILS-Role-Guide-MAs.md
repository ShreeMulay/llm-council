# TKE-AILS Role Guide: Medical Assistants

## AI Literacy for Patient-Centered Care

> **Target Level: 3 (Practitioner)**
> 
> *"AI helps you prepare better so patients feel cared for from the moment they arrive."*

---

## Table of Contents

1. [Your Role in the AI-Powered Practice](#your-role-in-the-ai-powered-practice)
2. [Core AI Competencies for MAs](#core-ai-competencies-for-mas)
3. [Top 10 AI Use Cases](#top-10-ai-use-cases)
4. [Prompt Templates Library](#prompt-templates-library)
5. [Workflow Integration](#workflow-integration)
6. [The Card-Based System & AI](#the-card-based-system--ai)
7. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
8. [Advancement Path](#advancement-path)
9. [Quick Reference Card](#quick-reference-card)

---

## Your Role in the AI-Powered Practice

### The MA's Mission

As a Medical Assistant at The Kidney Experts, you are the **first clinical touchpoint** for our patients. You set the tone for the entire visit. When patients feel welcomed, prepared, and informed, everything else goes smoother.

With AI, your role evolves from **task executor** to **Patient Experience Specialist**:

| Traditional MA | AI-Augmented MA |
|----------------|-----------------|
| Collect vitals and data | Prepare personalized patient experience |
| Follow scripts | Adapt communication to patient needs |
| Hand off to provider | Provide preliminary education |
| Reactive problem-solving | Proactive issue identification |
| Manual form completion | AI-assisted documentation |

### Why Level 3 is Your Target

At Level 3 (Practitioner), you:
- Use AI regularly for specific tasks
- Can craft effective prompts that get useful results
- Know when to verify AI outputs
- Have integrated AI into several workflows
- Feel confident teaching basics to newer team members

---

## Core AI Competencies for MAs

### 1. Patient Preparation

**Before the patient arrives**, use AI to:
- Understand what brings them in today
- Prepare relevant educational materials
- Anticipate questions they might have
- Identify any special needs or preferences

### 2. Communication Enhancement

**During patient interactions**, use AI to:
- Generate clear explanations of procedures
- Create patient-friendly descriptions of conditions
- Prepare talking points for common topics
- Draft responses to patient questions

### 3. Documentation Support

**For paperwork and records**, use AI to:
- Help complete report cards accurately
- Prepare information for the scribe
- Draft patient instructions
- Create follow-up reminders

### 4. Patient Education

**To empower patients**, use AI to:
- Generate CKD stage-appropriate education materials
- Create diet and lifestyle guides
- Explain medication purposes in simple terms
- Prepare procedure preparation instructions

---

## Top 10 AI Use Cases

### Use Case 1: Patient Education Handouts

**Scenario:** Patient newly diagnosed with CKD Stage 3. Need to explain what this means.

**Prompt Template:**
```
Create a patient education handout about CKD Stage 3 for a patient at The Kidney Experts.

Requirements:
- 8th grade reading level
- Explain what CKD Stage 3 means in plain language
- What the patient can do to protect their kidneys
- Foods to limit (sodium, potassium basics)
- Warning signs to watch for
- Encouraging tone - this is manageable!

Format: One page, bulleted, easy to scan
Include: The Kidney Experts contact info for questions
```

**Verification:** Review for accuracy; confirm information matches KDIGO guidelines; ensure reading level is appropriate.

---

### Use Case 2: Medication Purpose Explanations

**Scenario:** Patient asks "Why am I taking all these medications?"

**Prompt Template:**
```
Explain these kidney medications in simple, patient-friendly terms:

Medications:
1. Lisinopril 10mg daily
2. Jardiance 10mg daily
3. Sodium bicarbonate 650mg three times daily

For each medication, explain:
- What it does for the kidneys (in plain language)
- Why it's important
- One key thing to know (e.g., don't stop suddenly, take with food)

Tone: Reassuring, not scary
Reading level: 8th grade
Format: Simple list the patient can take home
```

**Verification:** Confirm medication names and purposes are accurate; have provider or pharmacist review if unsure.

---

### Use Case 3: Diet Guidelines by CKD Stage

**Scenario:** Patient needs dietary guidance appropriate for their CKD stage.

**Prompt Template:**
```
Create a simple diet guide for a CKD Stage [3/4/5] patient:

Include:
- Foods that are kidney-friendly (with examples)
- Foods to limit and why
- Simple meal ideas for breakfast, lunch, dinner
- Snack suggestions
- Practical tips for eating out

Avoid: Complex medical terminology
Tone: Positive and achievable, not restrictive
Format: One-page guide with bullet points

Note: This is general guidance - they should follow their dietitian's specific recommendations.
```

**Verification:** Verify recommendations are stage-appropriate (e.g., potassium restrictions differ by stage).

---

### Use Case 4: Pre-Visit Instructions

**Scenario:** Patient scheduled for labs before their next visit.

**Prompt Template:**
```
Create pre-visit instructions for a nephrology patient coming for labs and a follow-up appointment:

Appointment details:
- Labs at [time]
- Provider visit at [time]
- Location: [TKE location]

Instructions to include:
- Fasting requirements (if applicable): [Yes/No - specify hours]
- Medications to take or hold: [specify if any]
- What to bring (insurance card, medication list, etc.)
- Parking information
- What to expect during the visit

Tone: Helpful and clear
Format: Numbered steps, easy to follow
```

**Verification:** Confirm fasting requirements and medication instructions are correct for this patient.

---

### Use Case 5: Explaining Lab Results (Simple Version)

**Scenario:** Patient received labs and wants to understand what they mean.

**Prompt Template:**
```
Explain these lab results in simple terms for a CKD patient:

Results:
- eGFR: [value]
- Creatinine: [value]
- Potassium: [value]
- Bicarbonate: [value]

For each:
- What it measures (in plain language)
- Whether this result is concerning or okay
- What might affect it

Important: End with "The provider will discuss these results and any changes to your treatment plan."

Tone: Informative but not alarming
Format: Simple explanations a patient can understand
```

**Verification:** Confirm values are correctly interpreted; always defer clinical interpretation to the provider.

---

### Use Case 6: Procedure Preparation Guide

**Scenario:** Patient scheduled for a kidney biopsy or dialysis access procedure.

**Prompt Template:**
```
Create a patient preparation guide for a [kidney biopsy / AV fistula creation / dialysis catheter placement]:

Include:
- What the procedure is and why it's done (simple explanation)
- How to prepare (days before, night before, morning of)
- Medications to stop or continue
- What to expect the day of the procedure
- Recovery expectations
- When to call with concerns

Tone: Reassuring, thorough
Format: Day-by-day checklist
Include: Contact number for questions
```

**Verification:** Confirm preparation instructions match the surgeon/specialist's requirements.

---

### Use Case 7: Answering Common Patient Questions

**Scenario:** Patient asks a question you're not sure how to answer simply.

**Prompt Template:**
```
A patient asked: "[Insert patient's question]"

Help me explain this in simple terms appropriate for a patient with [CKD Stage X / on dialysis / transplant candidate].

Requirements:
- Use everyday language, no medical jargon
- Be accurate but not overwhelming
- If this requires provider input, say so
- Keep the response to 2-3 sentences I can say verbally

Context: I'm a medical assistant at a nephrology practice.
```

**Verification:** Ensure the answer is clinically accurate; when in doubt, defer to provider.

---

### Use Case 8: Report Card Completion Assistance

**Scenario:** Need help understanding what to document on the patient report card.

**Prompt Template:**
```
I'm completing a patient report card for a nephrology visit. Help me understand what to document:

Patient information:
- Chief complaint: [reason for visit]
- Vitals: BP [X], Weight [X], compared to last visit [up/down/same]
- Relevant symptoms patient mentioned: [list any]

Questions:
1. What additional questions should I ask for this type of visit?
2. Are there standard screenings I should check on (falls, depression, etc.)?
3. What should I flag for the provider's attention?

Format: Checklist I can follow
```

**Verification:** Follow TKE protocols; use AI suggestions as prompts, not substitutes for required elements.

---

### Use Case 9: Patient Reminder Messages

**Scenario:** Need to send appointment reminder or follow-up message.

**Prompt Template:**
```
Draft a friendly patient reminder message:

Type: [Appointment reminder / Lab reminder / Medication refill reminder]
Details: [Include relevant appointment time, location, or action needed]

Requirements:
- Warm, friendly tone (we're The Kidney Experts - "Treated like family")
- Clear action item
- Contact information for questions
- Brief - suitable for text message or phone script

Do not include any patient-specific health information in the message.
```

**Verification:** Ensure no PHI is included in messages that go through unsecured channels.

---

### Use Case 10: End-of-Visit Patient Instructions

**Scenario:** Provider has given verbal instructions; need to create a written summary.

**Prompt Template:**
```
Create written patient instructions based on today's visit:

Instructions from provider:
[List the verbal instructions given]

Format these as:
1. Medications (new, changed, or continued)
2. Diet/lifestyle recommendations
3. Follow-up appointments needed
4. Labs to be done and when
5. Warning signs to watch for
6. When to call the office

Tone: Clear, reassuring
Format: Numbered list, easy to read
Include: Our phone number for questions
```

**Verification:** Confirm all instructions match what the provider actually said; have provider or scribe review if unsure.

---

## Prompt Templates Library

### Quick Prompts for Common Tasks

#### Simple Med Explanation
```
Explain [medication name] to a patient in one simple sentence - what it does for their kidneys and why it's important.
```

#### Symptom Check Questions
```
What questions should I ask a CKD patient who reports [symptom: swelling / fatigue / shortness of breath / etc.]?
```

#### Diet Quick Tip
```
Give me one simple, practical diet tip for a CKD Stage [X] patient who likes [food type they mentioned].
```

#### Appointment Prep Checklist
```
Create a quick checklist for a patient preparing for their first nephrology appointment. What should they bring?
```

#### Reassurance Script
```
A patient is anxious about [their diagnosis / starting dialysis / upcoming procedure]. Give me a brief, reassuring response that acknowledges their feelings and offers hope.
```

---

## Workflow Integration

### Pre-Visit Workflow (Morning Prep)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Review today's patient schedule                          │
│ 2. For new patients: use AI to prepare welcome materials    │
│ 3. For follow-ups: note any special education needs         │
│ 4. Prepare any handouts or materials needed                 │
│ 5. Have AI-generated resources ready to personalize         │
└─────────────────────────────────────────────────────────────┘
```

### During-Visit Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Welcome patient warmly (first impression matters!)       │
│ 2. Collect vitals and complete report card                  │
│ 3. If patient has questions: use AI to help explain simply  │
│ 4. Provide relevant education materials                     │
│ 5. Note any concerns for provider attention                 │
└─────────────────────────────────────────────────────────────┘
```

### Post-Visit Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Use AI to create patient instruction summary             │
│ 2. Schedule follow-up appointments                          │
│ 3. Provide any additional handouts                          │
│ 4. Ensure patient understands next steps                    │
│ 5. Warm send-off (patient leaves feeling cared for)         │
└─────────────────────────────────────────────────────────────┘
```

---

## The Card-Based System & AI

### What is the Card-Based System?

TKE is moving toward a card-based clinical workflow where:
- Each patient encounter uses standardized topic cards
- MAs complete sections of these cards before the provider visit
- Information is captured once and used throughout the visit
- AI will eventually scan and process these cards (TALIA system)

### How AI Helps with Cards Today

| Card Section | How AI Can Help |
|--------------|-----------------|
| **Vitals** | Flag concerning values (e.g., BP >180, weight change >5 lbs) |
| **Medications** | Help explain medication purposes to patients |
| **Symptoms** | Suggest follow-up questions based on reported symptoms |
| **Education** | Generate patient-appropriate materials based on card data |
| **Follow-up** | Create clear written instructions from card notes |

### Your Role in TALIA's Future

The card-based system you're learning now is the foundation for TALIA—our AI-powered clinical system. By mastering cards and AI today, you're preparing to be a power user when TALIA launches.

---

## Common Pitfalls & Solutions

### Pitfall 1: Using AI for Clinical Decisions

**Problem:** AI suggests a medication change or clinical recommendation.

**Solution:** AI is for information and communication, NOT clinical decisions. Always defer to the provider for anything involving:
- Medication changes
- Diagnosis
- Treatment recommendations
- Clinical advice

**Your role:** "That's a great question - let me make sure the provider addresses that with you."

---

### Pitfall 2: Overly Complex Language

**Problem:** AI generates an explanation that's too medical or complicated.

**Solution:** Always request "8th grade reading level" and review the output. If it's still too complex, ask:
```
Make this simpler. Explain it like you're talking to your grandmother.
```

---

### Pitfall 3: Generic Patient Education

**Problem:** AI generates generic education that doesn't fit the patient.

**Solution:** Include patient-specific context:
- Their CKD stage
- Their specific conditions (diabetes, heart disease, etc.)
- Their concerns or questions
- Their literacy level or language needs

---

### Pitfall 4: Not Verifying Information

**Problem:** AI gives wrong information about a medication or procedure.

**Solution:** Always verify:
- Medication names and purposes (check against the chart)
- Procedure instructions (check against specialist protocols)
- Appointment details (check against the schedule)

**Rule:** If you're not 100% sure, ask before giving it to the patient.

---

### Pitfall 5: Forgetting the Human Touch

**Problem:** Relying on AI so much that interactions feel impersonal.

**Solution:** AI prepares you to be MORE personal, not less. Use AI to:
- Save time on paperwork → more time with patients
- Prepare better → more confident interactions
- Generate resources → personalized education

The patient should never feel like they're talking to a machine. They should feel like they're talking to a well-prepared, caring MA.

---

## Advancement Path

### Level 2 → Level 3 (Current Goal)

**Skills to develop:**
- [ ] Use AI daily for patient education materials
- [ ] Can write prompts that get useful results on first try
- [ ] Know which tasks AI helps with vs. which require human judgment
- [ ] Have 3+ "go-to" prompts you use regularly
- [ ] Feel confident explaining AI to patients if asked

### Level 3 → Level 4 (Integrator)

**Skills to develop:**
- [ ] Create custom prompts for your common scenarios
- [ ] Help train new MAs on AI use
- [ ] Identify new ways AI could help your workflow
- [ ] Contribute to TKE's prompt library
- [ ] Reduce routine work time by 25%+

---

## Quick Reference Card

### The 5 Rules (MA Version)

1. **Be Specific** — Include CKD stage, patient context, desired format
2. **Provide Context** — Explain the situation so AI understands
3. **TKE Workspace Only** — PHI only in @thekidneyexperts.com Gemini
4. **Verify Everything** — Especially medications, procedures, clinical info
5. **Iterate & Refine** — "Make it simpler," "Add a section about diet"

### What AI IS Good For (MAs)

✅ Patient education materials
✅ Simple explanations of conditions
✅ Medication purpose summaries
✅ Pre-visit preparation
✅ Written instructions from verbal orders
✅ Appointment reminders (no PHI)
✅ Diet and lifestyle guides

### What AI is NOT Good For (MAs)

❌ Clinical decisions (always provider)
❌ Diagnosing symptoms
❌ Recommending medication changes
❌ Replacing provider conversations
❌ Sensitive patient communications
❌ Anything requiring clinical judgment

### Emergency Stop

If AI produces something that seems wrong or could harm a patient:
1. **Don't give it to the patient**
2. **Ask your supervisor or provider**
3. **Report the issue to an AI Champion**

When in doubt, don't use it.

---

## Remember: You're the Heart of the Visit

AI is a tool that helps you prepare. But YOU are what makes patients feel cared for.

- Your smile when they arrive
- Your patience with their questions
- Your warmth when they're scared
- Your attention to their needs

AI can't do any of that. You can.

Use AI to handle the routine stuff so you have more energy for what matters: **making every patient feel like family**.

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
**Target Role:** Medical Assistants  
**Target Level:** 3 (Practitioner)
