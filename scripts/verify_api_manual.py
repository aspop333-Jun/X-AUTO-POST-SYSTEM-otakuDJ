import urllib.request
import urllib.error
import json
import base64
import os
import sys
import time

BASE_URL = "http://localhost:23334/v1"
# Use relative path assuming script is run from project root
IMG_PATH = "Xpost-EX/pattern_images/pattern_01.png"

if not os.path.exists(IMG_PATH):
    # Try absolute path fallback for Windows if relative fails (though running from root is best)
    IMG_PATH_WIN = r"c:\AI\APP\X-AUTO-POST-SYSTEM-otakuDJ\Xpost-EX\pattern_images\pattern_01.png"
    if os.path.exists(IMG_PATH_WIN):
        IMG_PATH = IMG_PATH_WIN
    else:
        # Try WSL path mapping
        IMG_PATH_WSL = "/mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/Xpost-EX/pattern_images/pattern_01.png"
        if os.path.exists(IMG_PATH_WSL):
            IMG_PATH = IMG_PATH_WSL

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    
    if data is not None:
        data_bytes = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    else:
        data_bytes = None
        
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except urllib.error.URLError as e:
        return None, str(e.reason)
    except Exception as e:
        return None, str(e)

def test_models():
    print(f"Testing {BASE_URL}/models ...", flush=True)
    status, result = make_request(f"{BASE_URL}/models")
    
    if status == 200:
        print("Models Result: OK", flush=True)
        # print("Models Available:", json.dumps(result, indent=2), flush=True)
        if 'data' in result and len(result['data']) > 0:
            mid = result['data'][0]['id']
            print(f"Model ID found: {mid}", flush=True)
            return mid
        print("No models found in data list.", flush=True)
        return None
    else:
        print(f"Models Error: {status} - {result}", flush=True)
        return None

def test_chat_completions(model_name):
    print(f"\nTesting {BASE_URL}/chat/completions (Text) with model '{model_name}'...", flush=True)
    payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": "Hello!"}
        ],
        "max_tokens": 10
    }
    
    status, result = make_request(f"{BASE_URL}/chat/completions", method="POST", data=payload)
    
    if status == 200:
        print("Text Chat Result: OK", flush=True)
        print("Response Content:", result['choices'][0]['message']['content'], flush=True)
        return True
    else:
        print(f"Text Chat Error: {status} - {result}", flush=True)
        return False

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def test_vision_completions(model_name, image_path):
    print(f"\nTesting {BASE_URL}/chat/completions (Vision) with {image_path}...", flush=True)
    if not os.path.exists(image_path):
        print(f"Image file not found: {image_path}", flush=True)
        return False
        
    print("Encoding image...", flush=True)
    try:
        base64_image = encode_image(image_path)
    except Exception as e:
        print(f"Failed to encode image: {e}", flush=True)
        return False
    
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 20
    }
    
    print("Sending Vision request...", flush=True)
    status, result = make_request(f"{BASE_URL}/chat/completions", method="POST", data=payload)
    
    if status == 200:
        print("Vision Chat Result: OK", flush=True)
        print("Response Content:", result['choices'][0]['message']['content'], flush=True)
        return True
    else:
        print(f"Vision Chat Error: {status} - {result}", flush=True)
        return False

def main():
    print("=== STARTING VERIFICATION (Port 23334) ===", flush=True)
    time.sleep(1)
    
    model_name = test_models()
    if not model_name:
        print("Could not retrieve model name.", flush=True)
        model_name = "Qwen/Qwen-VL-Chat-Int4"
        print(f"Falling back to: {model_name}", flush=True)

    time.sleep(1)
    if test_chat_completions(model_name):
        print("XXX_TEXT_PASS_XXX", flush=True)
    else:
        print("XXX_TEXT_FAIL_XXX", flush=True)

    time.sleep(1)
    # img_path already set in global
    if test_vision_completions(model_name, IMG_PATH):
        print("XXX_VISION_PASS_XXX", flush=True)
    else:
        print("XXX_VISION_FAIL_XXX", flush=True)
    
    print("=== END VERIFICATION ===", flush=True)

if __name__ == "__main__":
    main()
