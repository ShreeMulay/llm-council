# OpenSpec Agent Instructions

This project uses **OpenSpec** for spec-driven development. Follow these workflows when making changes.

## Project Context

Read `openspec/project.md` for project conventions, tech stack, and architectural principles.

## Workflow Commands

### 1. Create a Change Proposal

When asked to implement a new feature or make changes:

1. Create a new folder under `openspec/changes/[change-name]/`
2. Generate these files:
   - `proposal.md` - Why and what changes
   - `tasks.md` - Implementation checklist with checkboxes
   - `design.md` - Technical decisions (optional)
   - `specs/` - Delta specs showing additions/modifications

### 2. Apply a Change

When implementing an approved change:

1. Read the change's `proposal.md` and `tasks.md`
2. Implement each task, checking boxes as completed
3. Update any affected specs
4. Validate against existing specs in `openspec/specs/`

### 3. Archive a Change

When a change is complete:

1. Merge spec deltas into `openspec/specs/`
2. Move change folder to `openspec/archive/`
3. Update any cross-references

## Spec Format

Use this format for specifications:

```markdown
# [Spec Name]

## Purpose
Brief description of what this spec covers.

## Requirements

### Requirement: [Requirement Name]
The system SHALL/MUST [behavior description].

#### Scenario: [Scenario Name]
- GIVEN [precondition]
- WHEN [action]
- THEN [expected outcome]
```

## Delta Format

When proposing changes to specs:

```markdown
# Delta for [Spec Name]

## ADDED Requirements
### Requirement: [New Requirement]
...

## MODIFIED Requirements
### Requirement: [Changed Requirement]
...

## REMOVED Requirements
### Requirement: [Deprecated Requirement]
...
```

## Current Specs

See `openspec/specs/` for the source of truth on all system specifications.

## Active Changes

Check `openspec/changes/` for in-progress work.
