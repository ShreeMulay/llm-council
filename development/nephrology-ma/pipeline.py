#!/usr/bin/env python3
"""Master ETL orchestrator for Nephrology M&A Intelligence Platform.

Runs the full pipeline or specific stages:
  1. download — Fetch raw CMS/government data
  2. etl      — Transform and load into BigQuery normalized tables
  3. score    — Run signal detection + composite scoring
  4. export   — Push results to Google Sheets + Discord alerts

Usage:
  python pipeline.py                           # Full pipeline
  python pipeline.py --stages download etl     # Specific stages
  python pipeline.py --stages score export     # Re-score and export only
"""

import argparse
import logging
import subprocess
import sys
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("pipeline.log"),
    ],
)
logger = logging.getLogger(__name__)

SCRIPTS_DIR = Path(__file__).parent / "scripts"
SQL_DIR = Path(__file__).parent / "sql"

# Pipeline stages in dependency order
FULL_PIPELINE = [
    # Stage 1: Download raw data from CMS/government sources
    (
        "download",
        [
            "download_nppes.py",
            "download_physician_compare.py",
            "download_utilization.py",
            "download_pecos.py",
            # These are Phase 2+ (uncomment when ready):
            # "download_part_d.py",
            # "download_open_payments.py",
            # "download_dialysis_compare.py",
        ],
    ),
    # Stage 2: ETL into normalized tables
    (
        "etl",
        [
            "etl_providers.py",  # Must run first (merges NPPES + Physician Compare)
            # Phase 2+:
            # "etl_organizations.py",
            # "etl_utilization.py",
            # "etl_prescribing.py",
        ],
    ),
    # Stage 3: Signal detection + scoring
    (
        "score",
        [
            # "detect_signals.py",
            "run_scoring.py",
        ],
    ),
    # Stage 4: Export
    (
        "export",
        [
            "export_to_sheets.py",
        ],
    ),
]


def run_script(script_name: str) -> bool:
    """Run a single pipeline script."""
    script_path = SCRIPTS_DIR / script_name
    if not script_path.exists():
        logger.warning(f"SKIPPED (not yet implemented): {script_name}")
        return True  # Non-blocking for incremental development

    logger.info(f"Running {script_name}...")
    start = datetime.now()

    result = subprocess.run(
        [sys.executable, "-m", f"scripts.{script_name.replace('.py', '')}"],
        capture_output=True,
        text=True,
        cwd=str(Path(__file__).parent),
    )

    elapsed = datetime.now() - start

    if result.returncode != 0:
        logger.error(f"FAILED: {script_name} ({elapsed})")
        logger.error(f"  STDERR: {result.stderr[:500]}")
        return False

    logger.info(f"SUCCESS: {script_name} ({elapsed})")
    if result.stdout:
        # Log last few lines of output
        lines = result.stdout.strip().split("\n")
        for line in lines[-3:]:
            logger.info(f"  > {line}")

    return True


def run_sql(sql_file: str) -> bool:
    """Run a SQL file against BigQuery."""
    sql_path = SQL_DIR / sql_file
    if not sql_path.exists():
        logger.warning(f"SKIPPED (SQL not found): {sql_file}")
        return True

    logger.info(f"Running SQL: {sql_file}...")
    from scripts.bq_helpers import run_sql_file

    try:
        run_sql_file(sql_path)
        logger.info(f"SUCCESS: {sql_file}")
        return True
    except Exception as e:
        logger.error(f"FAILED: {sql_file} — {e}")
        return False


def run_pipeline(stages: list[str] | None = None):
    """Run the full pipeline or specified stages."""
    stages = stages or ["download", "etl", "score", "export"]

    start = datetime.now()
    logger.info(f"{'=' * 60}")
    logger.info(f"Starting pipeline: stages={stages}")
    logger.info(f"{'=' * 60}")

    failed = False

    for stage_name, scripts in FULL_PIPELINE:
        if stage_name not in stages:
            continue

        logger.info(f"\n{'=' * 40}")
        logger.info(f"Stage: {stage_name}")
        logger.info(f"{'=' * 40}")

        for script in scripts:
            if not run_script(script):
                logger.error(f"Pipeline failed at {stage_name}/{script}")
                failed = True
                break

        if failed:
            break

    elapsed = datetime.now() - start

    if failed:
        logger.error(f"Pipeline FAILED after {elapsed}")
        return False

    logger.info(f"\n{'=' * 60}")
    logger.info(f"Pipeline COMPLETE in {elapsed}")
    logger.info(f"{'=' * 60}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Nephrology M&A Intelligence Pipeline Orchestrator"
    )
    parser.add_argument(
        "--stages",
        nargs="+",
        choices=["download", "etl", "score", "export"],
        help="Run specific stages only (default: all)",
    )
    args = parser.parse_args()

    success = run_pipeline(args.stages)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
