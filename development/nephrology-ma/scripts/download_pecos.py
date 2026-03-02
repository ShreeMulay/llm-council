#!/usr/bin/env python3
"""Download PECOS enrollment and reassignment data.

Reassignment data is critical for:
  - Detecting solo vs group practice
  - Mapping organizational structure
  - Identifying independence (who bills through whom)

Usage:
  python scripts/download_pecos.py
"""

import logging
from datetime import datetime, timezone

import pandas as pd

from scripts.bq_helpers import load_dataframe
from scripts.config_loader import get_raw_data_dir, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def download_pecos_reassignment(cfg: dict) -> pd.DataFrame:
    """Download PECOS physician reassignment data."""
    # The reassignment dataset shows which NPIs bill through which organizations
    url = cfg["data_sources"]["pecos"]["reassignment"]

    logger.info("Downloading PECOS reassignment data...")

    # Try the CMS data API
    # The dataset ID needs to be resolved from the catalog
    # For now, use the direct download approach
    try:
        df = pd.read_csv(url, low_memory=False)
    except Exception:
        # Fallback: try the API endpoint
        logger.info("Direct CSV failed, trying API approach...")
        api_url = (
            "https://data.cms.gov/data-api/v1/dataset/"
            "0d3d-232c/data?size=5000"  # Reassignment dataset
        )
        df = pd.read_json(api_url)

    logger.info(f"Downloaded {len(df)} reassignment records")
    return df


def filter_to_nephrology(df: pd.DataFrame, known_npis: set[str]) -> pd.DataFrame:
    """Filter reassignment data to records involving known nephrology NPIs."""
    # Look for columns that contain NPI values
    npi_cols = [c for c in df.columns if "npi" in c.lower()]
    logger.info(f"NPI columns found: {npi_cols}")

    if not npi_cols:
        logger.warning("No NPI columns found in reassignment data")
        return df

    # Filter to rows where any NPI column matches our known nephrology NPIs
    mask = pd.Series(False, index=df.index)
    for col in npi_cols:
        df[col] = df[col].astype(str)
        mask |= df[col].isin(known_npis)

    filtered = df[mask].copy()
    logger.info(f"Filtered to {len(filtered)} nephrology-related reassignment records")
    return filtered


def derive_org_structure(df: pd.DataFrame) -> pd.DataFrame:
    """Analyze reassignment data to detect solo vs group practice."""
    # Standardize column names
    col_candidates = {
        "individual_npi": ["Individual NPI", "individual_npi", "INDIVIDUAL_NPI"],
        "individual_name": ["Individual First Name", "individual_first_name"],
        "org_npi": ["Organization NPI", "organization_npi", "ORGANIZATION_NPI"],
        "org_name": [
            "Organization Legal Business Name",
            "organization_legal_business_name",
        ],
        "state": ["State", "state", "STATE"],
    }

    for target, candidates in col_candidates.items():
        for c in candidates:
            if c in df.columns:
                df = df.rename(columns={c: target})
                break

    if "individual_npi" not in df.columns or "org_npi" not in df.columns:
        logger.warning("Cannot derive org structure — missing required columns")
        return df

    # Count how many individual NPIs reassign to each org
    org_sizes = df.groupby("org_npi")["individual_npi"].nunique().reset_index()
    org_sizes.columns = ["org_npi", "member_count"]

    # Solo practice: individual NPI == org NPI, or only 1 member
    df = df.merge(org_sizes, on="org_npi", how="left")
    df["is_solo"] = (df["individual_npi"] == df["org_npi"]) | (df["member_count"] == 1)

    df["last_refreshed"] = datetime.now(timezone.utc).isoformat()
    return df


def main():
    cfg = load_config()

    df = download_pecos_reassignment(cfg)

    # Save full raw data
    raw_dir = get_raw_data_dir(cfg)
    out_path = raw_dir / "pecos_reassignment.csv"
    df.to_csv(out_path, index=False)
    logger.info(f"Saved {len(df)} raw reassignment rows to {out_path}")

    # Load raw to BigQuery (we'll filter during ETL)
    load_dataframe(df, "pecos_reassignment_raw", cfg=cfg)

    return df


if __name__ == "__main__":
    main()
