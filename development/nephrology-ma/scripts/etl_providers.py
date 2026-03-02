#!/usr/bin/env python3
"""ETL: Merge NPPES + Physician Compare into the providers table.

This is the critical entity resolution step that the LLM Council identified
as the #1 technical risk. This script:
  1. Loads raw NPPES and Physician Compare data from BigQuery staging tables
  2. Joins on NPI to merge fields (graduation year, group practice, etc.)
  3. Derives solo practice status from PECOS reassignment data
  4. Computes estimated age from graduation year
  5. Loads the merged result into the providers table

Usage:
  python scripts/etl_providers.py
"""

import logging
from datetime import datetime, timezone

import pandas as pd

from scripts.bq_helpers import get_client, load_dataframe, run_query, table_exists
from scripts.config_loader import get_table_ref, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def merge_providers(cfg: dict) -> pd.DataFrame:
    """Merge NPPES + Physician Compare + PECOS into a unified providers table."""
    project = cfg["gcp"]["project_id"]
    dataset = cfg["gcp"]["dataset"]

    # Step 1: Load NPPES as the base
    logger.info("Loading NPPES raw data...")
    nppes_ref = f"`{project}.{dataset}.nppes_raw`"
    nppes = run_query(f"SELECT * FROM {nppes_ref}", cfg)
    logger.info(f"  NPPES: {len(nppes)} records")

    if nppes.empty:
        logger.error("No NPPES data found. Run download_nppes.py first.")
        return pd.DataFrame()

    # Step 2: Load Physician Compare for enrichment
    pc_ref = f"`{project}.{dataset}.physician_compare_raw`"
    if table_exists("physician_compare_raw", cfg):
        logger.info("Loading Physician Compare data for enrichment...")
        pc = run_query(f"SELECT * FROM {pc_ref}", cfg)
        logger.info(f"  Physician Compare: {len(pc)} records")
    else:
        logger.warning("Physician Compare not loaded yet — skipping enrichment")
        pc = pd.DataFrame()

    # Step 3: Merge on NPI
    providers = nppes.copy()

    if not pc.empty and "npi" in pc.columns:
        # Ensure string NPI for join
        providers["npi"] = providers["npi"].astype(str)
        pc["npi"] = pc["npi"].astype(str)

        # Select enrichment columns from Physician Compare
        pc_cols = ["npi"]
        for col in [
            "graduation_year",
            "medical_school",
            "estimated_age",
            "group_practice_pac_id",
            "group_practice_name",
            "group_practice_size",
            "hospital_affiliation_ccn_1",
            "hospital_affiliation_ccn_2",
            "hospital_affiliation_ccn_3",
            "primary_specialty",
        ]:
            if col in pc.columns and col not in providers.columns:
                pc_cols.append(col)

        if len(pc_cols) > 1:
            pc_subset = pc[pc_cols].drop_duplicates(subset=["npi"])
            providers = providers.merge(pc_subset, on="npi", how="left")
            logger.info(f"  Merged: {len(providers)} providers after join")

    # Step 4: Derive estimated age if not already present
    current_year = datetime.now().year
    avg_grad_age = cfg["scoring"]["avg_med_school_grad_age"]

    if "graduation_year" in providers.columns:
        providers["graduation_year"] = pd.to_numeric(providers["graduation_year"], errors="coerce")
        if "estimated_age" not in providers.columns:
            providers["estimated_age"] = (
                current_year - providers["graduation_year"] + avg_grad_age
            ).where(providers["graduation_year"].notna())

    # Step 5: Derive solo practice from PECOS if available
    pecos_ref = f"`{project}.{dataset}.pecos_reassignment_raw`"
    if table_exists("pecos_reassignment_raw", cfg):
        logger.info("Deriving solo practice status from PECOS...")
        # Count unique individual NPIs per org NPI
        pecos_query = f"""
        SELECT
          individual_npi AS npi,
          org_npi,
          member_count,
          CASE
            WHEN individual_npi = org_npi THEN TRUE
            WHEN member_count = 1 THEN TRUE
            ELSE FALSE
          END AS is_solo
        FROM (
          SELECT
            *,
            COUNT(DISTINCT individual_npi) OVER (PARTITION BY org_npi) AS member_count
          FROM {pecos_ref}
          WHERE individual_npi IS NOT NULL
        )
        """
        try:
            pecos = run_query(pecos_query, cfg)
            if not pecos.empty:
                pecos["npi"] = pecos["npi"].astype(str)
                pecos_dedup = pecos.drop_duplicates(subset=["npi"])
                providers = providers.merge(
                    pecos_dedup[["npi", "is_solo"]].rename(columns={"is_solo": "is_solo_practice"}),
                    on="npi",
                    how="left",
                )
                logger.info(
                    f"  Solo practice detection applied to {pecos_dedup['is_solo'].sum()} providers"
                )
        except Exception as e:
            logger.warning(f"PECOS merge failed: {e}")

    # Step 6: Map entity_type to int
    if "entity_type" in providers.columns:
        type_map = {"NPI-1": 1, "NPI-2": 2}
        if providers["entity_type"].dtype == object:
            providers["entity_type"] = providers["entity_type"].map(type_map).fillna(0).astype(int)

    # Step 7: Final cleanup
    providers["last_refreshed"] = datetime.now(timezone.utc).isoformat()

    # Ensure all expected columns exist (fill missing with None)
    expected_cols = [
        "npi",
        "entity_type",
        "last_name",
        "first_name",
        "middle_name",
        "credential",
        "gender",
        "graduation_year",
        "medical_school",
        "primary_taxonomy",
        "primary_specialty",
        "practice_address_line1",
        "practice_address_line2",
        "practice_city",
        "practice_state",
        "practice_zip",
        "practice_phone",
        "mail_address_line1",
        "mail_city",
        "mail_state",
        "mail_zip",
        "enumeration_date",
        "is_sole_proprietor",
        "is_solo_practice",
        "group_practice_pac_id",
        "group_practice_name",
        "group_practice_size",
        "estimated_age",
        "last_refreshed",
    ]
    for col in expected_cols:
        if col not in providers.columns:
            providers[col] = None

    logger.info(f"Final providers table: {len(providers)} rows, {len(providers.columns)} columns")
    return providers


def main():
    cfg = load_config()
    providers = merge_providers(cfg)

    if providers.empty:
        logger.error("No provider data to load")
        return

    load_dataframe(providers, "providers", cfg=cfg)
    logger.info("Providers table loaded successfully")


if __name__ == "__main__":
    main()
