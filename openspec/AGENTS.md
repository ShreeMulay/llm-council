# OpenSpec Conventions for LLM Council

## Specification Style

- Use RFC 2119 keywords (SHALL, MUST, SHOULD, MAY)
- Write scenarios in GIVEN/WHEN/THEN format
- Include technical implementation details where relevant
- Document error handling and edge cases

## File Structure

```
openspec/
├── project.md              # Project overview, tech stack, domain context
├── specs/
│   ├── model-discovery/    # Dynamic model fetching from providers
│   ├── council-deliberation/ # 3-stage deliberation logic
│   ├── storage/            # JSON file persistence
│   └── opencode-integration/ # /council command and MCP tool
└── changes/
    ├── initial-setup/      # Current setup work
    └── archive/            # Completed changes
```

## Change Management

1. Create proposal in `changes/<feature-name>/proposal.md`
2. Add implementation tasks in `tasks.md`
3. Write delta specs in `specs/` subdirectory
4. Get approval (mark "Status: APPROVED")
5. Implement per spec requirements
6. Archive to `changes/archive/YYYY-MM-DD-<feature-name>/`

## Testing Requirements

Each spec scenario should be verifiable by:
- Unit tests (where applicable)
- Integration tests via API endpoints
- Manual testing via curl/httpie
