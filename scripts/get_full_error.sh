#!/bin/bash
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

echo "=== Full Error Log for lmdeploy serve ==="
echo "Time: $(date)"
echo ""

lmdeploy serve api_server \
    Qwen/Qwen-VL-Chat-Int4 \
    --server-port 23333 \
    --model-format awq \
    --quant-policy 4 \
    --cache-max-entry-count 0.4 \
    2>&1 | tee /tmp/lmdeploy_error.log

echo ""
echo "=== End of Log ==="
