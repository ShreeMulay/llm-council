# TKE CKD Note Template - AI-Era Rebuild

## Project Overview

Rebuilding The Kidney Experts' CKD clinic note template for the AI era. Unifies physical report cards, digital data, Epic clinic notes, and AI agents into one cohesive system.

**Location**: `development/TALIA/tke-ckd-note-template/`
**Parent**: TALIA ecosystem
**Status**: OpenSpec planning complete, implementation Phase 0

## Key Principle

What happens in life = physical report card = digital version = the note = AI agents. One cohesive system. One section registry rules everything.

## Architecture

- **37 note sections** across 9 clinical domains
- **42 physical cards** mapped 1:1 to sections
- **6-10 AI sub-agents** (starting), expandable to 15-20
- **Same template** for initial visit AND follow-up (two view modes)
- **3 outputs** from same data: provider note, patient summary, care team task list

## Tech Stack

- **Schema**: JSON section registry (single source of truth)
- **Digital Note Builder**: TypeScript + React (Bun)
- **AI Agents**: LLM-based, per-domain specialists
- **Physical Cards**: 5.5"x8.5" or TBD, OCR-scannable
- **Epic Integration**: SmartPhrase + copy-paste (Phase 1), FHIR/SmartLinks (future)

## Project Structure

```
tke-ckd-note-template/
├── AGENTS.md              # This file
├── openspec/              # Specifications (source of truth)
│   ├── project.md         # Project overview
│   ├── specs/             # Current state specs
│   │   ├── section-registry.md
│   │   ├── ai-architecture.md
│   │   ├── card-inventory.md
│   │   ├── implementation-phases.md
│   │   └── council-review.md
│   └── changes/           # Change proposals
│       └── initial-build/
├── schemas/               # JSON schemas (Phase 1 deliverable)
├── src/                   # Source code (Phase 2+)
└── cards/                 # Card designs (Phase 6)
```

## Conventions

- All clinical content follows KDIGO 2024-2025 guidelines
- Section IDs use snake_case (e.g., `kidney_function`, `raas_inhibition`)
- Card codes use TKE-XXXX format (e.g., `TKE-RAAS`, `TKE-SGLT`)
- Domain colors follow card category scheme
- Every section follows: Discrete Fields -> AI Interpretation -> Action Items -> Patient Education

## Related Projects

- `tke-provider-workload-offload/` - Existing card implementations (9 built)
- `talia-quality-metrics/` - Quality metrics schemas
- `../fax-manager-v2/` - Fax intelligence system (lab thresholds, med safety)
- `nephrology_knowledge_base/epic_smartphrases/` - Previous smart phrase work

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
