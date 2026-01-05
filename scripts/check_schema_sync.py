import json
from kotaro_scoring import CRITERIA

# Load JSON Schema
with open(r'c:\AI\APP\X-AUTO-POST-SYSTEM-otakuDJ\docs\kotaro_vlm_schema_v2.json', 'r', encoding='utf-8') as f:
    schema = json.load(f)

json_criteria = schema['properties']['criteria']['properties']

print("Comparing Python CRITERIA vs JSON Schema...")
diff_count = 0

for c in CRITERIA:
    cid = c['id']
    c_quest = c['question']
    
    if cid not in json_criteria:
        print(f"[MISSING IN JSON] {cid}")
        diff_count += 1
        continue
        
    j_desc = json_criteria[cid]['description']
    
    if c_quest != j_desc:
        print(f"[DIFF] {cid}")
        print(f"  Py:   {c_quest}")
        print(f"  JSON: {j_desc}")
        diff_count += 1

print("-" * 30)
if diff_count == 0:
    print("MATCH: Python CRITERIA is fully synced with JSON Schema.")
else:
    print(f"FOUND {diff_count} DIFFERENCES.")
