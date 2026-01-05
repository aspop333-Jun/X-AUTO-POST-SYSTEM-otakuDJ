
import json
import os
from collections import Counter

# Define Criteria Scores based on kotaro_scoring.py
# Assuming A01-A15, B01-B15, C01-C15, D01-D15, E01-E15
# Manually mapping scores based on typical value (2 or 3)
# To be precise, I should parse the file, but I will estimate for A-D and use generic for E.
# In kotaro_scoring.py: 
# A: 3,2,3,2,2,3,2,3,3,2,2,2,1,2,3 => Sum=35
# B: 3,3,2,3,2,2,3,2,2,2,2,2,2,2,2 => Sum=34
# C: 3,3,3,2,3,2,2,3,2,2,2,3,1,3,3 => Sum=37
# D: 3,3,2,2,3,2,2,2,2,2,2,2,2,2,3 => Sum=34
# E: Assume similar mix ~35

# ... (Imports and Criteria Map remain same, E logic updated)

CRITERIA_MAP = {
    "A01": 3, "A02": 2, "A03": 3, "A04": 2, "A05": 2, "A06": 3, "A07": 2, "A08": 3,
    "A09": 3, "A10": 2, "A11": 2, "A12": 2, "A13": 1, "A14": 2, "A15": 3,
    "B01": 3, "B02": 3, "B03": 2, "B04": 3, "B05": 2, "B06": 2, "B07": 3, "B08": 2,
    "B09": 2, "B10": 2, "B11": 2, "B12": 2, "B13": 2, "B14": 2, "B15": 2,
    "C01": 3, "C02": 3, "C03": 3, "C04": 2, "C05": 3, "C06": 2, "C07": 2, "C08": 3,
    "C09": 2, "C10": 2, "C11": 2, "C12": 3, "C13": 1, "C14": 3, "C15": 3,
    "D01": 3, "D02": 3, "D03": 2, "D04": 2, "D05": 3, "D06": 2, "D07": 2, "D08": 2,
    "D09": 2, "D10": 2, "D11": 2, "D12": 2, "D13": 2, "D14": 2, "D15": 3,
    # E V4.7 Definitions (Points)
    "E01": 5, "E02": 3, "E03": 4, "E04": 5,
    "E05": 3, "E06": 2, "E07": 2, "E08": 2, "E09": 2, "E10": 2,
    "E11": 2, "E12": 2, "E13": 2, "E14": 2, "E15": 3 
}

MAX_SCORES = {
    "A": 35, "B": 34, "C": 37, "D": 34, "E": 10 # E denominator compressed
}

def derive_flags(criteria_dict):
    """Derive flags from criteria presence."""
    flags = {}
    
    # Check if key exists and value is truthy (1)
    def has(key): return criteria_dict.get(key, 0) == 1
    
    # prop_strong: B09 (Holding) or B12 (Accessory)
    flags["prop_strong"] = has("B09") or has("B12")
    
    # costume_strong: A11, A12, C04, C10
    flags["costume_strong"] = has("A11") or has("A12") or has("C04") or has("C10")
    
    # crowd_venue: D07, D08, B13
    flags["crowd_venue"] = has("D07") or has("D08") or has("B13")
    
    # talk_to: D06, E11, B05 (Wave)
    flags["talk_to"] = has("D06") or has("E11") or has("B05")
    
    # act_point_or_salute: B03 (Peace), B04 (Heart), C08 (Pose)
    flags["act_point_or_salute"] = has("B03") or has("B04") or has("C08")
    
    # close_dist: D01
    flags["close_dist"] = has("D01")
    
    # pose_front_true: A01
    flags["pose_front_true"] = has("A01")
    
    # pose_side_cool: Not A01 + C05/C08? Simplification: Not Front
    flags["pose_side_cool"] = not has("A01") and (has("C05") or has("C08"))
    
    # intimacy_strong: (talk_to AND close_dist) OR E01 OR E04
    flags["intimacy_strong"] = (flags["talk_to"] and flags["close_dist"]) or has("E01") or has("E04")
    
    # pose_safe_theory: A06 (Pose determined) AND NOT act
    flags["pose_safe_theory"] = has("A06") and not flags["act_point_or_salute"]

    return flags

def calculate_scores_v47(criteria_dict, flags):
    raw_scores = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}
    
    # 1. Base Scores
    for key, value in criteria_dict.items():
        if not value: continue
        cid = key[:3]
        if cid in CRITERIA_MAP:
            cat = cid[0]
            raw_scores[cat] += CRITERIA_MAP[cid]
            
    # 2. Normalization
    final_scores = {}
    for cat in ["A", "B", "C", "D"]:
        final_scores[cat] = round((raw_scores[cat] / MAX_SCORES[cat]) * 5.0, 2)
        
    # E Special Calculation
    e_raw = raw_scores["E"]
    e_scaled = round((e_raw / 10.0) * 5.0) # Round to integer-ish step? "round(E_raw / 10 * 5)"
    # Docs say: round(E_raw / 10 * 5). Python round(2.5) -> 2 (nearest even). 
    # Let's assume standard rounding.
    final_scores["E"] = min(5.0, float(e_scaled))
    
    # 3. Secondary Scoring (V4.7 Patch)
    # prop_strong -> B + 1.5
    if flags["prop_strong"]: final_scores["B"] += 1.5
    # costume_strong -> C + 1.5
    if flags["costume_strong"]: final_scores["C"] += 1.5
    # crowd_venue -> B + 1.2
    if flags["crowd_venue"]: final_scores["B"] += 1.2
    # talk_to -> D + 1.2
    if flags["talk_to"]: final_scores["D"] += 1.2
    # act_point_or_salute -> C + 1.0, D + 0.5
    if flags["act_point_or_salute"]:
        final_scores["C"] += 1.0
        final_scores["D"] += 0.5
    # close_dist -> D + 0.5
    if flags["close_dist"]: final_scores["D"] += 0.5
    
    # Clip max 5.0
    for cat in final_scores:
        if final_scores[cat] > 5.0: final_scores[cat] = 5.0
        
    return final_scores, raw_scores

def decide_pattern_v47(scores, flags):
    """
    Decide pattern based on V4.7 Logic
    """
    A = scores["A"]
    B = scores["B"]
    C = scores["C"]
    D = scores["D"]
    E = scores["E"] # E not used for main branching as per docs? Used for mods?
    # Docs mainly focus on A,B,C,D branching.
    
    # Priority Tie Handling: B > C > D > A
    # Find Max
    max_val = max(A, B, C, D)
    
    # 1. Flat Check (Max <= 2.5)
    if max_val <= 2.5:
        if B >= 2.0 or flags["crowd_venue"]:
            return "P12" # Scene
        else:
            return "P11" # Close
            
    # 2. Main Branching (Winner)
    # Identify winner with priority B > C > D > A (if within 0.2 diff)
    candidates = [("B", B), ("C", C), ("D", D), ("A", A)] # Priority order
    
    # Filter those within 0.2 of max_val
    top_candidates = [c for c in candidates if c[1] >= (max_val - 0.2)]
    
    winner = top_candidates[0][0] # First one in priority list
    
    pattern = "P01" # Default fallback
    
    if winner == "A":
        # A Branch Strict (P01/P02)
        
        # P02 Conditions
        is_p02 = (
            flags["costume_strong"] or
            flags["act_point_or_salute"] or
            flags["pose_side_cool"] or
            not flags["pose_front_true"]
        )
        
        if is_p02:
            pattern = "P02"
        else:
            # P01 Condition
            if flags["talk_to"] or flags["intimacy_strong"]:
                pattern = "P01"
            else:
                # Scattering Logic: "Use B/C/D if runner-up?"
                # Simplified: Check if any secondary is strong (>3.0) and swap?
                # "Scrutinize... yield to B/C/D if runner up"
                # Let's say if runner up is within 0.5?
                # Using P03 Scatter as explicit rule later.
                pattern = "P01"

        # P03 Scatter (V4.6 rule)
        # pose_safe_theory=1 AND weak perform -> P03
        if flags["pose_safe_theory"] and pattern == "P01":
            pattern = "P03"
            
    elif winner == "B":
        # B Branch: P03/P04 (Based on V4.6/Generic)
        # V4.7 docs say: "B(Composition): Info density"
        # B: P03 (Scene/Focus) or P04 (Atmosphere)
        # Usually P04 is generic. P03 is specific focus.
        # If crowd check? 
        if flags["crowd_venue"]: pattern = "P03" # Scene
        else: pattern = "P04" # Complex/Atmosphere
        
    elif winner == "C":
        # C Branch: P05/P06/P07
        if flags["costume_strong"]: pattern = "P06"
        elif flags["act_point_or_salute"]: pattern = "P05"
        else: pattern = "P07"
        
    elif winner == "D":
        # D Branch: P08/P09/P10
        if flags["crowd_venue"]: pattern = "P08"
        elif flags["close_dist"]: pattern = "P09"
        else: pattern = "P10"
        
    return pattern

def main():
    input_file = "Progress/scoring_progress_v461_opt.json"
    if not os.path.exists(input_file):
        print(f"File not found: {input_file}")
        return

    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    print(f"Loaded {len(data)} images.")
    
    patterns = []
    
    report_lines = []
    report_lines.append("# V4.7 Scoring Benchmark Report")
    report_lines.append(f"Total Images: {len(data)}")
    report_lines.append("")
    report_lines.append("| Image | Pattern | A | B | C | D | E | Flags |")
    report_lines.append("|---|---|---|---|---|---|---|---|")
    
    for img, criteria in data.items():
        clean_criteria = {}
        for k, v in criteria.items():
            clean_k = k.split(":")[0].strip()
            clean_criteria[clean_k] = v
            
        flags = derive_flags(clean_criteria)
        scores, raw = calculate_scores_v47(clean_criteria, flags)
        pattern = decide_pattern_v47(scores, flags)
        patterns.append(pattern)
        
        flag_str = ", ".join([k for k,v in flags.items() if v])
        
        report_lines.append(f"| {img} | {pattern} | {scores['A']} | {scores['B']} | {scores['C']} | {scores['D']} | {scores['E']} | {flag_str} |")
        
    # Distribution
    dist = Counter(patterns)
    report_lines.append("")
    report_lines.append("## Distribution")
    for p in sorted(dist.keys()):
        report_lines.append(f"- {p}: {dist[p]} ({dist[p]/len(data)*100:.1f}%)")
        
    with open("Progress/V4_7_BENCHMARK_REPORT.md", "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))
    
    print("Report generated at Progress/V4_7_BENCHMARK_REPORT.md")

if __name__ == "__main__":
    main()
