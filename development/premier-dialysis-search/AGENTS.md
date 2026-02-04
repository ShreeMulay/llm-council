# Premier Dialysis Policy Search

## Project Overview

AI-powered policy and procedure search for Premier Dialysis staff (~40 users).
Staff search 100+ P&P documents via a branded web interface backed by Google Vertex AI Search.

**Google Drive Source**: `https://drive.google.com/drive/u/0/folders/1lWgOw9thvj5hD7qIYukgZ5DRY3OwvoK4`

## Architecture

- **Search Engine**: Google Vertex AI Search (Discovery Engine)
- **Hosting**: Google Cloud Run (static HTML container)
- **Auth**: Identity-Aware Proxy (IAP) with domain whitelist
- **Allowed Domains**: `@premier-dialysis.com`, `@thekidneyexperts.com`
- **Data Source**: Google Drive auto-sync connector
- **Frontend**: Single HTML page with `<gen-search-widget>` embed

## Key Requirements

1. **Zero hallucination** - Answers ONLY from indexed documents
2. **Citations required** - Document name, page, section for every claim
3. **File browsing + conversational Q&A** - Both search and ask modes
4. **Auto-sync** - Drive changes reflected automatically (daily re-index)
5. **Multi-domain auth** - Staff from both Workspace orgs can access

## GCP Project

- **Project ID**: `premier-dialysis-search` (or as created)
- **Region**: `us-central1` (default, change if needed)
- **Billing**: $1,000 free credit for AI Applications

## Cost Estimate

~$20-30/mo after free credit exhausted. Year 1 likely free.

## Commands

```bash
# Deploy to Cloud Run
gcloud run deploy premier-dialysis-search \
  --source=firebase/ \
  --region=us-central1 \
  --allow-unauthenticated=false

# Test search quality
bun run scripts/test-queries.ts
```

## Task Tracking

Uses Beads (`bd`) for all issue tracking. See `.beads/` directory.
