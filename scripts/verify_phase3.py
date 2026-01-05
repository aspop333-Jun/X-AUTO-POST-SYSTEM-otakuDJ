import requests
import time
import sys
import os

URL = "http://localhost:8000/generate"
# Use absolute path for safety in Windows
IMG_PATH = r"c:\AI\APP\X-AUTO-POST-SYSTEM-otakuDJ\test_images\test.png"

def test_run(i):
    print(f"[{i+1}/10] Sending request...", end="", flush=True)
    start = time.time()
    try:
        with open(IMG_PATH, 'rb') as f:
            files = {'image': f}
            data = {'name': f'TestUser_{i}', 'count': 1}
            response = requests.post(URL, files=files, data=data, timeout=120)
            
        elapsed = time.time() - start
        
        if response.status_code == 200:
            res_json = response.json()
            if res_json.get("success"):
                ptrn = res_json.get("pattern", {}).get("name")
                print(f" OK ({elapsed:.1f}s) - Pattern: {ptrn}")
                return True
            else:
                print(f" FAIL (API returned success=False) - {res_json.get('error')}")
                return False
        else:
            print(f" FAIL (HTTP {response.status_code})")
            print(response.text[:200])
            return False
            
    except Exception as e:
        print(f" FAIL (Exception: {e})")
        return False

def main():
    print("=== Phase 3: 10-Shot Verification ===")
    print(f"Target: {URL}")
    print(f"Image: {IMG_PATH}")
    
    if not os.path.exists(IMG_PATH):
        print("Error: Test image not found.")
        sys.exit(1)
        
    success_count = 0
    for i in range(10):
        if test_run(i):
            success_count += 1
        time.sleep(1)
        
    print("-" * 30)
    print(f"Result: {success_count}/10 Passed")
    
    if success_count == 10:
        print("🎉 All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
