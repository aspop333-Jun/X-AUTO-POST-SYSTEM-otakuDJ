"""
Kotaro-Engine API Server (V2.3 LMDeploy Edition)
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import uvicorn
import base64
import tempfile
import os
import json
import logging
import random
from typing import List, Dict, Any, Optional
from kotaro_scoring import KotaroScorer, CRITERIA
import google.generativeai as genai
from dotenv import load_dotenv

# 環境変数を読み込む
load_dotenv()

# ロガー設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kotaro_api")

app = FastAPI(title="Kotaro-Engine API (V2.3 - Hybrid)")

# Gemini API設定
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 開発用: Next.js等からのアクセスを許可
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# スコアラー初期化
scorer = KotaroScorer()

# VLM設定
# Docker(host network) or Port Forwarding
LMDEPLOY_URL = "http://localhost:23333/v1/chat/completions"

# ルールベースのフォールバック用テンプレート
FALLBACK_TEMPLATES = {
    "笑顔": [
        "爽やかな笑顔がブースの雰囲気にぴったりでした✨",
        "自然な笑顔がとても魅力的でした✨",
        "明るい笑顔が会場を華やかにしていました✨",
    ],
    "クール": [
        "凛とした表情がとても印象的でした✨",
        "クールな雰囲気がブースの世界観に合っていました✨",
        "シャープな表情が目を引きました✨",
    ],
    "かわいい": [
        "栞さん可愛い、これは反則✨",
        "栞さんの可愛さ、規格外📸",
        "栞さん可愛すぎて無理✨",
    ],
    "ふざけ": [
        "栞さんのこのノリ、最高📸",
        "栞さん面白すぎる✨",
        "栞さんこれ好き、優勝📸",
    ],
    "真剣": [
        "栞さんの真剣な眼差し、刺さる✨",
        "栞さんこの表情、美しい📸",
        "栞さんの集中力、ヤバい✨",
    ],
}

def generate_fallback_comment(expression_type: str = "笑顔", name: str = "") -> str:
    """ルールベースでフォールバックコメントを生成"""
    templates = FALLBACK_TEMPLATES.get(expression_type, FALLBACK_TEMPLATES["笑顔"])
    comment = random.choice(templates)

    # 名前があれば置換（テンプレートによっては名前が入らないものもあるので、接頭辞として追加する簡易ロジックも検討）
    if name.strip():
        # "栞"が含まれていれば置換
        if "栞" in comment:
            comment = comment.replace("栞", name)
        # 含まれていなければ接頭辞として追加（ただし、文脈による）
        elif "✨" in comment: # 既存のテンプレートは✨で終わるものが多い
             pass # そのまま

    return comment

async def call_gemini_analysis(image_path: str, name: str = "モデル") -> Dict[str, Any]:
    """Gemini APIを使用して画像分析とコメント生成を行う"""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")

    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')

        with open(image_path, "rb") as f:
            image_data = f.read()

        prompt = f"""
        あなたはイベント写真のプロのキャプションライターです。
        この写真の人物（名前: {name}）について、SNSに投稿するための短いコメント（18文字以内）を3つ提案してください。

        条件:
        1. 名前（{name}）を含めること。
        2. 写真の表情や雰囲気を反映すること。
        3. ポジティブで魅力的な内容にすること。
        4. スラング禁止（神、優勝、バチバチ等）。
        5. 文末に✨をつけること。

        出力形式:
        JSON形式で出力してください。
        {{
            "expression": "笑顔/クール/かわいい/etc",
            "comments": ["コメント1", "コメント2", "コメント3"]
        }}
        """

        response = model.generate_content([
            {"mime_type": "image/jpeg", "data": image_data},
            prompt
        ])

        if response.text:
            text = response.text.strip().replace("```json", "").replace("```", "")
            return json.loads(text)
        else:
            raise ValueError("Empty response from Gemini")

    except Exception as e:
        logger.error(f"Gemini Error: {e}")
        raise e


async def call_vlm_analysis(image_path: str) -> Dict[str, Any]:
    """VLMに画像を投げて60項目判定(JSON)を取得"""
    
    # 画像エンコード
    with open(image_path, "rb") as f:
        b64_img = base64.b64encode(f.read()).decode("utf-8")
        
    # プロンプト構築（JSON Schema対応）
    questions = [f"{c['id']}: {c['question']}" for c in CRITERIA]
    criteria_list = "\n".join(questions)
    
    system_prompt = """あなたは画像認識AIです。以下の判定基準に基づき、画像の内容を分析してください。
出力は必ずJSON形式で行ってください。余計な文章は一切含めないでください。"""

    user_prompt = f"""この写真を以下の60項目で判定し、結果をJSONで出力してください。
該当する場合は1、しない場合は0です。
確信が持てない場合でも、どちらかを選んでください。

--- 判定項目 ---
{criteria_list}

--- 出力形式 ---
{{
  "criteria": {{
    "A01": 1,
    "A02": 0,
    ...
  }},
  "confidence": 0.95
}}
"""

    payload = {
        "model": "Qwen/Qwen-VL-Chat-Int4",
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user", 
                "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                ]
            }
        ],
        "temperature": 0.1,  # 決定論的に
        "max_tokens": 1024,
        # "response_format": {"type": "json_object"} # Qwen-VLの実装依存のため、プロンプト指示をメインにする
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(LMDEPLOY_URL, json=payload)
            resp.raise_for_status()
            result = resp.json()
            
            # レスポンス構造の確認
            if "choices" not in result or len(result["choices"]) == 0:
                raise ValueError("Invalid VLM response format")
                
            content = result["choices"][0]["message"]["content"]
            logger.info(f"VLM Raw Response: {content[:100]}...") # ログ出力
            
            # JSONパース（Markdownの ```json ... ``` を除去）
            clean_content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_content)
            
        except json.JSONDecodeError:
            logger.error(f"JSON Parse Error. Content: {content}")
            raise HTTPException(status_code=500, detail="VLM returned invalid JSON")
        except Exception as e:
            logger.error(f"VLM Error: {e}")
            raise HTTPException(status_code=500, detail=f"VLM Analysis Failed: {str(e)}")

@app.post("/generate")
async def generate_comment(
    image: UploadFile = File(...),
    name: str = Form(default=""),
    count: int = Form(default=3),
):
    """
    メインエンドポイント：
    1. Local VLM (MiniCPM-V) -> Scorer -> Comment
    2. Fallback: Gemini API (Cloud)
    3. Fallback: Rule-based (Random)
    """
    
    # 画像一時保存
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        content = await image.read()
        tmp.write(content)
        tmp_path = tmp.name
        
    try:
        # --- Plan A: Local VLM ---
        try:
            logger.info("Attempting Local VLM Analysis...")
            vlm_result = await call_vlm_analysis(tmp_path)
            criteria_answers = vlm_result.get("criteria", {})
            
            # 0/1 を bool に変換
            answers_bool = {k: bool(v) for k, v in criteria_answers.items()}
            
            # スコアリング＆パターン決定
            pattern_id, p_scores, s_scores = scorer.score_from_answers(answers_bool)
            pattern_info = scorer.patterns[pattern_id]

            # コメント生成
            comments = []
            for _ in range(count):
                raw_comment = scorer.get_comment(pattern_id)
                # 名前入れ
                if name.strip() and not raw_comment.startswith(name):
                    final_comment = f"{name}さん、{raw_comment}"
                else:
                    final_comment = raw_comment
                comments.append(final_comment)

            expression_str = f"{pattern_info['name']} ({pattern_info['trigger']})"

            return {
                "success": True,
                "source": "local_vlm",
                "pattern": {
                    "id": pattern_id,
                    "name": pattern_info["name"],
                    "trigger": pattern_info["trigger"]
                },
                "expression": expression_str,
                "analysis": expression_str,
                "scores": p_scores,
                "comments": comments,
                "analysis_raw": vlm_result
            }

        except (httpx.ConnectError, httpx.HTTPError) as e:
            logger.warning(f"Local VLM failed ({e}), switching to Plan B (Gemini)...")
            raise ValueError("Local VLM Unavailable") # Trigger Plan B

    except ValueError:
        # --- Plan B: Gemini API ---
        try:
            if not GEMINI_API_KEY:
                logger.warning("Gemini API Key not found, switching to Plan C (Rule-based)...")
                raise ValueError("No API Key")

            logger.info("Attempting Gemini Analysis...")
            gemini_result = await call_gemini_analysis(tmp_path, name)

            return {
                "success": True,
                "source": "gemini_cloud",
                "expression": gemini_result.get("expression", "Unknown"),
                "comments": gemini_result.get("comments", []),
                "analysis": gemini_result.get("expression", "Unknown")
            }

        except Exception as e:
            logger.error(f"Gemini failed ({e}), switching to Plan C (Rule-based)...")

            # --- Plan C: Rule-based Fallback ---
            comments = []
            for _ in range(count):
                comments.append(generate_fallback_comment("笑顔", name)) # デフォルト笑顔

            return {
                "success": True,
                "source": "rule_based_fallback",
                "expression": "Fallback (Rule-based)",
                "comments": comments,
                "analysis": "Fallback"
            }
        
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

if __name__ == "__main__":
    print("\n🐯 Kotaro-Engine API Server (V2.3)")
    print(f"Connecting to VLM: {LMDEPLOY_URL}")
    print("=" * 40)
    uvicorn.run(app, host="0.0.0.0", port=8000)
