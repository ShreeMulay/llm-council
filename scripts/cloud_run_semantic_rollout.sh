#!/usr/bin/env bash
# Retained only to fail closed for operators using the removed legacy entry point.
set -euo pipefail

printf '%s\n' 'Legacy semantic rollout removed; use scripts/deploy.sh' >&2
exit 2
