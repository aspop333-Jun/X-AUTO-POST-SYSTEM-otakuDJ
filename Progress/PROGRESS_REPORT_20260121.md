# 進捗管理レポート (2026-01-21) - コードレビュー版

## 1. プロジェクト概要
**プロジェクト名**: X-AUTO-POST-SYSTEM-otakuDJ
**目的**: イベント写真自動投稿システム（"CANDY虎太郎"ペルソナによる18文字エモコメント生成）
**現状ステータス**: ⚠️ **フェーズ2.5（リファクタリング & インフラ修正）**

## 2. エグゼクティブ・サマリー
**【本日の成果: 全体コードレビュー】**
毎日の定時コードレビューを実施し、以下のクリティカルな課題を特定しました。

1. ❌ **インフラ "Split-Brain" 問題**: 起動スクリプト (`start_kotaro.sh`) が非推奨の `Ollama` を起動しており、実際のバックエンド (`LMDeploy`) と乖離している。
2. ⚠️ **スコアリングの偏り**: ベンチマーク(V4.7)にて P06(30%), P11(26.7%), P12(26.7%) が全体の8割を占める不均衡を確認。
3. ⚠️ **ポート競合リスク**: `kotaro_api.py` と `api/main.py` (Gemini) が共に Port 8000 を使用する設定になっている。

---

## 3. コンポーネント別ステータス

| コンポーネント | ステータス | 詳細 |
|:---|:---|:---|
| **Start Script** | ❌ **要修正** | `start_kotaro.sh` が `ollama` を参照中 (正: `scripts/launch_qwen2.py`) |
| **Backend API** | ⚠️ **競合** | `kotaro_api.py` が Port 8000 で待機 (Gemini APIと競合) |
| **Logic (V4)** | ⚠️ **調整中** | `kotaro_scoring_v4.py` の判定ロジックに偏りあり |
| **Frontend** | ⏳ **実装待ち** | `ImageEditor.tsx` の Vision機能未接続 |

---

## 4. コードレビュー詳細 (本日の重点)

### ① インフラ乖離 (start_kotaro.sh vs scripts/launch_qwen2.py)
- **現状**: WSL用起動スクリプト `start_kotaro.sh` が `ollama serve` を実行していますが、`kotaro_api.py` は `localhost:23334` (LMDeploy) を参照しています。
- **影響**: このままスクリプトで起動すると API がバックエンドに接続できずエラーになります。
- **対策**: `start_kotaro.sh` を修正し、`scripts/launch_qwen2.py` を呼び出すように変更する必要があります。

### ② スコアリングロジックの偏り (kotaro_scoring_v4.py)
- **P06 (キャラ) 過多**: `costume_strong` フラグが入ると `C` 要素に +0.7 加点され、そのまま P06 (Costume) に直行するルートが強すぎます。
- **P11/P12 (フラット) 過多**: `decide_pattern` 内の `top1_score <= 2.0` 条件により、スコアが全体的に低いと強制的に P11/P12 に分類されています。ベーススコアの底上げか、判定閾値の緩和が必要です。

### ③ APIポート管理
- `kotaro_api.py`: `uvicorn.run(..., port=8000)`
- `api/main.py`: Gemini用APIも Port 8000 を想定
- **対策**: ローカルLLM側 (`kotaro_api.py`) を 8001 や 8080 に移動することを推奨します。

---

## 5. Next Steps
1. **[優先] 起動スクリプトの修正**: `start_kotaro.sh` を LMDeploy 対応に書き換え。
2. **スコアリング調整**: P06 への遷移条件を厳格化し、P01/P05 等への分散を図る。
3. **フロントエンド統合**: `ImageEditor.tsx` から API への接続実装。

---
*Report generated: 2026-01-21 18:00 by Jules (AI Engineer)*
