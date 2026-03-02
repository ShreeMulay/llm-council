"""Load and validate project configuration from config.yaml."""

import os
from pathlib import Path

import yaml

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_CONFIG_PATH = _PROJECT_ROOT / "config.yaml"


def load_config() -> dict:
    """Load config.yaml and merge with environment variable overrides."""
    with open(_CONFIG_PATH) as f:
        cfg = yaml.safe_load(f)

    # Environment variable overrides
    cfg["gcp"]["project_id"] = os.getenv("GCP_PROJECT_ID", cfg["gcp"]["project_id"])
    cfg["gcp"]["dataset"] = os.getenv("BQ_DATASET", cfg["gcp"]["dataset"])
    cfg["gcp"]["location"] = os.getenv("BQ_LOCATION", cfg["gcp"]["location"])
    cfg["raw_data_dir"] = os.getenv("RAW_DATA_DIR", str(_PROJECT_ROOT / "data" / "raw"))

    return cfg


def get_project_id(cfg: dict | None = None) -> str:
    cfg = cfg or load_config()
    return cfg["gcp"]["project_id"]


def get_dataset(cfg: dict | None = None) -> str:
    cfg = cfg or load_config()
    return cfg["gcp"]["dataset"]


def get_table_ref(table_name: str, cfg: dict | None = None) -> str:
    """Return fully qualified BigQuery table reference."""
    cfg = cfg or load_config()
    return f"{cfg['gcp']['project_id']}.{cfg['gcp']['dataset']}.{table_name}"


def get_raw_data_dir(cfg: dict | None = None) -> Path:
    cfg = cfg or load_config()
    path = Path(cfg["raw_data_dir"])
    path.mkdir(parents=True, exist_ok=True)
    return path
