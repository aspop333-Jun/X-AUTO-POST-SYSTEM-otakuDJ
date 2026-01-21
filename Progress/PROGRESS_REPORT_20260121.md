# Progress Report 2026/01/21

## 1. 概要 (Status Overview)
- **Phase:** 2.5 (Refinement & Integration) - **CRITICAL FIXES REQUIRED**
- **Date:** 2026-01-21
- **Reporter:** Jules (AI Engineer)
- **Status:** **STALLED (Infrastructure Mismatch)**

前回のレポート(2026/01/20)以降、全コードベースのレビューを実施。
現在、バックエンド起動スクリプトの不整合と、ポート競合により、システムが正常に稼働しない状態にあることが判明。
また、最新ベンチマーク(V4.7)において極端なスコアの偏りが確認されている。

## 2. コードレビュー結果 (Code Review Findings)

### 🔴 Critical (緊急対応が必要)
1.  **起動スクリプトの致命的な不整合 (`start_kotaro.sh`)**
    - 現状: `ollama serve` を起動している。
    - 正解: `kotaro_api.py` は `LMDeploy (port 23334)` を参照している。
    - 影響: スクリプト経由で起動するとAPIがVLMに接続できず、動作不能となる。`scripts/launch_qwen2.py` への切り替えが必須。

2.  **APIポートの競合 (Double Management)**
    - `kotaro_api.py`: `port=8000` (Main Backend)
    - `api/main.py`: `port=8000` (Gemini Sidecar)
    - 影響: 同時に起動できない。構成の整理またはポート変更が必要。

### 🟡 Warning (修正推奨)
1.  **スコアリングの極端な偏り (V4.7 Benchmark)**
    - 結果: P06(30%), P11(26.7%), P12(26.7%) が全体の83%を占有。
    - 問題: エモーショナルなパターン(P01, P05, P08-P10)が消失している。`costume_strong` フラグの影響が強すぎる、またはフラット(P11/P12)への逃げ判定が広すぎる可能性がある。

2.  **ガバナンスと定義の矛盾 ("尊い" Paradox)**
    - `kotaro_api.py`: システムプロンプトで「尊い」を**禁止ワード**に指定。
    - `kotaro_scoring_v4.py`: P07の定義文に「関係性が**尊い**」を使用。
    - 影響: モデルがP07を目指す際、定義語を使おうとして禁止ルールに抵触する「ダブルバインド」が発生し、生成品質低下の原因となる。

### 🔵 Info
- `kotaro_api.py` 内の `call_kotaro_generation_v3` は関数名こそV3だが、中身はV4.2基準(XMLタグ)で実装されており、機能的な問題はない。

## 3. ベンチマーク状況 (Benchmark Status V4.7)
*参照: Progress/V4_7_BENCHMARK_REPORT.md*

| Pattern | Count | Share | Evaluation |
|---|---|---|---|
| P06 (Cosplay) | 9 | 30.0% | 🚨 過多 (衣装フラグ過敏) |
| P11 (Flat Close)| 8 | 26.7% | 🚨 過多 (判定放棄の可能性) |
| P12 (Flat Scene)| 8 | 26.7% | 🚨 過多 (判定放棄の可能性) |
| P03 (Scene) | 4 | 13.3% | 正常 |
| P02 (Perform) | 1 | 3.3% | 過少 |
| Others | 0 | 0.0% | ❌ **完全消失** |

## 4. リスク管理 (Risks)
- **環境構築不能リスク:** 現状の `start_kotaro.sh` を使用したユーザーは100%起動に失敗する。
- **品質低下リスク:** P11/P12/P06 以外のコメントが出力されないため、ユーザー体験が単調化している。

## 5. 次のステップ (Next Steps)
1.  **インフラ修復 (優先度: 高)**
    - `start_kotaro.sh` を修正し、Ollamaではなく `scripts/launch_qwen2.py` を呼び出すように変更。
2.  **ポート競合解消**
    - `api/main.py` のポートを `8001` 等に変更、または統合を検討。
3.  **ガバナンス整合**
    - P07の定義を「関係性が尊い」→「関係性が深い/美しい」等に変更。
4.  **スコアリング調整 (V4.8)**
    - P06/P11/P12 への流入を抑制するロジック調整を実施。
