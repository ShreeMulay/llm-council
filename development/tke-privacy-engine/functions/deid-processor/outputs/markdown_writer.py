"""Markdown file writer for de-identified clinical text.

Creates two markdown files in Google Drive:
  1. ``*_deid.md`` — De-identified text only (safe for external use)
  2. ``*_summary.md`` — Processing summary with metadata (no PHI)

Both files are uploaded to the De-Identified Drive folder alongside
the Google Doc output.
"""

from __future__ import annotations

import io
import logging
import os
from datetime import datetime, timezone
from typing import Any

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import google.auth

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive.file"]


def _get_credentials() -> Any:
    """Build credentials from ADC or explicit service account."""
    try:
        creds, _ = google.auth.default(scopes=SCOPES)
        return creds
    except Exception:
        from google.oauth2 import service_account

        sa_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if sa_path:
            return service_account.Credentials.from_service_account_file(
                sa_path, scopes=SCOPES
            )
    raise RuntimeError("No valid Google credentials found for Drive API")


def _upload_md_to_drive(
    drive_service: Any,
    filename: str,
    content: str,
    folder_id: str,
) -> str:
    """Upload a markdown file to Google Drive.

    Args:
        drive_service: Authenticated Google Drive API service.
        filename: Name for the file in Drive.
        content: Markdown string content.
        folder_id: Target Drive folder ID.

    Returns:
        URL of the uploaded file.
    """
    file_metadata = {
        "name": filename,
        "parents": [folder_id],
        "mimeType": "text/markdown",
    }

    media = MediaIoBaseUpload(
        io.BytesIO(content.encode("utf-8")),
        mimetype="text/markdown",
        resumable=False,
    )

    file = (
        drive_service.files()
        .create(
            body=file_metadata,
            media_body=media,
            supportsAllDrives=True,
            fields="id, webViewLink",
        )
        .execute()
    )

    file_id = file["id"]
    url = file.get("webViewLink", f"https://drive.google.com/file/d/{file_id}/view")
    logger.info("Uploaded markdown file '%s' (ID: %s)", filename, file_id)
    return url


def _build_deid_markdown(
    deid_text: str,
    original_filename: str,
) -> str:
    """Build the de-identified text markdown (safe for external use).

    Args:
        deid_text: The de-identified clinical text with TKE tokens.
        original_filename: Name of the original source file.

    Returns:
        Markdown string containing only the de-identified text.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    return f"""# De-Identified Clinical Text

> **Source**: {original_filename}
> **Processed**: {now_str}
> **Status**: Safe for external use, AI training, non-BAA tools

---

{deid_text}

---

*De-identified using TKE Privacy Engine (HIPAA Safe Harbor)*
"""


def _build_summary_markdown(
    original_filename: str,
    job_id: str,
    phi_count: int,
    providers_preserved: list[str],
    eponyms_preserved: list[str],
    confidence_score: float,
    dlp_residual_count: int,
    age_90_plus_applied: bool,
    needs_review: bool,
    processing_time_ms: int,
    entities: list[dict[str, Any]],
) -> str:
    """Build the processing summary markdown (no PHI).

    This file contains metadata about the de-identification process
    but does NOT contain the original PHI values. Safe for sharing
    as an audit artifact.

    Args:
        original_filename: Name of the original source file.
        job_id: Unique job identifier.
        phi_count: Total PHI entities found.
        providers_preserved: List of TKE provider names preserved.
        eponyms_preserved: List of medical eponyms preserved.
        confidence_score: Overall confidence score.
        dlp_residual_count: Residual PHI from DLP verification.
        age_90_plus_applied: Whether age 90+ rule was applied.
        needs_review: Whether human review is flagged.
        processing_time_ms: Total processing time.
        entities: List of entity dicts (token + type only, no originals).

    Returns:
        Markdown string with processing summary.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    providers_str = ", ".join(providers_preserved) if providers_preserved else "None"
    eponyms_str = ", ".join(eponyms_preserved) if eponyms_preserved else "None"
    review_status = "REVIEW REQUIRED" if needs_review else "PASSED"
    confidence_pct = f"{confidence_score:.1%}"

    # Build entity type summary (counts by type, no original values)
    type_counts: dict[str, int] = {}
    for entity in entities:
        etype = entity.get("entity_type", "Unknown")
        type_counts[etype] = type_counts.get(etype, 0) + 1

    type_rows = ""
    for etype, count in sorted(type_counts.items()):
        type_rows += f"| {etype} | {count} |\n"

    # Build token list (tokens only, no original PHI)
    token_rows = ""
    for entity in entities:
        token_rows += (
            f"| {entity.get('token', '')} | {entity.get('entity_type', '')} |\n"
        )

    return f"""# De-Identification Processing Summary

> **Source**: {original_filename}
> **Job ID**: {job_id}
> **Processed**: {now_str}

---

## Processing Metrics

| Metric | Value |
|--------|-------|
| PHI elements found | {phi_count} |
| Confidence score | {confidence_pct} |
| DLP residual findings | {dlp_residual_count} |
| Age 90+ rule applied | {"Yes" if age_90_plus_applied else "No"} |
| Processing time | {processing_time_ms} ms |
| Review status | {review_status} |

## TKE Providers Preserved

{providers_str}

## Medical Eponyms Preserved

{eponyms_str}

## PHI Types Found

| Type | Count |
|------|-------|
{type_rows}

## Tokens Applied

| Token | Type |
|-------|------|
{token_rows}

---

*Generated by TKE Privacy Engine | HIPAA Safe Harbor Compliant*
*Mapping table stored separately in Firestore (job: {job_id})*
"""


def write_deid_markdown(
    *,
    deid_text: str,
    original_filename: str,
    job_id: str,
    phi_count: int,
    providers_preserved: list[str],
    eponyms_preserved: list[str],
    confidence_score: float,
    dlp_residual_count: int,
    age_90_plus_applied: bool,
    needs_review: bool,
    processing_time_ms: int,
    entities: list[dict[str, Any]],
    output_folder_id: str | None = None,
) -> dict[str, str]:
    """Create two markdown files in Google Drive.

    Parameters
    ----------
    deid_text:
        The de-identified clinical text.
    original_filename:
        Name of the original source file.
    job_id:
        Unique job identifier.
    phi_count:
        Number of PHI entities detected.
    providers_preserved:
        TKE provider names preserved in output.
    eponyms_preserved:
        Medical eponyms preserved in output.
    confidence_score:
        Overall confidence score (0.0 - 1.0).
    dlp_residual_count:
        Residual PHI count from DLP.
    age_90_plus_applied:
        Whether the age 90+ Safe Harbor rule was applied.
    needs_review:
        Whether the job is flagged for human review.
    processing_time_ms:
        Total processing time in milliseconds.
    entities:
        List of entity dicts with token and entity_type keys.
    output_folder_id:
        Drive folder ID. Falls back to ``OUTPUT_FOLDER_ID`` env var.

    Returns
    -------
    dict
        ``{"deid_url": "...", "summary_url": "..."}`` with Drive URLs.
    """
    folder_id = output_folder_id or os.environ.get("OUTPUT_FOLDER_ID")
    if not folder_id:
        raise ValueError(
            "OUTPUT_FOLDER_ID env var or output_folder_id param is required"
        )

    creds = _get_credentials()
    drive_service = build("drive", "v3", credentials=creds, cache_discovery=False)

    # Build clean base name
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    base_name = (
        original_filename.rsplit(".", 1)[0]
        if "." in original_filename
        else original_filename
    )

    # File 1: De-identified text only (safe for external use)
    deid_md = _build_deid_markdown(deid_text, original_filename)
    deid_filename = f"{base_name}_{timestamp}_deid.md"
    deid_url = _upload_md_to_drive(drive_service, deid_filename, deid_md, folder_id)

    # File 2: Processing summary (no PHI, safe as audit artifact)
    summary_md = _build_summary_markdown(
        original_filename=original_filename,
        job_id=job_id,
        phi_count=phi_count,
        providers_preserved=providers_preserved,
        eponyms_preserved=eponyms_preserved,
        confidence_score=confidence_score,
        dlp_residual_count=dlp_residual_count,
        age_90_plus_applied=age_90_plus_applied,
        needs_review=needs_review,
        processing_time_ms=processing_time_ms,
        entities=entities,
    )
    summary_filename = f"{base_name}_{timestamp}_summary.md"
    summary_url = _upload_md_to_drive(
        drive_service, summary_filename, summary_md, folder_id
    )

    logger.info(
        "Wrote markdown files for job %s: deid=%s, summary=%s",
        job_id,
        deid_filename,
        summary_filename,
    )

    return {
        "deid_url": deid_url,
        "summary_url": summary_url,
    }
