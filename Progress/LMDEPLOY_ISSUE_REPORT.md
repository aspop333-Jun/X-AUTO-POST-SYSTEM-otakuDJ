# LMDeploy セットアップ問題レポート

**作成日時**: 2026-01-03 20:52  
**作成者**: Antigravity  
**目的**: ChatGPT / Gemini によるDeep Research用

---

## 1. 目標

Ollama依存の現行VLM基盤を、**LMDeploy + Qwen-VL-Chat-Int4** に移行する。
- WSL2 (Ubuntu-22.04) 上でLMDeploy APIサーバーを起動
- `localhost:23333` でOpenAI互換APIを提供
- `kotaro_api.py` (FastAPI) からJSON形式で60項目判定を行う

---

## 2. 環境情報

### ハードウェア
| 項目 | 値 |
|-----|-----|
| GPU | NVIDIA GeForce RTX 4060 |
| VRAM | 8188 MiB (8GB) |
| Driver Version | 591.44 |
| OS | Windows 11 + WSL2 (Ubuntu-22.04) |

### ソフトウェア（WSL内 `.venv_lmdeploy`）
| パッケージ | バージョン |
|-----------|-----------|
| lmdeploy | 0.11.1 |
| torch | 2.x (CUDA対応版) |
| transformers | 4.x |
| einops | インストール済み |
| timm | インストール済み |
| matplotlib | インストール済み |
| transformers_stream_generator | 0.0.5 |

### nvidia-smi 動作確認
```
name, driver_version, memory.total
NVIDIA GeForce RTX 4060, 591.44, 8188 MiB
```
✅ WSL内から `nvidia-smi` は正常に動作

---

## 3. 試行した手順

### Phase 1: Docker (失敗)

```bash
docker run -d --gpus all \
  -p 23333:23333 \
  --name lmdeploy-vlm \
  openmmlab/lmdeploy:latest \
  lmdeploy serve api_server Qwen/Qwen-VL-Chat-Int4 ...
```

**エラー**:
```
RuntimeError: cuda runtime error (500) : named symbol not found
```

**原因推測**:
- Dockerイメージ内のCUDA/PyTorchバージョンとWSL2のCUDAドライバーの不整合
- WSL2のCUDAパススルー制限

**対策として断念** → WSL直インストールに方針変更

---

### Phase 2: WSL直インストール

```bash
python3 -m venv .venv_lmdeploy
source .venv_lmdeploy/bin/activate
pip install lmdeploy matplotlib transformers_stream_generator einops timm
```

**インストール自体は成功**。

---

### Phase 3: インポートテスト

```bash
python -c "from lmdeploy import serve; print('Import Success!')"
```

**結果**: ✅ 成功 (Exit code: 0)

---

### Phase 4: サーバー起動 (失敗)

```bash
lmdeploy serve api_server \
    Qwen/Qwen-VL-Chat-Int4 \
    --server-port 23333 \
    --model-format awq \
    --quant-policy 4 \
    --cache-max-entry-count 0.4
```

**エラー** (ログの断片):
```
Fetching 20 files: 100%|█|
...
ImportError: cannot import ... (transformers/__init__.py)
```

**問題点**:
- `from lmdeploy import serve` は成功するのに、実際のサーバー起動時にImportErrorが発生
- エラーメッセージの詳細が切れて見えない（ログ出力の問題）

---

## 4. 現在の症状

| テスト | 結果 |
|-------|------|
| `nvidia-smi` | ✅ 成功 |
| `pip install lmdeploy` | ✅ 成功 |
| `python -c "from lmdeploy import serve"` | ✅ 成功 |
| `lmdeploy serve api_server ...` | ❌ 失敗 (ImportError) |

**矛盾**: インポートは成功するのに、サーバー起動時にImportErrorが発生する

---

## 5. 使用しているスクリプト

### scripts/start_lmdeploy_local.sh
```bash
#!/bin/bash
set -e

if [ ! -d ".venv_lmdeploy" ]; then
    python3 -m venv .venv_lmdeploy
fi

source .venv_lmdeploy/bin/activate

if ! command -v nvidia-smi &> /dev/null; then
    echo "Error: nvidia-smi not found."
    exit 1
fi

echo "=== Starting LMDeploy (Local WSL) ==="
lmdeploy serve api_server \
    Qwen/Qwen-VL-Chat-Int4 \
    --server-port 23333 \
    --model-format awq \
    --quant-policy 4 \
    --cache-max-entry-count 0.4
```

---

## 6. 疑われる原因

1. **Qwen-VL-Chat-Int4 固有の依存関係**
   - このモデルには `transformers` ライブラリの特定バージョンや、追加のカスタムコードが必要かもしれない
   - `trust_remote_code=True` が必要なモデルで、リモートコードのimportに失敗している可能性

2. **lmdeploy 0.11.1 と transformers の互換性問題**
   - 最新の transformers と lmdeploy の間でAPI変更があった可能性

3. **AWQ形式のサポート問題**
   - `--model-format awq` が正しく認識されていない可能性
   - Qwen-VL-Chat-Int4 は実際にはAWQ形式ではない可能性

4. **WSL2特有のPythonパス問題**
   - `/mnt/c/...` パスでの実行時に一部モジュールが見つからない可能性

---

## 7. 追加情報として確認すべきこと

1. **エラーの完全なスタックトレース**
   - `2>&1 | tee error.log` でログを保存して確認

2. **transformersのバージョン**
   ```bash
   pip show transformers
   ```

3. **モデル形式の確認**
   - Qwen/Qwen-VL-Chat-Int4 がGPTQなのかAWQなのか

4. **lmdeployの公式ドキュメント**
   - Qwen-VLのサポート状況
   - 必要な依存関係リスト

---

## 8. 代替案（もし解決しない場合）

1. **vLLM を試す**
   - LMDeployの代わりにvLLMでQwen-VLを動かす

2. **Ollama に戻す**
   - Qwen2.5-VL 7B をOllamaで引き続き使用

3. **MiniCPM-V に戻す**
   - vision_core.py の既存実装をそのまま使用

---

## 9. 参考リンク

- [LMDeploy GitHub](https://github.com/InternLM/lmdeploy)
- [Qwen-VL-Chat-Int4 HuggingFace](https://huggingface.co/Qwen/Qwen-VL-Chat-Int4)
- [LMDeploy Supported Models](https://lmdeploy.readthedocs.io/en/latest/supported_models.html)

---

## 10. エラーログの詳細（2026-01-03 20:57 取得）

### 判明している情報

```
Fetching 20 files: 100%  # モデルファイルのダウンロードは成功

# サーバー起動処理
File "...lmdeploy/.../api_server.py", line 270, in api_server
    run_api_server(...)

# モデルロード処理
model = AutoModelForCausalLM.from_pretrained(..., trust_remote_code=True)

# エラー発生箇所
File "<frozen importlib._bootstrap>"
File ".../site-packages/transformers/__init__.py"
ImportError: cannot import [名前が切れて見えない] from 'transformers'
```

### 重要なポイント

1. **モデルファイルのダウンロードは成功している**（Fetching 20 files: 100%）

2. **`trust_remote_code=True` でロードしようとしている**
   - Qwen-VLはカスタムコードを含むモデル
   - HuggingFaceからリモートコードをダウンロードして実行する

3. **`transformers/__init__.py` でImportError**
   - transformersライブラリ自体のインポートで問題が発生
   - 「cannot import [何か]」の「何か」の部分が切れて見えない

### 推測される原因

1. **transformersのバージョン問題**
   - Qwen-VLのリモートコードが要求するtransformersバージョンと、インストール済みのバージョンが不一致
   - 例：`from transformers import SomeNewClass` で、そのクラスが古いバージョンには存在しない

2. **lmdeploy 0.11.1 と transformers の互換性**
   - lmdeployが想定する transformers API と実際のバージョンにズレがある

### 確認すべきこと

```bash
# transformers のバージョン確認
pip show transformers

# Qwen-VLが要求するtransformersバージョンを確認
# → HuggingFace の Qwen/Qwen-VL-Chat-Int4 のREADMEを確認

# transformers のアップグレード/ダウングレード
pip install transformers==4.37.0  # 例：特定バージョンに固定
```

---

## 11. 次のアクション候補

1. **transformersのバージョンを変更して再試行**
   ```bash
   pip install transformers==4.37.0
   # または
   pip install transformers==4.40.0
   ```

2. **Qwen-VL-Chat-Int4 ではなく通常版を試す**
   ```bash
   lmdeploy serve api_server Qwen/Qwen-VL-Chat --server-port 23333
   ```

3. **lmdeployのバージョンを下げる**
   ```bash
   pip install lmdeploy==0.5.0
   ```

4. **完全に別のアプローチ：vLLM を使う**
   - LMDeployではなくvLLMでQwen-VLを動かす

5. **Ollama に戻す**
   - 動作実績のある構成に戻る
