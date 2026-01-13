#!/bin/bash

# =============================================================================
# Kotaro-Engine Startup Script for WSL2/Ubuntu (LMDeploy Edition)
# GPU REQUIRED - No CPU Fallback
# =============================================================================

set -e  # Exit on any error

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🐯 Kotaro-Engine (Qwen + WSL2 GPU)                        ║"
echo "║  GPU REQUIRED MODE - LMDeploy Backend                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# STEP 1: GPU VALIDATION (MANDATORY)
# =============================================================================
echo "[1/3] 🔍 GPU Validation..."
echo "─────────────────────────────────────────────────────────────"

# Check nvidia-smi
if ! command -v nvidia-smi &> /dev/null; then
    echo "❌ FATAL: nvidia-smi not found!"
    echo "   Please ensure NVIDIA drivers are installed in WSL2."
    exit 1
fi

# Run nvidia-smi and capture output
nvidia-smi
NVIDIA_EXIT=$?

if [ $NVIDIA_EXIT -ne 0 ]; then
    echo "❌ FATAL: nvidia-smi failed!"
    exit 1
fi

# Check for GPU
GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
if [ -z "$GPU_NAME" ]; then
    echo "❌ FATAL: No GPU detected!"
    exit 1
fi
echo "✅ GPU Detected: $GPU_NAME"
echo ""

# =============================================================================
# STEP 2: LMDeploy Server (Backend)
# =============================================================================
echo "[2/3] 🚀 Starting LMDeploy Server (Port 23334)..."
echo "─────────────────────────────────────────────────────────────"

# Check for backend venv
if [ -d ".venv_lmdeploy" ]; then
    echo "   Activating .venv_lmdeploy for backend..."
    source .venv_lmdeploy/bin/activate
elif [ -d ".venv_wsl" ]; then
    echo "   ⚠️ .venv_lmdeploy not found, trying .venv_wsl..."
    source .venv_wsl/bin/activate
else
    echo "❌ FATAL: No virtual environment found for backend!"
    echo "   Expected .venv_lmdeploy or .venv_wsl"
    exit 1
fi

# Kill existing process on 23334
if lsof -t -i :23334 > /dev/null; then
    echo "   Killing existing process on port 23334..."
    kill $(lsof -t -i :23334) || true
    sleep 2
fi

# Start Server
echo "   Launching scripts/launch_qwen2.py..."
python3 scripts/launch_qwen2.py > lmdeploy.log 2>&1 &
SERVER_PID=$!
echo "   Backend PID: $SERVER_PID"
echo "   Logs: tail -f lmdeploy.log"

# Wait for port to be ready
echo "   Waiting for server to be ready..."
for i in {1..30}; do
    if lsof -i :23334 > /dev/null; then
        echo "✅ Server is listening on port 23334"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "⚠️  Warning: Server startup is taking long or failed. Check logs."
    fi
done

echo ""

# =============================================================================
# STEP 3: Kotaro API (Frontend API)
# =============================================================================
echo "[3/3] 🐯 Starting Kotaro API (Port 8000)..."
echo "─────────────────────────────────────────────────────────────"

# Switch venv for API if necessary (assuming same venv for now or re-sourcing)
# Windows script uses separate venvs. Here we are in a single shell.
# If we need a different venv, we should launch in subshell or deactivate.
# For simplicity, we assume .venv_wsl or the active one works for API too,
# OR we try to switch if .venv exists.

if [ -d ".venv_wsl" ] && [[ "$VIRTUAL_ENV" != *"venv_wsl"* ]]; then
    deactivate 2>/dev/null || true
    source .venv_wsl/bin/activate
    echo "✅ Switched to .venv_wsl for API"
fi

# Kill existing process on 8000
if lsof -t -i :8000 > /dev/null; then
    echo "   Killing existing process on port 8000..."
    kill $(lsof -t -i :8000) || true
    sleep 1
fi

echo "   Starting kotaro_api.py..."
python3 kotaro_api.py

# Cleanup on exit
kill $SERVER_PID 2>/dev/null || true
