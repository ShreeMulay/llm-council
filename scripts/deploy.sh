#!/usr/bin/env bash
# Sole local production entry point for the bounded rollout.
set -euo pipefail

mode="${DEPLOY_ENTRYPOINT_MODE:-local}"
[[ -z "$(git status --porcelain)" ]] || { printf '%s\n' 'Refusing dirty worktree' >&2; exit 2; }

if [[ "${mode}" == github ]]; then
  git fetch forgejo master
  remote_ref=forgejo/master
else
  if git fetch forgejo master; then remote_ref=forgejo/master; else git fetch origin master; remote_ref=origin/master; fi
fi

head_sha=$(git rev-parse HEAD)
forgejo_sha=$(git rev-parse "${remote_ref}")
[[ "${head_sha}" =~ ^[0-9a-f]{40}$ && "${head_sha}" == "${forgejo_sha}" ]] || {
  printf '%s\n' 'Refusing source that is not exact Forgejo master' >&2; exit 2;
}

if [[ "${mode}" == github ]]; then
  approved="${APPROVED_FORGEJO_SHA:-}"
  [[ "${approved}" =~ ^[0-9a-f]{40}$ && "${approved}" == "${head_sha}" && "${GITHUB_SHA:-}" == "${head_sha}" ]] || {
    printf '%s\n' 'Refusing unapproved GitHub mirror SHA' >&2; exit 2;
  }
else
  approved="${head_sha}"
fi

export APPROVED_FORGEJO_SHA="${approved}"
exec python -m scripts.bounded_rollout --approved-sha "${approved}"
