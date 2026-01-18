# 進捗管理レポート (2026-01-17)

## 1. プロジェクト概要
**プロジェクト名**: X-AUTO-POST-SYSTEM-otakuDJ
**目的**: イベント写真自動投稿システム（"CANDY虎太郎"ペルソナによる18文字エモコメント生成）
**現状ステータス**: ⚠️ **Phase 2.5: Refinement & Integration (要修正)**

## 2. エグゼクティブ・サマリー
本日の全コードレビューにより、メモリ上の認識と実際のコードベース間に重大な乖離が複数発見されました。特にインフラ（起動スクリプト）とバックエンドロジックの整合性に問題があり、現時点ではシステムが正常に一括起動しない状態です。

**【主な発見事項】**
1. ⚠️ **起動スクリプト不全**: `start_kotaro.sh` が Ollama を起動しているが、API は LMDeploy (Port 23334) を要求している。
2. ⚠️ **Vision統合未完了**: 高速化用 `vision_core.py` (MiniCPM-V) が実装されているが、どこからも呼び出されていない（死にコード状態）。
3. ⚠️ **API二重管理**: `api/main.py` (Gemini版) と `kotaro_api.py` (Local LLM版) が共にポート 8000 を使用しており競合する。
4. ⚠️ **フロントエンド残骸**: `ScoringVisualization.tsx` に削除されたはずのレガシー定義 (`CRITERIA_DEFINITIONS`) が残存している。

---

## 3. 詳細課題分析

### A. バックエンド & インフラ
| コンポーネント | 現状 | 問題点 |
|:---|:---|:---|
| **kotaro_api.py** | V4.7 ロジック使用と主張 (コード内は V4.2 表記) | `http://localhost:23334` (LMDeploy) に依存。Ollama は使用していない。 |
| **start_kotaro.sh** | Ollama を起動 | **致命的**: LMDeploy (`scripts/launch_qwen2.py`) を起動していないため、API が機能しない。 |
| **vision_core.py** | Standalone (MiniCPM-V) | 実装済みだが `kotaro_api.py` に import されておらず、未使用。 |
| **api/main.py** | Gemini API Wrapper | `kotaro_api.py` とポート 8000 で競合。不要であれば削除または統合が必要。 |

### B. ロジック & スコアリング
| ファイル | バージョン | 状態 |
|:---|:---|:---|
| **kotaro_scoring_v4.py** | V4.6.1 (Logic) | コードは V4.6.1 (Anti-P04 Lock / B-gate) を実装しているが、コメント等は V4.2/4.3 のまま。 |
| **V4_7_BENCHMARK** | Report Only | レポートでは P06/P11/P12 が支配的。ロジックの調整が必要な可能性。 |

### C. フロントエンド (Next.js)
| コンポーネント | 状態 | 問題点 |
|:---|:---|:---|
| **ScoringVisualization.tsx** | Legacy Code 残存 | `CRITERIA_DEFINITIONS` (60項目) が使用されずに残っている。可読性低下。 |
| **ImageEditor.tsx** | API Route 依存 | `kotaro_api.py` ではなく `/api/cameko-search` 等の Next.js API を呼んでいる。バックエンド統一が必要。 |

---

## 4. Next Steps (修正計画)

明日以降、以下の順序で整合性を回復させる必要があります。

1.  **インフラ修復 (優先度: 高)**
    *   `start_kotaro.sh` を修正し、Ollama ではなく LMDeploy (`scripts/launch_qwen2.py`) を起動するように変更する。
    *   不要な `requirements-kotaro.txt` の `ollama` 依存を削除検討。

2.  **API統合 (優先度: 高)**
    *   `api/main.py` を廃止または `kotaro_api.py` に統合し、ポート競合を解消する。
    *   `kotaro_api.py` 内のバージョン表記を実態 (V4.7/V4.6.1) に合わせる。

3.  **Vision統合 (優先度: 中)**
    *   `vision_core.py` を `kotaro_api.py` に組み込み、LMDeploy 経由の Vision 処理をローカル最適化版に置き換えるか検討する。

4.  **コードクリーンアップ (優先度: 低)**
    *   `ScoringVisualization.tsx` の不要コード削除。
    *   `kotaro_scoring_v4.py` のコメント整備。

---
*Report generated: 2026-01-17 by Jules (AI Agent)*
