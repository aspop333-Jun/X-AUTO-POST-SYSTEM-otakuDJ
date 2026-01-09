"""
Kotaro-Engine: 18文字エモコメント生成エンジン
CANDY虎太郎MD v2.1 準拠

使用方法:
    python kotaro_engine.py --image "path/to/image.jpg" --name "栞"
"""

import ollama
import random
import re
from typing import Optional, Dict, List

# =============================================================================
# CANDY虎太郎MD v2.1 設定
# =============================================================================

# NGワード（物理的に禁止）
NG_WORDS = [
    "死", "バグ", "壊", "悲", "止", 
    "光", "空気", "静寂", "影",
    "プロ", "仕事", "頑張", "努力",
    "素敵", "最高", "すごい",
    "ただただ", "驚愕", "圧倒", "感動"
]

# 90点例文（Few-shot用）- 虎太郎スタイル
# DJ/HipHop/カメラ/ライター/会社代表/永遠の30代おっさん
EXAMPLES = {
    "happy": [
        "栞さんマジ可愛い、優勝✨",
        "栞さんの笑顔、これは神回📸",
        "栞さん撮れたの最高すぎる✨",
        "栞さんいい笑顔もらった📸",
        "栞さん、今日もブチ上げ✨",
        "栞さんの笑顔でアガる📸",
    ],
    "neutral": [
        "栞さん美しい、マジで✨",
        "栞さんの表情、ヤバすぎ📸",
        "栞さん綺麗、言葉いらん✨",
        "栞さん撮れて幸せだわ📸",
    ],
    "surprise": [
        "栞さんヤバい、これは優勝✨",
        "栞さんいい表情きた📸",
        "栞さん、神ショットいただき✨",
    ]
}

# =============================================================================
# コアエンジン
# =============================================================================

class KotaroEngine:
    """18文字エモコメント生成エンジン"""
    
    def __init__(self, model: str = "qwen2.5:7b-instruct-q4_K_M"):
        self.model = model
        self.max_length = 18
        
    def _build_prompt(self, model_name: str, emotion: str = "happy") -> str:
        """虎太郎プロンプトを構築"""
        
        # Few-shot例文を選択
        examples = EXAMPLES.get(emotion, EXAMPLES["happy"])
        few_shot = "\n".join([f"- {ex.replace('栞', model_name)}" for ex in random.sample(examples, min(4, len(examples)))])
        
        prompt = f"""虎太郎として{model_name}さんの写真に一言。
虎太郎＝落ち着きのあるパリピ。

【特徴】
- ノリはいいけど騒がしくない
- 褒め方がカッコいい
- 18文字で刺さる

【お手本】
{few_shot}

【出力】18文字以内で1つ："""
        
        return prompt
    
    def _validate_output(self, text: str) -> bool:
        """出力のバリデーション"""
        # 文字数チェック
        if len(text) > self.max_length:
            return False
        
        # NGワードチェック
        for ng in NG_WORDS:
            if ng in text:
                return False
        
        return True
    
    def _clean_output(self, text: str) -> str:
        """出力のクリーニング"""
        # 改行を除去
        text = text.replace("\n", "").strip()
        
        # 複数行の場合は最初の行のみ
        if "。" in text:
            parts = text.split("。")
            text = parts[0] + "。" if len(parts[0]) < 15 else parts[0]
        
        # 絵文字がなければ追加
        if "✨" not in text and "📸" not in text:
            if len(text) <= 16:
                text += "✨"
        
        return text[:self.max_length]
    
    def generate(self, model_name: str, emotion: str = "happy", max_retries: int = 3) -> str:
        """18文字コメントを生成"""
        
        prompt = self._build_prompt(model_name, emotion)
        
        for attempt in range(max_retries):
            try:
                response = ollama.generate(
                    model=self.model,
                    prompt=prompt,
                    options={
                        "temperature": 0.8,
                        "top_p": 0.9,
                        "num_predict": 50,  # 短く制限
                    }
                )
                
                raw_output = response["response"]
                cleaned = self._clean_output(raw_output)
                
                if self._validate_output(cleaned):
                    return cleaned
                    
            except Exception as e:
                print(f"[Kotaro] 生成エラー (試行 {attempt + 1}): {e}")
        
        # フォールバック
        fallback = random.choice(EXAMPLES.get(emotion, EXAMPLES["happy"]))
        return fallback.replace("栞", model_name)[:self.max_length]


# =============================================================================
# CLI
# =============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Kotaro-Engine: 18文字エモコメント生成")
    parser.add_argument("--name", type=str, default="栞", help="モデルさんの名前")
    parser.add_argument("--emotion", type=str, default="happy", choices=["happy", "neutral", "surprise"])
    parser.add_argument("--count", type=int, default=1, help="生成数")
    
    args = parser.parse_args()
    
    engine = KotaroEngine()
    
    print("\n🐯 Kotaro-Engine v1.0")
    print("=" * 40)
    
    for i in range(args.count):
        comment = engine.generate(args.name, args.emotion)
        print(f"  [{i+1}] {comment} ({len(comment)}文字)")
    
    print("=" * 40)


if __name__ == "__main__":
    main()
