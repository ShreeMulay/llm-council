# TKE Privacy Engine

## Project Overview

HIPAA-compliant de-identification engine for The Kidney Experts (TKE).
Uses Gemini (Vertex AI) + Cloud DLP to strip PHI from clinical notes
while preserving TKE provider names. Integrates with Google Drive,
Google Chat, and Google Sheets for a seamless Workspace-native workflow.

**BHAG**: "Ridding the World of the Need for Dialysis!"
This tool enables safe sharing of clinical data for research, quality
improvement, and AI training - all in service of that mission.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Python 3.11+ |
| Runtime | Google Cloud Functions (gen2) |
| AI/ML | Vertex AI (Gemini 1.5 Pro) |
| PHI Detection | Google Cloud DLP |
| Database | Cloud Firestore (CMEK-encrypted) |
| Messaging | Cloud Pub/Sub |
| Storage | Cloud Storage (CMEK, 24hr TTL) |
| Encryption | Cloud KMS |
| Outputs | Google Docs, Google Sheets |
| Chat | Google Chat API |
| Auth | Service Accounts + Workload Identity |

## Project Structure

```
tke-privacy-engine/
├── AGENTS.md                    # This file
├── config/
│   ├── settings.yaml            # Central configuration
│   └── provider_whitelist.json  # TKE providers to preserve
├── docs/
│   └── GCP_SETUP_GUIDE.md      # Complete GCP setup instructions
├── functions/
│   ├── deid-processor/          # Main processing function
│   │   ├── main.py              # Entry point (Pub/Sub triggered)
│   │   ├── requirements.txt     # Python dependencies
│   │   ├── processors/          # Text extraction, Gemini, DLP
│   │   ├── prompts/             # Gemini prompt templates
│   │   ├── outputs/             # Writers (Docs, Sheets, Firestore)
│   │   └── tests/               # Unit + integration tests
│   ├── drive-watcher/           # Drive file watcher function
│   └── chat-bot/                # Google Chat bot function
└── infra/
    ├── deploy.sh                # Deploy all Cloud Functions
    ├── setup_pubsub.sh          # Create Pub/Sub topics/subs
    └── setup_storage.sh         # Create GCS staging bucket
```

## Code Conventions

- **Python 3.11+** syntax (match statements, `X | Y` union types, etc.)
- **Ruff** for formatting and linting (line-length: 100)
- **Type hints** on all function signatures
- **Docstrings** on all public functions (Google style)
- **Pydantic v2** for data models and validation
- **Logging** via `logging` module (not print statements)
- **Environment variables** for all configuration (12-factor)
- **No hardcoded secrets** - use Secret Manager or env vars

## Testing

```bash
# Run unit tests
cd functions/deid-processor
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=. --cov-report=term-missing

# Run specific test
python -m pytest tests/test_gemini_deid.py -v -k "test_standard_note"
```

### Test Data

Synthetic clinical notes are in `functions/deid-processor/tests/test_data/`.
**NEVER use real patient data in tests.** All test data must be synthetic
with clearly fictional patient names and identifiers.

## Deployment

```bash
# Deploy all functions
./infra/deploy.sh

# Deploy a single function
./infra/deploy.sh processor
./infra/deploy.sh watcher
./infra/deploy.sh chatbot

# Set up infrastructure
./infra/setup_pubsub.sh
./infra/setup_storage.sh
```

## Key Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GCP_PROJECT_ID` | GCP project ID | Yes |
| `FIRESTORE_DATABASE` | Firestore DB name (default: `phi-mappings`) | No |
| `AUDIT_SHEET_ID` | Google Sheets spreadsheet ID for audit log | Yes |
| `OUTPUT_FOLDER_ID` | Drive folder ID for de-identified output | Yes |
| `INGEST_FOLDER_ID` | Drive folder ID for PHI input files | Yes |
| `STAGING_BUCKET` | GCS bucket for temp file staging | Yes |
| `DEID_TOPIC` | Pub/Sub topic name (default: `phi-deid-jobs`) | No |

## Pipeline Flow

```
User drops file in PHI_Ingest (Drive)
  → drive-watcher detects file
  → Copies to GCS staging bucket
  → Publishes job to Pub/Sub (phi-deid-jobs)
  → deid-processor picks up job
    → Extracts text (PDF/DOCX/TXT)
    → Gemini de-identifies (preserving TKE providers)
    → Cloud DLP verifies no residual PHI
    → Writes de-identified doc to Google Docs
    → Appends audit row to Google Sheets
    → Stores PHI mapping in Firestore (CMEK)
  → User gets de-identified doc in De-Identified folder

User pastes text in Google Chat
  → chat-bot receives message
  → Stores text in GCS staging
  → Publishes job to Pub/Sub
  → Same processing pipeline
  → Bot replies with de-identified text + doc link
```

## Security Requirements

- **CMEK encryption** on Firestore and Cloud Storage
- **24-hour TTL** on staging bucket objects
- **90-day TTL** on Firestore PHI mappings (configurable)
- **Least-privilege** service accounts per function
- **No PHI in logs** - only job IDs and metadata
- **Audit trail** in Google Sheets for every job
- **Provider whitelist** is the ONLY exception to PHI removal
