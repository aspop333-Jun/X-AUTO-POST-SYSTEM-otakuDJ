#!/usr/bin/env python3
"""
3段階認識レベル詳細テスト (各画像の結果を詳細に出力)
"""
import requests
import json
import os
import base64
from openai import OpenAI
import time

# LMDeploy設定
LMDEPLOY_URL = "http://localhost:23334/v1"
client = OpenAI(api_key="dummy", base_url=LMDEPLOY_URL)

IMAGE_DIR = "Xpost-EX/pattern_images"

# 60項目の判定基準 (IDのみ使用)
CRITERIA_IDS = [
    "A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A12", "A13", "A14", "A15",
    "B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B10", "B11", "B12", "B13", "B14", "B15",
    "C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10", "C11", "C12", "C13", "C14", "C15",
    "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "D11", "D12", "D13", "D14", "D15"
]

# 60項目の質問文リスト作成（プロンプト用）
# kotaro_scoring.py から定義を借用したいが、簡易化のためここでは埋め込みか、既存ファイル読み込みが必要。
# 前回のスクリプトの定義を再利用。
CRITERIA_FULL = [
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
        "name": "Level 1: 70%増し (Extremely Strict)",
        "temperature": 0.05,
        "prompt_prefix": """【厳格判定モード】
あなたは非常に厳格な審査員です。
各項目について「100%確実に該当する」場合のみ1としてください。
・迷ったら0
・少しでも曖昧なら0
・自信がないなら0
デフォルトは全て0です。明確な証拠がある項目だけ1にしてください。"""
    },
    2: {
        "name": "Level 2: 20%増し (Moderately Strict)",
        "temperature": 0.1,
        "prompt_prefix": """【厳しめ判定モード】
あなたは厳しめの審査員です。
各項目について、該当するか慎重に判断してください。
・明らかに該当するなら1
・どちらとも言えない場合は0
誤検出（False Positive）を避けることを優先してください。"""
    },
    3: {
        "name": "Level 3: 50%増し (Very Strict)",
        "temperature": 0.08,
        "prompt_prefix": """【高精度判定モード】
あなたは精度の高い審査員です。
各項目について、客観的な事実に基づいて1か0を判定してください。
「なんとなくそう見える」程度では1にしないでください。
明確な根拠が必要です。"""
    }
}

def analyze_image(image_path: str, level: int):
    """指定レベルで画像を分析"""
    config = LEVEL_CONFIGS[level]
    
    with open(image_path, "rb") as f:
        b64_img = base64.b64encode(f.read()).decode("utf-8")
    
    questions = [f"{c['id']}: {c['question']}" for c in CRITERIA_FULL]
    criteria_list = "\n".join(questions)
    
    system_prompt = config["prompt_prefix"]
    
    user_prompt = f"""以下の60項目で画像を判定し、JSON形式で出力してください。
該当する場合は1、しない場合は0です。
余計な解説は不要です。

--- 判定項目 ---
{criteria_list}

--- 出力例 ---
{{
  "criteria": {{
    "A01": 0,
    "A02": 1,
    ...
  }}
}}
"""
    
    start_time = time.time()
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
            max_tokens=1500  # JSONが長いので少し増やす
        )
        
        duration = time.time() - start_time
        content = completion.choices[0].message.content
        clean_content = content.replace("```json", "").replace("```", "").strip()
        
        try:
            result = json.loads(clean_content)
            criteria = result.get("criteria", {})
            detected_list = [k for k, v in criteria.items() if v == 1]
            return {
                "success": True,
                "detected_count": len(detected_list),
                "detected_items": detected_list,
                "duration": duration,
                "raw_preview": clean_content[:50] + "..."
            }
        except json.JSONDecodeError:
             return {
                "success": False,
                "error": "JSON Parse Error",
                "raw_content": content,
                "duration": duration
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "duration": time.time() - start_time
        }

def main():
    print("# 🐯 Kotaro VLM 3段階詳細テスト結果\n")
    print(f"日時: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    images = [f"pattern_{i:02d}.png" for i in range(1, 6)]
    
    for img_file in images:
        full_path = os.path.join(IMAGE_DIR, img_file)
        if not os.path.exists(full_path):
            print(f"⚠️ {img_file} not found")
            continue
            
        print(f"## 📸 画像: {img_file}")
        print("| Level | 設定 | 検出数 | 処理時間 | 詳細 |")
        print("|---|---|---|---|---|")
        
        for level in [1, 2, 3]:
            res = analyze_image(full_path, level)
            
            config_name = LEVEL_CONFIGS[level]['name'].split(":")[0] # Level 1 etc
            
            if res["success"]:
                count = res["detected_count"]
                # Display first 5 detected items as sample
                sample = ", ".join(res["detected_items"][:5])
                if len(res["detected_items"]) > 5:
                    sample += "..."
                
                print(f"| {config_name} | {LEVEL_CONFIGS[level]['name'].split('(')[1].strip(')')} | **{count}/60** | {res['duration']:.2f}s | {sample} |")
            else:
                err_msg = res.get("error", "Unknown Error")
                print(f"| {config_name} | Error | ❌ | {res.get('duration', 0):.2f}s | {err_msg} |")
        
        print("\n")

if __name__ == "__main__":
    main()
