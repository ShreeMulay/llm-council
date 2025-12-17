# OpenSpec Usage Guide

OpenSpec is a structured approach to defining project specifications that both humans and AI can follow.

## When to Use OpenSpec

Use OpenSpec for:
- **New features or capabilities** that need detailed planning
- **Breaking changes** that affect existing functionality
- **Architecture decisions** that need documentation
- **Complex multi-step implementations**
- **Ambiguous requirements** that need clarification

Skip OpenSpec for:
- Simple bug fixes
- Minor refactoring
- Documentation updates
- Dependency updates

---

## Directory Structure

```
project/
├── AGENTS.md              # References openspec
├── openspec/
│   ├── AGENTS.md          # Specification details
│   ├── proposals/         # Change proposals
│   │   └── 001-feature.md
│   └── decisions/         # Recorded decisions (ADRs)
│       └── 001-tech-choice.md
```

---

## OpenSpec AGENTS.md Template

```markdown
# Project Name - Specification

## Overview
Brief description of the project and its purpose.

## Goals
- Primary goal 1
- Primary goal 2
- Primary goal 3

## Non-Goals
- What this project explicitly does NOT do
- Scope boundaries

## Architecture

### Components
- **Component A**: Description
- **Component B**: Description

### Data Flow
Describe how data moves through the system.

## API Reference

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users | List users |
| POST | /api/users | Create user |

### Data Models
```typescript
interface User {
  id: string
  name: string
  email: string
}
```

## Implementation Plan

### Phase 1: Foundation
- [ ] Task 1.1
- [ ] Task 1.2

### Phase 2: Core Features
- [ ] Task 2.1
- [ ] Task 2.2

## Open Questions
- Question that needs resolution?
- Another question?

## References
- Link to related documentation
- External resources
```

---

## Workflow with Beads

### 1. Recognize Specification Need

During development, when you encounter:
- Planning new features
- Proposing changes
- Making architecture decisions

### 2. Create/Update OpenSpec

```bash
# Create proposal for new feature
mkdir -p openspec/proposals
# Write the proposal
```

### 3. Link to Beads Issues

```bash
# Create issue for the spec work
bd create "Implement feature X per openspec" \
  --description="See openspec/proposals/001-feature.md for details" \
  -t feature -p 1 --json

# Reference spec in implementation issues
bd create "Build component A for feature X" \
  --description="Part of feature X (openspec/proposals/001-feature.md)" \
  -t task -p 1 --deps discovered-from:bd-123 --json
```

### 4. Track Progress

Update openspec checkboxes as work completes:
```markdown
### Phase 1: Foundation
- [x] Task 1.1 (bd-123)
- [x] Task 1.2 (bd-124)
- [ ] Task 1.3 (bd-125, in progress)
```

---

## Proposal Format

```markdown
# Proposal: Feature Name

## Status
Draft | Review | Approved | Implemented | Rejected

## Summary
One paragraph description.

## Motivation
Why is this change needed?

## Detailed Design

### Option A
Description of approach A.

**Pros:**
- Pro 1
- Pro 2

**Cons:**
- Con 1
- Con 2

### Option B
Description of approach B.

**Pros/Cons...**

## Recommendation
Which option and why.

## Implementation Plan
1. Step 1
2. Step 2
3. Step 3

## Open Questions
- Question 1?

## References
- Links
```

---

## Architecture Decision Record (ADR)

```markdown
# ADR 001: Technology Choice

## Status
Accepted

## Context
What is the issue we're addressing?

## Decision
What decision was made?

## Consequences
What are the implications?

### Positive
- Benefit 1
- Benefit 2

### Negative
- Tradeoff 1
- Tradeoff 2

## Alternatives Considered
What other options were evaluated?
```

---

## Best Practices

### Keep Specs Living Documents

- Update specs as requirements evolve
- Mark completed sections
- Note deviations from original plan

### Link Everything

- Reference Beads issues in specs
- Reference specs in Beads issues
- Cross-reference related proposals

### Version Control

- Commit spec changes with meaningful messages
- Use PRs for significant spec changes
- Keep proposal history in proposals/

### Review Process

1. Draft proposal
2. Share for feedback
3. Address comments
4. Get approval
5. Begin implementation
6. Update spec as needed

---

## Quick Reference

| When | Do |
|------|-----|
| New feature | Create proposal in openspec/proposals/ |
| Architecture decision | Create ADR in openspec/decisions/ |
| Implementation | Reference openspec in Beads issues |
| Completion | Update checkboxes, close issues |
| Changes during impl | Update spec, note deviation |
