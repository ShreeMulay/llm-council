"""Google Sheets writer for the TKE De-ID Audit Log.

Appends a row to the audit spreadsheet for every de-identification job.
Creates the sheet with headers if it doesn't already exist.
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

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Column headers matching config/settings.yaml -> sheets.columns
AUDIT_COLUMNS = [
    "job_id",
    "timestamp",
    "source",
    "requestor",
    "file_name",
    "phi_count",
    "phi_types",
    "confidence_score",
    "dlp_residual_count",
    "status",
    "output_doc_url",
    "processing_time_ms",
]

SHEET_NAME = "Audit Log"
HEADER_RANGE = f"'{SHEET_NAME}'!A1:L1"
APPEND_RANGE = f"'{SHEET_NAME}'!A:L"


def _get_credentials() -> service_account.Credentials:
    """Build credentials from ADC or explicit service account file."""
    try:
        from google.auth import default

        creds, _ = default(scopes=SCOPES)
        return creds
    except Exception:
        sa_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if sa_path:
            return service_account.Credentials.from_service_account_file(
                sa_path, scopes=SCOPES
            )
    raise RuntimeError("No valid Google credentials found for Sheets API")


def _ensure_sheet_exists(
    service: Any,
    spreadsheet_id: str,
) -> None:
    """Create the 'Audit Log' sheet with headers if it doesn't exist yet.

    If the spreadsheet has no sheet named ``SHEET_NAME``, we add one and
    write the header row.  If the sheet exists but row 1 is empty, we
    write headers.
    """
    try:
        meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheet_titles = [s["properties"]["title"] for s in meta.get("sheets", [])]

        if SHEET_NAME not in sheet_titles:
            # Add the sheet
            service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={
                    "requests": [
                        {
                            "addSheet": {
                                "properties": {"title": SHEET_NAME},
                            }
                        }
                    ]
                },
            ).execute()
            logger.info("Created sheet '%s' in spreadsheet %s", SHEET_NAME, spreadsheet_id)

        # Check if headers are present
        result = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=spreadsheet_id, range=HEADER_RANGE)
            .execute()
        )
        existing = result.get("values", [])

        if not existing or existing[0] != AUDIT_COLUMNS:
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=HEADER_RANGE,
                valueInputOption="RAW",
                body={"values": [AUDIT_COLUMNS]},
            ).execute()
            logger.info("Wrote header row to '%s'", SHEET_NAME)

            # Bold + freeze the header row
            sheet_id = _get_sheet_id(service, spreadsheet_id, SHEET_NAME)
            if sheet_id is not None:
                service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={
                        "requests": [
                            {
                                "repeatCell": {
                                    "range": {
                                        "sheetId": sheet_id,
                                        "startRowIndex": 0,
                                        "endRowIndex": 1,
                                    },
                                    "cell": {
                                        "userEnteredFormat": {
                                            "textFormat": {"bold": True},
                                        }
                                    },
                                    "fields": "userEnteredFormat.textFormat.bold",
                                }
                            },
                            {
                                "updateSheetProperties": {
                                    "properties": {
                                        "sheetId": sheet_id,
                                        "gridProperties": {"frozenRowCount": 1},
                                    },
                                    "fields": "gridProperties.frozenRowCount",
                                }
                            },
                        ]
                    },
                ).execute()

    except HttpError as exc:
        logger.exception("Error ensuring audit sheet exists: %s", exc)
        raise


def _get_sheet_id(service: Any, spreadsheet_id: str, title: str) -> int | None:
    """Return the numeric sheetId for a sheet by title."""
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    for sheet in meta.get("sheets", []):
        if sheet["properties"]["title"] == title:
            return sheet["properties"]["sheetId"]
    return None


def append_audit_row(
    *,
    job_id: str,
    source: str,
    requestor: str,
    file_name: str,
    phi_count: int,
    phi_types: list[str],
    confidence_score: float,
    dlp_residual_count: int,
    status: str,
    output_doc_url: str,
    processing_time_ms: int,
    audit_sheet_id: str | None = None,
) -> dict[str, Any]:
    """Append a single audit row to the TKE De-ID Audit Log spreadsheet.

    Parameters
    ----------
    job_id:
        Unique identifier for this de-identification job.
    source:
        Origin of the request (``drive``, ``chat``, ``api``).
    requestor:
        Email or name of the person who initiated the request.
    file_name:
        Original file name that was processed.
    phi_count:
        Total number of PHI entities detected and redacted.
    phi_types:
        List of PHI type labels found (e.g. ``["PERSON_NAME", "DATE_OF_BIRTH"]``).
    confidence_score:
        Overall confidence score (0.0 - 1.0).
    dlp_residual_count:
        Number of residual PHI items found by Cloud DLP verification pass.
    status:
        Job status (``completed``, ``review_required``, ``failed``).
    output_doc_url:
        URL of the created de-identified Google Doc.
    processing_time_ms:
        Total processing time in milliseconds.
    audit_sheet_id:
        Google Sheets spreadsheet ID.  Falls back to ``AUDIT_SHEET_ID`` env var.

    Returns
    -------
    dict
        Sheets API append response metadata.
    """
    spreadsheet_id = audit_sheet_id or os.environ.get("AUDIT_SHEET_ID")
    if not spreadsheet_id:
        raise ValueError("AUDIT_SHEET_ID env var or audit_sheet_id param is required")

    creds = _get_credentials()
    service = build("sheets", "v4", credentials=creds, cache_discovery=False)

    # Ensure the sheet and headers exist
    _ensure_sheet_exists(service, spreadsheet_id)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    phi_types_str = ", ".join(sorted(set(phi_types)))

    row = [
        job_id,
        timestamp,
        source,
        requestor,
        file_name,
        phi_count,
        phi_types_str,
        f"{confidence_score:.4f}",
        dlp_residual_count,
        status,
        output_doc_url,
        processing_time_ms,
    ]

    try:
        result = (
            service.spreadsheets()
            .values()
            .append(
                spreadsheetId=spreadsheet_id,
                range=APPEND_RANGE,
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body={"values": [row]},
            )
            .execute()
        )
        logger.info(
            "Appended audit row for job %s to sheet %s",
            job_id,
            spreadsheet_id,
        )
        return result
    except HttpError as exc:
        logger.exception("Error appending audit row for job %s: %s", job_id, exc)
        raise
