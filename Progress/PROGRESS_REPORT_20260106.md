# 進捗管理レポート (2026-01-06) - コードレビュー完了版

## 1. プロジェクト概要
**プロジェクト名**: X-AUTO-POST-SYSTEM-otakuDJ
**目的**: イベント写真自動投稿システム（"CANDY虎太郎"ペルソナによる18文字エモコメント生成）
**フェーズ**: Phase 2.5 (V3 → V4.2 移行期)

## 2. エグゼクティブ・サマリー
全コードのレビューを実施し、**「インフラ構成の矛盾」**と**「ロジックの不整合」**という2つの重大なブロッカーを特定しました。
現状のコードベースは、V4.2の高度なロジック（LMDeploy前提）と、旧来のセットアップ（Ollama前提）が混在しており、このままでは正常にV4機能をフル発揮できません。

**【緊急対応が必要な項目】**
1. 🚨 **起動スクリプトの不整合**: WSL用スクリプトが誤った推論サーバー(Ollama)を起動している。
2. 🚨 **ポート競合**: 旧Gemini APIと新Kotaro APIが共に `8000` 番ポートを使用。
3. ⚠️ **生成ロジックのバージョン遅れ**: スコアリングはV4だが、コメント生成部がV3（単純プロンプト）のまま。

---

## 3. コードレビュー詳細結果

### 3.1 インフラストラクチャ (Infrastructure)
| コンポーネント | 現状 | 問題点 |
|:---|:---|:---|
| **start_kotaro.sh** | `ollama serve` (Port 11434) を起動 | バックエンドは **LMDeploy (Port 23334)** を要求しているため、接続エラーになる。 |
| **start_lmdeploy_system.bat** | `scripts/launch_qwen2.py` を起動 | こちらが正解（Windows側は正しいが、WSL運用と乖離）。 |
| **Ports** | `kotaro_api.py`: 8000<br>`api/main.py`: 8000 | 同時に起動できない。Frontendは 8000 を参照しているため、どちらが動いているかで挙動が変わる。 |

### 3.2 バックエンド (Backend: kotaro_api.py)
| 機能 | バージョン | 状態 |
|:---|:---|:---|
| **VLM分析** | V4.2 | ✅ `Qwen2-VL` 用にXMLタグ付きプロンプトで実装済み。 |
| **スコアリング** | V4.6.1 | ✅ `KotaroScorerV4` (De-Cluster logic) が実装済み。 |
| **コメント生成** | **V3.0** | ⚠️ V4の判定結果（Bone/Mods）を活かしきれていない旧来の関数 `call_kotaro_generation_v3` を使用中。 |
| **Vision Core** | V2.6 | ⚠️ `vision_core.py` (MiniCPM-V) は独立しており、APIから呼び出されていない。現状はQwen2-VL一本化構成。 |

### 3.3 フロントエンド (Frontend: Next.js)
| コンポーネント | 状態 | 備考 |
|:---|:---|:---|
| **TextEditor.tsx** | ✅ 連携済み | `localhost:8000/generate` に接続。V4スコア表示(`ScoringVisualization`)に対応済み。 |
| **ImageEditor.tsx** | 🚧 未連携 | AI生成ボタンなどのUIはあるが、バックエンド呼び出しは未実装。 |

---

## 4. 推奨アクションプラン (Next Steps)

### Step 1: インフラ正常化（最優先）
- `start_kotaro.sh` を修正し、Ollamaではなく `scripts/launch_qwen2.py` (LMDeploy) を起動するように変更する。
- `api/main.py` のポートを `8001` 等に変更し、競合を解消する。

### Step 2: V4ロジックの完全適用
- `kotaro_api.py` に `call_kotaro_generation_v4` を実装。
- V4スコアラーが算出する `mods` (文体指定) や `bone` (骨子) をプロンプトに反映させ、"脱・定型文"を実現する。

### Step 3: Vision Coreの方針決定
- RTX 4060に最適化された `vision_core.py` (MiniCPM-V) を使用するか、現在の `Qwen2-VL` (LMDeploy) で行くかを確定させる。
- *推奨*: 現在のLMDeploy構成で動作確認ができれば、統合コストの低いQwen2-VL維持で良い。

---
*Report generated: 2026-01-06 by Jules (Code Reviewer)*
