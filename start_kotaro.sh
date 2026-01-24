#!/bin/bash

# =============================================================================
# Kotaro-Engine Startup Script for WSL2/Ubuntu
# GPU REQUIRED - No CPU Fallback
# =============================================================================

set -e  # Exit on any error

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🐯 Kotaro-Engine (Qwen + WSL2 GPU)                        ║"
echo "║  GPU REQUIRED MODE - No CPU Fallback                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# STEP 1: GPU VALIDATION (MANDATORY)
# =============================================================================
echo "[1/4] 🔍 GPU Validation..."
echo "─────────────────────────────────────────────────────────────"

# Check nvidia-smi
if ! command -v nvidia-smi &> /dev/null; then
    echo "❌ FATAL: nvidia-smi not found!"
    echo "   Please ensure NVIDIA drivers are installed in WSL2."
    echo "   Run: nvidia-smi in Windows to verify GPU."
    exit 1
fi

# Run nvidia-smi and capture output
echo "[DEBUG] Running nvidia-smi..."
nvidia-smi
NVIDIA_EXIT=$?

if [ $NVIDIA_EXIT -ne 0 ]; then
    echo "❌ FATAL: nvidia-smi failed with exit code $NVIDIA_EXIT"
    echo "   GPU is NOT accessible from WSL2!"
    exit 1
fi

# Check for GPU in nvidia-smi output
GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
GPU_MEMORY=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null | head -1)

if [ -z "$GPU_NAME" ]; then
    echo "❌ FATAL: No GPU detected!"
    exit 1
fi

echo "✅ GPU Detected: $GPU_NAME ($GPU_MEMORY)"
echo ""

# =============================================================================
# STEP 2: Environment Setup
# =============================================================================
echo "[2/4] ⚙️  Environment Setup..."
echo "─────────────────────────────────────────────────────────────"

# CUDA Settings
export CUDA_VISIBLE_DEVICES=0
export TRANSFORMERS_VERBOSITY=info

echo "   CUDA_VISIBLE_DEVICES=$CUDA_VISIBLE_DEVICES"
echo "   TRANSFORMERS_VERBOSITY=$TRANSFORMERS_VERBOSITY"
echo ""

# =============================================================================
# STEP 3: LMDeploy Server (Qwen2-VL)
# =============================================================================
echo "[3/4] 🚀 Starting LMDeploy Server..."
echo "─────────────────────────────────────────────────────────────"

# Kill existing LMDeploy/Python processes on port 23334
# Using lsof if available, otherwise trying pkill pattern
if command -v lsof &> /dev/null; then
    if lsof -i :23334 -t >/dev/null; then
        echo "   Stopping existing process on port 23334..."
        kill $(lsof -i :23334 -t) || true
        sleep 2
    fi
fi

# Start LMDeploy using the python script
echo "   Starting LMDeploy serve (scripts/launch_qwen2.py)..."
python3 scripts/launch_qwen2.py > /tmp/lmdeploy.log 2>&1 &
LMDEPLOY_PID=$!
echo "   PID: $LMDEPLOY_PID"

echo "   Waiting for server initialization (15s)..."
sleep 15

# Verify process is still running
if ! ps -p $LMDEPLOY_PID > /dev/null; then
    echo "❌ FATAL: LMDeploy failed to start!"
    echo "   Check /tmp/lmdeploy.log for details"
    cat /tmp/lmdeploy.log
    exit 1
fi

echo "✅ LMDeploy server running (PID: $LMDEPLOY_PID)"
echo ""

# =============================================================================
# STEP 4: Python Environment
# =============================================================================
echo "[4/4] 🐍 Python Environment..."
echo "─────────────────────────────────────────────────────────────"

# Change to project directory (for WSL mount)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "   Working directory: $(pwd)"

# Activate venv
if [ -d ".venv_wsl" ]; then
    source .venv_wsl/bin/activate
    echo "✅ Activated .venv_wsl"
else
    echo "❌ FATAL: .venv_wsl not found!"
    echo "   Run: ./setup_kotaro.sh first"
    exit 1
fi

# Verify PyTorch CUDA
echo ""
echo "[DEBUG] Verifying PyTorch CUDA..."
python3 -c "
import torch
print(f'   PyTorch version: {torch.__version__}')
print(f'   CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'   CUDA version: {torch.version.cuda}')
    print(f'   GPU: {torch.cuda.get_device_name(0)}')
else:
    print('❌ FATAL: PyTorch cannot access CUDA!')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ FATAL: PyTorch CUDA check failed!"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ All checks passed - Starting API Server                ║"
echo "║  URL: http://localhost:8000                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Start API server
exec python3 kotaro_api.py
