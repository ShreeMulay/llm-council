#!/bin/bash
# =============================================================================
# Premier Dialysis Policy Search — GCP Setup Script
# =============================================================================
# Run this script to set up all GCP resources.
# Prerequisites: gcloud CLI installed and authenticated
#
# Usage: ./gcp/setup.sh
# =============================================================================

set -euo pipefail

# ---- Configuration ----
PROJECT_ID="${GCP_PROJECT_ID:-premier-dialysis-search}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="premier-dialysis-search"
DRIVE_FOLDER_ID="1lWgOw9thvj5hD7qIYukgZ5DRY3OwvoK4"

echo "============================================"
echo "Premier Dialysis Policy Search — GCP Setup"
echo "============================================"
echo ""
echo "Project:  ${PROJECT_ID}"
echo "Region:   ${REGION}"
echo "Service:  ${SERVICE_NAME}"
echo ""

# ---- Step 1: Set project ----
echo "[1/7] Setting active project..."
gcloud config set project "${PROJECT_ID}"

# ---- Step 2: Enable required APIs ----
echo "[2/7] Enabling APIs..."
gcloud services enable \
  discoveryengine.googleapis.com \
  aiplatform.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  iap.googleapis.com \
  compute.googleapis.com \
  certificatemanager.googleapis.com

echo "  APIs enabled."

# ---- Step 3: Create Vertex AI Search Data Store ----
echo "[3/7] Creating Data Store..."
echo ""
echo "  NOTE: Data Store and Search App creation must be done via the"
echo "  Google Cloud Console (UI) — the gcloud CLI does not yet support"
echo "  Discovery Engine data store creation with Drive connectors."
echo ""
echo "  Steps:"
echo "    1. Go to: https://console.cloud.google.com/gen-app-builder/data-stores"
echo "    2. Click 'Create Data Store'"
echo "    3. Select 'Cloud Storage' or 'Google Drive' as source"
echo "    4. For Google Drive: enter folder ID: ${DRIVE_FOLDER_ID}"
echo "    5. Name it: 'premier-dialysis-pp'"
echo "    6. Enable: OCR, auto-chunking"
echo "    7. Click 'Create' and wait for indexing (~30 min)"
echo ""
echo "  Press Enter after completing the Data Store setup..."
read -r

# ---- Step 4: Create Search App ----
echo "[4/7] Creating Search App..."
echo ""
echo "  Steps:"
echo "    1. Go to: https://console.cloud.google.com/gen-app-builder/apps"
echo "    2. Click 'Create App'"
echo "    3. Select 'Search' app type"
echo "    4. Name: 'Premier Dialysis Policy Search'"
echo "    5. Link to data store: 'premier-dialysis-pp'"
echo "    6. Enable: 'Search with answer' (answer generation)"
echo "    7. Configure: require citations, extractive segments"
echo "    8. Enable: autocomplete, spelling correction"
echo ""
echo "  After creating, go to the 'Integration' tab and copy the Config ID."
echo ""
read -p "  Enter your Config ID: " CONFIG_ID
echo ""

# ---- Step 5: Update HTML with Config ID ----
echo "[5/7] Updating index.html with Config ID..."
if [ -f "firebase/public/index.html" ]; then
  sed -i "s/YOUR_CONFIG_ID/${CONFIG_ID}/g" firebase/public/index.html
  echo "  Updated index.html with configId: ${CONFIG_ID}"
else
  echo "  WARNING: firebase/public/index.html not found. Update manually."
fi

# ---- Step 6: Build and deploy to Cloud Run ----
echo "[6/7] Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --source=firebase/ \
  --region="${REGION}" \
  --allow-unauthenticated \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2 \
  --port=8080

CLOUD_RUN_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" \
  --format='value(status.url)')

echo "  Deployed to: ${CLOUD_RUN_URL}"
echo ""

# ---- Step 7: Summary ----
echo "[7/7] Setup complete!"
echo ""
echo "============================================"
echo "  DEPLOYMENT SUMMARY"
echo "============================================"
echo ""
echo "  Cloud Run URL:  ${CLOUD_RUN_URL}"
echo "  Config ID:      ${CONFIG_ID}"
echo "  Data Store:     premier-dialysis-pp"
echo "  Region:         ${REGION}"
echo ""
echo "  NEXT STEPS:"
echo "  1. Test the search at: ${CLOUD_RUN_URL}"
echo "  2. Set up IAP (see gcp/iap-config.md)"
echo "  3. Configure custom domain (optional)"
echo "  4. Run test queries: bun run scripts/test-queries.ts"
echo ""
echo "============================================"
