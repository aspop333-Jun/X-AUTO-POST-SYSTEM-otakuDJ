# 2026-01-19 プロジェクト進捗レポート (Phase 2.5)

## 1. 概要 (Executive Summary)
プロジェクトは現在「Phase 2.5: Refinement & Integration (洗練と統合)」の段階にあります。本日のレビューでは、ベンチマークテスト(V4.7)が完了しているものの、システム運用面でいくつかの重大な不整合（ポート競合、起動スクリプトの破損、APIバージョン表記のズレ）が確認されました。これらは開発速度を低下させる要因となるため、次回の作業で優先的に解決する必要があります。

## 2. 現在のステータス (Current Status)

| 項目 | 状態 | 詳細 |
|---|---|---|
| **コアロジック** | ✅ 完了 | V4.7 (A-E採点 + 12パターン) は `kotaro_api.py` に実装済み。 |
| **ベンチマーク** | ✅ 完了 | `V4_7_BENCHMARK_REPORT.md` にて30枚のテスト完了。P06/P11/P12に偏る傾向あり。 |
| **フロントエンド** | ⚠️ 部分的 | `TextEditor.tsx` は接続済みだが、`ImageEditor.tsx` の機能 (Cameko, FactCheck) が未接続。 |
| **環境構築** | ❌ 警告 | WSL環境での起動スクリプト (`start_kotaro.sh`) が破損（誤ったバックエンドを指定）。 |
| **API管理** | ❌ 競合 | `kotaro_api.py` と `api/main.py` が同じポート8000を取り合っている。 |

## 3. コードレビュー詳細結果 (Code Review Findings)

### 🚨 Critical Issues (優先度: 高)

1.  **APIポート競合 (Double Management)**
    *   **現象:** `kotaro_api.py` (Local LLM用) と `api/main.py` (Gemini用) の両方が `port=8000` で起動するように設定されています。
    *   **影響:** 同時に起動できず、どちらかの機能が使えなくなります。
    *   **推奨:** Gemini版の統合、またはポート番号の変更 (例: Gemini版を 8001 に)。

2.  **起動スクリプトの不整合 (`start_kotaro.sh`)**
    *   **現象:** WSL用の起動スクリプトが、現在使用していない `ollama serve` を起動し、必要な `LMDeploy` (ポート23334) を起動していません。
    *   **影響:** WSL環境で開発・実行しようとするとバックエンドエラーで動作しません。
    *   **推奨:** Windows版 `start_lmdeploy_system.bat` と同様に `scripts/launch_qwen2.py` を呼び出すよう修正が必要です。

3.  **依存関係の不整合 (`requirements-kotaro.txt`)**
    *   **現象:** `requirements.txt` には `ollama` が記載されていますが、現在のコードベースは `lmdeploy` (OpenAI互換クライアント) に移行しています。
    *   **影響:** 新規セットアップ時に混乱を招きます。

### ⚠️ Minor Issues (優先度: 中)

1.  **バージョン表記の混乱**
    *   `kotaro_api.py` のヘッダーコメント: `(V3.0)`
    *   FastAPIのタイトル: `Kotaro-Engine API (V4.2)`
    *   実態/ベンチマーク: `V4.7`
    *   **推奨:** コメントとAPIタイトルを実態に合わせて `V4.7` に統一すべきです。

2.  **フロントエンド未実装機能 (`ImageEditor.tsx`)**
    *   `onGenerateComment` (AIコメント生成) が TODO のままです。
    *   `onExtractMetadata` (メタデータ抽出) が TODO のままです。
    *   Cameko検索は `/api/cameko-search` (Next.js API) を呼んでいますが、これがPythonバックエンドとどう連携するかが不明確です。

## 4. リスクアセスメント (Risk Assessment)

*   **開発効率低下:** 起動スクリプトが壊れているため、手動でのサーバー立ち上げが必要になり、開発者の負担になっています。
*   **混乱:** 「V3なのかV4なのか」の表記ゆれは、デバッグ時の判断ミスを誘発する可能性があります。

## 5. 次のステップ (Next Steps)

1.  **環境修復 (Fix Environment)**
    *   `start_kotaro.sh` を修正し、LMDeployを正しく起動するようにする。
    *   `api/main.py` のポートを変更するか、機能を `kotaro_api.py` に統合する。

2.  **コードクリーンアップ (Cleanup)**
    *   `kotaro_api.py` のバージョン表記を `V4.7` に更新。
    *   不要な `kotaro_v2.py` などのレガシーファイルを `deprecated/` に移動または削除。

3.  **フロントエンド接続 (Frontend Integration)**
    *   `ImageEditor.tsx` のボタンをバックエンドAPIに正しく配線する。
