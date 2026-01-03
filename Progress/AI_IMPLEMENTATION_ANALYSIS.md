# AI実装技術分析レポート (2026-01-03)

## 📋 概要

このドキュメントは、X-AUTO-POST-SYSTEM-otakuDJプロジェクトにおけるAI実装の技術的詳細をまとめたものです。

---

## 1. CUDA vs Triton の実装状況

### 現状: **Pure Python + BitsAndBytes**

| 項目 | 状況 |
|------|------|
| **カスタムCUDA C++** | ❌ なし |
| **Triton カーネル** | ❌ なし |
| **実装言語** | Python のみ |

### 詳細説明

現在のプロジェクトには**カスタムCUDAカーネル（.cu）やC++拡張は存在しません**。

AI推論は以下のライブラリに依存しています：

```
PyTorch 2.5.1+cu124    → 内部でCUDAカーネルを使用
BitsAndBytes 0.43.1+   → int4/NF4量子化のCUDAカーネル提供
Ollama                 → 内部でllama.cppのCUDA実装を使用
```

#### CUDA最適化の設計書

[CUDA_OPTIMIZATION_SPEC.md](file:///c:/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/CUDA_OPTIMIZATION_SPEC.md) には、**将来の最適化候補**として以下が提案されています（未実装）：

| 候補 | 説明 | ステータス |
|------|------|----------|
| Flash Attention v2/v3 | タイル化アテンション | 📝 設計案のみ |
| Fused Int4 GEMM | dequant + matmul融合 | 📝 設計案のみ |
| GPU Image Preprocessing | PIL→CUDA直接処理 | 📝 設計案のみ |
| Paged KV Cache | vLLMスタイルのメモリ管理 | 📝 設計案のみ |

> **結論**: 現時点ではカスタムCUDA/Triton実装は存在せず、PyTorch/BitsAndBytes/Ollamaの組み込みカーネルに依存しています。

---

## 2. モデル量子化

### 使用中の量子化方式

| モデル | 量子化 | ライブラリ |
|--------|--------|-----------|
| **MiniCPM-V 2.6** | int4 (NF4) | BitsAndBytes |
| **Qwen2.5-VL 7B** | Q4_K_M | llama.cpp (Ollama) |
| **Qwen2.5-7B-Instruct** | Q4_K_M | llama.cpp (Ollama) |

### MiniCPM-V 2.6 int4 の詳細

```python
# vision_core.py (L104-109)
model = AutoModel.from_pretrained(
    "openbmb/MiniCPM-V-2_6-int4",
    trust_remote_code=True,
    device_map="cuda",
    torch_dtype=torch.float16,
)
```

- **方式**: BitsAndBytes NF4 (Normalized Float 4-bit)
- **VRAM使用**: 約 5.64 GB
- **精度**: FP16 演算 + 4-bit 重み

### Ollama モデルの量子化

```bash
# setup_kotaro.sh で pull されるモデル
qwen2.5vl:7b              # Vision用
qwen2.5:7b-instruct-q4_K_M  # コメント生成用
```

- **方式**: GGUF Q4_K_M (4-bit quantization with K-quants Medium)
- **特徴**: llama.cpp独自のCUDA最適化済みカーネル使用

---

## 3. アテンション実装

### 現在のアテンション方式

| コンポーネント | アテンション | Flash Attention |
|---------------|-------------|-----------------|
| **MiniCPM-V 2.6** | GQA (Grouped Query) | ❌ 標準SDPA |
| **Ollama (Qwen)** | GQA | ✅ 有効（環境変数） |

### Flash Attention の状況

```bash
# start_kotaro.sh (L14-16)
export OLLAMA_FLASH_ATTENTION=1  # ← Flash Attention有効化
export OLLAMA_GPU_LAYERS=-1
export OLLAMA_NUM_GPU=99
```

- **Ollama**: `OLLAMA_FLASH_ATTENTION=1` で有効化されている
- **MiniCPM-V**: 標準の Scaled Dot-Product Attention (SDPA) を使用

### GQA (Grouped Query Attention) 仕様

```
MiniCPM-V 2.6:
- Num Heads: 36
- KV Heads: 4
- Head Dimension: 64 (推定)
- シーケンス長: 最大 4096 tokens
```

---

## 4. WSL2 環境

### 起動コマンド

```powershell
wsl -d ubuntu
```

または

```powershell
wsl bash ./start_kotaro.sh
```

> **現在の状態**: ユーザーの実行中ターミナルから `wsl bash ./start_kotaro.sh` が16分以上稼働中

### プロジェクトの場所

WSL2からは以下のパスでWindowsプロジェクトにアクセス：

```bash
/mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/
```

### WSL用venv

| ディレクトリ | 用途 |
|-------------|------|
| `.venv` | Windows用 Python 仮想環境 |
| `.venv_wsl` | **WSL2/Ubuntu用** Python 仮想環境 ✅ |

#### `.venv_wsl` の構成

```
.venv_wsl/
├── bin/         # Linux用バイナリ (python3, pip等)
├── include/
├── lib/
├── lib64 → lib
├── pyvenv.cfg
└── share/
```

### セットアップスクリプト

| スクリプト | 用途 |
|-----------|------|
| [setup_kotaro.sh](file:///c:/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/setup_kotaro.sh) | 初期セットアップ (Python, Ollama, モデル, venv) |
| [start_kotaro.sh](file:///c:/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/start_kotaro.sh) | 起動スクリプト (GPU最適化設定 + APIサーバー) |

### setup_kotaro.sh がインストールするもの

1. **Python 3 + pip + venv**
2. **Ollama** (curl でインストール)
3. **AI モデル**:
   - `qwen2.5vl:7b` (Vision)
   - `qwen2.5:7b-instruct-q4_K_M` (Comment)
4. **Python ライブラリ** ([requirements-kotaro.txt](file:///c:/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/requirements-kotaro.txt)):
   - ollama, fastapi, uvicorn
   - torch, torchvision, transformers
   - bitsandbytes, accelerate
   - Pillow, opencv-python, mediapipe

---

## 5. アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│                    X-AUTO-POST-SYSTEM-otakuDJ                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐          ┌─────────────────────────────┐  │
│  │   Next.js App   │◀────────▶│  kotaro_api.py (FastAPI)    │  │
│  │   (Frontend)    │  HTTP    │  Port: 8000                 │  │
│  └─────────────────┘          └───────────┬─────────────────┘  │
│                                           │                     │
│                      ┌────────────────────┼────────────────┐   │
│                      │                    │                │   │
│                      ▼                    ▼                ▼   │
│  ┌───────────────────────┐  ┌─────────────────┐  ┌──────────┐  │
│  │  vision_core.py       │  │  Ollama Server  │  │ Gemini   │  │
│  │  ──────────────────   │  │  ──────────────  │  │ API      │  │
│  │  MiniCPM-V 2.6 int4   │  │  Qwen2.5-VL 7B  │  │ (Cloud)  │  │
│  │  ・BitsAndBytes NF4   │  │  Qwen2.5 Inst.  │  │          │  │
│  │  ・~5.64GB VRAM       │  │  ・Q4_K_M       │  │          │  │
│  │  ・GQA attention      │  │  ・Flash Attn ✓ │  │          │  │
│  └───────────────────────┘  └─────────────────┘  └──────────┘  │
│           │                          │                         │
│           └──────────────┬───────────┘                         │
│                          ▼                                     │
│                 ┌─────────────────┐                            │
│                 │  RTX 4060 8GB   │                            │
│                 │  CUDA 12.4      │                            │
│                 │  Ada Lovelace   │                            │
│                 └─────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 技術スタックまとめ

| カテゴリ | 技術 | 備考 |
|---------|------|------|
| **GPU** | RTX 4060 8GB | Ada Lovelace, CC 8.9 |
| **CUDA** | 12.4 (PyTorch), 12.8 (Driver) | |
| **量子化** | int4 (NF4 / Q4_K_M) | BitsAndBytes / llama.cpp |
| **アテンション** | GQA + Flash (Ollama) | SDPA (MiniCPM) |
| **カスタムカーネル** | なし | 設計案のみ存在 |
| **WSL環境** | `.venv_wsl` に venv 構築済み | Ubuntu ディストロ |

---

## 7. 今後の最適化余地

1. **Flash Attention for MiniCPM-V**
   - 現在SDPAを使用しているMiniCPM-VにFlash Attention v2を適用可能
   - 期待効果: 20-40% 高速化

2. **カスタムCUDAカーネル開発**
   - [CUDA_OPTIMIZATION_SPEC.md](file:///c:/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ/CUDA_OPTIMIZATION_SPEC.md) の設計案を実装
   - Fused Int4 GEMM で 15-25% 高速化見込み

3. **Triton 採用検討**
   - CUDA C++ より開発速度が速い
   - PyTorch との統合が容易

---

*Generated: 2026-01-03*
*By: Gemini CLI Agent*
