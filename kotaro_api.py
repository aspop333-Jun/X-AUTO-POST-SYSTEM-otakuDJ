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
        # Qwen2.5-VLで画像を詳細分析
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


# =============================================================================
# 画像解析設定
# =============================================================================

# MiniCPM-V 2.6を使用するかどうか（FalseでOllamaフォールバック）
USE_MINICPM = False  # 全部Qwen (Ollama) を使用


def analyze_image(image_path: str) -> str:
    """画像の具体的な特徴を分析
    
    MiniCPM-V 2.6 int4 または Qwen2.5-VL (Ollama) を使用
    """
    
    if USE_MINICPM:
        try:
            from vision_core import analyze_image_minicpm
            return analyze_image_minicpm(image_path)
        except Exception as e:
            print(f"⚠️ MiniCPM-V エラー、Ollamaにフォールバック: {e}")
    
    # Ollamaフォールバック（Qwen2.5-VL）
    return _analyze_image_ollama(image_path)


def _analyze_image_ollama(image_path: str) -> str:
    """Qwen2.5-VL 7B (Ollama) による画像分析"""
    
    image_data = Path(image_path).read_bytes()
    
    response = ollama.generate(
        model="qwen2.5vl:7b",
        prompt="""あなたは熟練した画像認識AIアシスタントです。人物の「魅力」を見つけるプロです。

【重要ルール】
- 常に自然な日本語で回答（中国語・英語NG）
- 背景と人物を混同しない
- 確信がない場合は「確認できません」

【この写真の人物について、優先順位順に答えてください】

①【最重要】表情の魅力は？
例: キラキラした笑顔、はにかんだ微笑み、凛とした表情、目がキュート、口角上がってる

②【重要】仕草・ポーズの魅力は？
例: 手のポーズがかわいい、目線がセクシー、堂々としてる、ピースサインがキュート

③【補足】衣装で特に目立つ点は？（特徴的な場合のみ）
例: 猫耳、メイド服、和装、特徴がなければ「シンプル」

回答例：
①はにかんだ笑顔が最高
②ピースサインがかわいい
③猫耳が印象的

必ず日本語のみで答えてください：""",
        images=[image_data],
        options={
            "temperature": 0.1,   # ハルシネーション抑制
            "num_gpu": 99,        # 全レイヤーGPU
            "num_thread": 8,      # CPUスレッド数
            "num_predict": 150,   # 出力トークン制限
        }
    )
    
    return response["response"].strip()




def generate_18char(model_name: str, image_analysis: str) -> str:
    """画像分析の具体的特徴を使って虎太郎らしい賞賛コメントを生成
    
    V2.1: Dynamic Few-shot形式、Temperature 0.3、安全弁付き
    """
    
    # Few-shot例（チャッピー推奨形式）
    few_shot_examples = """[写真特徴]: はにかんだ笑顔、ピースサイン
[虎太郎のコメント]: はにかんだ笑顔が最高❤

[写真特徴]: 透明感のある雰囲気、柔らかい微笑み
[虎太郎のコメント]: 透明感つよすぎて光になるレベル…✨

[写真特徴]: ニコッとした仕草、リラックスしたポーズ
[虎太郎のコメント]: ニコっとした表情に癒される😍

[写真特徴]: キラキラした目元、堂々としたポーズ
[虎太郎のコメント]: 目がほんと素敵❤

[写真特徴]: 優しい微笑み、可愛い仕草
[虎太郎のコメント]: 圧倒的に可愛すぎ…✨"""

    if model_name.strip():
        prompt = f"""あなたはCANDY虎太郎です。写真投稿に愛嬌たっぷりのコメントをするカメラマンです。

【虎太郎のスタイル】
- 語尾に❤✨😍をつける
- 「すてき」「癒される」「可愛すぎ」などポジティブワード
- 18〜22文字で簡潔に
- 具体的な褒めポイントを入れる

【お手本コメント】
{few_shot_examples}

[写真特徴]: {image_analysis}
[虎太郎のコメント]: {model_name}さん、"""
    else:
        prompt = f"""あなたはCANDY虎太郎です。写真投稿に愛嬌たっぷりのコメントをするカメラマンです。

【虎太郎のスタイル】
- 語尾に❤✨😍をつける
- 「すてき」「癒される」「可愛すぎ」などポジティブワード
- 18〜22文字で簡潔に
- 具体的な褒めポイントを入れる

【お手本コメント】
{few_shot_examples}

[写真特徴]: {image_analysis}
[虎太郎のコメント]: """
    
    # V2.1パラメータ：Temperature 0.3、top_p 0.9
    max_retries = 2
    result = None
    
    for attempt in range(max_retries + 1):
        response = ollama.generate(
            model="qwen2.5:7b-instruct-q4_K_M",
            prompt=prompt,
            options={
                "temperature": 0.3,  # V2.1: ハルシネーション抑制
                "top_p": 0.9,        # V2.1: 確率質量制限
                "num_predict": 30    # V2.1: 短文に制限
            }
        )
        
        result = response["response"].strip()
        
        # 改行があれば最初の行だけ
        if "\n" in result:
            result = result.split("\n")[0]
        
        # 余計な記号を削除
        result = result.strip('"「」')
        
        # 名前付きの場合、冒頭に名前を追加
        if model_name.strip() and not result.startswith(model_name):
            result = f"{model_name}さん、{result}"
        
        # V2.1 安全弁：フィルタチェック
        if _is_safe_comment(result):
            break
        elif attempt < max_retries:
            continue  # リトライ
    
    # 最終フィルタリング
    result = _apply_filters(result)
    
    # 空になったら安全フォールバック
    if len(result.strip()) < 3:
        if model_name.strip():
            result = f"{model_name}さん、素敵な一枚❤"
        else:
            result = "素敵な一枚❤"
    
    # 長すぎたら切る
    if len(result) > 22:
        result = result[:21] + "✨"
    
    return result


def _is_safe_comment(comment: str) -> bool:
    """コメントが安全かチェック（V2.1安全弁）"""
    import re
    
    # 英単語チェック（2文字以上の英単語）
    if re.search(r'[A-Za-z]{2,}', comment):
        return False
    
    # 色名チェック
    color_words = ["青系", "赤系", "白系", "黒系", "ピンク系", "緑系", "オレンジ系"]
    if any(c in comment for c in color_words):
        return False
    
    # NGワードチェック
    ng_words = ["卍", "マジ", "ぴえん", "草", "ww", "www", "神！", "やばすぎ"]
    if any(ng in comment for ng in ng_words):
        return False
    
    # 中国語チェック
    chinese_patterns = ["的", "是", "很", "了", "吗", "呢", "啊", "吧", "感谢", "拍手"]
    if any(p in comment for p in chinese_patterns):
        return False
    
    return True


def _apply_filters(comment: str) -> str:
    """最終フィルタリング（V2.1安全弁）"""
    import re
    
    # 英単語を削除
    comment = re.sub(r'[A-Za-z]{2,}', '', comment)
    
    # NGワード削除
    ng_words = ["卍", "マジ", "ぴえん", "草", "ww", "www"]
    for ng in ng_words:
        comment = comment.replace(ng, "")
    
    # 衣装関連は全て「コス」に統一
    costume_replacements = {
        "ジャージ": "コス",
        "Tシャツ": "コス", 
        "パーカー": "コス",
        "スウェット": "コス",
        "ワンピース": "コス",
        "私服": "コス",
        "衣装": "コス",
        "衣裳": "コス",
        "セーラー服": "コス",
        "ドレス": "コス",
        "服": "コス",
    }
    for old, new in costume_replacements.items():
        comment = comment.replace(old, new)
    
    # 中国語混入時はデフォルト
    chinese_patterns = ["的", "是", "很", "了", "吗", "呢", "啊", "吧", "感谢", "拍手"]
    if any(p in comment for p in chinese_patterns):
        return ""  # 空にして呼び出し元でフォールバック
    
    # 連続スペースを削除
    comment = re.sub(r'\s+', ' ', comment).strip()
    
    return comment


# =============================================================================
# サーバー起動
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    import torch
    
    print("\n🐯 Kotaro-Engine API Server")
    print("=" * 40)
    
    # GPU確認
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_total = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        print(f"🎮 GPU: {gpu_name} ({vram_total:.1f} GB)")
    else:
        print("⚠️ 警告: CUDAが利用不可！CPU推論になります")
    
    # Ollama GPU設定確認
    ollama_gpu = os.environ.get("OLLAMA_GPU_LAYERS", "未設定")
    if ollama_gpu == "未設定":
        print("⚠️ 警告: OLLAMA_GPU_LAYERS未設定（Ollamaがcpuかも）")
        print("   → start_kotaro.bat から起動してください")
    else:
        print(f"🔧 Ollama GPU Layers: {ollama_gpu}")
    
    print("=" * 40)
    print("起動中... http://localhost:8000")
    print("=" * 40)
    uvicorn.run(app, host="0.0.0.0", port=8000)
