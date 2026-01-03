# Kotaro-Engine 動作環境仕様書
## CUDA カスタムカーネル最適化用リファレンス

**Last Updated**: 2026-01-02
**Purpose**: Gemini へのカスタム CUDA カーネル設計相談用

---

## 1. ハードウェア仕様

### GPU
| 項目 | 値 |
|------|-----|
| **モデル** | NVIDIA GeForce RTX 4060 |
| **アーキテクチャ** | Ada Lovelace (AD107) |
| **Compute Capability** | 8.9 |
| **VRAM** | 8 GB GDDR6 |
| **メモリバス幅** | 128-bit |
| **メモリバンド幅** | 272 GB/s |
| **SM (Streaming Multiprocessor)** | 24基 |
| **CUDA Cores** | 3072 (24 SM × 128 cores) |
| **Tensor Cores** | 96 (第4世代) |
| **RT Cores** | 24 (第3世代) |
| **ベースクロック** | 1830 MHz |
| **ブーストクロック** | 2460 MHz (最大3105 MHz) |
| **TDP** | 115W |
| **ドライバ** | 591.44 |

### CPU
| 項目 | 値 |
|------|-----|
| **モデル** | AMD Ryzen 5 5500 |
| **コア/スレッド** | 6C/12T |
| **ベースクロック** | 3.6 GHz |
| **ブーストクロック** | 4.2 GHz |
| **L3 Cache** | 16 MB |
| **PCIe** | Gen 3.0 |

### メモリ
| 項目 | 値 |
|------|-----|
| **System RAM** | 16 GB DDR4 (推定) |
| **PCIe帯域** | Gen3 x16 (~16 GB/s 実効) |

---

## 2. ソフトウェア環境

### Python / PyTorch
| 項目 | バージョン |
|------|-----------|
| **Python** | 3.10.6 |
| **PyTorch** | 2.5.1+cu124 |
| **CUDA Toolkit (PyTorch)** | 12.4 |
| **cuDNN** | 9.1.0 (90100) |
| **Transformers** | 4.x (latest) |
| **Accelerate** | 1.x |
| **BitsAndBytes** | 対応 (int4/int8量子化) |

### PyTorch CUDA アーキテクチャサポート
```
sm_50, sm_60, sm_70, sm_75, sm_80, sm_86, sm_90
```
> RTX 4060 (sm_89) は sm_90 でカバーされる

### OS
- Windows 11

---

## 3. 推論対象モデル

### MiniCPM-V 2.6 (Vision Language Model)

```
Model ID: openbmb/MiniCPM-V-2_6-int4
Parameters: 8B (int4量子化)
Actual VRAM: ~5.64 GB (ロード時)
Available VRAM after load: ~2.4 GB
```

#### モデル構造概要
| コンポーネント | 仕様 |
|---------------|------|
| **Vision Encoder** | SigLIP-400M (ViT-SO400M) |
| **Vision Token** | ~1344 tokens per image |
| **Language Model** | MiniCPM-2.4B base (Llama-like) |
| **Connector** | Resampler (Q-Former style) |
| **量子化** | 4-bit (BitsAndBytes NF4) |
| **Attention** | Grouped Query Attention (GQA) |
| **Hidden Size** | 2304 |
| **Num Layers** | 40 |
| **Num Heads** | 36 (KV heads: 4) |
| **Max Seq Length** | 4096 tokens |

#### 現在の推論設定
```python
CONFIG = {
    "model_id": "openbmb/MiniCPM-V-2_6-int4",
    "max_image_size": 512,      # 画像リサイズ（長辺px）
    "temperature": 0.3,         # 低温度（忠実度優先）
    "top_p": 0.8,
    "repetition_penalty": 1.2,
    "max_new_tokens": 512,
}

# モデルロード
model = AutoModel.from_pretrained(
    model_id,
    trust_remote_code=True,
    device_map="cuda",
    torch_dtype=torch.float16,
)
```

---

## 4. 現在のボトルネック分析

### メモリ制約
| 項目 | 値 |
|------|-----|
| **VRAM 総量** | 8 GB |
| **モデル使用量** | ~5.64 GB |
| **推論時追加** | 1-2 GB |
| **空きVRAM** | ~2.4 GB (idle) |
| **メモリバンド幅** | 272 GB/s (制約要因) |

### 推論パイプライン（処理時間内訳）

```
[Image Input]
     │
     ▼
[PIL Image Load] ← CPU (~10ms)
     │
     ▼
[Resize to 512px] ← CPU (~20ms, PIL LANCZOS)
     │
     ▼
[Image Tokenization] ← CPU/GPU (~100ms, 1344 tokens生成)
     │
     ▼
[Vision Encoder] ← GPU (~300ms, SigLIP forward)
     │
     ▼
[Resampler/Connector] ← GPU (~50ms)
     │
     ▼
[Language Model Decode] ← GPU (2-5秒, Autoregressive, 主ボトルネック)
     │
     ▼
[Output Text]
```

### 推定ボトルネック優先度

| 順位 | ボトルネック | 推定寄与率 | 説明 |
|------|-------------|-----------|------|
| 1 | **Autoregressive Decoding** | 70-80% | トークン毎のKVキャッシュ更新、シリアル処理 |
| 2 | **int4 Dequantization** | 10-15% | 毎推論でFP16変換オーバーヘッド |
| 3 | **Attention Computation** | 5-10% | 長シーケンス(1344+256)でのメモリバンド幅制約 |
| 4 | **Image Preprocessing** | ~2% | CPU処理（リサイズ、正規化） |

---

## 5. RTX 4060 (Ada Lovelace) 固有仕様

### Compute Capability 8.9 の特徴

| 特徴 | 値 |
|------|-----|
| **Warp Size** | 32 |
| **Max Threads per Block** | 1024 |
| **Max Warps per SM** | 48 |
| **Max Thread Blocks per SM** | 24 |
| **Max Registers per Block** | 65536 |
| **Shared Memory per SM** | 100 KB (configurable) |
| **L1 Cache per SM** | 128 KB (config with shared) |
| **L2 Cache** | 24 MB (全SM共有) |
| **FP16 Tensor Core Throughput** | 186 TFLOPS |
| **INT8 Tensor Core Throughput** | 373 TOPS |
| **FP8 Tensor Core Throughput** | 373 TFLOPS |

### メモリ階層

```
                    ┌─────────────────┐
                    │  GDDR6 (8 GB)   │  ← 272 GB/s
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  L2 Cache (24MB)│  ← ~4 TB/s (推定)
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼───────┐  ... (24 SM) ... ┌──▼──────────┐
    │ SM #0           │                   │ SM #23      │
    │ ├ L1/Shared:100KB                   │ ├ L1:100KB  │
    │ ├ Registers: 64KB                   │ └ Reg: 64KB │
    └─────────────────┘                   └─────────────┘
```

---

## 6. カスタムカーネル最適化候補

### 6.1 Flash Attention v2/v3 (最優先)

**現状**: Transformers 標準の SDPA (Scaled Dot-Product Attention)

**問題点**:
- O(N²) メモリ複雑度
- 長シーケンス(~1600 tokens)でのHBM往復

**最適化案**:
```cuda
// Tiled Attention with Online Softmax
// RTX 4060向け推奨タイルサイズ
#define Br 64   // Query tile
#define Bc 64   // Key/Value tile
#define d  64   // Head dimension

__global__ void flash_attention_kernel(
    const half* Q,  // [B, H, N, d]
    const half* K,  // [B, H, N, d]
    const half* V,  // [B, H, N, d]
    half* O,        // [B, H, N, d]
    float* L,       // [B, H, N] softmax denominators
    int N, int d
) {
    // Shared memory for tiles
    __shared__ half Qi[Br][d];
    __shared__ half Kj[Bc][d];
    __shared__ half Vj[Bc][d];
    
    // Online softmax + output accumulation
    // ... implementation
}
```

**期待効果**: 20-40% 高速化（特にVision Token部分）

### 6.2 Fused Int4 Dequant + MatMul

**現状**:
```
dequant(weight_int4) → weight_fp16 → matmul(input, weight_fp16)
           ↓
     2回のメモリ転送
```

**最適化案**:
```cuda
// Fused int4 dequantization within GEMM
__global__ void fused_int4_gemm_kernel(
    const half* input,      // [M, K]
    const uint8_t* weight,  // [K/2, N] packed int4
    const half* scales,     // [K/group_size, N]
    const half* zeros,      // [K/group_size, N]
    half* output,           // [M, N]
    int M, int K, int N, int group_size
) {
    // Thread block tile
    const int TILE_M = 128;
    const int TILE_N = 128;
    const int TILE_K = 32;
    
    __shared__ half A_tile[TILE_M][TILE_K];
    __shared__ half B_tile[TILE_K][TILE_N];  // Dequantized on-the-fly
    
    // Load A tile
    // Dequantize B tile in registers
    // Tensor Core WMMA operations
}
```

**期待効果**: 15-25% 高速化（メモリ転送削減）

### 6.3 Image Preprocessing CUDA Kernel

**現状**: PIL (CPU) で処理 → numpy → torch tensor

**最適化案**:
```cuda
// GPU上でリサイズ + 正規化 + CHW変換を一括処理
__global__ void resize_normalize_kernel(
    const uint8_t* input,     // [H, W, 3] HWC format
    half* output,             // [3, H', W'] CHW format, FP16
    int src_h, int src_w,
    int dst_h, int dst_w,
    const float3 mean,        // {0.485, 0.456, 0.406}
    const float3 std          // {0.229, 0.224, 0.225}
) {
    int x = blockIdx.x * blockDim.x + threadIdx.x;
    int y = blockIdx.y * blockDim.y + threadIdx.y;
    
    if (x >= dst_w || y >= dst_h) return;
    
    // Bilinear interpolation
    float src_x = x * (float)(src_w - 1) / (dst_w - 1);
    float src_y = y * (float)(src_h - 1) / (dst_h - 1);
    
    // ... bilinear sampling
    // ... normalize and store as FP16
}
```

**期待効果**: ~30ms 削減（CPU→GPU転送減）

### 6.4 KV Cache Optimization

**現状**: 標準的な連続メモリKVキャッシュ

**最適化案**: Paged Attention (vLLM style)
```cuda
// 4KB ページ単位でKVキャッシュを管理
// RTX 4060の8GB制約下で効率的なメモリ利用

struct PagedKVCache {
    half* pages;              // [num_pages, page_size, 2, num_heads, head_dim]
    int* page_table;          // [max_seq_len / tokens_per_page]
    int page_size = 16;       // tokens per page
};

__global__ void paged_attention_kernel(
    const half* Q,
    const PagedKVCache* kv_cache,
    const int* block_tables,
    half* output,
    // ...
);
```

**期待効果**: メモリ効率向上、より長いシーケンス処理可能

### 6.5 Speculative Decoding (Optional)

```
大モデル(MiniCPM): ターゲット推論
小モデル(draft): 候補トークン生成 (3-5 tokens)
→ 並列検証で高速化
```

**制約**: 追加VRAMが必要（現状では困難）

---

## 7. 推奨カーネル設計ガイドライン (RTX 4060)

### スレッド設定

```cuda
// Compute-bound kernels
dim3 block(256);              // 256 threads = 8 warps
dim3 grid((N + 255) / 256);

// Memory-bound kernels (attention, GEMM)
dim3 block(128);              // 128 threads = 4 warps
dim3 grid(ceil(M/128), ceil(N/128));

// 2D processing (images)
dim3 block(16, 16);           // 256 threads
dim3 grid(ceil(W/16), ceil(H/16));
```

### Shared Memory 活用

```cuda
// SM あたり 100KB まで設定可能
// 推奨: 48KB (デフォルト) or 64KB

__launch_bounds__(256, 4)  // 256 threads, 4 blocks per SM
__global__ void optimized_kernel(...) {
    __shared__ half smem[32768];  // 64KB
    // ...
}
```

### Tensor Core 活用 (WMMA)

```cuda
#include <mma.h>
using namespace nvcuda::wmma;

// FP16: 16x16x16 tiles
fragment<matrix_a, 16, 16, 16, half, row_major> a_frag;
fragment<matrix_b, 16, 16, 16, half, col_major> b_frag;
fragment<accumulator, 16, 16, 16, half> c_frag;

// Load, compute, store
load_matrix_sync(a_frag, A_ptr, ldA);
load_matrix_sync(b_frag, B_ptr, ldB);
mma_sync(c_frag, a_frag, b_frag, c_frag);
store_matrix_sync(C_ptr, c_frag, ldC, mem_row_major);
```

### メモリアクセスパターン

```cuda
// Coalesced access (推奨)
// 連続スレッドが連続メモリをアクセス
output[threadIdx.x + blockIdx.x * blockDim.x] = value;

// L2 Cache 活用
// 24MB L2 を活用するため、working set を収める
// ワーキングセット < 24MB が理想
```

---

## 8. ベンチマーク基準

### 現在の推論時間

| 処理 | 時間 | VRAM使用 |
|------|------|----------|
| モデルロード | 15-20秒 | +5.64 GB |
| 画像1枚解析 (simple) | 3-5秒 | +1.5 GB peak |
| 画像1枚解析 (full) | 5-8秒 | +2.0 GB peak |

### 目標

| 処理 | 現状 | 目標 | 削減率 |
|------|----|------|-------|
| 画像1枚解析 (simple) | 3-5秒 | < 2秒 | 50-60% |
| 画像1枚解析 (full) | 5-8秒 | < 3秒 | 50-60% |

---

## 9. ファイル構成

```
X-AUTO-POST-SYSTEM-otakuDJ/
├── vision_core.py          # MiniCPM-V 2.6 推論コア (322行)
│   ├── VisionCore class    # メイン解析クラス
│   ├── _load_model()       # 遅延ロード (GPU強制)
│   ├── _preprocess_image() # PIL リサイズ (CPU)
│   ├── analyze()           # 4項目詳細解析
│   ├── analyze_simple()    # 3項目簡易解析
│   └── _clear_cache()      # VRAM解放
│
├── kotaro_api.py           # FastAPI サーバー
├── start_kotaro.bat        # GPU起動スクリプト
├── requirements-kotaro.txt # Python依存関係
└── .venv/                  # Python 3.10 仮想環境
```

---

## 10. 実環境データ (NVIDIA-SMI)

```
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 591.44                 Driver Version: 591.44         CUDA Version: 12.8     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                     TCC/WDDM  | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|=========================================+========================+======================|
|   0  NVIDIA GeForce RTX 4060     WDDM  | 00000000:01:00.0  Off  |                  N/A |
|  0%   36C    P8               6W / 115W|     603MiB /  8188MiB  |      0%      Default |
+-----------------------------------------+------------------------+----------------------+
```

### PyTorch CUDA Build Info

```python
torch.__version__ = "2.5.1+cu124"
torch.version.cuda = "12.4"
torch.backends.cudnn.version() = 90100
torch.cuda.is_available() = True
torch.cuda.get_device_name(0) = "NVIDIA GeForce RTX 4060"
torch.cuda.get_device_capability(0) = (8, 9)
torch.cuda.get_arch_list() = ['sm_50', 'sm_60', 'sm_70', 'sm_75', 'sm_80', 'sm_86', 'sm_90']
```

---

## 11. 質問 / 検討依頼事項

### 優先度高

1. **Flash Attention v3** は RTX 4060 (Compute 8.9) で最大効果を発揮するには、どのような実装が最適か？
   - タイルサイズ (Br, Bc) の推奨値は？
   - Tensor Core (WMMA) との組み合わせは有効か？

2. **Fused Int4 GEMM** カーネルを自作する場合：
   - BitsAndBytes の既存カーネルをベースにすべきか、フルスクラッチか？
   - Group size (通常128) の最適値は？
   - NF4 vs symmetric int4 のトレードオフは？

3. **L2 キャッシュ 24MB** を最大活用するための戦略：
   - KVキャッシュを L2 に収めるためのシーケンス長制限は？
   - Persistent kernel アプローチは有効か？

### 優先度中

4. **Speculative Decoding** は 8GB VRAM 制約下で実用的か？
   - ドラフトモデルとして何を使うべきか？（MiniCPM-1.1B？）
   - VRAMオーバーヘッドの見積もりは？

5. **画像前処理のGPU化** は投資対効果があるか？
   - 現在 512px リサイズのみで ~30ms
   - CUDA カーネル開発コスト vs 効果

### 参考質問

6. **Triton** vs **CUDA C++** どちらを推奨するか？
   - 開発速度 vs パフォーマンス
   - PyTorch との統合容易性

7. RTX 4060 の **FP8 Tensor Core** は VLM 推論で活用可能か？
   - 現在 FP16 + int4 weight の構成

---

## 12. 制約事項まとめ

| 制約 | 値 | 影響 |
|------|-----|------|
| VRAM | 8 GB | モデル+推論で上限に近い |
| メモリバンド幅 | 272 GB/s | Attention がメモリバウンド |
| PCIe | Gen 3 x16 | CPU-GPU転送ボトルネック |
| SM数 | 24 | 並列度に制限 |
| TDP | 115W | サステイン性能に影響 |

---

*Generated: 2026-01-02*
*For: Gemini CUDA Kernel Optimization Consultation*
*Environment: Windows 11 + PyTorch 2.5.1+cu124 + RTX 4060 (8GB)*
