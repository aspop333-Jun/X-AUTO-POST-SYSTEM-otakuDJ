# Progress Report: 2026-01-24

## 1. プロジェクト状況概要
- **現在フェーズ**: Phase 2.5 (Refinement) & Phase 3 (UI Integration)
- **ステータス**: ⚠️ **CRITICAL ISSUE DETECTED (Split-Brain)**
- **担当**: Jules (AI Agent)

## 2. コードレビュー結果 (本日の調査)

### 🔴 重要課題: インフラストラクチャの乖離 (Split-Brain)
- **現象**:
  - `start_kotaro.sh` (WSL起動スクリプト) が **Ollama (Port 11434)** を起動している。
  - `kotaro_api.py` (バックエンド) は **LMDeploy (Port 23334)** を参照している (`http://localhost:23334/v1`)。
- **影響**: バックエンドを起動しても、LLM/VLMに接続できずエラーになる、または期待したモデル(Qwen2-VL)が動作しない。
- **対応**: `start_kotaro.sh` を修正し、`scripts/launch_qwen2.py` を使用するように変更が必要。

### 🟠 バックエンド (`kotaro_api.py`)
- **バージョン不整合**: ドキュメント文字列は `V3.0` だが、変数は `V4.2`、内部ロジックは `V4.6.1` (Scorer) が混在。
- **API二重管理**: `api/main.py` (Gemini用) と `kotaro_api.py` (Local LLM用) が両方存在し、ポート8000の競合リスクがある。
- **実装**: `call_kotaro_generation_v3` という関数名でV4ロジックを動かしており、保守性が低い。

### 🟡 フロントエンド (`next-app/.../ImageEditor.tsx`)
- **未実装**: `onGenerateComment` が `console.log` のみ。AI生成機能がUIから呼び出せない。
- **経路分裂**: Vision機能 ("Cameko") が `next-app/src/app/api/cameko-search` (Next.js Backend) を経由しており、`kotaro_api.py` (FastAPI) のVLM分析とロジックが重複・分裂している。

### 🟢 ロジック (`kotaro_scoring_v4.py`)
- **V4.6.1実装済**: "Anti-P04 Lock" や "De-Cluster P01->P03" などの高度なロジックは実装されている。
- **課題**: `top1_score <= 2.0` の条件で P11/P12 (Flat) に落ちる比率が高く、ベンチマークの偏り (P06/P11/P12過多) の原因となっている。

## 3. リスク管理
| リスク項目 | レベル | 詳細 |
|:---|:---|:---|
| **Split-Brain** | **High** | 起動スクリプトとコードで使用するバックエンドが違うため、システムが稼働しない。 |
| **API Double Management** | **Medium** | どのAPIサーバーを起動すべきか曖昧。機能追加時に混乱する。 |
| **VRAM Usage** | **Medium** | Vision Core (MiniCPM-V) と Qwen2-VL が競合する可能性。 |

## 4. Next Steps (優先順位順)

1.  **[Infra] 起動スクリプトの修正**
    - `start_kotaro.sh` からOllamaを削除し、LMDeploy (`scripts/launch_qwen2.py`) を起動するように変更。
2.  **[Backend] APIバージョンの整理**
    - `kotaro_api.py` の表記を `V4.x` に統一し、V3時代の遺産を整理。
3.  **[Frontend] 生成機能の接続**
    - `ImageEditor.tsx` の `onGenerateComment` から `localhost:8000/generate` を叩く実装を追加。
4.  **[Logic] スコアリング調整**
    - P11/P12へのフォールバック条件 (`score <= 2.0`) を緩和し、他の感情パターンが出やすくする。

---
*Reported by Jules (2026-01-24)*
