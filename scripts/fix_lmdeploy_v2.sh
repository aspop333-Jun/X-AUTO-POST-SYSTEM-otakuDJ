#!/bin/bash
set -e

echo "=== LMDeploy Fix v2 (Based on Gemini Analysis) ==="
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

echo "[1/3] Installing compatible transformers version..."
pip install 'transformers<4.38.0' 'accelerate>=0.26.0'

echo "[2/3] Installing additional dependencies..."
pip install einops transformers_stream_generator sentencepiece pillow

echo "[3/3] Verifying installation..."
python -c "
import transformers
import einops
import sentencepiece
from PIL import Image
print(f'transformers: {transformers.__version__}')
print('All imports OK!')
"

echo ""
echo "=== Fix Complete! ==="
echo "Now starting server with python -m method..."
echo ""

python -m lmdeploy.serve.api_server \
    Qwen/Qwen-VL-Chat-Int4 \
    --server-name 0.0.0.0 \
    --server-port 23333 \
    --model-format awq \
    --cache-max-entry-count 0.2 \
    --trust-remote-code
