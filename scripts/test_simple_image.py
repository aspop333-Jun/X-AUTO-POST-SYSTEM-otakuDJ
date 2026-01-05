from openai import OpenAI
import base64
import os

client = OpenAI(api_key="dummy", base_url="http://localhost:23334/v1")
IMAGE_PATH = "Xpost-EX/pattern_images/pattern_01.png"

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

try:
    print(f"Testing image: {IMAGE_PATH}...")
    if not os.path.exists(IMAGE_PATH):
        print("Image not found!")
        exit(1)
        
    base64_image = encode_image(IMAGE_PATH)
    
    response = client.chat.completions.create(
        model="Qwen2-VL-2B-Instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image in detail."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                ]
            }
        ],
        temperature=0.7,
        max_tokens=200
    )
    print("Response:", response.choices[0].message.content)
except Exception as e:
    print("Error:", e)
