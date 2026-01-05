import requests
import os
import sys

URL = "http://localhost:8000/generate"
IMG_PATH = r"c:\AI\APP\X-AUTO-POST-SYSTEM-otakuDJ\test_images\test.png" # Windows path for requests

if not os.path.exists(IMG_PATH):
    # Try creating dummy if not exists for testing logic (though real image preferred)
    print(f"Image not found: {IMG_PATH}")
    sys.exit(1)

def test_api():
    print(f"Testing API at {URL}...")
    files = {'image': open(IMG_PATH, 'rb')}
    data = {'name': 'TestUser', 'count': 1}
    
    try:
        response = requests.post(URL, files=files, data=data)
        if response.status_code == 200:
            print("Status: 200 OK")
            print("Response:", response.json())
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Connection Failed: {e}")

if __name__ == "__main__":
    test_api()
