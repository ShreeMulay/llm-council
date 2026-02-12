#!/usr/bin/env bash
# TKE Privacy Engine - Cloud Functions Deployment Script
#
# Deploys Cloud Functions (gen2) to GCP:
#   1. deid-processor  - Pub/Sub triggered, processes de-identification jobs
#   2. drive-watcher   - Pub/Sub triggered, watches Drive for new files (push)
#   3. drive-poller    - HTTP triggered, polls Drive for new files (Cloud Scheduler)
#   4. chat-bot        - HTTP triggered, handles Google Chat interactions
#
# Usage:
#   ./infra/deploy.sh              # Deploy all functions
#   ./infra/deploy.sh processor    # Deploy only deid-processor
#   ./infra/deploy.sh watcher      # Deploy only drive-watcher
#   ./infra/deploy.sh poller       # Deploy only drive-poller + Cloud Scheduler
#   ./infra/deploy.sh chatbot      # Deploy only chat-bot

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

PROJECT_ID="${GCP_PROJECT_ID:-tke-phi-privacy-engine}"
REGION="${GCP_REGION:-us-central1}"

# Service accounts
PHI_PROCESSOR_SA="phi-processor@${PROJECT_ID}.iam.gserviceaccount.com"
DRIVE_WATCHER_SA="drive-watcher@${PROJECT_ID}.iam.gserviceaccount.com"
CHAT_BOT_SA="chat-bot@${PROJECT_ID}.iam.gserviceaccount.com"

# Resource IDs (set these via env vars or update defaults)
AUDIT_SHEET_ID="${AUDIT_SHEET_ID:?Error: AUDIT_SHEET_ID env var is required}"
OUTPUT_FOLDER_ID="${OUTPUT_FOLDER_ID:?Error: OUTPUT_FOLDER_ID env var is required}"
INGEST_FOLDER_ID="${INGEST_FOLDER_ID:?Error: INGEST_FOLDER_ID env var is required}"
STAGING_BUCKET="${STAGING_BUCKET:-tke-phi-privacy-engine-staging}"
DEID_TOPIC="${DEID_TOPIC:-phi-deid-jobs}"
DRIVE_TOPIC="${DRIVE_TOPIC:-drive-file-events}"
FIRESTORE_DATABASE="${FIRESTORE_DATABASE:-phi-mappings}"

# ─── Colors ──────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ─── Deploy Functions ────────────────────────────────────────────────────────

deploy_processor() {
    log_info "Deploying deid-processor..."

    gcloud functions deploy deid-processor \
        --gen2 \
        --region="$REGION" \
        --runtime=python311 \
        --source=functions/deid-processor \
        --entry-point=deid_pubsub \
        --trigger-topic="$DEID_TOPIC" \
        --service-account="$PHI_PROCESSOR_SA" \
        --memory=1Gi \
        --timeout=300s \
        --min-instances=0 \
        --max-instances=5 \
        --set-env-vars="\
GCP_PROJECT_ID=${PROJECT_ID},\
GCP_REGION=${REGION},\
FIRESTORE_DATABASE=${FIRESTORE_DATABASE},\
AUDIT_SHEET_ID=${AUDIT_SHEET_ID},\
OUTPUT_FOLDER_ID=${OUTPUT_FOLDER_ID},\
INGEST_FOLDER_ID=${INGEST_FOLDER_ID}" \
        --project="$PROJECT_ID" \
        --quiet

    log_ok "deid-processor deployed successfully"
}

deploy_watcher() {
    log_info "Deploying drive-watcher..."

    gcloud functions deploy drive-watcher \
        --gen2 \
        --region="$REGION" \
        --runtime=python311 \
        --source=functions/drive-watcher \
        --entry-point=drive_watcher \
        --trigger-topic="$DRIVE_TOPIC" \
        --service-account="$DRIVE_WATCHER_SA" \
        --memory=256Mi \
        --timeout=60s \
        --min-instances=0 \
        --max-instances=3 \
        --set-env-vars="\
GCP_PROJECT_ID=${PROJECT_ID},\
INGEST_FOLDER_ID=${INGEST_FOLDER_ID},\
STAGING_BUCKET=${STAGING_BUCKET},\
DEID_TOPIC=${DEID_TOPIC}" \
        --project="$PROJECT_ID" \
        --quiet

    log_ok "drive-watcher deployed successfully"
}

deploy_poller() {
    log_info "Deploying drive-poller (HTTP endpoint for Cloud Scheduler)..."

    gcloud functions deploy drive-poller \
        --gen2 \
        --region="$REGION" \
        --runtime=python311 \
        --source=functions/drive-watcher \
        --entry-point=drive_poller \
        --trigger-http \
        --no-allow-unauthenticated \
        --service-account="$DRIVE_WATCHER_SA" \
        --memory=256Mi \
        --timeout=120s \
        --min-instances=0 \
        --max-instances=1 \
        --set-env-vars="\
GCP_PROJECT_ID=${PROJECT_ID},\
INGEST_FOLDER_ID=${INGEST_FOLDER_ID},\
OUTPUT_FOLDER_ID=${OUTPUT_FOLDER_ID},\
STAGING_BUCKET=${STAGING_BUCKET},\
DEID_TOPIC=${DEID_TOPIC}" \
        --project="$PROJECT_ID" \
        --quiet

    POLLER_URL=$(gcloud functions describe drive-poller \
        --gen2 \
        --region="$REGION" \
        --format="value(serviceConfig.uri)" \
        --project="$PROJECT_ID")

    log_ok "drive-poller deployed: ${POLLER_URL}"

    # Create or update Cloud Scheduler job (every 5 minutes)
    log_info "Setting up Cloud Scheduler job..."

    if gcloud scheduler jobs describe phi-drive-poll \
        --location="$REGION" \
        --project="$PROJECT_ID" &>/dev/null; then
        gcloud scheduler jobs update http phi-drive-poll \
            --location="$REGION" \
            --schedule="*/5 * * * *" \
            --uri="${POLLER_URL}" \
            --http-method=POST \
            --oidc-service-account-email="$DRIVE_WATCHER_SA" \
            --oidc-token-audience="${POLLER_URL}" \
            --project="$PROJECT_ID" \
            --quiet
        log_ok "Cloud Scheduler job updated"
    else
        gcloud scheduler jobs create http phi-drive-poll \
            --location="$REGION" \
            --schedule="*/5 * * * *" \
            --uri="${POLLER_URL}" \
            --http-method=POST \
            --oidc-service-account-email="$DRIVE_WATCHER_SA" \
            --oidc-token-audience="${POLLER_URL}" \
            --time-zone="America/Chicago" \
            --description="Poll PHI_Ingest Drive folder for new files every 5 minutes" \
            --project="$PROJECT_ID" \
            --quiet
        log_ok "Cloud Scheduler job created (every 5 min)"
    fi
}

deploy_chatbot() {
    log_info "Deploying chat-bot..."

    gcloud functions deploy chat-bot \
        --gen2 \
        --region="$REGION" \
        --runtime=python311 \
        --source=functions/chat-bot \
        --entry-point=chat_bot \
        --trigger-http \
        --allow-unauthenticated \
        --service-account="$CHAT_BOT_SA" \
        --memory=256Mi \
        --timeout=60s \
        --min-instances=0 \
        --max-instances=5 \
        --set-env-vars="\
GCP_PROJECT_ID=${PROJECT_ID},\
STAGING_BUCKET=${STAGING_BUCKET},\
DEID_TOPIC=${DEID_TOPIC}" \
        --project="$PROJECT_ID" \
        --quiet

    CHAT_URL=$(gcloud functions describe chat-bot \
        --gen2 \
        --region="$REGION" \
        --format="value(serviceConfig.uri)" \
        --project="$PROJECT_ID")

    log_ok "chat-bot deployed successfully"
    log_info "Chat bot URL: ${CHAT_URL}"
    log_warn "Update the Google Chat API configuration with this URL"
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
    local target="${1:-all}"

    echo ""
    echo "╔══════════════════════════════════════════════╗"
    echo "║   TKE Privacy Engine - Function Deployment   ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""
    log_info "Project:  ${PROJECT_ID}"
    log_info "Region:   ${REGION}"
    log_info "Target:   ${target}"
    echo ""

    # Verify gcloud is configured
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
    if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
        log_warn "Current gcloud project is '${CURRENT_PROJECT}', expected '${PROJECT_ID}'"
        log_info "Setting project to ${PROJECT_ID}..."
        gcloud config set project "$PROJECT_ID"
    fi

    case "$target" in
        processor)
            deploy_processor
            ;;
        watcher)
            deploy_watcher
            ;;
        poller)
            deploy_poller
            ;;
        chatbot)
            deploy_chatbot
            ;;
        all)
            deploy_processor
            echo ""
            deploy_watcher
            echo ""
            deploy_poller
            echo ""
            deploy_chatbot
            ;;
        *)
            log_error "Unknown target: ${target}"
            echo "Usage: $0 [processor|watcher|poller|chatbot|all]"
            exit 1
            ;;
    esac

    echo ""
    log_ok "Deployment complete!"
    echo ""

    # Show function status
    log_info "Function status:"
    gcloud functions list --v2 --regions="$REGION" --project="$PROJECT_ID" \
        --format="table(name, state, serviceConfig.uri)"
}

main "$@"
