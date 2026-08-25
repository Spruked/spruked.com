#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/bryan/projects/spruked.com"
CP3_ROOT="${CP3_ROOT:-/mnt/r/cochlear_processor_3.0}"
CALI_API_PORT="${CALI_API_PORT:-${SPRUKED_CALI_API_PORT:-${CALI_API_BACKEND_PORT:-8022}}}"
LOG_DIR="$ROOT/.runlogs"
PID_FILE="$LOG_DIR/cali-skg-${CALI_API_PORT}.pid"
LOG_FILE="$LOG_DIR/cali-skg-${CALI_API_PORT}.log"
LOCK_FILE="/tmp/cali-skg-${CALI_API_PORT}-start.lock"

mkdir -p "$LOG_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  exit 0
fi

if curl -fsS --max-time 2 "http://127.0.0.1:${CALI_API_PORT}/health" >/dev/null 2>&1; then
  exit 0
fi

cd "$ROOT/Orb_Assistant"
export CP3_ROOT
export CALI_API_PORT
export CALI_LLM_BASE_URL="${CALI_LLM_BASE_URL:-${LLAMA_SERVER_BASE_URL:-http://127.0.0.1:8081}}"
export CALI_LLM_PROVIDER="${CALI_LLM_PROVIDER:-llama.cpp}"
export COCHLEAR_PROCESSOR_ROOT="$CP3_ROOT"
export PYTHONPATH="$ROOT/Orb_Assistant:$CP3_ROOT${PYTHONPATH:+:$PYTHONPATH}"
PYTHON_BIN="${ORB_PYTHON_PATH:-}"
if [[ -z "$PYTHON_BIN" ]]; then
  if [[ -x "$ROOT/Orb_Assistant/venv/bin/python" ]]; then
    PYTHON_BIN="$ROOT/Orb_Assistant/venv/bin/python"
  else
    PYTHON_BIN="$(command -v python3)"
  fi
fi
setsid "$PYTHON_BIN" -m uvicorn cali_skg.api.cali_routes:app --host 0.0.0.0 --port "$CALI_API_PORT" </dev/null >>"$LOG_FILE" 2>&1 &
CP3_PID=$!
echo "$CP3_PID" >"$PID_FILE"

echo "[$(date -Iseconds)] started cali-skg port=${CALI_API_PORT} pid=$CP3_PID" >>"$LOG_FILE"
