# TKE-AILS Role Guide: Providers (MDs & APPs)

## AI Literacy for Clinical Excellence

> **Target Level: 4-5 (Integrator to Champion)**
> 
> *"AI handles the cognitive load of routine decisions so you can focus on complex clinical judgment."*

---

## Table of Contents

1. [Your Role in the AI-Powered Practice](#your-role-in-the-ai-powered-practice)
2. [Core AI Competencies for Providers](#core-ai-competencies-for-providers)
3. [Top 12 AI Use Cases](#top-12-ai-use-cases)
4. [Prompt Templates Library](#prompt-templates-library)
5. [Clinical Decision Support](#clinical-decision-support)
6. [Literature & Evidence Integration](#literature--evidence-integration)
7. [Documentation Optimization](#documentation-optimization)
8. [Patient Communication Excellence](#patient-communication-excellence)
9. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
10. [Leading AI Adoption](#leading-ai-adoption)
11. [Quick Reference Card](#quick-reference-card)

---

## Your Role in the AI-Powered Practice

### The Provider's Mission

As a physician or APP at The Kidney Experts, you are the **clinical decision-maker** and the **face of our expertise**. Patients trust you with their kidney health—often their lives.

With AI, your role evolves from **doing everything** to **leading a well-prepared team**:

| Traditional Provider | AI-Augmented Provider |
|---------------------|----------------------|
| Review raw chart data | Receive AI-curated clinical summaries |
| Dictate entire notes | Refine AI-drafted documentation |
| Manually check for drug interactions | AI flags issues proactively |
| Research guidelines from memory | AI surfaces relevant evidence |
| Write every letter from scratch | Edit AI-drafted communications |
| Cognitive overload by end of day | Preserved mental energy for complex cases |

### Why Level 4-5 is Your Target

At Level 4 (Integrator), you:
- Use AI throughout your clinical workflow
- Evaluate AI recommendations critically
- Lead by example for your team

At Level 5 (Champion), you:
- Drive AI strategy for the practice
- Develop new clinical AI workflows
- Represent TKE's AI expertise externally

### The 95% Rule

Our vision:

> **95% of care is delivered by non-provider staff BEFORE you enter the room.**

AI enables this by:
- Pre-charting that surfaces what matters
- Care gap identification before you see the patient
- Standardized protocols that non-providers can execute
- Your time reserved for complex judgment and patient relationships

---

## Core AI Competencies for Providers

### 1. Clinical Efficiency

**Use AI to reduce cognitive load:**
- Quick patient summaries before each visit
- Lab trend narratives that highlight changes
- Medication interaction checking
- Protocol adherence verification

### 2. Evidence-Based Practice

**Use AI to stay current:**
- Summarize recent literature on specific topics
- Compare treatment options with evidence
- Check guideline recommendations (KDIGO, KDOQI)
- Research rare conditions or presentations

### 3. Documentation Excellence

**Use AI to document faster and better:**
- Draft notes from bullet points
- Generate procedure notes
- Create referral letters
- Polish dictated content

### 4. Patient Communication

**Use AI to communicate more effectively:**
- Draft complex result letters
- Create personalized education materials
- Prepare difficult conversation talking points
- Generate shared decision-making aids

### 5. Quality & Safety

**Use AI to improve outcomes:**
- Identify care gaps before visits
- Flag patients due for screenings
- Suggest appropriate billing codes
- Document clinical decision rationale

---

## Top 12 AI Use Cases

### Use Case 1: Pre-Visit Clinical Summary

**Scenario:** Need to prepare for a complex patient in 2 minutes.

**Prompt Template:**
```
Create a clinical briefing for a nephrology provider seeing this patient:

Patient information:
[Paste: Demographics, problem list, recent notes, labs, medications]

Provide:
1. One-paragraph clinical summary (primary kidney disease, CKD stage, trajectory)
2. Key labs (eGFR trend, proteinuria, K+, bicarb, PTH, Hgb if CKD 4-5)
3. Current kidney-protective regimen (ACEi/ARB, SGLT2i, MRA status)
4. Potential care gaps (missing SGLT2i? overdue transplant referral? etc.)
5. Key issues to address today

Format: Scannable in 60 seconds
```

**Verification:** Spot-check key labs and meds against chart; confirm care gaps are valid.

---

### Use Case 2: Guideline-Based Treatment Check

**Scenario:** Ensuring patient is on optimal therapy per KDIGO 2024.

**Prompt Template:**
```
Evaluate this CKD patient's regimen against KDIGO 2024 guidelines:

Patient:
- CKD Stage: [X]
- Etiology: [Diabetic / Hypertensive / GN / PKD / Other]
- eGFR: [X] ml/min/1.73m²
- UACR: [X] mg/g
- Diabetes: [Yes/No]
- Heart failure: [Yes/No]
- Current BP: [X/X]

Current medications:
[List kidney-related medications with doses]

Assess:
1. Is ACEi/ARB at target dose? If not, reason?
2. Is SGLT2i indicated? If on one, is it appropriate?
3. Is finerenone indicated (T2DM + UACR >30)?
4. BP at target (<120 systolic per SPRINT)?
5. Any glaring gaps or contraindicated combinations?

Provide brief rationale for each recommendation.
```

**Verification:** Cross-reference with actual KDIGO 2024 guidelines; consider patient-specific factors not captured.

---

### Use Case 3: Complex Case Analysis

**Scenario:** Unusual presentation or multiple competing diagnoses.

**Prompt Template:**
```
Analyze this complex nephrology case:

Presentation:
[Describe the clinical scenario, labs, imaging, pathology]

Key questions:
1. What are the top 3 differential diagnoses?
2. What additional workup would help distinguish between them?
3. Are there any red flags I might be missing?
4. What's the evidence for treatment options?

For each differential:
- Supporting evidence from this case
- Against evidence
- Key test that would confirm/exclude

Important: This is for my clinical reasoning, not for direct patient care without my review.
```

**Verification:** AI is a thinking partner, not a consultant. Verify all suggestions with your clinical judgment and relevant literature.

---

### Use Case 4: Drug Interaction & Dosing Check

**Scenario:** Adding a new medication, need to check interactions.

**Prompt Template:**
```
Check drug interactions and dosing for a CKD patient:

Patient:
- eGFR: [X] ml/min/1.73m²
- Weight: [X] kg
- Liver function: [Normal / Impaired]

Current medications:
[List current medications]

Proposed new medication: [Drug name and intended dose]

Evaluate:
1. Are there any significant drug-drug interactions?
2. Does the dose need adjustment for renal function?
3. Are there nephrotoxicity concerns?
4. Any contraindications based on this patient's profile?

Cite specific recommendations if available.
```

**Verification:** Always verify with UpToDate, Lexicomp, or similar resource. AI may miss recent warnings or rare interactions.

---

### Use Case 5: Prior Authorization Letter (Clinical Appeal)

**Scenario:** Insurance denied medication; need compelling appeal.

**Prompt Template:**
```
Draft a prior authorization appeal letter for a denied medication:

Patient:
- Diagnosis: [Primary diagnosis]
- CKD Stage: [X]
- eGFR: [X]
- Relevant comorbidities: [List]

Denied medication: [Drug name, dose, duration requested]
Denial reason: [If known]

Clinical justification:
- Why this medication is medically necessary
- Prior treatments tried and failed: [List with details]
- Guidelines supporting use: [KDIGO, ADA, ACC, etc.]
- Risks of not receiving this treatment

Format: Professional letter to medical director
Tone: Assertive but collegial
Include: Peer-to-peer review request if denial upheld

Sign as: [Your name], [Specialty], The Kidney Experts, PLLC
```

**Verification:** Confirm all clinical details are accurate; verify guideline citations are correct.

---

### Use Case 6: Consult Response Letter

**Scenario:** PCP referred patient; need to send consult note.

**Prompt Template:**
```
Draft a consult response letter to a referring primary care physician:

Referring physician: Dr. [Name], [Practice]

Patient seen for: [Reason for referral]

Assessment:
[Your clinical assessment - diagnosis, CKD stage, etiology, prognosis]

Recommendations:
[Your management recommendations - numbered list]

Follow-up plan:
[When you'll see patient next, what PCP should monitor]

Tone: Collegial, educational where appropriate, appreciative of referral
Format: Professional consult letter
Length: 1 page (concise but thorough)

Sign as: [Your name], [Credentials], The Kidney Experts, PLLC
```

**Verification:** Ensure recommendations match what you actually told the patient; verify all medications/doses.

---

### Use Case 7: Literature Summary

**Scenario:** Need to quickly understand recent evidence on a topic.

**Prompt Template:**
```
Summarize the current evidence on [specific clinical topic]:

Topic: [e.g., "SGLT2 inhibitors in CKD without diabetes"]

Provide:
1. Key trials and their main findings (DAPA-CKD, EMPA-KIDNEY, etc.)
2. Current guideline recommendations (KDIGO, ADA, etc.)
3. Practical clinical implications
4. Any ongoing controversies or unanswered questions
5. Recent developments (within last 1-2 years if relevant)

Format: Bulleted summary I can review in 5 minutes
Include: References to key papers

Note: I will verify key points with primary sources.
```

**Verification:** AI's training has a cutoff date. Verify recent developments with PubMed or UpToDate.

---

### Use Case 8: Progress Note Draft

**Scenario:** Need to quickly draft a progress note from key points.

**Prompt Template:**
```
Draft a nephrology progress note from these key points:

Patient: [CKD Stage X, etiology]
Visit type: [Follow-up / New consult / Hospital follow-up]

Key points from today's visit:
- CC: [Chief complaint]
- Interval changes: [What's different since last visit]
- Labs: [Key values]
- Exam findings: [Any relevant PE]
- Assessment: [Your clinical impression]
- Plan: [What you're doing]

Format as:
- HPI (narrative paragraph)
- ROS (pertinent positives/negatives)
- PE (relevant findings)
- Assessment & Plan (problem-based)

Use standard nephrology terminology. Maintain clinical accuracy.
```

**Verification:** Review entire note for accuracy; ensure it reflects actual clinical encounter.

---

### Use Case 9: Patient Result Letter

**Scenario:** Need to communicate complex results to a patient.

**Prompt Template:**
```
Draft a patient-friendly letter explaining lab results:

Patient: [Name, if in TKE Workspace]
Key results:
- eGFR: [X] (previous: [X])
- [Other relevant results]

Interpretation: [What this means clinically]

Actions needed:
[Any medication changes, follow-up instructions, lifestyle recommendations]

Tone: Warm, reassuring, clear
Reading level: 8th grade
Length: One page maximum

Include:
- What the results mean in plain language
- What we're doing about it
- What the patient should do
- When to follow up
- When to call with concerns

Sign as: [Your name], The Kidney Experts, PLLC
```

**Verification:** Ensure interpretation matches your clinical assessment; confirm patient identifiers are correct.

---

### Use Case 10: Shared Decision-Making Aid

**Scenario:** Need to present treatment options for patient to consider.

**Prompt Template:**
```
Create a shared decision-making aid for a patient considering:

Decision: [e.g., "Starting dialysis vs. conservative management" OR "Choosing between peritoneal dialysis and hemodialysis"]

For each option, present:
1. What it involves (in plain language)
2. Benefits
3. Risks and burdens
4. Impact on lifestyle
5. What success looks like

Format: Side-by-side comparison table
Reading level: 8th grade
Tone: Neutral - presenting options, not recommending

Include: Space for patient questions and concerns

Note: Final recommendation will be personalized based on patient values.
```

**Verification:** Ensure all options are fairly represented; review for accuracy.

---

### Use Case 11: Quality Metric Documentation

**Scenario:** Need to document why a quality measure wasn't met.

**Prompt Template:**
```
Generate documentation for a quality measure exception:

Measure: [e.g., "SGLT2 inhibitor for diabetic CKD patients with UACR >200"]
Patient status: Measure NOT met

Reason for exception:
[e.g., "Patient declined due to cost concerns" OR "Contraindicated due to recurrent UTIs" OR "Recently started, awaiting insurance approval"]

Document:
1. The guideline-recommended therapy
2. Discussion with patient (if applicable)
3. Specific clinical reason for exception
4. Plan for reassessment (if applicable)

Format: Brief addendum suitable for quality reporting
```

**Verification:** Ensure documentation accurately reflects clinical reasoning.

---

### Use Case 12: Teaching Point Generation

**Scenario:** Want to create a teaching moment for trainees or staff.

**Prompt Template:**
```
Create a teaching point from this clinical case:

Case summary:
[Brief case description]

Learning objectives:
1. [What should learners understand from this case?]

Generate:
1. Case presentation (3-4 sentences)
2. Key teaching point (1-2 sentences)
3. Clinical pearl
4. Common mistakes to avoid
5. Follow-up question to test understanding

Format: Suitable for morning huddle or brief teaching session (2-3 minutes)
```

**Verification:** Ensure accuracy of clinical information; de-identify if sharing beyond immediate team.

---

## Prompt Templates Library

### Quick Clinical Prompts

#### Quick Summary
```
Summarize this patient's kidney status in 3 sentences: [Paste chart data]
```

#### Dose Check
```
What's the dose of [medication] for eGFR [X]? Standard vs. maximum?
```

#### Differential Generator
```
Top 5 causes of [finding] in a [age] patient with [relevant context]:
```

#### Guideline Quick Check
```
Per KDIGO 2024, what's the BP target for CKD with UACR [X]?
```

#### Care Gap Scan
```
Based on this patient's profile, identify any KDIGO care gaps:
[Paste problem list, meds, recent labs]
```

### Quick Documentation Prompts

#### Assessment One-Liner
```
Draft a one-line assessment for: [CKD Stage X, etiology, current status, trajectory]
```

#### Plan Generator
```
Generate a problem-based plan for these issues: [List problems addressed]
```

#### AVS Summary
```
Create a patient-friendly summary of today's visit: [Paste key points]
```

---

## Clinical Decision Support

### Using AI for Clinical Reasoning

AI can help with:
- Generating differential diagnoses
- Identifying patterns across data
- Surfacing relevant evidence
- Organizing complex information
- Checking for common oversights

AI **cannot** replace:
- Your clinical judgment
- Physical examination
- Patient relationship and trust
- Experience-based pattern recognition
- Ethical decision-making

### The Verification Imperative

**Rule:** Treat every AI clinical suggestion as coming from a smart medical student—potentially useful, but requiring attending-level verification.

**Always verify:**
- Drug doses and interactions (use Lexicomp/UpToDate)
- Guideline recommendations (check primary source)
- Lab interpretations (confirm values match chart)
- Clinical recommendations (apply your judgment)

---

## Literature & Evidence Integration

### Staying Current with AI

AI can help you:
- Summarize key trials in minutes
- Compare treatment options with evidence
- Understand mechanism of action for new drugs
- Review guidelines you haven't read recently

**Limitation:** AI's training has a cutoff date. For very recent developments:
- Ask AI what it knows, then verify with PubMed
- Use AI to understand foundational trials, verify recent updates manually
- Consider Ref or Exa search tools for latest literature

### Evidence Appraisal

When AI summarizes a trial, ask:
- "What were the key inclusion/exclusion criteria?"
- "What was the primary endpoint and effect size?"
- "What were the main limitations?"
- "How does this apply to my patient population?"

---

## Documentation Optimization

### Time-Saving Documentation Workflow

1. **Pre-visit:** AI generates summary and HPI shell
2. **During visit:** Focus on patient, jot key points
3. **Post-visit:** AI drafts note from your bullets; you review and edit
4. **Result:** Higher quality notes in less time

### Documentation Quality Check

Ask AI to review your note for:
- Completeness (all required elements present?)
- Consistency (does A/P match HPI?)
- Coding support (documentation supports complexity?)
- Clarity (would another provider understand your reasoning?)

---

## Patient Communication Excellence

### Complex Result Discussions

Use AI to prepare for difficult conversations:
```
A patient with [condition] just received [result/diagnosis]. Help me prepare to discuss this:

1. Key points to communicate
2. Common patient questions and how to answer
3. Emotional support language
4. Next steps to offer
5. Resources to provide
```

### Shared Decision-Making

Use AI to create balanced decision aids that:
- Present all options fairly
- Use patient-friendly language
- Include what matters to patients (not just clinical outcomes)
- Leave room for patient values and preferences

---

## Common Pitfalls & Solutions

### Pitfall 1: Over-Reliance on AI for Clinical Decisions

**Problem:** Accepting AI's clinical recommendation without verification.

**Solution:** AI is a thinking partner, not a consultant. You are the responsible clinician. Always apply your judgment.

**Mantra:** "Trust but verify. Always."

---

### Pitfall 2: AI Hallucinations in Medical Content

**Problem:** AI confidently states incorrect medication doses, interactions, or guidelines.

**Solution:** 
- Always verify clinical content with authoritative sources
- Be especially careful with doses, drug names, and numerical values
- When in doubt, check UpToDate, Lexicomp, or primary guidelines

---

### Pitfall 3: Documentation That Doesn't Match Reality

**Problem:** AI drafts a note that doesn't accurately reflect what happened.

**Solution:** AI drafts, you finalize. Never sign a note without reading every word. Edit to match actual encounter.

---

### Pitfall 4: Privacy Leaks

**Problem:** Using patient data in non-BAA-covered AI tools.

**Solution:** PHI only in TKE Workspace Gemini. Period. For external AI tools, de-identify completely or use hypothetical cases.

---

### Pitfall 5: Losing the Human Touch

**Problem:** Patients feel like they're getting AI-generated care.

**Solution:** AI handles preparation and paperwork. Your interaction with patients should be MORE personal, not less. Make eye contact. Listen. Connect. AI gives you the time to do this.

---

## Leading AI Adoption

### As a Level 4-5, You Lead By Example

Your team watches how you use AI. When you:
- Use AI to prepare for visits → They learn it's acceptable
- Verify AI outputs → They learn verification is essential
- Share useful prompts → They become more effective
- Admit when AI is wrong → They feel safe doing the same

### Mentoring Others

Help your team by:
- Sharing prompts that work for you
- Reviewing their AI-assisted work
- Answering questions without judgment
- Celebrating wins and learning from errors

### Contributing to Practice AI Strategy

As a Champion (Level 5):
- Identify new AI use cases
- Evaluate new AI tools
- Develop nephrology-specific prompts
- Represent TKE's AI capabilities externally
- Shape the TALIA system design

---

## Quick Reference Card

### The 5 Rules (Provider Version)

1. **Be Specific** — Include clinical context, patient specifics, desired output
2. **Provide Context** — CKD stage, comorbidities, current treatment, goals
3. **TKE Workspace Only** — PHI only in @thekidneyexperts.com Gemini
4. **Verify Everything** — Check every dose, interaction, guideline citation
5. **Iterate & Refine** — "Add renal dosing," "Make more concise," "Include contraindications"

### Verification Checklist

Before acting on ANY AI clinical output:

- [ ] Drug names and doses correct? (Check Lexicomp)
- [ ] Interactions identified accurately? (Verify with standard resource)
- [ ] Guideline recommendations current? (Check primary source)
- [ ] Clinical reasoning sound? (Apply your judgment)
- [ ] Patient-specific factors considered? (AI may miss nuance)

### AI Is NOT a Substitute For

- Your clinical judgment and experience
- Verification with authoritative sources
- Patient examination and relationship
- Ethical responsibility as the treating physician
- Final decision-making authority

### AI IS Excellent For

- Summarizing complex information quickly
- Drafting documentation you'll review
- Surfacing potential care gaps
- Generating options for your consideration
- Creating patient education materials
- Reducing cognitive load on routine tasks

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
**Target Role:** Physicians (MD/DO) and Advanced Practice Providers (NP/PA)  
**Target Level:** 4-5 (Integrator to Champion)
