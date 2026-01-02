# TALIA Implementation Plan

## Project Overview

TALIA (The Application Layer Intelligence Artificial) implementation plan for The Kidney Experts nephrology practice. Card-based, pod-centric care delivery operating system.

**Mission**: "Ridding the world of the need for dialysis"

**Location**: Jackson, TN (Pilot)

## Key Parameters

| Parameter | Value |
|-----------|-------|
| Executive Sponsor | Dr. Shree Mulay |
| Start Date | January 2026 |
| Budget | $20,000 |
| Technology | AppSheet + Chromebooks |
| EHR Integration | None (standalone) |

## Directory Structure

```
talia-implementation-plan/
├── TALIA-IMPLEMENTATION-PLAN.md  # Master plan document
├── cards/                         # Card designs (Core 4 + Modules)
├── training/                      # Training guides for MA, Scribe, Provider
├── sops/                          # Standard Operating Procedures
├── appendices/                    # Supporting documents
└── BUDGET.md                      # Detailed budget allocation
```

## Core Principles

1. **95% Rule**: 95% of care delivered before provider arrives
2. **Barista Model**: Patient sits once, everything comes to them
3. **Single Source of Truth**: Cards ARE the documentation
4. **Education as Integration**: Education built into every card

## Card System

### CORE (Every Visit)
- Measurement Card
- Assessment Card
- Intervention Card
- Patient Summary Card

### MODULES (Condition-Specific)
- Diabetes
- Heart Failure
- Transplant
- Pre-Dialysis
- Gout/Krystexxa
- NSAIDs
- Anemia
- BP Control
- Dialysis
- Bone Mineral
- AKI Follow-up
- New Patient

## Quick Commands

```bash
# Navigate to project
cd ~/ai_projects/development/TALIA/talia-implementation-plan

# View main plan
cat TALIA-IMPLEMENTATION-PLAN.md

# List all cards
ls cards/
```

## When Working on This Project

- Reference the master plan (`TALIA-IMPLEMENTATION-PLAN.md`) for all decisions
- Card designs should follow specifications in `cards/CARD-SPECIFICATIONS.md`
- All changes tracked via git
- No Epic integration - TALIA is standalone
- Budget decisions require reference to `BUDGET.md`
- Training materials must align with the 95% Rule philosophy

## Implementation Phases

1. **Foundation** (Weeks 1-4): Core infrastructure, training
2. **Pilot Launch** (Weeks 5-8): Jackson location go-live
3. **Optimization** (Weeks 9-12): Iterate based on feedback
4. **Expansion** (Post-pilot): Scale to other locations

## Key Stakeholders

- **Dr. Shree Mulay** - Executive Sponsor, Clinical Lead
- **MAs (Medical Assistants)** - Primary card operators
- **Scribes** - Documentation support
- **Providers** - Final review, complex decisions

## Technology Notes

- **AppSheet**: No-code platform for card applications
- **Chromebooks**: Cost-effective, cloud-first devices
- **Google Workspace**: Backend data storage
- All data stays within Google ecosystem for HIPAA compliance

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
