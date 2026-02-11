#!/usr/bin/env bash
# TKE Privacy Engine - Cloud Storage Setup Script
#
# Creates the GCS staging bucket with:
#   - CMEK encryption (Cloud KMS)
#   - 24-hour lifecycle deletion policy
#   - Uniform bucket-level access
#
# Usage:
#   ./infra/setup_storage.sh

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

PROJECT_ID="${GCP_PROJECT_ID:-tke-phi-privacy-engine}"
REGION="${GCP_REGION:-us-central1}"
BUCKET_NAME="${STAGING_BUCKET:-tke-phi-privacy-engine-staging}"
KMS_KEYRING="phi-keyring"
KMS_KEY="phi-data-key"
KMS_KEY_PATH="projects/${PROJECT_ID}/locations/${REGION}/keyRings/${KMS_KEYRING}/cryptoKeys/${KMS_KEY}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ─── Verify KMS Key ─────────────────────────────────────────────────────────

verify_kms_key() {
    log_info "Verifying KMS key exists..."

    if gcloud kms keys describe "$KMS_KEY" \
        --keyring="$KMS_KEYRING" \
        --location="$REGION" \
        --project="$PROJECT_ID" &>/dev/null; then
        log_ok "KMS key '${KMS_KEY}' found in keyring '${KMS_KEYRING}'"
    else
        log_error "KMS key not found. Run the KMS setup from docs/GCP_SETUP_GUIDE.md first."
        exit 1
    fi
}

# ─── Grant KMS Access to Storage Service Agent ──────────────────────────────

grant_kms_access() {
    log_info "Granting KMS access to Cloud Storage service agent..."

    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
    STORAGE_SA="service-${PROJECT_NUMBER}@gs-project-accounts.iam.gserviceaccount.com"

    gcloud kms keys add-iam-policy-binding "$KMS_KEY" \
        --keyring="$KMS_KEYRING" \
        --location="$REGION" \
        --member="serviceAccount:${STORAGE_SA}" \
        --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" \
        --project="$PROJECT_ID" \
        --quiet

    log_ok "KMS access granted to Storage service agent"
}

# ─── Create Bucket ───────────────────────────────────────────────────────────

create_bucket() {
    log_info "Creating staging bucket gs://${BUCKET_NAME}..."

    if gcloud storage buckets describe "gs://${BUCKET_NAME}" &>/dev/null; then
        log_warn "Bucket gs://${BUCKET_NAME} already exists"
    else
        gcloud storage buckets create "gs://${BUCKET_NAME}" \
            --location="$REGION" \
            --default-encryption-key="$KMS_KEY_PATH" \
            --uniform-bucket-level-access \
            --project="$PROJECT_ID"
        log_ok "Created bucket gs://${BUCKET_NAME}"
    fi
}

# ─── Set Lifecycle Policy ───────────────────────────────────────────────────

set_lifecycle() {
    log_info "Setting 24-hour lifecycle deletion policy..."

    LIFECYCLE_FILE=$(mktemp)
    cat > "$LIFECYCLE_FILE" << 'EOF'
{
  "rule": [
    {
      "action": {
        "type": "Delete"
      },
      "condition": {
        "age": 1
      }
    }
  ]
}
EOF

    gcloud storage buckets update "gs://${BUCKET_NAME}" \
        --lifecycle-file="$LIFECYCLE_FILE"

    rm -f "$LIFECYCLE_FILE"
    log_ok "Lifecycle policy set: objects deleted after 24 hours"
}

# ─── Set CORS (if needed for direct uploads) ────────────────────────────────

set_cors() {
    log_info "Setting CORS policy (disabled by default for security)..."

    # CORS is intentionally restrictive - files should only be uploaded
    # via service accounts, not directly from browsers.
    CORS_FILE=$(mktemp)
    cat > "$CORS_FILE" << 'EOF'
[]
EOF

    gcloud storage buckets update "gs://${BUCKET_NAME}" \
        --cors-file="$CORS_FILE"

    rm -f "$CORS_FILE"
    log_ok "CORS policy set (no cross-origin access allowed)"
}

# ─── Verify ──────────────────────────────────────────────────────────────────

verify_bucket() {
    log_info "Verifying bucket configuration..."

    echo ""
    gcloud storage buckets describe "gs://${BUCKET_NAME}" \
        --format="yaml(name, location, defaultKmsKeyName, iamConfiguration.uniformBucketLevelAccess, lifecycle)"
    echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo "╔══════════════════════════════════════════════╗"
    echo "║   TKE Privacy Engine - Storage Setup         ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""
    log_info "Project: ${PROJECT_ID}"
    log_info "Region:  ${REGION}"
    log_info "Bucket:  gs://${BUCKET_NAME}"
    log_info "KMS Key: ${KMS_KEY_PATH}"
    echo ""

    verify_kms_key
    grant_kms_access
    echo ""
    create_bucket
    set_lifecycle
    set_cors
    echo ""
    verify_bucket

    log_ok "Storage setup complete!"
}

main "$@"
