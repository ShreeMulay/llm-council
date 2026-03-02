#!/usr/bin/env python3
"""Download Physician Compare / Clinician data filtered for nephrology.

Key fields: NPI, graduation year, medical school, specialty, group practice,
hospital affiliations, MIPS participation.

Usage:
  python scripts/download_physician_compare.py
"""

import logging
from datetime import datetime, timezone

import pandas as pd

from scripts.bq_helpers import load_dataframe
from scripts.config_loader import get_raw_data_dir, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def download_physician_compare(cfg: dict) -> pd.DataFrame:
    """Download Physician Compare data and filter for nephrology."""
    dataset_id = cfg["data_sources"]["physician_compare"]["dataset_id"]
    url = f"https://data.cms.gov/provider-data/api/1/datastore/query/{dataset_id}/0?format=csv&rowIds=false"

    logger.info("Downloading Physician Compare data (this may take a few minutes)...")
    df = pd.read_csv(url, low_memory=False)
    logger.info(f"Downloaded {len(df)} total clinicians")

    # Filter for nephrology in primary or any secondary specialty
    spec_cols = ["pri_spec"] + [f"sec_spec_{i}" for i in range(1, 5)]
    existing_cols = [c for c in spec_cols if c in df.columns]

    neph_mask = pd.Series(False, index=df.index)
    for col in existing_cols:
        neph_mask |= df[col].str.contains("NEPHROLOGY", case=False, na=False)

    neph_df = df[neph_mask].copy()
    logger.info(f"Filtered to {len(neph_df)} nephrology clinicians")

    return neph_df


def transform_for_bq(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize Physician Compare data."""
    # Standardize column names
    col_map = {
        "npi": "npi",
        "NPI": "npi",
        "lst_nm": "last_name",
        "frst_nm": "first_name",
        "cred": "credential",
        "gndr": "gender",
        "pri_spec": "primary_specialty",
        "grd_yr": "graduation_year",
        "med_sch": "medical_school",
        "org_lgl_nm": "group_practice_name",
        "org_pac_id": "group_practice_pac_id",
        "num_org_mem": "group_practice_size",
        "adr_ln_1": "practice_address_line1",
        "adr_ln_2": "practice_address_line2",
        "cty": "practice_city",
        "st": "practice_state",
        "zip": "practice_zip",
        "phn_numbr": "practice_phone",
        "hosp_afl_1": "hospital_affiliation_ccn_1",
        "hosp_afl_2": "hospital_affiliation_ccn_2",
        "hosp_afl_3": "hospital_affiliation_ccn_3",
    }

    # Rename columns that exist
    rename = {k: v for k, v in col_map.items() if k in df.columns}
    df = df.rename(columns=rename)

    # Ensure npi is string
    if "npi" in df.columns:
        df["npi"] = df["npi"].astype(str)

    # Parse graduation year
    if "graduation_year" in df.columns:
        df["graduation_year"] = pd.to_numeric(df["graduation_year"], errors="coerce")
        # Estimate age: current_year - graduation_year + 26
        current_year = datetime.now().year
        df["estimated_age"] = (current_year - df["graduation_year"] + 26).where(
            df["graduation_year"].notna()
        )

    df["last_refreshed"] = datetime.now(timezone.utc).isoformat()
    return df


def main():
    cfg = load_config()
    df = download_physician_compare(cfg)
    df = transform_for_bq(df)

    # Save locally
    raw_dir = get_raw_data_dir(cfg)
    out_path = raw_dir / "physician_compare_nephrology.csv"
    df.to_csv(out_path, index=False)
    logger.info(f"Saved {len(df)} rows to {out_path}")

    load_dataframe(df, "physician_compare_raw", cfg=cfg)
    return df


if __name__ == "__main__":
    main()
