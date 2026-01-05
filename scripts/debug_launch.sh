#!/bin/bash
export PYTHONUNBUFFERED=1
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

echo "=== Environment Check ==="
python3 --version
pip check || echo "PIP CHECK FAILED (Non-fatal?)"
pip list | grep -E 'transformers|lmdeploy|qwen'

echo "=== Starting Launch Script ==="
python3 -u scripts/launch_qwen2.py
echo "=== Script Finished with Exit Code: $? ==="
