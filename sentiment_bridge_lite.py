"""
SentimentBridge Simple: 写真解析なしの簡易版
まず動かすことを優先

使用方法:
    python sentiment_bridge_lite.py --image "path/to/image.jpg"
"""

from typing import Dict
import os

class SentimentBridgeLite:
    """写真から顔を検出してKotaro-Engineに連携（簡易版）"""
    
    def __init__(self):
        pass
    
    def analyze_image(self, image_path: str) -> Dict:
        """画像を解析（簡易版：ファイル存在確認のみ）"""
        
        # ファイル存在確認
        if not os.path.exists(image_path):
            return {
                "face_detected": False,
                "emotion": "neutral",
                "kotaro_emotion": "neutral"
            }
        
        # 今は常にhappyを返す（後で本格的な解析を追加）
        return {
            "face_detected": True,
            "confidence": 0.9,
            "emotion": "happy",
            "kotaro_emotion": "happy"
        }
    
    def close(self):
        pass


# CLI
def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="SentimentBridge Lite")
    parser.add_argument("--image", type=str, required=True, help="画像ファイルのパス")
    
    args = parser.parse_args()
    
    bridge = SentimentBridgeLite()
    
    print("\n🔍 SentimentBridge Lite v1.0 (Simple)")
    print("=" * 40)
    print(f"画像: {args.image}")
    print("-" * 40)
    
    result = bridge.analyze_image(args.image)
    
    print(f"  ファイル存在: {'✅' if result['face_detected'] else '❌'}")
    print(f"  Kotaro用: {result['kotaro_emotion']}")
    
    print("=" * 40)
    
    bridge.close()


if __name__ == "__main__":
    main()
