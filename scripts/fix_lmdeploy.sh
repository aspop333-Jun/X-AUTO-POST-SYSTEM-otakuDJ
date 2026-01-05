#!/bin/bash
set -e

echo "=== LMDeploy Environment Fix Script ==="

cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ

# Activate venv
echo "[1/5] Activating virtual environment..."
source .venv_lmdeploy/bin/activate

# Upgrade pip
echo "[2/5] Upgrading pip..."
pip install --upgrade pip

# Install missing dependencies
echo "[3/5] Installing missing dependencies..."
pip install matplotlib transformers_stream_generator einops timm

# Reinstall lmdeploy
echo "[4/5] Reinstalling lmdeploy..."
pip install -U lmdeploy

# Test import
echo "[5/5] Testing import..."
python -c "from lmdeploy import serve; print('✅ Import Success!')"

echo ""
echo "=== Fix Complete! ==="
echo "Now run: bash scripts/start_lmdeploy_local.sh"
