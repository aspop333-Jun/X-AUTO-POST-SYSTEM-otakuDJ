#!/bin/bash
set -e

# Activate venv
if [ ! -d ".venv_lmdeploy" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv_lmdeploy
fi

source .venv_lmdeploy/bin/activate

# Fail-Fast: Check nvidia-smi
if ! command -v nvidia-smi &> /dev/null; then
    echo "Error: nvidia-smi not found. GPU is required."
    exit 1
fi

echo "=== Starting LMDeploy (Local WSL) ==="
echo "Model: Qwen/Qwen-VL-Chat-Int4"
echo "Port: 23333"

# Start Server
# --quant-policy 4: KV Cache Int4 Quantization (VRAM saving)
# --cache-max-entry-count 0.4: Limit cache size (adjust if VRAM OOM)
lmdeploy serve api_server \
    Qwen/Qwen-VL-Chat-Int4 \
    --server-port 23333 \
    --model-format awq \
    --quant-policy 4 \
    --cache-max-entry-count 0.4
