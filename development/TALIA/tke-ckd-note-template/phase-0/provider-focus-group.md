# Phase 0: Provider Focus Group - Agenda & Materials

## Version: 1.0
## Date: 2026-02-02
## Facilitator: Shree Mulay, MD
## Reference: openspec/master-plan.md (Part 3, Part 4)

---

## 1. Purpose

Validate the 37-section / 9-domain CKD note template structure with 2-3 providers before building any technology. Confirm nothing is missing, nothing is unnecessary, and the clinical ordering is intuitive.

**Goal**: After this session, the section list is locked. Changes require a formal OpenSpec proposal.

---

## 2. Logistics

| Item | Detail |
|------|--------|
| Duration | 60-90 minutes |
| Participants | 2-3 nephrologists or advanced practice providers |
| Location | TKE conference room or video call |
| Materials | Printed handouts (see Section 4), whiteboard/markers, timer |
| Recording | Audio record for reference (with consent) |
| Output | Annotated section list with provider feedback, decision log |

---

## 3. Agenda

| Time | Activity | Duration |
|------|----------|----------|
| 0:00 | Welcome & context setting | 5 min |
| 0:05 | Walk through the 9-domain structure (high level) | 10 min |
| 0:15 | Domain-by-domain deep review (see Section 5) | 40-50 min |
| 0:55 | Card format & size discussion | 10 min |
| 1:05 | View mode review (Initial vs Follow-up Delta) | 5 min |
| 1:10 | Open discussion: what's missing? what's unnecessary? | 10 min |
| 1:20 | Summary & next steps | 5 min |

---

## 4. Printed Handouts

Prepare the following for each participant:

### Handout 1: Domain Overview (1 page)

Print the table below on a single page. This is the high-level map.

| Domain | Sections | Description |
|--------|----------|-------------|
| **0. Header & Visit Context** | 0 | Patient ID, visit type, CKD stage, GDMT compliance summary |
| **1. Kidney Core** | 1-4 | eGFR/UACR/KFRE, hematuria, stones, GU history |
| **2. Cardiovascular-Renal** | 5-7 | BP/fluid/Daxor, heart failure/Furoscix, lipids/PCSK9i |
| **3. 4 Pillars (GDMT)** | 8-11 | RAAS, SGLT2i, MRA/Finerenone, GLP-1 RA |
| **4. Metabolic** | 12-14 | Diabetes/Eversense, gout/Krystexxa, obesity |
| **5. CKD Complications** | 15-17 | Anemia, mineral bone disease, electrolytes/acid-base |
| **6. Risk Mitigation** | 18-23 | Tobacco, NSAIDs, PPIs, sick day rules, contrast, sodium |
| **7. Planning & Transitions** | 24-27 | Transplant, dialysis/vein preservation, ACP, CCM |
| **8. Screening & Prevention** | 28-34 | Immunizations, depression/PHQ, fall risk, sleep apnea, SDOH, physical performance, nutrition |
| **9. Care Coordination** | 35-37 | Medication adherence, special clinics, PCP/follow-up |

### Handout 2: Section Quick Reference (2 pages)

Print the full Section Quick Reference table from master-plan.md Part 3 (lines 157-196). This lists all 37 sections with domain, card codes, visit mode (always/conditional), and assigned AI agent.

### Handout 3: Top 10 Section Detail Sheets (5-10 pages)

For the 10 most-used sections, print the complete field list from master-plan.md Part 4. Suggested top 10:

1. **Section 0**: Header & Visit Context
2. **Section 1**: Kidney Function & Progression
3. **Section 5**: Blood Pressure & Fluid
4. **Section 8**: RAAS Inhibition
5. **Section 9**: SGLT2 Inhibitor
6. **Section 10**: MRA (Finerenone)
7. **Section 11**: GLP-1 Receptor Agonist
8. **Section 15**: Anemia / Blood Health
9. **Section 17**: Electrolytes & Acid-Base
10. **Section 33**: Physical Performance & Frailty

Each sheet should show: Section name, domain, card codes, all fields with type/unit/source/target.

### Handout 4: Sample Note Output (1 page)

Create a mock follow-up note for a fictional patient using the new structure. This gives providers a concrete feel for what the final note looks like. Include:

- Dashboard summary (5 lines)
- 3-4 active sections with AI interpretation text
- 2-3 stable sections collapsed to 1-line summaries
- Action items at bottom

---

## 5. Domain-by-Domain Review Guide

For EACH domain, ask these questions. Allocate ~5 minutes per domain.

### Questions Per Domain

1. **Coverage**: "Looking at the sections in this domain, is anything missing that you document regularly?"
2. **Relevance**: "Is any section here unnecessary or rarely used in your CKD practice?"
3. **Ordering**: "Does the ordering within this domain match your clinical thinking flow?"
4. **Fields**: (For top 10 sections only) "Looking at the field list, are the data points correct? Any fields missing? Any fields you would never use?"
5. **Conditional logic**: "Does the trigger condition for conditional sections make sense? Too early? Too late?"

### Domain-Specific Probes

| Domain | Specific Probes |
|--------|----------------|
| **0. Header** | Is GDMT compliance X/4 at the top useful? Should albuminuria stage be here? |
| **1. Kidney Core** | Is KFRE calculation helpful? Should biopsy status be more prominent? Is GU history needed for every patient? |
| **2. CV-Renal** | Is Daxor (blood volume) a sub-field of BP or its own section? Should lipid management be here vs. deferred to PCP? |
| **3. 4 Pillars** | Is GLP-1 RA deserving of standalone pillar status? Should we track adherence barriers per pillar? |
| **4. Metabolic** | Is gout important enough for its own section? Should Krystexxa tracking be here? |
| **5. Complications** | Are 3 sections enough? Should we split electrolytes from acid-base? |
| **6. Risk Mitigation** | Are 6 risk sections too many? Should sodium be here or in nutrition? |
| **7. Planning** | When should transplant/dialysis sections activate? Is ACP needed before G4? |
| **8. Screening** | Is physical performance screening realistic for every visit? Is SDOH annual frequency right? |
| **9. Care Coordination** | Is medication adherence better here or embedded in each pillar section? |

---

## 6. Card Format & Size Discussion

Show providers sample card mockups (if available from `tke-provider-workload-offload/cards/`) and ask:

| Question | Options to Discuss |
|----------|-------------------|
| Preferred card size? | Half-letter (5.5"x8.5"), Quarter-letter (4.25"x5.5"), Full letter (8.5"x11"), Index card (4"x6") |
| One card per section or combined? | 1:1 mapping vs. domain-level combined cards |
| Color coding helpful? | Domain colors from master-plan vs. monochrome |
| Who hands card to patient? | MA during vitals, provider during visit, checkout staff |
| Do patients keep the card? | Yes (take home) vs. No (return after marking) vs. Both (patient copy + chart copy) |
| OCR checkbox design? | Filled circles, checkmarks, bubble sheets |

---

## 7. View Mode Discussion

Briefly explain the two view modes and get feedback:

**Initial Visit Mode**: All sections expanded, full data entry, no prior comparison.

**Follow-up Delta Mode**: Stable sections collapsed ("Unchanged from 3/15/2026"), changed sections highlighted with old->new values, provider only touches exceptions.

**Questions**:
1. Does Delta Mode match how you think about follow-up visits?
2. Would you trust a section marked "unchanged" without expanding it?
3. How often do you change something in a "stable" section? (Rough percentage)
4. Would you want a "quick review" mode that shows all values but read-only unless clicked?

---

## 8. Feedback Capture Template

Use this template during the session to capture feedback per domain.

```
DOMAIN: [name]
Sections Reviewed: [list]

MISSING:
- [ ] _________________________________

UNNECESSARY:
- [ ] _________________________________

REORDER:
- [ ] Move _______ before/after _______

FIELD CHANGES:
- [ ] Add field: _______________________
- [ ] Remove field: ____________________
- [ ] Change type: _____________________

COMMENTS:
_______________________________________
_______________________________________
```

---

## 9. Post-Session Actions

| Action | Owner | Deadline |
|--------|-------|----------|
| Transcribe all feedback into decision log | Facilitator | Within 2 days |
| Update section list if changes needed | Facilitator | Within 3 days |
| Update master-plan.md with any approved changes | Facilitator | Within 3 days |
| If section list changes, re-validate with participants | Facilitator | Within 1 week |
| Lock section list (no changes without OpenSpec proposal) | All | After final approval |
| File Beads issues for any new work items discovered | Facilitator | Same day |

---

## 10. Success Criteria for This Focus Group

- [ ] 2+ providers attended and participated
- [ ] All 9 domains reviewed with feedback captured
- [ ] Top 10 section field lists validated (or changes documented)
- [ ] Card format preference recorded
- [ ] View mode concept validated
- [ ] Section list locked OR specific changes identified with timeline
- [ ] Decision log updated in governance.md (Section 7)
