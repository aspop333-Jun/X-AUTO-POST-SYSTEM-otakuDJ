# PROGRESS_REPORT_20260122

## 1. Status / 現状ステータス
- **Phase**: 2.5 (Refinement) & 3 (UI Integration)
- **Date**: 2026-01-22
- **Focus**: インフラ不整合の解消とスコアリングロジックの適正化

## 2. Code Review / コードレビュー結果

### 🚨 Infrastructure (Critical)
- **Issue**: `start_kotaro.sh` の構成不整合 (Split-Brain)
- **Detail**:
  - `kotaro_api.py` は **Port 23334** (LMDeploy/Qwen2-VL) への接続を前提としている。
  - しかし、`start_kotaro.sh` は **Ollama** (Port 11434) を起動している。
  - 結果として、スクリプトから起動するとAPIがバックエンドに接続できずエラーとなる（Connection Refused）。
- **Action**: `start_kotaro.sh` を修正し、`scripts/launch_qwen2.py` を呼び出すように変更する必要がある。

### 🧠 Scoring Logic (V4.6.1)
- **Issue**: パターン分布の極端な偏り (P06/P11/P12支配)
- **Detail**: `kotaro_scoring_v4.py` 内の以下のロジックがボトルネックとなっている。
  ```python
  if top1_score <= 2.0:
      main_key = "None" # -> P11/P12へ直行
  ```
  - ベンチマーク(V4.7)において、P06(30%), P11(26.7%), P12(26.7%) が全体の83%を占有。
  - 感情系パターン（P01, P05, P08-P10）が出現不能状態にある。
- **Action**: 低スコア時の救済措置（None判定）の条件緩和、またはフラグによる強制分岐の強化が必要。

### 🖥 Frontend (UI Integration)
- **Issue**: `ImageEditor.tsx` の機能未実装
- **Detail**:
  - `onGenerateComment`: ログ出力のみで `kotaro_api.py` に接続されていない。
  - `onExtractMetadata`: 未実装。
- **Action**: `TextEditor.tsx` の生成ロジックを参考にするか、API連携を実装する必要がある。

### 📦 Dependencies
- `requirements-kotaro.txt` に `ollama` が残存しており、現在のLMDeploy構成と混在している。混乱を避けるためクリーンアップ推奨。

## 3. Risks / リスク管理
- **Inference Failure**: 現行の `start_kotaro.sh` ではシステムが動作しないため、デモやテスト実行時に致命的な障害となる。
- **Quality Degradation**: スコアリングの偏りにより、生成されるコメントが「無難（P11/P12）」または「コスプレ指摘（P06）」に固定化され、UXが低下している。

## 4. Next Steps / 次のアクション
1.  **Fix Startup Script**: `start_kotaro.sh` を `scripts/launch_qwen2.py` ベースに書き換える。
2.  **Refine Scoring**: `kotaro_scoring_v4.py` の `top1_score` 足切りラインを調整（例: 2.0 -> 1.5）し、P01系の出現率を上げる。
3.  **Frontend Connect**: `ImageEditor.tsx` の生成ボタンをAPIに接続する。
