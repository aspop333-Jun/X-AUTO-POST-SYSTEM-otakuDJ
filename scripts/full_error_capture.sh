#!/bin/bash
cd ~/lmdeploy_qwenvl
source .venv_lmdeploy/bin/activate

echo "=== Full Error Capture ==="
echo "Python: $(python --version)"
echo "transformers: $(python -c 'import transformers; print(transformers.__version__)')"
echo ""

python3 << 'PYEOF' 2>&1
import sys
import traceback

print("Testing lmdeploy serve import...")

try:
    # まずserve単体でテスト
    from lmdeploy import serve
    print("lmdeploy.serve OK")
    
    # api_server のインポート
    from lmdeploy.serve import api_server
    print("lmdeploy.serve.api_server OK")
    
except ImportError as e:
    print("")
    print("=" * 60)
    print("IMPORTERROR DETECTED")
    print("=" * 60)
    print(f"Error: {e}")
    print("")
    print("Full traceback:")
    traceback.print_exc()
    print("=" * 60)

except Exception as e:
    print(f"Other error: {type(e).__name__}: {e}")
    traceback.print_exc()
PYEOF
