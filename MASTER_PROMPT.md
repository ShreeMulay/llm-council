# Master Prompt System

## Status: Planned - Not Yet Implemented

This file documents the planned "Master Prompt" system for context injection, inspired by Tiago Forte's building a second brain methodology.

---

## Concept

The Master Prompt is a dynamically assembled context document that provides AI agents with:
- Current identity and role
- Active project focus
- Relevant constraints and preferences
- Historical context when needed

Unlike static AGENTS.md files, the Master Prompt is **assembled on-demand** based on:
- Current working directory
- Active Beads issues
- Project-specific configurations
- User preferences

---

## Planned Architecture

```
Master Prompt Assembly
├── Identity Layer        # Who the agent is, core capabilities
├── Context Layer         # Current project, active issues from Beads
├── Constraints Layer     # Rules, preferences, restrictions
├── Memory Layer          # Relevant past decisions, patterns
└── Task Layer            # Current focus from Beads ready queue
```

### Component Sources

| Layer | Source | When Included |
|-------|--------|---------------|
| Identity | Global config | Always |
| Context | AGENTS.md hierarchy | Always |
| Constraints | .claude/rules/ | Based on file types |
| Memory | Beads closed issues | On request |
| Task | Beads ready queue | When starting work |

---

## Planned Features

### Core Features (v1)
- [ ] Project-level opt-in/opt-out in AGENTS.md
- [ ] Automatic assembly from AGENTS.md hierarchy
- [ ] Beads integration for task context
- [ ] Rule file selection based on current file types

### Advanced Features (v2)
- [ ] Memory decay from Beads compaction
- [ ] Cross-project knowledge sharing
- [ ] User preference learning
- [ ] Context budget management (token limits)

### Integration Features (v3)
- [ ] OpenSpec integration for project specifications
- [ ] MCP tool availability injection
- [ ] Session continuity across conversations
- [ ] Multi-agent coordination context

---

## Usage (Future)

### Enabling Master Prompt

In project AGENTS.md:
```yaml
master_prompt:
  enabled: true
  include:
    - identity
    - context
    - constraints
    - current_task
  exclude:
    - memory  # Optional: exclude historical context
```

### Disabling Master Prompt

```yaml
master_prompt:
  enabled: false
```

Or simply omit the `master_prompt` section (defaults to disabled).

### Per-Session Override

```bash
# Start session with master prompt
opencode --master-prompt

# Start session without master prompt
opencode --no-master-prompt
```

---

## Design Principles

1. **Opt-In by Default**: Projects must explicitly enable the master prompt
2. **Token Efficient**: Context is compressed and prioritized
3. **Composable**: Sections can be included/excluded independently
4. **Beads-Native**: Deep integration with issue tracking
5. **Hierarchical**: Inherits from parent directories
6. **Transparent**: Users can inspect assembled prompt

---

## Integration with Beads

The Master Prompt will leverage Beads for:

### Ready Queue Context
```markdown
## Current Focus
Based on `bd ready`:
- [bd-123] High priority bug in auth module
- [bd-456] Feature: add user settings page
```

### Historical Context
```markdown
## Recent Decisions
From closed Beads issues:
- Chose Zustand over Redux for state management (bd-100)
- Using TOON patterns for API responses (bd-101)
```

### Active Work Context
```markdown
## In Progress
Currently working on:
- [bd-789] Implementing OAuth flow (started 2 hours ago)
```

---

## Implementation Notes

### File Structure
```
~/.config/opencode/
├── master-prompt/
│   ├── identity.md        # Global identity template
│   ├── constraints.md     # Global constraints
│   └── preferences.yaml   # User preferences

/project/
├── .master-prompt/        # Project-specific overrides
│   ├── context.md         # Project context
│   └── config.yaml        # Project settings
```

### Assembly Order
1. Load global identity
2. Walk directory hierarchy for AGENTS.md files
3. Select applicable .claude/rules/ files
4. Query Beads for current task context
5. Apply token budget constraints
6. Assemble final prompt

---

## References

- Tiago Forte's "Building a Second Brain"
- PARA method (Projects, Areas, Resources, Archives)
- Beads issue tracking patterns
- OpenCode AGENTS.md conventions

---

*This is a placeholder for future implementation. The actual system will be built incrementally based on usage patterns and needs.*
