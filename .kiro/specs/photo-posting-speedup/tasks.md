# Implementation Plan: Photo Posting Speedup

## Overview

イベント写真投稿の高速化機能を段階的に実装する。コア機能（テキスト解析、データベース、状態管理）から始め、UI改善、バッチ処理、モバイル対応の順で進める。

## Tasks

- [x] 1. コアインフラストラクチャのセットアップ
  - [x] 1.1 LocalStorage Adapterの実装
    - localStorage操作のラッパー関数を作成
    - JSON シリアライズ/デシリアライズ、エラーハンドリング
    - `app/storage-adapter.js` に実装
    - _Requirements: 4.4, 5.5, 10.2, 11.1_
  - [x] 1.2 LocalStorage Adapter のプロパティテスト

    - **Property 2: Person Database Persistence** の基盤テスト
    - 保存→取得のラウンドトリップ検証
    - **Validates: Requirements 4.4, 11.1**

- [x] 2. Bulk Text Parser の実装
  - [x] 2.1 フォーマット検出ロジックの実装
    - ①②③、1.2.3.、---、空行、箇条書き、CSV形式の検出
    - `app/bulk-text-parser.js` に実装
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 フィールド抽出パターンの実装
    - 名前、アカウント、ブース、役割の抽出正規表現
    - 信頼度スコアの計算ロジック
    - _Requirements: 1.3, 1.5_
  - [x] 2.3 パース結果プレビューUIの実装
    - 解析結果の表示、低信頼度ハイライト
    - 編集可能フィールド、適用ボタン
    - _Requirements: 1.4, 1.5, 1.6_
  - [x] 2.4 Bulk Text Parser のプロパティテスト

    - **Property 1: Text Parsing Round-Trip Consistency**
    - 各フォーマットでの解析テスト
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.8**

- [x] 3. Person Database の実装
  - [x] 3.1 PersonDatabase クラスの実装
    - CRUD操作、検索、最近使用順ソート
    - `app/person-database.js` に実装
    - _Requirements: 4.3, 4.4, 4.5_
  - [x] 3.2 Auto Complete Engine の実装
    - 入力に基づく候補表示、100ms以内のレスポンス
    - 選択時の関連フィールド自動入力
    - _Requirements: 4.1, 4.2_
  - [x] 3.3 オートコンプリートUIの実装
    - ドロップダウン候補リスト、キーボードナビゲーション
    - 編集モーダルへの統合
    - _Requirements: 4.1, 4.2_
  - [x] 3.4 Person Database のプロパティテスト

    - **Property 2: Person Database Persistence**
    - **Property 3: Autocomplete Recency Ordering**
    - **Validates: Requirements 4.3, 4.4, 4.5**

- [x] 4. Checkpoint - コア機能の検証
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Template Database の実装
  - [x] 5.1 BoothTemplate 管理の実装
    - プリセット保存、読み込み、削除
    - 使用頻度によるソート
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 5.2 FieldTemplate 管理の実装
    - カテゴリ別テンプレート、変数サポート
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_
  - [x] 5.3 テンプレート選択UIの実装
    - プリセットドロップダウン、保存ダイアログ
    - _Requirements: 5.2, 5.3_
  - [x] 5.4 Template Database のプロパティテスト

    - **Property 10: Template CRUD Consistency**
    - **Validates: Requirements 5.1, 5.5, 23.1, 23.2**

- [x] 6. State Manager の実装
  - [x] 6.1 アンドゥ/リドゥ機能の実装
    - アクション履歴スタック、状態復元
    - Ctrl+Z / Ctrl+Shift+Z ハンドリング
    - _Requirements: 22.3, 22.4_
  - [x] 6.2 自動保存機能の実装
    - 5秒間隔の自動保存、保存インジケーター
    - ブラウザ終了時の状態復元
    - _Requirements: 22.1, 22.2, 22.5, 22.6_
  - [x] 6.3 State Manager のプロパティテスト

    - **Property 6: Undo/Redo Consistency**
    - **Validates: Requirements 22.3, 22.4**

- [x] 7. Navigation Controller の実装
  - [x] 7.1 ステップ間ナビゲーションの実装
    - キュー保持しながらのStep 1への戻り
    - 未保存変更の確認ダイアログ
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 7.2 パンくずナビゲーションUIの実装
    - 現在ステップ表示、直接ナビゲーション
    - _Requirements: 2.5_
  - [x] 7.3 Navigation のプロパティテスト

    - **Property 4: Navigation State Preservation**
    - **Validates: Requirements 2.2, 2.4**

- [x] 8. Checkpoint - 状態管理の検証
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Batch Processor の実装
  - [x] 9.1 一括コメント生成の実装
    - 進捗表示、エラー継続処理
    - キャンセル機能
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 9.2 一括送信の実装
    - 進捗モーダル、リアルタイムステータス更新
    - 失敗時のリトライ機能
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 9.3 一括ブース適用の実装
    - 選択投稿への一括適用、確認ダイアログ
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  - [x] 9.4 Batch Processor のプロパティテスト

    - **Property 5: Batch Processing Continuation**
    - **Property 8: Bulk Apply Completeness**
    - **Validates: Requirements 6.1, 6.4, 12.1, 12.4, 16.2, 21.4**

- [x] 10. History Database の実装
  - [x] 10.1 履歴保存・取得の実装
    - 送信成功時の自動保存、100件上限
    - イベント別グループ化
    - _Requirements: 10.1, 10.2, 10.3_
  - [x] 10.2 履歴パネルUIの実装
    - 履歴一覧表示、再利用ボタン
    - _Requirements: 10.3, 10.4_
  - [x] 10.3 History Database のプロパティテスト

    - **Property 12: History Storage Limit**
    - **Validates: Requirements 10.2**

- [x] 11. Event Database の実装
  - [x] 11.1 イベント自動保存・復元の実装
    - 確定時の保存、起動時の復元
    - 最近5件のイベント切り替え
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x] 11.2 Event Database のプロパティテスト

    - **Property 9: Event Auto-Restore**
    - **Validates: Requirements 11.1, 11.2**

- [x] 12. Checkpoint - データ永続化の検証
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. UI改善: Floating Action Bar
  - [x] 13.1 Floating Action Bar の実装
    - 画面下部固定、主要アクションボタン
    - キュー件数表示
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 13.2 モバイル対応の実装
    - レスポンシブ折りたたみ、タッチターゲット拡大
    - _Requirements: 3.5, 15.1_

- [x] 14. UI改善: 編集モーダル
  - [x] 14.1 セクション折りたたみの実装
    - 基本情報、人物情報、コメントのセクション化
    - 完了状態インジケーター
    - _Requirements: 19.1, 19.2, 19.3_
  - [x] 14.2 前後ナビゲーションの実装
    - Previous/Nextボタン、モーダル内での投稿切り替え
    - _Requirements: 19.4, 19.5_
  - [x] 14.3 リアルタイムプレビューの実装
    - 入力に連動したプレビュー更新
    - _Requirements: 19.6_

- [x] 15. UI改善: インライン編集
  - [x] 15.1 ダブルクリック編集の実装
    - キュー項目のフィールド直接編集
    - Enter/Escapeでの保存/キャンセル
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 16. UI改善: ドラッグ&ドロップ
  - [x] 16.1 キュー並び替えの実装
    - ドラッグ中のビジュアルインジケーター
    - ドロップ後の番号更新
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 16.2 ドラッグ&ドロップのプロパティテスト

    - **Property 7: Queue Reorder Integrity**
    - **Validates: Requirements 8.2, 8.3**

- [x] 17. UI改善: ステータスインジケーター
  - [x] 17.1 色分けバッジの実装
    - draft→gray, ready→blue, sent→green, failed→red
    - 完了率バー、警告アイコン
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [x] 17.2 ステータスバッジのプロパティテスト
    - **Property 11: Status Badge Accuracy**
    - **Validates: Requirements 14.1**

- [x] 18. Checkpoint - UI改善の検証
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. キーボードショートカット
  - [x] 19.1 グローバルショートカットの実装
    - Ctrl+Enter（保存）、Escape（閉じる）
    - Ctrl+Shift+N（新規追加）、Ctrl+Shift+S（一括送信）
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  - [x] 19.2 モーダル内ショートカットの実装
    - Ctrl+G（コメント生成）
    - _Requirements: 7.4_
  - [x] 19.3 ヘルプパネルの実装
    - "?"キーでショートカット一覧表示
    - _Requirements: 7.6_

- [x] 20. クイックプレビュー
  - [x] 20.1 ホバープレビューの実装
    - 500msホバーでツールチップ表示
    - サムネイル、ブース名、人物名、コメント
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 21. コンテキストメニュー
  - [x] 21.1 右クリックメニューの実装
    - Edit, Duplicate, Delete, Generate Comment, Copy Text, Send
    - ショートカット表示
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [x] 22. 一括編集モード
  - [x] 22.1 選択モードの実装
    - チェックボックス表示、複数選択
    - 一括アクションバー
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

- [x] 23. スマートフォーカス
  - [x] 23.1 フォーカス管理の実装
    - オートコンプリート選択後の次フィールド移動
    - Enter押下での次フィールド移動
    - モーダル開時の最初の空フィールドフォーカス
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 24. Checkpoint - 操作性改善の検証
  - Ensure all tests pass, ask the user if questions arise.

- [x] 25. モバイル対応
  - [x] 25.1 レスポンシブレイアウトの実装
    - 375px以上対応、フルスクリーンモーダル
    - _Requirements: 15.1, 15.2_
  - [x] 25.2 タッチジェスチャーの実装
    - スワイプアクション（左:アクション、右:ステータス切替）
    - タッチでのドラッグ&ドロップ
    - _Requirements: 15.3, 18.1, 18.2, 18.3, 18.4_

- [x] 26. 最終統合とテスト
  - [x] 26.1 全機能の統合テスト
    - フルワークフロー: テキスト貼り付け → 解析 → 編集 → 送信
    - _Requirements: All_
  - [x] 26.2 パフォーマンス最適化
    - 大量データでのレスポンス確認
    - メモリリーク確認

- [x] 27. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property-based tests are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use fast-check library for JavaScript
- Unit tests validate specific examples and edge cases
