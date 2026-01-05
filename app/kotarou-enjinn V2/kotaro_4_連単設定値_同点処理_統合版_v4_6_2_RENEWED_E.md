# kotaro_4_連単設定値_同点処理_統合版（V4.6.2 / B-Gate Tuning + E刷新対応）
**目的**：V4.5で分布は改善（P01過多が減少）したが、画像セットによってはまだP01が厚い。  
V4.6系は、`pose_safe_theory` 多発＋ `talk_to/casual_moment/close_dist` 過検出で起きる **「親密（Soft）一極化」**を、**“弱い親密”だけ P03（構図）へ分散**させるパッチ。

> 本版（V4.6.2）は、V4.6.1の追加ゲートを **B>=4.3** に調整し、P03ロックに振れにくくする。  
> さらに **E（親近感）定義刷新（E01〜E04 / 最大15点）**に合わせて、上流フラグの推奨導出も更新する。

---

## 0. 前提（固定）
- 入力スコア：`A,B,C,D,E`（各0〜5）
- 主役（pattern決定）は **A〜Dのみ**
- Eは **文体/距離感**の補助（主役にしない）
- フラグ（例）：`pose_safe_theory / pose_front_true / pose_side_cool / talk_to / casual_moment / close_dist / crowd_venue / group_feeling / costume_strong / act_point_or_salute / prop_strong`

---

## 1. E刷新（スコア仕様）
Eは以下で採点（最大15点→0〜5へ正規化）：
- E01：顔 or 頭付近で手ポーズ（5）
- E02：手でポーズ（顔以外）（3）
- E03：口が閉じていない（2）
- E04：手ハート（片手含む）（5）
- 複数人数：**(各人E合計の総和) / 人数**（平均化）→ 15でクリップ → 0〜5へ正規化

---

## 2. A主役（P01/P02）分岐（V4.6維持）
### 2.1 強親密フラグ（導出）
`intimacy_strong = (pose_front_true==1) OR (talk_to==1 AND close_dist==1 AND pose_safe_theory==0)`

### 2.2 コミュニケーション優先（修正版）
- `talk_to=1 AND casual_moment=1 AND intimacy_strong=1` → **強制P01**

### 2.3 P02（Perform）条件（維持）
A主役のとき、以下で **P02**：
- `costume_strong=1` または
- `act_point_or_salute=1` または
- `pose_side_cool=1` または
- `pose_safe_theory=1 AND (talk_to=0 OR casual_moment=0)`

それ以外は **P01候補**（次章のP03逃がし判定へ）

---

## 3. P01過多を崩す「P03へ逃がし」（V4.6.2）
**対象**：`main == "A"` かつ `pattern_candidate == "P01"` の個体のみ

### 3.1 P03へ逃がす条件（B-Gate）
- `pose_safe_theory=1`
- `talk_to=1`
- `casual_moment=1`
- `intimacy_strong=0`
- `crowd_venue=0`
- `group_feeling=0`
- `costume_strong=0`
- `act_point_or_salute=0`
- **追加ゲート（V4.6.2）**：`B >= 4.3` かつ `A - B <= 0.6`

→ すべて満たすと **pattern = P03**（構図/Scene）へ振り替える

---

## 4. B/C/D主役・フラット（V4.5踏襲）
- B主役：V4.5（V4.3系）の分岐を踏襲
- C主役：Group/Character/Cool の分岐を踏襲
- D主役：Action/Soft/Bright の分岐を踏襲
- フラット：`max(A,B,C,D) <= 2` で P11/P12

---

## 5. 上流フラグ推奨（E刷新に合わせた“過検出抑制”）
### 5.1 talk_to（会話の気配）推奨導出
**最低1つ必須**（どれも無いなら talk_to=0）：
- `E03(口が開いている)` が立つ
- `E01/E02/E04（手の所作）` が立つ **かつ** `eye_contact_strong=1`（目線が刺さっている）
- 指差し/敬礼/手を伸ばす（`act_point_or_salute=1`）

### 5.2 casual_moment（ふとした瞬間）推奨導出
- `pose_safe_theory=1` のときは原則 `casual_moment=0`
- candid（髪/服/手の位置が“型”から外れている）だけ `casual_moment=1`

---

## 6. ベンチマーク手順（最短）
1) 28〜30枚を同条件で採点（A〜E + flags）
2) 本ロジックで `pattern_id` を出す
3) 分布表（Count/%）だけ出力

目標（今回セット目安）：
- P01：45〜60%
- P03：20〜35%
- P02：5〜15%
- P04：5〜10%

---

## 7. 調整ノブ（触る順番）
1) 逃がしを減らす → `B >= 4.4`
2) 逃がしを増やす → `B >= 4.2`（いきなり4.0にしない）
3) `A - B <= 0.6` を 0.5〜0.8 で微調整
