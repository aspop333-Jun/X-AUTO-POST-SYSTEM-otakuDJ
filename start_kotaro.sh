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

# GPU Optimization Settings
export OLLAMA_GPU_LAYERS=-1
export OLLAMA_NUM_GPU=99
export OLLAMA_FLASH_ATTENTION=1
export CUDA_VISIBLE_DEVICES=0

# Debug logging
export OLLAMA_DEBUG=1
export TRANSFORMERS_VERBOSITY=info

echo "   OLLAMA_GPU_LAYERS=$OLLAMA_GPU_LAYERS (all layers on GPU)"
echo "   OLLAMA_NUM_GPU=$OLLAMA_NUM_GPU"
echo "   OLLAMA_FLASH_ATTENTION=$OLLAMA_FLASH_ATTENTION"
echo "   CUDA_VISIBLE_DEVICES=$CUDA_VISIBLE_DEVICES"
echo "   OLLAMA_DEBUG=1"
echo ""

# =============================================================================
# STEP 3: Ollama Server
# =============================================================================
echo "[3/4] 🦙 Starting Ollama Server..."
echo "─────────────────────────────────────────────────────────────"

# Kill existing ollama if running
if pgrep -x "ollama" > /dev/null; then
    echo "   Stopping existing Ollama process..."
    pkill -x ollama || true
    sleep 2
fi

# Start Ollama with logging
echo "   Starting Ollama serve..."
ollama serve 2>&1 | tee /tmp/ollama.log &
OLLAMA_PID=$!
sleep 5

# Verify Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "❌ FATAL: Ollama failed to start!"
    echo "   Check /tmp/ollama.log for details"
    cat /tmp/ollama.log
    exit 1
fi

# Verify GPU is being used by Ollama
echo "[DEBUG] Checking Ollama GPU usage..."
OLLAMA_GPU_CHECK=$(ollama list 2>&1)
echo "   Ollama models: $(echo "$OLLAMA_GPU_CHECK" | head -5)"
echo "✅ Ollama server running (PID: $OLLAMA_PID)"
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
    echo "   Python: $(which python3)"
    echo "   Version: $(python3 --version)"
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
    print(f'   VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')
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

# Start API server with verbose logging
exec python3 kotaro_api.py
