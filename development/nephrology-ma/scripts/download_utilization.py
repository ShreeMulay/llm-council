#!/usr/bin/env python3
"""Download Medicare Provider Utilization & Payment data for nephrology.

Downloads multiple years (2018-2022) of per-NPI, per-HCPCS billing data.
This is the most valuable dataset — shows exact billing volumes by procedure.

Usage:
  python scripts/download_utilization.py
  python scripts/download_utilization.py --years 2021 2022
"""

import argparse
import logging
from datetime import datetime, timezone

import pandas as pd
from tqdm import tqdm

from scripts.bq_helpers import load_dataframe
from scripts.config_loader import get_raw_data_dir, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def download_utilization_year(year: int, dataset_id: str) -> pd.DataFrame:
    """Download Medicare utilization data for a given year, filtered to nephrology."""
    url = (
        f"https://data.cms.gov/provider-data/api/1/datastore/query/{dataset_id}/0"
        f"?format=csv&rowIds=false"
    )

    logger.info(f"Downloading {year} utilization data...")

    # Read in chunks — the full file is ~2GB per year
    filtered_chunks = []
    chunk_count = 0

    for chunk in pd.read_csv(url, chunksize=100_000, low_memory=False):
        chunk_count += 1
        # Filter for nephrology provider type
        type_col = None
        for candidate in ["Rndrng_Prvdr_Type", "rndrng_prvdr_type", "provider_type"]:
            if candidate in chunk.columns:
                type_col = candidate
                break

        if type_col is None:
            logger.warning(
                f"  No provider type column found in chunk. Columns: {list(chunk.columns)[:10]}"
            )
            continue

        neph = chunk[chunk[type_col].str.contains("Nephrology", case=False, na=False)]
        if len(neph) > 0:
            neph = neph.copy()
            neph["year"] = year
            filtered_chunks.append(neph)

        if chunk_count % 20 == 0:
            total_rows = sum(len(c) for c in filtered_chunks)
            logger.info(f"  Processed {chunk_count} chunks, {total_rows} nephrology rows so far")

    if not filtered_chunks:
        logger.warning(f"  No nephrology data found for {year}")
        return pd.DataFrame()

    df = pd.concat(filtered_chunks, ignore_index=True)
    logger.info(f"  {year}: {len(df)} nephrology utilization rows")
    return df


def transform_for_bq(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize utilization data column names for BigQuery."""
    col_map = {
        "Rndrng_NPI": "npi",
        "rndrng_npi": "npi",
        "Rndrng_Prvdr_Type": "provider_type",
        "rndrng_prvdr_type": "provider_type",
        "Rndrng_Prvdr_State_Abrvtn": "provider_state",
        "rndrng_prvdr_state_abrvtn": "provider_state",
        "HCPCS_Cd": "hcpcs_code",
        "hcpcs_cd": "hcpcs_code",
        "HCPCS_Desc": "hcpcs_description",
        "hcpcs_desc": "hcpcs_description",
        "Place_Of_Srvc": "place_of_service",
        "place_of_srvc": "place_of_service",
        "Tot_Benes": "total_unique_beneficiaries",
        "tot_benes": "total_unique_beneficiaries",
        "Tot_Srvcs": "total_services",
        "tot_srvcs": "total_services",
        "Tot_Sbmtd_Chrg": "total_submitted_charges",
        "tot_sbmtd_chrg": "total_submitted_charges",
        "Tot_Mdcr_Alowd_Amt": "total_medicare_allowed_amount",
        "tot_mdcr_alowd_amt": "total_medicare_allowed_amount",
        "Tot_Mdcr_Pymt_Amt": "total_medicare_payment",
        "tot_mdcr_pymt_amt": "total_medicare_payment",
        "Avg_Mdcr_Alowd_Amt": "average_medicare_allowed_amount",
        "avg_mdcr_alowd_amt": "average_medicare_allowed_amount",
        "Avg_Sbmtd_Chrg": "average_submitted_charge",
        "avg_sbmtd_chrg": "average_submitted_charge",
        "Avg_Mdcr_Pymt_Amt": "average_medicare_payment",
        "avg_mdcr_pymt_amt": "average_medicare_payment",
    }

    rename = {k: v for k, v in col_map.items() if k in df.columns}
    df = df.rename(columns=rename)

    if "npi" in df.columns:
        df["npi"] = df["npi"].astype(str)

    # Ensure numeric columns
    numeric_cols = [
        "total_services",
        "total_unique_beneficiaries",
        "total_submitted_charges",
        "total_medicare_allowed_amount",
        "total_medicare_payment",
        "average_medicare_allowed_amount",
        "average_submitted_charge",
        "average_medicare_payment",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df["last_refreshed"] = datetime.now(timezone.utc).isoformat()
    return df


def main():
    parser = argparse.ArgumentParser(description="Download Medicare utilization data")
    parser.add_argument(
        "--years", nargs="+", type=int, help="Specific years to download (default: all configured)"
    )
    parser.add_argument("--dry-run", action="store_true", help="Download but don't load to BQ")
    args = parser.parse_args()

    cfg = load_config()
    datasets = cfg["data_sources"]["utilization"]["datasets"]

    years_to_download = args.years or list(datasets.keys())

    raw_dir = get_raw_data_dir(cfg)

    for year in sorted(years_to_download):
        dataset_id = datasets.get(year)
        if not dataset_id:
            logger.warning(f"No dataset ID configured for year {year}, skipping")
            continue

        df = download_utilization_year(year, dataset_id)
        if df.empty:
            continue

        df = transform_for_bq(df)

        # Save locally
        out_path = raw_dir / f"utilization_nephrology_{year}.csv"
        df.to_csv(out_path, index=False)
        logger.info(f"Saved {len(df)} rows to {out_path}")

        if not args.dry_run:
            # First year truncates, subsequent append
            disposition = "WRITE_TRUNCATE" if year == min(years_to_download) else "WRITE_APPEND"
            load_dataframe(df, "utilization", write_disposition=disposition, cfg=cfg)


if __name__ == "__main__":
    main()
