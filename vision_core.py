"""
Vision Core: MiniCPM-V 2.6 int4 画像解析モジュール
kotarou-engine 視覚認識コア

RTX 4060 (8GB VRAM) 最適化済み
- 4-bit量子化 (約7GB VRAM使用)
- 画像リサイズ (512px) によるVRAM節約
- 推論後VRAM解放

使用方法:
    from vision_core import VisionCore
    
    vision = VisionCore()
    result = vision.analyze("path/to/image.jpg")
"""

import torch
from PIL import Image
from pathlib import Path
from typing import Optional, Dict, Any
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# 設定値（指令書準拠）
# =============================================================================

CONFIG = {
    # モデル設定
    "model_id": "openbmb/MiniCPM-V-2_6-int4",
    
    # 画像前処理
    "max_image_size": 512,  # 長辺最大px（VRAM節約）
    
    # デコーディング設定（ハレーション抑制）
    "temperature": 0.3,      # 低温度 → 忠実度向上
    "top_p": 0.8,            # 確信度低い情報の排除
    "repetition_penalty": 1.2,  # ループ防止
    "max_new_tokens": 512,
}

# システムプロンプト（指令書準拠）
SYSTEM_PROMPT = """あなたはプロのフォトグラファー兼、優れた観察眼を持つライターです。
入力された画像に対し、以下の4項目を詳細に、かつ客観的に日本語で分析してください。

【重要ルール】
- 推測の禁止: 写っていないものを「おそらく〜だろう」と記述することを厳禁とする
- 低照度・過露出への対応: 画像が眩しすぎる/暗すぎる場合、その状態自体を「光に包まれた」「影に沈んだ」と事実として記述する
- 出力は箇条書きで記述する"""

USER_PROMPT = """この写真を以下の4項目で分析してください：

■ 主役の要素
人物の表情、ポーズ、視線、衣装の詳細を記述

■ 光と色の空気感
光の差し方（逆光、サイド光など）、色温度、全体のトーンを記述

■ 背景とシチュエーション
場所の特定、季節感、周囲のオブジェクトを記述

■ エモーショナル・キーワード
画像から感じ取れる「切なさ」「希望」「静寂」などの抽象的なキーワードを3つ程度"""


# =============================================================================
# VisionCore クラス
# =============================================================================

class VisionCore:
    """MiniCPM-V 2.6 int4 による画像解析"""
    
    def __init__(self, model_id: Optional[str] = None):
        """
        Args:
            model_id: HuggingFaceモデルID（デフォルト: openbmb/MiniCPM-V-2_6-int4）
        """
        self.model_id = model_id or CONFIG["model_id"]
        self.model = None
        self.tokenizer = None
        self._loaded = False
        
    def _load_model(self):
        """モデルを遅延ロード"""
        if self._loaded:
            return
        
        # CUDAチェック
        if not torch.cuda.is_available():
            raise RuntimeError("❌ CUDA is not available! GPU is required for MiniCPM-V inference.")
        
        device_name = torch.cuda.get_device_name(0)
        logger.info(f"🎮 GPU検出: {device_name}")
        logger.info(f"🔄 モデルロード中: {self.model_id}")
        
        from transformers import AutoModel, AutoTokenizer
        
        # int4量子化版はtrust_remote_codeが必須
        # device_map="cuda" でGPU推論を強制
        self.model = AutoModel.from_pretrained(
            self.model_id,
            trust_remote_code=True,
            device_map="cuda",  # 🔧 GPU推論を強制
            torch_dtype=torch.float16,  # 🔧 FP16でメモリ効率化
        )
        self.model.eval()
        
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_id,
            trust_remote_code=True,
        )
        
        self._loaded = True
        
        # デバイス確認ログ
        model_device = next(self.model.parameters()).device
        logger.info(f"✅ モデルロード完了 (デバイス: {model_device})")
        
        # VRAM使用量ログ
        vram_gb = torch.cuda.memory_allocated() / (1024 ** 3)
        vram_total = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        logger.info(f"📊 VRAM使用量: {vram_gb:.2f} GB / {vram_total:.1f} GB")
    
    def _preprocess_image(self, image_path: str) -> Image.Image:
        """画像の前処理（リサイズでVRAM節約）"""
        image = Image.open(image_path).convert("RGB")
        
        # 長辺をmax_image_sizeに制限
        max_size = CONFIG["max_image_size"]
        w, h = image.size
        
        if max(w, h) > max_size:
            if w > h:
                new_w = max_size
                new_h = int(h * max_size / w)
            else:
                new_h = max_size
                new_w = int(w * max_size / h)
            
            image = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
            logger.info(f"📐 画像リサイズ: {w}x{h} → {new_w}x{new_h}")
        
        return image
    
    def analyze(self, image_path: str) -> str:
        """
        画像を解析し、4項目のメタデータを生成
        
        Args:
            image_path: 画像ファイルのパス
            
        Returns:
            箇条書き形式の解析結果
        """
        # モデルを遅延ロード
        self._load_model()
        
        # 画像前処理
        image = self._preprocess_image(image_path)
        
        logger.info(f"📸 画像解析中: {Path(image_path).name}")
        
        # メッセージ構築
        msgs = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": [image, USER_PROMPT]},
        ]
        
        # 推論実行
        result = self.model.chat(
            image=None,
            msgs=msgs,
            tokenizer=self.tokenizer,
            sampling=True,
            temperature=CONFIG["temperature"],
            top_p=CONFIG["top_p"],
            repetition_penalty=CONFIG["repetition_penalty"],
            max_new_tokens=CONFIG["max_new_tokens"],
        )
        
        # VRAM解放
        self._clear_cache()
        
        logger.info("✅ 解析完了")
        
        return result
    
    def analyze_simple(self, image_path: str) -> str:
        """
        kotaro_api.py互換のシンプルな解析（褒め要素3項目）
        V2.1: 表情・仕草・雰囲気優先、衣装色は除外
        
        Args:
            image_path: 画像ファイルのパス
            
        Returns:
            JSON形式の褒め要素（expression, gesture, atmosphere）
        """
        self._load_model()
        image = self._preprocess_image(image_path)
        
        # V2.1プロンプト: 褒め要素のみ抽出（衣装色・背景禁止）
        simple_prompt = """あなたは人物写真の魅力を見つけるプロです。

【タスク】
この写真の人物の「褒めたくなるポイント」を3つ抽出してください。

【抽出する項目】
1. expression: 表情の魅力（例: はにかんだ笑顔、キラキラした目、優しい微笑み）
2. gesture: 仕草・ポーズの魅力（例: 可愛いピースサイン、堂々としたポーズ、セクシーな目線）
3. atmosphere: 全体の雰囲気（例: 透明感がある、オーラがすごい、癒し系）

【禁止事項】
- 背景の説明は絶対にしない
- 衣装の色（青系、赤系、白系など）は言及しない
- 固有名詞・ブランド名は使わない
- 英語は使わない

【出力形式】JSON形式で回答
{"expression": "...", "gesture": "...", "atmosphere": "..."}

日本語のみで回答してください："""
        
        msgs = [
            {"role": "user", "content": [image, simple_prompt]},
        ]
        
        result = self.model.chat(
            image=None,
            msgs=msgs,
            tokenizer=self.tokenizer,
            sampling=True,
            temperature=0.2,  # V2.1: ハルシネーション抑制
            top_p=0.9,        # V2.1: 確率質量制限
            max_new_tokens=128,
        )
        
        self._clear_cache()
        
        return result
    
    def analyze_v4(self, image_path: str) -> str:
        """
        V4.2互換のスコアリング分析 (A-E + Flags)
        kotaro_api.py の call_vlm_analysis_v4 と同等のロジック
        """
        self._load_model()
        image = self._preprocess_image(image_path)

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
        msgs = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": [image, user_prompt]},
        ]

        result = self.model.chat(
            image=None,
            msgs=msgs,
            tokenizer=self.tokenizer,
            sampling=True,
            temperature=0.3,
            max_tokens=512,
        )

        self._clear_cache()
        return result

    def _clear_cache(self):
        """VRAM解放"""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            logger.debug("🧹 VRAM キャッシュクリア")
    
    def unload(self):
        """モデルをアンロードしてVRAMを完全解放"""
        if self._loaded:
            del self.model
            del self.tokenizer
            self.model = None
            self.tokenizer = None
            self._loaded = False
            
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            logger.info("🔌 モデルアンロード完了")


# =============================================================================
# グローバルインスタンス（シングルトン）
# =============================================================================

_vision_core_instance: Optional[VisionCore] = None


def get_vision_core() -> VisionCore:
    """シングルトンインスタンスを取得"""
    global _vision_core_instance
    if _vision_core_instance is None:
        _vision_core_instance = VisionCore()
    return _vision_core_instance


def analyze_image_minicpm(image_path: str) -> str:
    """
    kotaro_api.py からの呼び出し用関数
    
    Args:
        image_path: 画像ファイルのパス
        
    Returns:
        画像解析結果（3項目）
    """
    vision = get_vision_core()
    return vision.analyze_simple(image_path)


# =============================================================================
# CLI テスト
# =============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="MiniCPM-V 2.6 Vision Core")
    parser.add_argument("--image", type=str, required=True, help="画像ファイルのパス")
    parser.add_argument("--mode", type=str, default="simple", choices=["simple", "full"],
                        help="解析モード: simple=3項目, full=4項目詳細")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 60)
    print("👁️  MiniCPM-V 2.6 Vision Core")
    print("=" * 60)
    
    vision = VisionCore()
    
    if args.mode == "full":
        result = vision.analyze(args.image)
    else:
        result = vision.analyze_simple(args.image)
    
    print("\n📋 解析結果:")
    print("-" * 40)
    print(result)
    print("-" * 40)
    
    vision.unload()
    print("=" * 60 + "\n")
