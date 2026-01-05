
import os
import sys
from lmdeploy.serve.openai.api_server import serve
from lmdeploy.messages import PytorchEngineConfig

def main():
    print("Initializing LMDeploy Server with Manual Configuration (V4.1 - GPTQ Fix)...")
    
    # Configure PyTorch Backend
    # Attempting to explicitly set model_format to 'gptq' or 'awq' if needed.
    # The error 'Unsupported quant method: gptq' from lmdeploy/pytorch/nn/linear/__init__.py
    # suggests that the PyTorch backend might strictly require AWQ or standard PyTorch.
    # However, Qwen-VL-Chat-Int4 is a GPTQ model.
    # If LMDeploy PyTorch backend DOES NOT support GPTQ, we might need to use TurboMind 
    # (which crashed) or convert the model.
    # BUT, let's try to see if passing 'gptq' explicitly helps (maybe it was auto-detected but path disabled).
    # actually, seeing the error source, it seems it fell into a check that raises if method is gptq.
    
    # Strategy:
    # 1. Try passing model_format='gptq' in config (unlikely to fix if hardcoded raise)
    # 2. If that fails, we might need to disable quantization and load as float16 (slow/heavy)? No, it's Int4 bits.
    # 3. USE TURBOMIND AGAIN but with the correct manual launcher?
    #    The previous "crash" was 'NoneType' attribute error in the PYTHON code, not C++ crash!
    #    The user *thought* it was a crash, but it was just the CLI bug!
    #    So, switching back to 'turbomind' (default) might actually WORK now that we fixed the launcher!
    
    print("Switching backend to 'turbomind' to support Int4/GPTQ properly.")
    print("(The previous 'crash' was likely the AttributeError we just fixed, not a true Engine crash)")

    # For TurboMind, we use TurbomindEngineConfig if needed, or just let it default.
    # serve() default backend is 'turbomind'.
    
    try:
        serve(
            model_path='Qwen/Qwen-VL-Chat-Int4',
            server_name='0.0.0.0',
            server_port=23333,
            backend='turbomind', # Trying TurboMind again!
            log_level='INFO',
            trust_remote_code=True,
            cache_max_entry_count=0.1 # Important for 8GB VRAM
        )
    except Exception as e:
        print(f"Server Startup Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
