# kotaro_4_連単設定値_同点処理_統合版（V4.6 / De-Cluster P01 → P03）
**目的**：V4.5で分布は改善（P01=68%）したが、まだP01が厚い。  
今回の画像セットは `pose_safe_theory` が多く、かつ `talk_to/casual_moment/close_dist` が過検出気味で **「親密（Soft）」に寄りやすい**。  
V4.6は、あなたの思想を崩さずに **「無難ポーズ×所作過検出」の塊だけを“構図（P03）”へ分散**させるパッチ。

---

## 0. 観測（V4.5ログから）
- P01の大半が `casual_moment, talk_to, close_dist, pose_safe_theory`
- この組み合わせは「心を許した表情」というより、**“お約束ポーズ”＋近距離**が多い（＝親密の強度に差がある）
- そこで V4.6は **「親密の強度が弱い個体」だけをP03へ逃がす**（P01を守りつつ薄める）

---

## 1. Pose補正・二次加点（V4.5踏襲）
※ここは変更なし（V4.5のまま）

---

## 2. A主役（P01/P02）分岐（V4.6）
V4.5のルールを維持しつつ、**P01強制条件を“強親密のみ”に限定**する。

### 2.1 強親密フラグ（新：導出フラグ）
以下を **`intimacy_strong`** とする（0/1）：

- `intimacy_strong = (pose_front_true==1) OR (talk_to==1 AND close_dist==1 AND pose_safe_theory==0)`

> pose_safe_theory（体斜め・顔正面）で talk_to が立っている場合は  
> “会話の気配”はあるが **強親密とは限らない** ので別扱いにする。

### 2.2 コミュニケーション優先（強制）を修正
- 旧（V4.5）：`talk_to=1 AND casual_moment=1` → 強制P01  
- **新（V4.6）**：`talk_to=1 AND casual_moment=1 AND intimacy_strong=1` → **強制P01**

> これで、過検出の talk_to/casual だけではP01固定にならない。

### 2.3 P02（Perform）条件（V4.5維持）
A主役のとき、以下で **P02**：
- `costume_strong=1` または
- `act_point_or_salute=1` または
- `pose_side_cool=1` または
- `pose_safe_theory=1 AND (talk_to=0 OR casual_moment=0)`  （無難ポーズ×所作弱）

それ以外は **一旦P01候補**（次章でP03へ逃がす場合あり）

---

## 3. P01過多を崩す「構図へ逃がし」（V4.6の核）
**P01候補**になった個体のうち、次条件を満たす場合は **P03へ振り替える**。

### 3.1 P03へ逃がす条件（Pose-Cluster Split）
- `pose_safe_theory=1`
- `talk_to=1`
- `casual_moment=1`
- `intimacy_strong=0`
- `crowd_venue=0`
- `group_feeling=0`
- `costume_strong=0`
- `act_point_or_salute=0`
- さらに `A - B <= 0.6`

→ すべて満たすと **pattern = P03**（構図/Scene）にする

> 直感：  
> 「お約束ポーズ＋会話の気配（弱）＋演出なし」＝ Softの親密とは違う。  
> だから **“無難な構図”としてP03** に分散させる。

---

## 4. B主役（P03/P04）、C主役、D主役、フラット（維持）
- V4.5 のまま

---

## 5. 上流フラグの推奨修正（分布を自然に散らす）
V4.6はロジック側で散らすが、根本は **talk_to / casual_moment の過検出**。  
次のように “条件を一段厳しく” するのが王道。

### 5.1 talk_to（会話の気配）を厳しく
`talk_to=1` を付ける条件：
- 口が開いている **または**
- 手がカメラ方向に出ている（手振り/指差し/ピース等） **または**
- 目線が明確にカメラへ刺さっている（eye_contact_strong）

※どれも無いなら talk_to=0

### 5.2 casual_moment（ふとした瞬間）を厳しく
- `pose_safe_theory=1` のときは基本 `casual_moment=0`（両立しにくい）
- candid（髪/服/手の位置が“型”から外れている）だけ `casual_moment=1`

---

## 6. 期待される効果（今回28枚条件）
- `pose_safe_theory + talk_to + casual` の塊の一部が **P03へ移動**
- P01は「強親密（真正面や真の近距離）」に寄る
- P02は「演出がある時だけ」に限定され続ける

---

## 7. ノブ（1回で詰める）
- `A - B <= 0.6` を 0.5〜0.8 で調整  
  - P03が少ない→0.8  
  - P03が多い→0.5
