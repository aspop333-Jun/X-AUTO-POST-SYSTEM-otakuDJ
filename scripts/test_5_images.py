#!/usr/bin/env python3
"""5枚の写真でKotaro APIをテスト"""
import requests
import json
import sys
import os

API_URL = "http://localhost:8000/generate"
IMAGE_DIR = "Xpost-EX/pattern_images"

def test_image(image_path, name="テスト"):
    """画像をテストして結果を表示"""
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            data = {'name': name, 'count': '1'}
            response = requests.post(API_URL, files=files, data=data, timeout=60)
        
        result = response.json()
        
        if result.get('success'):
            pattern = result['pattern']
            sub_scores = result.get('sub_scores', {})
            detected = result.get('detected_criteria', [])
            comments = result.get('comments', [])
            
            print(f"📸 {os.path.basename(image_path)}")
            print(f"   パターン: {pattern['id']} ({pattern['name']})")
            print(f"   トリガー: {pattern['trigger']}")
            print(f"   4連単: {pattern.get('sub_ranking', [])}")
            print(f"   サブスコア: きれい={sub_scores.get('きれい',0)}, かわいい={sub_scores.get('かわいい',0)}, クール={sub_scores.get('クール',0)}, 親近感={sub_scores.get('親近感',0)}")
            print(f"   検出数: {len(detected)}/60")
            print(f"   コメント: {comments[0] if comments else 'なし'}")
            print()
            return True
        else:
            print(f"❌ {os.path.basename(image_path)}: {result.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"❌ {os.path.basename(image_path)}: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🐯 Kotaro API 5枚テスト")
    print("=" * 60)
    print()
    
    # 5枚の画像をテスト
    success_count = 0
    for i in range(1, 6):
        image_path = f"{IMAGE_DIR}/pattern_{i:02d}.png"
        if os.path.exists(image_path):
            if test_image(image_path):
                success_count += 1
        else:
            print(f"⚠️ {image_path} が見つかりません")
    
    print("=" * 60)
    print(f"結果: {success_count}/5 成功")
    print("=" * 60)
