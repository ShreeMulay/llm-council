#!/usr/bin/env python3
"""Execute the master scoring query against BigQuery.

Reads sql/scoring_query.sql, substitutes project/dataset variables,
and runs it to populate the scores table.

Usage:
  python scripts/run_scoring.py
"""

import logging
from pathlib import Path

from scripts.bq_helpers import get_client, run_sql_file, table_exists
from scripts.config_loader import get_table_ref, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SQL_DIR = Path(__file__).resolve().parent.parent / "sql"


def main():
    cfg = load_config()

    # Pre-check: providers table must exist and have data
    if not table_exists("providers", cfg):
        logger.error("providers table does not exist. Run etl_providers.py first.")
        return

    scoring_sql = SQL_DIR / "scoring_query.sql"
    if not scoring_sql.exists():
        logger.error(f"Scoring SQL not found: {scoring_sql}")
        return

    logger.info("Running master scoring query...")
    run_sql_file(scoring_sql, cfg)

    # Report results
    client = get_client(cfg)
    table_ref = get_table_ref("scores", cfg)
    table = client.get_table(table_ref)
    logger.info(f"Scores table now has {table.num_rows} rows")

    # Tier distribution
    from scripts.bq_helpers import run_query

    tier_dist = run_query(
        f"SELECT tier, COUNT(*) AS count FROM `{table_ref}` GROUP BY tier ORDER BY count DESC",
        cfg,
    )
    logger.info("Tier distribution:")
    for _, row in tier_dist.iterrows():
        logger.info(f"  {row['tier']}: {row['count']}")


if __name__ == "__main__":
    main()
