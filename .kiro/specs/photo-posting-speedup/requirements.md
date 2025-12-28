# Requirements Document

## Introduction

イベント写真のSNS投稿作業を大幅に高速化し、ユーザーの余暇時間を捻出するための機能拡張。現在のシステムでは1枚ごとに人物名・アカウント・コメントを手動入力する必要があり、大量の写真を処理する際にボトルネックとなっている。本機能では、テキスト一括入力、過去データの再利用、バッチ処理の強化、AI支援による自動入力、UX/UIの改善を実現し、投稿作業時間を70%以上削減することを目指す。

## Glossary

- **Post_Queue**: 投稿待ちの写真とメタデータを管理するキュー（最大10件）
- **Person_Database**: 過去に投稿した人物の名前・アカウント・役割を保存するローカルデータベース
- **Auto_Complete_Engine**: 入力中のテキストから候補を提示する補完エンジン
- **Batch_Processor**: 複数の写真を一括で処理するモジュール
- **Quick_Template**: よく使う設定の組み合わせを保存したプリセット
- **Comment_Generator**: AIまたはルールベースでコメントを生成するモジュール
- **Bulk_Text_Parser**: テキスト貼り付けから複数投稿の情報を一括解析するパーサー
- **Navigation_Controller**: ステップ間の移動とUI状態を管理するコントローラー
- **Floating_Action_Bar**: 画面下部に固定表示される主要アクションボタン群

## Requirements

### Requirement 1: 高精度テキスト一括貼り付けによる全投稿への情報入力

**User Story:** As a photographer, I want to paste any format of text and have it intelligently populate all posts with event and person information, so that I can set up multiple posts in seconds regardless of input format.

#### Acceptance Criteria

1. WHEN a user pastes text, THE Bulk_Text_Parser SHALL automatically detect the format and parse entries
2. THE Bulk_Text_Parser SHALL support the following formats:
   - ①②③④⑤⑥⑦⑧⑨⑩ numbered lists
   - 1. 2. 3. or (1) (2) (3) numbered lists
   - "---" or "===" separated blocks
   - "投稿1/投稿2" or "Post 1/Post 2" labeled sections
   - Empty line (2+ newlines) separated blocks
   - Bullet points (・, -, *) lists
   - Tab-separated or CSV-like formats
3. THE Bulk_Text_Parser SHALL extract fields using flexible pattern matching:
   - Person name: "名前:", "Name:", "@の前の文字列", "さん" suffix detection
   - Account: "@username" pattern anywhere in text
   - Booth: "ブース:", "Booth:", "企業:", "チーム:" prefixes
   - Role: "モデル", "RQ", "コンパニオン", "コスプレイヤー" keyword detection
4. WHEN parsing completes, THE System SHALL show an interactive preview with editable fields before applying
5. THE preview SHALL highlight low-confidence extractions in yellow for user review
6. IF the parser cannot determine format, THEN THE System SHALL attempt line-by-line parsing and ask user to confirm
7. THE System SHALL learn from user corrections to improve future parsing accuracy
8. WHEN parsed data includes @accounts, THE System SHALL validate format and auto-link to Person_Database if match found

### Requirement 2: イベント設定画面への簡単な戻り操作

**User Story:** As a photographer, I want to easily go back to the event setup screen from anywhere, so that I can change event information without losing my work.

#### Acceptance Criteria

1. THE Navigation_Controller SHALL display a persistent "イベント変更" button in the event summary bar on Step 2
2. WHEN a user clicks the event change button, THE System SHALL navigate to Step 1 while preserving all Post_Queue data
3. THE System SHALL show a confirmation dialog if there are unsaved changes in the queue
4. WHEN returning from Step 1 to Step 2, THE System SHALL restore the previous queue state
5. THE System SHALL provide a breadcrumb navigation showing current step and allowing direct navigation

### Requirement 3: フローティングアクションバー

**User Story:** As a photographer, I want quick access to common actions without scrolling, so that I can work faster on long pages.

#### Acceptance Criteria

1. THE Floating_Action_Bar SHALL be fixed at the bottom of the screen on Step 2
2. THE Floating_Action_Bar SHALL contain: "一括コメント生成", "一括送信", "全てクリア" buttons
3. WHEN the user scrolls, THE Floating_Action_Bar SHALL remain visible
4. THE Floating_Action_Bar SHALL show the current queue count (e.g., "5/10")
5. THE Floating_Action_Bar SHALL collapse to a minimal state on mobile devices

### Requirement 4: 人物データベースによる入力補完

**User Story:** As a photographer, I want to reuse previously entered person information, so that I don't have to type the same names and accounts repeatedly.

#### Acceptance Criteria

1. WHEN a user types in the person name field, THE Auto_Complete_Engine SHALL display matching candidates from Person_Database within 100ms
2. WHEN a user selects a candidate from the autocomplete list, THE System SHALL populate all related fields (name, account, role) automatically
3. WHEN a new person is saved to a post, THE Person_Database SHALL store the person's name, account, and role for future use
4. THE Person_Database SHALL persist data in localStorage and survive browser refresh
5. WHEN the Person_Database contains more than 100 entries, THE System SHALL display the 10 most recently used matches first

### Requirement 5: ブース・チーム情報のプリセット管理

**User Story:** As a photographer, I want to save frequently used booth/team configurations, so that I can quickly apply them to multiple photos.

#### Acceptance Criteria

1. WHEN a user clicks "Save as Preset", THE System SHALL store the current booth name, account, and category as a Quick_Template
2. WHEN a user opens the preset selector, THE System SHALL display all saved Quick_Templates sorted by usage frequency
3. WHEN a user selects a preset, THE System SHALL apply all preset values to the current post
4. THE System SHALL allow users to delete or edit existing presets
5. THE Quick_Template data SHALL persist in localStorage

### Requirement 6: 一括コメント生成

**User Story:** As a photographer, I want to generate comments for all queued photos at once, so that I can save time on repetitive tasks.

#### Acceptance Criteria

1. WHEN a user clicks "Generate All Comments", THE Batch_Processor SHALL generate comments for all posts in Post_Queue that don't have comments
2. WHILE generating comments, THE System SHALL display progress (e.g., "3/10 completed")
3. WHEN batch generation completes, THE System SHALL show a summary of generated comments
4. IF an error occurs during batch generation, THEN THE System SHALL continue with remaining posts and report failures at the end

### Requirement 7: キーボードショートカットによる高速操作

**User Story:** As a photographer, I want to use keyboard shortcuts, so that I can navigate and edit posts without using the mouse.

#### Acceptance Criteria

1. WHEN a user presses Ctrl+Enter in the edit modal, THE System SHALL save and close the modal
2. WHEN a user presses Escape in any modal, THE System SHALL close the modal without saving
3. WHEN a user presses Ctrl+Shift+N, THE System SHALL add a new empty post to the queue
4. WHEN a user presses Ctrl+G in the edit modal, THE System SHALL trigger comment generation
5. WHEN a user presses Ctrl+Shift+S, THE System SHALL trigger batch send
6. THE System SHALL display a keyboard shortcut help panel when user presses "?"

### Requirement 8: ドラッグ&ドロップによるキュー並び替え

**User Story:** As a photographer, I want to reorder posts in the queue by dragging, so that I can control the posting sequence easily.

#### Acceptance Criteria

1. WHEN a user drags a post item in Post_Queue, THE System SHALL show a visual indicator of the drop position
2. WHEN a user drops a post item, THE System SHALL reorder the queue accordingly
3. THE System SHALL update queue numbers (①②③...) after reordering
4. WHEN reordering is complete, THE System SHALL persist the new order

### Requirement 9: クイックプレビューパネル

**User Story:** As a photographer, I want to see a preview of the selected post without opening the full edit modal, so that I can quickly review posts.

#### Acceptance Criteria

1. WHEN a user hovers over a queue item for 500ms, THE System SHALL display a quick preview tooltip
2. THE quick preview SHALL show: thumbnail, booth name, person name, and first line of comment
3. WHEN a user clicks the preview, THE System SHALL open the full edit modal
4. THE quick preview SHALL disappear when the mouse leaves the item

### Requirement 10: 投稿履歴の保存と再利用

**User Story:** As a photographer, I want to access my posting history, so that I can reference or reuse past posts.

#### Acceptance Criteria

1. WHEN a post is sent successfully, THE System SHALL save the post data to history
2. THE System SHALL store up to 100 most recent posts in history
3. WHEN a user opens the history panel, THE System SHALL display posts grouped by event
4. WHEN a user clicks "Reuse" on a history item, THE System SHALL create a new post with the same booth and person information

### Requirement 11: イベント情報の自動保存と復元

**User Story:** As a photographer, I want my event settings to be remembered, so that I don't have to re-enter them after refreshing the page.

#### Acceptance Criteria

1. WHEN event information is confirmed, THE System SHALL save it to localStorage
2. WHEN the application loads, THE System SHALL restore the last used event information and skip to Step 2 if valid
3. THE System SHALL provide a "Clear Event" button to reset event information
4. THE System SHALL store up to 5 recent events for quick switching via dropdown

### Requirement 12: バッチ送信の進捗表示とリトライ

**User Story:** As a photographer, I want to see the progress of batch sending and retry failed posts, so that I can ensure all posts are sent.

#### Acceptance Criteria

1. WHEN batch sending starts, THE System SHALL display a progress modal showing "X/Y sent"
2. WHILE sending, THE System SHALL update each post's status badge in real-time
3. WHEN batch sending completes, THE System SHALL show a summary with success/failure counts
4. IF a send fails, THEN THE System SHALL mark that post as "failed" and provide a "Retry Failed" button
5. THE System SHALL allow canceling batch send mid-process

### Requirement 13: 入力フィールドのスマートフォーカス

**User Story:** As a photographer, I want the cursor to automatically move to the next logical field, so that I can enter data faster.

#### Acceptance Criteria

1. WHEN a user selects an autocomplete suggestion, THE System SHALL move focus to the next empty field
2. WHEN a user presses Enter in a text field (except textarea), THE System SHALL move focus to the next field
3. WHEN the edit modal opens, THE System SHALL focus on the first empty required field

### Requirement 14: ステータスインジケーターの改善

**User Story:** As a photographer, I want to clearly see the status of each post at a glance, so that I know which posts need attention.

#### Acceptance Criteria

1. THE System SHALL display color-coded status badges: gray (draft), blue (ready), green (sent), red (failed)
2. THE System SHALL show a completion percentage bar in the queue header
3. WHEN a post is missing required fields, THE System SHALL show a warning icon on the queue item
4. THE System SHALL highlight posts that have been in "draft" status for more than 5 minutes

### Requirement 15: モバイル対応の改善

**User Story:** As a photographer, I want to use the system on my phone, so that I can post photos while at events.

#### Acceptance Criteria

1. THE System SHALL provide a responsive layout that works on screens 375px and wider
2. THE edit modal SHALL be full-screen on mobile devices
3. THE System SHALL support touch gestures for queue reordering on mobile
4. THE Floating_Action_Bar SHALL adapt to mobile with larger touch targets

### Requirement 16: 一括ブース適用機能

**User Story:** As a photographer, I want to apply the same booth information to multiple posts at once, so that I can quickly set up posts from the same booth.

#### Acceptance Criteria

1. THE System SHALL provide a "Apply to All" button next to booth fields in the edit modal
2. WHEN a user clicks "Apply to All", THE System SHALL apply the current booth name and account to all posts in the queue
3. THE System SHALL show a confirmation dialog before applying to all
4. THE System SHALL only apply to posts that don't already have booth information (with option to override)


### Requirement 17: インライン編集機能

**User Story:** As a photographer, I want to edit post information directly in the queue list without opening a modal, so that I can make quick changes faster.

#### Acceptance Criteria

1. WHEN a user double-clicks on a field in the queue item (booth name, person name, comment), THE System SHALL enable inline editing mode
2. THE inline edit field SHALL auto-expand to fit content
3. WHEN a user presses Enter or clicks outside, THE System SHALL save the inline edit
4. WHEN a user presses Escape, THE System SHALL cancel the inline edit
5. THE System SHALL show a subtle edit icon on hover to indicate editable fields

### Requirement 18: スワイプアクション（モバイル）

**User Story:** As a photographer, I want to swipe on queue items to quickly access actions, so that I can edit and manage posts efficiently on mobile.

#### Acceptance Criteria

1. WHEN a user swipes left on a queue item, THE System SHALL reveal action buttons (Edit, Delete, Send)
2. WHEN a user swipes right on a queue item, THE System SHALL mark it as ready/draft toggle
3. THE swipe actions SHALL have haptic feedback on supported devices
4. THE System SHALL auto-close swipe actions when another item is swiped

### Requirement 19: 編集モーダルの改善

**User Story:** As a photographer, I want a more efficient edit modal with better field organization, so that I can complete edits faster.

#### Acceptance Criteria

1. THE edit modal SHALL organize fields into collapsible sections: "基本情報", "人物情報", "コメント"
2. THE edit modal SHALL show field completion status (✓ or empty indicator) for each section header
3. WHEN all required fields are filled, THE System SHALL auto-enable the "Save" button with visual highlight
4. THE edit modal SHALL provide "Previous" and "Next" buttons to navigate between queue items without closing
5. THE edit modal SHALL remember the last opened section and restore it on next open
6. THE edit modal SHALL show a mini-preview of the generated post text that updates in real-time

### Requirement 20: クイックアクションメニュー

**User Story:** As a photographer, I want a context menu with common actions, so that I can perform operations quickly.

#### Acceptance Criteria

1. WHEN a user right-clicks (or long-press on mobile) on a queue item, THE System SHALL show a context menu
2. THE context menu SHALL include: Edit, Duplicate, Delete, Generate Comment, Copy Text, Send
3. THE context menu SHALL show keyboard shortcuts next to each action
4. WHEN a user selects "Duplicate", THE System SHALL create a copy of the post with "(copy)" suffix on booth name

### Requirement 21: 一括編集モード

**User Story:** As a photographer, I want to select multiple posts and edit them together, so that I can apply the same changes to multiple posts at once.

#### Acceptance Criteria

1. THE System SHALL provide a "Select Mode" toggle in the queue header
2. WHEN in select mode, THE System SHALL show checkboxes on each queue item
3. WHEN multiple items are selected, THE System SHALL show a bulk action bar with: "Apply Booth", "Apply Role", "Generate Comments", "Delete"
4. WHEN a user clicks "Apply Booth" with multiple selections, THE System SHALL apply the specified booth info to all selected posts
5. THE System SHALL show the count of selected items in the bulk action bar

### Requirement 22: 自動保存とアンドゥ機能

**User Story:** As a photographer, I want my changes to be automatically saved and reversible, so that I don't lose work and can undo mistakes.

#### Acceptance Criteria

1. THE System SHALL auto-save all changes to localStorage every 5 seconds
2. THE System SHALL maintain an undo history of the last 10 actions
3. WHEN a user presses Ctrl+Z, THE System SHALL undo the last action
4. WHEN a user presses Ctrl+Shift+Z, THE System SHALL redo the last undone action
5. THE System SHALL show a brief "Saved" indicator when auto-save occurs
6. WHEN the browser is closed unexpectedly, THE System SHALL restore the last saved state on next load

### Requirement 23: フィールドテンプレート機能

**User Story:** As a photographer, I want to save and reuse common field combinations, so that I can quickly fill in repetitive information.

#### Acceptance Criteria

1. THE System SHALL allow saving the current post as a "Field Template"
2. THE Field Template SHALL store: booth name, booth account, role, and optionally person name pattern
3. WHEN a user applies a Field Template, THE System SHALL fill matching fields in the current post
4. THE System SHALL support template variables like {number} for sequential naming
5. THE System SHALL allow organizing templates into categories (e.g., "TGS", "レース", "展示会")
