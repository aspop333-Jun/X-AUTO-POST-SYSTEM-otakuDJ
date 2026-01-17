# 日次進捗報告書 (2026-01-16)

**フェーズ**: Phase 2.5 (Refinement & Integration)
**作成者**: Jules (Reviewer)

---

## 1. 概要
本日はプロジェクト全体のコードベースを対象とした包括的なレビューを実施した。
現在システムは「V4.6.1のスコアリングロジック」と「V3.0の生成ロジック」が混在して稼働しており、フロントエンドにはV2時代の遺物が残存している。
また、インフラ面（起動スクリプト）において実態との乖離が見つかった。

---

## 2. コードレビュー結果

### A. バックエンド (`kotaro_api.py`, `kotaro_scoring_v4.py`)
*   **バージョン不整合**:
    *   APIヘッダーは "V4.2" を名乗っているが、docstringには "V3.0" と記載。
    *   内部ロジックは `KotaroScorerV4` (V4.6.1相当) を使用しているが、コメント生成関数 `call_kotaro_generation_v3` は古いロジックを使用している。
*   **憲法準拠 (Governance)**:
    *   1月5日のリファクタリング内容は反映されており、`system_prompt` 内でのXMLタグ使用（`<task>`, `<scoring_rules>`）や禁止ワードの制御は実装済み。
*   **API二重管理問題**:
    *   `kotaro_api.py` (Local LLM/FastAPI) と `api/main.py` (Gemini/FastAPI) が共にポート8000で動作するように記述されており、競合・混乱の元となっている。
*   **不整合**:
    *   `kotaro_scoring_v4.py` の P07 (関係性) 定義にある `attack` 文字列「関係性が**尊い**」は、`kotaro_api.py` のハルシネーション禁止ワードリストにある「尊い」と矛盾しており、生成時に自己検閲でブロックされる可能性がある。

### B. フロントエンド (`next-app`)
*   **`ScoringVisualization.tsx`**:
    *   `CRITERIA_DEFINITIONS` 定義 (A01-D15の60項目) はV2時代の遺物であり、現在のV4システム（A-Eスコア + V4フラグ）とは噛み合っていない。
    *   ただし、V4フラグの表示ロジック自体は実装されているため、古い定義を削除しても機能に影響はないと思われる。
*   **`TextEditor.tsx`**:
    *   APIエンドポイントが `http://localhost:8000/generate` にハードコードされている。環境変数化が望ましい。
*   **`ImageEditor.tsx`**:
    *   `onGenerateComment` などのアクションが未実装 (`console.log` のみ)。
    *   Cameko検索やファクトチェック機能のUIはあるが、バックエンドとの接続検証が必要。

### C. インフラ・スクリプト
*   **`start_kotaro.sh` (WSL用起動スクリプト)**:
    *   **【重要】破損/陳腐化**: 現在のバックエンドは `LMDeploy` (port 23334) を要求するが、このスクリプトは `Ollama` を起動しようとしている。WSL環境での起動が失敗する主要因。
    *   対してWindows用の `start_lmdeploy_system.bat` は正しい構成になっている。
*   **`vision_core.py`**:
    *   MiniCPM-V 2.6 (int4) を使用したスタンドアロンな実装が存在するが、`kotaro_api.py` からはインポートされておらず、連携されていない。API側はLMDeploy経由でQwen2-VLを使用している。リソース最適化の観点から統合または廃止の判断が必要。

---

## 3. 現在の課題 (Priority List)

1.  **🚨 `start_kotaro.sh` の修正**: WSL環境で開発・運用ができなくなるため、早急にLMDeploy対応に書き換える必要がある。
2.  **API二重管理の解消**: `api/main.py` (Gemini版) の扱いを決定し、`kotaro_api.py` とのポート競合を解消する。
3.  **V3/V4ロジックの統合**: `call_kotaro_generation_v3` をV4対応（V4のmodsやboneを活用した生成）にアップデートする。
4.  **「尊い」矛盾の解消**: P07の定義または禁止ワードリストを調整する。
5.  **レガシーコードの削除**: フロントエンドの `CRITERIA_DEFINITIONS` を整理。

---

## 4. 次のステップ

1.  `start_kotaro.sh` を修正し、WSL上で `LMDeploy` + `kotaro_api.py` が正しく起動するようにする。
2.  `kotaro_scoring_v4.py` のP07定義文言を「関係性が尊い」から「関係性が深い」等に変更し、禁止ワード回避を行う。
3.  フロントエンドの `ScoringVisualization.tsx` から不要なV2定義を削除する。

以上。
