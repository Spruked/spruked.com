#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CP3_ROOT="${CP3_ROOT:-/mnt/r/cochlear_processor_3.0}"
cd "$ROOT"

if [[ -f "venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source "venv/bin/activate"
fi

export CP3_ROOT
export COCHLEAR_PROCESSOR_ROOT="$CP3_ROOT"
export CALI_LLM_BASE_URL="${CALI_LLM_BASE_URL:-${LLAMA_SERVER_BASE_URL:-http://127.0.0.1:8012}}"
export PYTHONPATH="$ROOT:$CP3_ROOT${PYTHONPATH:+:$PYTHONPATH}"
CALI_API_PORT="${CALI_API_PORT:-${SPRUKED_CALI_API_PORT:-${CALI_API_BACKEND_PORT:-8022}}}"
PYTHON_BIN="${ORB_PYTHON_PATH:-}"
if [[ -z "$PYTHON_BIN" ]]; then
  if [[ -x "$ROOT/venv/bin/python" ]]; then
    PYTHON_BIN="$ROOT/venv/bin/python"
  else
    PYTHON_BIN="$(command -v python3)"
  fi
fi

exec "$PYTHON_BIN" -m uvicorn cali_skg.api.cali_routes:app --host 0.0.0.0 --port "$CALI_API_PORT"
