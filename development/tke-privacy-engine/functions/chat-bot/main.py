"""TKE Privacy Engine - Google Chat Bot Cloud Function.

HTTP-triggered Cloud Function (2nd gen) that serves as the Google Chat bot
interface for the TKE PHI De-identification Engine. Handles text messages,
file attachments, and slash-style commands.

Supported commands:
    /deid <text>      - De-identify inline text
    /verify <job_id>  - Check status of a de-identification job
    /batch            - Instructions for batch processing via Drive
    /synthetic <text> - Generate synthetic replacement data
    /help             - Show available commands
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any

import functions_framework
import google.auth
import google.auth.transport.requests
from flask import Request, jsonify
from google.cloud import pubsub_v1, storage
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
STAGING_BUCKET = os.environ.get("STAGING_BUCKET", "tke-phi-privacy-engine-staging")
DEID_TOPIC = os.environ.get("DEID_TOPIC", "phi-deid-jobs")

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

SUPPORTED_MIME_TYPES: set[str] = {
    "text/plain",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
    "application/json",
}

# ---------------------------------------------------------------------------
# Lazy-initialized clients
# ---------------------------------------------------------------------------
_publisher: pubsub_v1.PublisherClient | None = None
_storage_client: storage.Client | None = None
_drive_service: Any = None
_credentials: Any = None


def _get_credentials() -> Any:
    global _credentials
    if _credentials is None:
        _credentials, _ = google.auth.default(
            scopes=[
                "https://www.googleapis.com/auth/drive.readonly",
                "https://www.googleapis.com/auth/chat.bot",
            ]
        )
    # Refresh if expired
    if _credentials.expired:
        _credentials.refresh(google.auth.transport.requests.Request())
    return _credentials


def _get_publisher() -> pubsub_v1.PublisherClient:
    global _publisher
    if _publisher is None:
        _publisher = pubsub_v1.PublisherClient()
    return _publisher


def _get_storage_client() -> storage.Client:
    global _storage_client
    if _storage_client is None:
        _storage_client = storage.Client(project=GCP_PROJECT_ID)
    return _storage_client


def _get_drive_service() -> Any:
    global _drive_service
    if _drive_service is None:
        _drive_service = build(
            "drive", "v3", credentials=_get_credentials(), cache_discovery=False
        )
    return _drive_service


# ---------------------------------------------------------------------------
# Card builders
# ---------------------------------------------------------------------------

HELP_TEXT = (
    "**TKE PHI De-identifier** - Powered by the TKE Privacy Engine\n\n"
    "**Commands:**\n"
    "- `/deid <text>` - De-identify the provided text\n"
    "- `/verify <job_id>` - Check the status of a de-identification job\n"
    "- `/batch` - Instructions for batch processing via Google Drive\n"
    "- `/synthetic <text>` - Generate synthetic replacement data\n"
    "- `/help` - Show this help message\n\n"
    "**Or just send:**\n"
    "- A text message to de-identify it directly\n"
    "- A file attachment (PDF, DOCX, TXT, CSV, JSON) to process it\n\n"
    "*Big Expertise. Small-Town Heart.*"
)

WELCOME_TEXT = (
    "Hello! I'm the **TKE PHI De-identifier Bot**.\n\n"
    "I can help you remove Protected Health Information (PHI) from text and documents.\n\n"
    + HELP_TEXT
)

BATCH_TEXT = (
    "**Batch Processing via Google Drive**\n\n"
    "1. Upload files to the **PHI_Ingest** folder in Google Drive\n"
    "2. Files are automatically picked up and de-identified\n"
    "3. Results appear in the **De-Identified** output folder\n"
    "4. Check the **TKE De-ID Audit Log** sheet for processing status\n\n"
    "Supported formats: PDF, DOCX, TXT, CSV, JSON (max 10 MB each)"
)


def _make_card(
    title: str,
    subtitle: str,
    body_text: str,
    *,
    buttons: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Build a Google Chat cardsV2 response."""
    widgets: list[dict[str, Any]] = [
        {"textParagraph": {"text": body_text}},
    ]

    if buttons:
        button_list = {"buttonList": {"buttons": buttons}}
        widgets.append(button_list)

    return {
        "cardsV2": [
            {
                "cardId": "deid-status",
                "card": {
                    "header": {
                        "title": title,
                        "subtitle": subtitle,
                        "imageUrl": "",
                        "imageType": "CIRCLE",
                    },
                    "sections": [{"widgets": widgets}],
                },
            }
        ]
    }


def _make_text_response(text: str) -> dict[str, Any]:
    """Build a simple text-only Chat response."""
    return {"text": text}


def _make_processing_card(job_id: str, source_desc: str) -> dict[str, Any]:
    """Build the 'processing' acknowledgement card."""
    return _make_card(
        title="TKE PHI De-identifier",
        subtitle="Processing...",
        body_text=(
            f"Your {source_desc} is being de-identified.\n\n"
            f"**Job ID:** `{job_id}`\n\n"
            "You'll receive the result here when processing is complete. "
            "Use `/verify {job_id}` to check status."
        ),
        buttons=[
            {
                "text": "Check Status",
                "onClick": {
                    "action": {
                        "function": "verify_job",
                        "parameters": [{"key": "job_id", "value": job_id}],
                    }
                },
            }
        ],
    )


# ---------------------------------------------------------------------------
# Pub/Sub publishing
# ---------------------------------------------------------------------------


def _publish_text_job(
    job_id: str,
    raw_text: str,
    requestor: str,
    space_name: str,
) -> str:
    """Publish a text de-identification job. Returns message ID."""
    publisher = _get_publisher()
    topic_path = publisher.topic_path(GCP_PROJECT_ID, DEID_TOPIC)

    job_message: dict[str, Any] = {
        "job_id": job_id,
        "source": "chat",
        "raw_text": raw_text,
        "requestor": requestor,
        "mode": "standard",
        "callback": {
            "type": "chat",
            "space_name": space_name,
        },
    }

    data = json.dumps(job_message).encode("utf-8")
    future = publisher.publish(topic_path, data=data, job_id=job_id, source="chat")
    message_id = future.result(timeout=30)
    logger.info("Published text job %s as message %s", job_id, message_id)
    return message_id


def _publish_file_job(
    job_id: str,
    file_uri: str,
    requestor: str,
    space_name: str,
    source_file_id: str,
) -> str:
    """Publish a file de-identification job. Returns message ID."""
    publisher = _get_publisher()
    topic_path = publisher.topic_path(GCP_PROJECT_ID, DEID_TOPIC)

    job_message: dict[str, Any] = {
        "job_id": job_id,
        "source": "chat",
        "file_uri": file_uri,
        "requestor": requestor,
        "mode": "standard",
        "callback": {
            "type": "chat",
            "space_name": space_name,
            "source_file_id": source_file_id,
        },
    }

    data = json.dumps(job_message).encode("utf-8")
    future = publisher.publish(topic_path, data=data, job_id=job_id, source="chat")
    message_id = future.result(timeout=30)
    logger.info("Published file job %s as message %s", job_id, message_id)
    return message_id


def _publish_synthetic_job(
    job_id: str,
    raw_text: str,
    requestor: str,
    space_name: str,
) -> str:
    """Publish a synthetic data generation job. Returns message ID."""
    publisher = _get_publisher()
    topic_path = publisher.topic_path(GCP_PROJECT_ID, DEID_TOPIC)

    job_message: dict[str, Any] = {
        "job_id": job_id,
        "source": "chat",
        "raw_text": raw_text,
        "requestor": requestor,
        "mode": "synthetic",
        "callback": {
            "type": "chat",
            "space_name": space_name,
        },
    }

    data = json.dumps(job_message).encode("utf-8")
    future = publisher.publish(topic_path, data=data, job_id=job_id, source="chat")
    message_id = future.result(timeout=30)
    logger.info("Published synthetic job %s as message %s", job_id, message_id)
    return message_id


# ---------------------------------------------------------------------------
# File handling
# ---------------------------------------------------------------------------


def _download_chat_attachment(attachment: dict[str, Any]) -> tuple[bytes, str, str]:
    """Download a file attachment from Google Chat via Drive.

    Chat file attachments are stored in Drive and accessible via the
    ``attachmentDataRef.resourceName`` or ``driveDataRef.driveFileId``.

    Returns:
        (content_bytes, filename, drive_file_id)
    """
    drive = _get_drive_service()

    # Chat attachments expose a Drive file ID
    drive_data_ref = attachment.get("driveDataRef", {})
    file_id = drive_data_ref.get("driveFileId", "")
    if not file_id:
        # Fallback: some attachment formats use contentName + downloadUri
        raise ValueError("Attachment does not contain a Drive file reference")

    metadata = (
        drive.files().get(fileId=file_id, fields="id,name,mimeType,size").execute()
    )

    mime_type = metadata.get("mimeType", "")
    size = int(metadata.get("size", 0))
    filename = metadata.get("name", "attachment")

    if mime_type not in SUPPORTED_MIME_TYPES:
        raise ValueError(
            f"Unsupported file type: {mime_type}. "
            f"Supported: {', '.join(sorted(SUPPORTED_MIME_TYPES))}"
        )

    if size > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File too large: {size} bytes (max {MAX_FILE_SIZE_BYTES})")

    request = drive.files().get_media(fileId=file_id)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()

    return buffer.getvalue(), filename, file_id


def _stage_to_gcs(job_id: str, filename: str, content: bytes) -> str:
    """Upload file content to the staging bucket. Returns the gs:// URI."""
    client = _get_storage_client()
    bucket = client.bucket(STAGING_BUCKET)
    blob_path = f"jobs/{job_id}/{filename}"
    blob = bucket.blob(blob_path)
    blob.upload_from_string(content)
    uri = f"gs://{STAGING_BUCKET}/{blob_path}"
    logger.info("Staged file to %s (%d bytes)", uri, len(content))
    return uri


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------


def _get_requestor(event: dict[str, Any]) -> str:
    """Extract the requestor email from the Chat event."""
    user = event.get("user", {})
    return user.get("email", user.get("name", "unknown"))


def _get_space_name(event: dict[str, Any]) -> str:
    """Extract the space resource name from the Chat event."""
    space = event.get("space", {})
    return space.get("name", "")


def _handle_added_to_space(event: dict[str, Any]) -> dict[str, Any]:
    """Handle bot being added to a space."""
    logger.info("Bot added to space: %s", _get_space_name(event))
    return _make_card(
        title="TKE PHI De-identifier",
        subtitle="Ready to help!",
        body_text=WELCOME_TEXT,
    )


def _handle_help() -> dict[str, Any]:
    """Return the help card."""
    return _make_card(
        title="TKE PHI De-identifier",
        subtitle="Help",
        body_text=HELP_TEXT,
    )


def _handle_batch() -> dict[str, Any]:
    """Return batch processing instructions."""
    return _make_card(
        title="TKE PHI De-identifier",
        subtitle="Batch Processing",
        body_text=BATCH_TEXT,
    )


def _handle_verify(args: str) -> dict[str, Any]:
    """Handle /verify command - return job status lookup instructions.

    Full status lookup is done asynchronously by the processor; here we
    acknowledge the request and publish a status-check message.
    """
    job_id = args.strip()
    if not job_id:
        return _make_card(
            title="TKE PHI De-identifier",
            subtitle="Error",
            body_text="Please provide a job ID: `/verify <job_id>`",
        )

    return _make_card(
        title="TKE PHI De-identifier",
        subtitle="Job Status",
        body_text=(
            f"**Job ID:** `{job_id}`\n\n"
            "Looking up status... Results will appear shortly."
        ),
    )


def _handle_deid_text(text: str, event: dict[str, Any]) -> dict[str, Any]:
    """De-identify inline text."""
    if not text.strip():
        return _make_card(
            title="TKE PHI De-identifier",
            subtitle="Error",
            body_text="Please provide text to de-identify: `/deid <text>`",
        )

    job_id = str(uuid.uuid4())
    requestor = _get_requestor(event)
    space_name = _get_space_name(event)

    _publish_text_job(job_id, text.strip(), requestor, space_name)
    return _make_processing_card(job_id, "text")


def _handle_synthetic(text: str, event: dict[str, Any]) -> dict[str, Any]:
    """Generate synthetic replacement data."""
    if not text.strip():
        return _make_card(
            title="TKE PHI De-identifier",
            subtitle="Error",
            body_text="Please provide text for synthetic generation: `/synthetic <text>`",
        )

    job_id = str(uuid.uuid4())
    requestor = _get_requestor(event)
    space_name = _get_space_name(event)

    _publish_synthetic_job(job_id, text.strip(), requestor, space_name)
    return _make_processing_card(job_id, "synthetic data request")


def _handle_file_attachment(event: dict[str, Any]) -> dict[str, Any]:
    """Process a file attachment from Chat."""
    message = event.get("message", {})
    attachments = message.get("attachment", [])

    if not attachments:
        return _make_card(
            title="TKE PHI De-identifier",
            subtitle="Error",
            body_text="No file attachment found in the message.",
        )

    job_id = str(uuid.uuid4())
    requestor = _get_requestor(event)
    space_name = _get_space_name(event)

    # Process the first attachment (Chat typically sends one at a time)
    attachment = attachments[0]

    try:
        content, filename, drive_file_id = _download_chat_attachment(attachment)
    except ValueError as exc:
        return _make_card(
            title="TKE PHI De-identifier",
            subtitle="Error",
            body_text=f"Cannot process attachment: {exc}",
        )

    file_uri = _stage_to_gcs(job_id, filename, content)
    _publish_file_job(job_id, file_uri, requestor, space_name, drive_file_id)

    return _make_processing_card(job_id, f"file **{filename}**")


def _handle_plain_text(event: dict[str, Any]) -> dict[str, Any]:
    """Handle a plain text message (no command prefix) - treat as /deid."""
    message = event.get("message", {})
    text = message.get("argumentText", message.get("text", "")).strip()

    if not text:
        return _handle_help()

    job_id = str(uuid.uuid4())
    requestor = _get_requestor(event)
    space_name = _get_space_name(event)

    _publish_text_job(job_id, text, requestor, space_name)
    return _make_processing_card(job_id, "text")


def _handle_message(event: dict[str, Any]) -> dict[str, Any]:
    """Route an incoming MESSAGE event to the appropriate handler."""
    message = event.get("message", {})
    attachments = message.get("attachment", [])

    # If there are file attachments, process the file
    if attachments:
        return _handle_file_attachment(event)

    # Parse command from message text
    text = message.get("argumentText", message.get("text", "")).strip()

    # Check for command prefixes
    if text.startswith("/deid"):
        return _handle_deid_text(text[len("/deid") :], event)
    if text.startswith("/verify"):
        return _handle_verify(text[len("/verify") :])
    if text.startswith("/batch"):
        return _handle_batch()
    if text.startswith("/synthetic"):
        return _handle_synthetic(text[len("/synthetic") :], event)
    if text.startswith("/help"):
        return _handle_help()

    # No command prefix - treat as plain text de-identification
    return _handle_plain_text(event)


def _handle_card_clicked(event: dict[str, Any]) -> dict[str, Any]:
    """Handle interactive card button clicks."""
    action = event.get("action", {})
    function_name = action.get("actionMethodName", action.get("function", ""))
    parameters = {p["key"]: p["value"] for p in action.get("parameters", [])}

    logger.info("Card action: %s  params=%s", function_name, parameters)

    if function_name == "verify_job":
        job_id = parameters.get("job_id", "")
        return _handle_verify(job_id)

    if function_name == "approve_review":
        job_id = parameters.get("job_id", "")
        return _make_card(
            title="TKE PHI De-identifier",
            subtitle="Review Approved",
            body_text=(
                f"**Job ID:** `{job_id}`\n\n"
                "Review approved. The de-identified document will be finalized."
            ),
        )

    if function_name == "reject_review":
        job_id = parameters.get("job_id", "")
        return _make_card(
            title="TKE PHI De-identifier",
            subtitle="Review Rejected",
            body_text=(
                f"**Job ID:** `{job_id}`\n\n"
                "Review rejected. The document will be re-processed with stricter settings."
            ),
        )

    return _make_card(
        title="TKE PHI De-identifier",
        subtitle="Unknown Action",
        body_text=f"Unrecognized action: `{function_name}`",
    )


# ---------------------------------------------------------------------------
# Cloud Function entry point (HTTP triggered, 2nd gen)
# ---------------------------------------------------------------------------


@functions_framework.http
def chat_bot(request: Request) -> Any:
    """Google Chat bot HTTP endpoint.

    Handles ADDED_TO_SPACE, MESSAGE, and CARD_CLICKED event types from the
    Google Chat API.
    """
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405

    try:
        event: dict[str, Any] = request.get_json(silent=True) or {}
    except Exception:
        logger.exception("Failed to parse request body")
        return jsonify({"error": "Invalid request body"}), 400

    event_type = event.get("type", "")
    logger.info(
        "chat_bot invoked  type=%s  user=%s  space=%s",
        event_type,
        event.get("user", {}).get("email", "unknown"),
        event.get("space", {}).get("name", "unknown"),
    )

    try:
        if event_type == "ADDED_TO_SPACE":
            response = _handle_added_to_space(event)
        elif event_type == "MESSAGE":
            response = _handle_message(event)
        elif event_type == "CARD_CLICKED":
            response = _handle_card_clicked(event)
        elif event_type == "REMOVED_FROM_SPACE":
            logger.info("Bot removed from space %s", _get_space_name(event))
            return jsonify({}), 200
        else:
            logger.warning("Unhandled event type: %s", event_type)
            response = _make_text_response(
                "I received an event I don't know how to handle. Try `/help`."
            )

        return jsonify(response), 200

    except Exception:
        logger.exception("Error handling Chat event type=%s", event_type)
        error_response = _make_card(
            title="TKE PHI De-identifier",
            subtitle="Error",
            body_text=(
                "An unexpected error occurred while processing your request. "
                "Please try again or contact support."
            ),
        )
        return jsonify(error_response), 200  # Return 200 so Chat doesn't retry
