# llm-council Documentation

This site is auto-generated from the `openspec/` directory and deployed to
Forgejo Pages by Woodpecker CI.

## What's Inside

| Section | Description |
|---------|-------------|
| [Specs](specs/) | Current system state — the source of truth |
| [Changes](changes/) | Proposed, approved, and archived changes |

## How It Works

```
Edit openspec/ markdown  →  git push to main  →  Woodpecker CI
       →  MkDocs build  →  deploy to pages branch  →  Forgejo Pages
```

Changes appear on the live site within ~30 seconds of a push to `main`.

## OpenSpec Lifecycle

```
DRAFT → PROPOSED → APPROVED → IMPLEMENTING → DONE → ARCHIVED
```

- **DRAFT** — Initial idea, being written
- **PROPOSED** — Ready for review
- **APPROVED** — Agreed; ready to implement
- **IMPLEMENTING** — Code being written
- **DONE** — Merged and deployed
- **ARCHIVED** — Historical record

---

*Powered by [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) and Forgejo Pages.*
