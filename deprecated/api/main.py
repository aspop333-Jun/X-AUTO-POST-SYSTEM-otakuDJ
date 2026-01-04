"""
イベント写真自動投稿システム - FastAPI バックエンド
Gemini API を安全に呼び出すためのサーバー
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
import os
import base64
from dotenv import load_dotenv

# 環境変数を読み込む
load_dotenv()

app = FastAPI(
    title="イベント写真自動投稿 API",
    description="Gemini APIを使用した一言コメント生成",
    version="1.0.0"
)

# CORS設定（ローカル開発用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番では適切なオリジンを指定
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini API設定
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class CommentRequest(BaseModel):
    """コメント生成リクエスト"""
    booth_name: str = "ブース"
    role: str = "モデル"
    category: str = "ブース"
    expression_type: str = "笑顔"
    focus_point: str = "表情"
    context_match: str = "ブースの雰囲気"
    image_base64: Optional[str] = None  # オプション: 画像データ


class CommentResponse(BaseModel):
    """コメント生成レスポンス"""
    comment: str
    source: str  # "ai" or "rule_based"


class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""
    status: str
    api_configured: bool


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
    "柔らか": [
        "柔らかな表情がとても魅力的でした✨",
        "優しい雰囲気がブースに溶け込んでいました✨",
        "穏やかな佇まいが印象的でした✨",
    ],
    "華やか": [
        "華やかな存在感が際立っていました✨",
        "輝くような雰囲気がブースを彩っていました✨",
        "存在感のある佇まいが印象的でした✨",
    ],
    "自然": [
        "自然体の佇まいがとても魅力的でした✨",
        "落ち着いた雰囲気が会場に溶け込んでいました✨",
        "飾らない雰囲気が素敵でした✨",
    ],
    "力強い": [
        "力強い視線に引き込まれました✨",
        "堂々とした佇まいがとても印象的でした✨",
        "圧倒的な存在感が目を引きました✨",
    ],
}


def generate_fallback_comment(expression_type: str) -> str:
    """ルールベースでフォールバックコメントを生成"""
    import random
    templates = FALLBACK_TEMPLATES.get(expression_type, FALLBACK_TEMPLATES["笑顔"])
    return random.choice(templates)


def build_prompt(request: CommentRequest, has_image: bool) -> str:
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


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """ヘルスチェック"""
    return HealthResponse(
        status="ok",
        api_configured=bool(GEMINI_API_KEY)
    )


@app.post("/generate-comment", response_model=CommentResponse)
async def generate_comment(request: CommentRequest):
    """
    一言コメントを生成
    
    - 画像がある場合: Gemini Vision APIで分析して生成
    - 画像がない場合: テキスト情報のみで生成
    - APIエラー時: ルールベースでフォールバック
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
        prompt = build_prompt(request, has_image)
        
        if has_image:
            # 画像付きリクエスト
            # Base64から画像データを抽出
            if request.image_base64.startswith('data:'):
                # data:image/jpeg;base64,xxxx 形式の場合
                header, image_data = request.image_base64.split(',', 1)
                mime_type = header.split(':')[1].split(';')[0]
            else:
                # 純粋なbase64の場合
                image_data = request.image_base64
                mime_type = "image/jpeg"
            
            image_bytes = base64.b64decode(image_data)
            
            # 画像を含むコンテンツを生成
            response = model.generate_content([
                {
                    "mime_type": mime_type,
                    "data": image_bytes
                },
                prompt
            ])
        else:
            # テキストのみのリクエスト
            response = model.generate_content(prompt)
        
        # レスポンスからテキストを抽出
        if response.text:
            comment = response.text.strip()
            return CommentResponse(comment=comment, source="ai")
        else:
            raise ValueError("Empty response from API")
            
    except Exception as e:
        print(f"Gemini API error: {e}")
        # エラー時はルールベースでフォールバック
        comment = generate_fallback_comment(request.expression_type)
        return CommentResponse(comment=comment, source="rule_based")


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "イベント写真自動投稿 API",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
