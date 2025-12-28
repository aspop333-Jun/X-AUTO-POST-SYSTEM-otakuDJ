# FastAPI サーバー起動ガイド

## セットアップ

### 1. 依存関係のインストール

```powershell
cd e:\ai-MANUAL\アンチグラビティ\x自動投稿\api
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、Gemini API Keyを設定:

```powershell
copy .env.example .env
```

`.env` を編集:
```
GEMINI_API_KEY=あなたのAPIキー
```

### 3. サーバー起動

```powershell
cd e:\ai-MANUAL\アンチグラビティ\x自動投稿\api
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

サーバーが起動したら:
- API: http://localhost:8000
- ドキュメント: http://localhost:8000/docs
- ヘルスチェック: http://localhost:8000/health

## 使い方

1. **サーバーを起動**（上記コマンド）
2. **フロントエンドを開く**: `app/index.html` をブラウザで開く
3. **コメント生成**: 入力を選択して「コメント生成」ボタンをクリック

## API エンドポイント

### POST /generate-comment

一言コメントを生成。

**リクエスト:**
```json
{
  "booth_name": "SEGA",
  "role": "モデル",
  "category": "ブース",
  "expression_type": "笑顔",
  "focus_point": "表情",
  "context_match": "ブースの雰囲気",
  "image_base64": null
}
```

**レスポンス:**
```json
{
  "comment": "爽やかな笑顔がブースの雰囲気にぴったりでした✨",
  "source": "ai"
}
```

- `source`: `"ai"` = Gemini生成, `"rule_based"` = ルールベース生成

## トラブルシューティング

### CORS エラー

フロントエンドからAPIを呼び出せない場合、サーバーが起動しているか確認:
```powershell
curl http://localhost:8000/health
```

### API Key エラー

`.env` ファイルに正しいGemini API Keyが設定されているか確認。
