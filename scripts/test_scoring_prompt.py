
from openai import OpenAI
import base64
import os
import json
import re

client = OpenAI(api_key="dummy", base_url="http://localhost:23334/v1")
IMAGE_PATH = "Xpost-EX/pattern_images/pattern_01.png"

# Reduced criteria for loop testing
TEST_CRITERIA = [
    "A01: 正面を向いている",
    "A02: 全身が映っている",
    "A03: スタイル・曲線が美しい",
    "B01: 笑顔である",
    "B02: にこっとしている",
]

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def test_prompt(prompt_template):
    b64_img = encode_image(IMAGE_PATH)
    item_str = "\n".join(TEST_CRITERIA)
    prompt = prompt_template.format(item_str=item_str)
    
    print("-" * 20)
    print(f"Testing Prompt:\n{prompt[:100]}...\n")
    
    try:
        response = client.chat.completions.create(
            model="Qwen2-VL-2B-Instruct",
            messages=[
                {"role": "system", "content": "You are a helpful AI."},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                ]}
            ],
            temperature=0.01,
            max_tokens=500
        )
        content = response.choices[0].message.content
        print("Raw Output:")
        print(content)
        
        # Check JSON
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            print("Usage JSON Found:", match.group(0))
        else:
            print("No JSON found.")
            
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    p1 = """Analyze the image checking these items:
{item_str}

Return a valid JSON object where keys are the item IDs (e.g. "A01") and values are 1 if true, 0 if false.
Example: {{"A01": 1, "A02": 0}}
Output JSON only."""

    test_prompt(p1)
