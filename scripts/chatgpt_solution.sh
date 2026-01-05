#!/bin/bash
set -e

echo "=== ChatGPT Solution: Complete Reinstall ==="

# 0) WSLのhomeで作業
cd ~
mkdir -p lmdeploy_qwenvl && cd lmdeploy_qwenvl
echo "Working in: $(pwd)"

# 1) venv作り直し
echo ""
echo "[1/5] Creating fresh venv..."
rm -rf .venv_lmdeploy
python3 -m venv .venv_lmdeploy
source .venv_lmdeploy/bin/activate
python -m pip install -U pip wheel setuptools

# 2) LMDeploy入れる
echo ""
echo "[2/5] Installing lmdeploy..."
pip install "lmdeploy==0.11.1"

# 3) Qwen-VL-Chat-Int4のrequirements通りに固定
echo ""
echo "[3/5] Installing Qwen-VL dependencies (transformers==4.32.0 FIXED)..."
pip install \
  "transformers==4.32.0" \
  accelerate tiktoken einops scipy torchvision pillow tensorboard matplotlib \
  "transformers_stream_generator==0.0.4"

pip install optimum

# 4) 依存チェック
echo ""
echo "[4/5] Verifying dependencies..."
python -c "import transformers; print('transformers', transformers.__version__)"
python -c "import transformers_stream_generator; print('tsg ok')"
python -c "from lmdeploy import serve; print('lmdeploy ok')"

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Now starting server with correct options..."
echo "(--backend pytorch, NO --model-format awq)"
echo ""

# 5) サーバ起動
lmdeploy serve api_server \
  Qwen/Qwen-VL-Chat-Int4 \
  --server-port 23333 \
  --backend pytorch \
  --session-len 512 \
  --cache-max-entry-count 0.10 \
  2>&1 | tee lmdeploy.log
