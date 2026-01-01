"""
SentimentBridge: 写真から感情を抽出してKotaro-Engineに連携

使用方法:
    python sentiment_bridge.py --image "path/to/image.jpg"
"""

import cv2
import numpy as np
from typing import Dict, Optional, Tuple

# DeepFace は重いので遅延インポート
_deepface = None

def get_deepface():
    global _deepface
    if _deepface is None:
        from deepface import DeepFace
        _deepface = DeepFace
    return _deepface


class SentimentBridge:
    """写真から感情を抽出してKotaro-Engineに連携"""
    
    # DeepFaceの感情 → Kotaro-Engineの感情へのマッピング
    EMOTION_MAP = {
        "happy": "happy",
        "sad": "neutral",
        "angry": "neutral",
        "surprise": "surprise",
        "fear": "neutral",
        "disgust": "neutral",
        "neutral": "neutral",
    }
    
    def __init__(self):
        self.last_analysis = None
    
    def analyze_image(self, image_path: str) -> Dict:
        """画像から感情を分析"""
        
        DeepFace = get_deepface()
        
        try:
            # 感情分析を実行
            result = DeepFace.analyze(
                img_path=image_path,
                actions=["emotion"],
                enforce_detection=True,
                detector_backend="opencv"  # 軽量なバックエンド
            )
            
            if isinstance(result, list):
                result = result[0]
            
            # 感情スコアを取得
            emotions = result.get("emotion", {})
            dominant = result.get("dominant_emotion", "neutral")
            
            self.last_analysis = {
                "raw_emotions": emotions,
                "dominant": dominant,
                "kotaro_emotion": self.EMOTION_MAP.get(dominant, "neutral"),
                "confidence": emotions.get(dominant, 0)
            }
            
            return self.last_analysis
            
        except Exception as e:
            print(f"[SentimentBridge] 分析エラー: {e}")
            return {
                "raw_emotions": {},
                "dominant": "neutral",
                "kotaro_emotion": "neutral",
                "confidence": 0
            }
    
    def analyze_image_bytes(self, image_bytes: bytes) -> Dict:
        """バイトデータから感情を分析"""
        
        # NumPy配列に変換
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # 一時ファイルに保存（DeepFaceはパスが必要）
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            cv2.imwrite(f.name, img)
            result = self.analyze_image(f.name)
            os.unlink(f.name)
        
        return result
    
    def get_prompt_modifier(self, analysis: Dict) -> str:
        """分析結果からプロンプト修飾子を生成"""
        
        emotion = analysis.get("kotaro_emotion", "neutral")
        confidence = analysis.get("confidence", 0)
        
        modifiers = {
            "happy": "満面の笑みを称えよ",
            "neutral": "静かな美しさを讃えよ",
            "surprise": "鮮烈な表情を捉えよ",
        }
        
        modifier = modifiers.get(emotion, modifiers["neutral"])
        
        if confidence > 80:
            modifier = f"【確信度{confidence:.0f}%】{modifier}"
        
        return modifier


# =============================================================================
# CLI
# =============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="SentimentBridge: 写真から感情を抽出")
    parser.add_argument("--image", type=str, required=True, help="画像ファイルのパス")
    
    args = parser.parse_args()
    
    bridge = SentimentBridge()
    
    print("\n🔍 SentimentBridge v1.0")
    print("=" * 40)
    print(f"画像: {args.image}")
    print("-" * 40)
    
    result = bridge.analyze_image(args.image)
    
    print(f"  検出された感情: {result['dominant']}")
    print(f"  Kotaro用: {result['kotaro_emotion']}")
    print(f"  確信度: {result['confidence']:.1f}%")
    print(f"  プロンプト: {bridge.get_prompt_modifier(result)}")
    
    print("=" * 40)


if __name__ == "__main__":
    main()
