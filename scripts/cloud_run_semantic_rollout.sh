#!/usr/bin/env bash
# Build-independent semantic Cloud Run rollout of one immutable image digest.
set -Eeuo pipefail

REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
PROJECT="${PROJECT:-${PROJECT_ID:-}}"
: "${PROJECT:?PROJECT or PROJECT_ID is required}"
: "${REGION:?REGION is required}"
: "${SERVICE:?SERVICE is required}"
: "${IMAGE_DIGEST:?IMAGE_DIGEST is required}"
: "${DEPLOY_REVISION:?DEPLOY_REVISION is required}"

[[ "${IMAGE_DIGEST}" == *@sha256:* ]] || { echo "Refusing mutable deployment image" >&2; exit 2; }

ROLLOUT_OBSERVATION_SECONDS="${ROLLOUT_OBSERVATION_SECONDS:-30}"
ROLLOUT_HEALTH_SAMPLES="${ROLLOUT_HEALTH_SAMPLES:-1}"
ROLLOUT_SERVICE_HEALTH_SAMPLES="${ROLLOUT_SERVICE_HEALTH_SAMPLES:-50}"
ROLLOUT_SMOKE_SAMPLES="${ROLLOUT_SMOKE_SAMPLES:-5}"
ROLLOUT_STREAM_SMOKE_SAMPLES="${ROLLOUT_STREAM_SMOKE_SAMPLES:-5}"
COUNCIL_MAX_LATENCY_SECONDS="${COUNCIL_MAX_LATENCY_SECONDS:-480}"
COUNCIL_MAX_TOKENS="${COUNCIL_MAX_TOKENS:-60000}"
COUNCIL_MAX_COST_USD="${COUNCIL_MAX_COST_USD:-1.50}"
COUNCIL_MAX_ERROR_RATE="${COUNCIL_MAX_ERROR_RATE:-0}"
COUNCIL_MAX_QUALITY_DROP="${COUNCIL_MAX_QUALITY_DROP:-3}"
COUNCIL_MAX_LATENCY_RATIO="${COUNCIL_MAX_LATENCY_RATIO:-1.20}"
COUNCIL_MAX_COST_RATIO="${COUNCIL_MAX_COST_RATIO:-1.25}"
COUNCIL_MIN_ROUTE_SUCCESS="${COUNCIL_MIN_ROUTE_SUCCESS:-0.99}"
COUNCIL_API_KEY_SECRET="${COUNCIL_API_KEY_SECRET:-llm-council-api-key}"
SLEEP_COMMAND="${SLEEP_COMMAND:-sleep}"
HEALTH_VERIFIER="${HEALTH_VERIFIER:-scripts/verify_deploy_health.py}"
SMOKE_VERIFIER="${SMOKE_VERIFIER:-scripts/verify_council_smoke.py}"
ROUTING_VERIFIER="${ROUTING_VERIFIER:-scripts/verify_service_routing.py}"

python3 - "${ROLLOUT_OBSERVATION_SECONDS}" "${ROLLOUT_HEALTH_SAMPLES}" "${ROLLOUT_SERVICE_HEALTH_SAMPLES}" "${ROLLOUT_SMOKE_SAMPLES}" "${ROLLOUT_STREAM_SMOKE_SAMPLES}" <<'PY'
import sys
observation, health, service_health, smoke, stream_smoke = map(int, sys.argv[1:])
if not 0 <= observation <= 600 or not 1 <= health <= 5 or not 5 <= service_health <= 200 or not 5 <= smoke <= 20 or not 1 <= stream_smoke <= 5:
    raise SystemExit("rollout thresholds are outside safe bounds")
PY

WORK=$(mktemp -d)
SERVICE_JSON="${WORK}/service.json"
TRAFFIC_SNAPSHOT="${WORK}/traffic.json"
PRIOR_IDENTITY="${WORK}/prior-identity.json"
CANDIDATE_IDENTITY="${WORK}/candidate-identity.json"
PRIOR_SMOKE="${WORK}/prior-smoke.json"
trap 'rm -rf "${WORK}"' EXIT

describe_service() {
  gcloud run services describe "${SERVICE}" --project="${PROJECT}" --region="${REGION}" --format=json >"$1"
}

service_url() {
  gcloud run services describe "${SERVICE}" --project="${PROJECT}" --region="${REGION}" --format='value(status.url)'
}

smoke() {
  local url=$1; shift
  PYTHONPATH="${REPO_ROOT}${PYTHONPATH:+:${PYTHONPATH}}" python3 "${SMOKE_VERIFIER}" "${url}" --project "${PROJECT}" \
    --secret "${COUNCIL_API_KEY_SECRET}" --max-latency-seconds "${COUNCIL_MAX_LATENCY_SECONDS}" \
    --max-tokens "${COUNCIL_MAX_TOKENS}" --max-cost-usd "${COUNCIL_MAX_COST_USD}" \
    --max-error-rate "${COUNCIL_MAX_ERROR_RATE}" --samples "${ROLLOUT_SMOKE_SAMPLES}" \
    --stream-samples "${ROLLOUT_STREAM_SMOKE_SAMPLES}" \
    --max-quality-drop "${COUNCIL_MAX_QUALITY_DROP}" --max-latency-ratio "${COUNCIL_MAX_LATENCY_RATIO}" \
    --max-cost-ratio "${COUNCIL_MAX_COST_RATIO}" --min-route-success "${COUNCIL_MIN_ROUTE_SUCCESS}" "$@"
}

verify_candidate_tag() {
  local stage=$1 url=$2 sample
  echo "Verifying ${stage} candidate tag"
  for ((sample=1; sample<=ROLLOUT_HEALTH_SAMPLES; sample++)); do
    python3 "${HEALTH_VERIFIER}" "${url}" --expected-revision "${DEPLOY_REVISION}" --expected-image-digest "${IMAGE_DIGEST}"
  done
  smoke "${url}" --baseline-proof "${PRIOR_SMOKE}"
  if (( ROLLOUT_OBSERVATION_SECONDS > 0 )); then "${SLEEP_COMMAND}" "${ROLLOUT_OBSERVATION_SECONDS}"; fi
}

restore_prior() {
  local restored="${WORK}/restored.json" prior_revisions prior_tags
  prior_revisions=$(python3 scripts/cloud_run_traffic.py revisions "${TRAFFIC_SNAPSHOT}")
  prior_tags=$(python3 scripts/cloud_run_traffic.py tags "${TRAFFIC_SNAPSHOT}")
  # Clearing first removes every candidate tag/assignment before exact reconstruction.
  gcloud run services update-traffic "${SERVICE}" --project="${PROJECT}" --region="${REGION}" \
    --clear-tags --to-revisions="${prior_revisions}" --quiet >/dev/null
  if [[ -n "${prior_tags}" ]]; then
    gcloud run services update-traffic "${SERVICE}" --project="${PROJECT}" --region="${REGION}" \
      --set-tags="${prior_tags}" --quiet >/dev/null
  fi
  describe_service "${restored}"
  python3 scripts/cloud_run_traffic.py compare "${restored}" "${TRAFFIC_SNAPSHOT}"
  echo "Rollback restoration verified"
}

ROLLBACK_ARMED=false
rollback() {
  local status=$?
  trap - ERR
  if [[ "${ROLLBACK_ARMED}" == true ]]; then
    local failed_state="${WORK}/failed-state.json"
    if ! describe_service "${failed_state}" || ! python3 scripts/cloud_run_traffic.py compare "${failed_state}" "${TRAFFIC_SNAPSHOT}" >/dev/null 2>&1; then
      restore_prior || status=$?
    fi
  fi
  exit "${status}"
}
trap rollback ERR

describe_service "${SERVICE_JSON}"
python3 scripts/cloud_run_traffic.py snapshot "${SERVICE_JSON}" "${TRAFFIC_SNAPSHOT}"
PRIOR_URL=$(service_url)
python3 "${HEALTH_VERIFIER}" "${PRIOR_URL}" --identity-only \
  --allow-legacy-identity-without-artifacts --identity-out "${PRIOR_IDENTITY}"
LEGACY_BASELINE=$(python3 - "${PRIOR_IDENTITY}" <<'PY'
import json, sys
identity = json.load(open(sys.argv[1], encoding="utf-8"))
print("true" if "artifacts" not in identity else "false")
PY
)
BASELINE_FLAGS=(--baseline)
RESTORE_HEALTH_FLAGS=(--identity-only)
if [[ "${LEGACY_BASELINE}" == true ]]; then
  BASELINE_FLAGS+=(--legacy-baseline)
  RESTORE_HEALTH_FLAGS+=(--allow-legacy-identity-without-artifacts)
fi
smoke "${PRIOR_URL}" "${BASELINE_FLAGS[@]}" --proof-out "${PRIOR_SMOKE}"

revision_prefix=$(printf '%s' "${DEPLOY_REVISION}" | tr '[:upper:]_' '[:lower:]-' | tr -cd 'a-z0-9-' | cut -c1-12)
suffix="${revision_prefix}-$(date +%s)"
SHADOW_TAG="shadow-${suffix}"
# Rollback is armed before deploy because Cloud Run may create a revision/tag and then return failure.
ROLLBACK_ARMED=true
gcloud run deploy "${SERVICE}" --project="${PROJECT}" --region="${REGION}" --image="${IMAGE_DIGEST}" \
  --revision-suffix="${suffix}" --no-traffic --tag="${SHADOW_TAG}" --port=8800 --timeout=1800 \
  --memory=512Mi --cpu=1 --min-instances=1 --max-instances=2 --allow-unauthenticated \
  --update-env-vars="VERTEX_PROJECT_ID=shree-development,VERTEX_LOCATION=global,REQUIRE_VERTEX_ANTHROPIC=true,DEPLOY_REVISION=${DEPLOY_REVISION},APP_IMAGE_DIGEST=${IMAGE_DIGEST}" \
  --set-secrets=OPENROUTER_API_KEY=llm-council-openrouter-key:latest,ANTHROPIC_API_KEY=llm-council-anthropic-key:latest,FIREWORKS_API_KEY=llm-council-fireworks-key:latest,GROK_API_KEY=llm-council-grok-key:latest,COUNCIL_API_KEY=llm-council-api-key:latest \
  --quiet >/dev/null

NEW_REVISION=$(gcloud run services describe "${SERVICE}" --project="${PROJECT}" --region="${REGION}" --format='value(status.latestCreatedRevisionName)')
SHADOW_URL=$(gcloud run services describe "${SERVICE}" --project="${PROJECT}" --region="${REGION}" --format=json | python3 -c 'import json,sys; tag=sys.argv[1]; print(next(x["url"] for x in json.load(sys.stdin)["status"]["traffic"] if x.get("tag")==tag))' "${SHADOW_TAG}")
verify_candidate_tag shadow "${SHADOW_URL}"
# Candidate identity capture occurs only after strict health and smoke verification.
python3 "${HEALTH_VERIFIER}" "${SHADOW_URL}" --identity-only \
  --identity-out "${CANDIDATE_IDENTITY}"

PREVIOUS_TRAFFIC=$(python3 scripts/cloud_run_traffic.py revisions "${TRAFFIC_SNAPSHOT}")
traffic_for() {
  python3 - "${PREVIOUS_TRAFFIC}" "${NEW_REVISION}" "$1" <<'PY'
import sys
old, new, percentage = sys.argv[1], sys.argv[2], int(sys.argv[3])
items = [(part.rsplit("=", 1)[0], int(part.rsplit("=", 1)[1])) for part in old.split(",")]
remaining = 100 - percentage
scaled = [value * remaining / 100 for _, value in items]
allocated = [int(value) for value in scaled]
for index in sorted(range(len(items)), key=lambda i: scaled[i] - allocated[i], reverse=True)[:remaining-sum(allocated)]: allocated[index] += 1
print(",".join([f"{new}={percentage}", *(f"{revision}={value}" for (revision, _), value in zip(items, allocated, strict=True) if value)]))
PY
}

apply_stage() {
  local percent=$1
  local actual="${WORK}/stage-${percent}.json"
  gcloud run services update-traffic "${SERVICE}" --project="${PROJECT}" --region="${REGION}" \
    --to-revisions="$(traffic_for "${percent}")" --quiet >/dev/null
  describe_service "${actual}"
  python3 scripts/cloud_run_traffic.py verify-stage "${actual}" "${TRAFFIC_SNAPSHOT}" "${NEW_REVISION}" "${percent}" "${SHADOW_TAG}"
  # Strict candidate semantics always use the tag; the service URL proves staged routing separately.
  verify_candidate_tag "${percent}%" "${SHADOW_URL}"
  python3 "${ROUTING_VERIFIER}" "${PRIOR_URL}" --prior-identity "${PRIOR_IDENTITY}" \
    --candidate-identity "${CANDIDATE_IDENTITY}" --percent "${percent}" \
    --samples "${ROLLOUT_SERVICE_HEALTH_SAMPLES}"
}

# Real rollback rehearsal: candidate receives 10%, is validated, and prior state is restored/revalidated.
apply_stage 10
restore_prior
python3 "${HEALTH_VERIFIER}" "${PRIOR_URL}" "${RESTORE_HEALTH_FLAGS[@]}" \
  --expected-identity "${PRIOR_IDENTITY}"
smoke "${PRIOR_URL}" "${BASELINE_FLAGS[@]}" --expected-proof "${PRIOR_SMOKE}"

# Exact restoration intentionally removed the shadow tag; recreate it before restarting progression.
gcloud run services update-traffic "${SERVICE}" --project="${PROJECT}" --region="${REGION}" \
  --set-tags="${SHADOW_TAG}=${NEW_REVISION}" --quiet >/dev/null
SHADOW_URL=$(gcloud run services describe "${SERVICE}" --project="${PROJECT}" --region="${REGION}" --format=json | python3 -c 'import json,sys; tag=sys.argv[1]; print(next(x["url"] for x in json.load(sys.stdin)["status"]["traffic"] if x.get("tag")==tag))' "${SHADOW_TAG}")

# Restart progression after the demonstrated rollback.
apply_stage 10
apply_stage 50
apply_stage 100

trap - ERR
echo "Semantic rollout completed at immutable image digest"
