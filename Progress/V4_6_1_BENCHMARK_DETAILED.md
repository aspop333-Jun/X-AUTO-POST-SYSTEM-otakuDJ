# 🐯 Kotaro Scoring V4.6.1 ベンチマークレポート
**テスト日**: 2026-01-06  
**テスト画像**: 28枚（pattern_01～pattern_26.png + 4枚のjpg）  
**システムバージョン**: V4.6.1（De-Cluster P01 → P03）

---

## 📊 12パターン分布

| Pattern | Name | 枚数 | 割合 | グラフ |
|---------|------|-----|------|--------|
| **P01** | 余韻 (Soft) | 14枚 | **50.0%** | ████████████████████████ |
| **P02** | 余韻 (Perform) | 2枚 | 7.1% | ███ |
| **P03** | 構図 (Scene) | 10枚 | 35.7% | █████████████████ |
| **P04** | 構図 (Complex) | 2枚 | 7.1% | ███ |
| P05 | クール (Cool) | 0枚 | 0.0% | |
| P06 | キャラ (Character) | 0枚 | 0.0% | |
| P07 | 対比 (Group) | 0枚 | 0.0% | |
| P08 | 温度 (Bright) | 0枚 | 0.0% | |
| P09 | 温度 (Soft) | 0枚 | 0.0% | |
| P10 | 温度 (Action) | 0枚 | 0.0% | |
| P11 | フラット (Close) | 0枚 | 0.0% | |
| P12 | フラット (Scene) | 0枚 | 0.0% | |

---

## 📋 詳細結果（A~Eスコア付き）

| 画像 | Pattern | 主役 | サブ4連単 | A | B | C | D | E | フラグ |
|------|---------|------|-----------|---|---|---|---|---|--------|
| X20180304000002FB2.jpg | **P03 構図 (Scene)** | B | B>A>C>D | 4.0 | 4.4 | 2.2 | 1.3 | 5 | close_dist, pose_safe_theory |
| pattern_01.png | **P01 余韻 (Soft)** | A | A>B>C>D | 4.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_02.png | **P02 余韻 (Perform)** | A | A>B>C>D | 4.0 | 3.4 | 3.2 | 2.0 | 5 | talk_to, close_dist, pose_safe_theory |
| pattern_03.png | **P01 余韻 (Soft)** | A | A>B>C>D | 3.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_04.png | **P03 構図 (Scene)** | B | B>A>C>D | 3.0 | 3.4 | 2.2 | 2.0 | 5 | talk_to, close_dist, pose_safe_theory |
| pattern_05.png | **P01 余韻 (Soft)** | A | A>B>C>D | 3.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_06.png | **P03 構図 (Scene)** | B | B>A>C>D | 4.2 | 4.4 | 3.2 | 2.5 | 5 | close_dist, pose_safe_theory, pose_front_true |
| pattern_07.png | **P01 余韻 (Soft)** | A | A>B>C>D | 3.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_08.png | **P01 余韻 (Soft)** | A | A>B>C>D | 3.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_09.png | **P01 余韻 (Soft)** | A | A>B>C>D | 3.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_10.png | **P03 構図 (Scene)** | B | B>A>C>D | 3.0 | 3.4 | 2.2 | 2.0 | 5 | talk_to, close_dist, pose_safe_theory |
| pattern_11.png | **P04 構図 (Complex)** | B | B>C>A>D | 2.0 | 4.0 | 3.2 | 1.0 | 5 | pose_safe_theory |
| pattern_12.png | **P02 余韻 (Perform)** | A | A>C>B>D | 4.9 | 3.4 | 4.2 | 3.3 | 4 | casual_moment, close_dist, pose_safe_theory |
| pattern_13.png | **P01 余韻 (Soft)** | A | A>B>C>D | 3.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_14.png | **P01 余韻 (Soft)** | A | A>B>C>D | 3.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_15.png | **P04 構図 (Complex)** | B | B>A>C>D | 3.0 | 4.0 | 2.2 | 1.0 | 5 | pose_safe_theory |
| pattern_16.png | **P01 余韻 (Soft)** | A | A>B>C>D | 5.0 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_17.png | **P03 構図 (Scene)** | B | B>A>C>D | 3.0 | 3.4 | 2.2 | 1.3 | 5 | close_dist, pose_safe_theory |
| pattern_18.png | **P03 構図 (Scene)** | B | B>A>C>D | 3.0 | 3.4 | 2.2 | 1.3 | 5 | close_dist, pose_safe_theory |
| pattern_19.png | **P01 余韻 (Soft)** | A | A>B>C>D | 4.9 | 3.4 | 3.2 | 3.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_20.png | **P01 余韻 (Soft)** | A | A>B>C>D | 3.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_21.png | **P03 構図 (Scene)** | B | B>A>C>D | 3.0 | 3.4 | 2.2 | 1.3 | 5 | close_dist, pose_safe_theory |
| pattern_22.png | **P01 余韻 (Soft)** | A | A>B>C>D | 3.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_23.png | **P03 構図 (Scene)** | B | B>A>C>D | 3.0 | 3.4 | 2.2 | 2.0 | 5 | talk_to, close_dist, pose_safe_theory |
| pattern_24.png | **P03 構図 (Scene)** | B | B>A>C>D | 3.0 | 3.4 | 2.2 | 1.3 | 5 | close_dist, pose_safe_theory |
| pattern_25.png | **P01 余韻 (Soft)** | A | A>B>C>D | 3.9 | 3.4 | 2.2 | 2.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |
| pattern_26.png | **P01 余韻 (Soft)** | A | A>B>D>C | 5.0 | 5.0 | 2.7 | 4.2 | 5 | casual_moment, nostalgic, crowd_venue, group_feeling, talk_to, close_dist, pose_safe_theory, pose_front_true |
| xDSC_8949.jpg | **P03 構図 (Scene)** | A | A>B>C>D | 4.9 | 4.4 | 3.2 | 3.0 | 5 | casual_moment, talk_to, close_dist, pose_safe_theory |

---

## 📈 統計分析

### スコア分布

| 指標 | A (余韻) | B (構図) | C (クール) | D (温度) | E (親近感) |
|------|---------|---------|-----------|---------|----------|
| 平均 | 3.94 | 3.63 | 2.50 | 2.02 | 4.96 |
| 最大 | 5.0 | 5.0 | 4.2 | 4.2 | 5.0 |
| 最小 | 2.0 | 3.4 | 2.2 | 1.0 | 4.0 |

### 検証結果

| 指標 | 結果 | 目標 | 状態 |
|------|------|------|------|
| 出現パターン数 | **4/12** | 8-12 | ⚠️ 未達成 |
| 最多パターン比率 | **P01: 50.0%** | 30%以下 | ⚠️ 超過 |

---

## 💡 解説と改善提案

### 現状の問題点

1. **P01（余韻/Soft）が50%を占めて偏りすぎ**
   - 原因: `casual_moment`, `talk_to`, `close_dist`, `pose_safe_theory` の4フラグが同時に立つケースが多い
   - V4.6で「強親密（intimacy_strong）」条件を導入したが、まだ分散不足

2. **8パターン以上の出現目標に達していない**
   - P05-P12（クール、キャラ、対比、温度系、フラット系）が一切出現していない
   - これは画像セットの特性（イベント写真中心）とフラグ検出ロジックの両方に起因

3. **主要な問題: フラグの過検出**
   - `pose_safe_theory`（体斜め・顔正面）が27/28枚で検出 → 条件が緩すぎる
   - `close_dist` が26/28枚で検出 → ほぼ全画像が「近距離」判定
   - `talk_to` が18/28枚で検出 → 過検出気味

### 改善提案

1. **フラグ判定の厳格化**
   - `pose_safe_theory`: 「体が15度以上斜め AND 顔が10度以内正面」のみ
   - `close_dist`: 「被写体がフレームの70%以上を占める」のみ
   - `talk_to`: 「口が開いている OR 目線がカメラに刺さっている」AND条件

2. **V4.7で検討すべきパッチ**
   - P03逃がし条件の `A - B <= 0.6` を `A - B <= 1.0` に緩和
   - B >= 4.2 条件を B >= 3.8 に緩和
   - C主役/D主役への経路を増やす（Cスコアが低すぎる: 平均2.5）

3. **画像セットの多様化**
   - 現在のテスト画像はイベント近距離ポートレートが中心
   - ステージ撮影、グループショット、アクションポーズなども含めると分布が改善される可能性
