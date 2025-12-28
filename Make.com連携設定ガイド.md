# Make.com 連携設定ガイド

このガイドでは、イベント写真自動投稿システムとMake.com（旧Integromat）を連携して、Buffer経由でX・Instagramへ自動投稿する設定方法を説明します。

---

## 目次

1. [Make.comアカウント作成](#1-makecomアカウント作成)
2. [Webhook作成](#2-webhook作成)
3. [アプリへのURL登録](#3-アプリへのurl登録)
4. [Buffer連携設定](#4-buffer連携設定)
5. [シナリオ完成例](#5-シナリオ完成例)
6. [トラブルシューティング](#6-トラブルシューティング)

---

## 1. Make.comアカウント作成

1. [Make.com](https://www.make.com/) にアクセス
2. 「Get started free」をクリック
3. メールアドレスまたはGoogleアカウントで登録
4. 無料プラン（1000 operations/月）で開始可能

---

## 2. Webhook作成

### 2-1. 新規シナリオ作成

1. ダッシュボードで「Create a new scenario」をクリック
2. 「+」ボタンをクリックしてモジュールを追加

### 2-2. Webhookモジュール追加

1. 検索バーに「Webhooks」と入力
2. 「Webhooks」を選択
3. 「Custom webhook」を選択

### 2-3. Webhook設定

1. 「Add」をクリックして新しいWebhookを作成
2. Webhook名を入力（例：`イベント写真投稿`）
3. 「Save」をクリック
4. **表示されたURLをコピー**（重要！）

```
例: https://hook.us1.make.com/xxxxxxxxxxxxxxxxxxxxxxx
```

### 2-4. データ構造の確認（初回のみ）

1. 「Run once」をクリックしてWebhookを待機状態に
2. 自動投稿アプリから一度送信
3. Make.comがデータ構造を自動認識

---

## 3. アプリへのURL登録

1. 自動投稿アプリ（`index.html`）を開く
2. 右下の ⚙️ ボタンをクリック
3. 「Make.com Webhook URL」欄にコピーしたURLを貼り付け
4. 「保存」をクリック

---

## 4. Buffer連携設定

### 4-1. Bufferモジュール追加

1. Webhookモジュールの右側の「+」をクリック
2. 「Buffer」を検索して選択
3. 「Create an Update」を選択

### 4-2. Buffer接続設定

1. 「Add」をクリックして新しい接続を作成
2. 接続名を入力（例：`My Buffer`）
3. 「Save」をクリック
4. Bufferの認証画面が開くのでログイン
5. 「Authorize」をクリック

### 4-3. 投稿内容のマッピング

Webhookから受け取ったデータをBufferにマッピング：

| Buffer項目 | マッピング値 |
|-----------|-------------|
| **Profile ID** | Bufferに登録済みのプロファイルを選択 |
| **Text** | `posts.x1` または `posts.x2` または `posts.instagram` |
| **Scheduled At** | 空欄（即時投稿）または日時指定 |

### 4-4. 3アカウント対応

X×2 + Instagram×1 に投稿するには、Bufferモジュールを3つ追加：

```
Webhook → Buffer(X1) → Buffer(X2) → Buffer(Instagram)
```

各Bufferモジュールで異なるプロファイルとテキストを設定。

---

## 5. シナリオ完成例

### 基本構成

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Webhook  │ → │ Buffer   │ → │ Buffer   │ → │ Buffer   │
│          │    │ (X1)     │    │ (X2)     │    │ (IG)     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 詳細設定

#### Webhookモジュール
- トリガー：`Custom webhook`
- 受信データ構造：
```json
{
  "event": { ... },
  "person": { ... },
  "booth": { ... },
  "posts": {
    "x1": "投稿テキスト...",
    "x2": "投稿テキスト...",
    "instagram": "投稿テキスト..."
  }
}
```

#### Buffer モジュール (X1)
- Profile ID: `X メインアカウントのID`
- Text: `{{1.posts.x1}}`

#### Buffer モジュール (X2)
- Profile ID: `X サブアカウントのID`
- Text: `{{1.posts.x2}}`

#### Buffer モジュール (Instagram)
- Profile ID: `InstagramアカウントのID`
- Text: `{{1.posts.instagram}}`

---

## 6. トラブルシューティング

### 問題：Webhookが反応しない

**原因**: Webhook URLが正しくない、またはシナリオが有効化されていない

**解決策**:
1. URLが正しくコピーされているか確認
2. Make.comでシナリオが「ON」になっているか確認
3. 「Run once」で手動テスト

### 問題：Buffer投稿が失敗する

**原因**: Buffer認証の期限切れ、またはプロファイルID誤り

**解決策**:
1. Bufferモジュールの接続を再認証
2. Profile IDがBufferダッシュボードと一致しているか確認

### 問題：日本語が文字化けする

**原因**: エンコーディング問題

**解決策**:
- Make.comは自動でUTF-8を処理するため、通常は問題なし
- 問題が続く場合、Webhookモジュールの「Advanced settings」を確認

### 問題：画像が送信されない

**原因**: Buffer APIでの画像投稿には追加設定が必要

**解決策**:
1. 画像URLを別途ホスティング（例：Cloudinary、Google Drive）
2. BufferモジュールのMedia項目にURLを設定

---

## 補足：スケジュール投稿

Bufferのキュー機能を使う場合：

1. Bufferモジュールの「Scheduled At」を空欄にする
2. Bufferダッシュボードでキュースケジュールを設定
3. 投稿はキューに追加され、設定時間に自動投稿

---

## 参考リンク

- [Make.com 公式ドキュメント](https://www.make.com/en/help)
- [Buffer API ドキュメント](https://buffer.com/developers/api)
- [Make.com × Buffer 連携ガイド](https://www.make.com/en/integrations/buffer)

---

## 設定完了チェックリスト

- [ ] Make.comアカウント作成済み
- [ ] Webhookモジュール作成済み
- [ ] Webhook URLをアプリに登録済み
- [ ] Buffer連携設定済み
- [ ] 3アカウント分のBufferモジュール設定済み
- [ ] シナリオを「ON」に切り替え済み
- [ ] テスト送信で動作確認済み
