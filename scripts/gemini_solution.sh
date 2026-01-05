#!/bin/bash
set -e

# 作業ディレクトリに移動
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ

# 仮想環境を有効化
source .venv_lmdeploy/bin/activate

echo "=== 1. 現在のバージョン確認 ==="
python3 -c "import transformers; print(f'Transformers version: {transformers.__version__}')"
python3 -c "import lmdeploy; print(f'LMDeploy version: {lmdeploy.__version__}')"

echo ""
echo "=== 2. インポート不整合の特定 (Deep Check) ==="
# ここでエラーの正体を確実に捕まえます
python3 << 'END'
try:
    from transformers.processing_utils import ProcessorMixin
    print("✅ ProcessorMixin: OK")
except ImportError as e:
    print(f"❌ ProcessorMixin: {e}")

try:
    from lmdeploy.serve.api_server import serve
    print("✅ LMDeploy Serve: OK")
except Exception as e:
    print("❌ LMDeploy Serve Error Found:")
    import traceback
    traceback.print_exc()
END

echo ""
echo "=== 3. 依存関係の自動調整 (Sweet Spot Version) ==="
# Qwen-VLとLMDeploy 0.11が共存できる「4.38.2」を試します
pip install --upgrade 'transformers==4.38.2' 'accelerate>=0.26.0'

echo ""
echo "=== 4. 再度バージョン確認 ==="
python3 -c "import transformers; print(f'Transformers version: {transformers.__version__}')"

echo ""
echo "=== 5. サーバー起動テスト (VRAM 8GB 最適化版) ==="
# 8GB VRAM用に設定を極限まで絞って起動を試みます
python3 -m lmdeploy.serve.api_server \
    Qwen/Qwen-VL-Chat-Int4 \
    --server-name 0.0.0.0 \
    --server-port 23333 \
    --model-format awq \
    --cache-max-entry-count 0.1 \
    --trust-remote-code \
    2>&1 | tee /tmp/gemini_solution.log
