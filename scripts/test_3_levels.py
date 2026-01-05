#!/usr/bin/env python3
"""
3段階認識レベルテスト
- Level 1: 70%増し（最も厳格）
- Level 2: 20%増し（少し厳格）
- Level 3: 50%増し（中程度厳格）
"""
import requests
import json
import os
from openai import OpenAI
import base64

# LMDeploy設定
LMDEPLOY_URL = "http://localhost:23334/v1"
client = OpenAI(api_key="dummy", base_url=LMDEPLOY_URL)

IMAGE_DIR = "Xpost-EX/pattern_images"

# 60項目の判定基準
CRITERIA = [
    {"id": "A01", "question": "正面を向いている"},
    {"id": "A02", "question": "全身が映っている"},
    {"id": "A03", "question": "スタイル・曲線が美しい"},
    {"id": "A04", "question": "衣装が明るい色（白/青系）"},
    {"id": "A05", "question": "背景と馴染んでいる"},
    {"id": "A06", "question": "ポーズが決まっている"},
    {"id": "A07", "question": "体のラインがきれい"},
    {"id": "A08", "question": "透明感がある"},
    {"id": "A09", "question": "視線がまっすぐ"},
    {"id": "A10", "question": "黒目が大きく見える"},
    {"id": "A11", "question": "衣装の完成度が高い"},
    {"id": "A12", "question": "コスプレ・キャラ衣装"},
    {"id": "A13", "question": "複数人で映っている"},
    {"id": "A14", "question": "チーム衣装・お揃い"},
    {"id": "A15", "question": "写真全体のバランスが良い"},
    {"id": "B01", "question": "笑顔である"},
    {"id": "B02", "question": "にこっとしている"},
    {"id": "B03", "question": "ピースサイン"},
    {"id": "B04", "question": "指ハート"},
    {"id": "B05", "question": "手を振っている"},
    {"id": "B06", "question": "口角が上がっている"},
    {"id": "B07", "question": "目が笑っている"},
    {"id": "B08", "question": "ふわっとした雰囲気"},
    {"id": "B09", "question": "何かを持っている"},
    {"id": "B10", "question": "頬が丸い・柔らかそう"},
    {"id": "B11", "question": "衣装がピンク・パステル系"},
    {"id": "B12", "question": "小物・アクセサリーが可愛い"},
    {"id": "B13", "question": "イベントで楽しそう"},
    {"id": "B14", "question": "動きのある仕草"},
    {"id": "B15", "question": "自然体"},
    {"id": "C01", "question": "表情が控えめ"},
    {"id": "C02", "question": "落ち着いた雰囲気"},
    {"id": "C03", "question": "大人っぽい"},
    {"id": "C04", "question": "衣装が黒・ダーク系"},
    {"id": "C05", "question": "クールな視線"},
    {"id": "C06", "question": "余裕がある表情"},
    {"id": "C07", "question": "プロっぽさ"},
    {"id": "C08", "question": "決めポーズがバッチリ"},
    {"id": "C09", "question": "衣装とポーズの完成度高い"},
    {"id": "C10", "question": "カッコいい系の衣装"},
    {"id": "C11", "question": "キリッとした表情"},
    {"id": "C12", "question": "目力が強い"},
    {"id": "C13", "question": "サーキット・レース背景"},
    {"id": "C14", "question": "衣装と表情のギャップ"},
    {"id": "C15", "question": "意外性がある"},
    {"id": "D01", "question": "カメラとの距離が近い"},
    {"id": "D02", "question": "安心感がある表情"},
    {"id": "D03", "question": "目線が優しい"},
    {"id": "D04", "question": "ほっとする雰囲気"},
    {"id": "D05", "question": "自然な笑顔"},
    {"id": "D06", "question": "話しかけてくれそう"},
    {"id": "D07", "question": "イベント会場の雰囲気"},
    {"id": "D08", "question": "人混み・ブース背景"},
    {"id": "D09", "question": "思い出感がある"},
    {"id": "D10", "question": "ふとした瞬間"},
    {"id": "D11", "question": "柔らかい雰囲気"},
    {"id": "D12", "question": "さすが感・安定感"},
    {"id": "D13", "question": "いつも通りの良さ"},
    {"id": "D14", "question": "グループ・仲間感"},
    {"id": "D15", "question": "癒される"},
]

# 3段階のプロンプト設定
LEVEL_CONFIGS = {
    1: {
        "name": "70%増し（最厳格）",
        "temperature": 0.05,
        "prompt_prefix": """【厳格判定モード】
あなたは非常に厳格な画像認識AIです。
各項目について「明確かつ疑いなく該当する」場合のみ1としてください。
少しでも曖昧な場合、部分的にしか該当しない場合は0としてください。
デフォルトは0です。明確な証拠がある場合のみ1にしてください。"""
    },
    2: {
        "name": "20%増し（やや厳格）",
        "temperature": 0.1,
        "prompt_prefix": """【標準判定モード】
あなたは画像認識AIです。
各項目について、該当する場合は1、該当しない場合は0で判定してください。
判断が微妙な場合は、より慎重に0を選んでください。"""
    },
    3: {
        "name": "50%増し（中厳格）",
        "temperature": 0.08,
        "prompt_prefix": """【バランス判定モード】
あなたは画像認識AIです。
各項目について、明らかに該当する場合は1、明らかに該当しない場合は0です。
曖昧な場合は、画像全体の印象から判断し、どちらかに決めてください。
ただし、確信度が低い場合は0を優先してください。"""
    }
}

def test_image_with_level(image_path: str, level: int):
    """指定レベルで画像をテスト"""
    config = LEVEL_CONFIGS[level]
    
    with open(image_path, "rb") as f:
        b64_img = base64.b64encode(f.read()).decode("utf-8")
    
    questions = [f"{c['id']}: {c['question']}" for c in CRITERIA]
    criteria_list = "\n".join(questions)
    
    system_prompt = config["prompt_prefix"]
    
    user_prompt = f"""この写真を以下の60項目で判定し、結果をJSONで出力してください。
該当する場合は1、しない場合は0です。

--- 判定項目 ---
{criteria_list}

--- 出力形式 ---
{{
  "criteria": {{
    "A01": 0,
    "A02": 0,
    ...
  }}
}}
"""
    
    try:
        completion = client.chat.completions.create(
            model="Qwen2-VL-2B-Instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                ]}
            ],
            temperature=config["temperature"],
            max_tokens=1024
        )
        
        content = completion.choices[0].message.content
        clean_content = content.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean_content)
        
        criteria = result.get("criteria", {})
        detected = sum(1 for v in criteria.values() if v == 1)
        
        return detected, criteria
        
    except Exception as e:
        return -1, {"error": str(e)}

def main():
    print("=" * 70)
    print("🐯 Kotaro VLM 3段階認識レベルテスト")
    print("=" * 70)
    
    results = {}
    
    for level in [1, 2, 3]:
        config = LEVEL_CONFIGS[level]
        print(f"\n{'='*70}")
        print(f"📊 Level {level}: {config['name']}")
        print(f"   Temperature: {config['temperature']}")
        print("=" * 70)
        
        level_results = []
        
        for i in range(1, 6):
            image_path = f"{IMAGE_DIR}/pattern_{i:02d}.png"
            if not os.path.exists(image_path):
                print(f"⚠️ {image_path} not found")
                continue
            
            print(f"   Testing pattern_{i:02d}.png...", end=" ", flush=True)
            detected, criteria = test_image_with_level(image_path, level)
            
            if detected >= 0:
                print(f"検出: {detected}/60")
                level_results.append(detected)
            else:
                print(f"Error: {criteria.get('error', 'Unknown')}")
                level_results.append(-1)
        
        results[level] = level_results
        avg = sum(r for r in level_results if r >= 0) / max(1, len([r for r in level_results if r >= 0]))
        print(f"\n   平均検出数: {avg:.1f}/60")
    
    # サマリー
    print("\n" + "=" * 70)
    print("📋 最終サマリー")
    print("=" * 70)
    print(f"{'画像':<15} | {'Level1(70%↑)':<12} | {'Level2(20%↑)':<12} | {'Level3(50%↑)':<12}")
    print("-" * 70)
    
    for i in range(5):
        img_name = f"pattern_{i+1:02d}.png"
        l1 = results.get(1, [0]*5)[i]
        l2 = results.get(2, [0]*5)[i]
        l3 = results.get(3, [0]*5)[i]
        print(f"{img_name:<15} | {l1:>10}/60 | {l2:>10}/60 | {l3:>10}/60")
    
    print("-" * 70)
    for level in [1, 2, 3]:
        valid = [r for r in results.get(level, []) if r >= 0]
        avg = sum(valid) / max(1, len(valid))
        print(f"Level {level} 平均: {avg:.1f}/60")

if __name__ == "__main__":
    main()
