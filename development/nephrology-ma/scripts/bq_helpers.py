"""BigQuery helper functions shared across all pipeline scripts."""

import logging
import subprocess
import tempfile
from pathlib import Path

import pandas as pd
from google.cloud import bigquery

from scripts.config_loader import get_dataset, get_project_id, get_table_ref, load_config

logger = logging.getLogger(__name__)


def _get_gcloud_credentials():
    """Fall back to gcloud CLI credentials when ADC is not configured."""
    import google.auth
    import google.auth.transport.requests
    import google.oauth2.credentials

    # Get access token from gcloud CLI
    result = subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        capture_output=True,
        text=True,
        check=True,
    )
    token = result.stdout.strip()
    return google.oauth2.credentials.Credentials(token=token)


def get_client(cfg: dict | None = None) -> bigquery.Client:
    """Create a BigQuery client for the configured project.

    Tries Application Default Credentials first, falls back to gcloud CLI token.
    """
    cfg = cfg or load_config()
    project_id = get_project_id(cfg)

    try:
        return bigquery.Client(project=project_id)
    except Exception:
        logger.info("ADC not found, falling back to gcloud CLI credentials")
        credentials = _get_gcloud_credentials()
        return bigquery.Client(project=project_id, credentials=credentials)


def load_dataframe(
    df: pd.DataFrame,
    table_name: str,
    write_disposition: str = "WRITE_TRUNCATE",
    cfg: dict | None = None,
) -> int:
    """Load a pandas DataFrame into a BigQuery table.

    Returns the number of rows loaded.
    """
    cfg = cfg or load_config()
    client = get_client(cfg)
    table_ref = get_table_ref(table_name, cfg)

    job_config = bigquery.LoadJobConfig(
        write_disposition=getattr(bigquery.WriteDisposition, write_disposition),
        autodetect=True,
    )

    logger.info(f"Loading {len(df)} rows to {table_ref} ({write_disposition})")
    job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
    job.result()  # Wait for completion

    table = client.get_table(table_ref)
    logger.info(f"Loaded successfully. Table now has {table.num_rows} rows.")
    return table.num_rows


def load_jsonl(
    jsonl_path: Path,
    table_name: str,
    write_disposition: str = "WRITE_TRUNCATE",
    cfg: dict | None = None,
) -> int:
    """Load a newline-delimited JSON file into BigQuery."""
    cfg = cfg or load_config()
    client = get_client(cfg)
    table_ref = get_table_ref(table_name, cfg)

    job_config = bigquery.LoadJobConfig(
        write_disposition=getattr(bigquery.WriteDisposition, write_disposition),
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        autodetect=True,
    )

    with open(jsonl_path, "rb") as f:
        job = client.load_table_from_file(f, table_ref, job_config=job_config)
    job.result()

    table = client.get_table(table_ref)
    logger.info(f"Loaded {table.num_rows} rows from JSONL to {table_ref}")
    return table.num_rows


def run_query(sql: str, cfg: dict | None = None) -> pd.DataFrame:
    """Execute a SQL query and return results as DataFrame."""
    cfg = cfg or load_config()
    client = get_client(cfg)
    logger.info(f"Running query ({len(sql)} chars)...")
    df = client.query(sql).to_dataframe()
    logger.info(f"Query returned {len(df)} rows")
    return df


def run_query_job(sql: str, cfg: dict | None = None) -> bigquery.QueryJob:
    """Execute a SQL query and return the job (for DDL/DML statements)."""
    cfg = cfg or load_config()
    client = get_client(cfg)
    job = client.query(sql)
    job.result()  # Wait for completion
    logger.info(f"Query job completed: {job.statement_type}, {job.num_dml_affected_rows or 0} rows")
    return job


def run_sql_file(sql_path: Path, cfg: dict | None = None) -> bigquery.QueryJob:
    """Execute a SQL file."""
    sql = sql_path.read_text()
    # Substitute project and dataset references
    cfg = cfg or load_config()
    sql = sql.replace("${PROJECT_ID}", get_project_id(cfg))
    sql = sql.replace("${DATASET}", get_dataset(cfg))
    return run_query_job(sql, cfg)


def table_exists(table_name: str, cfg: dict | None = None) -> bool:
    """Check if a BigQuery table exists."""
    cfg = cfg or load_config()
    client = get_client(cfg)
    try:
        client.get_table(get_table_ref(table_name, cfg))
        return True
    except Exception:
        return False


def get_table_row_count(table_name: str, cfg: dict | None = None) -> int:
    """Get row count for a table."""
    cfg = cfg or load_config()
    client = get_client(cfg)
    table = client.get_table(get_table_ref(table_name, cfg))
    return table.num_rows


def get_distinct_npis(table_name: str = "providers", cfg: dict | None = None) -> list[str]:
    """Get list of all known nephrology NPIs from the providers table."""
    cfg = cfg or load_config()
    table_ref = get_table_ref(table_name, cfg)
    df = run_query(f"SELECT DISTINCT npi FROM `{table_ref}`", cfg)
    return df["npi"].tolist()
