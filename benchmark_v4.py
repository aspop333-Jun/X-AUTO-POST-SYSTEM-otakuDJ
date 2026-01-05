import asyncio
import os
import base64
import json
import glob
from kotaro_scoring_v4 import KotaroScorerV4
from openai import AsyncOpenAI

# Configuration
IMAGE_DIR = "/mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/Xpost-EX/pattern_images"
OUTPUT_FILE = "/mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/Progress/V4_6_1_BENCHMARK.md"
LMDEPLOY_API_URL = "http://localhost:23334/v1"
LMDEPLOY_API_KEY = "dummy"

client = AsyncOpenAI(api_key=LMDEPLOY_API_KEY, base_url=LMDEPLOY_API_URL)
scorer = KotaroScorerV4()

async def analyze_image(image_path):
    filename = os.path.basename(image_path)
    print(f"Processing {filename}...")
    
    with open(image_path, "rb") as f:
        b64_img = base64.b64encode(f.read()).decode("utf-8")

    # V4.2 Prompt (Same as kotaro_api.py)
    system_prompt = """あなたは写真を感覚的に評価するAIです。
正解はありません。直感で答えてください。
必ずJSON形式で出力してください。"""

    user_prompt = """この写真を見て、以下の5要素(A-E)を0〜5点で採点し、指定のフラグ(flags)を判定してください。

## 1. 5要素採点 (0-5)
A: 表情の確定遅延 (余韻)
   0=表情固定 / 5=余韻・揺らぎがある
B: 視線の意図未決定 (構図)
   0=明確 / 5=視線・構図が散っている
C: 顔パーツ感情非同期 (クール/ギャップ)
   0=感情一致 / 5=目と口で違う・ポーズが強い
D: 優しさ・安心 (温度)
   0=冷たい・緊張 / 5=温かい・癒やし
E: 親近感 (距離)
   0=遠い / 5=近い・話しかけやすい

## 2. 判定フラグ (true/false)
### 既存フラグ
- E10_casual_moment: ふとした瞬間、キメ顔ではない自然さがあるか
- E09_nostalgic: フィルム写真のような思い出感、エモさがあるか
- E07_08_crowd_venue: イベント会場、人混み、ブース背景か
- E14_group_feeling: 複数人、または「仲間」を感じるか
- E06_talk_to: 今にも話しかけてくれそうな口元・雰囲気か
- E01_close_dist: カメラとの距離が物理的にかなり近いか
- C07_costume_strong: 衣装、コスプレ、役作りが非常に強いか
- ACT_action_pose: 指差し、敬礼、手を伸ばすなどの明確なアクションがあるか
- B02_objects_strong: 傘、看板、配布物などの「物」が目立っているか

### Pose判定 (体と顔の向き)
- pose_safe_theory: 体は斜めで、顔だけカメラを向いている (無難・綺麗・セオリー)
- pose_front_true: 体も顔も真正面を向いている (親密・証明写真に近い)
- pose_side_cool: 体は斜めで、顔も斜めや横を向いている (クール・鑑賞)
- pose_front_body_face_angled: 体は正面だが、顔は斜めを向いている

JSON出力例:
{
    "scores": {"A": 3, "B": 4, "C": 2, "D": 1, "E": 5},
    "flags": {
        "E10_casual_moment": true,
        "E09_nostalgic": false,
        "E07_08_crowd_venue": false,
        "E14_group_feeling": false,
        "E06_talk_to": true,
        "E01_close_dist": true,
        "C07_costume_strong": false,
        "ACT_action_pose": false,
        "B02_objects_strong": false,
        "pose_safe_theory": true,
        "pose_front_true": false,
        "pose_side_cool": false,
        "pose_front_body_face_angled": false
    }
}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user", 
            "content": [
                {"type": "text", "text": user_prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
            ]
        }
    ]
    
    try:
        completion = await client.chat.completions.create(
            model="Qwen2-VL-2B-Instruct",
            messages=messages,
            temperature=0.3,
            max_tokens=512,
        )
        content = completion.choices[0].message.content
        clean_content = content.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean_content)
        
        base_scores = result.get("scores", {"A":3, "B":3, "C":3, "D":3, "E":3})
        flags = result.get("flags", {})
        
        # Secondary Scoring & Decision (V4.3 logic inside scorer)
        adj_scores = scorer.apply_secondary_scoring(base_scores, flags)
        pattern_res = scorer.decide_pattern(adj_scores, flags)
        pattern_info = scorer.get_pattern_info(pattern_res["pattern_id"])
        
        return {
            "filename": filename,
            "base_scores": base_scores,
            "adj_scores": adj_scores,
            "flags": flags,
            "pattern": pattern_res["pattern_id"],
            "pattern_name": pattern_info["name"],
            "main": pattern_res["main"],
            "sub4": pattern_res["sub4"]
        }
        
    except Exception as e:
        print(f"Error processing {filename}: {e}")
        return None

async def main():
    # Gather images
    extensions = ["*.jpg", "*.png", "*.jpeg"]
    image_paths = []
    for ext in extensions:
        image_paths.extend(glob.glob(os.path.join(IMAGE_DIR, ext)))
    
    print(f"Found {len(image_paths)} images.")
    
    # Process concurrently (but limit concurrency to avoid VRAM OOM if needed, though Qwen2-VL-2B is small)
    # Sequential for safety on user machine
    results = []
    for path in sorted(image_paths): # Sort for consistent order
        res = await analyze_image(path)
        if res:
            results.append(res)
            
    # Generate Markdown Report
    md_lines = ["# 🐯 Kotaro Scoring V4.3 Benchmark Report (Anti-P04 Lock)\n"]
    md_lines.append(f"**Total Images**: {len(results)}\n")
    
    # Distribution Summary
    patterns = [r["pattern"] for r in results]
    dist = {p: patterns.count(p) for p in set(patterns)}
    
    md_lines.append("## Pattern Distribution\n")
    md_lines.append("| Pattern | Count | %\n|---|---|---|\n")
    for p in sorted(dist.keys()):
        count = dist[p]
        percent = (count / len(results)) * 100
        md_lines.append(f"| {p} | {count} | {percent:.1f}% |\n")
        
    md_lines.append("\n## Detailed Results\n")
    md_lines.append("| Image | Pattern | Main | Sub4 | A | B | C | D | E | Flags |\n|---|---|---|---|---|---|---|---|---|---|\n")
    
    for r in results:
        adj = r["adj_scores"]
        flags_str = ", ".join([k.replace("E10_", "").replace("E09_", "").replace("E07_08_", "").replace("E14_", "").replace("E06_", "").replace("E01_", "").replace("C07_", "").replace("ACT_", "").replace("B02_", "") for k, v in r["flags"].items() if v])
        if not flags_str: flags_str = "-"
        
        md_lines.append(f"| {r['filename']} | **{r['pattern']}**<br>{r['pattern_name']} | {r['main']} | {r['sub4']} | {adj['A']} | {adj['B']} | {adj['C']} | {adj['D']} | {adj['E']} | {flags_str} |\n")
        
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.writelines(md_lines)
        
    print(f"Benchmark complete. Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(main())
