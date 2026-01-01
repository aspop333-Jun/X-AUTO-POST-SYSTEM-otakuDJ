"""
Kotaro-Engine 統合テスト（写真付き）

使用方法:
    python test_kotaro_photo.py --image "path/to/photo.jpg" --name "栞"
"""

from kotaro_engine import KotaroEngine
from sentiment_bridge_lite import SentimentBridgeLite


def test_with_photo(image_path: str, model_name: str, count: int = 3):
    """写真を解析してKotaro-Engineで生成"""
    
    print("\n" + "=" * 50)
    print("🐯 Kotaro-Engine + 写真解析 テスト")
    print("=" * 50)
    
    # 写真解析
    print(f"\n📸 写真: {image_path}")
    bridge = SentimentBridgeLite()
    analysis = bridge.analyze_image(image_path)
    
    if analysis["face_detected"]:
        print(f"✅ 顔検出: 確信度 {analysis.get('confidence', 0):.1%}")
        print(f"📊 感情: {analysis['kotaro_emotion']}")
    else:
        print("⚠️ 顔が検出されませんでした（neutralで続行）")
    
    bridge.close()
    
    # Kotaro-Engine生成
    print(f"\n🐯 {model_name}さんへの18文字コメント:")
    print("-" * 40)
    
    engine = KotaroEngine()
    emotion = analysis.get("kotaro_emotion", "happy")
    
    for i in range(count):
        comment = engine.generate(model_name, emotion)
        print(f"  [{i+1}] {comment} ({len(comment)}文字)")
    
    print("-" * 40)
    print("=" * 50 + "\n")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Kotaro-Engine 写真テスト")
    parser.add_argument("--image", type=str, required=True, help="写真のパス")
    parser.add_argument("--name", type=str, default="栞", help="モデルさんの名前")
    parser.add_argument("--count", type=int, default=3, help="生成数")
    
    args = parser.parse_args()
    
    test_with_photo(args.image, args.name, args.count)


if __name__ == "__main__":
    main()
