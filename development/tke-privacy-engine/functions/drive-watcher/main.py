"""TKE Privacy Engine - Drive Watcher Cloud Function.

Triggered by Pub/Sub messages from Google Workspace Events API when files
are uploaded to the PHI_Ingest folder in Google Drive. Downloads the file
to a Cloud Storage staging bucket and publishes a standardized job message
to the phi-deid-jobs Pub/Sub topic for downstream processing.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import uuid
from typing import Any

import functions_framework
from cloudevents.http import CloudEvent
from google.cloud import pubsub_v1, storage
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import google.auth
import io

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------
GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
STAGING_BUCKET = os.environ.get("STAGING_BUCKET", "tke-phi-staging")
DEID_TOPIC = os.environ.get("DEID_TOPIC", "phi-deid-jobs")
INGEST_FOLDER_ID = os.environ.get("INGEST_FOLDER_ID", "")
OUTPUT_FOLDER_ID = os.environ.get("OUTPUT_FOLDER_ID", "")

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

SUPPORTED_MIME_TYPES: dict[str, str] = {
    "text/plain": ".txt",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/csv": ".csv",
    "application/json": ".json",
    "text/markdown": ".md",
    "text/x-markdown": ".md",
}

# Google Docs/Sheets/Slides export mappings (native Drive formats)
GOOGLE_EXPORT_TYPES: dict[str, tuple[str, str]] = {
    "application/vnd.google-apps.document": ("application/pdf", ".pdf"),
    "application/vnd.google-apps.spreadsheet": ("text/csv", ".csv"),
}

# ---------------------------------------------------------------------------
# Lazy-initialized clients
# ---------------------------------------------------------------------------
_publisher: pubsub_v1.PublisherClient | None = None
_storage_client: storage.Client | None = None
_drive_service: Any = None


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
        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/drive.readonly"]
        )
        _drive_service = build(
            "drive", "v3", credentials=credentials, cache_discovery=False
        )
    return _drive_service


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_pubsub_data(cloud_event: CloudEvent) -> dict[str, Any]:
    """Extract and decode the Pub/Sub message data from a CloudEvent."""
    raw = cloud_event.data.get("message", {}).get("data", "")
    if not raw:
        raise ValueError("Pub/Sub message contains no data payload")
    decoded = base64.b64decode(raw).decode("utf-8")
    return json.loads(decoded)


def _extract_file_id(event_data: dict[str, Any]) -> str:
    """Pull the Drive file ID from the Workspace Events API notification.

    The notification payload varies by event type but typically contains
    ``resourceId`` or a nested ``drive`` object with the file reference.
    """
    # Workspace Events API v1 format
    if "resourceId" in event_data:
        return event_data["resourceId"]

    # Nested drive change notification format
    drive_data = event_data.get("drive", {})
    if "resourceId" in drive_data:
        return drive_data["resourceId"]

    # Fallback: look for fileId directly
    if "fileId" in event_data:
        return event_data["fileId"]

    raise ValueError(
        f"Cannot extract file ID from event data: {json.dumps(event_data)[:500]}"
    )


def _validate_file_metadata(metadata: dict[str, Any]) -> None:
    """Raise if the file doesn't meet ingest criteria."""
    mime_type = metadata.get("mimeType", "")
    size = int(metadata.get("size", 0))
    parents = metadata.get("parents", [])

    # Verify the file lives in the ingest folder
    if INGEST_FOLDER_ID and INGEST_FOLDER_ID not in parents:
        raise ValueError(
            f"File {metadata.get('id')} is not in the PHI_Ingest folder "
            f"(parents={parents}, expected={INGEST_FOLDER_ID})"
        )

    # Check MIME type (allow native Google types that we can export)
    if mime_type not in SUPPORTED_MIME_TYPES and mime_type not in GOOGLE_EXPORT_TYPES:
        raise ValueError(f"Unsupported MIME type: {mime_type}")

    # Google-native files report size=0; skip size check for those
    if mime_type not in GOOGLE_EXPORT_TYPES and size > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File too large: {size} bytes (max {MAX_FILE_SIZE_BYTES})")


def _download_file(file_id: str, metadata: dict[str, Any]) -> tuple[bytes, str]:
    """Download file content from Drive. Returns (content_bytes, filename)."""
    drive = _get_drive_service()
    mime_type = metadata.get("mimeType", "")
    original_name = metadata.get("name", "unknown")

    if mime_type in GOOGLE_EXPORT_TYPES:
        export_mime, ext = GOOGLE_EXPORT_TYPES[mime_type]
        request = drive.files().export_media(fileId=file_id, mimeType=export_mime)
        filename = f"{original_name}{ext}"
    else:
        request = drive.files().get_media(fileId=file_id)
        filename = original_name

    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()

    content = buffer.getvalue()

    # Post-download size check for exported Google-native files
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            f"Exported file too large: {len(content)} bytes (max {MAX_FILE_SIZE_BYTES})"
        )

    return content, filename


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


def _publish_job(
    job_id: str,
    file_uri: str,
    requestor: str,
    source_file_id: str,
) -> str:
    """Publish a de-identification job message to Pub/Sub. Returns message ID."""
    publisher = _get_publisher()
    topic_path = publisher.topic_path(GCP_PROJECT_ID, DEID_TOPIC)

    job_message: dict[str, Any] = {
        "job_id": job_id,
        "source": "drive",
        "file_uri": file_uri,
        "requestor": requestor,
        "mode": "standard",
        "callback": {
            "type": "drive",
            "output_folder_id": OUTPUT_FOLDER_ID,
            "source_file_id": source_file_id,
        },
    }

    data = json.dumps(job_message).encode("utf-8")
    future = publisher.publish(
        topic_path,
        data=data,
        job_id=job_id,
        source="drive",
    )
    message_id = future.result(timeout=30)
    logger.info("Published job %s as message %s", job_id, message_id)
    return message_id


# ---------------------------------------------------------------------------
# Cloud Function entry point (Pub/Sub triggered, 2nd gen / CloudEvent)
# ---------------------------------------------------------------------------


@functions_framework.cloud_event
def drive_watcher(cloud_event: CloudEvent) -> None:
    """Handle a Drive file change notification from Workspace Events API.

    Flow:
        1. Parse Pub/Sub message to get the file ID
        2. Fetch file metadata from Drive API and validate
        3. Download file content to Cloud Storage staging bucket
        4. Publish a standardized job message to phi-deid-jobs topic
    """
    job_id = str(uuid.uuid4())
    logger.info(
        "drive_watcher invoked  job_id=%s  event_id=%s", job_id, cloud_event["id"]
    )

    try:
        # 1. Parse the incoming Pub/Sub notification
        event_data = _parse_pubsub_data(cloud_event)
        file_id = _extract_file_id(event_data)
        logger.info("Processing Drive file %s", file_id)

        # 2. Fetch metadata and validate
        drive = _get_drive_service()
        metadata = (
            drive.files()
            .get(fileId=file_id, fields="id,name,mimeType,size,parents,owners")
            .execute()
        )
        _validate_file_metadata(metadata)

        # Determine requestor from file owner
        owners = metadata.get("owners", [])
        requestor = owners[0].get("emailAddress", "unknown") if owners else "unknown"

        # 3. Download and stage
        content, filename = _download_file(file_id, metadata)
        file_uri = _stage_to_gcs(job_id, filename, content)

        # 4. Publish job
        _publish_job(
            job_id=job_id,
            file_uri=file_uri,
            requestor=requestor,
            source_file_id=file_id,
        )

        logger.info(
            "Job %s created successfully  file=%s  requestor=%s",
            job_id,
            filename,
            requestor,
        )

    except ValueError as exc:
        # Validation errors are not retryable
        logger.warning("Skipping event (validation failed): %s", exc)

    except Exception:
        logger.exception("Unexpected error processing Drive event for job %s", job_id)
        raise  # Re-raise so Cloud Functions retries
