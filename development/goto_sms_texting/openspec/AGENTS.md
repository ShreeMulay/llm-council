# OpenSpec Agent Instructions

This project uses **OpenSpec** for spec-driven development. All AI coding assistants should follow these guidelines.

## OpenSpec Workflow

### 1. Before Writing Code

Always check for relevant specifications:
- `openspec/specs/` - Current system requirements
- `openspec/changes/` - Proposed changes in progress
- `openspec/project.md` - Project context and conventions

### 2. When Adding Features

1. **Create a change proposal first**
   ```
   openspec/changes/<feature-name>/
   ├── proposal.md    # Why and what
   ├── tasks.md       # Implementation checklist
   └── specs/         # Spec deltas (changes to specs)
   ```

2. **Review with human** before implementing

3. **Implement tasks** from `tasks.md`

4. **Archive when complete** using `openspec archive <feature-name>`

### 3. When Modifying Existing Features

1. Check `openspec/specs/` for current requirements
2. Create a change proposal with spec deltas
3. Implement only what's specified

## Slash Commands (OpenCode)

| Command | Purpose |
|---------|---------|
| `/openspec-proposal <name>` | Create a new change proposal |
| `/openspec-apply <name>` | Implement tasks from a proposal |
| `/openspec-archive <name>` | Archive a completed change |

## CLI Commands

```bash
openspec list               # View active changes
openspec view               # Interactive dashboard
openspec show <change>      # Display change details
openspec validate <change>  # Check spec formatting
openspec archive <change>   # Archive completed change
```

## Spec Format

### Requirements
Use RFC 2119 keywords (SHALL, MUST, SHOULD, MAY):

```markdown
### Requirement: Feature Name
The system SHALL do something specific.

#### Scenario: Happy path
- GIVEN some precondition
- WHEN an action occurs
- THEN expected outcome happens
```

### Deltas (in changes/)
Mark what's changing:
- `## ADDED Requirements` - New capabilities
- `## MODIFIED Requirements` - Changed behavior
- `## REMOVED Requirements` - Deprecated features

## Project-Specific Notes

### Healthcare Domain
- All patient communication templates require review
- Minimize PHI in any generated code or logs
- Include opt-out handling in messaging features

### Multi-Interface
This project has multiple interfaces (Python CLI, Google Chat Bot).
When adding features, consider impact on ALL interfaces.

### Template System
New message templates should be added to:
1. `config.py` (Python)
2. `google_chat_bot/Templates.gs` (Apps Script)
3. `openspec/specs/templates/spec.md` (Specification)
