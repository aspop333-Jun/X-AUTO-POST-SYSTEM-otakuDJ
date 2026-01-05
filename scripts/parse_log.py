import re

log_file = '/tmp/detailed_test.log'

print("# 🐯 Kotaro VLM 3段階詳細テスト結果 (解析版)\n")
print("| 画像 | Level 1 (70%) | Level 2 (20%) | Level 3 (50%) |")
print("|---|---|---|---|")

current_image = ""
results = {}

try:
    with open(log_file, 'r', encoding='utf-8') as f:
        for line in f:
            if "## 📸 画像:" in line:
                current_image = line.split(":")[-1].strip()
                results[current_image] = {}
            
            if "| Level" in line and "**" in line:
                parts = line.split("|")
                # parts[1] is Level name, parts[3] is detected count **X/60**
                level = parts[1].strip()
                count = parts[3].strip().replace("**", "")
                
                if "Level 1" in level:
                    results[current_image]["L1"] = count
                elif "Level 2" in level:
                    results[current_image]["L2"] = count
                elif "Level 3" in level:
                    results[current_image]["L3"] = count

    print("Pattern | Level 1 | Level 2 | Level 3")
    for img, data in results.items():
        l1 = data.get("L1", "N/A")
        l2 = data.get("L2", "N/A")
        l3 = data.get("L3", "N/A")
        print(f"{img} : {l1} : {l2} : {l3}")
        
except FileNotFoundError:
    print("Log file not found.")
except Exception as e:
    print(f"Error: {e}")
