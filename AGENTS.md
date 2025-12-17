# AI Projects Monorepo

## Beads Issue Tracking

**MANDATORY**: This monorepo uses `bd` (Beads) for ALL task tracking.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details  
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

### Issue Types
- `bug` - Something broken that needs fixing
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities
- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Creating Issues

```bash
# Basic issue
bd create "Issue title" --description="What and why" -t task -p 1 --json

# Discovered during work (links to parent)
bd create "Found bug" --description="Details" -t bug -p 1 --deps discovered-from:<parent-id> --json
```

---

## Project Overview

Multi-project workspace for AI-assisted development experiments.

**Location**: `/home/shreemulay/ai_projects`

## Project Categories

| Directory | Type | Key Tech |
|-----------|------|----------|
| `development/` | Active projects | TypeScript, Python, n8n |
| `nephrology_knowledge_base/` | Knowledge systems | JSON, Python |
| `datasets/` | Training data | JSON, Markdown |
| `health/`, `fabric/`, `how_to_use_git/` | Reference/Learning | HTML Dashboards |
| `processing-a-pdf-file-for-data-to-a-schema/` | PDF processing | Python, FastAPI |

## Tech Stack Defaults

### Runtime & Package Management
- **JavaScript/TypeScript**: Bun (not Node.js)
- **Python**: uv or pip with pyproject.toml

### Frontend
- **Framework**: React 19 with Server Components
- **Components**: Shadcn/ui v4
- **Styling**: Tailwind CSS v4
- **State**: Zustand (client), TanStack Query (server)
- **Validation**: Zod
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend
- **TypeScript**: Bun.serve()
- **Python**: FastAPI + Pydantic v2

### Database
- **SQLite**: Bun.sqlite (built-in)
- **PostgreSQL**: Bun.sql

---

## Domain Rules

See `.claude/rules/` for detailed conventions:

| File | Purpose |
|------|---------|
| `code-style.md` | General coding standards |
| `typescript-bun.md` | TypeScript + Bun + Shadcn + TOON |
| `python.md` | Python async patterns |
| `n8n-workflows.md` | n8n workflow conventions |
| `dashboards.md` | HTML dashboard patterns |
| `git-commits.md` | Commit message standards |
| `openspec.md` | OpenSpec for detailed specifications |

---

## Quick Start - New Project

1. Create project directory in `development/`
2. Create AGENTS.md with project-specific rules
3. Reference Beads for task tracking
4. Use openspec/ for detailed specifications if needed

### Example New Project Structure

```
development/my-new-project/
├── AGENTS.md              # Project-specific rules
├── openspec/              # Optional: structured specs
│   └── AGENTS.md          # Detailed specification
├── src/                   # Source code
└── package.json           # Or pyproject.toml
```

---

## Master Prompt (Future)

See `MASTER_PROMPT.md` for the planned context injection system.

Projects can opt-in or opt-out via their AGENTS.md:
```yaml
master_prompt: true   # or false to disable
```

---

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

---

## Common Commands

### Bun (TypeScript)
```bash
bun install           # Install dependencies
bun test              # Run tests
bun run dev           # Start dev server
bun build             # Production build
```

### Python
```bash
uv pip install -e .   # Install in editable mode
python -m pytest      # Run tests
uvicorn main:app      # Start FastAPI server
```

### Git
```bash
git status            # Check state
git pull --rebase     # Get latest
git push              # Push changes
```

### Beads
```bash
bd ready              # Available work
bd list               # All issues
bd stats              # Statistics
bd sync               # Force sync
```
