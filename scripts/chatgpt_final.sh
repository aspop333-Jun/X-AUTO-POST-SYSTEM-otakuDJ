#!/bin/bash
set -e

echo "=== ChatGPT Strategy: Transformers Upgrade & CLI Launch ==="
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

# 環境変数（ログ可視化）
export PYTHONUNBUFFERED=1
export LMDEPLOY_LOG_LEVEL=INFO
export CUDA_LAUNCH_BLOCKING=1

echo "[1/2] Updating transformers >= 4.41..."
pip uninstall transformers -y 2>/dev/null || true
pip install "transformers>=4.41,<5"

echo "[2/2] Version check..."
python -c "import transformers; print(f'transformers: {transformers.__version__}')"

echo ""
echo "=== Starting Server (CLI Mode) ==="
echo "Backend: pytorch"
echo ""

lmdeploy serve api_server \
    Qwen/Qwen-VL-Chat-Int4 \
    --backend pytorch \
    --trust-remote-code \
    --server-name 0.0.0.0 \
    --server-port 23333 \
    --cache-max-entry-count 0.1 \
    2>&1
