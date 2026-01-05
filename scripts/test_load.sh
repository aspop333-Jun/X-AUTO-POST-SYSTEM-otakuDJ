#!/bin/bash
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

echo "=== Isolation Test (Gemini Suggestion) ==="
echo "transformers version:"
python -c "import transformers; print(transformers.__version__)"

echo ""
echo "Running test_load.py..."

python << 'EOF'
import torch
print(f"PyTorch: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")

try:
    from lmdeploy import pipeline, GenerationConfig, TurbomindEngineConfig
    print("lmdeploy imports OK")
    
    backend_config = TurbomindEngineConfig(model_format='awq', cache_max_entry_count=0.2)
    print("TurbomindEngineConfig OK")
    
    pipe = pipeline("Qwen/Qwen-VL-Chat-Int4", backend_config=backend_config)
    print("Pipeline created OK")
    
    # Simple test
    response = pipe("Describe this image.", input_urls="https://raw.githubusercontent.com/QwenLM/Qwen-VL/master/assets/demo.jpeg")
    print(f"Response: {response}")
    
except Exception as e:
    import traceback
    print(f"Error: {e}")
    print("--- Full Traceback ---")
    traceback.print_exc()
EOF
