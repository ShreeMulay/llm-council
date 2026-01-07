# TKE-AILS Role Guide: Care Coordinators (CCM/TCM)

## AI Literacy for Patient Engagement Excellence

> **Target Level: 3-4 (Practitioner to Integrator)**
> 
> *"AI helps you reach more patients with personalized care—so no one falls through the cracks."*

---

## Table of Contents

1. [Your Role in the AI-Powered Practice](#your-role-in-the-ai-powered-practice)
2. [Core AI Competencies for Care Coordination](#core-ai-competencies-for-care-coordination)
3. [Top 12 AI Use Cases](#top-12-ai-use-cases)
4. [Prompt Templates Library](#prompt-templates-library)
5. [Care Gap Identification](#care-gap-identification)
6. [Patient Outreach Excellence](#patient-outreach-excellence)
7. [Documentation for CCM/TCM](#documentation-for-ccmtcm)
8. [Workflow Integration](#workflow-integration)
9. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
10. [Advancement Path](#advancement-path)
11. [Quick Reference Card](#quick-reference-card)

---

## Your Role in the AI-Powered Practice

### The Care Coordinator's Mission

As a Care Coordinator at The Kidney Experts, you are the **connective tissue** of patient care. You ensure patients don't get lost between visits, manage chronic conditions proactively, and keep patients engaged in their kidney health journey.

With AI, your role evolves from **reactive follow-up** to **Proactive Care Strategist**:

| Traditional CCM | AI-Augmented CCM |
|-----------------|------------------|
| Call patients from a list | AI prioritizes who needs outreach most |
| Generic check-in messages | AI-personalized communication |
| Manual care gap tracking | AI identifies gaps automatically |
| Write every care plan from scratch | AI drafts personalized care plans |
| React to problems | Anticipate and prevent problems |
| Limited patients per day | Reach more patients with same effort |

### Why Level 3-4 is Your Target

At Level 3 (Practitioner), you:
- Use AI daily for outreach and documentation
- Craft effective prompts that get personalized results
- Know how to verify and customize AI outputs

At Level 4 (Integrator), you:
- Embed AI into every patient interaction workflow
- Identify new ways AI can improve care coordination
- Help train others on AI-enhanced CCM

---

## Core AI Competencies for Care Coordination

### 1. Patient Outreach

**Use AI to communicate more effectively:**
- Draft personalized check-in messages
- Create follow-up call scripts
- Generate reminder messages
- Craft difficult conversation talking points

### 2. Care Gap Identification

**Use AI to spot what's missing:**
- Analyze patient data for missing interventions
- Identify overdue labs, screenings, or referrals
- Flag patients who need attention
- Prioritize outreach by urgency

### 3. Care Plan Development

**Use AI to plan comprehensively:**
- Draft personalized care plans
- Set appropriate goals
- Identify barriers and solutions
- Create actionable next steps

### 4. Patient Education

**Use AI to educate and empower:**
- Generate CKD stage-appropriate materials
- Create diet and lifestyle guides
- Explain medications in simple terms
- Prepare self-management resources

### 5. Documentation Excellence

**Use AI to document efficiently:**
- CCM time documentation
- Care plan updates
- Patient encounter summaries
- Goal progress notes

---

## Top 12 AI Use Cases

### Use Case 1: Personalized Check-In Message

**Scenario:** Monthly CCM check-in with established patient.

**Prompt Template:**
```
Draft a personalized check-in message for a CCM patient:

Patient context:
- CKD Stage: [X]
- Key issues from last contact: [What was discussed]
- Current goals: [Active care plan goals]
- Recent events: [Hospitalizations, med changes, etc.]

Message should:
- Reference their specific situation (not generic)
- Ask about specific goals or concerns from last contact
- Offer support and resources
- Invite them to call with questions
- Be warm and personal

Tone: Caring, like we're checking in on family
Length: 3-4 sentences (suitable for phone script or message)
Do NOT include specific PHI that shouldn't be in a message.
```

**Verification:** Confirm patient context is accurate; personalize further based on your knowledge of the patient.

---

### Use Case 2: Care Gap Alert Communication

**Scenario:** Patient is overdue for important intervention.

**Prompt Template:**
```
Draft an outreach message for a patient with a care gap:

Care gap: [e.g., "No SGLT2 inhibitor despite being indicated" / "Labs overdue by 3 months" / "Transplant referral not completed"]

Patient context:
- CKD Stage: [X]
- Why this matters: [Why this care gap is important for them]

Message should:
- Explain why we're reaching out (in patient-friendly terms)
- Explain why this is important (without being scary)
- Provide a clear action step
- Offer to help schedule or arrange

Tone: Helpful, not scolding
Reading level: Simple and clear
```

**Verification:** Confirm the care gap is accurate; coordinate with clinical team if needed.

---

### Use Case 3: Post-Hospitalization TCM Outreach

**Scenario:** Patient discharged from hospital; need TCM follow-up.

**Prompt Template:**
```
Draft a post-hospitalization outreach script for TCM:

Hospitalization details:
- Discharge date: [Date]
- Reason for hospitalization: [General category - don't need full details]
- Key discharge instructions: [Relevant points]

Script should include:
1. Warm greeting and expression of concern
2. Verification of current status (home, feeling okay?)
3. Medication reconciliation questions
4. Follow-up appointment confirmation
5. Warning signs to watch for
6. Who to call with concerns
7. Offer of additional support

Tone: Supportive, caring, thorough
Format: Phone call script with checkboxes
```

**Verification:** Confirm discharge date and follow-up appointment details.

---

### Use Case 4: Monthly CCM Care Plan Review

**Scenario:** Time to update patient's care plan.

**Prompt Template:**
```
Draft a monthly CCM care plan update:

Patient:
- CKD Stage: [X]
- Primary issues: [Key problems being managed]
- Current care plan goals: [List active goals]

Progress this month:
- [List what was discussed, actions taken, patient status]

Update the care plan with:
1. Assessment of progress on each goal (met / making progress / barriers)
2. Any new goals to add
3. Barriers identified and plans to address
4. Next month's priorities
5. Time spent this month: [X minutes CCM]

Format: Structured care plan update suitable for documentation
```

**Verification:** Ensure all activities and times are accurately documented.

---

### Use Case 5: Complex Care Coordination Summary

**Scenario:** Patient sees multiple specialists; need to coordinate.

**Prompt Template:**
```
Create a care coordination summary for a complex patient:

Patient's care team:
- Nephrologist: [Name] - managing: [What]
- PCP: [Name] - managing: [What]
- Other specialists: [List with focus areas]

Current issues requiring coordination:
[List issues that span multiple providers]

Generate:
1. Summary of current care across all providers
2. Potential gaps or conflicts in care
3. Recommended coordination actions
4. Key information each provider should know
5. Suggested communication to send to [specific provider]

Purpose: Ensure everyone is on the same page
```

**Verification:** Confirm provider information is current; review for accuracy before sharing.

---

### Use Case 6: Patient Education by CKD Stage

**Scenario:** Patient newly diagnosed or progressed; needs education.

**Prompt Template:**
```
Create patient education materials for CKD Stage [X]:

Patient context:
- Newly diagnosed / progressed from Stage [Y]
- Primary etiology: [Diabetes / HTN / Other]
- Key concerns patient expressed: [If known]

Generate education covering:
1. What CKD Stage [X] means (simple explanation)
2. What they can do to protect their kidneys
3. Diet considerations for this stage
4. Medications that help (general categories)
5. Warning signs to watch for
6. When to call the doctor
7. Hopeful message - this is manageable!

Reading level: 8th grade
Tone: Empowering, not scary
Format: One-page handout with bullet points
```

**Verification:** Ensure recommendations are stage-appropriate; review with clinical team if uncertain.

---

### Use Case 7: Medication Adherence Support

**Scenario:** Patient struggling to take medications as prescribed.

**Prompt Template:**
```
Create an adherence support plan for a patient struggling with:

Medication issue:
- Specific challenge: [Forgetting doses / Cost / Side effects / Too many pills / Doesn't understand purpose]
- Medications affected: [Which ones]

Generate:
1. Acknowledgment of the challenge (empathetic)
2. Practical solutions for their specific barrier
3. Resources available (patient assistance programs, pill organizers, etc.)
4. Simple explanation of why these medications matter
5. Follow-up plan to check on adherence

Tone: Supportive, problem-solving
Format: Talking points for a coaching conversation
```

**Verification:** Confirm solutions are available and appropriate for this patient.

---

### Use Case 8: Goals Discussion Preparation

**Scenario:** Need to set or update goals with patient.

**Prompt Template:**
```
Prepare for a goal-setting conversation with a CCM patient:

Patient profile:
- CKD Stage: [X]
- Key health issues: [List]
- Previous goals: [If any]
- Patient's stated priorities: [If known]

Generate:
1. 3-5 SMART goal options appropriate for this patient
2. For each goal:
   - Why it matters for their kidney health
   - Concrete action steps
   - How to measure progress
   - Potential barriers and solutions
3. Conversation starters to explore what matters to THEM
4. How to make goals feel achievable, not overwhelming

Format: Preparation sheet for goal-setting meeting
```

**Verification:** Ensure goals are realistic and appropriate for patient's clinical status.

---

### Use Case 9: Care Transition Summary

**Scenario:** Patient transferring care or needing summary for another provider.

**Prompt Template:**
```
Create a care transition summary for:

Purpose: [New PCP / Specialist referral / Moving / Insurance change]

Include:
- Brief clinical summary (CKD stage, etiology, trajectory)
- Current medications (kidney-related)
- Recent labs with dates
- Active care plan and goals
- Upcoming appointments or pending items
- Key contacts at The Kidney Experts
- What the new provider should know

Format: Professional summary suitable for sharing with another practice
Length: 1-2 pages maximum
```

**Verification:** Confirm all clinical information is current and accurate.

---

### Use Case 10: Difficult Conversation Preparation

**Scenario:** Need to discuss sensitive topic (dialysis planning, prognosis, etc.).

**Prompt Template:**
```
Help me prepare for a difficult conversation:

Topic: [e.g., "Patient's kidney function is declining and we need to discuss dialysis options"]

Patient context:
- What they currently know: [Their understanding]
- Their concerns or fears: [If known]
- Cultural/family considerations: [If relevant]

Generate:
1. How to open the conversation compassionately
2. Key points to communicate (clear but gentle)
3. Responses to likely emotional reactions
4. Questions to ask to understand their perspective
5. Resources or next steps to offer
6. How to close with hope and support

Tone: Compassionate, honest, supportive
Purpose: Help patient feel heard and supported
```

**Verification:** Review with provider or supervisor for particularly sensitive conversations.

---

### Use Case 11: Weekly Outreach Prioritization

**Scenario:** Have a list of patients; need to prioritize who to call first.

**Prompt Template:**
```
Help me prioritize this week's CCM outreach:

Patients and status:
[List patients with brief notes: recent hospitalization, overdue for contact, new care gap, stable, etc.]

Prioritize based on:
1. Recent hospitalizations or ER visits (highest)
2. New or worsening care gaps
3. Overdue for CCM contact
4. Active issues needing follow-up
5. Routine check-ins (lower priority)

Generate:
- Prioritized list with rationale
- Key talking points for top 5 priority patients
- Suggested outreach method (call vs. message)

Format: Actionable call list for the week
```

**Verification:** Confirm patient status is current; add any context you know that AI doesn't.

---

### Use Case 12: CCM Time Documentation

**Scenario:** Need to document CCM time for billing.

**Prompt Template:**
```
Document CCM time for this patient encounter:

Activities performed:
- [List activities: phone call, care plan update, medication review, care coordination, etc.]

Generate documentation that:
1. Clearly describes non-face-to-face care management activities
2. Specifies time spent on each activity
3. Relates activities to chronic condition management
4. Meets CCM billing requirements
5. Total time: [X] minutes

Format: Ready-for-chart documentation
Ensure: Activities are CCM-appropriate (not face-to-face, chronic condition related)
```

**Verification:** Ensure time is accurate; activities meet CCM criteria.

---

## Prompt Templates Library

### Quick Outreach Prompts

#### Quick Check-In
```
Draft a brief, warm check-in message for a stable CKD Stage [X] patient. Ask about [specific goal from care plan].
```

#### Lab Reminder
```
Write a friendly reminder that [patient placeholder] is due for labs. Include why labs are important for kidney health.
```

#### Appointment Reminder with Prep
```
Draft an appointment reminder for [date] that includes what to bring and any pre-visit instructions: [fasting? bring med list?]
```

### Quick Care Plan Prompts

#### Goal Update
```
Document progress on this goal: [Goal]. Patient reports: [Update]. Write a brief progress note.
```

#### New Goal
```
Create a SMART goal for a CKD patient wanting to improve [diet / exercise / medication adherence / blood pressure control].
```

#### Barrier Documentation
```
Document this barrier to care: [Barrier]. Include patient's perspective and plan to address.
```

### Quick Education Prompts

#### Medication Purpose
```
Explain [medication] in simple terms for a patient. Why it's important for their kidneys, in 2 sentences.
```

#### Diet Tip
```
Give me one practical diet tip for a CKD Stage [X] patient who [specific situation - likes salty food, eats out often, etc.].
```

#### Warning Signs
```
List the warning signs a CKD patient should watch for and when to call the doctor. Keep it simple and non-scary.
```

---

## Care Gap Identification

### Common Care Gaps to Monitor

| Category | Gaps to Look For |
|----------|------------------|
| **Medications** | Missing SGLT2i, ACEi/ARB not at target, no ESA when indicated |
| **Labs** | Overdue CMP, overdue UACR, overdue PTH (CKD 4-5) |
| **Referrals** | Transplant referral not done, nephrology follow-up overdue |
| **Education** | Diet counseling not completed, CKD education not documented |
| **Preventive** | Vaccines overdue, depression screening not done |
| **Planning** | No advance directive discussion, no dialysis modality education |

### Using AI to Identify Gaps

```
Review this patient's care for potential gaps:

Patient info:
- CKD Stage: [X]
- Diabetes: [Yes/No]
- Current medications: [List]
- Recent labs: [Key values and dates]
- Referrals: [What's been done]

Identify:
1. Medication gaps (per KDIGO 2024)
2. Lab monitoring gaps
3. Referral or education gaps
4. Prevention gaps

For each gap, provide:
- What's missing
- Why it matters
- Suggested action
```

---

## Patient Outreach Excellence

### The Personalization Principle

Generic: "Hi, this is your monthly check-in call."

Personalized: "Hi Mrs. Johnson, I'm calling to see how you're doing with that potassium monitoring we talked about last month. How are those banana substitutes working out?"

**AI enables personalization at scale.**

### Outreach Cadence by Patient Type

| Patient Type | Outreach Frequency | Focus |
|--------------|-------------------|-------|
| Post-hospitalization (TCM) | Days 1, 3, 7, then weekly | Transition safety |
| New CCM enrollment | Weekly x4, then biweekly | Engagement, education |
| Stable CCM | Monthly minimum | Goals, adherence, gaps |
| Complex/high-risk | Biweekly or more | Tight monitoring |
| Care gap identified | Until resolved | Close the gap |

---

## Documentation for CCM/TCM

### CCM Documentation Requirements

| Element | Required? | AI Can Help |
|---------|-----------|-------------|
| Time spent | Yes | Estimate based on activities |
| Activities performed | Yes | List and describe |
| Chronic condition connection | Yes | Link activities to CKD management |
| Care plan review | Monthly | Draft updates |
| Patient consent | Annual | Reminder to document |

### AI-Assisted Documentation Workflow

1. **During contact:** Jot key points
2. **After contact:** AI drafts documentation from your notes
3. **Review:** Verify accuracy, time, activities
4. **Finalize:** Add to chart

---

## Workflow Integration

### Daily Workflow

```
Morning:
┌─────────────────────────────────────────────────────────────┐
│ 1. Review patient list for the day                          │
│ 2. Use AI to prioritize outreach                            │
│ 3. Prepare personalized talking points for top patients     │
│ 4. Check for new hospitalizations/TCM opportunities         │
└─────────────────────────────────────────────────────────────┘

Throughout Day:
┌─────────────────────────────────────────────────────────────┐
│ 1. Make outreach calls with AI-prepared scripts             │
│ 2. Document conversations (AI-assisted)                     │
│ 3. Update care plans as needed                              │
│ 4. Identify and document care gaps                          │
│ 5. Coordinate with clinical team on issues                  │
└─────────────────────────────────────────────────────────────┘

End of Day:
┌─────────────────────────────────────────────────────────────┐
│ 1. Complete all documentation (AI-drafted, you verify)      │
│ 2. Update patient tracking for next contact                 │
│ 3. Flag any urgent issues for clinical team                 │
│ 4. Prepare tomorrow's priority list                         │
└─────────────────────────────────────────────────────────────┘
```

### Time Savings Estimate

| Task | Without AI | With AI | Savings |
|------|------------|---------|---------|
| Call preparation | 5 min | 2 min | 3 min |
| CCM documentation | 10 min | 4 min | 6 min |
| Care plan drafting | 15 min | 5 min | 10 min |
| Patient education | 10 min | 3 min | 7 min |
| **Per patient total** | **40 min** | **14 min** | **26 min** |

*More patients reached with same effort.*

---

## Common Pitfalls & Solutions

### Pitfall 1: Generic Outreach

**Problem:** AI generates generic messages that don't feel personal.

**Solution:** Include patient-specific context in your prompt:
- Their specific goals
- What was discussed last time
- Their concerns or preferences
- Recent changes in their care

---

### Pitfall 2: Clinical Recommendations

**Problem:** AI suggests clinical interventions (medication changes, etc.).

**Solution:** Your role is coordination, not clinical decisions. Flag gaps for the provider; don't act on AI's clinical suggestions yourself.

---

### Pitfall 3: Inaccurate Patient Information

**Problem:** AI uses information you provided but it's outdated or wrong.

**Solution:** Always verify:
- Current medications (check chart)
- Recent labs (check dates)
- Care plan status (is it still active?)
- Recent events (hospitalizations, etc.)

---

### Pitfall 4: Over-Documenting

**Problem:** AI generates long documentation that takes forever to review.

**Solution:** Request concise output:
- "Keep it to 3-4 sentences"
- "Brief progress note, not comprehensive"
- "Summary format, not narrative"

---

### Pitfall 5: Losing the Personal Touch

**Problem:** Patients feel like they're getting automated messages.

**Solution:** AI prepares the framework; you add the personal connection. Remember their names, their situations, their families. AI can't care about patients—you can.

---

## Advancement Path

### Level 2 → Level 3 (Current Goal)

**Skills to develop:**
- [ ] Use AI for every outreach preparation
- [ ] Draft care plan updates with AI assistance
- [ ] Create personalized patient education
- [ ] Document CCM time efficiently with AI help
- [ ] Feel confident using AI daily

### Level 3 → Level 4 (Integrator)

**Skills to develop:**
- [ ] Develop custom prompts for CCM workflows
- [ ] Help train new care coordinators on AI
- [ ] Identify new AI use cases for care coordination
- [ ] Improve patient engagement metrics using AI
- [ ] Contribute to TKE's CCM best practices

---

## Quick Reference Card

### The 5 Rules (CCM Version)

1. **Be Specific** — Include patient context, goals, recent history
2. **Provide Context** — What do you know about this patient that AI doesn't?
3. **TKE Workspace Only** — PHI only in @thekidneyexperts.com Gemini
4. **Verify Everything** — Check medications, labs, dates, facts
5. **Iterate & Refine** — "Make it warmer," "Add their specific goal"

### AI Is Great For (CCM)

✅ Drafting personalized outreach messages
✅ Preparing for patient conversations
✅ Creating patient education materials
✅ Documenting CCM encounters
✅ Identifying care gaps
✅ Prioritizing patient lists
✅ Drafting care plans and goals

### AI Is NOT For (CCM)

❌ Making clinical decisions
❌ Replacing your relationship with patients
❌ Final documentation without review
❌ Sensitive communications without preparation
❌ Anything requiring clinical judgment

### Your Superpower

AI helps you prepare better and document faster. But YOUR superpower is:
- Knowing your patients as people
- Building trust over time
- Hearing what they're really saying
- Connecting them to the care they need
- Being the consistent, caring presence in their healthcare journey

**AI handles the busywork. You handle the care.**

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
**Target Role:** Care Coordinators (CCM/TCM Staff)  
**Target Level:** 3-4 (Practitioner to Integrator)
