#!/bin/bash
set -e

# Fail-Fast: Check nvidia-smi
if ! command -v nvidia-smi &> /dev/null; then
    echo "Error: nvidia-smi not found. GPU is required."
    exit 1
fi

if ! nvidia-smi &> /dev/null; then
    echo "Error: GPU not accessible via nvidia-smi."
    exit 1
fi

echo "=== Starting LMDeploy API Server (Qwen-VL-Chat-Int4) ==="
echo "Model Image: openmmlab/lmdeploy:latest"

# Create cache directory if not exists
mkdir -p $HOME/lmdeploy_cache

# Check if container exists
if docker ps -a --format '{{.Names}}' | grep -q "^lmdeploy-vlm$"; then
    echo "Container lmdeploy-vlm already exists. Removing..."
    docker rm -f lmdeploy-vlm
fi

# Run Docker Container
# Port 23333 is fixed
# Cache is mounted to host ($HOME/lmdeploy_cache)
# IPC host for PyTorch
docker run -d --gpus all \
  -p 23333:23333 \
  --name lmdeploy-vlm \
  --restart unless-stopped \
  --ipc=host \
  -v $HOME/lmdeploy_cache:/root/.cache \
  openmmlab/lmdeploy:latest \
  lmdeploy serve api_server \
    Qwen/Qwen-VL-Chat-Int4 \
    --server-port 23333 \
    --cache-max-entry-count 0.4 \
    --model-format awq

echo "=== LMDeploy Container Started ==="
echo "Port: 23333"
echo "Model: Qwen/Qwen-VL-Chat-Int4"
echo "Cache: $HOME/lmdeploy_cache (Persistent)"
echo "Logs: docker logs -f lmdeploy-vlm"
