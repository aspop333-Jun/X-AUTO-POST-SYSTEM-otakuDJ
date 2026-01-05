#!/bin/bash
set -e

echo "=== Gemini Strategy: Final Fix ==="
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

# 環境変数でログ可視化
export PYTHONUNBUFFERED=1
export LMDEPLOY_LOG_LEVEL=DEBUG
export CUDA_LAUNCH_BLOCKING=1

echo "[1/4] Cleaning up..."
pip uninstall transformers -y 2>/dev/null || true

echo "[2/4] Installing transformers==4.37.2 (Qwen-VL sweet spot)..."
pip install "transformers==4.37.2"

echo "[3/4] Installing missing dependencies..."
pip install auto-gptq optimum tiktoken einops transformers_stream_generator 2>/dev/null || true

echo "[4/4] Version check..."
python -c "import transformers; print(f'transformers: {transformers.__version__}')"
python -c "import lmdeploy; print(f'lmdeploy: {lmdeploy.__version__}')"

echo ""
echo "=== Starting Server with PyTorch Backend ==="
echo "PYTHONUNBUFFERED=1, CUDA_LAUNCH_BLOCKING=1"
echo ""

python -m lmdeploy.serve.api_server \
    Qwen/Qwen-VL-Chat-Int4 \
    --server-port 23333 \
    --backend pytorch \
    --cache-max-entry-count 0.1 \
    2>&1
