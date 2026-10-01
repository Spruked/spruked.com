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
PYTHON_BIN="${PYTHON_BIN:-$ROOT/venv/bin/python}"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$(command -v python3)"
fi

# Start through the memory-aware wrapper. It preserves the existing CALI routes
# while adding inherited prior-conversation recall and SeedVault reasoning context.
exec "$PYTHON_BIN" -m uvicorn cali_skg.api.cali_routes_memory:app --host 0.0.0.0 --port "$CALI_API_PORT"
