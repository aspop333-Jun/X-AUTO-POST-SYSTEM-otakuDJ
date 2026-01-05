
import os
import sys
from lmdeploy.serve.openai.api_server import serve
from lmdeploy.messages import PytorchEngineConfig

def main():
    print("=== LMDeploy Server V5: Qwen2-VL-2B-Instruct (PyTorch Backend) ===")
    
    model_path = 'Qwen/Qwen2-VL-2B-Instruct'
    print(f"Target Model: {model_path}")
    print("Backend: PyTorch (Explicit Config)")

    # PyTorch backend requires explicit config to avoid NoneType error
    # Setting session_len to 8192 to accommodate high-res images and context
    backend_config = PytorchEngineConfig(
        session_len=8192,
        cache_max_entry_count=0.1  # Limit VRAM usage for kv cache
    )

    try:
        serve(
            model_path=model_path,
            server_name='0.0.0.0',
            server_port=23334,
            backend='pytorch',
            backend_config=backend_config, # Critical fix: Passing the config object
            log_level='INFO',
            trust_remote_code=True,
            model_name='Qwen2-VL-2B-Instruct'
        )
    except Exception as e:
        print(f"Server Startup Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
