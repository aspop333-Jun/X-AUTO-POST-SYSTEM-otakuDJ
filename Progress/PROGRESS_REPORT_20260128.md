# 進捗管理レポート (2026-01-28)

## 1. プロジェクト概要
**プロジェクト名**: X-AUTO-POST-SYSTEM-otakuDJ
**目的**: イベント写真自動投稿システム（"CANDY虎太郎"ペルソナによる18文字エモコメント生成）
**現状ステータス**: 🔄 **Phase 3: UI統合 & API統一**

## 2. エグゼクティブ・サマリー
**【本日の成果】**
1. **日次コードレビュー完了**: 主要コンポーネント（API, Scoring, Frontend）の静的解析を実施。
2. **システム稼働確認**: Frontend (`TextEditor`, `ImageEditor`) と Backend (`kotaro_api.py`) の統合が進んでいることを確認。
3. **課題特定**: ベンチマーク(V4.7)に基づくスコアリングの偏り（P06/P11/P12支配）と、APIのバージョン表記の不整合を確認。

---

## 3. コードレビュー詳細

### Backend (`kotaro_api.py`, `kotaro_scoring_v4.py`)
- **バージョン不整合**: APIのdocstringやhealth checkが「V3.0」のままだが、実装は「V4.2」（`KotaroScorerV4`使用）になっている。混乱を避けるため統一が必要。
- **推論エンジン**: 現在 `Qwen2-VL-2B-Instruct` (localhost:23334) を使用中。
- **スコアリングロジック**: `kotaro_scoring_v4.py` に「Anti-P04 Lock」等のV4.3以降の補正が入っているが、分岐が複雑化している。
- **フラット判定**: `top1_score <= 2.0` で一律フラット（P11/P12）に倒すロジックがあり、これがP11/P12過多の一因の可能性。

### Frontend (`next-app`)
- **TextEditor**: Zenモード、人物情報パース機能、Kotaro生成ボタンなど機能が充実している。API連携も実装済み。
- **ImageEditor**: クロップ機能、フィルタ、Cameko検索（`/api/cameko-search`）呼び出しが実装されている。
- **SimilaritySearch**: 遅延ロード実装済み。

### Vision Core (`vision_core.py`)
- **MiniCPM-V**: RTX 4060 (8GB) 用に最適化（int4量子化, 512pxリサイズ）されているが、APIサーバーはQwenを使用しているため、現在このモジュールはメインフローから外れている可能性がある。同時起動はVRAM容量的に不可。

---

## 4. リスクと課題 (Risks)

1. **スコアリングの偏り (Imbalance)**
   - V4.7ベンチマークにおいて、P06(30%), P11(26.7%), P12(26.7%) が全体の8割以上を占めている。
   - 感情系パターン（P01, P04, P08等）が出現しにくくなっており、「エモコメント」の多様性が失われている。

2. **VRAMリソース (8GB Limit)**
   - Qwen2-VL (API) と MiniCPM-V (VisionCore) の併用は不可能。どちらを本番採用するか、あるいは使い分け（サーバー vs CLI）を明確にする必要がある。

3. **メンテナンス性**
   - `kotaro_scoring_v4.py` の条件分岐が複雑化しており、パラメータ調整時の副作用が予測しづらい。

---

## 5. Next Steps

1. **APIバージョン表記の修正**
   - `kotaro_api.py` のバージョン番号を実態（V4.x）に合わせて更新する。

2. **スコアリングロジックの調整**
   - P11/P12へのフォールバック閾値（`top1_score <= 2.0`）の再考。
   - P06（キャラ）の判定条件が緩すぎる可能性があるため、厳格化を検討。

3. **Vision Coreの統合方針決定**
   - Qwen2-VL一本で行くか、MiniCPM-Vへの移行を検討するかの方針策定（現状はAPIのQwenが優先されている模様）。

---
*Report generated: 2026-01-28 by Jules (AI Agent)*
