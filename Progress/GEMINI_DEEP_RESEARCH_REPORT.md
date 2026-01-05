# LMDeploy障害分析レポート（Gemini Deep Research）

**作成日時**: 2026-01-03 22:00  
**作成者**: Gemini Deep Research  
**目的**: 明日のデバッグ作業用技術基盤

---

## 1. 障害の本質

### 1.1 「沈黙のエラー」の正体
- **WSL 2のI/Oバッファリング**により、C++レベルのクラッシュ時にPythonのエラーメッセージがフラッシュされずに消失
- PowerShellとWSL間の標準入出力ハンドリングの構造的脆弱性

### 1.2 モデル世代の混同問題
| モデル世代 | モデル名 | 推奨 transformers | 特徴 |
|-----------|---------|-------------------|------|
| **初代** | Qwen-VL-Chat-Int4 | **4.32.0 - 4.37.2** | `trust_remote_code=True` 必須 |
| 第2世代 | Qwen2-VL | 4.41.2 - 4.45.0 | ネイティブサポート |
| 第2.5世代 | Qwen2.5-VL | 4.49.0以上 | 最新機能対応 |

**重要**: 我々が使用している `Qwen-VL-Chat-Int4` は**初代**であり、transformers v4.32.0 ～ v4.37.0 が必要。

---

## 2. 明日のアクションプラン

### Step 1: ログの可視化
```bash
# WSLに直接入る（PowerShell経由を避ける）
wsl -d Ubuntu-22.04

# 環境変数設定でバッファリング無効化
export PYTHONUNBUFFERED=1
export LMDEPLOY_LOG_LEVEL=DEBUG
export CUDA_LAUNCH_BLOCKING=1
```

### Step 2: バージョン整合性の回復
```bash
# ターゲット構成
# lmdeploy: 0.11.1
# transformers: 4.37.2 または 4.46.1

pip uninstall transformers lmdeploy auto-gptq optimum -y
pip install "transformers==4.37.2"
pip install lmdeploy==0.11.1
pip install auto-gptq optimum tiktoken einops transformers_stream_generator
```

### Step 3: PyTorchバックエンドで起動テスト
```bash
lmdeploy serve api_server Qwen/Qwen-VL-Chat-Int4 \
    --server-port 23333 \
    --backend pytorch
```

### Step 4: （代替）Dockerによる環境隔離
```bash
docker run --gpus all --rm -it --ipc=host \
    -v $HOME/.cache/huggingface:/root/.cache/huggingface \
    -p 23333:23333 \
    openmmlab/lmdeploy:v0.1.0 \
    lmdeploy serve api_server Qwen/Qwen-VL-Chat-Int4
```

---

## 3. 根本原因の推測

1. **transformers バージョン不整合**
   - lmdeploy 0.11.1 が要求: v4.33.0 ~ v4.46.1
   - 初代Qwen-VLが要求: v4.32.0 ~ v4.37.0
   - この範囲の重複は v4.33.0 ~ v4.37.0

2. **量子化バックエンドの不整合**
   - Qwen-VL-Chat-Int4 は **AutoGPTQ形式**
   - lmdeploy のTurboMind は **AWQ形式**に最適化
   - `--backend pytorch` または明示的な変換が必要

3. **必須ライブラリの欠落**
   - `transformers_stream_generator`
   - `tiktoken`
   - `auto-gptq`
   - `optimum`

---

## 4. 結論

Exit code 1 は「敗北」ではなく、環境の不整合を告げるシグナル。
明日は以下の優先順位で対応：

1. WSL内で直接実行してログを可視化
2. transformers を v4.37.2 に固定
3. --backend pytorch オプション使用
4. それでもダメならDocker環境へ移行
