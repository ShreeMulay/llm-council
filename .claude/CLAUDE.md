# Claude Code Instructions

This is an alternative entry point for Claude Code. See the main `AGENTS.md` in the repository root for complete instructions.

## Quick Start

This monorepo uses **Beads** (`bd`) for issue tracking:

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Domain Rules

See `rules/` directory for domain-specific conventions:

- `code-style.md` - General coding standards
- `typescript-bun.md` - TypeScript + Bun + Shadcn + TOON
- `python.md` - Python async patterns
- `n8n-workflows.md` - n8n workflow conventions
- `dashboards.md` - HTML dashboard patterns
- `git-commits.md` - Commit message standards
- `openspec.md` - OpenSpec usage

## Tech Stack

- **Runtime**: Bun (not Node.js)
- **Frontend**: React 19 + Shadcn/ui v4 + Tailwind CSS v4
- **Backend**: Bun.serve() or FastAPI
- **State**: Zustand + TanStack Query
- **Validation**: Zod + React Hook Form

## Important

- Always use `bd sync` before ending a session
- Check `.claude/rules/` for file-type-specific conventions
- See `openspec/` for detailed project specifications
