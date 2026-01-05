#!/bin/bash
set -e

echo "=== Dependency Fix: Downgrading Transformers to 4.38.2 ==="
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

export PYTHONUNBUFFERED=1

echo "Current version:"
python3 -c "import transformers; print(transformers.__version__)"

echo "Installing transformers==4.38.2..."
pip install "transformers==4.38.2"

echo "Verifying BeamSearchScorer presence..."
python3 -c "from transformers import BeamSearchScorer; print('BeamSearchScorer: OK')" || echo "BeamSearchScorer: MISSING"

echo "Verifying ImagesKwargs presence..."
python3 -c "from transformers.processing_utils import ImagesKwargs; print('ImagesKwargs: OK')" || echo "ImagesKwargs: MISSING"

echo "Done. Please re-run start_lmdeploy_v4.sh"
