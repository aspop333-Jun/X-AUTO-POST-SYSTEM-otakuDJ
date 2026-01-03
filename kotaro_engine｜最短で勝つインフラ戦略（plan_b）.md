# 「最短で勝つ」ためのインフラ戦略
## プランB：Ubuntu デュアルブート（Kotaro-Engine 設計書 v1.0）

---

## 0. 結論（要約）

**プランB（Ubuntu デュアルブート）**は、「Kotaro-Engine」の完成度を**別次元**へ引き上げる最短ルートである。
これは単なるOS選択ではなく、**VRAM・カーネル・推論基盤を支配するための構造決定**である。

---

## 1. なぜ Ubuntu デュアルブートなのか

### 理由1：WDDM の呪縛からの解放（VRAM戦略）

- **Windows（WDDM）**
  - OS / GUI が VRAM を常時 **1〜1.5GB** 占有
- **Ubuntu（Server / 軽量DE）**
  - VRAM 使用量は **数百MB** 程度

**8GB VRAM 環境では、この「＋1GB」の差が致命的に効く。**

**影響領域**
- KV Cache の長さ
- バッチサイズ
- 有効コンテキスト長

---

### 理由2：Triton / Flash Attention のビルド安定性

Qwen 2.5 の性能を引き出す中核技術：

- Flash Attention 2 / 3
- Triton（PythonでCUDAを書く言語）

これらは **Linux（Native）環境で本領を発揮**する。

**Windows / WSL2 の問題点**
- 共有メモリのオーバーヘッド
- パス・依存関係の不整合
- 再現性の低さ

→ Ubuntu により **デバッグ時間を大幅に短縮**できる。

---

### 理由3：NVCC / PTX へのダイレクトアクセス

カスタム CUDA カーネルを本気で書く場合、
ドライバと直結した環境が不可欠である。

- NVIDIA Nsight による正確なプロファイリング
- SM / レジスタ / L2 キャッシュ単位での最適化
- ボトルネックの誤認防止

Ubuntu（Native）は、**最適化の解像度が一段上**になる。

---

## 2. Qwen 2.5 最適化戦略
### カーネル・フュージョン設計案

**対象モデル**
- Qwen 2.5 7B / 14B

**対象GPU**
- RTX 4060（Ada Lovelace / L2 Cache 24MB）

---

### A. Fused Qwen-Attention（Triton / CUDA）

#### 背景
Qwen 2.5 は **GQA（Grouped Query Attention）** を採用している。
標準の PyTorch 実装ではメモリ往復が多く、帯域が律速となる。

#### 戦略
以下を **単一カーネルに融合**する：

- Query / Key / Value Projection
- RoPE（回転位置埋め込み）

#### 利点
- VRAM 書き込み・読み込み回数の削減
- メモリ帯域（272 GB/s）のボトルネック緩和
- L2 キャッシュヒット率の最大化

> Ada 世代では「計算」ではなく「メモリ」が支配要因となる。

---

### B. Mixed-Precision Quantization（INT4 / FP8）

#### ハードウェア前提
- RTX 4060：第4世代 Tensor Core
- FP8（8bit 浮動小数点）を高速処理可能

#### 提案構成

- 重み保持：INT4（GPTQ / AWQ）
- 計算時展開：FP8 または BF16
- Fused Dequantize + MatMul カーネルを実装

#### PTX レベル最適化
Tensor Core を直接叩く：

```
mma.sync.aligned.m16n8k16.row.col.f32.f8.f8.f32
```

→ Tensor Core の演算密度を最大化

---

## 3. 推論バックエンドの再定義

**進捗状況: Phase 2 (WSL2/Ubuntu移行) 完了**

- ✅ **WSL2対応**: `setup_kotaro.sh` / `start_kotaro.sh` 実装済み
- ✅ **Flash Attention**: WSL2環境で `OLLAMA_FLASH_ATTENTION=1` 有効化
- ✅ **モデル統一**: Qwen 2.5 (Vision/Generative) に統一

Transformers（Python中心）から脱却し、
**低レイヤーを制御できる推論基盤**へ移行する。

| 選択肢 | メリット | 開発コスト | おすすめ度 |
|---|---|---|---|
| vLLM（PagedAttention） | 実装が楽・安定スループット | 低 | ⭐⭐⭐ |
| TensorRT-LLM | NVIDIA純正・最速 | 高 | ⭐⭐⭐⭐ |
| llama.cpp（GGUF） | VRAM節約（3/4bit） | 中 | ⭐⭐⭐ |
| Custom Triton Kernel | Kotaro専用ロジック注入 | 中〜高 | **本命** |

---

## 4. 推論高速化の主戦場（結論）

**Qwen 2.5 ベースで最短で勝つ構成**：

- **OS**：Ubuntu（Native）
- **量子化**：AWQ（INT4）または FP8
- **推論基盤**：
  - vLLM（PagedAttention）
  - TensorRT-LLM（可能なら）

**拡張方針**
- FlashInfer または vLLM の PagedAttention をベースに採用
- Qwen 2.5 固有の RoPE 計算を融合
- カスタム C++ / CUDA カーネルを実装

---

## 5. サポート可能領域（実装層）

以下の実装・レビューが可能：

- **Triton Kernel**
  - RoPE / Softmax / Attention 融合
- **CUDA C++（SM 8.9）**
  - Tensor Core（WMMA）直接制御
- **PTX Assembly**
  - レジスタ・命令レベル最適化
- **量子化設計**
  - 精度劣化を抑える Dequantize Fusion

---

## 6. 最終メモ（設計思想）

これは「速くする話」ではない。
**支配レイヤーを Python → CUDA → PTX に下げる話**である。

Kotaro-Engine は、
- 感情ではなく構造で勝つ
- 魔法ではなく設計で殴る

そのための**正しい土台**が、このインフラ戦略である。

