"""
Kotaro Scoring Engine V3.0
==========================
5要素 (A-E) × 0〜5点 + 4連単方式によるパターン判定

設計思想:
- 写真は「誤解」してよい
- ただし誤解の仕方を12通りに制御する
- 点数の高低は意味を持たない
- どの人格（攻め方）で語るかがすべて
"""

from typing import Dict, List, Tuple, Optional
import random

# =============================================================================
# 5つのプライオリティ要素
# =============================================================================
PRIORITY_ELEMENTS = {
    "A": {
        "name": "表情の確定遅延",
        "definition": "表情が完全に決まり切らず、余韻が残っている状態",
        "scale": "0=完全確定 / 5=未確定・余韻最大"
    },
    "B": {
        "name": "視線の意図未決定", 
        "definition": "視線の向き・意味が断定できない状態",
        "scale": "0=意図明確 / 5=意図不明・謎"
    },
    "C": {
        "name": "顔パーツ感情非同期",
        "definition": "目・口・眉などが異なる感情を語っている状態",
        "scale": "0=感情一致 / 5=完全非同期"
    },
    "D": {
        "name": "緊張と緩和の同時存在",
        "definition": "身体・状況・表情に緊張と抜けが同時に存在",
        "scale": "0=統一感 / 5=緊張と緩和が混在"
    },
    "E": {
        "name": "役割と個人の境界揺れ",
        "definition": "衣装・職業・設定と個人の素が混線している状態",
        "scale": "0=役割に徹している / 5=素が漏れ出ている"
    }
}

# =============================================================================
# 12思考パターン × 4連単
# =============================================================================
PATTERNS_V3 = {
    "P01": {
        "name": "直球余韻型",
        "rank": ["A", "D", "B", "C"],
        "silent": "E",
        "attack": "一目惚れ・理由不明の刺さり",
        "bone": "なんでかわからんけど…",
        "forbidden": ["分析", "理屈"]
    },
    "P02": {
        "name": "照れ崩し型",
        "rank": ["C", "B", "A", "D"],
        "silent": "E",
        "attack": "庇護欲・儚さ",
        "bone": "放っておけない",
        "forbidden": ["完成度評価"]
    },
    "P03": {
        "name": "無防備回収型",
        "rank": ["D", "C", "A", "B"],
        "silent": "E",
        "attack": "目・気配・圧",
        "bone": "目で殺しにきてる",
        "forbidden": ["全身", "構図"]
    },
    "P04": {
        "name": "距離錯覚型",
        "rank": ["B", "A", "D", "C"],
        "silent": "E",
        "attack": "光・空気・雰囲気",
        "bone": "写真が息してる",
        "forbidden": ["表情分析"]
    },
    "P05": {
        "name": "静寂侵入型",
        "rank": ["D", "A", "C", "B"],
        "silent": "E",
        "attack": "一瞬・途中・ブレ",
        "bone": "今この瞬間",
        "forbidden": ["完成度"]
    },
    "P06": {
        "name": "余白煽動型",
        "rank": ["A", "B", "D", "C"],
        "silent": "E",
        "attack": "衣装×本人の化学反応",
        "bone": "これ着るために生まれた",
        "forbidden": ["一般的な可愛い論"]
    },
    "P07": {
        "name": "日常混入型",
        "rank": ["E", "D", "C", "A"],
        "silent": "B",
        "attack": "覚悟・仕事感",
        "bone": "覚悟決まってる",
        "forbidden": ["親しみ"]
    },
    "P08": {
        "name": "理性残留型",
        "rank": ["D", "B", "A", "C"],
        "silent": "E",
        "attack": "イベント・場の温度",
        "bone": "会場の空気が伝わる",
        "forbidden": ["内面分析"]
    },
    "P09": {
        "name": "視線誘導型",
        "rank": ["B", "C", "D", "A"],
        "silent": "E",
        "attack": "近さ・錯覚",
        "bone": "距離感おかしい",
        "forbidden": ["俯瞰評価"]
    },
    "P10": {
        "name": "未完成美型",
        "rank": ["A", "C", "D", "B"],
        "silent": "E",
        "attack": "静・支配・余裕",
        "bone": "何もしてないのに強い",
        "forbidden": ["無邪気", "かわいい"]
    },
    "P11": {
        "name": "関係未定義型",
        "rank": ["E", "B", "A", "D"],
        "silent": "C",
        "attack": "期待破壊",
        "bone": "そっち行く!?",
        "forbidden": ["安全褒め"]
    },
    "P12": {
        "name": "偶然美化型",
        "rank": ["E", "C", "D", "A"],
        "silent": "B",
        "attack": "総括・物語の締め",
        "bone": "今日の答え",
        "forbidden": ["細部分析"]
    }
}

# =============================================================================
# V3.0 スコアリングエンジン
# =============================================================================
class KotaroScorerV3:
    """V3.0 4連単方式スコアリングエンジン"""
    
    def __init__(self):
        self.patterns = PATTERNS_V3
        self.elements = PRIORITY_ELEMENTS
    
    def score_from_elements(self, scores: Dict[str, int]) -> Tuple[str, Dict, List[str]]:
        """
        A-Eスコアから最適なパターンを決定
        
        Args:
            scores: {"A": 3, "B": 4, "C": 2, "D": 1, "E": 5}
        
        Returns:
            (pattern_id, pattern_info, ranked_4連単)
        """
        # 1. スコアを降順でソート → 上位4要素を抽出
        sorted_elements = sorted(scores.items(), key=lambda x: -x[1])
        top4 = [elem for elem, _ in sorted_elements[:4]]
        
        # 2. 各パターンとの一致度を計算
        pattern_scores = {}
        for pid, pinfo in self.patterns.items():
            pattern_rank = pinfo["rank"]
            match_score = self._calc_match_score(top4, pattern_rank)
            pattern_scores[pid] = match_score
        
        # 3. 最高スコアのパターンを取得（複数ある場合は候補を保持）
        max_score = max(pattern_scores.values())
        candidates = [pid for pid, s in pattern_scores.items() if s == max_score]
        
        # 4. 同点処理
        if len(candidates) > 1:
            winner = self._resolve_tie(candidates, scores)
        else:
            winner = candidates[0]
        
        return winner, self.patterns[winner], top4
    
    def _calc_match_score(self, user_rank: List[str], pattern_rank: List[str]) -> int:
        """4連単の一致度を計算（位置一致でボーナス）"""
        score = 0
        for i, elem in enumerate(user_rank):
            if i < len(pattern_rank):
                if elem == pattern_rank[i]:
                    score += (4 - i) * 2  # 上位ほど高配点
                elif elem in pattern_rank:
                    score += 1  # 含まれていればボーナス
        return score
    
    def _resolve_tie(self, candidates: List[str], scores: Dict[str, int]) -> str:
        """
        同点処理アルゴリズム (v1.2)
        
        Step 1: 第2要素優先
        Step 2: 沈黙要素除外
        Step 3: E吸引抑制
        Step 4: A最大を採用
        """
        # Step 1: 各パターンの第2要素スコアで比較
        sorted_by_second = []
        for pid in candidates:
            second_elem = self.patterns[pid]["rank"][1]
            sorted_by_second.append((pid, scores.get(second_elem, 0)))
        sorted_by_second.sort(key=lambda x: -x[1])
        
        if sorted_by_second[0][1] > sorted_by_second[1][1]:
            return sorted_by_second[0][0]
        
        # Step 2: 沈黙要素が上位4に含まれるパターンを除外
        user_top4 = sorted(scores.items(), key=lambda x: -x[1])[:4]
        user_top4_elems = [e for e, _ in user_top4]
        
        valid = []
        for pid in candidates:
            silent = self.patterns[pid]["silent"]
            if silent not in user_top4_elems:
                valid.append(pid)
        
        if len(valid) == 1:
            return valid[0]
        if len(valid) > 1:
            candidates = valid
        
        # Step 3: E吸引抑制（E≥4 かつ A≥3 or C≥3 → P07除外）
        if scores.get("E", 0) >= 4:
            if scores.get("A", 0) >= 3 or scores.get("C", 0) >= 3:
                candidates = [p for p in candidates if p != "P07"]
        
        if len(candidates) == 1:
            return candidates[0]
        
        # Step 4: A（表情の確定遅延）が最も高いパターンを採用
        a_score = scores.get("A", 0)
        best = candidates[0]
        for pid in candidates:
            pattern_ranks = self.patterns[pid]["rank"]
            if "A" in pattern_ranks[:2]:  # Aが上位2位以内
                best = pid
                break
        
        return best
    
    def get_comment_template(self, pattern_id: str) -> Dict:
        """パターンに対応するコメント生成情報を返す"""
        pinfo = self.patterns[pattern_id]
        return {
            "pattern_id": pattern_id,
            "name": pinfo["name"],
            "attack": pinfo["attack"],
            "bone": pinfo["bone"],
            "forbidden": pinfo["forbidden"]
        }


# =============================================================================
# ユーティリティ
# =============================================================================
def build_vlm_prompt() -> str:
    """VLM用のA-E採点プロンプトを生成"""
    prompt = """この写真を見て、以下の5要素を0〜5点で採点してください。
直感で答えてください。正解はありません。

A: 表情の確定遅延
   表情が完全に決まり切らず、余韻が残っている
   0=完全に確定した表情 / 5=何とも言えない余韻

B: 視線の意図未決定
   視線の向き・意味が断定できない
   0=意図が明確 / 5=視線の意味が謎

C: 顔パーツ感情非同期
   目・口・眉が異なる感情を語っている
   0=感情が一致 / 5=パーツごとに違う感情

D: 緊張と緩和の同時存在
   身体に緊張と抜けが同時に存在する
   0=統一感がある / 5=緊張と緩和が混在

E: 役割と個人の境界揺れ
   衣装・設定と個人の素が混線している
   0=役割に徹している / 5=素が漏れている

JSON形式で出力してください:
{"A": 3, "B": 4, "C": 2, "D": 1, "E": 5}
"""
    return prompt


# =============================================================================
# テスト用
# =============================================================================
if __name__ == "__main__":
    scorer = KotaroScorerV3()
    
    # テストケース1: 余韻が強い写真
    test1 = {"A": 5, "B": 3, "C": 2, "D": 4, "E": 1}
    pid, pinfo, rank = scorer.score_from_elements(test1)
    print(f"Test 1: {test1}")
    print(f"  → Pattern: {pid} ({pinfo['name']})")
    print(f"  → 4連単: {rank}")
    print(f"  → 攻め: {pinfo['attack']}")
    print()
    
    # テストケース2: 役割と素が混在
    test2 = {"A": 2, "B": 1, "C": 3, "D": 2, "E": 5}
    pid, pinfo, rank = scorer.score_from_elements(test2)
    print(f"Test 2: {test2}")
    print(f"  → Pattern: {pid} ({pinfo['name']})")
    print(f"  → 4連単: {rank}")
    print(f"  → 攻め: {pinfo['attack']}")
