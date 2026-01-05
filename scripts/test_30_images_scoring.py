#!/usr/bin/env python3
"""
30枚画像スコアリングテスト
- 12パターン判定
- A~Eスコア表示
- パターン別累計と分布解析
"""
import os
import json
import base64
from collections import defaultdict
from openai import OpenAI

# LMDeploy設定
LMDEPLOY_URL = "http://localhost:23334/v1"
client = OpenAI(api_key="dummy", base_url=LMDEPLOY_URL)

IMAGE_DIR = "Xpost-EX/pattern_images"

# 60項目の判定基準（A01-A15, B01-B15, C01-C15, D01-D15）
CRITERIA = [
    # A: 表情の確定遅延（余韻・揺らぎ）
    {"id": "A01", "question": "口元が笑い切っていない余白がある"},
    {"id": "A02", "question": "目元が少しだけ考え事している"},
    {"id": "A03", "question": "笑顔と真顔の中間にいる"},
    {"id": "A04", "question": "視線がカメラに固定され切っていない"},
    {"id": "A05", "question": "表情より空気（雰囲気）が先に来る"},
    {"id": "A06", "question": "目の温度が低めで、余韻が残る"},
    {"id": "A07", "question": "ふっと息を抜いた瞬間っぽい"},
    {"id": "A08", "question": "喜びより「静かな満足」が出ている"},
    {"id": "A09", "question": "感情の言い切りがない（曖昧さが魅力）"},
    {"id": "A10", "question": "口角の上げ方が控えめで上品"},
    {"id": "A11", "question": "頬の力が抜けている"},
    {"id": "A12", "question": "表情が固定ポーズより自然寄り"},
    {"id": "A13", "question": "目線が見せるよりそこにいる"},
    {"id": "A14", "question": "カメラを意識しすぎない"},
    {"id": "A15", "question": "見返した時に深くなるタイプの顔"},
    # B: 視線の意図未決定（構図の迷い）
    {"id": "B01", "question": "背景情報が強く、目が散る"},
    {"id": "B02", "question": "小物（傘/看板/配布物）が視線を引く"},
    {"id": "B03", "question": "人混み・ブース背景が主張する"},
    {"id": "B04", "question": "画面内に主役が複数いる"},
    {"id": "B05", "question": "立ち位置がセンターではない"},
    {"id": "B06", "question": "余白が多く、状況が語る"},
    {"id": "B07", "question": "明暗差で視線が迷う"},
    {"id": "B08", "question": "カラフルな背景で焦点が揺れる"},
    {"id": "B09", "question": "被写体が少し遠く、状況が勝つ"},
    {"id": "B10", "question": "見せたい要素（衣装/ロゴ/番号）が多い"},
    {"id": "B11", "question": "背景の線（柵/看板）が強い"},
    {"id": "B12", "question": "視線誘導の矢印が複数ある"},
    {"id": "B13", "question": "構図の情報量が多い"},
    {"id": "B14", "question": "視線が被写体→背景に流れる"},
    {"id": "B15", "question": "一枚で説明が必要なタイプ"},
    # C: 顔パーツ感情非同期（二面性・クール）
    {"id": "C01", "question": "目は強いが、口元は柔らかい"},
    {"id": "C02", "question": "口は笑ってるが、目は冷静"},
    {"id": "C03", "question": "目線に攻めがある"},
    {"id": "C04", "question": "ポーズがキャラクターを背負っている"},
    {"id": "C05", "question": "立ち姿が堂々"},
    {"id": "C06", "question": "表情よりポーズが主張する"},
    {"id": "C07", "question": "衣装・演出が強く役が前に出る"},
    {"id": "C08", "question": "角度（顎/首）がクール寄り"},
    {"id": "C09", "question": "余裕のある見せ方をしている"},
    {"id": "C10", "question": "美人寄りの緊張感がある"},
    {"id": "C11", "question": "視線が勝ちに来てる"},
    {"id": "C12", "question": "色気が静かに出ている"},
    {"id": "C13", "question": "無邪気より、計算された可愛さ"},
    {"id": "C14", "question": "かわいいのに、どこか強い"},
    {"id": "C15", "question": "ギャップ（甘さ×鋭さ）が同居"},
    # D: 緊張と緩和の同時存在（温度）
    {"id": "D01", "question": "姿勢に芯がある（緊張）"},
    {"id": "D02", "question": "肩/首の力が抜けている（緩和）"},
    {"id": "D03", "question": "安定した笑顔で安心感がある"},
    {"id": "D04", "question": "目線が落ち着いている"},
    {"id": "D05", "question": "近寄りやすいのに品がある"},
    {"id": "D06", "question": "ハッとする緊張感がある"},
    {"id": "D07", "question": "慣れの余裕がある"},
    {"id": "D08", "question": "大人っぽい温度感"},
    {"id": "D09", "question": "緊張感があるのに柔らかい"},
    {"id": "D10", "question": "柔らかいのに芯がある"},
    {"id": "D11", "question": "色気があるが嫌味がない"},
    {"id": "D12", "question": "さすが感・安定感"},
    {"id": "D13", "question": "その場を支配する空気がある"},
    {"id": "D14", "question": "余裕があるのに距離は近い"},
    {"id": "D15", "question": "見る側が落ち着く"},
]

# E: 親近感（フラグベース）
E_FLAGS = [
    {"id": "E01", "question": "カメラとの距離が近い", "flag": "close_dist"},
    {"id": "E02", "question": "安心感がある表情"},
    {"id": "E03", "question": "目線が優しい"},
    {"id": "E04", "question": "ほっとする雰囲気"},
    {"id": "E05", "question": "自然な笑顔"},
    {"id": "E06", "question": "話しかけてくれそう", "flag": "talk_to"},
    {"id": "E07", "question": "イベント会場の雰囲気", "flag": "crowd_venue"},
    {"id": "E08", "question": "人混み・ブース背景"},
    {"id": "E09", "question": "思い出感がある", "flag": "nostalgic"},
    {"id": "E10", "question": "ふとした瞬間", "flag": "casual_moment"},
    {"id": "E11", "question": "柔らかい雰囲気"},
    {"id": "E12", "question": "さすが感・安定感"},
    {"id": "E13", "question": "いつも通りの良さ"},
    {"id": "E14", "question": "グループ・仲間感", "flag": "group_feeling"},
    {"id": "E15", "question": "癒される"},
]

# Pose Flags (Additional detection)
POSE_FLAGS = [
    {"id": "POSE01", "question": "体斜め・顔正面のポーズ", "flag": "pose_safe_theory"},
    {"id": "POSE02", "question": "完全正面ポーズ", "flag": "pose_front_true"},
    {"id": "POSE03", "question": "横向きクールポーズ", "flag": "pose_side_cool"},
    {"id": "POSE04", "question": "強い衣装・演出が目立つ", "flag": "costume_strong"},
    {"id": "POSE05", "question": "指差しや敬礼などのアクション", "flag": "act_point_or_salute"},
    {"id": "POSE06", "question": "小物が目立つ", "flag": "prop_strong"},
]

# Pattern Definitions
PATTERN_NAMES = {
    "P01": "余韻 (Soft)",
    "P02": "余韻 (Perform)",
    "P03": "構図 (Scene)",
    "P04": "構図 (Complex)",
    "P05": "クール (Cool)",
    "P06": "キャラ (Character)",
    "P07": "対比 (Group)",
    "P08": "温度 (Bright)",
    "P09": "温度 (Soft)",
    "P10": "温度 (Action)",
    "P11": "フラット (Close)",
    "P12": "フラット (Scene)",
}


def analyze_image(image_path: str):
    """画像をVLMで分析し、各項目の判定結果を取得"""
    with open(image_path, "rb") as f:
        b64_img = base64.b64encode(f.read()).decode("utf-8")
    
    all_questions = CRITERIA + E_FLAGS + POSE_FLAGS
    questions = [f"{c['id']}: {c['question']}" for c in all_questions]
    criteria_list = "\n".join(questions)
    
    user_prompt = f"""この写真を以下の項目で判定し、結果をJSONで出力してください。
該当する場合は1、しない場合は0です。

--- 判定項目 ---
{criteria_list}

--- 出力形式 ---
{{"criteria": {{"A01": 0, "A02": 0, ..., "E15": 0, "POSE01": 0, ...}}}}
"""
    
    try:
        completion = client.chat.completions.create(
            model="Qwen2-VL-2B-Instruct",
            messages=[
                {"role": "system", "content": "あなたは画像認識AIです。出力は必ずJSON形式のみにしてください。"},
                {"role": "user", "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                ]}
            ],
            temperature=0.1,
            max_tokens=2048
        )
        
        content = completion.choices[0].message.content
        # Debug output
        # print(f"DEBUG_RAW_CONTENT: {content[:100]}...")

        # Robust JSON extraction
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            clean_content = json_match.group(0)
            result = json.loads(clean_content)
            return result.get("criteria", {})
        else:
            # Fallback try cleaning
            clean_content = content.replace("```json", "").replace("```", "").strip()
            result = json.loads(clean_content)
            return result.get("criteria", {})
        
    except Exception as e:
        print(f"Error analyzing {image_path}: {e}")
        print(f"Failed Content: {content}")
        return {}


def calculate_scores(criteria: dict):
    """A~Eスコアを算出（0-5に正規化）"""
    scores = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}
    
    for i in range(1, 16):
        key = f"A{i:02d}"
        if criteria.get(key, 0) == 1:
            scores["A"] += 1
            
    for i in range(1, 16):
        key = f"B{i:02d}"
        if criteria.get(key, 0) == 1:
            scores["B"] += 1
            
    for i in range(1, 16):
        key = f"C{i:02d}"
        if criteria.get(key, 0) == 1:
            scores["C"] += 1
            
    for i in range(1, 16):
        key = f"D{i:02d}"
        if criteria.get(key, 0) == 1:
            scores["D"] += 1
            
    for i in range(1, 16):
        key = f"E{i:02d}"
        if criteria.get(key, 0) == 1:
            scores["E"] += 1
    
    # 正規化 (15点満点 → 5点)
    for k in scores:
        scores[k] = round(scores[k] / 3.0, 1)
        scores[k] = min(5.0, scores[k])
    
    return scores


def extract_flags(criteria: dict):
    """フラグを抽出"""
    flags = {}
    
    # E flags
    for item in E_FLAGS:
        if "flag" in item:
            flags[item["flag"]] = criteria.get(item["id"], 0) == 1
    
    # Pose flags
    for item in POSE_FLAGS:
        if "flag" in item:
            flags[item["flag"]] = criteria.get(item["id"], 0) == 1
    
    return flags


def decide_pattern(scores: dict, flags: dict):
    """パターン決定（V4.6.1ロジック）"""
    A, B, C, D, E = scores["A"], scores["B"], scores["C"], scores["D"], scores["E"]
    
    # Flag aliases
    f_crowd = flags.get("crowd_venue", False)
    f_group = flags.get("group_feeling", False)
    f_prop = flags.get("prop_strong", False)
    f_costume = flags.get("costume_strong", False)
    f_action = flags.get("act_point_or_salute", False)
    f_casual = flags.get("casual_moment", False)
    f_pose_safe = flags.get("pose_safe_theory", False)
    f_pose_front = flags.get("pose_front_true", False)
    f_pose_side = flags.get("pose_side_cool", False)
    f_talk = flags.get("talk_to", False)
    f_close = flags.get("close_dist", False)
    
    # Sort for Sub4
    candidates = [("A", A), ("B", B), ("C", C), ("D", D)]
    prio = {"A": 0, "B": 1, "C": 2, "D": 3}
    ranked = sorted(candidates, key=lambda x: (-x[1], prio[x[0]]))
    
    top1_key = ranked[0][0]
    top1_score = ranked[0][1]
    top2_key = ranked[1][0]
    top2_score = ranked[1][1]
    
    sub4_str = ">".join([item[0] for item in ranked])
    
    # Main Determination
    main_key = top1_key
    
    # Flat Escape
    if top1_score <= 2.0:
        main_key = "None"
    else:
        # Close Game Logic (top1 - top2 <= 0.3)
        if (top1_score - top2_score) <= 0.3:
            if f_costume:
                main_key = "C"
            elif f_action:
                main_key = "D"
            elif f_casual:
                main_key = "A"
            elif f_crowd or f_prop or f_group:
                main_key = "B"
    
    pattern_id = "P11"
    
    # Pattern Branching
    if main_key == "None":
        if B >= 2.0 or f_crowd or f_prop or f_group:
            pattern_id = "P12"
        else:
            pattern_id = "P11"
            
    elif main_key == "A":
        # Strong Intimacy
        intimacy_strong = f_pose_front or (f_talk and f_close and not f_pose_safe)
        
        if f_talk and f_casual and intimacy_strong:
            pattern_id = "P01"
        else:
            explicit_perform = (f_costume or f_action or f_pose_side)
            weak_gesture_safe = (f_pose_safe and (not f_talk or not f_casual))
            
            if explicit_perform or weak_gesture_safe:
                pattern_id = "P02"
            else:
                scatter_to_p03 = (
                    f_pose_safe and f_talk and f_casual and
                    not intimacy_strong and
                    not f_crowd and not f_group and
                    not f_costume and not f_action and
                    B >= 4.2 and (A - B) <= 0.6
                )
                
                if scatter_to_p03:
                    pattern_id = "P03"
                else:
                    pattern_id = "P01"
            
    elif main_key == "B":
        if f_crowd or f_group:
            pattern_id = "P03"
        elif f_prop:
            pattern_id = "P04"
        elif (B - A) <= 0.5:
            pattern_id = "P03"
        else:
            pattern_id = "P04"
            
    elif main_key == "C":
        if f_group:
            pattern_id = "P07"
        elif f_costume:
            pattern_id = "P06"
        else:
            pattern_id = "P05"
            
    elif main_key == "D":
        if f_action:
            pattern_id = "P10"
        elif A >= B:
            pattern_id = "P09"
        else:
            pattern_id = "P08"
    
    return {
        "pattern_id": pattern_id,
        "main": main_key,
        "sub4": sub4_str,
        "scores": scores,
        "flags": [k for k, v in flags.items() if v]
    }


def main():
    print("=" * 80)
    print("🐯 Kotaro Scoring V4.6.1 - 30枚画像テスト")
    print("=" * 80)
    
    # 画像リストを取得
    images = []
    for f in sorted(os.listdir(IMAGE_DIR)):
        if f.endswith(('.png', '.jpg', '.jpeg')):
            images.append(f)
    
    print(f"\n📷 発見した画像: {len(images)}枚\n")
    
    results = []
    pattern_counts = defaultdict(int)
    
    for i, img_name in enumerate(images, 1):
        img_path = os.path.join(IMAGE_DIR, img_name)
        print(f"[{i:2d}/{len(images)}] {img_name}...", end=" ", flush=True)
        
        criteria = analyze_image(img_path)
        if not criteria:
            print("ERROR")
            continue
        
        scores = calculate_scores(criteria)
        flags = extract_flags(criteria)
        pattern_result = decide_pattern(scores, flags)
        
        pattern_id = pattern_result["pattern_id"]
        pattern_counts[pattern_id] += 1
        
        results.append({
            "image": img_name,
            "pattern": pattern_id,
            "main": pattern_result["main"],
            "sub4": pattern_result["sub4"],
            "A": scores["A"],
            "B": scores["B"],
            "C": scores["C"],
            "D": scores["D"],
            "E": scores["E"],
            "flags": pattern_result["flags"]
        })
        
        print(f"{pattern_id} ({PATTERN_NAMES[pattern_id]}) | A={scores['A']:.1f} B={scores['B']:.1f} C={scores['C']:.1f} D={scores['D']:.1f} E={scores['E']:.1f}")
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 12パターン分布")
    print("=" * 80)
    
    total = len(results)
    for pid in sorted(PATTERN_NAMES.keys()):
        count = pattern_counts[pid]
        pct = (count / total * 100) if total > 0 else 0
        bar = "█" * int(pct / 2)
        print(f"  {pid} ({PATTERN_NAMES[pid]:<16}): {count:2d}枚 ({pct:5.1f}%) {bar}")
    
    # Detailed Table
    print("\n" + "=" * 80)
    print("📋 詳細結果")
    print("=" * 80)
    print(f"{'画像':<25} | {'Pattern':<20} | {'Main'} | {'Sub4':<12} | {'A':>4} | {'B':>4} | {'C':>4} | {'D':>4} | {'E':>4}")
    print("-" * 100)
    
    for r in results:
        print(f"{r['image']:<25} | {r['pattern']} {PATTERN_NAMES[r['pattern']]:<12} | {r['main']:>4} | {r['sub4']:<12} | {r['A']:>4.1f} | {r['B']:>4.1f} | {r['C']:>4.1f} | {r['D']:>4.1f} | {r['E']:>4.1f}")
    
    # Stats
    print("\n" + "=" * 80)
    print("📈 統計情報")
    print("=" * 80)
    
    unique_patterns = len([p for p in pattern_counts if pattern_counts[p] > 0])
    max_pattern = max(pattern_counts.items(), key=lambda x: x[1]) if pattern_counts else ("N/A", 0)
    max_pct = (max_pattern[1] / total * 100) if total > 0 else 0
    
    print(f"  出現パターン数: {unique_patterns}/12")
    print(f"  最多パターン: {max_pattern[0]} ({max_pattern[1]}枚, {max_pct:.1f}%)")
    
    if max_pct > 30:
        print(f"  ⚠️ WARNING: {max_pattern[0]}が30%超過（目標: 30%以下）")
    else:
        print(f"  ✅ PASS: 最多パターンは30%以下")
    
    if unique_patterns >= 8:
        print(f"  ✅ PASS: 8パターン以上出現（目標: 8-12パターン）")
    else:
        print(f"  ⚠️ WARNING: 8パターン未満（目標: 8-12パターン）")


if __name__ == "__main__":
    main()
