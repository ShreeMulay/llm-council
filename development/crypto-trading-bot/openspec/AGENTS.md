# OpenSpec AI Guidelines

## Specification Structure

```
openspec/
├── AGENTS.md          # This file - AI guidelines
├── project.md         # Project overview, decisions, architecture
├── specs/             # Source of truth (current state)
│   ├── architecture.md
│   ├── strategy.md
│   ├── rl-system.md
│   └── tax-tracking.md
└── changes/           # Work in progress
    ├── <change-id>/   # Active proposals
    └── archive/       # Completed changes
```

## Working with OpenSpec

### Creating a Change Proposal
```bash
# When adding a new feature or making significant changes
mkdir -p openspec/changes/<change-id>
# Create proposal.md with:
# - Summary
# - Motivation
# - Technical approach
# - Affected files
# - Testing plan
```

### Approval Flow
1. Create proposal in `openspec/changes/<change-id>/proposal.md`
2. Set status to "DRAFT"
3. Review with user
4. User marks "APPROVED"
5. Implement the change
6. Archive when complete

## Key Principles

1. **Agree first, build second** - Proposals before code
2. **Single source of truth** - Specs in `specs/` are authoritative
3. **Change tracking** - All significant changes go through proposals
4. **Versioning** - Archive completed changes, don't delete
