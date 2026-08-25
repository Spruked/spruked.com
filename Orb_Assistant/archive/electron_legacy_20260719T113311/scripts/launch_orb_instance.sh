#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INSTANCE_ENV="${ORB_INSTANCE_ENV:-${REPO_ROOT}/.orb-instance.env}"

if [[ -f "${INSTANCE_ENV}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${INSTANCE_ENV}"
  set +a
fi

cd "${REPO_ROOT}/electron"
exec npm start
