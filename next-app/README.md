# X-AutoPost (Next.js Version)

## 概要
SNS自動投稿システムのモダン版（Next.js + Tailwind CSS + Zustand）。
ブログのようなテキスト編集体験と、高度な画像編集機能、マルチSNSプレビューを提供します。

## 主な機能
- **Dashboard**: ドラッグ＆ドロップでの写真追加、投稿キュー管理。
- **Editor**:
  - **Zen Mode**: 執筆に集中できるフルスクリーンテキストエディター。
  - **Image Editor**: トリミング、回転、フィルター（React-Cropper）。
  - **Preview Pane**: X, Instagram (Feed/Story) のプレビュー確認。
- **State Persistence**: 編集内容は自動的にブラウザに保存されます。

## セットアップと実行

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
# -> http://localhost:3000 にアクセス
```

## 注意事項 (Windows環境)

プロジェクトのパスに日本語（「ドキュメント」「自動投稿」など）が含まれている場合、`npm run build` や `npm run dev` が **TurboPackのエラーにより失敗する** ことがあります。
失敗する場合は、以下のいずれかの対策をお試しください：

1. **フォルダの移動**: 日本語を含まないパス（例: `C:\Projects\x-auto-post`）にプロジェクトフォルダごと移動する。
2. **Webpackの使用**: 開発サーバー起動時に `--turbo` オプションを付けない（Next.js 16ではデフォルトがTurboPackの場合があります）。

## 構成
- `src/store`: アプリケーションの状態管理 (Zustand)
- `src/components`: UIコンポーネント (Dashboard, Editor, UI)
- `src/utils`: ユーティリティ関数
