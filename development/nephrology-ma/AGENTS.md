# Nephrology M&A Intelligence Platform

## Project Overview
Data-driven identification and scoring of nephrology practice acquisition targets using free CMS/government databases. NPI serves as the Rosetta Stone to cross-reference 25+ datasets and score practices on 10 acquisition-readiness dimensions.

**Organization:** The Kidney Experts (TKE), Tennessee
**Sponsor:** Dr. Shree Mulay (CEO & Nephrologist)
**GCP Project:** `tke-ma-intelligence`
**BigQuery Dataset:** `nephrology_ma`

## Tech Stack
- **Data Warehouse:** Google BigQuery (serverless, ~$3-5/month)
- **ETL:** Python 3.12+ with `uv` for package management
- **Output:** Google Sheets (human review) + Discord (alerts)
- **Automation:** Cron + n8n workflows
- **Language:** Python (scripts), SQL (BigQuery)

## Key Conventions
- All scripts use `google-cloud-bigquery` Python client
- Config lives in `config.yaml` — no hardcoded project IDs or paths
- Raw downloads go to `data/raw/` (gitignored)
- SQL DDL and queries live in `sql/`
- Every download script must be idempotent (re-runnable safely)
- ETL scripts use WRITE_TRUNCATE for full refreshes
- Scoring query uses COALESCE defaults for missing dimensions

## Scoring Engine (10 Dimensions)
1. Estimated Age (18%) — from graduation year
2. Solo Practice (13%) — from PECOS reassignment
3. Volume Trend 3yr (18%) — Medicare payment changes
4. Prescribing Trend (8%) — Part D claim changes
5. Open Payments Trend (4%) — pharma engagement changes
6. License Status (8%) — expired/inactive licenses
7. Business Filing Status (4%) — dissolved/revoked entities
8. Geographic Proximity (9%) — distance to TKE service area
9. Practice Value (5%) — annual Medicare revenue
10. Independence Likelihood (13%) — PE/MSO ownership signals

## Data Source Reference
See `docs/DATABASE_PLAYBOOK.md` for full catalog of 25+ databases.
See `docs/IMPLEMENTATION_PLAN.md` for detailed technical plan.

## Pipeline Stages
1. `download` — Fetch raw CMS/government data
2. `etl` — Transform and load into BigQuery normalized tables
3. `score` — Run signal detection + composite scoring
4. `export` — Push results to Google Sheets + Discord alerts

## Beads Integration
All task tracking uses `bd` (Beads). See root AGENTS.md for commands.
