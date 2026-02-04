# Phase 1.5: Paper Prototype Testing

## Purpose

Test card usability with mock patient visits before investing in final design and printing. These printable prototypes allow rapid iteration on:

- Field layout and grouping
- Checkbox vs fill-in-blank decisions
- Information density per card
- MA vs Provider workflow clarity
- Patient education content (card backs)

## Card Inventory (10 Priority Cards)

| # | Code | Card Name | Domain | Color |
|---|------|-----------|--------|-------|
| 1 | TKE-RAAS | RAAS Inhibition | Pharmacotherapy | #8B5CF6 |
| 2 | TKE-SGLT | SGLT2 Inhibitor | Pharmacotherapy | #8B5CF6 |
| 3 | TKE-FINE | MRA/Finerenone | Pharmacotherapy | #8B5CF6 |
| 4 | TKE-GLP1 | GLP-1 Receptor Agonist | Pharmacotherapy | #8B5CF6 |
| 5 | TKE-PROT | Proteinuria | Kidney Core | #3B82F6 |
| 6 | TKE-BPFL | Blood Pressure & Fluid | Cardiovascular | #EF4444 |
| 7 | TKE-ANEM | Anemia | CKD Complications | #1E40AF |
| 8 | TKE-ELEC | Electrolytes | CKD Complications | #1E40AF |
| 9 | TKE-GRIP | Physical Performance | Screening | #14B8A6 |
| 10 | TKE-PHQ | Depression Screen | Screening | #14B8A6 |

## Testing Protocol

### Setup

1. Print all cards from `cards/index.html` (double-sided if possible)
2. Prepare 3-5 mock patient scenarios with varying complexity
3. Recruit 1-2 MAs and 1-2 providers for testing
4. Set up timing mechanism (stopwatch or phone timer)

### Mock Visit Scenarios

**Scenario 1: Stable CKD G3b Follow-up**
- eGFR 38, stable from 40
- On all 4 pillars, tolerating well
- BP controlled, no edema
- Expected: Quick card completion, minimal changes

**Scenario 2: New CKD G4 with Uncontrolled HTN**
- eGFR 22, declining from 28
- Not on SGLT2i or MRA yet
- BP 158/92, 2+ edema
- Expected: Multiple medication decisions, longer completion

**Scenario 3: CKD G3a with Anemia and Depression**
- eGFR 52, stable
- Hgb 9.8, ferritin 45, TSAT 18%
- PHQ-2 positive (score 4)
- Expected: Focus on anemia workup and depression referral

**Scenario 4: Pre-dialysis Planning**
- eGFR 14, declining
- KFRE 2yr: 45%
- Needs transplant/dialysis discussion
- Expected: Planning cards become relevant

**Scenario 5: Complex Cardiorenal**
- eGFR 28, HFrEF with LVEF 30%
- On ARNI, needs SGLT2i optimization
- Hyperkalemia (K+ 5.4) limiting MRA
- Expected: Cross-domain complexity

### Per-Visit Protocol

1. **Pre-Visit (2 min)**
   - Review scenario
   - Pull relevant cards for the visit

2. **MA Portion (timed)**
   - MA fills vitals, screening sections
   - Record time to complete
   - Note any confusion or questions

3. **Provider Portion (timed)**
   - Provider reviews MA entries
   - Makes clinical decisions
   - Completes plan sections
   - Record time to complete

4. **Debrief (5 min)**
   - What worked well?
   - What was confusing?
   - What's missing?
   - What's unnecessary?

## Feedback Form Template

### Card: TKE-____

**Tester**: _________________ **Role**: [ ] MA [ ] Provider

**Scenario #**: _____ **Time to Complete**: _____ min

#### Layout & Design

| Aspect | Poor | Fair | Good | Excellent |
|--------|------|------|------|-----------|
| Field organization | | | | |
| Font size/readability | | | | |
| Checkbox clarity | | | | |
| Space for writing | | | | |
| Color coding | | | | |

#### Content

| Question | Yes | No | Notes |
|----------|-----|-----|-------|
| All needed fields present? | | | |
| Any unnecessary fields? | | | |
| Field labels clear? | | | |
| Target ranges helpful? | | | |
| Enum options complete? | | | |

#### Workflow

| Question | Yes | No | Notes |
|----------|-----|-----|-------|
| Clear who fills what? | | | |
| Logical field order? | | | |
| Easy to scan quickly? | | | |
| Works for both new/follow-up? | | | |

#### Open Feedback

**What would you change?**

_____________________________________________

**What's missing?**

_____________________________________________

**What's unnecessary?**

_____________________________________________

**Other comments:**

_____________________________________________

## Evaluation Checklist

### Per Card

- [ ] All fields from section registry represented
- [ ] Required fields clearly marked
- [ ] Target ranges visible where applicable
- [ ] Enum options match registry
- [ ] MA vs Provider sections clear
- [ ] Fits on 5.5x8.5" without crowding

### Overall System

- [ ] Cards can be completed in <2 min each (follow-up)
- [ ] Cards can be completed in <5 min each (initial)
- [ ] No critical information missing
- [ ] No redundant information across cards
- [ ] Color coding aids quick identification
- [ ] Card codes visible and scannable

### Workflow Integration

- [ ] MA can complete their sections independently
- [ ] Provider can quickly review MA entries
- [ ] Decision points are clearly marked
- [ ] Plan section has adequate space
- [ ] Cards work with or without digital system

## Next Steps After Testing

1. **Compile Feedback** - Aggregate all feedback forms
2. **Identify Patterns** - What issues appear across multiple testers?
3. **Prioritize Changes** - Critical vs nice-to-have improvements
4. **Iterate Designs** - Update card HTML files
5. **Re-test** - Validate changes with another round
6. **Finalize** - Lock designs for Phase 2 (digital implementation)

## Files in This Directory

```
phase-1.5/
├── README.md           # This file
└── cards/
    ├── index.html      # Print-all page
    ├── TKE-RAAS.html   # RAAS Inhibition
    ├── TKE-SGLT.html   # SGLT2 Inhibitor
    ├── TKE-FINE.html   # MRA/Finerenone
    ├── TKE-GLP1.html   # GLP-1 Receptor Agonist
    ├── TKE-PROT.html   # Proteinuria
    ├── TKE-BPFL.html   # Blood Pressure & Fluid
    ├── TKE-ANEM.html   # Anemia
    ├── TKE-ELEC.html   # Electrolytes
    ├── TKE-GRIP.html   # Physical Performance
    └── TKE-PHQ.html    # Depression Screen
```

## Print Instructions

1. Open `cards/index.html` in a browser
2. Use Print (Ctrl+P / Cmd+P)
3. Set paper size to Letter (8.5x11")
4. Each card will print on half a page (5.5x8.5")
5. For double-sided: print odd pages, flip, print even pages
6. Cut along the center line to separate cards
