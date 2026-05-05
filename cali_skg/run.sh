#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f "venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source "venv/bin/activate"
fi

export PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}"
CALI_API_PORT="${CALI_API_PORT:-8022}"
exec "$ROOT/venv/bin/python" -m uvicorn cali_skg.api.cali_routes:app --host 0.0.0.0 --port "$CALI_API_PORT"
