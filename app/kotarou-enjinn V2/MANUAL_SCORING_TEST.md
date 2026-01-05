# コメント採点システム高速テスト手順 (V4.6.1)

## 概要
本テストは、VLM (LMDeploy) と画像リサイズ最適化スクリプトを使用して、30枚の画像を高速に解析するための手順書です。
従来30秒/枚かかっていた処理を、**10秒/枚以下**で実行します。

## 必須要件
- **画像リサイズ (必須)**: クライアント側で `Max 1024px` にリサイズして送信すること。
- **サーバー**: LMDeploy (`Qwen2-VL-2B-Instruct`) running at `localhost:23334`.

## 実行手順

### 1. LMDeployサーバー起動 (未起動の場合)
```powershell
# WSLターミナルにて
python3 scripts/launch_qwen2.py
```
※ `started` と表示されればOK。

### 2. 高速テスト実行
```powershell
# PowerShellにて
python scripts/test_30_images_optimized.py
```

### 3. レポート生成
```powershell
python scripts/analyze_scoring_result.py
```
※ `analyze_scoring_result.py` の入力ファイル指定を `scoring_progress_v461_opt.json` に変更していることを確認してください。

## 注意事項
- **フル解像度は禁止**: 4K画像をそのまま投げるとVRAM溢れや速度低下の原因になります。必ず `Optimized` スクリプトを使用してください。
- **ログ確認**: エラー時は `Progress/scoring_errors_v461_opt.log` を確認してください。
