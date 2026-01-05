from openai import OpenAI

client = OpenAI(api_key="dummy", base_url="http://localhost:23334/v1")

try:
    print("Testing text-only...")
    response = client.chat.completions.create(
        model="Qwen2-VL-2B-Instruct",
        messages=[{"role": "user", "content": "Hello, are you working?"}],
        temperature=0.7,
        max_tokens=50
    )
    print("Response:", response.choices[0].message.content)
except Exception as e:
    print("Error:", e)
