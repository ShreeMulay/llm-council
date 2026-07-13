#!/usr/bin/env bash
# Sole local production entry point for the bounded rollout.
set -euo pipefail

mode="${DEPLOY_ENTRYPOINT_MODE:-local}"
[[ -z "$(git status --porcelain)" ]] || { printf '%s\n' 'Refusing dirty worktree' >&2; exit 2; }

if [[ "${mode}" == github ]]; then
  git fetch forgejo master
  remote_ref=forgejo/master
else
  if git fetch forgejo master 2>/dev/null; then remote_ref=forgejo/master; else git fetch origin master; remote_ref=origin/master; fi
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
rollout_mode="${ROLLOUT_MODE-fresh}"
prior_paid_attempts="${ROLLOUT_PRIOR_PAID_ATTEMPTS-0}"
manifest_uri="${ROLLOUT_RESUME_MANIFEST_URI-}"
manifest_generation="${ROLLOUT_RESUME_MANIFEST_GENERATION-}"
case "${rollout_mode}" in
  fresh)
    [[ "${prior_paid_attempts}" == 0 && -z "${manifest_uri}" && -z "${manifest_generation}" ]] || {
      printf '%s\n' 'Refusing inconsistent fresh rollout authorization' >&2; exit 2;
    }
    ;;
  resume-after-prior-v1)
    [[ "${prior_paid_attempts}" == 2 ]] || {
      printf '%s\n' 'Refusing resume without exactly two prior paid attempts' >&2; exit 2;
    }
    [[ "${manifest_uri}" =~ ^gs://tke-phi-privacy-engine_cloudbuild/rollout-evidence/resume-after-prior-v1/[^/?#]+\.json$ ]] || {
      printf '%s\n' 'Refusing resume manifest outside approved evidence prefix' >&2; exit 2;
    }
    [[ "${manifest_generation}" =~ ^[1-9][0-9]*$ ]] || {
      printf '%s\n' 'Refusing resume without exact manifest generation' >&2; exit 2;
    }
    ;;
  resume-after-shadow-v1)
    [[ "${prior_paid_attempts}" == 4 ]] || {
      printf '%s\n' 'Refusing shadow resume without exactly four prior paid attempts' >&2; exit 2;
    }
    [[ "${manifest_uri}" =~ ^gs://tke-phi-privacy-engine_cloudbuild/rollout-evidence/resume-after-shadow-v1/[^/?#]+\.json$ ]] || {
      printf '%s\n' 'Refusing shadow resume manifest outside approved evidence prefix' >&2; exit 2;
    }
    [[ "${manifest_generation}" =~ ^[1-9][0-9]*$ ]] || {
      printf '%s\n' 'Refusing shadow resume without exact manifest generation' >&2; exit 2;
    }
    ;;
  *) printf '%s\n' 'Refusing unknown rollout mode' >&2; exit 2 ;;
esac

args=(--approved-sha "${approved}" --mode "${rollout_mode}" --prior-paid-attempts "${prior_paid_attempts}")
if [[ "${rollout_mode}" == resume-after-prior-v1 || "${rollout_mode}" == resume-after-shadow-v1 ]]; then
  args+=(--resume-manifest-uri "${manifest_uri}" --resume-manifest-generation "${manifest_generation}")
fi
exec uv run python -m scripts.bounded_rollout "${args[@]}"
