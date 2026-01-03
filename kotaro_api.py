"""
Kotaro-Engine API Server (V2.3 LMDeploy Edition + Gemini Hybrid)
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import uvicorn
import base64
import tempfile
import os
import json
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# 環境変数読み込み
load_dotenv()

# Geminiのインポート
import google.generativeai as genai

# Kotaro内部モジュール
from kotaro_scoring import KotaroScorer, CRITERIA

# ロガー設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kotaro_api")

app = FastAPI(title="Kotaro-Engine API (V2.3 Hybrid)")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 開発用: Next.js等からのアクセスを許可
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

# VLM設定 (Local)
# Docker(host network) or Port Forwarding
LMDEPLOY_URL = "http://localhost:23333/v1/chat/completions"

# Gemini API設定 (Cloud)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# スコアラー初期化
scorer = KotaroScorer()

# -----------------------------------------------------------------------------
# Data Models (from api/main.py)
# -----------------------------------------------------------------------------

class CommentRequest(BaseModel):
    """Gemini API用リクエストモデル"""
    booth_name: str = "ブース"
    role: str = "モデル"
    category: str = "ブース"
    expression_type: str = "笑顔"
    focus_point: str = "表情"
    context_match: str = "ブースの雰囲気"
    image_base64: Optional[str] = None

class CommentResponse(BaseModel):
    """Gemini API用レスポンスモデル"""
    comment: str
    source: str  # "ai" or "rule_based"

class HealthResponse(BaseModel):
    status: str
    api_configured: bool
    local_vlm: bool

# -----------------------------------------------------------------------------
# Helper Functions (Local VLM)
# -----------------------------------------------------------------------------

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

# -----------------------------------------------------------------------------
# Helper Functions (Gemini / Rule Based)
# -----------------------------------------------------------------------------

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
    # ... 他のテンプレートは必要に応じて追加 ...
}

def generate_fallback_comment(expression_type: str) -> str:
    """ルールベースでフォールバックコメントを生成"""
    import random
    templates = FALLBACK_TEMPLATES.get(expression_type, FALLBACK_TEMPLATES["笑顔"])
    return random.choice(templates)

def build_gemini_prompt(request: CommentRequest, has_image: bool) -> str:
    """Gemini用のプロンプトを構築"""
    prompt = f"""あなたはイベント写真の一言コメントを書くプロです。
{'この写真を見て、' if has_image else ''}以下のルールで1行コメントを1つだけ生成してください：

【絶対ルール】
- 1行のみ（20〜30文字）
- 「〇〇が△△にぴったり/合っていた」形式
- 最後に✨を付ける
- 固有名詞・キャラ名・作品名は絶対に入れない
- 主語を「俺」にしない
- スラング禁止（神、優勝、バチバチ等）

【使える評価軸のみ使用】
笑顔、表情、視線、佇まい、雰囲気、衣装が似合う、ライトに映える、ブースの雰囲気に合う

{'【写真から読み取るべき要素】' if has_image else ''}
{'''- 人物の表情（笑顔、クール、優しい、凛としたなど）
- 全体の雰囲気（明るい、落ち着いた、華やかなど）
- 衣装やライティングの印象''' if has_image else ''}

【ユーザーが選択した雰囲気】
- 表情・雰囲気: {request.expression_type}
- 注目ポイント: {request.focus_point}
- マッチ先: {request.context_match}

【情報】
- カテゴリ: {request.category}
- ブース: {request.booth_name}
- 役割: {request.role}

【出力形式】
コメントのみを1行で出力（説明不要）"""
    return prompt

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """統合ヘルスチェック"""
    # Local VLM check (simple connection check)
    local_vlm_status = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
             # VLM health check or just connect to root/models
             # LMDeploy usually has /v1/models
             resp = await client.get(LMDEPLOY_URL.replace("/chat/completions", "/models"))
             if resp.status_code == 200:
                 local_vlm_status = True
    except:
        pass

    return HealthResponse(
        status="ok",
        api_configured=bool(GEMINI_API_KEY),
        local_vlm=local_vlm_status
    )

@app.post("/generate")
async def generate_comment_local(
    image: UploadFile = File(...),
    name: str = Form(default=""),
    count: int = Form(default=3),
):
    """
    [Local Mode] 画像 -> VLM -> Scorer -> Comment
    Next.js App (Candy Kotaro) 用のメインエンドポイント
    """
    
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

@app.post("/generate-comment", response_model=CommentResponse)
async def generate_comment_cloud(request: CommentRequest):
    """
    [Cloud Mode] Gemini APIを使用した一言コメント生成
    api/main.py からの移行
    """

    if not GEMINI_API_KEY:
        # API未設定の場合はルールベースで生成
        comment = generate_fallback_comment(request.expression_type)
        return CommentResponse(comment=comment, source="rule_based")

    try:
        # Geminiモデルを初期化
        model = genai.GenerativeModel('gemini-2.0-flash-exp')

        # 画像の有無を確認
        has_image = bool(request.image_base64)

        # プロンプトを構築
        prompt = build_gemini_prompt(request, has_image)

        if has_image:
            # 画像付きリクエスト
            if request.image_base64.startswith('data:'):
                header, image_data = request.image_base64.split(',', 1)
                mime_type = header.split(':')[1].split(';')[0]
            else:
                image_data = request.image_base64
                mime_type = "image/jpeg"

            image_bytes = base64.b64decode(image_data)

            response = model.generate_content([
                {
                    "mime_type": mime_type,
                    "data": image_bytes
                },
                prompt
            ])
        else:
            response = model.generate_content(prompt)

        if response.text:
            comment = response.text.strip()
            return CommentResponse(comment=comment, source="ai")
        else:
            raise ValueError("Empty response from API")

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        comment = generate_fallback_comment(request.expression_type)
        return CommentResponse(comment=comment, source="rule_based")

@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "Kotaro-Engine API (Hybrid)",
        "modes": {
            "local": "/generate (POST, FormData)",
            "cloud": "/generate-comment (POST, JSON)"
        },
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    print("\n🐯 Kotaro-Engine API Server (V2.3 Hybrid)")
    print(f"Connecting to VLM: {LMDEPLOY_URL}")
    print(f"Gemini API: {'Configured' if GEMINI_API_KEY else 'Not Configured'}")
    print("=" * 40)
    uvicorn.run(app, host="0.0.0.0", port=8000)
