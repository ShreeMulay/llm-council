"""Tests for configuration loading and validation."""

from pathlib import Path


def test_config_yaml_exists():
    config_path = Path(__file__).parent.parent / "config.yaml"
    assert config_path.exists(), "config.yaml not found"


def test_config_loads():
    from scripts.config_loader import load_config

    cfg = load_config()
    assert cfg is not None
    assert "gcp" in cfg
    assert cfg["gcp"]["project_id"] == "tke-ma-intelligence"
    assert cfg["gcp"]["dataset"] == "nephrology_ma"


def test_scoring_weights_sum_to_one():
    from scripts.config_loader import load_config

    cfg = load_config()
    weights = cfg["scoring"]["weights"]
    total = sum(weights.values())
    assert abs(total - 1.0) < 0.01, f"Scoring weights sum to {total}, expected 1.0"


def test_taxonomy_codes_present():
    from scripts.config_loader import load_config

    cfg = load_config()
    assert "207RN0300X" in cfg["taxonomy_codes"]


def test_table_ref_format():
    from scripts.config_loader import get_table_ref

    ref = get_table_ref("providers")
    assert ref == "tke-ma-intelligence.nephrology_ma.providers"


def test_sql_schema_exists():
    sql_path = Path(__file__).parent.parent / "sql" / "create_schema.sql"
    assert sql_path.exists(), "create_schema.sql not found"


def test_sql_scoring_exists():
    sql_path = Path(__file__).parent.parent / "sql" / "scoring_query.sql"
    assert sql_path.exists(), "scoring_query.sql not found"
