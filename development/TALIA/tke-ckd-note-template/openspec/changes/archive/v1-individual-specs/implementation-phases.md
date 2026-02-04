# Implementation Phases

## Status: APPROVED
## Version: 1.0

---

## Phase 0: Governance & Success Metrics

**Duration**: 1-2 weeks
**Dependencies**: None (this phase)

### Deliverables
- [ ] Define success metrics (note time, completion rate, GDMT adherence, provider satisfaction)
- [ ] Define note output contract (what must always appear, length budgets)
- [ ] Provider focus group (2-3 providers review section list)
- [ ] Stakeholder alignment (providers, MAs, billing, IT)
- [ ] Start Tier 1 physical performance screening (grip + STS at every visit by MA - costs nothing)

### Success Criteria
- Written success metrics document
- 2+ providers have reviewed and approved the 37-section domain structure
- MA workflow for Tier 1 screening piloted

---

## Phase 1: Section Registry JSON Schema

**Duration**: 1-2 weeks
**Dependencies**: Phase 0 approval

### Deliverables
- [ ] `schemas/section-registry.json` - complete JSON schema for all 37 sections
- [ ] `schemas/field-types.json` - enum definitions, validation rules
- [ ] `schemas/agent-config.json` - agent assignments and prompt templates
- [ ] Unit tests validating schema completeness and consistency
- [ ] Migration mapping: every legacy SmartList ID → new field_id

### Success Criteria
- Schema passes validation
- Every field from current smart phrase has a mapping
- Every card maps to at least one section

---

## Phase 1.5: Paper Prototype

**Duration**: 1-2 weeks (overlaps with Phase 1)
**Dependencies**: Section list approved (Phase 0)

### Deliverables
- [ ] Print draft cards (paper mockups) for 5-10 highest-priority cards
- [ ] Conduct 3-5 mock patient visits with providers using paper cards
- [ ] Document feedback: what works, what's missing, what's overwhelming
- [ ] Revise section list and field definitions based on feedback

### Success Criteria
- Providers confirm the 37 sections feel intuitive on paper
- No section removal/addition needed after testing
- Time estimate: mock visit completes in target timeframe

---

## Phase 2: Digital Note Builder

**Duration**: 4-6 weeks
**Dependencies**: Phase 1 (schema)

### Deliverables
- [ ] Web application (TypeScript + React + Bun)
- [ ] Renders all 37 sections from JSON schema
- [ ] Two view modes: Initial Visit and Follow-Up (Delta Mode)
- [ ] Progressive disclosure: collapse stable sections
- [ ] Field entry for all types (number, enum, text, date, boolean)
- [ ] Dashboard summary view at top
- [ ] Export: copy-paste-ready Epic note text
- [ ] Export: patient-facing summary (plain language)
- [ ] Export: care team task list

### Tech Stack
- Bun + React 19 + Shadcn/ui v4 + Tailwind v4
- Zustand (state), Zod (validation), TanStack Query (data fetching)
- Bun.sqlite for local data persistence

### Success Criteria
- All 37 sections render correctly
- Both view modes work
- Note output matches expected format
- Provider can complete a follow-up in <3 minutes using the builder

---

## Phase 3: Epic Template

**Duration**: 2-3 weeks
**Dependencies**: Phase 2 (digital builder validates field structure)

### Deliverables
- [ ] New SmartPhrase: `@TKECKD@` (or similar)
- [ ] All SmartLists updated/created for enum fields
- [ ] SmartLinks mapped for auto-pull fields (@CREAT@, @GFR@, etc.)
- [ ] Initial visit version and follow-up version
- [ ] Testing in Epic sandbox
- [ ] Migration guide from old smart phrase

### Success Criteria
- SmartPhrase renders correctly in Epic
- Auto-pull fields populate from chart data
- Provider can use it for real patient encounters

---

## Phase 4: Core AI Agents (6-10)

**Duration**: 4-6 weeks
**Dependencies**: Phase 1 (schema), Phase 2 (builder for testing)

### Deliverables
- [ ] Orchestrator agent (traffic control, assembly, conflict resolution)
- [ ] kidney_function_agent
- [ ] bp_fluid_agent
- [ ] heart_failure_agent
- [ ] pharmacotherapy_agent (4 Pillars)
- [ ] complications_agent (Anemia, MBD, Electrolytes)
- [ ] medication_safety_agent (Risk Mitigation, Triple Whammy)
- [ ] planning_screening_agent
- [ ] Test suite: 50+ test cases per agent (gold standard notes)
- [ ] Confidence scoring and "REVIEW NEEDED" flagging

### Success Criteria
- Agents generate clinically appropriate interpretations
- Interpretations match expected output for test cases
- No hallucinated lab values or medication recommendations
- Average generation time <5 seconds per section

---

## Phase 5: Pre-Visit Engine

**Duration**: 3-4 weeks
**Dependencies**: Phase 4 (agents), Phase 2 (builder)

### Deliverables
- [ ] Lab data ingestion (API or manual import)
- [ ] Medication list ingestion
- [ ] Previous note parsing → field extraction
- [ ] Auto-population of all available fields
- [ ] Care gap detection (overdue labs, missing screenings, med gaps)
- [ ] Pre-visit brief generation

### Success Criteria
- 80%+ of fields auto-populated before provider opens note
- Care gaps accurately identified
- Pre-visit brief is useful and concise

---

## Phase 6: Report Card + Final Card Designs

**Duration**: 3-4 weeks
**Dependencies**: Phase 2 (digital builder validates fields - schema is stable)

### Deliverables
- [ ] Physical report card design (1:1 with digital note)
- [ ] All 42 card designs (front + back)
- [ ] Print-ready files (size TBD from Phase 1.5 feedback)
- [ ] OCR field mapping document
- [ ] QR code content for each card (links to education)

### Success Criteria
- Every card maps cleanly to its note section(s)
- OMR checkboxes are OCR-scannable (test with scanner)
- Patient education content validated at 6th-grade reading level

---

## Phase 7: Virtual Scribe + OCR Scanning

**Duration**: 4-6 weeks
**Dependencies**: Phase 4 (agents), Phase 6 (cards)

### Deliverables
- [ ] Whisper/transcription integration for encounter audio
- [ ] Extraction pipeline: transcription → structured fields
- [ ] OCR scanning pipeline: physical cards → digital fields
- [ ] Verification UI: human reviews extracted data before acceptance
- [ ] Error handling and confidence scoring

### Success Criteria
- Transcription extraction accuracy >90% for key fields
- OCR accuracy >95% for OMR checkboxes
- Human verification step catches errors before note generation

---

## Phase 8: Full AI Agent Expansion

**Duration**: 4-6 weeks
**Dependencies**: Phase 4 (core agents proven)

### Deliverables
- [ ] Split pharmacotherapy_agent → RAAS, SGLT2i, MRA, GLP-1 specialists
- [ ] Split complications_agent → anemia, MBD, electrolytes specialists
- [ ] Add nutrition_agent
- [ ] Add physical_performance_agent
- [ ] Add transplant_agent (specialized)
- [ ] Regression testing: all existing test cases still pass
- [ ] Performance monitoring dashboard

### Success Criteria
- Specialized agents produce higher-quality output than generalist
- No regression in existing functionality
- System handles 50+ encounters/day without degradation

---

## Phase 9: Renal Performance Clinic (Tier 2/3)

**Duration**: 6-8 weeks
**Dependencies**: Core system stable, Tier 1 screening data available

### Deliverables
- [ ] Formal assessment protocol (full SPPB, 6MWT, frailty scoring)
- [ ] Referral pathway from Tier 1 screening
- [ ] Billing/coding setup (CPT 97750, 97161-63, 97110, 97112)
- [ ] Cash-pay longevity performance panel ($200-350)
- [ ] Staffing plan (exercise physiologist or PT partnership)
- [ ] Patient education materials
- [ ] Outcome tracking (performance trends over time)

### Success Criteria
- Tier 2 assessment operational for high-risk patients
- Billing codes validated with payers
- At least 10 patients assessed in first month

---

## Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| 0: Governance | 1-2 wk | Week 2 |
| 1: JSON Schema | 1-2 wk | Week 4 |
| 1.5: Paper Prototype | 1-2 wk | Week 5 |
| 2: Digital Note Builder | 4-6 wk | Week 10 |
| 3: Epic Template | 2-3 wk | Week 13 |
| 4: Core AI Agents | 4-6 wk | Week 16 |
| 5: Pre-Visit Engine | 3-4 wk | Week 20 |
| 6: Cards + Report Card | 3-4 wk | Week 22 |
| 7: Scribe + OCR | 4-6 wk | Week 28 |
| 8: Agent Expansion | 4-6 wk | Week 32 |
| 9: Renal Performance Clinic | 6-8 wk | Week 40 |

**Total estimated timeline: ~10 months**

Some phases can overlap (e.g., Phase 4 can start while Phase 2 is in progress for the UI portion).
