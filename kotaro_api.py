"""
Kotaro-Engine API Server

FastAPIでKotaro-Engineを提供

起動方法:
    python kotaro_api.py
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import ollama
import random
import base64
import tempfile
import os
from pathlib import Path

app = FastAPI(title="Kotaro-Engine API")

# CORS設定（Next.jsからアクセス可能に）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# 表情カテゴリとお手本
# =============================================================================

EXPRESSION_CATEGORIES = ["笑顔", "クール", "かわいい", "ふざけ", "真剣"]

# 名前あり版の例（カジュアルなノリ）
EXAMPLES_WITH_NAME = {
    "笑顔": [
        "栞さんの笑顔、優勝だわ✨",
        "栞さん、いい笑顔！📸",
        "栞さん、可愛い！優勝✨",
    ],
    "クール": [
        "栞さん、カッコいい！✨",
        "栞さんのクールさ、優勝✨",
    ],
    "かわいい": [
        "栞さん、可愛い！反則！✨",
        "栞さん、かわ！✨",
    ],
    "ふざけ": [
        "栞さん、このノリ最高！📸",
        "栞さん、これ好き！📸",
    ],
    "真剣": [
        "栞さん、きまってる！📸",
        "栞さん、カッコいい！✨",
    ],
}

# 名前なし版の例（カジュアルなノリ）
EXAMPLES_NO_NAME = {
    "笑顔": [
        "いい笑顔！優勝✨",
        "素敵な笑顔もらった📸",
        "可愛い！✨",
    ],
    "クール": [
        "カッコいい！✨",
        "クールで優勝✨",
    ],
    "かわいい": [
        "可愛い！反則！✨",
        "かわ✨",
    ],
    "ふざけ": [
        "このノリ最高！📸",
        "これ好き！📸",
    ],
    "真剣": [
        "きまってる！📸",
        "カッコいい！✨",
    ],
}


# =============================================================================
# API エンドポイント
# =============================================================================

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "2.0"}


@app.post("/generate")
async def generate_comment(
    image: UploadFile = File(...),
    name: str = Form(default=""),  # 名前はオプショナル
    count: int = Form(default=3),
):
    """写真をアップロードして18文字コメントを生成"""
    
    # 画像を一時ファイルに保存
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        content = await image.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # llavaで画像を詳細分析
        image_analysis = analyze_image(tmp_path)
        
        # 18文字コメント生成（画像分析を元に）
        comments = []
        for _ in range(count):
            comment = generate_18char(name, image_analysis)
            comments.append(comment)
        
        return {
            "success": True,
            "analysis": image_analysis,
            "comments": comments,
        }
    finally:
        # 一時ファイル削除
        os.unlink(tmp_path)


def analyze_image(image_path: str) -> str:
    """llavaで画像の具体的な特徴を分析"""
    
    image_data = Path(image_path).read_bytes()
    
    response = ollama.generate(
        model="llava",
        prompt="""この写真のモデルさんを見て、以下の3つを具体的に答えて：

①表情はどんな感じ？（1つ選んで具体的に）
- ニコニコ笑顔？
- 楽しそうな笑顔？
- クールにキメてる？
- 愛嬌のある表情？
- ウインクしてる？
- 澄んだ瞳？

②コスチュームや外見の特徴？（1つ具体的に）
- かっこいい衣装？
- かわいい衣装？
- セクシーな衣装？
- 特徴的な色？（例：青い、ピンク、黒）
- 髪型の特徴？（例：ロングヘア、ツインテール、金髪）

③目を引く特徴？（1つ具体的に）
- 帽子やヘアアクセ？
- 何か持ってる？
- ポーズ？
- その他目立つ特徴？

例：
①ニコニコの笑顔
②青いセーラー服がかわいい
③大きなぬいぐるみを持ってる

短く具体的に：""",
        images=[image_data],
    )
    
    return response["response"].strip()


def generate_18char(model_name: str, image_analysis: str) -> str:
    """画像分析の具体的特徴を使って虎太郎らしい賞賛コメントを生成"""
    
    if model_name.strip():
        prompt = f"""カメラマン虎太郎として{model_name}さんの写真に一言コメント。

【写真の具体的な特徴】
{image_analysis}

【虎太郎のキャラ】
- 30代後半のベテランカメラマン
- 撮影させてもらえて嬉しい気持ちをストレートに表現
- 同意を求めるような語りかけも使う
- 感謝の気持ちも込める

【良いお手本（バリエーション豊富に！）】
- {model_name}さんの笑顔、ほんと素敵だよね！📸
- {model_name}さん、撮れて嬉しすぎる！神！✨
- {model_name}さん、お姫さまみたい！😆
- この衣装ほんと似合うね、{model_name}さん！❤
- {model_name}さん、ありがとう！最高の一枚📸

【禁止（機械的になるので使わない）】
- 「マジ」（多用しすぎ）
- 「卍」（NGワード）
- 「じゃん」（多用しすぎ）
- 「やばすぎ」（具体性なし）
- 敬語・丁寧語（「です」「ます」）
- 光や背景の話（必ずモデルさんを賞賛！）

【出力】18文字以内で虎太郎らしい人間味ある一言："""
    else:
        prompt = f"""カメラマン虎太郎として写真に一言コメント。

【写真の具体的な特徴】
{image_analysis}

【虎太郎のキャラ】
- 30代後半のベテランカメラマン
- 撮影させてもらえて嬉しい気持ちをストレートに表現
- 同意を求めるような語りかけも使う
- 感謝の気持ちも込める

【良いお手本（バリエーション豊富に！）】
- この笑顔、ほんと素敵だよね！📸
- 撮れて嬉しすぎる！神！✨
- ほんとお姫さまみたい！😆
- この衣装、すごく似合ってるよね❤
- ありがとう！最高の一枚！📸
- この表情これ最高だよね！！✨

【禁止（機械的になるので使わない）】
- 「マジ」（多用しすぎ）
- 「卍」（NGワード）
- 「じゃん」（多用しすぎ）
- 「やばすぎ」（具体性なし）
- 敬語・丁寧語（「です」「ます」）
- 光や背景の話（必ずモデルさんを賞賛！）

【出力】18文字以内で虎太郎らしい人間味ある一言："""
    
    response = ollama.generate(
        model="gemma3:4b",
        prompt=prompt,
        options={"temperature": 0.9, "num_predict": 60}
    )
    
    result = response["response"].strip()
    
    # 改行があれば最初の行だけ
    if "\n" in result:
        result = result.split("\n")[0]
    
    # 余計な記号を削除
    result = result.strip('"「」')
    
    # NGワードフィルター
    ng_words = ["卍", "マジ", "ぴえん", "草", "ww"]
    for ng in ng_words:
        result = result.replace(ng, "")
    
    # 空になったら、安全なデフォルトを返す
    if len(result.strip()) < 3:
        result = "素敵な一枚！📸"
    
    # 長すぎたら切る
    if len(result) > 18:
        result = result[:17] + "✨"
    
    return result


# =============================================================================
# サーバー起動
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    print("\n🐯 Kotaro-Engine API Server")
    print("=" * 40)
    print("起動中... http://localhost:8000")
    print("=" * 40)
    uvicorn.run(app, host="0.0.0.0", port=8000)
