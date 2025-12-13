# Proposal: Initial Skeleton Generation

## Summary

Generate the initial skeleton structure for the Nephrology Knowledge Base, including the master index and all domain index files with topic outlines.

## Motivation

The Kidney Experts, PLLC needs a comprehensive knowledge base covering all aspects of nephrology practice. This initial pass creates the scaffolding that will guide all future content generation.

## Scope

### In Scope
- Master `domains/_index.md` with overview of all domains
- Domain index files for all 6 domains:
  - `00-glossary/_index.md`
  - `01-clinical/_index.md`
  - `02-care-delivery/_index.md`
  - `03-regulatory/_index.md`
  - `04-business/_index.md`
  - `05-emerging/_index.md`
- Topic lists with descriptions for each domain
- Subtopic suggestions for future expansion
- Suggested authoritative sources per domain
- Initial wikilink structure

### Out of Scope
- Detailed topic content (Pass 3)
- Source discovery and retrieval (Pass 2)
- Citation verification (Pass 4)
- Cross-linking validation (Pass 5)

## Technical Approach

### LLM Configuration
- **Primary Model**: Claude Sonnet 4.5
- **Temperature**: 0.3 (structured but creative enough for comprehensive coverage)
- **Max Tokens**: 4096 per domain
- **Output Format**: JSON structured output with markdown content

### Generation Strategy
1. Generate master `domains/_index.md` first
2. Generate each domain `_index.md` sequentially (chunked approach)
3. Checkpoint after each domain
4. Validate wikilinks after all domains complete

### Output Format
Each `_index.md` will follow outline style:
```markdown
---
title: Domain Title
domain: domain-id
status: skeleton
generated_by: claude-sonnet-4-5
generated_at: 2025-01-15T10:00:00Z
pass: 1
---

# Domain Title

Brief description of domain scope.

## Topics

- **[[Topic Name]]**: Brief description
  - Subtopics: Sub1, Sub2, Sub3
  - Priority: high | medium | low
  - Sources: Suggested source 1, Source 2
```

## Success Criteria

- [ ] All 6 domain `_index.md` files created
- [ ] Master `domains/_index.md` created
- [ ] Each domain has 5+ topics defined
- [ ] Each topic has subtopics listed
- [ ] Suggested sources provided for each domain
- [ ] All wikilinks use consistent format
- [ ] Frontmatter includes required fields
- [ ] Checkpoint created after completion

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Token limit exceeded | Low | Medium | Chunked generation per domain |
| Inconsistent formatting | Medium | Low | JSON schema validation |
| Missing key topics | Medium | Medium | Domain-specific prompts with nephrology context |
| Wikilink format issues | Low | Low | Post-generation validation |

## Dependencies

- `config/llm-configs.yaml` must exist
- `config/schemas/domain.schema.json` must exist
- `config/prompts/pass-1-skeleton.md` must exist
- Anthropic API key must be available

## Timeline

- **Estimated Duration**: 2-3 hours
- **Phase**: Day 1 of initial build
