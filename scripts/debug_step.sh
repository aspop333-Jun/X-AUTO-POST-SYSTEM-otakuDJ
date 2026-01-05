#!/bin/bash
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

python3 << 'PYEOF'
import sys
import traceback

print("Step 1: Basic imports...")
try:
    import torch
    import transformers
    print(f"  torch: {torch.__version__}")
    print(f"  transformers: {transformers.__version__}")
    print("  OK")
except Exception as e:
    print(f"  FAIL: {e}")
    sys.exit(1)

print("\nStep 2: lmdeploy imports...")
try:
    from lmdeploy import pipeline, TurbomindEngineConfig
    print("  OK")
except Exception as e:
    print(f"  FAIL: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nStep 3: Loading Qwen-VL model...")
try:
    backend_config = TurbomindEngineConfig(model_format='awq', cache_max_entry_count=0.1)
    pipe = pipeline("Qwen/Qwen-VL-Chat-Int4", backend_config=backend_config)
    print("  OK - Model loaded!")
except ImportError as e:
    print(f"\n*** ImportError detected! ***")
    print(f"Message: {e}")
    print("\nThis is the key error. The missing import is:")
    import re
    match = re.search(r"cannot import name '(\w+)'", str(e))
    if match:
        print(f"  Missing: {match.group(1)}")
    traceback.print_exc()
except Exception as e:
    print(f"\n*** Other Error ***")
    print(f"Type: {type(e).__name__}")
    print(f"Message: {e}")
    traceback.print_exc()
PYEOF
