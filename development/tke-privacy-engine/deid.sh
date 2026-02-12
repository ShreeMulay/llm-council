#!/usr/bin/env bash
# =============================================================================
# TKE De-Identification CLI
#
# De-identify clinical notes using the TKE Privacy Engine.
#
# Usage:
#   ./deid.sh "Paste clinical note text here"
#   ./deid.sh path/to/note.txt
#   ./deid.sh                          # Interactive: paste text, Ctrl+D to submit
#
# Options:
#   --no-drive    Skip Drive output (just show de-identified text in terminal)
#   --encounter   Encounter date (default: today, format: YYYY-MM-DD)
#   --help        Show this help
#
# Output:
#   - Google Doc in TKE PHI Engine Shared Drive → De-Identified folder
#   - Markdown files (de-identified text + summary)
#   - Audit row in the Audit Sheet
#   - PHI mapping in Firestore (encrypted)
#   - De-identified text printed to terminal
# =============================================================================

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
PROJECT_ID="tke-phi-privacy-engine"
TOPIC="phi-deid-jobs"
OUTPUT_FOLDER_ID="1928P9j7-iSsbrOs98drFu8Xsky90sWli"
REQUESTOR="${USER:-unknown}@thekidneyexperts.com"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Helpers ──────────────────────────────────────────────────────────────────

usage() {
    sed -n '2,/^# =====/p' "$0" | grep '^#' | sed 's/^# \?//'
    exit 0
}

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ─── Parse Arguments ─────────────────────────────────────────────────────────

NO_DRIVE=false
ENCOUNTER_DATE=$(date +%Y-%m-%d)
INPUT_TEXT=""
SOURCE_FILENAME="cli_input.txt"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-drive)
            NO_DRIVE=true
            shift
            ;;
        --encounter)
            ENCOUNTER_DATE="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            # Either a file path or inline text
            if [[ -f "$1" ]]; then
                INPUT_TEXT=$(cat "$1")
                SOURCE_FILENAME=$(basename "$1")
                log_info "Reading from file: $1 ($(wc -c < "$1") bytes)"
            else
                INPUT_TEXT="$1"
                log_info "Using inline text (${#1} chars)"
            fi
            shift
            ;;
    esac
done

# ─── Get Input ────────────────────────────────────────────────────────────────

if [[ -z "$INPUT_TEXT" ]]; then
    # Check if stdin has data (piped input)
    if [[ ! -t 0 ]]; then
        INPUT_TEXT=$(cat)
        log_info "Reading from stdin ($(echo -n "$INPUT_TEXT" | wc -c) bytes)"
    else
        echo -e "${CYAN}${BOLD}TKE De-Identification Engine${NC}"
        echo -e "${CYAN}Paste your clinical note below, then press Ctrl+D to submit:${NC}"
        echo ""
        INPUT_TEXT=$(cat)
        echo ""
        log_info "Received $(echo -n "$INPUT_TEXT" | wc -c) bytes of text"
    fi
fi

if [[ -z "$INPUT_TEXT" ]]; then
    log_error "No input text provided. Use: ./deid.sh \"text\" or ./deid.sh file.txt"
    exit 1
fi

# ─── Check Prerequisites ─────────────────────────────────────────────────────

if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI is required. Install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Verify auth
if ! gcloud auth print-access-token &>/dev/null; then
    log_error "Not authenticated. Run: gcloud auth login"
    exit 1
fi

# ─── Build and Publish Job ────────────────────────────────────────────────────

JOB_ID="deid-cli-$(date +%Y%m%d%H%M%S)-$(head -c4 /dev/urandom | xxd -p)"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       TKE Privacy Engine - De-Identify       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
log_info "Job ID:     ${JOB_ID}"
log_info "Encounter:  ${ENCOUNTER_DATE}"
log_info "Source:     ${SOURCE_FILENAME}"
log_info "Text size:  $(echo -n "$INPUT_TEXT" | wc -c) bytes"
log_info "Drive out:  $(if $NO_DRIVE; then echo 'disabled'; else echo 'enabled'; fi)"
echo ""

# Escape the text for JSON (handle newlines, quotes, backslashes)
ESCAPED_TEXT=$(python3 -c "
import json, sys
text = sys.stdin.read()
print(json.dumps(text)[1:-1])  # Strip outer quotes
" <<< "$INPUT_TEXT")

# Build the message
if $NO_DRIVE; then
    MESSAGE=$(cat <<EOF
{
    "job_id": "${JOB_ID}",
    "source": "api",
    "raw_text": "${ESCAPED_TEXT}",
    "requestor": "${REQUESTOR}",
    "encounter_date": "${ENCOUNTER_DATE}",
    "mode": "standard"
}
EOF
)
else
    MESSAGE=$(cat <<EOF
{
    "job_id": "${JOB_ID}",
    "source": "api",
    "raw_text": "${ESCAPED_TEXT}",
    "requestor": "${REQUESTOR}",
    "encounter_date": "${ENCOUNTER_DATE}",
    "mode": "standard",
    "callback": {
        "output_folder_id": "${OUTPUT_FOLDER_ID}",
        "source_filename": "${SOURCE_FILENAME}"
    }
}
EOF
)
fi

log_info "Publishing to Pub/Sub..."

RESULT=$(gcloud pubsub topics publish "$TOPIC" \
    --project="$PROJECT_ID" \
    --message="$MESSAGE" 2>&1)

if [[ $? -ne 0 ]]; then
    log_error "Failed to publish: $RESULT"
    exit 1
fi

MESSAGE_ID=$(echo "$RESULT" | grep -oP 'messageIds:\s*\n-\s*\K\S+' || echo "$RESULT" | grep -oP "'(\d+)'" | tr -d "'")
log_ok "Published! Message ID: ${MESSAGE_ID:-unknown}"

echo ""
log_info "Processing... (typically 10-15 seconds)"
log_info "Checking logs for results..."

# ─── Wait and Show Results ────────────────────────────────────────────────────

# Record publish timestamp (ISO 8601 for Drive query)
PUBLISH_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Poll Drive folder for new files created after publish (up to 90 seconds)
TIMEOUT=90
ELAPSED=0
SLEEP_INTERVAL=5
FOUND=false

if ! $NO_DRIVE; then
    while [[ $ELAPSED -lt $TIMEOUT ]]; do
        sleep $SLEEP_INTERVAL
        ELAPSED=$((ELAPSED + SLEEP_INTERVAL))
        echo -ne "\r  Waiting... ${ELAPSED}s / ${TIMEOUT}s"

        # Check if new files appeared in output folder since we published
        ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null)
        FILE_COUNT=$(python3 -c "
import urllib.parse, urllib.request, json, sys
q = \"'${OUTPUT_FOLDER_ID}' in parents and createdTime > '${PUBLISH_TIME}'\"
params = urllib.parse.urlencode({
    'q': q,
    'supportsAllDrives': 'true',
    'includeItemsFromAllDrives': 'true',
    'corpora': 'drive',
    'driveId': '0APd8QGg3EJcPUk9PVA',
    'fields': 'files(id)'
})
url = f'https://www.googleapis.com/drive/v3/files?{params}'
req = urllib.request.Request(url, headers={'Authorization': 'Bearer ${ACCESS_TOKEN}'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
print(len(data.get('files', [])))
" 2>/dev/null || echo "0")

        # We expect 3 files: Google Doc + deid.md + summary.md
        if [[ "$FILE_COUNT" -ge 3 ]]; then
            FOUND=true
            break
        fi
    done
else
    # No Drive output — just wait a fixed time for processing
    sleep 15
fi

echo ""
echo ""

if $FOUND; then
    log_ok "Processing complete!"
elif ! $NO_DRIVE; then
    log_warn "Timed out waiting for output files. The job may still be processing."
    log_info "Check the Shared Drive or Cloud Function logs for results."
fi

echo ""

# ─── Show Output ──────────────────────────────────────────────────────────────

if ! $NO_DRIVE; then
    # List files created in this job (after publish time)
    ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null)

    echo -e "${GREEN}${BOLD}Output Files:${NC}"
    echo ""

    python3 -c "
import urllib.parse, urllib.request, json, sys
q = \"'${OUTPUT_FOLDER_ID}' in parents and createdTime > '${PUBLISH_TIME}'\"
params = urllib.parse.urlencode({
    'q': q,
    'supportsAllDrives': 'true',
    'includeItemsFromAllDrives': 'true',
    'corpora': 'drive',
    'driveId': '0APd8QGg3EJcPUk9PVA',
    'orderBy': 'createdTime desc',
    'pageSize': '10',
    'fields': 'files(id,name,mimeType,createdTime)'
})
url = f'https://www.googleapis.com/drive/v3/files?{params}'
req = urllib.request.Request(url, headers={'Authorization': 'Bearer ${ACCESS_TOKEN}'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
files = data.get('files', [])
if not files:
    print('  No files found yet (may still be processing)')
else:
    for f in files:
        name = f.get('name', 'Unknown')
        mime = f.get('mimeType', '')
        fid = f.get('id', '')
        if 'document' in mime:
            icon = 'DOC'
            url = f'https://docs.google.com/document/d/{fid}/edit'
        elif name.endswith('.md'):
            icon = ' MD'
            url = f'https://drive.google.com/file/d/{fid}/view'
        else:
            icon = 'FIL'
            url = f'https://drive.google.com/file/d/{fid}/view'
        print(f'  [{icon}] {name}')
        print(f'        {url}')
        print()
" 2>/dev/null || echo "  Could not check Drive files"
fi

echo -e "${GREEN}${BOLD}Audit Sheet:${NC}"
echo "  https://docs.google.com/spreadsheets/d/15vfpfiR4EmcwscZuqpirQO7YuaxCPptvUHjD3oZj11I"
echo ""

echo -e "${GREEN}${BOLD}Shared Drive:${NC}"
echo "  https://drive.google.com/drive/folders/0APd8QGg3EJcPUk9PVA"
echo ""

log_ok "Done! Job ID: ${JOB_ID}"
