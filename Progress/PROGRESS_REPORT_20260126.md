# Daily Progress Report (2026-01-26)

## 1. 現状ステータス (Status)
- **Phase**: Phase 3 (UI Integration) & Phase 2.5 (Refinement)
- **Status**: ⚠️ **INFRASTRUCTURE ALERT** (インフラ不整合により進行停止中)
- **Focus**: WSL環境の復旧、APIポート競合の解消、Frontend統合

## 2. コードレビュー結果 (Code Review Findings)

本日の全コードレビューにより、以下の重大な不整合が特定されました。

### 🚨 Critical Issues (緊急対応が必要)

1.  **起動スクリプトの不整合 (Split-Brain Infrastructure)**
    - **ファイル**: `start_kotaro.sh` (WSL用) vs `kotaro_api.py` (Backend)
    - **問題**: `start_kotaro.sh` はレガシーな **Ollama** (`ollama serve`) を起動しようとしています。しかし、現在の `kotaro_api.py` は **LMDeploy** (`localhost:23334`) を前提に実装されています。
    - **影響**: WSL環境でシステムを起動しても、バックエンドがモデルに接続できずエラーになります。Windows用の `start_lmdeploy_system.bat` は正しい構成です。

2.  **APIポート競合 (Port Conflict)**
    - **ファイル**: `kotaro_api.py` vs `api/main.py`
    - **問題**: 両方のファイルが `0.0.0.0:8000` でFastAPIサーバーを起動しようとしています。
    - **詳細**:
        - `kotaro_api.py`: Kotaro-Engine本番 (V4.2, Qwen2-VL, 4連単)
        - `api/main.py`: Geminiを使用した別実装 (Event Photo Auto Post API)
    - **影響**: どちらか一方しか起動できません。統合または削除が必要です。

### ⚠️ Major Issues (機能不全)

3.  **Frontend接続未実装**
    - **ファイル**: `next-app/src/components/editor/ImageEditor.tsx`
    - **問題**: `onGenerateComment` 関数が `TODO` のままで、バックエンド (`/generate`) に接続されていません。
    - **現状**: `console.log('Generate AI comment')` のみ実装されています。

### ℹ️ Info / Minor Issues

4.  **Vision Coreの孤立**
    - **ファイル**: `vision_core.py`
    - **状況**: MiniCPM-V (int4) の実装は完了していますが、`kotaro_api.py` からは呼ばれていません（現在は LMDeploy 経由の Qwen2-VL を使用）。

5.  **ベンチマークバイアス**
    - **ファイル**: `kotaro_scoring_v4.py`
    - **状況**: `decide_pattern` ロジックにおいて、接戦時や低スコア時のフォールバックが P11/P12 に集中する構造になっています。これが直近のベンチマークでの P11/P12 支配率の原因です。

## 3. リスク (Risks)

- **WSL環境の完全停止**: スクリプト修正までWSLでの開発・動作確認ができません。
- **デプロイ混乱**: `api/` ディレクトリとルート直下の `kotaro_api.py` の役割分担が不明確で、誤ったAPIサーバーをデプロイするリスクがあります。

## 4. 次のステップ (Next Steps)

以下の手順で修正を実行することを提案します。

1.  **WSL起動スクリプトの修正**: `start_kotaro.sh` を書き換え、Ollamaを廃止し、`scripts/launch_qwen2.py` (LMDeploy) を起動するように変更する。
2.  **APIの統合**: `api/main.py` を廃止するか、`kotaro_api.py` に機能を取り込み、ポート競合を解消する。
3.  **Frontend実装**: `ImageEditor.tsx` に `/generate` エンドポイントへの接続処理を実装する。
