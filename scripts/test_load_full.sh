#!/bin/bash
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

echo "=== Isolation Test with Full Error Log ==="
python << 'EOF' 2>&1 | tee /tmp/test_load_error.log
import sys
print(f"Python: {sys.version}")

import torch
print(f"PyTorch: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

import transformers
print(f"transformers: {transformers.__version__}")

try:
    from lmdeploy import pipeline, TurbomindEngineConfig
    print("lmdeploy imports OK")
    
    backend_config = TurbomindEngineConfig(model_format='awq', cache_max_entry_count=0.2)
    print("Creating pipeline...")
    
    pipe = pipeline("Qwen/Qwen-VL-Chat-Int4", backend_config=backend_config)
    print("Pipeline created OK!")
    
except Exception as e:
    import traceback
    print(f"\n=== ERROR ===")
    print(f"Error type: {type(e).__name__}")
    print(f"Error message: {e}")
    print(f"\n=== FULL TRACEBACK ===")
    traceback.print_exc()
EOF

echo ""
echo "=== Log saved to /tmp/test_load_error.log ==="
