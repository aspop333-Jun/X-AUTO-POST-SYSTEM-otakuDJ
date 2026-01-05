#!/bin/bash
set -e

echo "=== LMDeploy Startup V4 (Manual Python Launcher) ==="
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

# 環境変数
export PYTHONUNBUFFERED=1
export LMDEPLOY_LOG_LEVEL=INFO
export CUDA_LAUNCH_BLOCKING=1

echo "Executing scripts/launch_server.py..."
python3 scripts/launch_server.py
