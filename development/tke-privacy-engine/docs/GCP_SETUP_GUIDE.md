# TKE Privacy Engine - GCP Setup Guide

Complete step-by-step guide for setting up the Google Cloud Platform
infrastructure for the TKE Privacy Engine.

**Estimated time**: 45-60 minutes
**Prerequisites**: `gcloud` CLI installed, Google Workspace admin access, billing account

---

## Table of Contents

1. [Create GCP Project](#1-create-gcp-project)
2. [Enable Required APIs](#2-enable-required-apis)
3. [Create Service Accounts](#3-create-service-accounts)
4. [Set Up Cloud KMS](#4-set-up-cloud-kms)
5. [Set Up Firestore](#5-set-up-firestore)
6. [Set Up Pub/Sub](#6-set-up-pubsub)
7. [Set Up Cloud Storage](#7-set-up-cloud-storage)
8. [Set Up Google Drive](#8-set-up-google-drive)
9. [Set Up Google Chat Bot](#9-set-up-google-chat-bot)
10. [Deploy Cloud Functions](#10-deploy-cloud-functions)
11. [Create Audit Sheet](#11-create-audit-sheet)
12. [Test the Pipeline](#12-test-the-pipeline)

---

## 1. Create GCP Project

```bash
# Set variables used throughout this guide
export PROJECT_ID="tke-phi-privacy-engine"
export REGION="us-central1"
export BILLING_ACCOUNT="0191DF-1B962A-A0143B"
export ORG_ID="634034238853"

# Project already created. Link billing:
gcloud billing projects link $PROJECT_ID \
  --billing-account=$BILLING_ACCOUNT

# Or link via console if quota error:
# https://console.cloud.google.com/billing/linkedaccount?project=tke-phi-privacy-engine

# Set as default project
gcloud config set project $PROJECT_ID

# Verify
gcloud config list project
```

> **Quick Setup**: After billing is linked, run the one-click setup script:
> ```bash
> ./infra/setup_project.sh
> ```
> This handles Steps 2-7 automatically.

> **Organization**: thekidneyexperts.com (634034238853)
> **Billing**: The Kidney Experts, PLLC (0191DF-1B962A-A0143B)

---

## 2. Enable Required APIs

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  dlp.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  pubsub.googleapis.com \
  firestore.googleapis.com \
  drive.googleapis.com \
  docs.googleapis.com \
  sheets.googleapis.com \
  chat.googleapis.com \
  storage.googleapis.com \
  cloudkms.googleapis.com \
  secretmanager.googleapis.com \
  eventarc.googleapis.com \
  workspaceevents.googleapis.com \
  --project=$PROJECT_ID
```

Wait for all APIs to enable (may take 1-2 minutes):

```bash
# Verify all APIs are enabled
gcloud services list --enabled --project=$PROJECT_ID --filter="config.name:(
  aiplatform OR dlp OR cloudfunctions OR cloudbuild OR run OR pubsub OR
  firestore OR drive OR docs OR sheets OR chat OR storage OR cloudkms OR
  secretmanager OR eventarc OR workspaceevents
)"
```

---

## 3. Create Service Accounts

### 3a. PHI Processor Service Account

This is the main processing function's identity. It needs access to
Vertex AI, Cloud DLP, Firestore, Drive, Docs, and Sheets.

```bash
# Create the service account
gcloud iam service-accounts create phi-processor \
  --display-name="PHI Processor" \
  --description="Service account for the de-identification processing function" \
  --project=$PROJECT_ID

export PHI_PROCESSOR_SA="phi-processor@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PHI_PROCESSOR_SA}" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PHI_PROCESSOR_SA}" \
  --role="roles/dlp.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PHI_PROCESSOR_SA}" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PHI_PROCESSOR_SA}" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PHI_PROCESSOR_SA}" \
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PHI_PROCESSOR_SA}" \
  --role="roles/pubsub.subscriber"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PHI_PROCESSOR_SA}" \
  --role="roles/logging.logWriter"
```

> **Google Workspace APIs** (Drive, Docs, Sheets): These require
> domain-wide delegation. See step 8 for Drive setup. The service
> account email must be shared on the relevant Drive folders and
> Sheets files.

### 3b. Drive Watcher Service Account

Watches the PHI_Ingest folder for new files and publishes to Pub/Sub.

```bash
gcloud iam service-accounts create drive-watcher \
  --display-name="Drive Watcher" \
  --description="Watches PHI_Ingest folder for new files" \
  --project=$PROJECT_ID

export DRIVE_WATCHER_SA="drive-watcher@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${DRIVE_WATCHER_SA}" \
  --role="roles/pubsub.publisher"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${DRIVE_WATCHER_SA}" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${DRIVE_WATCHER_SA}" \
  --role="roles/logging.logWriter"
```

### 3c. Chat Bot Service Account

Handles Google Chat interactions and publishes jobs to Pub/Sub.

```bash
gcloud iam service-accounts create chat-bot \
  --display-name="Chat Bot" \
  --description="Handles Google Chat de-identification requests" \
  --project=$PROJECT_ID

export CHAT_BOT_SA="chat-bot@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CHAT_BOT_SA}" \
  --role="roles/pubsub.publisher"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CHAT_BOT_SA}" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CHAT_BOT_SA}" \
  --role="roles/chat.bot"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CHAT_BOT_SA}" \
  --role="roles/logging.logWriter"
```

---

## 4. Set Up Cloud KMS

Cloud KMS provides Customer-Managed Encryption Keys (CMEK) for
Firestore and Cloud Storage, ensuring PHI data is encrypted with
keys we control.

```bash
# Create a key ring
gcloud kms keyrings create phi-keyring \
  --location=$REGION \
  --project=$PROJECT_ID

# Create the encryption key
gcloud kms keys create phi-data-key \
  --keyring=phi-keyring \
  --location=$REGION \
  --purpose=encryption \
  --rotation-period=90d \
  --next-rotation-time=$(date -u -d "+90 days" +%Y-%m-%dT%H:%M:%SZ) \
  --project=$PROJECT_ID

export KMS_KEY="projects/${PROJECT_ID}/locations/${REGION}/keyRings/phi-keyring/cryptoKeys/phi-data-key"

# Grant the Firestore service agent access to the key
# The Firestore service agent email follows this pattern:
export FIRESTORE_SA="service-$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@gcp-sa-firestore.iam.gserviceaccount.com"

gcloud kms keys add-iam-policy-binding phi-data-key \
  --keyring=phi-keyring \
  --location=$REGION \
  --member="serviceAccount:${FIRESTORE_SA}" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" \
  --project=$PROJECT_ID

# Grant the Cloud Storage service agent access to the key
export STORAGE_SA="service-$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@gs-project-accounts.iam.gserviceaccount.com"

gcloud kms keys add-iam-policy-binding phi-data-key \
  --keyring=phi-keyring \
  --location=$REGION \
  --member="serviceAccount:${STORAGE_SA}" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" \
  --project=$PROJECT_ID
```

Verify the key:

```bash
gcloud kms keys describe phi-data-key \
  --keyring=phi-keyring \
  --location=$REGION \
  --project=$PROJECT_ID
```

---

## 5. Set Up Firestore

Create a Firestore database with CMEK encryption for storing PHI mappings.

```bash
# Create the Firestore database with CMEK
gcloud firestore databases create \
  --database=phi-mappings \
  --location=$REGION \
  --type=firestore-native \
  --kms-key-name=$KMS_KEY \
  --project=$PROJECT_ID
```

### Configure TTL Policy

The `expire_at` field on job documents enables automatic cleanup:

```bash
# Create TTL policy on the deid_jobs collection
gcloud firestore fields ttls update expire_at \
  --collection-group=deid_jobs \
  --database=phi-mappings \
  --project=$PROJECT_ID

# Create TTL policy on the mappings subcollection
gcloud firestore fields ttls update expire_at \
  --collection-group=mappings \
  --database=phi-mappings \
  --project=$PROJECT_ID
```

### Security Rules

Create `firestore.rules` in the project root:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all client access - only service accounts should access this data
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules:

```bash
# If using Firebase CLI
firebase deploy --only firestore:rules --project=$PROJECT_ID

# Or via gcloud (Firestore native mode uses IAM, not security rules,
# so the above rules are a defense-in-depth measure if Firebase SDK is used)
```

> **Note**: In Firestore Native mode with server-side access only,
> IAM roles are the primary access control. The security rules above
> are a safety net to block any accidental client-side access.

---

## 6. Set Up Pub/Sub

```bash
# Create the main job processing topic
gcloud pubsub topics create phi-deid-jobs \
  --project=$PROJECT_ID

# Create the Drive file events topic
gcloud pubsub topics create drive-file-events \
  --project=$PROJECT_ID

# Create subscription for the processor function
# (Cloud Functions gen2 creates its own subscription via Eventarc,
#  but we create an explicit one for monitoring/debugging)
gcloud pubsub subscriptions create phi-deid-jobs-sub \
  --topic=phi-deid-jobs \
  --ack-deadline=300 \
  --message-retention-duration=24h \
  --expiration-period=never \
  --project=$PROJECT_ID

# Create subscription for the drive watcher
gcloud pubsub subscriptions create drive-file-events-sub \
  --topic=drive-file-events \
  --ack-deadline=60 \
  --message-retention-duration=24h \
  --expiration-period=never \
  --project=$PROJECT_ID

# Create dead-letter topic for failed messages
gcloud pubsub topics create phi-deid-jobs-dlq \
  --project=$PROJECT_ID

gcloud pubsub subscriptions create phi-deid-jobs-dlq-sub \
  --topic=phi-deid-jobs-dlq \
  --project=$PROJECT_ID

# Update main subscription with dead-letter policy
gcloud pubsub subscriptions update phi-deid-jobs-sub \
  --dead-letter-topic=phi-deid-jobs-dlq \
  --max-delivery-attempts=5 \
  --project=$PROJECT_ID
```

Verify:

```bash
gcloud pubsub topics list --project=$PROJECT_ID
gcloud pubsub subscriptions list --project=$PROJECT_ID
```

---

## 7. Set Up Cloud Storage

Create a staging bucket for temporary file storage during processing.
Files are automatically deleted after 24 hours.

```bash
# Create the staging bucket with CMEK
gcloud storage buckets create gs://tke-phi-staging \
  --location=$REGION \
  --default-encryption-key=$KMS_KEY \
  --uniform-bucket-level-access \
  --project=$PROJECT_ID

# Set lifecycle rule: delete objects after 24 hours
cat > /tmp/lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 1}
    }
  ]
}
EOF

gcloud storage buckets update gs://tke-phi-staging \
  --lifecycle-file=/tmp/lifecycle.json

rm /tmp/lifecycle.json

# Verify
gcloud storage buckets describe gs://tke-phi-staging
```

---

## 8. Set Up Google Drive

### 8a. Create Folder Structure

In Google Drive (via the web UI or API), create the following folders:

1. **PHI_Ingest** - Where users drop files containing PHI
2. **De-Identified** - Where de-identified output docs are saved
3. **PHI_Mappings_INTERNAL** - Internal-only folder for mapping references

```bash
# Note the folder IDs after creation. You'll need them for env vars:
# INGEST_FOLDER_ID, OUTPUT_FOLDER_ID, MAPPING_FOLDER_ID
```

### 8b. Share Folders with Service Accounts

Share each folder with the appropriate service account:

| Folder | Service Account | Permission |
|--------|----------------|------------|
| PHI_Ingest | `drive-watcher@...` | Viewer |
| PHI_Ingest | `phi-processor@...` | Viewer |
| De-Identified | `phi-processor@...` | Editor |
| PHI_Mappings_INTERNAL | `phi-processor@...` | Editor |

> **Important**: Share via the Google Drive web UI. Right-click the folder
> -> Share -> Add the service account email with the appropriate role.

### 8c. Set Up Workspace Events Subscription

To receive notifications when files are added to PHI_Ingest:

```bash
# Option 1: Google Workspace Events API (recommended for Workspace)
# This requires Workspace admin setup. See:
# https://developers.google.com/workspace/events/guides/create-subscription

# Option 2: Drive API push notifications (simpler, shorter-lived)
# The drive-watcher function can poll or use Drive API watch channels.
# See the drive-watcher function code for implementation details.
```

---

## 9. Set Up Google Chat Bot

### 9a. Configure in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com) -> **APIs & Services** -> **Google Chat API**
2. Click **Configuration**
3. Fill in:
   - **App name**: TKE De-ID Bot
   - **Avatar URL**: (optional)
   - **Description**: De-identifies clinical notes containing PHI
   - **Functionality**: Check "Receive 1:1 messages" and "Join spaces and group conversations"
   - **Connection settings**: Select "HTTP endpoint URL"
   - **HTTP endpoint URL**: Will be set after deploying the chat-bot function (Step 10)
   - **Visibility**: Make available to specific people in your org
   - **Slash commands**:
     - `/deid` - De-identify pasted text
     - `/status` - Check job status
     - `/help` - Show usage instructions

### 9b. Update Endpoint After Deployment

After deploying the chat-bot function in Step 10, update the HTTP
endpoint URL in the Chat API configuration:

```bash
# Get the chat-bot function URL
gcloud functions describe chat-bot \
  --gen2 \
  --region=$REGION \
  --format="value(serviceConfig.uri)" \
  --project=$PROJECT_ID
```

---

## 10. Deploy Cloud Functions

### Store Secrets in Secret Manager

```bash
# Store any API keys or sensitive config
echo -n "YOUR_VALUE" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy=automatic \
  --project=$PROJECT_ID

# Grant the processor SA access to secrets
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PHI_PROCESSOR_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

### Deploy All Functions

Use the deployment script:

```bash
chmod +x infra/deploy.sh
./infra/deploy.sh
```

Or deploy individually:

```bash
# Deploy deid-processor (Pub/Sub triggered)
gcloud functions deploy deid-processor \
  --gen2 \
  --region=$REGION \
  --runtime=python311 \
  --source=functions/deid-processor \
  --entry-point=process_deid_job \
  --trigger-topic=phi-deid-jobs \
  --service-account=$PHI_PROCESSOR_SA \
  --memory=1Gi \
  --timeout=300s \
  --max-instances=5 \
  --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},FIRESTORE_DATABASE=phi-mappings,AUDIT_SHEET_ID=YOUR_SHEET_ID,OUTPUT_FOLDER_ID=YOUR_FOLDER_ID" \
  --project=$PROJECT_ID

# Deploy drive-watcher (Pub/Sub triggered)
gcloud functions deploy drive-watcher \
  --gen2 \
  --region=$REGION \
  --runtime=python311 \
  --source=functions/drive-watcher \
  --entry-point=handle_drive_event \
  --trigger-topic=drive-file-events \
  --service-account=$DRIVE_WATCHER_SA \
  --memory=256Mi \
  --timeout=60s \
  --max-instances=3 \
  --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},INGEST_FOLDER_ID=YOUR_FOLDER_ID,STAGING_BUCKET=tke-phi-staging,DEID_TOPIC=phi-deid-jobs" \
  --project=$PROJECT_ID

# Deploy chat-bot (HTTP triggered)
gcloud functions deploy chat-bot \
  --gen2 \
  --region=$REGION \
  --runtime=python311 \
  --source=functions/chat-bot \
  --entry-point=handle_chat_event \
  --trigger-http \
  --allow-unauthenticated \
  --service-account=$CHAT_BOT_SA \
  --memory=256Mi \
  --timeout=60s \
  --max-instances=5 \
  --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},STAGING_BUCKET=tke-phi-staging,DEID_TOPIC=phi-deid-jobs" \
  --project=$PROJECT_ID
```

---

## 11. Create Audit Sheet

1. Create a new Google Sheet named **"TKE De-ID Audit Log"**
2. Note the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Share the sheet with `phi-processor@tke-privacy-engine.iam.gserviceaccount.com` (Editor)
4. The `sheets_writer.py` module will automatically create the header row on first use

Alternatively, set up headers manually:

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| job_id | timestamp | source | requestor | file_name | phi_count | phi_types | confidence_score | dlp_residual_count | status | output_doc_url | processing_time_ms |

```bash
# Update the deid-processor function with the sheet ID
gcloud functions deploy deid-processor \
  --gen2 \
  --region=$REGION \
  --update-env-vars="AUDIT_SHEET_ID=YOUR_SPREADSHEET_ID" \
  --project=$PROJECT_ID
```

---

## 12. Test the Pipeline

### 12a. Verify Service Accounts

```bash
# List service accounts
gcloud iam service-accounts list --project=$PROJECT_ID

# Test authentication
gcloud auth print-access-token --impersonate-service-account=$PHI_PROCESSOR_SA
```

### 12b. Test Pub/Sub

```bash
# Publish a test message
gcloud pubsub topics publish phi-deid-jobs \
  --message='{"job_id":"test_001","source":"manual","requestor":"admin@tke.com","text":"Patient John Smith DOB 01/15/1960 MRN 12345 was seen today.","file_name":"test_note.txt"}' \
  --project=$PROJECT_ID

# Check for the message (pull from debug subscription)
gcloud pubsub subscriptions pull phi-deid-jobs-sub \
  --auto-ack \
  --limit=1 \
  --project=$PROJECT_ID
```

### 12c. Test Cloud Functions

```bash
# Check function status
gcloud functions describe deid-processor --gen2 --region=$REGION --project=$PROJECT_ID
gcloud functions describe drive-watcher --gen2 --region=$REGION --project=$PROJECT_ID
gcloud functions describe chat-bot --gen2 --region=$REGION --project=$PROJECT_ID

# View recent logs
gcloud functions logs read deid-processor \
  --gen2 \
  --region=$REGION \
  --limit=20 \
  --project=$PROJECT_ID
```

### 12d. Test Firestore

```bash
# Verify the database exists
gcloud firestore databases list --project=$PROJECT_ID

# Check for test documents (after running a test job)
gcloud firestore documents list \
  --database=phi-mappings \
  --collection=deid_jobs \
  --project=$PROJECT_ID
```

### 12e. End-to-End Test

1. Drop a test file into the **PHI_Ingest** Google Drive folder
2. Watch the logs:
   ```bash
   gcloud functions logs read --gen2 --region=$REGION --project=$PROJECT_ID --limit=50
   ```
3. Verify:
   - [ ] De-identified doc appears in the **De-Identified** folder
   - [ ] Audit row appears in the Google Sheet
   - [ ] PHI mapping stored in Firestore
   - [ ] TKE provider names are preserved in the output
   - [ ] All patient PHI is replaced with placeholders

### 12f. Test via Chat Bot

1. Open Google Chat
2. Find the **TKE De-ID Bot**
3. Send: `/deid Patient John Smith DOB 01/15/1960 was seen by Dr. Mulay today.`
4. Verify the bot responds with de-identified text

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `GCP_PROJECT_ID` | GCP project ID | `tke-privacy-engine` |
| `FIRESTORE_DATABASE` | Firestore database name | `phi-mappings` |
| `AUDIT_SHEET_ID` | Google Sheets spreadsheet ID | `1BxiMVs0XRA5nFMdKvBd...` |
| `OUTPUT_FOLDER_ID` | De-Identified Drive folder ID | `1a2b3c4d5e6f...` |
| `INGEST_FOLDER_ID` | PHI_Ingest Drive folder ID | `7g8h9i0j1k2l...` |
| `MAPPING_FOLDER_ID` | PHI_Mappings Drive folder ID | `3m4n5o6p7q8r...` |
| `STAGING_BUCKET` | GCS staging bucket name | `tke-phi-staging` |
| `DEID_TOPIC` | Pub/Sub topic for jobs | `phi-deid-jobs` |
| `KMS_KEY` | Cloud KMS key resource name | `projects/.../cryptoKeys/phi-data-key` |

---

## Troubleshooting

### Common Issues

**"Permission denied" on Drive/Docs/Sheets**
- Ensure the service account email is shared on the folder/file
- Check that domain-wide delegation is configured if needed

**"CMEK key not found"**
- Verify the KMS key exists: `gcloud kms keys list --keyring=phi-keyring --location=$REGION`
- Ensure the Firestore/Storage service agents have `cryptoKeyEncrypterDecrypter` role

**Cloud Function not triggering**
- Check Pub/Sub subscription: `gcloud pubsub subscriptions list`
- Verify Eventarc trigger: `gcloud eventarc triggers list --location=$REGION`
- Check function logs for errors

**Firestore TTL not deleting documents**
- TTL deletions can be delayed up to 24 hours after expiration
- Verify TTL policy: `gcloud firestore fields ttls list --database=phi-mappings`

### Useful Debug Commands

```bash
# View all IAM bindings for a service account
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:phi-processor@" \
  --format="table(bindings.role)"

# Check Cloud Function environment
gcloud functions describe deid-processor --gen2 --region=$REGION \
  --format="yaml(serviceConfig.environmentVariables)"

# Monitor Pub/Sub message backlog
gcloud pubsub subscriptions describe phi-deid-jobs-sub \
  --format="value(numUndeliveredMessages)"
```
