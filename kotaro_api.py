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
        prompt="""この写真のモデルさんを見て、日本語で簡潔に答えて。

①コスの色は？（1つだけ選んで）
- 青系、赤系、ピンク系、黒系、白系、緑系、オレンジ系

②可愛さ・綺麗さの源は？（表情やしぐさから1つ選んで）
- ニコニコ笑顔
- キュートな表情
- 美しい微笑み
- クールビューティー
- 愛嬌たっぷり
- 凛とした美しさ
- キメポーズがかっこいい

③一番印象的な点は？（1つだけ短く）

回答例：
①青系
②ニコニコ笑顔
③猫耳がかわいい

必ず日本語で、短く答えて：""",
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

【良いお手本（22文字で具体的特徴＋感情！）】
- {model_name}さんの青い衣装、すごく似合ってる！📸
- {model_name}さん、ピンクヘア超かわいい！ありがとう❤️
- {model_name}さん、この衣装めっちゃ素敵だよね！✨
- {model_name}さん、撮らせてくれて嬉しすぎる！神！📸

【禁止（機械的になるので使わない）】
- 「マジ」（多用しすぎ）
- 「卍」（NGワード）
- 「じゃん」（多用しすぎ）
- 「やばすぎ」（具体性なし）
- 敬語・丁寧語（「です」「ます」）
- 光や背景の話（必ずモデルさんを賞賛！）

【出力ルール】
- なるべく22文字を使い切って！短すぎはダメ！
- 具体的特徴＋感情＋感謝を全部入れる
- 最低18文字以上、最大22文字

虎太郎らしい一言："""
    else:
        prompt = f"""カメラマン虎太郎として写真に一言コメント。

【写真の具体的な特徴】
{image_analysis}

【虎太郎のキャラ】
- 30代後半のベテランカメラマン
- 撮影させてもらえて嬉しい気持ちをストレートに表現
- 同意を求めるような語りかけも使う
- 感謝の気持ちも込める

【良いお手本（22文字で具体的特徴＋感情！）】
- 青い衣装、すごく似合ってる！ありがとう📸
- ピンクのロングヘア、超かわいい！✨
- この衣装めっちゃ素敵だよね！撮れて嬉しい❤️
- 撮らせてくれてありがとう！最高の一枚！📸

【禁止（機械的になるので使わない）】
- 「マジ」（多用しすぎ）
- 「卍」（NGワード）
- 「じゃん」（多用しすぎ）
- 「やばすぎ」（具体性なし）
- 敬語・丁寧語（「です」「ます」）
- 光や背景の話（必ずモデルさんを賞賛！）

【出力ルール】
- なるべく22文字を使い切って！短すぎはダメ！
- 具体的特徴＋感情＋感謝を全部入れる
- 最低18文字以上、最大22文字

虎太郎らしい一言："""
    
    response = ollama.generate(
        model="qwen2.5:7b-instruct-q4_K_M",
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
    
    # 中国語が混入した場合はデフォルトを返す
    import re
    if re.search(r'[\u4e00-\u9fff]', result):
        # 日本語の漢字も含まれるので、明らかに中国語っぽい場合のみ
        chinese_patterns = ["的", "是", "很", "了", "吗", "呢", "啊", "吧", "感谢", "拍手"]
        if any(p in result for p in chinese_patterns):
            result = "素敵なコス！ありがとう📸"
    
    # 衣装関連は全て「コス」に統一
    costume_replacements = {
        "ジャージ": "コス",
        "Tシャツ": "コス", 
        "パーカー": "コス",
        "スウェット": "コス",
        "ワンピース": "コス",
        "私服": "コス",
        "衣装": "コス",
        "セーラー服": "コス",
        "ドレス": "コス",
        "服": "コス",
    }
    for old, new in costume_replacements.items():
        result = result.replace(old, new)
    
    # 空になったら、安全なデフォルトを返す
    if len(result.strip()) < 3:
        result = "素敵な一枚！📸"
    
    # 長すぎたら切る
    if len(result) > 22:
        result = result[:21] + "✨"
    
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
