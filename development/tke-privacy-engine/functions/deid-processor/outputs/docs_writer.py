"""Google Docs writer for de-identified clinical text.

Creates a new Google Doc in the De-Identified Drive folder with
the de-identified text and processing summary.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# Scopes required for Docs + Drive
SCOPES = [
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/drive.file",
]


def _get_credentials() -> service_account.Credentials:
    """Build credentials from the default service account or ADC."""
    creds, _ = None, None
    try:
        from google.auth import default

        creds, _ = default(scopes=SCOPES)
    except Exception:
        logger.warning("ADC not available; falling back to GOOGLE_APPLICATION_CREDENTIALS")
        sa_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if sa_path:
            creds = service_account.Credentials.from_service_account_file(sa_path, scopes=SCOPES)
    if creds is None:
        raise RuntimeError("No valid Google credentials found for Docs/Drive APIs")
    return creds


def _build_doc_body(
    deid_text: str,
    original_filename: str,
    phi_count: int,
    providers_preserved: list[str],
    confidence_score: float,
    dlp_residual_count: int,
    processing_time_ms: int,
) -> list[dict[str, Any]]:
    """Build the list of Docs API insert requests for the document body.

    Content is inserted in reverse order because each insert pushes
    existing content down.  We build the list top-to-bottom then reverse.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    providers_str = ", ".join(providers_preserved) if providers_preserved else "None"

    sections: list[str] = [
        "DE-IDENTIFIED TEXT - Safe for External Use\n",
        f"Source: {original_filename}\n"
        f"Processed: {now_str}\n"
        f"Confidence: {confidence_score:.1%}\n\n",
        "--- De-Identified Content ---\n\n",
        f"{deid_text}\n\n",
        "--- Processing Summary ---\n\n",
        f"PHI entities removed: {phi_count}\n",
        f"TKE providers preserved: {providers_str}\n",
        f"DLP residual PHI count: {dlp_residual_count}\n",
        f"Processing time: {processing_time_ms} ms\n",
        f"Confidence score: {confidence_score:.4f}\n",
    ]

    requests: list[dict[str, Any]] = []
    idx = 1  # Docs API uses 1-based index

    # Header (bold, larger)
    header_text = sections[0]
    requests.append({"insertText": {"location": {"index": idx}, "text": header_text}})
    requests.append(
        {
            "updateParagraphStyle": {
                "range": {"startIndex": idx, "endIndex": idx + len(header_text)},
                "paragraphStyle": {"namedStyleType": "HEADING_1"},
                "fields": "namedStyleType",
            }
        }
    )
    idx += len(header_text)

    # Metadata block
    meta_text = sections[1]
    requests.append({"insertText": {"location": {"index": idx}, "text": meta_text}})
    idx += len(meta_text)

    # Section divider + de-identified text
    for section in sections[2:4]:
        requests.append({"insertText": {"location": {"index": idx}, "text": section}})
        idx += len(section)

    # Summary divider
    summary_header = sections[4]
    requests.append({"insertText": {"location": {"index": idx}, "text": summary_header}})
    requests.append(
        {
            "updateParagraphStyle": {
                "range": {"startIndex": idx, "endIndex": idx + len(summary_header)},
                "paragraphStyle": {"namedStyleType": "HEADING_2"},
                "fields": "namedStyleType",
            }
        }
    )
    idx += len(summary_header)

    # Summary lines
    for section in sections[5:]:
        requests.append({"insertText": {"location": {"index": idx}, "text": section}})
        idx += len(section)

    return requests


def write_deid_doc(
    *,
    deid_text: str,
    original_filename: str,
    phi_count: int,
    providers_preserved: list[str],
    confidence_score: float,
    dlp_residual_count: int,
    processing_time_ms: int,
    output_folder_id: str | None = None,
) -> str:
    """Create a Google Doc with the de-identified text and return its URL.

    Parameters
    ----------
    deid_text:
        The de-identified clinical text.
    original_filename:
        Name of the original source file.
    phi_count:
        Number of PHI entities that were redacted.
    providers_preserved:
        List of TKE provider names that were intentionally kept.
    confidence_score:
        Overall confidence score (0.0 - 1.0).
    dlp_residual_count:
        Number of residual PHI items found by Cloud DLP after Gemini pass.
    processing_time_ms:
        Total processing time in milliseconds.
    output_folder_id:
        Google Drive folder ID for the output.  Falls back to
        ``OUTPUT_FOLDER_ID`` env var.

    Returns
    -------
    str
        URL of the created Google Doc.
    """
    folder_id = output_folder_id or os.environ.get("OUTPUT_FOLDER_ID")
    if not folder_id:
        raise ValueError("OUTPUT_FOLDER_ID env var or output_folder_id param is required")

    creds = _get_credentials()
    docs_service = build("docs", "v1", credentials=creds, cache_discovery=False)
    drive_service = build("drive", "v3", credentials=creds, cache_discovery=False)

    # Build title
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    # Strip extension from original filename for cleaner title
    base_name = original_filename.rsplit(".", 1)[0] if "." in original_filename else original_filename
    doc_title = f"De-ID_{base_name}_{timestamp}"

    try:
        # 1. Create the document
        doc = docs_service.documents().create(body={"title": doc_title}).execute()
        doc_id = doc["documentId"]
        logger.info("Created Google Doc: %s (ID: %s)", doc_title, doc_id)

        # 2. Move to the output folder
        #    New files are created in the service account's root Drive.
        #    We move them into the shared De-Identified folder.
        drive_service.files().update(
            fileId=doc_id,
            addParents=folder_id,
            removeParents="root",
            fields="id, parents",
        ).execute()
        logger.info("Moved doc %s to folder %s", doc_id, folder_id)

        # 3. Populate the document body
        body_requests = _build_doc_body(
            deid_text=deid_text,
            original_filename=original_filename,
            phi_count=phi_count,
            providers_preserved=providers_preserved,
            confidence_score=confidence_score,
            dlp_residual_count=dlp_residual_count,
            processing_time_ms=processing_time_ms,
        )
        docs_service.documents().batchUpdate(
            documentId=doc_id,
            body={"requests": body_requests},
        ).execute()
        logger.info("Populated doc %s with de-identified content", doc_id)

        doc_url = f"https://docs.google.com/document/d/{doc_id}/edit"
        return doc_url

    except HttpError as exc:
        logger.exception("Google API error creating de-identified doc: %s", exc)
        raise
