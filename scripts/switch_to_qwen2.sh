#!/bin/bash
set -e

echo "=== Switching to Qwen2-VL Environment (Sports Car Mode) ==="
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

export PYTHONUNBUFFERED=1

echo "1. Upgrading Transformers to latest (Dependencies Unchained!)..."
pip install -U transformers

echo "2. Installing Qwen2-VL utils..."
pip install qwen-vl-utils

echo "3. Removing temporary patches (optional but good practice)..."
# We don't necessarily need to revert the sediment patch as we are upgrading transformers anyway, 
# which might overwrite the file or we might just leave it as it was for specific version.
# Actually, reinstalling transformers usually cleans up its own files, but lmdeploy files (patched) remain.
# The patch was in LMDeploy code. We should revert it to be clean, OR just leave it if it doesn't hurt.
# Since we are upgrading transformers, the 'ImagesKwargs' will exist again, so the import in Gemma3 lines 
# (if valid) would work. However, keeping it commented out is safer for now.

echo "Ready to launch Qwen2-VL-2B!"
python3 scripts/launch_qwen2.py
