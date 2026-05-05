#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/bryan/spruked.com"
LOG_DIR="$ROOT/.runlogs"
PID_FILE="$LOG_DIR/cp3-8022.pid"
LOG_FILE="$LOG_DIR/cp3-8022.log"
LOCK_FILE="/tmp/cp3-8022-start.lock"

mkdir -p "$LOG_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  exit 0
fi

if curl -fsS --max-time 2 "http://127.0.0.1:8022/health" >/dev/null 2>&1; then
  exit 0
fi

cd "$ROOT"
nohup "$ROOT/cali_skg/run.sh" >>"$LOG_FILE" 2>&1 &
CP3_PID=$!
echo "$CP3_PID" >"$PID_FILE"

echo "[$(date -Iseconds)] started cp3 pid=$CP3_PID" >>"$LOG_FILE"
