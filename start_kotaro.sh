#!/bin/bash

# =============================================================================
# Kotaro-Engine Startup Script for WSL2/Ubuntu
# GPU REQUIRED - No CPU Fallback
# =============================================================================

set -e  # Exit on any error

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🐯 Kotaro-Engine (LMDeploy + WSL2 GPU)                    ║"
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
    exit 1
fi

nvidia-smi
if [ $? -ne 0 ]; then
    echo "❌ FATAL: nvidia-smi failed!"
    exit 1
fi

echo "✅ GPU Detected"
echo ""

# =============================================================================
# STEP 2: Start LMDeploy Backend
# =============================================================================
echo "[2/4] 🚀 Starting LMDeploy Backend (Port 23334)..."
echo "─────────────────────────────────────────────────────────────"

# Determine VENV for backend
if [ -d ".venv_lmdeploy" ]; then
    BACKEND_VENV=".venv_lmdeploy"
    echo "   Using venv: .venv_lmdeploy"
elif [ -d ".venv_wsl" ]; then
    BACKEND_VENV=".venv_wsl"
    echo "   Using venv: .venv_wsl"
else
    echo "⚠️  Warning: No dedicated venv found for backend. Trying global python..."
    BACKEND_VENV=""
fi

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID || true
    fi
    exit
}
trap cleanup SIGINT SIGTERM EXIT

# Start Backend in background
(
    if [ ! -z "$BACKEND_VENV" ]; then
        source $BACKEND_VENV/bin/activate
    fi
    echo "   Launching scripts/launch_qwen2.py..."
    python3 scripts/launch_qwen2.py
) > /tmp/lmdeploy.log 2>&1 &
BACKEND_PID=$!

echo "   Backend PID: $BACKEND_PID"
echo "   Waiting for port 23334..."

# Wait loop
MAX_RETRIES=60
COUNT=0
while ! timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/23334" 2>/dev/null; do
    sleep 1
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "❌ FATAL: Backend failed to start on port 23334."
        echo "   Check /tmp/lmdeploy.log for details."
        cat /tmp/lmdeploy.log
        exit 1
    fi
    echo -n "."
done
echo ""
echo "✅ Backend Ready!"

# =============================================================================
# STEP 3: Start API Server
# =============================================================================
echo "[3/4] 🐯 Starting Kotaro API (Port 8000)..."
echo "─────────────────────────────────────────────────────────────"

# Determine VENV for API
if [ -d ".venv_wsl" ]; then
    API_VENV=".venv_wsl"
elif [ -d ".venv" ]; then
    API_VENV=".venv"
else
    API_VENV=""
fi

if [ ! -z "$API_VENV" ]; then
    # Create a subshell/script for API to avoid environment conflict if any,
    # though strictly speaking activating another venv on top of previous one might work or fail depending on impl.
    # Since we are in the main shell, we just activate.
    # Note: Backend was started in subshell (), so its activation didn't affect us.
    source $API_VENV/bin/activate
    echo "   Activated $API_VENV"
fi

python3 kotaro_api.py
