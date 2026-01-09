"""
Kotaro-Engine 統合テスト

使用方法:
    python test_kotaro.py
"""

from kotaro_engine import KotaroEngine


def test_basic_generation():
    """基本的な生成テスト"""
    
    print("\n" + "=" * 50)
    print("🐯 Kotaro-Engine 統合テスト")
    print("=" * 50)
    
    engine = KotaroEngine()
    
    test_cases = [
        ("栞", "happy"),
        ("Ely", "neutral"),
        ("川井栞", "surprise"),
    ]
    
    all_passed = True
    
    for name, emotion in test_cases:
        print(f"\n【テスト】{name}さん ({emotion})")
        print("-" * 30)
        
        for i in range(3):
            comment = engine.generate(name, emotion)
            length = len(comment)
            
            # バリデーション
            is_valid = length <= 18
            status = "✅" if is_valid else "❌"
            
            print(f"  {status} [{length}文字] {comment}")
            
            if not is_valid:
                all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✅ すべてのテストに合格しました！")
    else:
        print("❌ 一部のテストに失敗しました")
    print("=" * 50 + "\n")
    
    return all_passed


def test_ng_words():
    """NGワードテスト"""
    
    print("\n🚫 NGワードテスト")
    print("-" * 30)
    
    # NGワードを含む生成が出ないことを確認
    engine = KotaroEngine()
    
    ng_found = False
    ng_words = ["死", "バグ", "壊", "素敵", "最高", "プロ"]
    
    for _ in range(10):
        comment = engine.generate("テスト", "happy")
        for ng in ng_words:
            if ng in comment:
                print(f"  ❌ NGワード検出: {ng} in '{comment}'")
                ng_found = True
    
    if not ng_found:
        print("  ✅ NGワードなし！")
    
    return not ng_found


if __name__ == "__main__":
    print("\n" + "🐯" * 20)
    print("    Kotaro-Engine テストスイート")
    print("🐯" * 20)
    
    # Ollamaが起動しているか確認
    try:
        import ollama
        ollama.list()
    except Exception as e:
        print(f"\n❌ Ollamaに接続できません: {e}")
        print("  → Ollamaを起動してください: ollama serve")
        exit(1)
    
    test_basic_generation()
    test_ng_words()
