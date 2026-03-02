#!/usr/bin/env python3
"""Export scored targets to Google Sheets for human review.

Creates/updates a Google Sheet with the top 200 scored providers,
formatted with conditional formatting for tier visualization.

Prerequisites:
  - Google Sheets API enabled on GCP project
  - Service account with Sheets/Drive access, or user OAuth credentials
  - gspread library installed

Usage:
  python scripts/export_to_sheets.py
"""

import logging
import os

from scripts.bq_helpers import get_client, run_query
from scripts.config_loader import get_table_ref, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SPREADSHEET_NAME = os.getenv("SHEETS_SPREADSHEET_NAME", "TKE M&A Target Pipeline")
WORKSHEET_NAME = "Scored Targets"


def export_to_sheets():
    """Query BigQuery and push results to Google Sheets."""
    cfg = load_config()
    project = cfg["gcp"]["project_id"]
    dataset = cfg["gcp"]["dataset"]

    # Query the dashboard view for top targets
    query = f"""
    SELECT
      npi,
      first_name || ' ' || last_name AS provider_name,
      credential,
      graduation_year,
      CAST(estimated_age AS INT64) AS estimated_age,
      CASE WHEN is_solo_practice THEN 'Solo'
           ELSE COALESCE(group_practice_name, 'Unknown')
      END AS practice_type,
      CAST(group_practice_size AS INT64) AS group_size,
      practice_city || ', ' || practice_state AS location,
      practice_phone,
      ROUND(total_weighted_score, 1) AS score,
      tier,
      practice_archetype,
      CAST(age_score AS INT64) AS age_signal,
      CAST(solo_practice_score AS INT64) AS solo_signal,
      CAST(volume_trend_score AS INT64) AS volume_signal,
      CAST(independence_likelihood_score AS INT64) AS independence_signal,
      ROUND(ma_adjusted_revenue, 0) AS est_total_revenue,
      ARRAY_TO_STRING(top_signals, ', ') AS top_signals,
      contact_status,
      manual_notes,
      calculated_date
    FROM `{project}.{dataset}.v_provider_dashboard`
    WHERE total_weighted_score IS NOT NULL
    ORDER BY total_weighted_score DESC
    LIMIT 200
    """

    logger.info("Querying scored targets...")
    df = run_query(query, cfg)
    logger.info(f"Got {len(df)} targets to export")

    if df.empty:
        logger.warning("No scored targets to export")
        return

    # Export to Google Sheets
    try:
        import gspread
        from google.auth import default

        creds, _ = default(
            scopes=[
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive",
            ]
        )
        gc = gspread.authorize(creds)

        # Open or create spreadsheet
        try:
            sh = gc.open(SPREADSHEET_NAME)
            logger.info(f"Opened existing spreadsheet: {SPREADSHEET_NAME}")
        except gspread.SpreadsheetNotFound:
            sh = gc.create(SPREADSHEET_NAME)
            # Share with Dr. Mulay
            sh.share("shree.mulay@thekidneyexperts.com", perm_type="user", role="writer")
            logger.info(f"Created new spreadsheet: {SPREADSHEET_NAME}")

        # Open or create worksheet
        try:
            ws = sh.worksheet(WORKSHEET_NAME)
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(WORKSHEET_NAME, rows=250, cols=25)

        # Clear and write
        ws.clear()

        # Headers
        headers = df.columns.tolist()
        ws.update("A1", [headers])

        # Data — convert to list of lists, handling NaN/None
        data = df.fillna("").astype(str).values.tolist()
        if data:
            ws.update("A2", data)

        # Format header row
        ws.format(
            "A1:U1",
            {
                "backgroundColor": {"red": 0.15, "green": 0.15, "blue": 0.35},
                "textFormat": {
                    "bold": True,
                    "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                },
            },
        )

        logger.info(f"Exported {len(data)} rows to Google Sheets")
        logger.info(f"Sheet URL: {sh.url}")

    except ImportError:
        logger.warning("gspread not installed — falling back to CSV export")
        out_path = "data/scored_targets_export.csv"
        df.to_csv(out_path, index=False)
        logger.info(f"Exported to {out_path}")

    except Exception as e:
        logger.error(f"Sheets export failed: {e}")
        # Fallback to CSV
        out_path = "data/scored_targets_export.csv"
        df.to_csv(out_path, index=False)
        logger.info(f"Fallback: exported to {out_path}")


if __name__ == "__main__":
    export_to_sheets()
