"""Prospective packaging and entry-point RED deployment contracts.

Safety-critical rollout behavior lives in test_bounded_rollout_red_contract.py
and executes through injected boundaries rather than shell-string assertions.
"""

import os
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).parents[1]
ENTRY_POINTS = (
    ROOT / ".github/workflows/deploy.yml",
    ROOT / "cloudbuild.yaml",
    ROOT / "scripts/deploy.sh",
)


def _write_executable(path: Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")
    path.chmod(0o755)


def _run_deploy_entrypoint(tmp_path, *, mode, head, remote, clean=True, approved=None):
    """Execute the real shell entry point against recording command boundaries."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    log = tmp_path / "commands.log"
    _write_executable(
        bin_dir / "git",
        """#!/usr/bin/env bash
set -eu
printf 'git %s\n' "$*" >> "$COMMAND_LOG"
case "$*" in
  "status --porcelain"|"status --porcelain --untracked-files=normal")
    [ "$WORKTREE_CLEAN" = true ] || printf ' M dirty-file\n'
    ;;
  "rev-parse HEAD") printf '%s\n' "$LOCAL_HEAD" ;;
  "rev-parse forgejo/master"|"rev-parse origin/master") printf '%s\n' "$FORGEJO_MASTER" ;;
esac
""",
    )
    for command in ("gcloud", "docker", "curl"):
        _write_executable(
            bin_dir / command,
            f"#!/usr/bin/env bash\nprintf '{command} %s\\n' \"$*\" >> \"$COMMAND_LOG\"\nexit 97\n",
        )
    _write_executable(
        bin_dir / "python",
        """#!/usr/bin/env bash
printf 'controller %s\n' "$*" >> "$COMMAND_LOG"
""",
    )
    _write_executable(
        bin_dir / "uv",
        """#!/usr/bin/env bash
printf 'controller %s\n' "$*" >> "$COMMAND_LOG"
""",
    )
    env = {
        **os.environ,
        "PATH": f"{bin_dir}:{os.environ['PATH']}",
        "COMMAND_LOG": str(log),
        "DEPLOY_ENTRYPOINT_MODE": mode,
        "LOCAL_HEAD": head,
        "FORGEJO_MASTER": remote,
        "WORKTREE_CLEAN": str(clean).lower(),
    }
    if approved is not None:
        env["APPROVED_FORGEJO_SHA"] = approved
        env["GITHUB_SHA"] = head
    result = subprocess.run(
        [str(ROOT / "scripts/deploy.sh")],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    return result, log.read_text(encoding="utf-8") if log.exists() else ""


def test_manual_entry_points_delegate_only_to_top_level_controller():
    deploy = (ROOT / "scripts/deploy.sh").read_text(encoding="utf-8")
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")

    assert "python -m scripts.bounded_rollout" in deploy
    assert "scripts/cloud_run_semantic_rollout.sh" not in deploy
    assert "scripts/deploy.sh" in workflow
    assert "scripts/cloud_run_semantic_rollout.sh" not in workflow
    for forbidden in ("docker build", "docker push", "gcloud run", "verify_council_smoke"):
        assert forbidden not in workflow


def test_local_entrypoint_executes_clean_tree_and_forgejo_sha_checks_before_controller(tmp_path):
    sha = "a" * 40
    result, commands = _run_deploy_entrypoint(
        tmp_path,
        mode="local",
        head=sha,
        remote=sha,
    )

    assert result.returncode == 0
    lines = commands.splitlines()
    controller_index = next(i for i, line in enumerate(lines) if line.startswith("controller "))
    assert any(line == "git status --porcelain" or line.startswith("git status --porcelain ") for line in lines[:controller_index])
    assert "git fetch forgejo master" in lines[:controller_index] or "git fetch origin master" in lines[:controller_index]
    assert "git rev-parse HEAD" in lines[:controller_index]
    assert "git rev-parse forgejo/master" in lines[:controller_index] or "git rev-parse origin/master" in lines[:controller_index]
    assert not any(line.startswith(("gcloud ", "docker ", "curl ")) for line in lines[:controller_index])


def test_github_entrypoint_executes_exact_approved_forgejo_sha_check_before_controller(tmp_path):
    sha = "b" * 40
    result, commands = _run_deploy_entrypoint(
        tmp_path,
        mode="github",
        head=sha,
        remote=sha,
        approved=sha,
    )

    assert result.returncode == 0
    lines = commands.splitlines()
    controller_index = next(i for i, line in enumerate(lines) if line.startswith("controller "))
    assert "git fetch forgejo master" in lines[:controller_index]
    assert "git rev-parse HEAD" in lines[:controller_index]
    assert "git rev-parse forgejo/master" in lines[:controller_index]
    assert not any(line.startswith(("gcloud ", "docker ", "curl ")) for line in lines[:controller_index])


@pytest.mark.parametrize(
    ("mode", "head", "remote", "clean", "approved"),
    [
        ("local", "a" * 40, "a" * 40, False, None),
        ("local", "a" * 40, "b" * 40, True, None),
        ("github", "a" * 40, "a" * 40, True, "a" * 12),
        ("github", "a" * 40, "b" * 40, True, "a" * 40),
        ("github", "a" * 40, "a" * 40, True, "b" * 40),
    ],
)
def test_entrypoint_source_refusal_occurs_before_controller_or_external_work(
    tmp_path, mode, head, remote, clean, approved
):
    result, commands = _run_deploy_entrypoint(
        tmp_path,
        mode=mode,
        head=head,
        remote=remote,
        clean=clean,
        approved=approved,
    )

    assert result.returncode != 0
    assert "controller " not in commands
    assert not any(
        line.startswith(("gcloud ", "docker ", "curl ")) for line in commands.splitlines()
    )


def test_cloudbuild_cannot_independently_mutate_service_or_run_paid_probes():
    cloudbuild = (ROOT / "cloudbuild.yaml").read_text(encoding="utf-8")
    delegates = "python -m scripts.bounded_rollout" in cloudbuild
    build_only = all(
        forbidden not in cloudbuild
        for forbidden in (
            "gcloud run",
            "cloud_run_semantic_rollout.sh",
            "verify_council_smoke",
            "/api/council",
        )
    )

    assert delegates or build_only


def test_github_mirror_has_manual_trigger_only():
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
    trigger = workflow[workflow.index("on:") : workflow.index("env:")]

    assert "workflow_dispatch:" in trigger
    assert "push:" not in trigger


def test_ci_and_deploy_checkout_and_verify_the_identical_approved_full_sha():
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")

    assert workflow.count("ref: ${{ inputs.approved_forgejo_sha }}") == 2
    assert workflow.count("[[ \"$APPROVED_FORGEJO_SHA\" =~ ^[0-9a-f]{40}$ ]]") == 2
    assert workflow.count('test "$(git rev-parse HEAD)" = "$APPROVED_FORGEJO_SHA"') == 2
    assert workflow.count('test "$(git rev-parse forgejo/master)" = "$APPROVED_FORGEJO_SHA"') == 2


def test_deployment_runtime_never_executes_beads_cli():
    runtime = (ROOT / "scripts/bounded_rollout.py").read_text(encoding="utf-8")
    deploy = (ROOT / "scripts/deploy.sh").read_text(encoding="utf-8")

    assert '"bd"' not in runtime
    assert "create_bead" not in runtime
    assert "bd " not in deploy


def test_outer_manual_workflow_timeout_exceeds_promotion_plus_rollback():
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
    timeout_lines = [line for line in workflow.splitlines() if "timeout-minutes:" in line]

    assert timeout_lines
    assert all(int(line.split(":", 1)[1].strip()) > 35 for line in timeout_lines)


def test_runtime_image_packages_all_reviewed_registry_projections():
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    dockerignore = (ROOT / ".dockerignore").read_text(encoding="utf-8")

    assert "COPY backend/ backend/" in dockerfile
    for projection_path in (
        "frontend/src/generated/model-registry.json",
        "mcp/src/generated/model-registry.json",
    ):
        assert f"COPY {projection_path} {projection_path}" in dockerfile
        assert f"!{projection_path}" in dockerignore


def test_entry_points_never_deploy_mutable_latest_tag():
    for path in ENTRY_POINTS:
        text = path.read_text(encoding="utf-8")
        assert "--image=" not in text or "@sha256:" in text or "IMAGE_DIGEST" in text
