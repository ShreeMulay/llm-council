#!/usr/bin/env python3
"""Download and filter NPPES data for nephrology providers.

Two modes:
  1. API mode (default): Paginate the NPPES REST API for nephrology taxonomy.
     Good for initial load and real-time lookups. ~15K records.
  2. Bulk mode (--bulk): Download the full monthly dissemination file (~8GB),
     filter for nephrology taxonomy codes. More comprehensive but slower.

Usage:
  python scripts/download_nppes.py          # API mode
  python scripts/download_nppes.py --bulk   # Bulk file mode
"""

import argparse
import csv
import io
import json
import logging
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
from tqdm import tqdm

from scripts.bq_helpers import load_dataframe
from scripts.config_loader import get_raw_data_dir, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

NPPES_API = "https://npiregistry.cms.hhs.gov/api/"


def fetch_nppes_api(cfg: dict) -> pd.DataFrame:
    """Fetch nephrology NPIs from NPPES API with pagination."""
    taxonomy_codes = cfg["taxonomy_codes"]
    records = []

    for taxonomy in taxonomy_codes:
        logger.info(f"Fetching taxonomy: {taxonomy}")
        skip = 0
        limit = 200

        while True:
            params = {
                "version": cfg["data_sources"]["nppes"]["api_version"],
                "taxonomy_description": "Nephrology",
                "limit": limit,
                "skip": skip,
            }

            try:
                resp = requests.get(NPPES_API, params=params, timeout=30)
                resp.raise_for_status()
                data = resp.json()
            except (requests.RequestException, json.JSONDecodeError) as e:
                logger.warning(f"API error at skip={skip}: {e}")
                break

            results = data.get("results", [])
            if not results:
                break

            for r in results:
                basic = r.get("basic", {})
                addresses = r.get("addresses", [])
                taxonomies_list = r.get("taxonomies", [])

                # Find practice address (purpose = LOCATION)
                practice_addr = next(
                    (a for a in addresses if a.get("address_purpose") == "LOCATION"), {}
                )
                mail_addr = next(
                    (a for a in addresses if a.get("address_purpose") == "MAILING"), {}
                )

                tax_codes = [t.get("code", "") for t in taxonomies_list]
                primary_tax = next(
                    (t.get("code", "") for t in taxonomies_list if t.get("primary")), ""
                )

                records.append(
                    {
                        "npi": str(r.get("number", "")),
                        "entity_type": r.get("enumeration_type", ""),
                        "last_name": basic.get("last_name", basic.get("organization_name", "")),
                        "first_name": basic.get("first_name", ""),
                        "middle_name": basic.get("middle_name", ""),
                        "credential": basic.get("credential", ""),
                        "gender": basic.get("gender", ""),
                        "enumeration_date": basic.get("enumeration_date", ""),
                        "last_updated": basic.get("last_updated", ""),
                        "status": basic.get("status", ""),
                        "primary_taxonomy": primary_tax,
                        "all_taxonomy_codes": "|".join(tax_codes),
                        "practice_address_line1": practice_addr.get("address_1", ""),
                        "practice_address_line2": practice_addr.get("address_2", ""),
                        "practice_city": practice_addr.get("city", ""),
                        "practice_state": practice_addr.get("state", ""),
                        "practice_zip": practice_addr.get("postal_code", ""),
                        "practice_phone": practice_addr.get("telephone_number", ""),
                        "mail_address_line1": mail_addr.get("address_1", ""),
                        "mail_city": mail_addr.get("city", ""),
                        "mail_state": mail_addr.get("state", ""),
                        "mail_zip": mail_addr.get("postal_code", ""),
                    }
                )

            result_count = data.get("result_count", 0)
            skip += limit

            if skip >= result_count:
                break

        logger.info(f"  Taxonomy {taxonomy}: {len(records)} total records so far")

    df = pd.DataFrame(records)
    # Deduplicate by NPI
    df = df.drop_duplicates(subset=["npi"])
    logger.info(f"Total unique nephrology NPIs: {len(df)}")
    return df


def download_nppes_bulk(cfg: dict) -> pd.DataFrame:
    """Download and filter the monthly NPPES bulk file."""
    raw_dir = get_raw_data_dir(cfg)
    zip_path = raw_dir / "nppes_full.zip"
    taxonomy_codes = set(cfg["taxonomy_codes"])

    # Download if not already present (or older than 30 days)
    if not zip_path.exists():
        logger.info("Downloading NPPES bulk file (this may take several minutes)...")
        # The bulk file URL changes monthly; try a generic approach
        url = "https://download.cms.gov/nppes/NPPES_Data_Dissemination_January_2025.zip"
        subprocess.run(["wget", "-q", "-O", str(zip_path), url], check=True)

    logger.info("Extracting and filtering for nephrology providers...")
    nephrology_providers = []

    with zipfile.ZipFile(zip_path, "r") as z:
        csv_files = [f for f in z.namelist() if f.endswith(".csv") and "npidata" in f.lower()]

        for csv_file in csv_files:
            logger.info(f"Processing {csv_file}...")
            with z.open(csv_file) as f:
                reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                for row in reader:
                    # Check all 15 taxonomy slots
                    taxonomies = {
                        row.get(f"Healthcare Provider Taxonomy Code_{i}", "") for i in range(1, 16)
                    }
                    if taxonomies & taxonomy_codes:
                        nephrology_providers.append(row)

    logger.info(f"Found {len(nephrology_providers)} nephrology providers in bulk file")
    return pd.DataFrame(nephrology_providers)


def transform_for_bq(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize NPPES data for BigQuery providers table."""
    # Map entity type
    entity_map = {"NPI-1": 1, "NPI-2": 2, "": 0}
    if "entity_type" in df.columns:
        df["entity_type"] = df["entity_type"].map(entity_map).fillna(0).astype(int)

    # Add timestamp
    df["last_refreshed"] = datetime.now(timezone.utc).isoformat()
    df["data_sources"] = "NPPES"

    return df


def main():
    parser = argparse.ArgumentParser(description="Download NPPES nephrology data")
    parser.add_argument("--bulk", action="store_true", help="Use bulk file instead of API")
    parser.add_argument("--dry-run", action="store_true", help="Download but don't load to BQ")
    args = parser.parse_args()

    cfg = load_config()

    if args.bulk:
        df = download_nppes_bulk(cfg)
    else:
        df = fetch_nppes_api(cfg)

    df = transform_for_bq(df)

    # Save locally
    raw_dir = get_raw_data_dir(cfg)
    out_path = raw_dir / "nppes_nephrology.csv"
    df.to_csv(out_path, index=False)
    logger.info(f"Saved {len(df)} rows to {out_path}")

    if not args.dry_run:
        load_dataframe(df, "nppes_raw", cfg=cfg)

    return df


if __name__ == "__main__":
    main()
