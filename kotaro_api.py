"""
Kotaro-Engine API Server (V4.2 + Gemini Hybrid)
==============================
5要素 (A-E) × 0〜5点 + 4連単方式によるパターン判定 (Local LLM)
+ Gemini API による汎用コメント生成 (Hybrid)

設計思想:
- 写真は「誤解」してよい
- ただし誤解の仕方を12通りに制御する
- 正しさより、刺さり
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import uvicorn
import base64
import tempfile
import os
import json
import logging
import time
from typing import List, Dict, Any, Optional
from kotaro_scoring_v4 import KotaroScorerV4
from openai import AsyncOpenAI
import random
import google.generativeai as genai
from dotenv import load_dotenv
import re

# 環境変数を読み込む
load_dotenv()

# ロガー設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kotaro_api_v4")

# Gemini API設定
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# =============================================================================
# コメント重複防止キャッシュ（1時間TTL）
# =============================================================================

class CommentCache:
    """1時間以内に使用されたコメントをブロックするキャッシュ"""
    
    # 絵文字パターン（Unicode絵文字を除去）
    EMOJI_PATTERN = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002702-\U000027B0"  # dingbats
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U00002600-\U000026FF"  # misc symbols
        "\U0001FA00-\U0001FA6F"  # chess, etc
        "]+", flags=re.UNICODE
    )
    
    def __init__(self, ttl_seconds: int = 3600):  # デフォルト1時間
        self.cache: Dict[str, float] = {}  # {comment: timestamp}
        self.ttl = ttl_seconds
    
    def _cleanup(self):
        """期限切れエントリを削除（キャッシュ肥大化防止）"""
        now = time.time()
        self.cache = {k: v for k, v in self.cache.items() if now - v < self.ttl}
    
    def _normalize(self, comment: str) -> str:
        """絵文字を除去して正規化（絵文字違いでも同じ文言はブロック）"""
        text = self.EMOJI_PATTERN.sub('', comment)
        return text.strip().lower()
    
    def is_duplicate(self, comment: str) -> bool:
        """コメントが1時間以内に使用されたかチェック"""
        self._cleanup()
        normalized = self._normalize(comment)
        return normalized in self.cache
    
    def add(self, comment: str):
        """コメントをキャッシュに追加"""
        self._cleanup()
        normalized = self._normalize(comment)
        self.cache[normalized] = time.time()
    
    def size(self) -> int:
        """現在のキャッシュサイズ"""
        self._cleanup()
        return len(self.cache)

# グローバルキャッシュインスタンス
comment_cache = CommentCache(ttl_seconds=3600)  # 1時間

app = FastAPI(title="Kotaro-Engine API (V4.2 + Gemini)")


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# V4.2 スコアラー
scorer = KotaroScorerV4()

# VLM設定 (LMDeploy)
LMDEPLOY_API_URL = "http://localhost:23334/v1"
LMDEPLOY_API_KEY = "dummy"

# OpenAI Client (Async)
client = AsyncOpenAI(api_key=LMDEPLOY_API_KEY, base_url=LMDEPLOY_API_URL)

# =============================================================================
# Gemini Logic (Merged from api/main.py)
# =============================================================================

class CommentRequest(BaseModel):
    """コメント生成リクエスト (Gemini)"""
    booth_name: str = "ブース"
    role: str = "モデル"
    category: str = "ブース"
    expression_type: str = "笑顔"
    focus_point: str = "表情"
    context_match: str = "ブースの雰囲気"
    image_base64: Optional[str] = None  # オプション: 画像データ

class CommentResponse(BaseModel):
    """コメント生成レスポンス (Gemini)"""
    comment: str
    source: str  # "ai" or "rule_based"

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


# =============================================================================
# VLM分析 (A-E採点 + V4フラグ検出) - Local LLM
# =============================================================================
async def call_vlm_analysis_v4(image_path: str) -> Dict[str, Any]:
    """VLMに画像を投げてA-Eスコアと二次加点用フラグを取得"""
    
    with open(image_path, "rb") as f:
        b64_img = base64.b64encode(f.read()).decode("utf-8")
    
    system_prompt = """# Kotaro VLM Analysis Protocol
## 0. 位置づけ（最上位）
本プロトコルは虎太郎エンジン最上位制御文書に従う構造的分析指示である。
- 感情を盛らない
- 推測しない
- 定義済みパターンに基づき構造的に判断する

## 1. 出力条件
- JSON形式のみを出力
- 抽象語・逃げワード禁止
- 説明文禁止
---
"""

    user_prompt = """<task>
画像を構造的に分析し、5要素(A-E)を0-5で採点、フラグ(flags)をtrue/falseで判定せよ。
</task>

<scoring_rules>
## 採点基準（0-5点）
### A: 表情の確定遅延（余韻）
- 0=表情固定
- 5=余韻・揺らぎあり

### B: 視線の意図未決定（構図）
- 0=明確
- 5=視線・構図が散っている

### C: 顔パーツ感情非同期（クール/ギャップ）
- 0=感情一致
- 5=目と口で違う・ポーズが強い

### D: 緊張と緩和の同時存在（温度）
- 0=冷たい・緊張のみ
- 5=温かい・癒やし・安心

### E: 親近感（身体所作ポイント合計、0-15→0-5正規化）
以下の所作を検出し、ポイントを加算:
- E01_hand_near_face: 顔or頭付近で手ポーズ → 5点
- E02_hand_pose: 顔以外で手ポーズ → 3点
- E03_mouth_open: 口が開いている → 2点
- E04_heart_sign: 手でハートマーク → 5点
E = round((合計ポイント / 15) * 5)
</scoring_rules>

<flag_rules>
## フラグ判定基準（true/false）

### 雰囲気フラグ（厳格判定）
- casual_moment: ふとした瞬間。ただしpose_safe_theory=trueなら基本false
- nostalgic: フィルム写真のような思い出感
- crowd_venue: イベント会場、人混み、ブース背景
- group_feeling: 複数人、または「仲間」を感じる

### 表情・ポーズフラグ（厳格判定）
- talk_to: 口が開いている OR 手がカメラ方向 OR 目線がカメラに刺さっている。どれも無ければfalse
- close_dist: カメラとの距離が物理的にかなり近い
- costume_strong: 衣装、コスプレ、役作りが非常に強い
- act_point_or_salute: 指差し、敬礼、手を伸ばすなどの明確なアクション
- prop_strong: 傘、看板、配布物などの「物」が目立っている

### 体と顔の向き（１つのみtrue）
- pose_safe_theory: 体は斜めで、顔だけカメラを向いている（無難・セオリー）
- pose_front_true: 体も顔も真正面を向いている（親密・強）
- pose_side_cool: 体は斜めで、顔も斜めや横を向いている（クール）
- pose_front_body_face_angled: 体は正面だが、顔は斜めを向いている
</flag_rules>

<output_format>
## 出力形式（厳守）
```json
{
    "scores": {"A": 3, "B": 4, "C": 2, "D": 1, "E": 5},
    "flags": {
        "casual_moment": true,
        "nostalgic": false,
        "crowd_venue": false,
        "group_feeling": false,
        "talk_to": true,
        "close_dist": true,
        "costume_strong": false,
        "act_point_or_salute": false,
        "prop_strong": false,
        "pose_safe_theory": true,
        "pose_front_true": false,
        "pose_side_cool": false,
        "pose_front_body_face_angled": false
    }
}
```
</output_format>

## Final Output
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
            max_tokens=512, # フラグ分増やす
        )
        
        content = completion.choices[0].message.content
        logger.info(f"VLM Raw Response: {content}")
        
        # JSONパース
        clean_content = content.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean_content)
        
        base_scores = result.get("scores", {"A":3, "B":3, "C":3, "D":3, "E":3})
        flags = result.get("flags", {})
        
        return base_scores, flags
        
    except Exception as e:
        logger.error(f"VLM Error: {e}")
        # フォールバック
        return {"A": 3, "B": 3, "C": 3, "D": 3, "E": 3}, {}


# =============================================================================
# コメント生成 (V3.0) - 修正版
# =============================================================================

# パターン別の実例コメント（モデルさんを褒める！構図/背景ではなく人を褒める）
PATTERN_EXAMPLES = {
    "P01": ["表情がたまらん…好き❤", "この笑顔いいね！惹かれる✨", "なんか雰囲気いい。見てられる😊"],
    "P02": ["ポーズ決まってる！かっこいい✨", "存在感やばい！キマッてる😍", "かっこいいね。さすがだわ❤"],
    "P03": ["立ち姿がきれい！映えてる✨", "この笑顔ほんと好き😊", "かわいすぎる！絵になるね❤"],
    "P04": ["楽しそうでいいね！笑顔最高😊", "ノリいい！こういうの好き✨", "元気もらえる！かわいい❤"],
    "P05": ["目力やばい…かっこいい✨", "クールでいい！かっこいいね😊", "鋭い表情がたまらん😍"],
    "P06": ["衣装似合いすぎる！！", "役に入ってる感がすごい✨", "キャラがハマってる！かわいい😊"],
    "P07": ["二人ともかわいい！最高✨", "仲良さそう！ほっこりする😊", "いい組み合わせだね！❤"],
    "P08": ["ニコニコ可愛い😆癒される〜", "笑顔いいね！元気もらえる✨", "明るくていい！好き❤"],
    "P09": ["笑顔が癒される😊ほっとする", "穏やかでいい。好きだわ✨", "安心感ある。かわいい❤"],
    "P10": ["動きがかっこいい！✨", "アクションいいね！決まってる😊", "躍動感がすごい！かっこいい❤"],
    "P11": ["近い…ドキッとする❤", "この表情いいね。好き😊", "なんか惹かれる✨"],
    "P12": ["楽しそうでいいね😊", "笑顔が素敵！✨", "いい瞬間だね。かわいい❤"],
}

async def call_kotaro_generation_v3(pattern_info: Dict, element_scores: Dict[str, int], name: str) -> str:
    """V3.0: パターン情報とA-Eスコアからコメントを生成（修正版）"""
    
    # パターンIDを取得（P01〜P12形式に変換）
    pattern_id = pattern_info.get('id', 'P01')
    if pattern_id not in PATTERN_EXAMPLES:
        pattern_id = 'P01'  # フォールバック
    
    # 実例コメントを取得
    examples = PATTERN_EXAMPLES.get(pattern_id, PATTERN_EXAMPLES['P01'])
    examples_text = "\n".join([f"・{ex}" for ex in examples])
    
    # 名前の呼び方を決定
    name_call = f"{name}さん" if name else ""
    
    system_prompt = """# Kotaro Comment Generation Protocol

## 0. 位置づけ（最上位）
本プロトコルは虎太郎エンジン最上位制御文書に従うコメント生成指示である。

## 1. 思想レベル禁止事項
- 感情を盛る・脚色する行為は禁止
- 抽象的逃げワード（エモい、尊い、最高すぎる等）は禁止
- 一人称・呼称の使用は禁止

## 2. 出力制約
### 必須条件
- 18-35文字の短文1つのみ
- 絵文字は1つまで
- 被写体を構造的に褒める

### 禁止出力
- 「モデルさん」「あなた」「貴方」等の呼称
- 「俺」「私」「僕」等の一人称
- 「純米」「虎太郎」等の自己言及
- 構図・背景・イベントを褒める文
- 「〜ですね」「〜ますね」の丁寧すぎる語尾
---
"""

    user_prompt = f"""<reference>
{examples_text}
</reference>

<constraints>
- 上記参考例と同等の長さ・雰囲気で生成
- 呼称・一人称は絶対禁止
- 構図・背景を褒めるのは禁止
</constraints>

## Final Output
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        completion = await client.chat.completions.create(
            model="Qwen2-VL-2B-Instruct",
            messages=messages,
            temperature=0.7,  # 憲法推奨値（構造維持優先）
            max_tokens=64,    # 短いコメントなので少なめに
        )
        
        raw = completion.choices[0].message.content.strip()
        
        # クリーンアップ: 引用符、改行、余計な文字を除去
        comment = raw.replace('"', '').replace("'", '').replace('\n', '').strip()
        
        # ハレーション検出: 禁止パターン
        hallucination_patterns = [
            # ① 自己言及（絶対禁止）
            "虎太郎", "純米", "俺", "私が", "僕が", "私は", "僕は", "私の",
            # ② 呼称禁止（絶対禁止）
            "モデルさん", "あなた", "貴方", "お嬢さん", "お姉さん",
            # ③ 不自然な日本語（馬鹿にしているように聞こえる）
            "極み", "完璧", "素晴らしい", "一番ですね", "最高ですね",
            "ますね", "でしょうか", "ございます",
            "まるで", "のように", "ているように",
            # ④ 場面/構図を褒める（モデルを褒めろ！）
            "構図が", "背景が", "背景との", "イベント感", "情報量",
            "世界観が", "空気が", "場の", "お写真は", "写真が",
            # ⑤ プロンプト漏れ（構造違反）
            "コメントを生成", "絶対に使わない",
            "参考コメント", "上記の例", "出力形式", "短いコメント",
            "【", "】", "・", "「", "」", "- ",
            # ⑥ 無関係な内容（ハレーション）
            "愛犬", "犬", "猫", "ペット", "手足を合わせて", "朝から夕まで",
        ]
        
        is_hallucination = False
        hallucination_reason = ""
        
        for pattern in hallucination_patterns:
            if pattern in comment:
                hallucination_reason = f"禁止パターン: '{pattern}'"
                is_hallucination = True
                break
        
        # 長すぎるコメントもハレーションの可能性
        if not is_hallucination and len(comment) > 50:
            hallucination_reason = f"長すぎる ({len(comment)}文字)"
            is_hallucination = True
        
        # 絵文字連続検出（✨✨✨...など）
        import re
        if not is_hallucination and re.search(r'(.)\1{2,}', comment):  # 同じ文字が3回以上連続
            hallucination_reason = "文字/絵文字の連続"
            is_hallucination = True
        
        # ハレーション時はフォールバック
        if is_hallucination:
            logger.warning(f"Hallucination detected ({hallucination_reason}): '{comment[:40]}...'")
            comment = random.choice(examples)
        
        # 空になったらフォールバック
        if not comment or len(comment) < 5:
            comment = random.choice(examples)
        
        # 重複キャッシュチェック（1時間以内に使用されたコメントをブロック）
        if comment_cache.is_duplicate(comment):
            logger.warning(f"Duplicate blocked: '{comment[:30]}...' (cache: {comment_cache.size()})")
            found_fallback = False
            
            # Step 1: 同じパターンのサンプルから探す
            for fallback in random.sample(examples, len(examples)):
                if not comment_cache.is_duplicate(fallback):
                    comment = fallback
                    found_fallback = True
                    logger.info(f"Using same-pattern fallback: '{fallback[:20]}...'")
                    break
            
            # Step 2: 同じパターンが全て使用済み → 他パターンから借りる
            if not found_fallback:
                all_examples = []
                for pid, exs in PATTERN_EXAMPLES.items():
                    if pid != pattern_id:  # 他のパターンから
                        all_examples.extend(exs)
                random.shuffle(all_examples)
                
                for fallback in all_examples:
                    if not comment_cache.is_duplicate(fallback):
                        comment = fallback
                        found_fallback = True
                        logger.info(f"Using cross-pattern fallback: '{fallback[:20]}...'")
                        break
            
            # Step 3: それでも見つからない（全36+サンプルが1時間以内に使用済み）
            if not found_fallback:
                # ユニークなタイムスタンプを付けて強制的にユニーク化
                unique_suffix = f"_{int(time.time()) % 1000}"
                comment = random.choice(examples).rstrip("❤✨😊😍") + unique_suffix + random.choice(["❤", "✨"])
                logger.warning(f"All examples exhausted, forced unique: '{comment}'")
        
        # 使用したコメントをキャッシュに追加
        comment_cache.add(comment)
        logger.info(f"Cache add: '{comment[:25]}...' (total: {comment_cache.size()})")
        
        return comment
        
    except Exception as e:
        logger.error(f"Comment Generation Error: {e}")
        fallback = random.choice(examples)
        comment_cache.add(fallback)
        return fallback  # フォールバック




# =============================================================================
# APIエンドポイント
# =============================================================================
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "4.2",
        "engine": "kotaro_v4_hybrid",
        "gemini_enabled": bool(GEMINI_API_KEY)
    }


@app.post("/generate")
async def generate_comment(
    image: UploadFile = File(...),
    name: str = Form(default=""),
    count: int = Form(default=1)
):
    """V4.2 コメント生成エンドポイント (Local LLM)"""
    
    # 画像一時保存
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        content = await image.read()
        tmp.write(content)
        tmp_path = tmp.name
        
    try:
        # 1. VLM分析（A-E採点 + フラグ）
        logger.info("Calling VLM for V4 analysis...")
        base_scores, flags = await call_vlm_analysis_v4(tmp_path)
        logger.info(f"Base Scores: {base_scores}")
        logger.info(f"Flags: {flags}")
        
        # 2. 二次加点 (分布散らし)
        logger.info("Applying secondary scoring...")
        adj_scores = scorer.apply_secondary_scoring(base_scores, flags)
        logger.info(f"Adjusted Scores: {adj_scores}")
        
        # 3. パターン決定 (V4.2決定木)
        logger.info("Determining pattern (V4.2)...")
        pattern_result = scorer.decide_pattern(adj_scores, flags)
        pattern_id = pattern_result["pattern_id"]
        pattern_info = scorer.get_pattern_info(pattern_id)
        
        logger.info(f"Pattern: {pattern_id} ({pattern_info['name']})")
        logger.info(f"Result: {pattern_result}")
        
        # 4. コメント生成
        logger.info("Generating Kotaro comment...")
        comments = []
        
        for i in range(count):
            comment = await call_kotaro_generation_v3(pattern_info, adj_scores, name)
            comments.append(comment)
        
        # レスポンス構築
        return {
            "success": True,
            "version": "4.2",
            "pattern": {
                "id": pattern_id,
                "name": pattern_info["name"],
                "attack": pattern_result.get("attack", pattern_info["attack"]),
                "trigger": pattern_info["attack"],
                "sub_ranking": pattern_result["sub4"].split(">"),
                "bone": pattern_info["bone"],
                "mods": pattern_result["mods"]
            },
            "element_scores": adj_scores,  # V4.2 Adjusted Scores
            "base_scores": base_scores,    # Raw Scores
            "flags": [k for k, v in flags.items() if v],
            "comments": comments,
        }
        
    except Exception as e:
        logger.error(f"Generation Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        os.remove(tmp_path)


@app.post("/generate-comment", response_model=CommentResponse)
async def generate_gemini_comment(request: CommentRequest):
    """
    一言コメントを生成 (Gemini Hybrid)

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
        prompt = build_gemini_prompt(request, has_image)

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
        logger.error(f"Gemini API error: {e}")
        # エラー時はルールベースでフォールバック
        comment = generate_fallback_comment(request.expression_type)
        return CommentResponse(comment=comment, source="rule_based")


# =============================================================================
# フィードバックAPI（コメント学習用）
# =============================================================================
FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), "feedback_likes.json")

class FeedbackRequest(BaseModel):
    comment: str
    pattern: str = "unknown"
    timestamp: str = ""

@app.post("/feedback/like")
async def save_feedback(request: FeedbackRequest):
    """いいねされたコメントを保存（将来の学習用）"""
    try:
        # 既存のフィードバックを読み込み
        feedback_data = []
        if os.path.exists(FEEDBACK_FILE):
            with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
                feedback_data = json.load(f)
        
        # 新しいフィードバックを追加
        feedback_data.append({
            "comment": request.comment,
            "pattern": request.pattern,
            "timestamp": request.timestamp or time.strftime("%Y-%m-%dT%H:%M:%S"),
            "liked_at": time.strftime("%Y-%m-%dT%H:%M:%S")
        })
        
        # 最新1000件のみ保持（肥大化防止）
        if len(feedback_data) > 1000:
            feedback_data = feedback_data[-1000:]
        
        # 保存
        with open(FEEDBACK_FILE, 'w', encoding='utf-8') as f:
            json.dump(feedback_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Feedback saved: '{request.comment[:30]}...' (pattern: {request.pattern}, total: {len(feedback_data)})")
        
        return {"success": True, "total_likes": len(feedback_data)}
    
    except Exception as e:
        logger.error(f"Feedback save error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/feedback/stats")
async def get_feedback_stats():
    """フィードバック統計を取得"""
    try:
        if not os.path.exists(FEEDBACK_FILE):
            return {"total": 0, "by_pattern": {}}
        
        with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
            feedback_data = json.load(f)
        
        # パターン別集計
        by_pattern = {}
        for item in feedback_data:
            p = item.get("pattern", "unknown")
            by_pattern[p] = by_pattern.get(p, 0) + 1
        
        return {
            "total": len(feedback_data),
            "by_pattern": by_pattern,
            "recent": feedback_data[-10:] if len(feedback_data) > 0 else []
        }
    except Exception as e:
        logger.error(f"Feedback stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
if __name__ == "__main__":
    print("\n🐯 Kotaro-Engine API Server (V4.2 + Gemini)")
    print(f"   VLM: {LMDEPLOY_API_URL}")
    print("   Mode: Hybrid (Local + Gemini)")
    print("=" * 40)
    uvicorn.run(app, host="0.0.0.0", port=8000)
