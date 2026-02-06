#!/usr/bin/env bash
# TKE Privacy Engine - Pub/Sub Setup Script
#
# Creates all Pub/Sub topics and subscriptions required by the pipeline.
#
# Topics:
#   - phi-deid-jobs       Main job processing queue
#   - drive-file-events   Drive file change notifications
#   - phi-deid-jobs-dlq   Dead-letter queue for failed jobs
#
# Usage:
#   ./infra/setup_pubsub.sh

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

PROJECT_ID="${GCP_PROJECT_ID:-tke-phi-privacy-engine}"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ─── Helper ──────────────────────────────────────────────────────────────────

topic_exists() {
    gcloud pubsub topics describe "$1" --project="$PROJECT_ID" &>/dev/null
}

sub_exists() {
    gcloud pubsub subscriptions describe "$1" --project="$PROJECT_ID" &>/dev/null
}

# ─── Create Topics ───────────────────────────────────────────────────────────

create_topics() {
    log_info "Creating Pub/Sub topics..."

    for topic in phi-deid-jobs drive-file-events phi-deid-jobs-dlq; do
        if topic_exists "$topic"; then
            log_ok "Topic '$topic' already exists"
        else
            gcloud pubsub topics create "$topic" --project="$PROJECT_ID"
            log_ok "Created topic '$topic'"
        fi
    done
}

# ─── Create Subscriptions ───────────────────────────────────────────────────

create_subscriptions() {
    log_info "Creating Pub/Sub subscriptions..."

    # Main job processing subscription
    if sub_exists "phi-deid-jobs-sub"; then
        log_ok "Subscription 'phi-deid-jobs-sub' already exists"
    else
        gcloud pubsub subscriptions create phi-deid-jobs-sub \
            --topic=phi-deid-jobs \
            --ack-deadline=300 \
            --message-retention-duration=24h \
            --expiration-period=never \
            --project="$PROJECT_ID"
        log_ok "Created subscription 'phi-deid-jobs-sub'"
    fi

    # Drive file events subscription
    if sub_exists "drive-file-events-sub"; then
        log_ok "Subscription 'drive-file-events-sub' already exists"
    else
        gcloud pubsub subscriptions create drive-file-events-sub \
            --topic=drive-file-events \
            --ack-deadline=60 \
            --message-retention-duration=24h \
            --expiration-period=never \
            --project="$PROJECT_ID"
        log_ok "Created subscription 'drive-file-events-sub'"
    fi

    # Dead-letter queue subscription
    if sub_exists "phi-deid-jobs-dlq-sub"; then
        log_ok "Subscription 'phi-deid-jobs-dlq-sub' already exists"
    else
        gcloud pubsub subscriptions create phi-deid-jobs-dlq-sub \
            --topic=phi-deid-jobs-dlq \
            --message-retention-duration=7d \
            --expiration-period=never \
            --project="$PROJECT_ID"
        log_ok "Created subscription 'phi-deid-jobs-dlq-sub'"
    fi
}

# ─── Configure Dead-Letter Policy ───────────────────────────────────────────

configure_dlq() {
    log_info "Configuring dead-letter policy on phi-deid-jobs-sub..."

    gcloud pubsub subscriptions update phi-deid-jobs-sub \
        --dead-letter-topic=phi-deid-jobs-dlq \
        --max-delivery-attempts=5 \
        --project="$PROJECT_ID"

    # Grant Pub/Sub service account permission to publish to DLQ
    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
    PUBSUB_SA="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"

    gcloud pubsub topics add-iam-policy-binding phi-deid-jobs-dlq \
        --member="serviceAccount:${PUBSUB_SA}" \
        --role="roles/pubsub.publisher" \
        --project="$PROJECT_ID"

    gcloud pubsub subscriptions add-iam-policy-binding phi-deid-jobs-sub \
        --member="serviceAccount:${PUBSUB_SA}" \
        --role="roles/pubsub.subscriber" \
        --project="$PROJECT_ID"

    log_ok "Dead-letter policy configured (max 5 delivery attempts)"
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo "╔══════════════════════════════════════════════╗"
    echo "║   TKE Privacy Engine - Pub/Sub Setup         ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""
    log_info "Project: ${PROJECT_ID}"
    echo ""

    create_topics
    echo ""
    create_subscriptions
    echo ""
    configure_dlq

    echo ""
    log_ok "Pub/Sub setup complete!"
    echo ""

    # Summary
    log_info "Topics:"
    gcloud pubsub topics list --project="$PROJECT_ID" --format="table(name)"
    echo ""
    log_info "Subscriptions:"
    gcloud pubsub subscriptions list --project="$PROJECT_ID" --format="table(name, topic, ackDeadlineSeconds)"
}

main "$@"
