#!/usr/bin/env python3
import os
import json
import base64
import requests
import re
import time
from openai import OpenAI

# LMDeploy setup
client = OpenAI(api_key="dummy", base_url="http://localhost:23334/v1")
IMAGE_DIR = "Xpost-EX/pattern_images"
RESULT_FILE = "Progress/scoring_progress.json"
ERROR_LOG = "Progress/scoring_errors.log"

# Criteria (Simplified for brevity in script, but full list used in prompt)
# Note: I will read the full criteria from the previous script or define it here.
# For safety, I'll include the full list to ensure valid testing.

CRITERIA_LIST = [
    # A
    "A01: 口元が笑い切っていない余白がある", "A02: 目元が少しだけ考え事している", "A03: 笑顔と真顔の中間にいる",
    "A04: 視線がカメラに固定され切っていない", "A05: 表情より空気（雰囲気）が先に来る", "A06: 目の温度が低めで、余韻が残る",
    "A07: ふっと息を抜いた瞬間っぽい", "A08: 喜びより「静かな満足」が出ている", "A09: 感情の言い切りがない（曖昧さが魅力）",
    "A10: 口角の上げ方が控えめで上品", "A11: 頬の力が抜けている", "A12: 表情が固定ポーズより自然寄り",
    "A13: 目線が見せるよりそこにいる", "A14: カメラを意識しすぎない", "A15: 見返した時に深くなるタイプの顔",
    # B
    "B01: 背景情報が強く、目が散る", "B02: 小物（傘/看板/配布物）が視線を引く", "B03: 人混み・ブース背景が主張する",
    "B04: 画面内に主役が複数いる", "B05: 立ち位置がセンターではない", "B06: 余白が多く、状況が語る",
    "B07: 明暗差で視線が迷う", "B08: カラフルな背景で焦点が揺れる", "B09: 被写体が少し遠く、状況が勝つ",
    "B10: 見せたい要素（衣装/ロゴ/番号）が多い", "B11: 背景の線（柵/看板）が強い", "B12: 視線誘導の矢印が複数ある",
    "B13: 構図の情報量が多い", "B14: 視線が被写体→背景に流れる", "B15: 一枚で説明が必要なタイプ",
    # C
    "C01: 目は強いが、口元は柔らかい", "C02: 口は笑ってるが、目は冷静", "C03: 目線に攻めがある",
    "C04: ポーズがキャラクターを背負っている", "C05: 立ち姿が堂々", "C06: 表情よりポーズが主張する",
    "C07: 衣装・演出が強く役が前に出る", "C08: 角度（顎/首）がクール寄り", "C09: 余裕のある見せ方をしている",
    "C10: 美人寄りの緊張感がある", "C11: 視線が勝ちに来てる", "C12: 色気が静かに出ている",
    "C13: 無邪気より、計算された可愛さ", "C14: かわいいのに、どこか強い", "C15: ギャップ（甘さ×鋭さ）が同居",
    # D
    "D01: 姿勢に芯がある（緊張）", "D02: 肩/首の力が抜けている（緩和）", "D03: 安定した笑顔で安心感がある",
    "D04: 目線が落ち着いている", "D05: 近寄りやすいのに品がある", "D06: ハッとする緊張感がある",
    "D07: 慣れの余裕がある", "D08: 大人っぽい温度感", "D09: 緊張感があるのに柔らかい",
    "D10: 柔らかいのに芯がある", "D11: 色気があるが嫌味がない", "D12: さすが感・安定感",
    "D13: その場を支配する空気がある", "D14: 余裕があるのに距離は近い", "D15: 見る側が落ち着く",
    # E
    "E01: カメラとの距離が近い", "E02: 安心感がある表情", "E03: 目線が優しい",
    "E04: ほっとする雰囲気", "E05: 自然な笑顔", "E06: 話しかけてくれそう",
    "E07: イベント会場の雰囲気", "E08: 人混み・ブース背景", "E09: 思い出感がある",
    "E10: ふとした瞬間", "E11: 柔らかい雰囲気", "E12: さすが感・安定感",
    "E13: いつも通りの良さ", "E14: グループ・仲間感", "E15: 癒される",
    # Pose
    "POSE01: 体斜め・顔正面のポーズ", "POSE02: 完全正面ポーズ", "POSE03: 横向きクールポーズ",
    "POSE04: 強い衣装・演出が目立つ", "POSE05: 指差しや敬礼などのアクション", "POSE06: 小物が目立つ"
]

def analyze_image(image_path):
    with open(image_path, "rb") as f:
        b64_img = base64.b64encode(f.read()).decode("utf-8")
        
    prompt = "Analyze this image and determine if each criteria applies (1 for yes, 0 for no).\n\nCriteria:\n" + "\n".join(CRITERIA_LIST) + "\n\nOutput ONLY a JSON object like: {\"criteria\": {\"A01\": 0, ...}}"
    
    retries = 2
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model="Qwen2-VL-2B-Instruct",
                messages=[
                    {"role": "system", "content": "You are an AI assistant. Output ONLY valid JSON."},
                    {"role": "user", "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                    ]}
                ],
                temperature=0.05,
                max_tokens=2048
            )
            content = response.choices[0].message.content
            
            # JSON Extraction
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                payload = match.group(0)
                try:
                    data = json.loads(payload)
                    return data.get("criteria", {})
                except json.JSONDecodeError:
                    pass # Retry
            
            # If fail, log
            with open(ERROR_LOG, "a", encoding="utf-8") as elf:
                elf.write(f"--- FAIL {image_path} Attempt {attempt} ---\n{content}\n\n")

        except Exception as e:
            with open(ERROR_LOG, "a", encoding="utf-8") as elf:
                elf.write(f"--- ERROR {image_path} Attempt {attempt} ---\n{str(e)}\n\n")
            time.sleep(1)
            
    return {}

def main():
    if not os.path.exists("Progress"): os.makedirs("Progress")
    if os.path.exists(RESULT_FILE):
        with open(RESULT_FILE, "r", encoding="utf-8") as f:
            results = json.load(f)
    else:
        results = {}

    images = sorted([f for f in os.listdir(IMAGE_DIR) if f.endswith(('.png', '.jpg'))])
    
    print(f"Total images: {len(images)}")
    
    for i, img in enumerate(images):
        if img in results and results[img]:
            print(f"[{i+1}/{len(images)}] {img} (Skipped)")
            continue
            
        print(f"[{i+1}/{len(images)}] {img} processing...", end="", flush=True)
        criteria = analyze_image(os.path.join(IMAGE_DIR, img))
        
        if criteria:
            results[img] = criteria
            print(" DONE")
            # Save progress incrementally
            with open(RESULT_FILE, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
        else:
            print(" FAIL")

if __name__ == "__main__":
    main()
