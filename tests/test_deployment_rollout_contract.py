"""Prospective packaging and entry-point RED deployment contracts.

Safety-critical rollout behavior lives in test_bounded_rollout_red_contract.py
and executes through injected boundaries rather than shell-string assertions.
"""

import os
import shutil
import subprocess
from pathlib import Path

import pytest

from scripts import bounded_rollout as rollout

ROOT = Path(__file__).parents[1]
ENTRY_POINTS = (
    ROOT / ".github/workflows/deploy.yml",
    ROOT / "cloudbuild.yaml",
    ROOT / "scripts/deploy.sh",
)

PRIOR_PAID_ATTEMPTS_INPUT = """      prior_paid_attempts:
        description: Fixed cumulative paid attempts (0 fresh, 2 approved resume)
        required: true
        default: "0"
        type: choice
        options:
          - "0"
          - "2"
"""


def _assert_prior_paid_attempts_workflow_contract(workflow: str) -> None:
    assert workflow.count(PRIOR_PAID_ATTEMPTS_INPUT) == 1
    assert workflow.count(
        "ROLLOUT_PRIOR_PAID_ATTEMPTS: ${{ inputs.prior_paid_attempts }}"
    ) == 1


def _write_executable(path: Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")
    path.chmod(0o755)


def _run_deploy_entrypoint(
    tmp_path,
    *,
    mode,
    head,
    remote,
    clean=True,
    approved=None,
    forgejo_available=True,
    origin_available=True,
    prior_paid_attempts=None,
    rollout_mode=None,
    manifest_uri=None,
    manifest_generation=None,
):
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
  "fetch forgejo master")
    [ "$FORGEJO_AVAILABLE" = true ] || { printf 'fatal: forgejo unavailable\n' >&2; exit 1; }
    ;;
  "fetch origin master")
    [ "$ORIGIN_AVAILABLE" = true ] || { printf 'fatal: origin unavailable\n' >&2; exit 1; }
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
        "FORGEJO_AVAILABLE": str(forgejo_available).lower(),
        "ORIGIN_AVAILABLE": str(origin_available).lower(),
    }
    if approved is not None:
        env["APPROVED_FORGEJO_SHA"] = approved
        env["GITHUB_SHA"] = head
    if prior_paid_attempts is not None:
        env["ROLLOUT_PRIOR_PAID_ATTEMPTS"] = prior_paid_attempts
    if rollout_mode is not None:
        env["ROLLOUT_MODE"] = rollout_mode
    if manifest_uri is not None:
        env["ROLLOUT_RESUME_MANIFEST_URI"] = manifest_uri
    if manifest_generation is not None:
        env["ROLLOUT_RESUME_MANIFEST_GENERATION"] = manifest_generation
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


@pytest.mark.parametrize("name,value", [
    ("PROJECT", "wrong-project"),
    ("REGION", "wrong-region"),
    ("SERVICE", "wrong-service"),
])
def test_controller_cli_rejects_namespace_env_before_boundary_creation(
    monkeypatch, name, value
):
    monkeypatch.setenv(name, value)
    created = []
    monkeypatch.setattr(
        rollout,
        "GcloudBoundaries",
        lambda **kwargs: created.append(kwargs),
    )
    with pytest.raises(SystemExit, match="production namespace override refused"):
        rollout.main(["--approved-sha", "a" * 40, "--rollout-id", "test"])
    assert created == []


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


def test_local_entrypoint_reaches_controller_without_python_binary(tmp_path):
    sha = "a" * 40
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    log = tmp_path / "commands.log"
    bash = shutil.which("bash")
    python3 = shutil.which("python3")
    assert bash is not None
    assert python3 is not None
    (bin_dir / "bash").symlink_to(bash)
    (bin_dir / "python3").symlink_to(python3)
    _write_executable(
        bin_dir / "git",
        """#!/usr/bin/env bash
set -eu
printf 'git %s\n' "$*" >> "$COMMAND_LOG"
case "$*" in
  "status --porcelain") ;;
  "fetch forgejo master") printf 'fatal: forgejo unavailable\n' >&2; exit 1 ;;
  "fetch origin master") ;;
  "rev-parse HEAD"|"rev-parse origin/master") printf '%s\n' "$EXPECTED_SHA" ;;
esac
""",
    )
    _write_executable(
        bin_dir / "uv",
        """#!/usr/bin/env bash
set -eu
command -v python3 >/dev/null
if command -v python >/dev/null; then exit 91; fi
printf 'controller %s\n' "$*" >> "$COMMAND_LOG"
""",
    )

    result = subprocess.run(
        [str(ROOT / "scripts/deploy.sh")],
        cwd=ROOT,
        env={
            "PATH": str(bin_dir),
            "COMMAND_LOG": str(log),
            "DEPLOY_ENTRYPOINT_MODE": "local",
            "EXPECTED_SHA": sha,
        },
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0
    assert result.stderr == ""
    lines = log.read_text(encoding="utf-8").splitlines()
    controller_index = lines.index(
        f"controller run python -m scripts.bounded_rollout --approved-sha {sha} --mode fresh --prior-paid-attempts 0"
    )
    assert lines[:controller_index] == [
        "git status --porcelain",
        "git fetch forgejo master",
        "git fetch origin master",
        "git rev-parse HEAD",
        "git rev-parse origin/master",
    ]


@pytest.mark.parametrize("value", ["0"])
def test_deploy_entrypoint_forwards_exact_validated_prior_paid_attempts(tmp_path, value):
    sha = "d" * 40
    result, commands = _run_deploy_entrypoint(
        tmp_path, mode="local", head=sha, remote=sha, prior_paid_attempts=value
    )

    assert result.returncode == 0
    assert (
        f"controller run python -m scripts.bounded_rollout --approved-sha {sha} "
        f"--mode fresh --prior-paid-attempts {value}"
    ) in commands.splitlines()


@pytest.mark.parametrize("value", ["true", "-1", "1", "2", "6", "7", "01", "1.0", ""])
def test_deploy_entrypoint_rejects_invalid_prior_paid_attempts(tmp_path, value):
    sha = "d" * 40
    result, commands = _run_deploy_entrypoint(
        tmp_path, mode="local", head=sha, remote=sha, prior_paid_attempts=value
    )

    assert result.returncode == 2
    assert "Refusing" in result.stderr
    assert "controller " not in commands


def test_deploy_entrypoint_forwards_exact_resume_authorization(tmp_path):
    sha = "d" * 40
    uri = (
        "gs://tke-phi-privacy-engine_cloudbuild/rollout-evidence/"
        "resume-after-prior-v1/approved.json"
    )
    result, commands = _run_deploy_entrypoint(
        tmp_path,
        mode="local",
        head=sha,
        remote=sha,
        prior_paid_attempts="2",
        rollout_mode="resume-after-prior-v1",
        manifest_uri=uri,
        manifest_generation="99",
    )
    assert result.returncode == 0
    assert (
        f"--mode resume-after-prior-v1 --prior-paid-attempts 2 "
        f"--resume-manifest-uri {uri} --resume-manifest-generation 99"
    ) in commands


@pytest.mark.parametrize(
    ("rollout_mode", "count", "uri", "generation"),
    [
        ("fresh", "0", "gs://bad/manifest.json", "1"),
        ("resume-after-prior-v1", "0", "gs://bad/manifest.json", "1"),
        ("resume-after-prior-v1", "2", "gs://bad/manifest.json", "1"),
        (
            "resume-after-prior-v1",
            "2",
            "gs://tke-phi-privacy-engine_cloudbuild/rollout-evidence/resume-after-prior-v1/approved.json",
            "latest",
        ),
    ],
)
def test_deploy_entrypoint_fails_closed_on_inconsistent_resume_tuple(
    tmp_path, rollout_mode, count, uri, generation
):
    sha = "d" * 40
    result, commands = _run_deploy_entrypoint(
        tmp_path,
        mode="local",
        head=sha,
        remote=sha,
        prior_paid_attempts=count,
        rollout_mode=rollout_mode,
        manifest_uri=uri,
        manifest_generation=generation,
    )
    assert result.returncode == 2
    assert "controller " not in commands


def test_local_entrypoint_preserves_origin_fallback_failure(tmp_path):
    sha = "a" * 40
    result, commands = _run_deploy_entrypoint(
        tmp_path,
        mode="local",
        head=sha,
        remote=sha,
        forgejo_available=False,
        origin_available=False,
    )

    assert result.returncode != 0
    assert "forgejo unavailable" not in result.stderr
    assert "fatal: origin unavailable" in result.stderr
    assert "controller " not in commands


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


def test_github_workflow_constrains_and_forwards_prior_paid_attempts():
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")

    _assert_prior_paid_attempts_workflow_contract(workflow)
    deploy_step = workflow[workflow.index("      - name: Execute sole bounded deployment entry point") :]
    assert "ROLLOUT_PRIOR_PAID_ATTEMPTS: ${{ inputs.prior_paid_attempts }}" in deploy_step
    assert "ROLLOUT_MODE: ${{ inputs.rollout_mode }}" in deploy_step
    assert "ROLLOUT_RESUME_MANIFEST_URI: ${{ inputs.resume_manifest_uri }}" in deploy_step
    assert "ROLLOUT_RESUME_MANIFEST_GENERATION: ${{ inputs.resume_manifest_generation }}" in deploy_step


@pytest.mark.parametrize(
    "invalid_workflow",
    [
        lambda workflow: workflow.replace(PRIOR_PAID_ATTEMPTS_INPUT, ""),
        lambda workflow: workflow.replace("        type: choice\n", "        type: string\n", 1),
        lambda workflow: workflow.replace('          - "2"\n', '          - "7"\n', 1),
    ],
    ids=["omitted", "unconstrained-type", "unconstrained-value"],
)
def test_github_workflow_contract_rejects_omitted_or_unconstrained_input(invalid_workflow):
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")

    with pytest.raises(AssertionError):
        _assert_prior_paid_attempts_workflow_contract(invalid_workflow(workflow))


def test_ci_and_deploy_checkout_and_verify_the_identical_approved_full_sha():
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")

    assert workflow.count("ref: ${{ inputs.approved_forgejo_sha }}") == 2
    assert workflow.count("[[ \"$APPROVED_FORGEJO_SHA\" =~ ^[0-9a-f]{40}$ ]]") == 2
    assert workflow.count('test "$(git rev-parse HEAD)" = "$APPROVED_FORGEJO_SHA"') == 2
    assert workflow.count('test "$(git rev-parse forgejo/master)" = "$APPROVED_FORGEJO_SHA"') == 2


def test_ci_installs_test_extra_and_deploy_installs_runtime_dependencies():
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
    ci_job = workflow[workflow.index("\n  ci:") : workflow.index("\n  deploy:")]
    deploy_job = workflow[workflow.index("\n  deploy:") :]
    expected_action = (
        "uses: astral-sh/setup-uv@"
        "11f9893b081a58869d3b5fccaea48c9e9e46f990 # v8.3.2"
    )

    assert "run: uv sync --extra test" in ci_job
    assert "run: uv sync --all-groups" not in ci_job
    assert "run: uv sync --all-groups" in deploy_job
    for job in (ci_job, deploy_job):
        setup_uv_step = job[
            job.index("      - name: Setup uv") : job.index(
                "      - name: Install dependencies"
            )
        ]
        assert setup_uv_step.count("uses: astral-sh/setup-uv@") == 1
        assert expected_action in setup_uv_step
        assert 'version: "0.11.28"' in setup_uv_step

    setup_uv_uses = [
        line.strip()
        for line in workflow.splitlines()
        if "uses: astral-sh/setup-uv@" in line
    ]
    assert setup_uv_uses == [expected_action, expected_action]
    assert "astral-sh/setup-uv@latest" not in workflow
    assert "astral-sh/setup-uv@v" not in workflow


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
