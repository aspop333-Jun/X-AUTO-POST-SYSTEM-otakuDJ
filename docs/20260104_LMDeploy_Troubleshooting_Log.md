# LMDeploy 導入トラブルシューティング記録
**記録日:** 2026-01-04
**対象:** Qwen-VL-Chat-Int4 on LMDeploy v0.11.1 (WSL2)

## 概要
LMDeployを用いて `Qwen-VL-Chat-Int4` を起動しようとした際、複数の依存関係エラー（Dependency Hell）に遭遇し、最終的にモデル自体の変更（Qwen2-VL-2B）を決定した経緯の記録。

## 発生したエラーと対処履歴

### 1. ModuleNotFoundError (起動コマンド)
- **事象:** `python3 -m lmdeploy.serve.api_server` で起動しようとすると `No module named 'lmdeploy.serve.api_server'` エラー。
- **原因:** LMDeploy v0.11.1 ではモジュール構造が変更されており、正しくは `lmdeploy.serve.openai.api_server` であった。
- **対処:** 公式CLIコマンド `lmdeploy serve api_server ...` を使用することで解決。

### 2. AttributeError: 'NoneType' object has no attribute 'device_type'
- **事象:** CLI経由で起動すると、内部で `backend_config` が `None` となりクラッシュ。
- **原因:** `fire` ライブラリによるCLI引数解析のバグ、または使用方法の不一致。
- **対処:** `scripts/launch_server.py` を作成し、Pythonコード内で明示的に `PytorchEngineConfig` オブジェクトを生成して渡すことで回避。

### 3. RuntimeError: Unsupported quant method: gptq
- **事象:** `PytorchEngine` バックエンドで起動時、モデルロード中にクラッシュ。
- **原因:** LMDeployのPyTorchバックエンドが `gptq` 量子化形式のネイティブサポートに制約がある（AWQ推奨など）、または `auto-gptq` との連携不全。
- **対処:** バックエンドを `turbomind` に切り替えようとしたが、次の依存関係エラーにより阻まれる。

### 4. ImportError: cannot import name 'BeamSearchScorer' (Dependency Hell 1)
- **事象:** Qwen-VLが必要とする `transformers_stream_generator` が `transformers` から `BeamSearchScorer` をインポートできずにクラッシュ。
- **原因:** インストールされた `transformers` (v4.57.3) が新しすぎて、旧API (`BeamSearchScorer`) が削除されていた。
- **対処:** `transformers` を **v4.38.2** にダウングレード。しかし、これが次のエラーを引き起こす。

### 5. ImportError: cannot import name 'ImagesKwargs' (Dependency Hell 2)
- **事象:** LMDeploy内部の `Gemma3VisionModel` (新しいモデル用コード) が `transformers.processing_utils` から `ImagesKwargs` をインポートできずにクラッシュ。
- **原因:** `transformers` v4.38.2 は古すぎて、`ImagesKwargs` がまだ存在しない。
- **板挟み状態 (Deadlock):**
  - Qwen-VL を動かすには **古い Transformers** が必要。
  - LMDeploy (比較的新しいVer) を動かすには **新しい Transformers** が必要。
  - 両立させるためのパッチ（LMDeployソースコードのコメントアウト）を試みたが、不安定要因となるため断念。

## 結論 (Decision)
**「Qwen-VL-Chat-Int4」の採用を中止する。**
古いモデルと新しい推論エンジンの組み合わせによるライブラリ不整合が激しく、保守コストが見合わないため。

## 次の戦略
**「Qwen2-VL-2B-Instruct」へ移行する。**
- `transformers` を最新版にできるため、依存関係の問題が解消する。
- 2Bモデルにより VRAM 8GB 環境でも非量子化（BF16/Int8）で動作可能であり、"Unsupported quant method" エラーも回避できる。
- アーキテクチャを「2パス構成」に変更し、再現性を担保する。
