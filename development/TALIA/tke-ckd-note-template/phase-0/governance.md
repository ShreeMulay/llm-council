# Phase 0: Governance, Success Metrics & Note Output Contract

## Version: 1.0
## Date: 2026-02-02
## Owner: Shree Mulay, MD
## Reference: openspec/master-plan.md (Part 1, Part 10)

---

## 1. Purpose

This document defines how we measure success for the AI-Era CKD Note Template rebuild, what the note output must always contain, and who must approve each phase before moving forward. It is the governance backbone for the entire project.

---

## 2. Success Metrics

### 2.1 Primary Metrics (Must Hit)

| Metric | Current Baseline | Phase 2 Target | Phase 5+ Target | Measurement Method |
|--------|-----------------|----------------|-----------------|-------------------|
| Follow-up note completion time | 5-10 min | <4 min | <2 min | Stopwatch during pilot visits |
| Initial note completion time | 15-20 min | <10 min | <5 min | Stopwatch during pilot visits |
| Manual data entry fields per visit | ~25 `***` fields | <15 | <5 (exception-only) | Count of provider-typed fields |
| Structured data extraction rate | 0% | 80% of discrete fields | 100% of discrete fields | Schema coverage audit |
| GDMT compliance auto-calculation | Manual review | Auto from 4 Pillars sections | Auto + trend over time | Automated per-visit check |
| Report card / note alignment | Partial | 1:1 section mapping | 1:1 with delta tracking | Cross-reference audit |

### 2.2 Secondary Metrics (Track, Improve Over Time)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Provider satisfaction (NPS) | >= 8/10 | Survey after 1 month of use |
| MA screening compliance (Tier 1) | >= 90% of visits | Chart audit: grip + STS documented |
| Quality metric extraction time | <5 min per 100 patients | Query against structured data |
| Care gap detection accuracy | >= 95% | AI flagged vs. manual chart review |
| Patient summary readability | Flesch-Kincaid 6th grade | Automated readability score |
| Note deficiency rate (billing) | <2% | Billing team audit |
| Section registry coverage | 37/37 sections | Schema validation test |

### 2.3 Anti-Metrics (Things We Do NOT Optimize For)

| Anti-Metric | Why We Avoid It |
|-------------|----------------|
| Note length | Longer is not better. We optimize for completeness + brevity. |
| Number of AI agents | More agents is not better. We optimize for accuracy per agent. |
| Click count | Some clicks are clinically necessary. We optimize for cognitive load, not raw clicks. |

---

## 3. Note Output Contract

Every completed encounter MUST produce three outputs from the same underlying data model.

### 3.1 Output 1: Provider Note (Epic)

**Purpose**: Legal, billing, and clinical documentation.

**Required Sections (Every Note)**:
- Header & Visit Context (Section 0) -- always
- Kidney Function & Progression (Section 1) -- always
- Blood Pressure & Fluid (Section 5) -- always
- 4 Pillars Summary (Sections 8-11) -- always, with GDMT compliance line
- Assessment & Plan -- synthesized from all active sections

**Conditional Sections**: Appear only when triggered by patient condition (see Section Quick Reference in master-plan.md Part 3).

**Length Budgets**:

| Visit Type | Target Length | Maximum Length |
|------------|--------------|----------------|
| Follow-up (stable) | 0.75 - 1.0 pages | 1.5 pages |
| Follow-up (complex) | 1.0 - 1.5 pages | 2.0 pages |
| Initial visit | 1.5 - 2.0 pages | 3.0 pages |
| Dashboard summary (top of note) | 5-8 lines | 10 lines |

**Format Rules**:
- Dashboard summary at top: CKD stage, eGFR trend, UACR trend, GDMT X/4, key alerts
- Each active section: 2-4 sentences of AI interpretation + discrete values inline
- Stable sections in Delta Mode: "Unchanged from [date]" or 1-line summary
- Action items: bulleted list at end of each domain group
- No orphan sections (if a section has no data and no AI interpretation, omit it)

**Billing Alignment**:
- E/M level support: note must capture complexity elements (number of diagnoses, data reviewed, risk of complications)
- CCM documentation: time tracking, care plan updates, care coordination notes
- Chronic care complexity: document all active conditions, medications reviewed, labs interpreted

### 3.2 Output 2: Patient-Facing Summary

**Purpose**: Take-home document the patient keeps. Plain language.

**Required Elements**:
- Patient name, visit date, provider name
- "Your Kidney Health Snapshot": CKD stage in plain language, eGFR number, trend arrow
- "Your Medications": list with purpose of each (1-line per med)
- "What We're Watching": top 3 priorities this visit
- "What You Can Do": 3-5 actionable items (diet, exercise, medication adherence)
- "Your Next Visit": date, labs to complete before, referrals pending
- TKE contact info and nurse line number

**Format Rules**:
- Flesch-Kincaid reading level: 6th grade or below
- Maximum 1 page (front only, or front+back if needed)
- Large font (14pt minimum body text)
- No medical jargon without parenthetical explanation
- Visual: kidney stage diagram (G1-G5 with "you are here" marker)

### 3.3 Output 3: Care Team Task List

**Purpose**: Actionable items for MAs, care coordinators, CCM nurses, and referral staff.

**Required Elements**:
- Labs due before next visit (with order codes if available)
- Referrals to place (specialist, imaging, procedures)
- Prior authorizations needed (medications, procedures)
- Patient education modules to deliver (card codes)
- CCM care plan updates
- Follow-up scheduling instructions (interval, visit type)
- Flagged care gaps (e.g., missing immunizations, overdue screenings)

**Format Rules**:
- Grouped by role: MA tasks, Care Coordinator tasks, Billing tasks
- Each task: checkbox + description + deadline + responsible party
- Exportable as structured data (JSON) for integration with task management systems

---

## 4. View Modes

### 4.1 Initial Visit Mode
- All 37 sections visible (conditional sections shown if applicable based on intake data)
- Full field entry for each section
- AI pre-populates from available data (labs, med list, referral reason)
- No delta comparison (no prior visit to compare)

### 4.2 Follow-Up Delta Mode
- Dashboard summary at top with trend arrows
- Stable sections collapsed: "Unchanged from [prior date]" -- one click to expand
- Changed sections highlighted: show delta (old value -> new value)
- New concerns expanded automatically
- Only exception-based data entry (provider only touches what changed)

---

## 5. Stakeholder Sign-Off Matrix

Each phase requires explicit approval before proceeding to the next.

### 5.1 Roles

| Role | Person(s) | Responsibility |
|------|-----------|---------------|
| Clinical Lead | Dr. Shree Mulay | Final approval on all clinical content, section design, AI output quality |
| Provider Reviewers | 1-2 additional providers (TBD) | Review section list, test paper prototypes, validate AI interpretations |
| MA Lead | [TBD] | Validate MA workflow (Tier 1 screening, vitals intake, card distribution) |
| Care Coordinator | [TBD] | Validate care team task list, CCM documentation, referral workflows |
| Billing/Compliance | [TBD] | Validate note supports E/M coding, CCM billing, audit requirements |
| IT/Epic Analyst | [TBD] | Validate SmartPhrase build, SmartList creation, sandbox testing |

### 5.2 Phase Approval Requirements

| Phase | Required Approvals | Approval Method |
|-------|-------------------|-----------------|
| Phase 0 (this) | Clinical Lead | This document signed off |
| Phase 1 (Schema) | Clinical Lead | Schema review + test pass |
| Phase 1.5 (Paper) | Clinical Lead + 1 Provider + MA Lead | Mock visit debrief |
| Phase 2 (Digital) | Clinical Lead + 1 Provider | Live pilot with 5 patients |
| Phase 3 (Epic) | Clinical Lead + IT/Epic | Sandbox testing pass |
| Phase 4 (AI Agents) | Clinical Lead | Accuracy audit (50+ test cases per agent) |
| Phase 5 (Pre-Visit) | Clinical Lead + Care Coordinator | Pre-pop accuracy >= 80% on 20 charts |
| Phase 6 (Cards) | Clinical Lead + MA Lead | Print test + mock distribution |
| Phase 7 (Scribe) | Clinical Lead | Blind comparison: scribe vs manual entry |
| Phase 8+ | Clinical Lead | Per-agent accuracy threshold |

---

## 6. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Provider resistance to new workflow | High | Medium | Early focus group involvement, incremental rollout |
| AI hallucination in clinical interpretation | Critical | Low-Medium | Human-in-the-loop always; never auto-sign notes |
| Epic SmartPhrase limitations | Medium | Medium | Build outside Epic first, paste in; future FHIR |
| MA screening adds visit time | Medium | Medium | Target <2 min; pilot and measure before mandating |
| Scope creep (too many sections) | Medium | High | 37 sections locked after Phase 0 approval; changes require formal proposal |
| Data model changes after Phase 2 | High | Low | Schema versioning; backward-compatible changes only |
| Billing audit finds documentation gaps | High | Low | Billing review at Phase 0 and Phase 3 gates |

---

## 7. Decision Log

Track key decisions made during Phase 0 and beyond.

| # | Date | Decision | Rationale | Decided By |
|---|------|----------|-----------|------------|
| 1 | 2026-02-01 | 9-domain clinical grouping (Option B) | Council consensus; matches clinical reasoning flow | Dr. Mulay + LLM Council |
| 2 | 2026-02-01 | GLP-1 RA elevated to 4th Pillar | Semaglutide FLOW trial evidence; standalone tracking needed | Dr. Mulay |
| 3 | 2026-02-01 | Triple Whammy as AI alert, not section | Cross-cutting concern; fires when RAAS+diuretic+NSAID detected | LLM Council (unanimous) |
| 4 | 2026-02-01 | Delta Mode for follow-ups | Reduces cognitive load; exception-based workflow | GPT-5.2 proposal, adopted |
| 5 | 2026-02-01 | 6-10 agents initial, expand later | Start simple, prove value, then specialize | GPT-5.2 proposal, adopted |
| 6 | 2026-02-01 | Nutrition added as Section 34 | Council identified gap in dietary assessment | LLM Council |
| 7 | 2026-02-01 | Medication Adherence added as Section 35 | Barriers tracking crucial for CKD management | LLM Council |
| 8 | 2026-02-02 | Physical Performance (Section 33) with Tier 1 MA screening | EWGSOP2 evidence for grip strength + CV mortality | Dr. Mulay |

---

## 8. Approval

### Phase 0 Governance Document

- [ ] **Clinical Lead (Dr. Shree Mulay)**: I approve this governance framework, success metrics, and note output contract as the foundation for the AI-Era CKD Note Template rebuild.

**Date**: _______________

**Signature**: _______________

---

## Appendix: Metric Collection Schedule

| Metric | When Collected | By Whom | Tool |
|--------|---------------|---------|------|
| Note completion time | Each pilot visit | Provider (self-report) or observer | Stopwatch / timestamp delta |
| Manual field count | Weekly during pilot | Project lead | Manual count from note |
| Structured data rate | Per phase release | Project lead | Schema coverage script |
| GDMT compliance | Every visit (auto) | System | Calculated from Sections 8-11 |
| Provider NPS | Monthly during pilot | Survey | Google Form or similar |
| MA screening compliance | Weekly chart audit | MA Lead or delegate | Epic flowsheet query |
| Billing deficiency rate | Monthly | Billing team | Audit sample (20 notes) |
| Patient summary readability | Per template change | Project lead | Flesch-Kincaid calculator |
