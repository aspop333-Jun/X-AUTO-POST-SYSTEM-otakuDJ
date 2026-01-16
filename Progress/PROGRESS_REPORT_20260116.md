# 🐯 Kotaro-Engine Progress Report (2026-01-16)

## 1. 概要 (Overview)
- **現在地**: Phase 2.5 (Refinement & Integration)
- **目的**: 全コードのレビューおよび整合性確認
- **シミュレーション日付**: 2026-01-16

本日のコードレビューにより、バックエンド（V3/V4論理不整合）、フロントエンド（レガシー定義の残留）、およびインフラ（WSL起動スクリプトの破損）に関する複数の課題が特定されました。

---

## 2. コードレビュー結果 (Code Review Findings)

### 🔴 Critical (要修正)

#### 1. インフラ: WSL起動スクリプトの不整合 (`start_kotaro.sh`)
- **現状**: `start_kotaro.sh` が `ollama serve` を起動しようとしている。
- **問題**: 現在のバックエンド (`kotaro_api.py`) は `LMDeploy` (port 23334) を前提としており、Ollamaでは動作しない。
- **解決策**: Windows版 (`start_lmdeploy_system.bat`) と同様に `scripts/launch_qwen2.py` を呼び出す形へ修正が必要。

#### 2. バックエンド: バージョン定義の錯綜 (`kotaro_api.py`)
- **現状**: APIサーバーのコメントは "V4.2" を名乗っているが、内部では最新の `KotaroScorerV4` (V4.6.1相当) をインポートしている。
- **問題**: 生成ロジックが `call_kotaro_generation_v3` (V3.0) のままであり、V4のスコアリング結果（Flags等）が生成文に十分に反映されていない可能性がある。
- **ダブル管理**: `api/main.py` (Gemini) と `kotaro_api.py` (Local/Qwen) がポート8000で競合する構造になっている（運用回避中だがリスクあり）。

#### 3. フロントエンド: レガシー定義の残留 (`ScoringVisualization.tsx`)
- **現状**: 60項目に及ぶ古い採点基準 (`A01`〜`D15`, `CRITERIA_DEFINITIONS`) がコード内にハードコードされている。
- **問題**: 現在のV4ロジックは `P01`〜`P12` および `Flags` (`casual_moment`等) を使用しており、古い定義は表示ロジックと乖離しているため、開発者の混乱を招く。

### 🟡 Minor / Warning (改善推奨)

#### 4. ガバナンス不整合: "尊い" の扱い
- **現状**: `kotaro_scoring_v4.py` の P07定義 (`P07: 対比 (Group)`) において、Attackフレーズが「関係性が**尊い**」となっている。
- **問題**: `kotaro_api.py` の生成プロンプトでは、「尊い」は「抽象的逃げワード」として**禁止用語**に指定されている。
- **影響**: スコアリングで「尊い」と判定しておきながら、コメント生成ではそれを否定する矛盾が発生している。

#### 5. 遺産ファイル: `kotaro_v2.py`
- **現状**: `[DEPRECATED]` と記載された旧ファイルが存在する。
- **処置**: 混乱防止のため、削除または `old/` ディレクトリへの退避を推奨。

#### 6. ビジョン統合: `vision_core.py`
- **現状**: MiniCPM-V 2.6 (int4) を使用する `VisionCore` クラスが存在するが、`kotaro_api.py` は `LMDeploy` (Qwen2-VL) を使用しており、このモジュールは現在未使用（未統合）。

---

## 3. 次のアクション (Action Plan)

### 短期的な修正（優先度高）
1. **WSL起動スクリプトの修復**: `start_kotaro.sh` を書き換え、`scripts/launch_qwen2.py` を使用するように変更する。
2. **フロントエンドのクリーンアップ**: `ScoringVisualization.tsx` から不要な `CRITERIA_DEFINITIONS` を削除し、V4 Flagsの表示を最適化する。
3. **レガシーファイルの削除**: `kotaro_v2.py` を削除する。

### 中期的な課題（Phase 3へ向けて）
4. **V4生成ロジックの実装**: `call_kotaro_generation_v3` を `v4` へアップグレードし、検出されたFlags（例: `casual_moment`）に応じて文体を変化させる「Mods」システムを正式に組み込む。
5. **ガバナンス調整**: P07のAttackフレーズ「関係性が尊い」を「関係性が**際立つ**」などに変更し、憲法違反を回避する。

---

## 4. 承認待ち事項
- 特になし。上記のアクションプランに基づき修正作業を開始します。
