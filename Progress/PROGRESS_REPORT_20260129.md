# Progress Report 2026/01/29

## 1. Phase Status
**Phase 3: UI Integration & API Unification**
現在、UI統合とAPIの統一化フェーズにあり、ローカルLLMバックエンド（Kotaro Engine）とNext.jsフロントエンドの接続強化を行っています。

## 2. Code Review Findings (全コードレビュー結果)
本日の全コードレビューにより、以下の課題と修正が行われました。

### ✅ 修正済み (Fixed)
1.  **依存関係の欠落 (`requirements-kotaro.txt`)**
    -   **問題:** `kotaro_api.py` が `openai` ライブラリ（LMDeploy接続用）を使用しているが、requirementsに含まれていなかった。また `lmdeploy` も未記載だった。
    -   **対応:** `requirements-kotaro.txt` に `openai>=1.0.0` と `lmdeploy` を追加しました。

2.  **ポート競合の解消 ("Duality" Problem)**
    -   **問題:** `kotaro_api.py`（メインバックエンド）と `api/main.py`（Geminiバックエンド）が共に `port 8000` を使用する設定になっており、同時起動時に競合する状態だった。
    -   **対応:** `api/main.py` のポートを `8001` に変更し、競合を回避しました。

### ⚠️ 継続課題 (Open Issues)
1.  **スコアリングロジックの偏り (`kotaro_scoring_v4.py`)**
    -   **分析:** `decide_pattern` メソッド内の `if top1_score <= 2.0: main_key = "None"` という判定基準が厳格すぎるため、VLMの出力スコアが全体的に低い場合、強制的に P11/P12 (Flat) に分類されてしまいます。
    -   **影響:** ベンチマーク(V4.7)において P11/P12 が過半数を占める原因となっています。

2.  **Vision Coreの二重化**
    -   **現状:**
        -   `kotaro_api.py`: Qwen2-VL (via LMDeploy API) を使用。
        -   `vision_core.py`: MiniCPM-V (RTX 4060最適化) を実装。
    -   **方針:** 現状は併存していますが、リソース(VRAM 8GB)の制約上、同時起動は困難です。ユースケースに応じた切り替え運用が必要です。

3.  **Frontend未実装機能 (`ImageEditor.tsx`)**
    -   `Cameko Search`, `Fact Check` などの機能はUI上にボタンが存在しますが、バックエンド接続がスタブ（コンソール出力のみ）の状態です。

## 3. Risks
-   **Scoring Imbalance:** P11/P12への偏重が続くと、生成コメントの多様性が失われます（"Flat" なコメントばかりになる）。
-   **Resource Constraint:** RTX 4060 (8GB) での運用において、Frontend, Backend, VLMを全てローカルで快適に動かすにはVRAM管理が重要です。

## 4. Next Steps
1.  **スコアリング調整:** `kotaro_scoring_v4.py` の閾値（現在は 2.0）を引き下げるか、VLMプロンプトを調整してスコアのレンジを広げる。
2.  **機能実装:** `ImageEditor.tsx` のスタブ機能をバックエンドAPIに接続する。
3.  **統合テスト:** 修正後の環境でベンチマークを実施し、P11/P12率の変化を確認する。
