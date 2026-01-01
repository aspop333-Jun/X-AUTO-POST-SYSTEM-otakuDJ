# Kotaro-Engine セットアップガイド

ローカルAIによる18文字エモコメント生成エンジンのセットアップ手順。

---

## Step 1: Ollama のインストール

### 方法A: 公式サイトからダウンロード（推奨）
1. https://ollama.com/ にアクセス
2. **Download for Windows** をクリック
3. ダウンロードしたインストーラーを実行
4. インストール完了後、PCを再起動

### 方法B: winget でインストール
```powershell
winget install Ollama.Ollama
```

---

## Step 2: Gemma 2 2B モデルのダウンロード

コマンドプロンプトまたはPowerShellで実行：
```bash
ollama pull gemma2:2b
```

> ⏳ ダウンロードサイズ: 約1.6GB、数分かかります

---

## Step 3: 動作確認

```bash
ollama run gemma2:2b "こんにちは"
```

日本語で応答が返ってくれば成功！

---

## Step 4: Kotaro-Engine 用の設定

### Pythonライブラリのインストール
```bash
pip install ollama deepface mediapipe opencv-python
```

---

## トラブルシューティング

### 「ollama が見つかりません」と表示される
→ PCを再起動してください。環境変数が反映されていない可能性があります。

### モデルのダウンロードが遅い
→ ネットワーク環境によります。VPNを切ると速くなることがあります。

### GPU が認識されない
→ NVIDIA ドライバを最新版に更新してください。
