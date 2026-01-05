
import json
import os
import sys

# Add current directory to path to import kotaro_scoring
sys.path.append(os.getcwd())
try:
    from kotaro_scoring import CRITERIA
except ImportError:
    print("Error: Could not import kotaro_scoring. Make sure you are in the project root.")
    sys.exit(1)

def generate_schema():
    """Chappy提案の2パス構成用JSONスキーマを生成"""
    
    # 60項目の定義を構築
    properties = {}
    required = []
    
    for c in CRITERIA:
        cid = c["id"]
        question = c["question"]
        properties[cid] = {
            "type": "integer", 
            "enum": [0, 1],
            "description": f"{question}"
        }
        required.append(cid)
    
    schema = {
        "type": "object",
        "properties": {
            "criteria": {
                "type": "object",
                "properties": properties,
                "required": required,
                "description": "60 items criteria judgment (1: Yes, 0: No)"
            },
            "confidence": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Overall confidence level of the analysis"
            }
        },
        "required": ["criteria"],
        "additionalProperties": False
    }
    
    output_path = "docs/kotaro_vlm_schema_v2.json"
    os.makedirs("docs", exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)
        
    print(f"Schema generated at: {output_path}")

if __name__ == "__main__":
    generate_schema()
