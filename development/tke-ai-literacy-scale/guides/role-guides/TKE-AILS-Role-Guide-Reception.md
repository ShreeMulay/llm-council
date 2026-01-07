# TKE-AILS Role Guide: Front Desk & Reception

## AI Literacy for First Impressions

> **Target Level: 2 (Explorer)**
> 
> *"AI helps you answer questions faster so you can focus on welcoming every patient warmly."*

---

## Table of Contents

1. [Your Role in the AI-Powered Practice](#your-role-in-the-ai-powered-practice)
2. [Core AI Competencies for Reception](#core-ai-competencies-for-reception)
3. [Top 8 AI Use Cases](#top-8-ai-use-cases)
4. [Prompt Templates Library](#prompt-templates-library)
5. [Workflow Integration](#workflow-integration)
6. [PHI Safety (Critical for Your Role)](#phi-safety-critical-for-your-role)
7. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
8. [Advancement Path](#advancement-path)
9. [Quick Reference Card](#quick-reference-card)

---

## Your Role in the AI-Powered Practice

### The Front Desk Mission

You are the **first and last impression** of The Kidney Experts. When patients walk in, your smile and warmth set the tone. When they leave, your care makes them feel valued.

With AI, your role evolves from **overwhelmed multitasker** to **Patient Welcome Specialist**:

| Traditional Front Desk | AI-Augmented Front Desk |
|-----------------------|------------------------|
| Look up answers to every question | AI provides quick, accurate info |
| Write directions from scratch | AI generates customized directions |
| Handle complaints without support | AI helps craft thoughtful responses |
| Juggle calls while patients wait | AI assists with routine inquiries |
| Feel stuck on difficult questions | AI helps you find answers quickly |

### Why Level 2 is Your Target

At Level 2 (Explorer), you:
- Can use AI for basic tasks (directions, scripts, information)
- Understand when AI can help and when you need a person
- Know how to verify AI answers
- Feel comfortable experimenting with AI

**You don't need to be an AI expert.** You just need to know when AI can make your job easier—so you have more energy for what really matters: making patients feel welcomed.

---

## Core AI Competencies for Reception

### 1. Information Lookup

**Use AI to quickly find:**
- Directions to the office (for specific locations)
- What to bring to first appointment
- General office information
- FAQs about nephrology visits

### 2. Communication Assistance

**Use AI to help with:**
- Drafting polite responses to tricky situations
- Creating scripts for common phone calls
- Writing clear appointment reminders
- Handling complaints with professionalism

### 3. Patient Comfort

**Use AI to prepare:**
- Welcome information for new patients
- Office policies in friendly language
- What to expect at a nephrology visit
- Parking and accessibility information

---

## Top 8 AI Use Cases

### Use Case 1: Directions to the Office

**Scenario:** Patient calls asking how to get to [Jackson/Dyersburg/Paris/Union City] office.

**Prompt Template:**
```
Write simple driving directions to The Kidney Experts [location] office:

Address: [Full address]
Coming from: [Direction - north on I-40 / from downtown / etc.]

Include:
- Major roads and turns
- Landmarks to look for
- Where to park
- Which entrance to use
- What to do when they arrive

Tone: Friendly and clear
Length: Brief enough to read over the phone
```

**Verification:** Confirm the address and parking info are correct for that location.

---

### Use Case 2: First Appointment Information

**Scenario:** New patient asks what to bring and expect.

**Prompt Template:**
```
Write a friendly guide for a new patient's first nephrology appointment at The Kidney Experts:

Include:
- What to bring (ID, insurance card, medication list, referral if needed)
- How early to arrive (15 minutes)
- What to expect during the visit
- How long the visit typically takes
- Parking information

Tone: Warm and welcoming - we're "The Kidney Experts" and we treat patients like family
Reading level: Simple and clear
Format: Bulleted list they can write down
```

**Verification:** Confirm the specific details match your location's policies.

---

### Use Case 3: Appointment Reminder Script

**Scenario:** Need to call patients to confirm appointments.

**Prompt Template:**
```
Write a phone script for confirming a patient's nephrology appointment:

Include:
- Friendly greeting
- Confirm appointment date, time, and location
- Reminder of what to bring
- Fasting instructions if applicable: [Yes/No]
- Ask if they have questions
- Thank them

Tone: Warm but efficient
Length: 30-60 seconds when spoken
Do NOT include any patient health information in the script - keep it general.
```

**Verification:** Confirm fasting requirements match the appointment type.

---

### Use Case 4: Handling a Frustrated Patient

**Scenario:** Patient is upset (long wait, billing issue, etc.) and you need help responding.

**Prompt Template:**
```
A patient is frustrated because [describe situation briefly - e.g., "they waited 45 minutes past their appointment time"].

Help me respond in a way that:
- Acknowledges their frustration
- Apologizes sincerely
- Explains what we can do (without making promises I can't keep)
- Offers a solution or next step
- Maintains our professional, caring tone

Keep it brief - something I can say in person or on the phone.
Do NOT reference any patient health information.
```

**Verification:** Make sure any promises or offers are things you're actually authorized to provide.

---

### Use Case 5: Office Policies Explanation

**Scenario:** Patient asks about a policy (cancellation, insurance, referrals, etc.).

**Prompt Template:**
```
Explain this office policy in patient-friendly language:

Policy: [e.g., "We require 24 hours notice for appointment cancellations or a $25 fee may apply"]

Write an explanation that:
- Is polite and non-accusatory
- Explains the reason behind the policy
- Tells them what they need to do
- Offers to answer questions

Tone: Understanding, not scolding
Length: 2-3 sentences
```

**Verification:** Make sure the policy details are accurate per TKE guidelines.

---

### Use Case 6: What to Expect at a Nephrology Visit

**Scenario:** Patient (or family member) asks what happens at a kidney doctor visit.

**Prompt Template:**
```
Explain what happens at a nephrology appointment for a patient who has never seen a kidney doctor:

Include:
- The MA will take vitals and ask questions
- The provider will discuss their kidney health
- They may need blood or urine tests
- The visit usually takes [30-60 minutes]
- They'll get a summary of the visit and next steps

Tone: Reassuring, not scary
Language: Simple, avoid medical jargon
Purpose: Help them feel prepared, not anxious
```

**Verification:** Confirm typical visit length for your location.

---

### Use Case 7: Phone Message Template

**Scenario:** Need to leave a voicemail for a patient.

**Prompt Template:**
```
Write a professional voicemail script for [purpose]:

Purpose: [Appointment reminder / Call back request / Insurance question / etc.]
Patient name: [Do NOT include in final script - use "[Patient Name]" placeholder]
Callback number: [Office number]

Requirements:
- Brief (30 seconds or less)
- Professional and warm
- Clear action item
- Repeat callback number twice
- Do NOT leave any medical information in the message

Format: Ready-to-read script
```

**Verification:** Ensure no PHI is included in voicemails (HIPAA requirement).

---

### Use Case 8: Welcome Email/Letter for New Patients

**Scenario:** Need to send welcome information to a new patient.

**Prompt Template:**
```
Write a welcome letter for a new patient scheduled at The Kidney Experts:

Include:
- Welcome and thank you for choosing us
- Appointment date, time, location: [Details]
- What to bring
- How early to arrive
- Our commitment to their care
- Contact information for questions

Tone: Warm, professional, "Treated like family"
Length: One page or less
Do NOT include any health information.

Sign as: The Kidney Experts, PLLC
Include our tagline: "Ridding the World of the Need for Dialysis!"
```

**Verification:** Confirm appointment details are correct before sending.

---

## Prompt Templates Library

### Quick Prompts for Common Situations

#### Directions Quick Request
```
Give me brief directions to [TKE location address] from [landmark or highway].
```

#### Polite Response Helper
```
How do I politely tell a patient that [situation - e.g., "the doctor is running behind" / "we need their insurance card" / "they'll need to reschedule"]?
```

#### Hold Script
```
Write a brief, polite script for putting a caller on hold. Keep it under 15 seconds.
```

#### Callback Script
```
Write a callback request script: We need [patient name placeholder] to call us back at [number] regarding [non-medical reason].
```

#### FAQ Answer
```
A patient asked: [question]. Give me a simple, friendly answer I can say over the phone.
```

---

## Workflow Integration

### When AI Helps

| Situation | Use AI For |
|-----------|-----------|
| Giving directions | Generate custom directions |
| First-time patient questions | New patient info guide |
| Appointment reminders | Reminder scripts |
| Upset patient | Response suggestions |
| Policy explanations | Patient-friendly wording |
| Voicemails | Professional message scripts |

### When You Need a Person

| Situation | Who to Ask |
|-----------|-----------|
| Medical questions | MA or clinical staff |
| Billing specifics | Billing department |
| Appointment changes | Scheduling / yourself |
| Complaints needing resolution | Supervisor |
| Anything with PHI | Clinical staff |

---

## PHI Safety (Critical for Your Role)

### VERY IMPORTANT

As front desk, you handle patient names, appointments, and contact info. Here's what you need to know about AI and PHI:

### What is PHI?

Protected Health Information includes:
- Patient names + health info together
- Medical record numbers
- Appointment reasons related to health
- Insurance information
- Any health condition or diagnosis

### Safe AI Use (Yes, You Can)

✅ **General questions without patient info:**
- "How do I explain our cancellation policy?"
- "Give me directions to our Jackson office"
- "What should a new patient bring?"

✅ **Templates with placeholders:**
- "Write a voicemail script with [Patient Name] as a placeholder"

### NOT Safe (Don't Do This on Personal AI)

❌ **Never on personal ChatGPT/Claude:**
- "John Smith called about his dialysis appointment..."
- "A patient with diabetes is asking..."
- Any patient name + health info

### The TKE Workspace Exception

In your **@thekidneyexperts.com Google Workspace with Gemini**, you CAN use patient information because we have a BAA with Google. But for front desk tasks, you probably don't need to—most of your AI needs are general.

---

## Common Pitfalls & Solutions

### Pitfall 1: Using AI for Medical Advice

**Problem:** Patient asks a health question; you ask AI for the answer.

**Solution:** NEVER use AI for medical questions. Say: "That's a great question for your provider. Let me make sure they address that at your visit."

**Rule:** Health questions → clinical staff, always.

---

### Pitfall 2: Robotic Responses

**Problem:** You read AI output verbatim and sound like a robot.

**Solution:** Use AI for ideas and phrasing, then say it in YOUR voice. AI gives you the words; you add the warmth.

---

### Pitfall 3: Wrong Information

**Problem:** AI gives directions or policies that aren't quite right.

**Solution:** Always verify:
- Addresses and parking → double-check
- Policies → confirm with supervisor if unsure
- Appointment times → check the schedule

---

### Pitfall 4: Over-Relying on AI

**Problem:** Trying to use AI for everything, even simple things.

**Solution:** AI is helpful for:
- Things you'd normally have to write or look up
- Difficult phrasing or professional language
- Templates you use repeatedly

You don't need AI for:
- Saying "hello" or "thank you"
- Basic scheduling in the system
- Simple questions you already know

---

### Pitfall 5: Using Personal AI with Patient Info

**Problem:** Using personal ChatGPT and including patient details.

**Solution:** For front desk tasks, you almost never need patient info in AI. Use general prompts:
- "Write an appointment reminder script" ✅
- "Write a reminder for John Smith's dialysis" ❌ (on personal AI)

---

## Advancement Path

### Level 1 → Level 2 (Current Goal)

**Skills to develop:**
- [ ] Use AI for directions and first-appointment info
- [ ] Create scripts for common phone calls
- [ ] Know when AI can help vs. when to ask a person
- [ ] Verify AI answers before using them
- [ ] Feel comfortable experimenting with AI

### Level 2 → Level 3 (Optional Growth)

**If you want to grow further:**
- [ ] Create reusable templates for your common tasks
- [ ] Help train new front desk staff on AI basics
- [ ] Suggest new ways AI could help the front desk
- [ ] Reduce time on routine tasks, increase time with patients

---

## Quick Reference Card

### The 5 Rules (Front Desk Version)

1. **Be Specific** — Tell AI exactly what you need (directions to which office, what kind of script)
2. **Provide Context** — The more details, the better the answer
3. **TKE Workspace Only** — For general front desk tasks, you rarely need patient info anyway
4. **Verify Everything** — Check addresses, policies, and details before sharing
5. **Iterate & Refine** — "Make it shorter," "Make it friendlier"

### When to Use AI

✅ Directions and office info
✅ New patient preparation guides
✅ Phone scripts and reminders
✅ Polite ways to handle tricky situations
✅ Explaining policies clearly
✅ Voicemail and email templates

### When NOT to Use AI

❌ Medical or health questions
❌ Billing specifics (ask billing team)
❌ Anything requiring clinical judgment
❌ Situations needing immediate supervisor help
❌ Personal accounts with patient info

### Your Superpower

AI can help you find words and information quickly. But YOUR superpower is:
- The smile when patients walk in
- The patience when they're frustrated
- The warmth that makes them feel like family
- The calm that helps anxious patients relax

**AI handles the routine. You handle the human.**

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
**Target Role:** Front Desk & Reception Staff  
**Target Level:** 2 (Explorer)
