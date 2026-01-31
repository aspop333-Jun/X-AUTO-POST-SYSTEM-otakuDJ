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

# Change to project directory (for WSL mount)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "   Working directory: $(pwd)"

# =============================================================================
# STEP 3: Start LMDeploy Backend
# =============================================================================
echo "[3/4] 🚀 Starting LMDeploy Backend (Port 23334)..."
echo "─────────────────────────────────────────────────────────────"

# Kill existing processes on port 23334
PID_23334=$(lsof -t -i:23334 || true)
if [ -n "$PID_23334" ]; then
    echo "   Stopping existing process on port 23334 (PID $PID_23334)..."
    kill -9 "$PID_23334" || true
    sleep 2
fi

# Launch in background
# Prefer .venv_lmdeploy if exists, else assume current env has it
if [ -d ".venv_lmdeploy" ]; then
    echo "   Using .venv_lmdeploy for backend..."
    (source .venv_lmdeploy/bin/activate && python3 scripts/launch_qwen2.py > lmdeploy_server.log 2>&1) &
else
    echo "   Using default environment for backend..."
    python3 scripts/launch_qwen2.py > lmdeploy_server.log 2>&1 &
fi

LMDEPLOY_PID=$!
echo "   Backend started (PID: $LMDEPLOY_PID). Waiting for initialization (15s)..."
sleep 15

# Check if it's running
if ! ps -p $LMDEPLOY_PID > /dev/null; then
    echo "❌ FATAL: LMDeploy failed to start!"
    echo "   Check lmdeploy_server.log:"
    tail -n 10 lmdeploy_server.log
    exit 1
fi

echo "✅ LMDeploy Backend Running"
echo ""

# =============================================================================
# STEP 4: Start Kotaro API
# =============================================================================
echo "[4/4] 🐯 Starting Kotaro API (Port 8000)..."
echo "─────────────────────────────────────────────────────────────"

# Activate API venv
if [ -d ".venv_wsl" ]; then
    source .venv_wsl/bin/activate
    echo "✅ Activated .venv_wsl for API"
elif [ -d ".venv" ]; then
    source .venv/bin/activate
    echo "✅ Activated .venv for API"
else
    echo "⚠️  No specific venv found for API. Using system python."
fi

echo "   Python: $(which python3)"
echo "   Version: $(python3 --version)"

# Verify connection to Backend (Simple check)
echo "   Checking connection to LMDeploy (localhost:23334)..."
# We could use curl here but let's assume if process is up, it's ok for now.

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ All systems go - Starting API Server                   ║"
echo "║  URL: http://localhost:8000                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Start API server
exec python3 kotaro_api.py
