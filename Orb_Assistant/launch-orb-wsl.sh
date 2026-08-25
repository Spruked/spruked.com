#!/usr/bin/env bash
set -euo pipefail

export ORB_INSTANCE_ID="wsl"
export ORB_SYSTEM_ROOT="/home/bryan/projects/spruked.com/Orb_Assistant"
export ORB_USER_DATA_DIR="/home/bryan/projects/spruked.com/Orb_Assistant/.orb-assistant-wsl"
export ORB_SHARED_MESH_ROOT="/mnt/r/orb_mesh"
export ORB_APP_ID="com.spruked.orb-dock-adapter.wsl"
export ORB_PRODUCT_NAME="ORB Dock Adapter (WSL)"
export ORB_SINGLE_INSTANCE="${ORB_SINGLE_INSTANCE:-1}"
export ORB_PYTHON_PATH="/home/bryan/pro_prime_env/bin/python"
export ORB_BRIDGE_LOGGING="${ORB_BRIDGE_LOGGING:-0}"
export SPRUKED_ORB_URL="${SPRUKED_ORB_URL:-http://127.0.0.1:21010}"

LOG_DIR="${ORB_SYSTEM_ROOT}/logs"
mkdir -p "${LOG_DIR}"
ORB_LAUNCH_LOG="${ORB_LAUNCH_LOG:-${LOG_DIR}/orb-wsl.log}"

cd "${ORB_SYSTEM_ROOT}"
if [[ "${ORB_FOREGROUND:-0}" == "1" ]]; then
  exec env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron electron_dock_adapter --disable-http-cache
fi

if [[ "${ORB_DETACH:-0}" == "1" ]]; then
  nohup env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron electron_dock_adapter --disable-http-cache >>"${ORB_LAUNCH_LOG}" 2>&1 < /dev/null &
  ORB_PID=$!
  echo "${ORB_PID}" > "${ORB_SYSTEM_ROOT}/.orb-assistant-wsl.pid"
  echo "ORB Dock Adapter (WSL) launched in background"
  echo "PID: ${ORB_PID}"
  echo "Log: ${ORB_LAUNCH_LOG}"
  exit 0
fi

echo "ORB Dock Adapter (WSL) launching"
echo "Log: ${ORB_LAUNCH_LOG}"
exec env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron electron_dock_adapter --disable-http-cache >>"${ORB_LAUNCH_LOG}" 2>&1
