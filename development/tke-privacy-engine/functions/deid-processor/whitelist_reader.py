"""Provider whitelist reader backed by Google Sheets.

Reads TKE provider names from the "Providers" tab of the Audit Sheet.
Falls back to the static ``provider_whitelist.json`` if the Sheet is
unreachable.  Results are cached for the lifetime of the Cloud Function
instance so we don't re-read on every invocation.

Columns expected in the Providers tab:
    Name | Credential | Role | Status | Variations
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

SHEET_NAME = "Providers"
# Header row matches the columns users see
PROVIDER_COLUMNS = ["Name", "Credential", "Role", "Status", "Variations"]
HEADER_RANGE = f"'{SHEET_NAME}'!A1:E1"
DATA_RANGE = f"'{SHEET_NAME}'!A:E"

# Module-level cache — survives across invocations within the same instance
_cached_provider_names: list[str] | None = None

# Default provider data for initial sheet population
_DEFAULT_PROVIDERS = [
    [
        "Anna Lee-Mulay",
        "MD",
        "Nephrologist",
        "active",
        "Dr. Lee-Mulay, Dr. Anna Lee-Mulay, Anna Lee-Mulay MD",
    ],
    [
        "Shree Mulay",
        "MD",
        "Nephrologist",
        "active",
        "Dr. Mulay, Dr. Shree Mulay, Shree Mulay MD, Dr. S. Mulay",
    ],
    [
        "Ramakant Mulay",
        "MD",
        "Nephrologist",
        "former",
        "Dr. Ramakant Mulay, Dr. R. Mulay, Ramakant Mulay MD, R. Mulay",
    ],
    [
        "Lisa Hoehn",
        "NP",
        "Nurse Practitioner",
        "active",
        "Lisa Hoehn NP, NP Hoehn, Lisa Hoehn FNP",
    ],
    [
        "Leslie Baum",
        "FNP",
        "Nurse Practitioner",
        "active",
        "Leslie Baum FNP, NP Baum, Leslie Baum NP",
    ],
    [
        "Courtney Roberson",
        "FNP",
        "Nurse Practitioner",
        "active",
        "Courtney Roberson NP, Courtney Roberson FNP, NP Roberson",
    ],
    [
        "Clay Walker",
        "PA-C",
        "Physician Assistant",
        "former",
        "Clay Walker PA-C, Clay Walker PA, PA Walker",
    ],
    ["Brandy Carr", "", "Clinical Manager", "active", "Brandy Carr"],
    ["Myk Robinson", "", "IT Manager", "active", "Myk Robinson"],
]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Sheet management
# ---------------------------------------------------------------------------
def _get_sheet_id(service: Any, spreadsheet_id: str, title: str) -> int | None:
    """Return the numeric sheetId for a sheet by title."""
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    for sheet in meta.get("sheets", []):
        if sheet["properties"]["title"] == title:
            return sheet["properties"]["sheetId"]
    return None


def _ensure_providers_sheet(service: Any, spreadsheet_id: str) -> None:
    """Create the 'Providers' tab with headers + default data if it doesn't exist.

    If the sheet already exists and has data, this is a no-op.
    """
    try:
        meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheet_titles = [s["properties"]["title"] for s in meta.get("sheets", [])]

        if SHEET_NAME not in sheet_titles:
            # Add the sheet tab
            service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={
                    "requests": [{"addSheet": {"properties": {"title": SHEET_NAME}}}]
                },
            ).execute()
            logger.info(
                "Created '%s' tab in spreadsheet %s", SHEET_NAME, spreadsheet_id
            )

            # Write headers + default data
            all_rows = [PROVIDER_COLUMNS] + _DEFAULT_PROVIDERS
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"'{SHEET_NAME}'!A1:E{len(all_rows)}",
                valueInputOption="RAW",
                body={"values": all_rows},
            ).execute()
            logger.info(
                "Populated '%s' tab with %d providers",
                SHEET_NAME,
                len(_DEFAULT_PROVIDERS),
            )

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

        else:
            # Sheet exists — check if headers are present
            result = (
                service.spreadsheets()
                .values()
                .get(spreadsheetId=spreadsheet_id, range=HEADER_RANGE)
                .execute()
            )
            existing = result.get("values", [])
            if not existing or existing[0] != PROVIDER_COLUMNS:
                service.spreadsheets().values().update(
                    spreadsheetId=spreadsheet_id,
                    range=HEADER_RANGE,
                    valueInputOption="RAW",
                    body={"values": [PROVIDER_COLUMNS]},
                ).execute()
                logger.info("Wrote header row to '%s'", SHEET_NAME)

    except HttpError as exc:
        logger.exception("Error ensuring providers sheet exists: %s", exc)
        raise


# ---------------------------------------------------------------------------
# Reading providers from the sheet
# ---------------------------------------------------------------------------
def _parse_names_from_rows(rows: list[list[str]]) -> list[str]:
    """Extract a flat list of all name variations from sheet rows.

    Each row: [Name, Credential, Role, Status, Variations]
    Variations is a comma-separated string.

    We produce:
      - The full name (col 0)
      - The last name (last token of col 0)
      - Each variation from col 4 (split on comma, stripped)
    """
    names: list[str] = []
    for row in rows:
        if len(row) < 1:
            continue

        full_name = row[0].strip()
        if not full_name:
            continue

        # Add the full name
        names.append(full_name)

        # Add the last name (useful for "Dr. Mulay" matching)
        parts = full_name.split()
        if len(parts) > 1:
            names.append(parts[-1])

        # Add all explicit variations from column E
        if len(row) >= 5 and row[4]:
            for variation in row[4].split(","):
                v = variation.strip()
                if v:
                    names.append(v)

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for name in names:
        if name not in seen:
            seen.add(name)
            unique.append(name)

    return unique


def read_providers_from_sheet(
    spreadsheet_id: str | None = None,
) -> list[str]:
    """Read provider names from the Providers tab of the Audit Sheet.

    Args:
        spreadsheet_id: Google Sheets spreadsheet ID.  Falls back to
            ``AUDIT_SHEET_ID`` env var.

    Returns:
        Flat list of all provider name variations.

    Raises:
        ValueError: If no spreadsheet ID is available.
    """
    sheet_id = spreadsheet_id or os.environ.get("AUDIT_SHEET_ID")
    if not sheet_id:
        raise ValueError("AUDIT_SHEET_ID env var or spreadsheet_id param is required")

    creds = _get_credentials()
    service = build("sheets", "v4", credentials=creds, cache_discovery=False)

    # Ensure the tab exists (creates + populates on first run)
    _ensure_providers_sheet(service, sheet_id)

    # Read all data rows (skip header)
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=DATA_RANGE)
        .execute()
    )
    all_rows = result.get("values", [])

    # Skip header row
    data_rows = all_rows[1:] if len(all_rows) > 1 else []

    names = _parse_names_from_rows(data_rows)
    logger.info(
        "Loaded %d provider name variations from Sheets (%d rows)",
        len(names),
        len(data_rows),
    )
    return names


# ---------------------------------------------------------------------------
# Fallback: static JSON
# ---------------------------------------------------------------------------
def _read_providers_from_json(path: str) -> list[str]:
    """Load provider names from the static JSON whitelist file.

    Args:
        path: Path to provider_whitelist.json.

    Returns:
        Flat list of provider names from ``all_names_flat``.
    """
    try:
        with open(path) as f:
            data = json.load(f)
        names = data.get("all_names_flat", [])
        logger.info(
            "Loaded %d provider names from JSON fallback (%s)", len(names), path
        )
        return names
    except FileNotFoundError:
        logger.warning("Provider whitelist JSON not found at %s", path)
        return []
    except (json.JSONDecodeError, KeyError) as e:
        logger.error("Failed to parse provider whitelist JSON: %s", e)
        return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def load_provider_names(
    *,
    spreadsheet_id: str | None = None,
    json_fallback_path: str | None = None,
    force_refresh: bool = False,
) -> list[str]:
    """Load TKE provider names — Sheets first, JSON fallback.

    Results are cached in-process.  Use ``force_refresh=True`` to re-read.

    Args:
        spreadsheet_id: Audit Sheet spreadsheet ID (falls back to env var).
        json_fallback_path: Path to ``provider_whitelist.json`` for fallback.
        force_refresh: If True, ignore the cache and re-read from source.

    Returns:
        Flat list of all provider name variations.
    """
    global _cached_provider_names

    if _cached_provider_names is not None and not force_refresh:
        logger.debug("Returning %d cached provider names", len(_cached_provider_names))
        return _cached_provider_names

    # Try Sheets first
    try:
        names = read_providers_from_sheet(spreadsheet_id)
        if names:
            _cached_provider_names = names
            return names
        logger.warning("Sheets returned empty provider list; falling back to JSON")
    except Exception as e:
        logger.warning(
            "Failed to read providers from Sheets: %s. Falling back to JSON.", e
        )

    # Fallback to JSON
    fallback_path = json_fallback_path or os.path.join(
        os.path.dirname(__file__), "provider_whitelist.json"
    )
    names = _read_providers_from_json(fallback_path)
    _cached_provider_names = names
    return names
