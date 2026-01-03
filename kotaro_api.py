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
from typing import List, Dict, Any, Optional
from kotaro_scoring import KotaroScorer, CRITERIA

# ロガー設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kotaro_api")

app = FastAPI(title="Kotaro-Engine API (V2.3)")

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
    """メインエンドポイント：画像 -> VLM -> Scorer -> Comment"""
    
    # 画像一時保存
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        content = await image.read()
        tmp.write(content)
        tmp_path = tmp.name
        
    try:
        # 1. VLM分析（60項目判定）
        logger.info("Calling VLM...")
        vlm_result = await call_vlm_analysis(tmp_path)
        criteria_answers = vlm_result.get("criteria", {})
        
        # 0/1 を bool に変換
        answers_bool = {k: bool(v) for k, v in criteria_answers.items()}
        
        # 2. スコアリング＆パターン決定
        logger.info("Scoring...")
        pattern_id, p_scores, s_scores = scorer.score_from_answers(answers_bool)
        pattern_info = scorer.patterns[pattern_id]
        
        # 3. コメント生成
        comments = []
        for _ in range(count):
            raw_comment = scorer.get_comment(pattern_id)
            # 名前入れ
            if name.strip() and not raw_comment.startswith(name):
                final_comment = f"{name}さん、{raw_comment}"
            else:
                final_comment = raw_comment
            comments.append(final_comment)
            
        # 後方互換性フィールド
        expression_str = f"{pattern_info['name']} ({pattern_info['trigger']})"
            
        return {
            "success": True,
            "pattern": {
                "id": pattern_id,
                "name": pattern_info["name"],
                "trigger": pattern_info["trigger"]
            },
            "expression": expression_str, # フロントエンド互換性
            "analysis": expression_str,   # 旧API互換性
            "scores": p_scores,
            "comments": comments,
            "analysis_raw": vlm_result # フロントエンドでのデバッグ用に維持
        }
        
    except httpx.ConnectError:
        logger.error("VLM Connection Failed")
        return {
            "success": False,
            "error": "VLM engine is offline. Please start LMDeploy container."
        }
    except Exception as e:
        logger.error(f"API Error: {e}")
        return {"success": False, "error": str(e)}
        
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

if __name__ == "__main__":
    print("\n🐯 Kotaro-Engine API Server (V2.3)")
    print(f"Connecting to VLM: {LMDEPLOY_URL}")
    print("=" * 40)
    uvicorn.run(app, host="0.0.0.0", port=8000)
