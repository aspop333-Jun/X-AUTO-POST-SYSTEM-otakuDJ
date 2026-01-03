"""
Qwen (Ollama) Inference Profiler - Step B Optimization Test
"""

import time
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

TEST_IMAGE = "Xpost-EX/pattern_images/pattern_01.png"

def main():
    print("\n" + "=" * 60)
    print("Step B: Ollama Optimization Test")
    print("=" * 60)
    
    if not Path(TEST_IMAGE).exists():
        print(f"ERROR: Test image not found: {TEST_IMAGE}")
        return
    
    print(f"Test image: {TEST_IMAGE}")
    
    import ollama
    
    # Check connection
    try:
        result = ollama.list()
        print("Ollama: OK")
    except Exception as e:
        print(f"Ollama error: {e}")
        return
    
    image_data = Path(TEST_IMAGE).read_bytes()
    
    # Warmup
    print("\nWarmup...")
    warmup_start = time.time()
    response = ollama.generate(
        model="qwen2.5vl:7b",
        prompt="Describe briefly",
        images=[image_data],
        options={"num_gpu": 99, "num_thread": 8, "num_predict": 50}
    )
    print(f"Warmup: {time.time() - warmup_start:.2f}s")
    
    # Test with optimizations
    print("\n" + "=" * 60)
    print("Image Analysis WITH optimizations (5 runs)")
    print("  num_gpu=99, num_thread=8, num_predict=150")
    print("=" * 60)
    
    opt_times = []
    for i in range(5):
        start = time.time()
        response = ollama.generate(
            model="qwen2.5vl:7b",
            prompt="Analyze photo: expression, gesture, atmosphere. Be brief.",
            images=[image_data],
            options={
                "temperature": 0.1,
                "num_gpu": 99,
                "num_thread": 8,
                "num_predict": 150,
            }
        )
        elapsed = time.time() - start
        opt_times.append(elapsed)
        print(f"  [{i+1}] {elapsed:.2f}s")
    
    # Summary
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    
    avg_opt = sum(opt_times) / len(opt_times)
    
    print(f"\nWith Optimizations:")
    print(f"  Average: {avg_opt:.2f}s")
    print(f"  Min: {min(opt_times):.2f}s / Max: {max(opt_times):.2f}s")
    
    # Compare to baseline
    baseline = 14.0  # From Step A
    improvement = ((baseline - avg_opt) / baseline) * 100
    
    print(f"\nComparison to Step A baseline (~14s):")
    if improvement > 0:
        print(f"  IMPROVED by {improvement:.1f}%")
    else:
        print(f"  No improvement ({improvement:.1f}%)")
    
    print("\nDone!")
    print("=" * 60)


if __name__ == "__main__":
    main()
