# Progress Report 2026-01-29

## 1. プロジェクト状況 (Phase 3: UI Integration & API Unification)
- **ステータス:** 進行中
- **概要:** UI統合とAPIの統一化フェーズ。フロントエンドの可視化実装は完了しているが、バックエンドのスコアリングロジックとインフラ（VRAM管理）に課題が残る。

## 2. 全コードレビュー結果

### Backend (`kotaro_api.py`)
- **バージョン不整合:** ドキュメント文字列は「V3.0」だが、実装は「V4.2」。混乱を招くため統一が必要。
- **実装状況:** ローカルQwen2-VL (LMDeploy) と連携。`kotaro_scoring_v4.py` を使用。

### Scoring Logic (`kotaro_scoring_v4.py`)
- **ロジック異常:** ベンチマーク結果 (V4.7) において、スコア `2.14` など閾値 `2.0` を超えているケースでも `P11` (Flat) にフォールバックしている現象を確認。
- **原因推測:** `decide_pattern` 内の `top1_score <= 2.0` 判定、もしくは `main_key="A"` 分岐内の論理フロー（`explicit_perform` 判定など）に意図しない挙動がある可能性が高い。

### Vision Core (`vision_core.py`)
- **最適化:** RTX 4060 (8GB) 向けに 4-bit 量子化、512px リサイズが適用済み。
- **機能:** `unload()` メソッドが実装されており、VRAM管理（モデルスイッチング）への布石はある。

### Frontend (`TextEditor.tsx`)
- **統合状況:** `ScoringVisualization` コンポーネントによるスコア・フラグの可視化が完了。API連携も V4.2 に対応済み。

## 3. リスク・課題

1.  **VRAM競合 (Critical)**
    - LMDeploy (Qwen2-VL) と MiniCPM-V (`vision_core.py`) を同時にメモリに乗せることは 8GB VRAM では不可能。
    - **対策:** 推論時のみ排他的にロード/アンロードする「モデルスイッチング」の実装が必須。

2.  **スコアリングの偏り (Major)**
    - 最新ベンチマーク (V4.7) にて、`P06` (30%), `P11` (26.7%), `P12` (26.7%) が全体の8割以上を占める。
    - 感情系パターン（P01, P04, P08-P10）がほとんど出現していない。

## 4. Next Steps
1.  **スコアリングロジック修正:** `2.14 -> P11` 問題のデバッグと修正。
2.  **VRAM管理実装:** `kotaro_api.py` にモデルの排他制御（Unload/Load）を実装。
3.  **バージョン表記統一:** ドキュメントとコードのバージョン番号を V4.2 に統一。

---
*Date: 2026-01-29*
*Reporter: Jules (AI Agent)*
