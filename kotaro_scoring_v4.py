import logging
from typing import Dict, List, Tuple, Any

logger = logging.getLogger("kotaro_scoring_v4")

class KotaroScorerV4:
    # V4.2 Pattern Definitions
    PATTERN_DEFINITIONS = {
        "P01": {"id": "P01", "name": "余韻 (Soft)", "attack": "瞳の奥に惹かれる", "bone": "感情余韻"},
        "P02": {"id": "P02", "name": "余韻 (Perform)", "attack": "表情の演出が光る", "bone": "演出余韻"},
        "P03": {"id": "P03", "name": "構図 (Scene)", "attack": "情景が物語る", "bone": "背景主導"},
        "P04": {"id": "P04", "name": "構図 (Complex)", "attack": "情報の密度が高い", "bone": "情報量"},
        "P05": {"id": "P05", "name": "クール (Cool)", "attack": "鋭さが刺さる", "bone": "非同期クール"},
        "P06": {"id": "P06", "name": "キャラ (Character)", "attack": "役に入り込んでいる", "bone": "役作り"},
        "P07": {"id": "P07", "name": "対比 (Group)", "attack": "関係性が尊い", "bone": "関係性"},
        "P08": {"id": "P08", "name": "温度 (Bright)", "attack": "カワイイが溢れる", "bone": "快活"},
        "P09": {"id": "P09", "name": "温度 (Soft)", "attack": "癒やしの空気が流れる", "bone": "癒し"},
        "P10": {"id": "P10", "name": "温度 (Action)", "attack": "動きに目が行く", "bone": "アクション"},
        "P11": {"id": "P11", "name": "フラット (Close)", "attack": "距離の近さにドキッとする", "bone": "関係性フラット"},
        "P12": {"id": "P12", "name": "フラット (Scene)", "attack": "その場の空気が伝わる", "bone": "状況フラット"},
    }

    def __init__(self):
        pass

    def get_pattern_info(self, pattern_id: str) -> Dict[str, Any]:
        return self.PATTERN_DEFINITIONS.get(pattern_id, self.PATTERN_DEFINITIONS["P11"])


    def apply_secondary_scoring(self, base_scores: Dict[str, float], flags: Dict[str, bool]) -> Dict[str, float]:
        """
        V4.3 二次加点ルール (Anti-P04 Lock)
        """
        adj_scores = base_scores.copy()
        
        # 加点量管理
        additions = {"A": 0.0, "B": 0.0, "C": 0.0, "D": 0.0, "E": 0.0}
        
        # 1. Flag Values
        f_close = flags.get("close_dist", False)
        f_talk = flags.get("talk_to", False)
        f_casual = flags.get("casual_moment", False)
        f_crowd = flags.get("crowd_venue", False)
        f_nostalgic = flags.get("nostalgic", False)
        f_group = flags.get("group_feeling", False)
        f_costume = flags.get("costume_strong", False)
        f_action = flags.get("act_point_or_salute", False)
        f_prop = flags.get("prop_strong", False)
        
        # V4.1 Pose Flags
        f_pose_safe = flags.get("pose_safe_theory", False)
        f_pose_front = flags.get("pose_front_true", False)
        f_pose_side = flags.get("pose_side_cool", False)
        f_pose_angled = flags.get("pose_front_body_face_angled", False)

        # 2.1 V4.2 Base Logic (Additions)
        if f_casual:            additions["A"] += 0.7
        if f_nostalgic:         additions["A"] += 0.5
        if f_crowd:             additions["B"] += 0.7
        if f_group:             additions["B"] += 0.5; additions["C"] += 0.5
        if f_talk:              additions["D"] += 0.5
        if f_close:             additions["D"] += 0.3
        if f_costume:           additions["C"] += 0.7
        if f_action:            additions["C"] += 0.5; additions["D"] += 0.3
        if f_prop:              additions["B"] += 0.7
        
        # 2.2 V4.1 Pose Patch (Distribution Fix)
        # 所作優先ルール: talk_to or casual_moment があれば Pose由来のE減点を半分にする
        e_penalty_mult = 0.5 if (f_talk or f_casual) else 1.0

        if f_pose_safe:
            additions["C"] += 0.2  # V4.4: reduced from 0.6
            additions["E"] -= 0.4 * e_penalty_mult
            
        if f_pose_side:
            additions["C"] += 0.7
            additions["E"] -= 0.5 * e_penalty_mult
            
        if f_pose_front:
            additions["E"] += 0.6
            additions["D"] += 0.2
            additions["A"] += 0.2
            
        if f_pose_angled:
            additions["A"] += 0.3
            additions["B"] += 0.2

        # 2.3 V4.3 Additional Corrections (Anti-P04 Lock)
        
        # (A) B Penalty for Close-up Portraits
        # if close_dist=1 AND crowd=0 AND prop=0 AND group=0 -> B -= 0.6
        if f_close and not f_crowd and not f_prop and not f_group:
            additions["B"] -= 0.6
            
        # (B) Talk D-Boost
        if f_talk:
            additions["D"] += 0.2
            
        # (C) Casual A-Boost
        if f_casual:
            additions["A"] += 0.2

        # Apply and Clip
        for key in ["A", "B", "C", "D"]:
            # Max addition +1.5 check? V4.3 says "Max +1.5 clip" applies to total additions presumably.
            # But B penalty is subtraction. Let's just apply sum and then clip final result 0-5.
            # Spec says "2.3 Clip: A,B,C,D,E to 0-5". Secondary addition cap 1.5 likely applies to positive delta.
            # Let's trust the logic: apply delta, then clip 0-5.
            
            delta = additions[key]
            # Cap positive delta to 1.5? The spec says "V4.2 secondary addition (max +1.5 clip)".
            # Let's cap the positive part of addition if needed, but simple addition should be fine given the values.
            if delta > 1.5: delta = 1.5
            
            adj_scores[key] += delta
            adj_scores[key] = max(0.0, min(5.0, adj_scores[key]))
            
        return adj_scores

    def decide_pattern(self, scores: Dict[str, float], flags: Dict[str, bool]) -> Dict[str, Any]:
        """
        V4.3 12 Pattern Decision Logic
        """
        A = scores.get("A", 0)
        B = scores.get("B", 0)
        C = scores.get("C", 0)
        D = scores.get("D", 0)
        E = scores.get("E", 0)
        
        # Flag aliases
        f_crowd = flags.get("crowd_venue", False)
        f_group = flags.get("group_feeling", False)
        f_prop = flags.get("prop_strong", False)
        f_costume = flags.get("costume_strong", False)
        f_action = flags.get("act_point_or_salute", False)
        f_casual = flags.get("casual_moment", False)

        # 1. Sort for Sub4
        # Priority: A > B > C > D
        candidates = [("A", A), ("B", B), ("C", C), ("D", D)]
        prio = {"A": 0, "B": 1, "C": 2, "D": 3}
        ranked = sorted(candidates, key=lambda x: (-x[1], prio[x[0]]))
        
        top1_key = ranked[0][0]
        top1_score = ranked[0][1]
        top2_key = ranked[1][0]
        top2_score = ranked[1][1]
        
        sub4_list = [item[0] for item in ranked]
        sub4_str = ">".join(sub4_list)

        # 2. Main Determination (V4.3)
        main_key = top1_key
        
        # Flat Escape
        if top1_score <= 2.0:
            main_key = "None"
            # Determines P11/P12 later
        else:
            # 3.1 Close Game Logic (top1 - top2 <= 0.3)
            if (top1_score - top2_score) <= 0.3:
                # Flag priority: Costume(C) > Action(D) > Casual(A) > Crowd/Prop/Group(B)
                if f_costume:
                    main_key = "C"
                elif f_action:
                    main_key = "D"
                elif f_casual:
                    main_key = "A"
                elif f_crowd or f_prop or f_group:
                    main_key = "B"
                else:
                    # Default to priority order if no flags match deviation
                    # Sort candidates by priority only (A>B>C>D) to find winner among top score range?
                    # Spec says: "If still undecided -> A > B > C > D (Regulation)"
                    # This implies if we are in close game, we force priority order.
                    # Simple way: just keep current winner because `ranked` already respected priority for ties.
                    # But for close call (delta <= 0.3), we might want to switch if current winner is lower priority?
                    # Example: B=4.0, A=3.8. Delta 0.2. A is priority.
                    # Spec: "5) Still undecided -> A > B > C > D"
                    # This implies we should pick the highest priority element among those within top range?
                    # Or just fallback to 'ranked[0]' which is already score-sorted.
                    # Let's interpret "Still undecided -> A>B>C>D" as "Use standard tie-breaker/score leader".
                    pass # Keep main_key as top1_key (which is score leader, or tie-break leader)

        pattern_id = "P11"
        
        # 3. Pattern Branching (V4.3)
        if main_key == "None":
            # Flat (M <= 2)
            # B>=2 or crowd or prop or group -> P12
            if B >= 2.0 or f_crowd or f_prop or f_group:
                pattern_id = "P12"
            else:
                pattern_id = "P11"
                
        elif main_key == "A":
            # A Branch (V4.6 De-Cluster P01 → P03)
            f_pose_safe = flags.get("pose_safe_theory", False)
            f_pose_front = flags.get("pose_front_true", False)
            f_pose_side = flags.get("pose_side_cool", False)
            f_talk = flags.get("talk_to", False)
            f_casual_flag = flags.get("casual_moment", False)
            f_close = flags.get("close_dist", False)
            
            # 2.1 Strong Intimacy (derived flag)
            # pose_front_true=1 OR (talk_to=1 AND close_dist=1 AND pose_safe_theory=0)
            intimacy_strong = f_pose_front or (f_talk and f_close and not f_pose_safe)
            
            # 2.2 Communication Priority (Force P01 only when intimacy is STRONG)
            if f_talk and f_casual_flag and intimacy_strong:
                pattern_id = "P01"  # 強親密（Soft）確定
            else:
                # 2.3 P02 Triggers (V4.5 Logic)
                explicit_perform = (f_costume or f_action or f_pose_side)
                weak_gesture_safe = (f_pose_safe and (not f_talk or not f_casual_flag))
                
                if explicit_perform or weak_gesture_safe:
                    pattern_id = "P02"  # Perform
                else:
                    # 3.1 P03 Scatter (Pose-Cluster Split) V4.6.1
                    # Safe pose + talk + casual + weak intimacy + no special flags
                    # V4.6.1: Add B-gate (B >= 4.2) to only scatter "B-strong" individuals
                    scatter_to_p03 = (
                        f_pose_safe and f_talk and f_casual_flag and
                        not intimacy_strong and
                        not f_crowd and not f_group and
                        not f_costume and not f_action and
                        B >= 4.2 and (A - B) <= 0.6  # V4.6.1: B-gate added
                    )
                    
                    if scatter_to_p03:
                        pattern_id = "P03"  # 無難構図へ逃がす
                    else:
                        pattern_id = "P01"  # Default Soft
            
        elif main_key == "B":
            # B Branch (V4.3 Fix)
            # crowd or group -> P03
            if f_crowd or f_group:
                pattern_id = "P03"
            # else prop -> P04
            elif f_prop:
                pattern_id = "P04"
            # else B-A <= 0.5 -> P03
            elif (B - A) <= 0.5:
                pattern_id = "P03"
            else:
                pattern_id = "P04"
                
        elif main_key == "C":
            # C Branch
            if f_group: pattern_id = "P07"
            elif f_costume: pattern_id = "P06"
            else: pattern_id = "P05"
            
        elif main_key == "D":
            # D Branch
            if f_action: pattern_id = "P10"
            elif A >= B: pattern_id = "P09"
            else: pattern_id = "P08"

        # Mods (E-based)
        mod = "normal"
        if E >= 4: mod = "close"
        elif E <= 2: mod = "polite"

        return {
            "pattern_id": pattern_id,
            "main": main_key,
            "sub4": sub4_str,
            "scores": {k: round(v, 1) for k, v in scores.items()},
            "mods": mod,
            "detected_flags": [k for k, v in flags.items() if v]
        }

