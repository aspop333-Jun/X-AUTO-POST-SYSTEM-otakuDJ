---
description: テスト・システム起動の工程管理と注意事項
---

# Kotaro-Engine 工程管理ワークフロー

> [!CAUTION]
> **重要**: Ollamaは**旧システム**です。現在のVLM基盤は**LMDeploy + Qwen2-VL-2B-Instruct (localhost:23334)** です。Ollamaを使用した提案は禁止です。

---

## 1. 作業開始前の必須確認事項

### 1.1 システム構成（2026-01現在）

| コンポーネント | 正式構成 | ポート | 禁止事項 |
|--------------|---------|--------|---------|
| **VLM Server** | LMDeploy + Qwen2-VL-2B-Instruct | `localhost:23334` | ❌ Ollamaを使用しない |
| **Kotaro API** | FastAPI | `localhost:8000` | ❌ 直接LLM呼び出し禁止 |
| **フロントエンド** | Next.js | `localhost:3000` | - |

### 1.2 作業開始前チェックリスト

```
□ Progress/最新の進捗レポートを確認した
□ 現在のVLM構成を確認した（LMDeploy）
□ 関連するベンチマーク結果を確認した
□ 起動スクリプトのパスを正しく把握した
```

---

## 2. LMDeploy サーバー起動手順

### 2.1 起動方法 (WSL2環境)

```bash
# WSL2シェルを開く
wsl

# プロジェクトディレクトリへ移動
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ

# 起動スクリプトを実行
bash scripts/switch_to_qwen2.sh
```

### 2.2 起動確認

```bash
# 別のWSL/ターミナルで確認
curl http://localhost:23334/v1/models
```

**期待されるレスポンス**:
```json
{"data":[{"id":"Qwen2-VL-2B-Instruct","object":"model",...}],"object":"list"}
```

---

## 3. スコアリングテスト実行手順

### 3.1 前提条件

1. **LMDeployサーバーが起動中であること** (localhost:23334)
2. 画像ファイルが `Xpost-EX/pattern_images/` に存在すること

### 3.2 テスト実行

```powershell
# PowerShellから
cd C:\AI\APP\X-AUTO-POST-SYSTEM-otakuDJ
python scripts/test_30_images_scoring.py
```

### 3.3 最新のベンチマーク結果

| ファイル | 目的 |
|---------|------|
| `Progress/V4_6_1_BENCHMARK.md` | 最新のスコアリング結果 |
| `Progress/V4_6_1_BENCHMARK_DETAILED.md` | 詳細レポート（A~Eスコア付き） |

---

## 4. 禁止事項と注意事項

> [!WARNING]
> 以下の行為は禁止です。

1. **❌ Ollamaの使用提案** - 旧システムです
2. **❌ localhost:11434 への接続** - Ollamaのポートです
3. **❌ 進捗確認なしの作業開始** - 必ずProgress/を確認
4. **❌ 古い起動スクリプトの使用** - `switch_to_qwen2.sh`を使用

> [!IMPORTANT]
> 以下を必ず守ること。

1. **✅ LMDeploy (localhost:23334) を使用** - 正式VLM基盤
2. **✅ 作業開始前にProgress/を確認** - 最新状況を把握
3. **✅ ベンチマーク結果をProgress/に保存** - 進捗管理の徹底
4. **✅ スクリプト作成時はLMDeploy用に** - OpenAI互換APIを使用

---

## 5. よくある間違いと対処法

| 間違い | 正しい対応 |
|-------|-----------|
| `ollama list` を実行 | LMDeployを使用。`curl localhost:23334/v1/models` で確認 |
| `http://localhost:11434` に接続 | `http://localhost:23334/v1` を使用 |
| `model="llava"` を指定 | `model="Qwen2-VL-2B-Instruct"` を使用 |
| 進捗確認なしで作業開始 | `Progress/`フォルダの最新レポートを必ず確認 |

---

## 6. 参照ドキュメント

- [Progress/PROGRESS_REPORT_20260104.md](file:///C:/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/Progress/PROGRESS_REPORT_20260104.md) - 最新進捗
- [Progress/LMDEPLOY_ISSUE_REPORT.md](file:///C:/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/Progress/LMDEPLOY_ISSUE_REPORT.md) - LMDeployセットアップ経緯
- [scripts/launch_qwen2.py](file:///C:/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/scripts/launch_qwen2.py) - Qwen2-VL起動コード
- [scripts/switch_to_qwen2.sh](file:///C:/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/scripts/switch_to_qwen2.sh) - 起動シェルスクリプト
