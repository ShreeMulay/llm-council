"""Static safety contract for all Cloud Run deployment entry points."""

from pathlib import Path

ROOT = Path(__file__).parents[1]
ENTRY_POINTS = (
    ROOT / ".github/workflows/deploy.yml",
    ROOT / "cloudbuild.yaml",
    ROOT / "scripts/deploy.sh",
)


def test_all_deploy_paths_use_one_semantic_rollout_helper():
    for path in ENTRY_POINTS:
        text = path.read_text()
        assert "scripts/cloud_run_semantic_rollout.sh" in text
        assert "IMAGE_DIGEST" in text


def test_rollout_helper_enforces_shadow_canary_verification_and_rollback():
    text = (ROOT / "scripts/cloud_run_semantic_rollout.sh").read_text()

    for contract in (
        "--no-traffic",
        "--tag",
        "verify_deploy_health.py",
        "verify_council_smoke.py",
        "--expected-revision",
        "--expected-image-digest",
        "10",
        "50",
        "100",
        "rollback",
        "Rollback restoration verified",
        "cloud_run_traffic.py compare",
        "--clear-tags",
        "--expected-proof",
        "REQUIRE_VERTEX_ANTHROPIC=true",
    ):
        assert contract in text


def test_rollout_executes_real_rollback_then_reapplies_10_50_100():
    text = (ROOT / "scripts/cloud_run_semantic_rollout.sh").read_text()
    rehearsal_10 = text.index("apply_stage 10")
    restore = text.index("restore_prior", rehearsal_10)
    prior_smoke = text.index('--expected-proof "${PRIOR_SMOKE}"', restore)
    restarted_10 = text.index("apply_stage 10", prior_smoke)
    stage_50 = text.index("apply_stage 50", restarted_10)
    stage_100 = text.index("apply_stage 100", stage_50)
    assert rehearsal_10 < restore < prior_smoke < restarted_10 < stage_50 < stage_100


def test_workflow_and_all_paths_supply_bounded_rollout_thresholds():
    names = (
        "ROLLOUT_OBSERVATION_SECONDS",
        "ROLLOUT_HEALTH_SAMPLES",
        "ROLLOUT_SERVICE_HEALTH_SAMPLES",
        "ROLLOUT_SMOKE_SAMPLES",
        "COUNCIL_MAX_LATENCY_SECONDS",
        "COUNCIL_MAX_TOKENS",
        "COUNCIL_MAX_COST_USD",
        "COUNCIL_MAX_ERROR_RATE",
        "COUNCIL_MAX_QUALITY_DROP",
        "COUNCIL_MAX_LATENCY_RATIO",
        "COUNCIL_MAX_COST_RATIO",
        "COUNCIL_MIN_ROUTE_SUCCESS",
    )
    for path in ENTRY_POINTS:
        text = path.read_text()
        for name in names:
            assert name in text

    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()
    assert "scripts/cloud_run_semantic_rollout.sh" in workflow
    assert "Semantic canary rollout" in workflow


def test_rollout_helper_accepts_project_id_and_workflow_exports_project():
    helper = (ROOT / "scripts/cloud_run_semantic_rollout.sh").read_text()
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()

    assert 'PROJECT="${PROJECT:-${PROJECT_ID:-}}"' in helper
    assert "PROJECT: ${{ env.PROJECT_ID }}" in workflow


def test_legacy_flags_are_baseline_only_and_routing_uses_exact_identity_files():
    text = (ROOT / "scripts/cloud_run_semantic_rollout.sh").read_text()
    candidate_function = text[text.index("verify_candidate_tag()") : text.index("restore_prior()")]

    assert "--legacy-baseline" not in candidate_function
    assert "--allow-legacy-identity-without-artifacts" in text
    assert '--prior-identity "${PRIOR_IDENTITY}"' in text
    assert '--candidate-identity "${CANDIDATE_IDENTITY}"' in text
    assert "PRIOR_REVISIONS" not in text


def test_runtime_image_packages_all_reviewed_registry_projections():
    dockerfile = (ROOT / "Dockerfile").read_text()
    dockerignore = (ROOT / ".dockerignore").read_text()

    assert "COPY backend/ backend/" in dockerfile
    for projection_path in (
        "frontend/src/generated/model-registry.json",
        "mcp/src/generated/model-registry.json",
    ):
        assert f"COPY {projection_path} {projection_path}" in dockerfile
        assert f"!{projection_path}" in dockerignore


def test_entry_points_never_deploy_mutable_latest_tag():
    for path in ENTRY_POINTS:
        text = path.read_text()
        assert "--image=" not in text or "@sha256:" in text or "IMAGE_DIGEST" in text
