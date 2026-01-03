"""
Vision Core テスト - MiniCPM-V 2.6

使用方法:
    python test_vision_core.py
    python test_vision_core.py --image "path/to/image.jpg"
"""

import sys
import os
from pathlib import Path


def test_import():
    """インポートテスト"""
    print("\n📦 インポートテスト...")
    
    try:
        from vision_core import VisionCore, analyze_image_minicpm
        print("  ✅ vision_core インポート成功")
        return True
    except ImportError as e:
        print(f"  ❌ インポートエラー: {e}")
        return False


def test_dependencies():
    """依存パッケージテスト"""
    print("\n📦 依存パッケージテスト...")
    
    packages = [
        ("torch", "PyTorch"),
        ("transformers", "Transformers"),
        ("accelerate", "Accelerate"),
        ("bitsandbytes", "BitsAndBytes"),
        ("PIL", "Pillow"),
    ]
    
    all_ok = True
    for pkg, name in packages:
        try:
            __import__(pkg)
            print(f"  ✅ {name}")
        except ImportError:
            print(f"  ❌ {name} - インストールしてください")
            all_ok = False
    
    return all_ok


def test_cuda():
    """CUDA/GPU テスト"""
    print("\n🎮 CUDA テスト...")
    
    try:
        import torch
        
        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            vram_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            print(f"  ✅ GPU: {device_name}")
            print(f"  ✅ VRAM: {vram_total:.1f} GB")
            return True
        else:
            print("  ⚠️ CUDAが利用できません（CPUモードで動作）")
            return True  # CPU動作も許容
    except Exception as e:
        print(f"  ❌ エラー: {e}")
        return False


def test_model_load():
    """モデルロードテスト"""
    print("\n🔄 モデルロードテスト...")
    print("  ⏳ 初回は数分かかります...")
    
    try:
        from vision_core import VisionCore
        import torch
        
        vision = VisionCore()
        vision._load_model()
        
        if torch.cuda.is_available():
            vram_used = torch.cuda.memory_allocated() / (1024**3)
            print(f"  ✅ モデルロード成功")
            print(f"  📊 VRAM使用量: {vram_used:.2f} GB")
        else:
            print(f"  ✅ モデルロード成功 (CPUモード)")
        
        vision.unload()
        print("  ✅ モデルアンロード成功")
        
        return True
    except Exception as e:
        print(f"  ❌ モデルロードエラー: {e}")
        return False


def test_inference(image_path: str):
    """推論テスト"""
    print(f"\n📸 推論テスト: {Path(image_path).name}")
    
    if not Path(image_path).exists():
        print(f"  ❌ 画像ファイルが見つかりません: {image_path}")
        return False
    
    try:
        from vision_core import VisionCore
        import time
        
        vision = VisionCore()
        
        # シンプル解析（3項目）
        print("\n  🔍 シンプル解析（3項目）...")
        start = time.time()
        result_simple = vision.analyze_simple(image_path)
        elapsed_simple = time.time() - start
        
        print("  " + "-" * 40)
        print("  " + result_simple.replace("\n", "\n  "))
        print("  " + "-" * 40)
        print(f"  ⏱️ 処理時間: {elapsed_simple:.1f}秒")
        
        # フル解析（4項目）
        print("\n  🔍 フル解析（4項目）...")
        start = time.time()
        result_full = vision.analyze(image_path)
        elapsed_full = time.time() - start
        
        print("  " + "-" * 40)
        for line in result_full.split("\n"):
            print(f"  {line}")
        print("  " + "-" * 40)
        print(f"  ⏱️ 処理時間: {elapsed_full:.1f}秒")
        
        vision.unload()
        
        return True
    except Exception as e:
        print(f"  ❌ 推論エラー: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_integration():
    """kotaro_api.py 統合テスト"""
    print("\n🔗 API統合テスト...")
    
    try:
        from kotaro_api import analyze_image, USE_MINICPM
        
        print(f"  📌 USE_MINICPM = {USE_MINICPM}")
        
        if USE_MINICPM:
            print("  ✅ MiniCPM-V モードで動作します")
        else:
            print("  ⚠️ Ollama (Qwen2.5-VL) フォールバックモードです")
        
        return True
    except Exception as e:
        print(f"  ❌ APIインポートエラー: {e}")
        return False


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Vision Core テスト")
    parser.add_argument("--image", type=str, help="テスト用画像のパス")
    parser.add_argument("--skip-model", action="store_true", help="モデルロードテストをスキップ")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 60)
    print("👁️  MiniCPM-V 2.6 Vision Core テスト")
    print("=" * 60)
    
    results = []
    
    # 1. 依存パッケージテスト
    results.append(("依存パッケージ", test_dependencies()))
    
    # 2. CUDAテスト
    results.append(("CUDA/GPU", test_cuda()))
    
    # 3. インポートテスト
    results.append(("インポート", test_import()))
    
    # 4. モデルロードテスト
    if not args.skip_model:
        results.append(("モデルロード", test_model_load()))
    
    # 5. API統合テスト
    results.append(("API統合", test_api_integration()))
    
    # 6. 推論テスト（画像が指定された場合）
    if args.image:
        results.append(("推論", test_inference(args.image)))
    
    # 結果サマリー
    print("\n" + "=" * 60)
    print("📋 テスト結果サマリー")
    print("-" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status} - {name}")
        if not passed:
            all_passed = False
    
    print("-" * 60)
    if all_passed:
        print("🎉 すべてのテストに合格しました！")
    else:
        print("⚠️ 一部のテストに失敗しました")
    print("=" * 60 + "\n")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
