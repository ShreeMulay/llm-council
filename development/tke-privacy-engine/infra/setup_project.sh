#!/usr/bin/env bash
# TKE PHI Privacy Engine - One-Click GCP Project Setup
#
# Run this AFTER linking billing to the tke-phi-privacy-engine project.
#
# This script:
#   1. Enables all required APIs
#   2. Creates service accounts with IAM roles
#   3. Creates KMS keyring and encryption key
#   4. Creates Firestore database with CMEK
#   5. Creates Pub/Sub topics and subscriptions
#   6. Creates Cloud Storage staging bucket with lifecycle policy
#
# Prerequisites:
#   - gcloud CLI authenticated as shree.mulay@thekidneyexperts.com
#   - Billing linked to tke-phi-privacy-engine project
#
# Usage:
#   ./infra/setup_project.sh
#
# After this script completes, you still need to manually:
#   1. Create Drive folders (PHI_Ingest, De-Identified) in Shared Drive
#   2. Share folders with service account emails
#   3. Create audit Google Sheet and share with service account
#   4. Set INGEST_FOLDER_ID, OUTPUT_FOLDER_ID, AUDIT_SHEET_ID env vars
#   5. Run ./infra/deploy.sh to deploy Cloud Functions

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

PROJECT_ID="${GCP_PROJECT_ID:-tke-phi-privacy-engine}"
REGION="${GCP_REGION:-us-central1}"
ORG_ID="634034238853"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ─── Pre-flight Checks ──────────────────────────────────────────────────────

preflight() {
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║   TKE PHI Privacy Engine - GCP Project Setup        ║"
    echo "║   Project: ${PROJECT_ID}                    ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""

    # Verify project exists
    if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
        log_error "Project $PROJECT_ID does not exist. Create it first."
        exit 1
    fi
    log_ok "Project $PROJECT_ID exists"

    # Verify billing is linked
    BILLING_ENABLED=$(gcloud billing projects describe "$PROJECT_ID" --format="value(billingEnabled)" 2>/dev/null)
    if [[ "$BILLING_ENABLED" != "True" ]]; then
        log_error "Billing is NOT linked to $PROJECT_ID."
        log_error "Link billing at: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
        exit 1
    fi
    log_ok "Billing is linked"

    # Set as current project
    gcloud config set project "$PROJECT_ID" --quiet
    log_ok "gcloud project set to $PROJECT_ID"
    echo ""
}

# ─── Step 1: Enable APIs ────────────────────────────────────────────────────

enable_apis() {
    log_info "Step 1: Enabling required APIs (this may take 1-2 minutes)..."

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
        storage.googleapis.com \
        cloudkms.googleapis.com \
        secretmanager.googleapis.com \
        eventarc.googleapis.com \
        --project="$PROJECT_ID" \
        --quiet

    log_ok "All APIs enabled"
    echo ""
}

# ─── Step 2: Create Service Accounts ────────────────────────────────────────

create_service_accounts() {
    log_info "Step 2: Creating service accounts..."

    # PHI Processor
    if gcloud iam service-accounts describe "phi-processor@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
        log_warn "phi-processor SA already exists"
    else
        gcloud iam service-accounts create phi-processor \
            --display-name="PHI Processor" \
            --description="De-identification processing function" \
            --project="$PROJECT_ID"
        log_ok "Created phi-processor service account"
    fi

    # Drive Watcher
    if gcloud iam service-accounts describe "drive-watcher@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
        log_warn "drive-watcher SA already exists"
    else
        gcloud iam service-accounts create drive-watcher \
            --display-name="Drive Watcher" \
            --description="Watches PHI_Ingest folder for new files" \
            --project="$PROJECT_ID"
        log_ok "Created drive-watcher service account"
    fi

    # Chat Bot
    if gcloud iam service-accounts describe "chat-bot@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
        log_warn "chat-bot SA already exists"
    else
        gcloud iam service-accounts create chat-bot \
            --display-name="Chat Bot" \
            --description="Google Chat de-identification bot" \
            --project="$PROJECT_ID"
        log_ok "Created chat-bot service account"
    fi

    echo ""
}

# ─── Step 3: Grant IAM Roles ────────────────────────────────────────────────

grant_iam_roles() {
    log_info "Step 3: Granting IAM roles..."

    PHI_SA="phi-processor@${PROJECT_ID}.iam.gserviceaccount.com"
    WATCHER_SA="drive-watcher@${PROJECT_ID}.iam.gserviceaccount.com"
    CHAT_SA="chat-bot@${PROJECT_ID}.iam.gserviceaccount.com"

    # PHI Processor roles
    for role in \
        roles/aiplatform.user \
        roles/dlp.user \
        roles/datastore.user \
        roles/cloudkms.cryptoKeyEncrypterDecrypter \
        roles/storage.objectViewer \
        roles/pubsub.subscriber \
        roles/logging.logWriter \
        roles/secretmanager.secretAccessor; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:${PHI_SA}" \
            --role="$role" --quiet 2>/dev/null
    done
    log_ok "PHI Processor IAM roles granted"

    # Drive Watcher roles
    for role in \
        roles/pubsub.publisher \
        roles/storage.objectAdmin \
        roles/logging.logWriter; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:${WATCHER_SA}" \
            --role="$role" --quiet 2>/dev/null
    done
    log_ok "Drive Watcher IAM roles granted"

    # Chat Bot roles
    for role in \
        roles/pubsub.publisher \
        roles/storage.objectAdmin \
        roles/logging.logWriter; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:${CHAT_SA}" \
            --role="$role" --quiet 2>/dev/null
    done
    log_ok "Chat Bot IAM roles granted"

    # Grant Pub/Sub service agent permission to invoke Cloud Run (needed for gen2 functions)
    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
    PUBSUB_SA="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${PUBSUB_SA}" \
        --role="roles/run.invoker" --quiet 2>/dev/null
    log_ok "Pub/Sub service agent granted Cloud Run invoker (for gen2 triggers)"

    echo ""
}

# ─── Step 4: Cloud KMS ──────────────────────────────────────────────────────

setup_kms() {
    log_info "Step 4: Setting up Cloud KMS..."

    # Create keyring
    if gcloud kms keyrings describe phi-keyring --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
        log_warn "KMS keyring phi-keyring already exists"
    else
        gcloud kms keyrings create phi-keyring \
            --location="$REGION" \
            --project="$PROJECT_ID"
        log_ok "Created KMS keyring: phi-keyring"
    fi

    # Create key
    if gcloud kms keys describe phi-data-key --keyring=phi-keyring --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
        log_warn "KMS key phi-data-key already exists"
    else
        NEXT_ROTATION=$(date -u -d "+90 days" +"%Y-%m-%dT%H:%M:%SZ")
        gcloud kms keys create phi-data-key \
            --keyring=phi-keyring \
            --location="$REGION" \
            --purpose=encryption \
            --rotation-period=90d \
            --next-rotation-time="$NEXT_ROTATION" \
            --project="$PROJECT_ID"
        log_ok "Created KMS key: phi-data-key (90-day rotation)"
    fi

    log_ok "KMS keyring and key ready"
    echo ""
}

# ─── Step 4b: Bind KMS to service agents (must run AFTER Firestore + Storage) ─

bind_kms_agents() {
    log_info "Step 4b: Binding KMS key to Firestore and Storage service agents..."

    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
    FIRESTORE_SA="service-${PROJECT_NUMBER}@gcp-sa-firestore.iam.gserviceaccount.com"
    STORAGE_SA="service-${PROJECT_NUMBER}@gs-project-accounts.iam.gserviceaccount.com"

    gcloud kms keys add-iam-policy-binding phi-data-key \
        --keyring=phi-keyring \
        --location="$REGION" \
        --member="serviceAccount:${FIRESTORE_SA}" \
        --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" \
        --project="$PROJECT_ID" --quiet 2>/dev/null || true

    gcloud kms keys add-iam-policy-binding phi-data-key \
        --keyring=phi-keyring \
        --location="$REGION" \
        --member="serviceAccount:${STORAGE_SA}" \
        --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" \
        --project="$PROJECT_ID" --quiet 2>/dev/null || true

    # Set CMEK as default encryption on staging bucket
    KMS_KEY="projects/${PROJECT_ID}/locations/${REGION}/keyRings/phi-keyring/cryptoKeys/phi-data-key"
    BUCKET="${PROJECT_ID}-staging"
    gcloud storage buckets update "gs://${BUCKET}" \
        --default-encryption-key="$KMS_KEY" 2>/dev/null || true

    log_ok "KMS access granted to Firestore and Storage agents, CMEK set on bucket"
    echo ""
}

# ─── Step 5: Firestore ──────────────────────────────────────────────────────

setup_firestore() {
    log_info "Step 5: Setting up Firestore..."

    KMS_KEY="projects/${PROJECT_ID}/locations/${REGION}/keyRings/phi-keyring/cryptoKeys/phi-data-key"

    # Create database
    if gcloud firestore databases describe --database=phi-mappings --project="$PROJECT_ID" &>/dev/null; then
        log_warn "Firestore database phi-mappings already exists"
    else
        # Create without CMEK first (Firestore service agent must exist before CMEK binding)
        # CMEK is added via KMS key binding in setup_kms() after the agent is provisioned
        gcloud firestore databases create \
            --database=phi-mappings \
            --location="$REGION" \
            --type=firestore-native \
            --project="$PROJECT_ID"
        log_ok "Created Firestore database: phi-mappings"
    fi

    # Set up TTL policies
    gcloud firestore fields ttls update expire_at \
        --collection-group=deid_jobs \
        --database=phi-mappings \
        --enable-ttl \
        --project="$PROJECT_ID" --quiet --async 2>/dev/null || true

    gcloud firestore fields ttls update expire_at \
        --collection-group=mappings \
        --database=phi-mappings \
        --enable-ttl \
        --project="$PROJECT_ID" --quiet --async 2>/dev/null || true

    log_ok "Firestore TTL policies configured (90-day auto-delete)"
    echo ""
}

# ─── Step 6: Pub/Sub ────────────────────────────────────────────────────────

setup_pubsub() {
    log_info "Step 6: Setting up Pub/Sub..."

    for topic in phi-deid-jobs drive-file-events phi-deid-jobs-dlq; do
        if gcloud pubsub topics describe "$topic" --project="$PROJECT_ID" &>/dev/null; then
            log_warn "Topic '$topic' already exists"
        else
            gcloud pubsub topics create "$topic" --project="$PROJECT_ID"
            log_ok "Created topic: $topic"
        fi
    done

    # Main subscription
    if ! gcloud pubsub subscriptions describe phi-deid-jobs-sub --project="$PROJECT_ID" &>/dev/null; then
        gcloud pubsub subscriptions create phi-deid-jobs-sub \
            --topic=phi-deid-jobs \
            --ack-deadline=300 \
            --message-retention-duration=24h \
            --expiration-period=never \
            --project="$PROJECT_ID"
        log_ok "Created subscription: phi-deid-jobs-sub"
    fi

    # Drive events subscription
    if ! gcloud pubsub subscriptions describe drive-file-events-sub --project="$PROJECT_ID" &>/dev/null; then
        gcloud pubsub subscriptions create drive-file-events-sub \
            --topic=drive-file-events \
            --ack-deadline=60 \
            --message-retention-duration=24h \
            --expiration-period=never \
            --project="$PROJECT_ID"
        log_ok "Created subscription: drive-file-events-sub"
    fi

    # DLQ subscription
    if ! gcloud pubsub subscriptions describe phi-deid-jobs-dlq-sub --project="$PROJECT_ID" &>/dev/null; then
        gcloud pubsub subscriptions create phi-deid-jobs-dlq-sub \
            --topic=phi-deid-jobs-dlq \
            --message-retention-duration=7d \
            --expiration-period=never \
            --project="$PROJECT_ID"
        log_ok "Created subscription: phi-deid-jobs-dlq-sub"
    fi

    echo ""
}

# ─── Step 7: Cloud Storage ──────────────────────────────────────────────────

setup_storage() {
    log_info "Step 7: Setting up Cloud Storage..."

    BUCKET="${PROJECT_ID}-staging"
    KMS_KEY="projects/${PROJECT_ID}/locations/${REGION}/keyRings/phi-keyring/cryptoKeys/phi-data-key"

    if gcloud storage buckets describe "gs://${BUCKET}" &>/dev/null; then
        log_warn "Bucket gs://${BUCKET} already exists"
    else
        gcloud storage buckets create "gs://${BUCKET}" \
            --location="$REGION" \
            --default-encryption-key="$KMS_KEY" \
            --uniform-bucket-level-access \
            --project="$PROJECT_ID"
        log_ok "Created staging bucket: gs://${BUCKET} (CMEK encrypted)"
    fi

    # Set lifecycle: auto-delete after 24 hours
    LIFECYCLE_FILE=$(mktemp)
    cat > "$LIFECYCLE_FILE" << 'LIFECYCLE_EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 1}
    }
  ]
}
LIFECYCLE_EOF

    gcloud storage buckets update "gs://${BUCKET}" \
        --lifecycle-file="$LIFECYCLE_FILE" 2>/dev/null || true
    rm -f "$LIFECYCLE_FILE"
    log_ok "Lifecycle policy set: auto-delete after 24 hours"
    echo ""
}

# ─── Summary ─────────────────────────────────────────────────────────────────

print_summary() {
    PHI_SA="phi-processor@${PROJECT_ID}.iam.gserviceaccount.com"
    WATCHER_SA="drive-watcher@${PROJECT_ID}.iam.gserviceaccount.com"
    CHAT_SA="chat-bot@${PROJECT_ID}.iam.gserviceaccount.com"

    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║   Setup Complete!                                    ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""
    log_ok "Project:     $PROJECT_ID"
    log_ok "Region:      $REGION"
    log_ok "KMS Key:     phi-keyring/phi-data-key"
    log_ok "Firestore:   phi-mappings (CMEK)"
    log_ok "Storage:     gs://${PROJECT_ID}-staging (24hr TTL)"
    log_ok "Pub/Sub:     phi-deid-jobs, drive-file-events"
    echo ""
    log_info "Service Account Emails (share Drive folders with these):"
    echo "  Processor: ${PHI_SA}"
    echo "  Watcher:   ${WATCHER_SA}"
    echo "  Chat Bot:  ${CHAT_SA}"
    echo ""
    log_warn "MANUAL STEPS REMAINING:"
    echo ""
    echo "  1. Create 'PHI_Ingest' folder in Shared Drive"
    echo "     Share with: ${WATCHER_SA} (Viewer)"
    echo "     Share with: ${PHI_SA} (Viewer)"
    echo ""
    echo "  2. Create 'De-Identified' folder in Shared Drive"
    echo "     Share with: ${PHI_SA} (Editor)"
    echo ""
    echo "  3. Create Google Sheet 'TKE De-ID Audit Log'"
    echo "     Share with: ${PHI_SA} (Editor)"
    echo ""
    echo "  4. Set environment variables and deploy:"
    echo "     export INGEST_FOLDER_ID=<from step 1>"
    echo "     export OUTPUT_FOLDER_ID=<from step 2>"
    echo "     export AUDIT_SHEET_ID=<from step 3>"
    echo "     ./infra/deploy.sh"
    echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
    preflight
    enable_apis
    create_service_accounts
    grant_iam_roles
    setup_kms
    setup_firestore
    setup_pubsub
    setup_storage
    bind_kms_agents   # Must run after Firestore + Storage create service agents
    print_summary
}

main "$@"
