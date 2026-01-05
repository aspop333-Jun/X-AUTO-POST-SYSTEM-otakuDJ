#!/bin/bash
set -e

echo "=== LMDeploy Startup (Corrected Module Path) ==="
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

# 環境変数（ログ可視化・デバッグ用）
export PYTHONUNBUFFERED=1
export LMDEPLOY_LOG_LEVEL=INFO
export CUDA_LAUNCH_BLOCKING=1

echo "Starting server with: python -m lmdeploy.serve.openai.api_server"
echo "Model: Qwen/Qwen-VL-Chat-Int4"
echo "Backend: pytorch (to avoid TurboMind crash)"
echo ""

# 正しいモジュールパスで起動
python3 -m lmdeploy.serve.openai.api_server \
    Qwen/Qwen-VL-Chat-Int4 \
    --server-name 0.0.0.0 \
    --server-port 23333 \
    --backend pytorch \
    --cache-max-entry-count 0.1 \
    --trust-remote-code
