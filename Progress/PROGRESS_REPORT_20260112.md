# 進捗管理レポート (2026-01-12)

## 1. プロジェクト概要
**プロジェクト名**: X-AUTO-POST-SYSTEM-otakuDJ
**目的**: イベント写真自動投稿システム（"CANDY虎太郎"ペルソナによる18文字エモコメント生成）
**現状ステータス**: ⚠️ **フェーズ2.5 進行中（環境不整合あり）**

## 2. エグゼクティブ・サマリー
**【直近の状況】**
- 2026-01-04: フェーズ2.4完了、E2Eテスト成功（LMDeploy @ 23334 使用）。
- 2026-01-05: 憲法準拠リファクタリング（プロンプト最適化）完了。
- **現在 (2026-01-12)**: 起動スクリプトとコードの間で**クリティカルな構成不整合**が検出されました。

---

## 3. クリティカルな検出事項 (要対応)

### ① 推論バックエンドの不整合（System Broken）
| コンポーネント | 設定/状態 | 判定 |
|:---|:---|:---|
| `start_kotaro.sh` | **Ollama** を起動 (通常ポート 11434) | ❌ **不整合** |
| `kotaro_api.py` | **LMDeploy** (ポート 23334) へ接続試行 | ❌ **接続不可** |

**影響**: 現在の `start_kotaro.sh` を使用すると、APIサーバーは推論エンジンに接続できずエラーになります。Jan 4thの成功時は、手動でLMDeployを起動していたか、別のスクリプトを使用していたと推測されます。

### ② APIポート競合 (Double Management)
- **`kotaro_api.py`**: Port **8000** (Local LLM / Main Backend)
- **`api/main.py`**: Port **8000** (Gemini API / Alternative Backend)
- **現状**: 両者が同じポートを奪い合っています。現在は `start_kotaro.sh` が `kotaro_api.py` を優先していますが、`api/main.py` の存在意義（バックアップ用？）を明確にする必要があります。

### ③ バージョン表記の混乱
- **APIコード (`kotaro_api.py`)**:
    - Docstring: `V3.0`
    - App Title: `V4.2`
    - 実装ロジック: V4.2/V4.6 混合
- **スコアラー (`kotaro_scoring_v4.py`)**:
    - 実装: `V4.6.1` (De-Cluster Logic実装済み)
- **現状**: コードは最新ですが、ドキュメントとバージョン番号が追いついていません。

---

## 4. コンポーネント別ステータス

| コンポーネント | ステータス | 詳細 |
|:---|:---|:---|
| **Frontend (Next.js)** | ✅ 正常 | `TextEditor.tsx` は `localhost:8000` (`kotaro_api.py`) に正しく接続設定済み。 |
| **Backend (Kotaro API)** | ⚠️ **構成注意** | コード自体は動作するが、バックエンド(LMDeploy)への接続設定が起動スクリプトと食い違っている。 |
| **Inference (LMDeploy)** | ❓ **要確認** | Jan 4th時点では動作していたが、現在の起動フローに含まれていない。`scripts/start_lmdeploy_local.sh` 等の検証が必要。 |
| **Vision Core** | ⏸️ 停止中 | `vision_core.py` (MiniCPM-V) は現在メインパイプラインから分離され、使用されていない。 |

---

## 5. 推奨アクションプラン (Next Steps)

1. **起動スクリプトの修正 (最優先)**
   - `start_kotaro.sh` を修正し、OllamaではなくLMDeploy (または `scripts/start_lmdeploy_local.sh`) を呼び出すように変更する。
   - または、`kotaro_api.py` をOllama対応に変更する（ただしJan 4thの成功実績はLMDeployベース）。

2. **ポート競合の解消**
   - `api/main.py` のポートを `8001` 等に変更するか、アーカイブ化する。

3. **ドキュメント整備**
   - `kotaro_api.py` のバージョン表記を `V4.6.1` (System V4.6.1) に統一する。

---
*Report created: 2026-01-12 by Jules (AI Agent)*
