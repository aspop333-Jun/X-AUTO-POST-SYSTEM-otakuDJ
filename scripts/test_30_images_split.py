#!/usr/bin/env python3
import os
import json
import base64
import time
import re
from openai import OpenAI

# LMDeploy setup
client = OpenAI(api_key="dummy", base_url="http://localhost:23334/v1")
IMAGE_DIR = "Xpost-EX/pattern_images"
RESULT_FILE = "Progress/scoring_progress_v461.json"
ERROR_LOG = "Progress/scoring_errors_v461.log"


CRITERIA_TEXT_A = [
    "A01: 正面を向いている", "A02: 全身が映っている", "A03: スタイル・曲線が美しい", "A04: 衣装が明るい色", "A05: 背景と馴染んでいる",
    "A06: ポーズが決まっている", "A07: 体のラインがきれい", "A08: 透明感がある", "A09: 視線がまっすぐ", "A10: 黒目が大きく見える",
    "A11: 衣装の完成度が高い", "A12: コスプレ・キャラ衣装", "A13: 複数人で映っている", "A14: チーム衣装・お揃い", "A15: 写真全体のバランスが良い"
]
CRITERIA_TEXT_B = [
    "B01: 笑顔である", "B02: にこっとしている", "B03: ピースサインをしている", "B04: 指ハートをしている", "B05: 手を振っている",
    "B06: 口角が上がっている", "B07: 目が笑っている", "B08: ふわっとした雰囲気", "B09: 何かを持っている", "B10: 頬が丸い",
    "B11: 衣装がピンク・パステル系", "B12: 小物・アクセサリーが可愛い", "B13: イベントで楽しそう", "B14: 動きのある仕草", "B15: 自然体"
]
CRITERIA_TEXT_C = [
    "C01: 表情が控えめ", "C02: 落ち着いた雰囲気", "C03: 大人っぽい", "C04: 衣装が黒・ダーク系", "C05: クールな視線",
    "C06: 余裕がある表情", "C07: プロっぽさがある", "C08: 決めポーズがバッチリ", "C09: 衣装とポーズの完成度高い", "C10: カッコいい系の衣装",
    "C11: キリッとした表情", "C12: 目力が強い", "C13: サーキット・レース背景", "C14: 衣装と表情のギャップ", "C15: 意外性がある"
]
CRITERIA_TEXT_D = [
    "D01: カメラとの距離が近い", "D02: 安心感がある表情", "D03: 目線が優しい", "D04: ほっとする雰囲気", "D05: 自然な笑顔",
    "D06: 話しかけてくれそう", "D07: イベント会場の雰囲気", "D08: 人混み・ブース背景", "D09: 思い出感がある", "D10: ふとした瞬間",
    "D11: 柔らかい雰囲気", "D12: さすが感・安定感", "D13: いつも通りの良さ", "D14: グループ・仲間感", "D15: 癒される"
]
CRITERIA_TEXT_E = [
    "E01: 親近感が強い", "E02: 距離感が近い", "E03: 友達感覚", "E04: リラックスしている", "E05: 楽しんでいる",
    "E06: 構えていない", "E07: 素の表情", "E08: 日常感がある", "E09: デートっぽい", "E10: 彼女感がある",
    "E11: 話しやすそう", "E12: 愛想が良い", "E13: 接しやすい", "E14: 壁がない", "E15: ずっと見ていられる"
]

def call_vlm(items, b64_img):
    item_str = "\n".join(items)
    prompt = f"Analyze the image checking these items:\n{item_str}\n\nReturn a valid JSON object where keys are the item IDs (e.g. \"A01\") and values are 1 if true, 0 if false.\nExample: {{\"A01\": 1, \"A02\": 0}}\nOutput JSON only."
    
    try:
        response = client.chat.completions.create(
            model="Qwen2-VL-2B-Instruct",
            messages=[
                {"role": "system", "content": "You are a helpful AI. Output valid JSON only."},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                ]}
            ],
            temperature=0.01,
            max_tokens=1024 
        )

        content = response.choices[0].message.content
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            return json.loads(match.group(0)) # Directly return the dict
    except Exception as e:
        print(f"Error: {e}")
    return {}

def main():
    if not os.path.exists("Progress"): os.makedirs("Progress")
    if os.path.exists(RESULT_FILE):
        with open(RESULT_FILE, "r", encoding="utf-8") as f:
            results = json.load(f)
    else:
        results = {}

    images = sorted([f for f in os.listdir(IMAGE_DIR) if f.endswith(('.png', '.jpg'))])
    
    for i, img in enumerate(images):
        if img in results and len(results[img]) > 50: # Check if full result exists
            print(f"[{i+1}/{len(images)}] {img} (Skipped)")
            continue
            
        print(f"[{i+1}/{len(images)}] {img} processing...", end="", flush=True)
        
        with open(os.path.join(IMAGE_DIR, img), "rb") as f:
            b64_img = base64.b64encode(f.read()).decode("utf-8")
            
        # Call 1: A & B
        res1 = call_vlm(CRITERIA_TEXT_A + CRITERIA_TEXT_B, b64_img)
        # Call 2: C & D & E
        res2 = call_vlm(CRITERIA_TEXT_C + CRITERIA_TEXT_D + CRITERIA_TEXT_E, b64_img)
        
        combined = {**res1, **res2}
        
        if len(combined) > 0:
            results[img] = combined
            print(f" DONE ({len(combined)} items)")
            with open(RESULT_FILE, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
        else:
            print(" FAIL")

if __name__ == "__main__":
    main()
