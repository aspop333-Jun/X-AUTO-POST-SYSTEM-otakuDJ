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

if ! command -v nvidia-smi &> /dev/null; then
    echo "❌ FATAL: nvidia-smi not found!"
    echo "   Please ensure NVIDIA drivers are installed in WSL2."
    exit 1
fi

nvidia-smi
if [ $? -ne 0 ]; then
    echo "❌ FATAL: nvidia-smi failed. GPU is NOT accessible!"
    exit 1
fi

echo "✅ GPU Detected."
echo ""

# =============================================================================
# STEP 2: Environment Setup
# =============================================================================
echo "[2/4] ⚙️  Environment Setup..."
echo "─────────────────────────────────────────────────────────────"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -d ".venv_wsl" ]; then
    source .venv_wsl/bin/activate
    echo "✅ Activated .venv_wsl"
else
    echo "❌ FATAL: .venv_wsl not found!"
    echo "   Run: ./setup_kotaro.sh first"
    exit 1
fi

# =============================================================================
# STEP 3: LMDeploy Server (Qwen2-VL)
# =============================================================================
echo "[3/4] 🚀 Starting LMDeploy Server..."
echo "─────────────────────────────────────────────────────────────"

# Kill existing processes on port 23334
if lsof -i :23334 >/dev/null 2>&1; then
    echo "   Killing process on port 23334..."
    kill $(lsof -t -i :23334) 2>/dev/null || true
    sleep 2
fi

# Launch Qwen2 using the Python script
echo "   Launching scripts/launch_qwen2.py..."
python3 scripts/launch_qwen2.py > /tmp/lmdeploy.log 2>&1 &
LMDEPLOY_PID=$!

echo "   Waiting for server to be ready on port 23334..."
# Wait loop
MAX_RETRIES=60
count=0
while ! nc -z localhost 23334; do
    sleep 1
    count=$((count+1))
    if [ $count -ge $MAX_RETRIES ]; then
        echo "❌ FATAL: LMDeploy failed to start in 60s."
        echo "   Check /tmp/lmdeploy.log"
        cat /tmp/lmdeploy.log
        exit 1
    fi
    echo -n "."
done
echo ""
echo "✅ LMDeploy server running (PID: $LMDEPLOY_PID)"
echo ""

# =============================================================================
# STEP 4: API Server
# =============================================================================
echo "[4/4] 🐍 Starting Kotaro API..."
echo "─────────────────────────────────────────────────────────────"

echo "   URL: http://localhost:8000"
exec python3 kotaro_api.py
