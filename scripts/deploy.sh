#!/usr/bin/env bash
# Manual deploy to Cloud Run (bypasses GitHub Actions)
# Usage: ./scripts/deploy.sh
set -euo pipefail

PROJECT="tke-phi-privacy-engine"
REGION="us-central1"
SERVICE="llm-council"
REGISTRY="us-central1-docker.pkg.dev/${PROJECT}/llm-council/llm-council"
TAG=$(git rev-parse --short HEAD)

echo "Deploying llm-council @ ${TAG} to Cloud Run..."

# Build remotely on Cloud Build (builds amd64 image)
gcloud builds submit \
  --project="${PROJECT}" \
  --region="${REGION}" \
  --tag="${REGISTRY}:${TAG}" \
  --quiet

# Also tag as latest
gcloud artifacts docker tags add \
  "${REGISTRY}:${TAG}" \
  "${REGISTRY}:latest" \
  --quiet 2>/dev/null || true

# Deploy
gcloud run deploy "${SERVICE}" \
  --project="${PROJECT}" \
  --region="${REGION}" \
  --image="${REGISTRY}:${TAG}" \
  --port=8800 \
  --timeout=1800 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=2 \
  --allow-unauthenticated \
  --set-secrets=OPENROUTER_API_KEY=llm-council-openrouter-key:latest,ANTHROPIC_API_KEY=llm-council-anthropic-key:latest,FIREWORKS_API_KEY=llm-council-fireworks-key:latest,GROK_API_KEY=llm-council-grok-key:latest,COUNCIL_API_KEY=llm-council-api-key:latest \
  --quiet

# Verify
URL=$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" --format='value(status.url)')
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/health")
if [ "${STATUS}" != "200" ]; then
  echo "FAIL: Health check returned ${STATUS}"
  exit 1
fi
echo "SUCCESS: ${URL}/health returned 200"
echo "Deployed: ${REGISTRY}:${TAG}"
