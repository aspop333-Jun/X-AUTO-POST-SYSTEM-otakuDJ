/**
 * イベント写真自動投稿システム
 * メインアプリケーションロジック
 */

// Import required modules
import { stateManager } from './state-manager.js';
import { parse, validateAccount } from './bulk-text-parser.js';
import { NavigationController } from './navigation-controller.js';
import { initBatchUI, openBatchGenerateModal, openBatchSendModal } from './batch-ui.js';
import { initDragDrop, getDragDropManager } from './drag-drop.js';
import { keyboardShortcuts } from './keyboard-shortcuts.js';
import './event-patterns.js';
import './comment-rules.js';
import './storage-adapter.js';
import './person-database.js';
import './autocomplete-engine.js';
import './autocomplete-ui.js';
import './template-database.js';
import './template-ui.js';
import './history-database.js';
import './history-ui.js';
import './inline-edit.js';
import './status-indicator.js';
import './quick-preview.js';
import './context-menu.js';
import './selection-mode.js';
import './focus-manager.js';
import './touch-gestures.js';
import './event-database.js';
import './batch-processor.js';

// ========================================
// State Management
// ========================================

const AppState = {
    currentStep: 1,
    eventInfo: {
        eventEn: '',
        eventJp: '',
        date: '',
        venue: '',
        category: 'ブース',
        hashtags: ''
    },

    // 投稿キュー（最大10件）
    postQueue: [],
    currentEditIndex: null,

    // 現在の入力中データ（互換性維持）
    photoData: {
        imageFile: null,
        imageBase64: null,
        boothName: '',
        boothAccount: '',
        personRole: 'モデル',
        personName: '',
        personAccount: '',
        aiComment: ''
    },

    settings: {
        makeWebhookUrl: ''
    }
};

// 投稿アイテムのファクトリ関数
function createPostItem(overrides = {}) {
    return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        imageFile: null,
        imageBase64: null,
        boothName: '',
        boothAccount: '',
        personRole: 'モデル',
        personName: '',
        personAccount: '',
        aiComment: '',
        status: 'draft', // draft | ready | sent | failed
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides
    };
}

// キューに投稿を追加
function addToQueue(postData = {}) {
    if (AppState.postQueue.length >= 10) {
        showToast('投稿キューは最大10件です', 'error');
        return null;
    }

    // 前の状態を保存
    const previousState = {
        postQueue: [...AppState.postQueue]
    };

    const post = createPostItem(postData);
    AppState.postQueue.push(post);

    // アンドゥスタックに追加
    const newState = {
        postQueue: [...AppState.postQueue]
    };
    stateManager.pushUndo('ADD_TO_QUEUE', previousState, newState);

    renderPostQueue();
    return post;
}

// キューから投稿を削除
function removeFromQueue(index) {
    if (index >= 0 && index < AppState.postQueue.length) {
        // 前の状態を保存
        const previousState = {
            postQueue: [...AppState.postQueue]
        };

        AppState.postQueue.splice(index, 1);

        // アンドゥスタックに追加
        const newState = {
            postQueue: [...AppState.postQueue]
        };
        stateManager.pushUndo('REMOVE_FROM_QUEUE', previousState, newState);

        renderPostQueue();
        showToast('投稿を削除しました', 'success');
    }
}

// キューの投稿を更新
function updateQueueItem(index, updates) {
    if (index >= 0 && index < AppState.postQueue.length) {
        // 前の状態を保存
        const previousState = {
            postQueue: [...AppState.postQueue]
        };

        Object.assign(AppState.postQueue[index], updates);

        // アンドゥスタックに追加
        const newState = {
            postQueue: [...AppState.postQueue]
        };
        stateManager.pushUndo('UPDATE_QUEUE_ITEM', previousState, newState);

        renderPostQueue();
    }
}

// ========================================
// Multiple Event Batch Parser
// ========================================

/**
 * 複数イベントを含むテキストを解析して配列で返す
 * ①②③...形式、---区切り、イベント名:で始まるブロックなどを検出
 */
function parseMultipleEvents(text) {
    if (!text || typeof text !== 'string') return [];

    const events = [];

    // 区切りパターン（優先順位順）
    const delimiters = [
        // ①②③...形式
        /(?:^|\n)([①②③④⑤⑥⑦⑧⑨⑩])\s*\n/gm,
        // ---投稿1---形式
        /(?:^|\n)[-=]{3,}.*?(?:投稿|イベント|Event)?\s*(\d+)\s*[-=]{3,}\s*\n/gmi,
        // 空行で区切られたブロック
        /\n{2,}/g
    ];

    let blocks = [];

    // ①②③形式を優先検出
    const numberedBlocks = text.split(/(?=^[①②③④⑤⑥⑦⑧⑨⑩])/gm).filter(b => b.trim());

    if (numberedBlocks.length > 1) {
        blocks = numberedBlocks;
    } else {
        // イベント名:で始まるブロックで分割
        const eventNameBlocks = text.split(/(?=(?:イベント名|Event|EVENT)[：:])/gi).filter(b => b.trim());
        if (eventNameBlocks.length > 1) {
            blocks = eventNameBlocks;
        } else {
            // 空行2つ以上で分割
            blocks = text.split(/\n{3,}/).filter(b => b.trim());
        }
    }

    // 最大10件まで
    const maxBlocks = blocks.slice(0, 10);

    for (const block of maxBlocks) {
        const parsed = parseEventBlock(block.trim());
        if (parsed && (parsed.eventEn || parsed.eventJp || parsed.venue)) {
            events.push(parsed);
        }
    }

    return events;
}

/**
 * 単一のイベントブロックを解析
 */
function parseEventBlock(block) {
    const result = {
        eventEn: '',
        eventJp: '',
        date: '',
        venue: '',
        category: 'ブース',
        hashtags: ''
    };

    // 番号プレフィックスを除去
    const cleanBlock = block.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*\n?/, '').trim();

    // 各フィールドを抽出
    const patterns = {
        eventEn: [
            /(?:イベント名|Event|EVENT)[（(]?(?:英語|En)?[)）]?[：:]\s*(.+)/i,
            /(?:English|英語名)[：:]\s*(.+)/i
        ],
        eventJp: [
            /(?:日本語名|Japanese|和名)[：:]\s*(.+)/i,
            /(?:イベント名|Event)[（(]?(?:日本語|JP|Jp)?[)）]?[：:]\s*([^\n]+(?:[\u3040-\u30ff\u3400-\u9fff]))/i
        ],
        date: [
            /(?:日付|開催日|Date|日程|期間)[：:]\s*(.+)/i,
            /(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2}(?:\s*[-~–]\s*\d{1,2})?)/
        ],
        venue: [
            /(?:会場|場所|Venue|Place)[：:]\s*(.+)/i
        ],
        hashtags: [
            /(?:ハッシュタグ|Hashtags?|Tags?)[：:]\s*(.+)/i,
            /((?:#[^\s#]+\s*)+)/
        ]
    };

    for (const [field, regexes] of Object.entries(patterns)) {
        for (const re of regexes) {
            const match = cleanBlock.match(re);
            if (match && match[1]) {
                result[field] = match[1].trim();
                break;
            }
        }
    }

    // イベント名の自動検出（パターンにマッチしない場合）
    if (!result.eventEn && !result.eventJp) {
        // 最初の行をイベント名として使用
        const firstLine = cleanBlock.split('\n')[0].trim();
        if (firstLine && firstLine.length > 3 && firstLine.length < 100) {
            // 日本語が含まれるかで判定
            if (/[\u3040-\u30ff\u3400-\u9fff]/.test(firstLine)) {
                result.eventJp = firstLine;
            } else {
                result.eventEn = firstLine;
            }
        }
    }

    return result;
}

/**
 * バッチ解析してキューに追加
 */
function addBatchEventsToQueue(text) {
    const events = parseMultipleEvents(text);

    if (events.length === 0) {
        showToast('イベントを検出できませんでした', 'error');
        return 0;
    }

    const available = 10 - AppState.postQueue.length;
    const toAdd = events.slice(0, available);

    if (toAdd.length < events.length) {
        showToast(`最大10件のため、${toAdd.length}件のみ追加します`, 'warning');
    }

    for (const event of toAdd) {
        // イベント情報を投稿キューに追加（各イベントごとに EventInfo をセット）
        addToQueue({
            // イベント情報をキューアイテムに埋め込む
            eventInfo: { ...event },
            boothName: '',
            personName: '',
            aiComment: '',
            status: 'draft'
        });
    }

    showToast(`${toAdd.length}件のイベントを追加しました`, 'success');
    return toAdd.length;
}

// ========================================
// Post Queue Rendering
// ========================================

const QUEUE_NUMBER_EMOJIS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

function renderPostQueue() {
    const container = DOM.postQueue;
    const emptyState = DOM.queueEmpty;

    if (!container) return;

    // Update count
    if (DOM.queueCount) {
        DOM.queueCount.textContent = `${AppState.postQueue.length} / 10`;
    }

    // Update FAB count
    updateFloatingActionBar();

    // Update completion bar
    if (window.statusIndicator) {
        window.statusIndicator.updateCompletionBar(AppState.postQueue);
    }

    // Show/hide empty state
    if (AppState.postQueue.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        // Remove all queue items
        container.querySelectorAll('.queue-item').forEach(el => el.remove());
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Remove existing items
    container.querySelectorAll('.queue-item').forEach(el => el.remove());

    // Render each item
    AppState.postQueue.forEach((post, index) => {
        const item = document.createElement('div');
        item.className = `queue-item ${post.status}`;
        item.dataset.index = index;

        // Add selection mode class if active
        const isSelectionMode = window.selectionModeManager && window.selectionModeManager.isSelectionMode;
        const isSelected = window.selectionModeManager && window.selectionModeManager.isSelected(index);

        if (isSelectionMode) {
            item.classList.add('selection-mode');
            if (isSelected) {
                item.classList.add('selected');
            }
        }

        const thumbnailContent = post.imageBase64
            ? `<img src="${post.imageBase64}" alt="Thumbnail">`
            : `<span class="queue-thumbnail-placeholder">📷</span>`;

        const statusClass = post.status || 'draft';
        const statusText = window.statusIndicator
            ? window.statusIndicator.getStatusText(post.status || 'draft')
            : (post.status === 'sent' ? '送信済' : post.status === 'ready' ? '準備完了' : post.status === 'failed' ? '失敗' : '下書き');

        // Get warning icon if missing required fields
        const warningIcon = window.statusIndicator
            ? window.statusIndicator.getWarningIconHTML(post)
            : '';

        // Add checkbox if in selection mode
        const checkboxHTML = isSelectionMode
            ? `<div class="queue-checkbox">
                <input type="checkbox" ${isSelected ? 'checked' : ''} />
               </div>`
            : '';

        item.innerHTML = `
            ${checkboxHTML}
            <div class="queue-number">${QUEUE_NUMBER_EMOJIS[index]}</div>
            <div class="queue-thumbnail">${thumbnailContent}</div>
            <div class="queue-info">
                <div class="queue-booth">${post.boothName || '未設定'}</div>
                <div class="queue-person">${post.personName ? post.personName + ' さん' : '名前未設定'}</div>
                <div class="queue-comment">${post.aiComment || 'コメント未設定'}</div>
            </div>
            <div class="queue-actions">
                <button class="queue-edit-btn" title="編集">✏️</button>
                <button class="queue-send-btn" title="送信">📤</button>
                <button class="queue-delete-btn" title="削除">🗑️</button>
            </div>
            <div class="queue-status ${statusClass}">${statusText}</div>
            ${warningIcon}
        `;

        // Apply status-based styling (including stale draft highlighting)
        if (window.statusIndicator) {
            window.statusIndicator.applyStatusStyling(item, post);
        }

        // Event listeners for checkbox (if in selection mode)
        if (isSelectionMode) {
            const checkbox = item.querySelector('.queue-checkbox input');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    if (window.selectionModeManager) {
                        window.selectionModeManager.toggleSelection(index);
                    }
                });
            }
        }

        // Event listeners
        item.querySelector('.queue-edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(index);
        });

        item.querySelector('.queue-send-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            sendQueueItem(index);
        });

        item.querySelector('.queue-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromQueue(index);
        });

        // Click on item to edit (but not if inline editing or in selection mode)
        item.addEventListener('click', (e) => {
            // Don't open modal if clicking on an inline editable field or if currently editing
            if (e.target.classList.contains('inline-editable') ||
                e.target.closest('.inline-editable') ||
                (typeof inlineEditManager !== 'undefined' && inlineEditManager.isEditing())) {
                return;
            }

            // Don't open modal if in selection mode - just toggle selection
            if (isSelectionMode) {
                if (window.selectionModeManager) {
                    window.selectionModeManager.toggleSelection(index);
                }
                return;
            }

            openEditModal(index);
        });

        container.appendChild(item);

        // Initialize inline editing for this item
        if (typeof inlineEditManager !== 'undefined') {
            inlineEditManager.initializeQueueItem(item, index);
        }
    });

    // Initialize drag and drop for all items
    if (dragDropManager) {
        dragDropManager.initializeQueue(container);
    }

    // Initialize quick preview for all items
    if (window.quickPreview) {
        window.quickPreview.initializeQueue(container);
    }

    // Initialize context menu for all items
    if (window.contextMenuManager) {
        window.contextMenuManager.initializeQueue(container);
    }
}

// Make functions globally accessible for drag-drop module and keyboard shortcuts
window.renderPostQueue = renderPostQueue;
window.addToQueue = addToQueue;
window.sendAllQueue = sendAllQueue;
window.closeEditModal = closeEditModal;
window.saveEditModal = saveEditModal;
window.closeBulkParserModal = closeBulkParserModal;
window.AppState = AppState;
window.showToast = showToast;
window.openEditModal = openEditModal;
window.sendQueueItem = sendQueueItem;
window.removeFromQueue = removeFromQueue;
window.updateQueueItem = updateQueueItem;

// ========================================
// Floating Action Bar Functions
// ========================================

/**
 * Updates the Floating Action Bar visibility and count
 */
function updateFloatingActionBar() {
    if (!DOM.floatingActionBar) return;

    // Show FAB only on Step 2
    if (AppState.currentStep === 2) {
        DOM.floatingActionBar.classList.add('visible');
    } else {
        DOM.floatingActionBar.classList.remove('visible');
    }

    // Update queue count
    if (DOM.fabQueueCount) {
        DOM.fabQueueCount.textContent = `${AppState.postQueue.length} / 10`;
    }
}

/**
 * Toggles the FAB collapsed state (mobile)
 */
function toggleFloatingActionBar() {
    if (!DOM.floatingActionBar) return;
    DOM.floatingActionBar.classList.toggle('collapsed');
}

// ========================================
// Edit Modal Functions
// ========================================

function openEditModal(index) {
    const post = AppState.postQueue[index];
    if (!post) return;

    AppState.currentEditIndex = index;

    // Set modal title
    if (DOM.editModalTitle) {
        DOM.editModalTitle.textContent = `✏️ 投稿を編集 - ${QUEUE_NUMBER_EMOJIS[index]}`;
    }

    // Set image
    if (DOM.editImagePreview) {
        if (post.imageBase64) {
            DOM.editImagePreview.innerHTML = `<img src="${post.imageBase64}" alt="Preview">`;
        } else {
            DOM.editImagePreview.innerHTML = `<span class="photo-placeholder">📷 写真をドロップ</span>`;
        }
    }

    // Set form values
    if (DOM.editBoothName) DOM.editBoothName.value = post.boothName || '';
    if (DOM.editBoothAccount) DOM.editBoothAccount.value = post.boothAccount || '';
    if (DOM.editPersonRole) DOM.editPersonRole.value = post.personRole || 'モデル';
    if (DOM.editPersonName) DOM.editPersonName.value = post.personName || '';
    if (DOM.editPersonAccount) DOM.editPersonAccount.value = post.personAccount || '';
    if (DOM.editAiComment) DOM.editAiComment.value = post.aiComment || '';

    // Update status badge
    updateEditStatusBadge(post.status);

    // Reset to edit mode
    switchEditMode('edit');

    // Update preview
    updateEditPreview();

    // Show modal
    if (DOM.editPostModal) {
        DOM.editPostModal.classList.add('active');
    }

    // Focus on first empty field (Requirement 13.3)
    if (focusManager) {
        focusManager.focusFirstEmptyField();
    }
}

function closeEditModal() {
    AppState.currentEditIndex = null;
    if (DOM.editPostModal) {
        DOM.editPostModal.classList.remove('active');
    }
}

function saveEditModal() {
    const index = AppState.currentEditIndex;
    if (index === null || index < 0) return;

    const updates = {
        boothName: DOM.editBoothName?.value || '',
        boothAccount: DOM.editBoothAccount?.value || '',
        personRole: DOM.editPersonRole?.value || 'モデル',
        personName: DOM.editPersonName?.value || '',
        personAccount: DOM.editPersonAccount?.value || '',
        aiComment: DOM.editAiComment?.value || '',
        status: 'ready'
    };

    updateQueueItem(index, updates);

    // Update status badge and switch to preview
    updateEditStatusBadge('ready');
    switchEditMode('preview');
    updateEditPreviewFull();

    showToast('投稿を保存しました！プレビューを確認してください', 'success');
}

// ========================================
// Edit Modal Tab Switching
// ========================================

function switchEditMode(mode) {
    const editContent = document.getElementById('edit-mode-content');
    const previewContent = document.getElementById('preview-mode-content');
    const tabEdit = document.getElementById('tab-edit');
    const tabPreview = document.getElementById('tab-preview');

    if (mode === 'edit') {
        if (editContent) editContent.style.display = 'block';
        if (previewContent) previewContent.style.display = 'none';
        tabEdit?.classList.add('active');
        tabPreview?.classList.remove('active');
    } else {
        if (editContent) editContent.style.display = 'none';
        if (previewContent) previewContent.style.display = 'block';
        tabEdit?.classList.remove('active');
        tabPreview?.classList.add('active');
        updateEditPreviewFull();
    }
}

function updateEditStatusBadge(status) {
    const badge = document.getElementById('edit-status-badge');
    if (!badge) return;

    badge.className = 'edit-status-badge ' + (status || 'draft');

    // Use status indicator module if available
    if (window.statusIndicator) {
        badge.textContent = window.statusIndicator.getStatusText(status || 'draft');
    } else {
        badge.textContent = status === 'ready' ? '編集済み' :
            status === 'sent' ? '送信済み' :
                status === 'failed' ? '失敗' :
                    '未編集';
    }
}

function updateEditPreviewFull() {
    const index = AppState.currentEditIndex;
    if (index === null || index < 0) return;

    const post = AppState.postQueue[index];
    if (!post) return;

    // Update preview image
    const previewImage = document.getElementById('preview-image-large');
    if (previewImage) {
        if (post.imageBase64) {
            previewImage.innerHTML = `<img src="${post.imageBase64}" alt="Preview">`;
        } else {
            previewImage.innerHTML = `<span class="photo-placeholder">画像なし</span>`;
        }
    }

    // Generate and display preview text
    const templates = generatePostTemplatesForItem(post);
    const previewX1 = document.getElementById('edit-preview-x1');
    if (previewX1) {
        previewX1.textContent = templates.x1;
    }
}

function copyPreviewText(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    navigator.clipboard.writeText(element.textContent).then(() => {
        showToast('コピーしました', 'success');
    }).catch(() => {
        showToast('コピーに失敗しました', 'error');
    });
}

function updateEditPreview() {
    if (!DOM.editPreviewContent) return;

    const event = AppState.eventInfo;
    const boothName = DOM.editBoothName?.value || '';
    const boothAccount = DOM.editBoothAccount?.value || '';
    const personRole = DOM.editPersonRole?.value || 'モデル';
    const personName = DOM.editPersonName?.value || '';
    const personAccount = DOM.editPersonAccount?.value || '';
    const aiComment = DOM.editAiComment?.value || '';

    const preview = `📸 ${event.eventEn} – ${event.eventJp}
${event.date}｜${event.venue}

◼︎ ${event.category}
${boothName}${boothAccount ? `（${boothAccount}）` : ''}

◼︎ ${personRole}
${personName ? `${personName} さん` : '※お名前調査中'}
${personAccount}

${aiComment}

${event.hashtags}`.trim();

    DOM.editPreviewContent.textContent = preview;
}

// ========================================
// Queue Item Actions
// ========================================

async function sendQueueItem(index) {
    const post = AppState.postQueue[index];
    if (!post) return;

    const webhookUrl = AppState.settings.makeWebhookUrl;
    if (!webhookUrl) {
        showToast('Make.com Webhook URLを設定してください', 'error');
        return;
    }

    const event = AppState.eventInfo;
    const templates = generatePostTemplatesForItem(post);

    const payload = {
        timestamp: new Date().toISOString(),
        event: event,
        photo: {
            base64: post.imageBase64
        },
        person: {
            name: post.personName,
            role: post.personRole,
            account: post.personAccount
        },
        booth: {
            name: post.boothName,
            account: post.boothAccount
        },
        posts: {
            x1: templates.x1,
            x2: templates.x2,
            instagram: templates.ig
        }
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            updateQueueItem(index, { status: 'sent' });
            showToast(`${QUEUE_NUMBER_EMOJIS[index]} を送信しました`, 'success');
        } else {
            throw new Error('Webhook request failed');
        }
    } catch (error) {
        console.error('Send error:', error);
        updateQueueItem(index, { status: 'failed' });
        showToast('送信に失敗しました', 'error');
    }
}

function generatePostTemplatesForItem(post) {
    const event = AppState.eventInfo;
    const hashtags = event.hashtags || '';
    const hashtagsArray = hashtags.split(' ').filter(h => h.startsWith('#'));
    const mainHashtag = hashtagsArray[0] || '';

    const x1 = `📸 ${event.eventEn} – ${event.eventJp}
${event.date}｜${event.venue}

◼︎ ${event.category}
${post.boothName}${post.boothAccount ? `（${post.boothAccount}）` : ''}

◼︎ ${post.personRole}
${post.personName ? `${post.personName} さん` : '※お名前調査中'}
${post.personAccount}

${post.aiComment}

${hashtags}`.trim();

    const x2 = `📸 ${event.eventEn}
${event.date}｜${event.venue}

${post.boothName}
${post.personName ? `${post.personName} さん` : ''} ${post.personAccount}

${post.aiComment}

${mainHashtag}`.trim();

    const igHashtags = hashtags + ' #portrait #ポートレート #eventphoto';
    const ig = `📸 ${event.eventEn} – ${event.eventJp}

${post.boothName}
${post.personName ? `${post.personName} さん` : ''}

${post.aiComment}

${igHashtags}`.trim();

    return { x1, x2, ig };
}

function clearAllQueue() {
    if (AppState.postQueue.length === 0) return;

    if (confirm('全ての投稿をクリアしますか？')) {
        AppState.postQueue = [];
        renderPostQueue();
        showToast('全ての投稿をクリアしました', 'success');
    }
}

async function sendAllQueue() {
    // Use the new batch send modal
    openBatchSendModal();
}

// ========================================
// Photo Drop Handler for Queue
// ========================================

async function handlePhotoForQueue(file) {
    if (!file.type.startsWith('image/')) {
        showToast('画像ファイルを選択してください', 'error');
        return;
    }

    if (AppState.postQueue.length >= 10) {
        showToast('投稿キューは最大10件です', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const compressed = await compressImage(e.target.result);
        addToQueue({
            imageFile: file,
            imageBase64: compressed
        });
        showToast('写真を追加しました', 'success');
    };
    reader.readAsDataURL(file);
}

async function handleMultiplePhotosForQueue(files) {
    const filesArray = Array.from(files);
    const imageFiles = filesArray.filter(f => f.type.startsWith('image/'));

    const available = 10 - AppState.postQueue.length;
    const toAdd = imageFiles.slice(0, available);

    if (toAdd.length < imageFiles.length) {
        showToast(`最大10件のため、${toAdd.length}件のみ追加します`, 'warning');
    }

    for (const file of toAdd) {
        await handlePhotoForQueue(file);
    }
}

// ========================================
// DOM Elements
// ========================================

const DOM = {
    // Step indicators
    step1Indicator: document.getElementById('step1-indicator'),
    step2Indicator: document.getElementById('step2-indicator'),

    // Step panels
    step1Panel: document.getElementById('step1-panel'),
    step2Panel: document.getElementById('step2-panel'),

    // Event drop zone
    eventDropZone: document.getElementById('event-drop-zone'),
    eventFileInput: document.getElementById('event-file-input'),

    // Event form
    eventForm: document.getElementById('event-form'),
    eventEn: document.getElementById('event-en'),
    eventJp: document.getElementById('event-jp'),
    eventDate: document.getElementById('event-date'),
    eventVenue: document.getElementById('event-venue'),
    eventCategory: document.getElementById('event-category'),
    eventHashtags: document.getElementById('event-hashtags'),

    // Event summary
    eventSummary: document.getElementById('event-summary'),
    summaryEventName: document.getElementById('summary-event-name'),
    summaryEventMeta: document.getElementById('summary-event-meta'),
    changeEventBtn: document.getElementById('change-event-btn'),

    // Photo section
    photoDropZone: document.getElementById('photo-drop-zone'),
    photoFileInput: document.getElementById('photo-file-input'),
    photoPreview: document.getElementById('photo-preview'),
    clearInputBtn: document.getElementById('clear-input-btn'),

    // Photo form
    boothName: document.getElementById('booth-name'),
    boothAccount: document.getElementById('booth-account'),
    personRole: document.getElementById('person-role'),
    personName: document.getElementById('person-name'),
    personAccount: document.getElementById('person-account'),

    // Comment generation inputs
    expressionType: document.getElementById('expression-type'),
    focusPoint: document.getElementById('focus-point'),
    contextMatch: document.getElementById('context-match'),
    aiComment: document.getElementById('ai-comment'),
    generateCommentBtn: document.getElementById('generate-comment-btn'),
    regenerateBtn: document.getElementById('regenerate-btn'),

    // Preview
    previewX1: document.getElementById('preview-x1'),
    previewX2: document.getElementById('preview-x2'),
    previewIg: document.getElementById('preview-ig'),

    // Actions
    sendMakeBtn: document.getElementById('send-make-btn'),
    nextPhotoBtn: document.getElementById('next-photo-btn'),

    // Settings
    settingsModal: document.getElementById('settings-modal'),
    openSettingsBtn: document.getElementById('open-settings'),
    closeSettingsBtn: document.getElementById('close-settings'),
    makeWebhookUrl: document.getElementById('make-webhook-url'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),

    // Toast
    toast: document.getElementById('toast'),

    // X Preview Modal
    xPreviewModal: document.getElementById('x-preview-modal'),
    closeXPreviewBtn: document.getElementById('close-x-preview'),
    modalPostText: document.getElementById('modal-post-text'),
    modalMediaPreview: document.getElementById('modal-media-preview'),
    modalCopyBtn: document.getElementById('modal-copy-btn'),
    modalCopyAllBtn: document.getElementById('modal-copy-all-btn'),
    modalPostBtn: document.getElementById('modal-post-btn'),

    // Quick Add
    quickAddDrop: document.getElementById('quick-add-drop'),
    queueCount: document.getElementById('queue-count'),
    addEmptyBtn: document.getElementById('add-empty-btn'),

    // Post Queue
    postQueue: document.getElementById('post-queue'),
    queueEmpty: document.getElementById('queue-empty'),
    clearAllBtn: document.getElementById('clear-all-btn'),
    sendAllBtn: document.getElementById('send-all-btn'),

    // Edit Modal
    editPostModal: document.getElementById('edit-post-modal'),
    closeEditModal: document.getElementById('close-edit-modal'),
    editModalTitle: document.getElementById('edit-modal-title'),
    editImagePreview: document.getElementById('edit-image-preview'),
    editPhotoInput: document.getElementById('edit-photo-input'),
    editBoothName: document.getElementById('edit-booth-name'),
    editBoothAccount: document.getElementById('edit-booth-account'),
    editPersonRole: document.getElementById('edit-person-role'),
    editPersonName: document.getElementById('edit-person-name'),
    editPersonAccount: document.getElementById('edit-person-account'),
    editExpressionType: document.getElementById('edit-expression-type'),
    editAiComment: document.getElementById('edit-ai-comment'),
    editGenerateCommentBtn: document.getElementById('edit-generate-comment-btn'),
    editPreviewContent: document.getElementById('edit-preview-content'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    saveEditBtn: document.getElementById('save-edit-btn'),

    // Floating Action Bar
    floatingActionBar: document.getElementById('floating-action-bar'),
    fabQueueCount: document.getElementById('fab-queue-count'),
    fabBatchGenerateBtn: document.getElementById('fab-batch-generate-btn'),
    fabClearAllBtn: document.getElementById('fab-clear-all-btn'),
    fabSendAllBtn: document.getElementById('fab-send-all-btn'),
    fabToggle: document.getElementById('fab-toggle')
};

// ========================================
// Initialization
// ========================================

// Global instances
let focusManager = null;

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initStateManager();
    initEventListeners();
    initBatchUI();
    initFocusManager();
    updatePreview();
});

function initFocusManager() {
    // Initialize FocusManager
    if (typeof FocusManager !== 'undefined') {
        focusManager = new FocusManager();
        focusManager.initialize();
        console.log('[App] FocusManager initialized');
    } else {
        console.warn('[App] FocusManager not available');
    }
}

function initStateManager() {
    // StateManagerに現在の状態を設定
    stateManager.setState(AppState);

    // NavigationControllerを初期化
    navigationController = new NavigationController(stateManager);

    // DragDropManagerを初期化
    dragDropManager = initDragDrop(stateManager);

    // 保存された状態を復元
    const savedState = stateManager.restore();
    if (savedState) {
        // 状態を復元
        AppState.currentStep = savedState.currentStep || 1;
        AppState.eventInfo = savedState.eventInfo || AppState.eventInfo;
        AppState.postQueue = savedState.postQueue || [];
        AppState.selectedIndices = savedState.selectedIndices || [];
        AppState.currentEditIndex = savedState.editingIndex;

        // UIを更新
        navigationController.goToStep(AppState.currentStep, { force: true });
        renderPostQueue();
        updatePreview();

        showToast('前回の作業を復元しました', 'info');
    }

    // 自動保存を開始
    stateManager.startAutoSave();

    // ブラウザ終了時の処理を設定
    stateManager.setupBeforeUnload();

    // 状態変更リスナーを登録
    stateManager.subscribe((state) => {
        // 状態が変更されたらUIを更新
        renderPostQueue();
        updatePreview();
    });

    console.log('[App] StateManager, NavigationController, and DragDropManager initialized');
}

function loadSettings() {
    const savedSettings = localStorage.getItem('autoPostSettings');
    if (savedSettings) {
        AppState.settings = JSON.parse(savedSettings);
        DOM.makeWebhookUrl.value = AppState.settings.makeWebhookUrl || '';
    }
}

function saveSettings() {
    AppState.settings.makeWebhookUrl = DOM.makeWebhookUrl.value;
    localStorage.setItem('autoPostSettings', JSON.stringify(AppState.settings));
    showToast('設定を保存しました', 'success');
    DOM.settingsModal.classList.remove('active');
}

// ========================================
// Event Listeners
// ========================================

function initEventListeners() {
    // ========================================
    // Tab Navigation for Event Input
    // ========================================
    document.querySelectorAll('.input-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs and contents
            document.querySelectorAll('.input-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Activate clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.dataset.tab + '-tab';
            document.getElementById(tabId)?.classList.add('active');
        });
    });

    // Parse paste button
    const parsePasteBtn = document.getElementById('parse-paste-btn');
    if (parsePasteBtn) {
        parsePasteBtn.addEventListener('click', () => {
            const pasteInput = document.getElementById('paste-input');
            const parseResult = document.getElementById('parse-result');

            if (!pasteInput.value.trim()) {
                showToast('テキストを入力してください', 'error');
                return;
            }

            const text = pasteInput.value;

            // Check if this looks like multiple events (①②③ format or multiple イベント名:)
            const hasMultipleMarkers = /[①②③④⑤⑥⑦⑧⑨⑩]/.test(text) ||
                (text.match(/イベント名[：:]/gi) || []).length > 1;

            if (hasMultipleMarkers) {
                // Parse as multiple events and add to queue
                const events = parseMultipleEvents(text);
                if (events.length > 0) {
                    parseResult.innerHTML = `<span class="success">✓ ${events.length}件のイベントを検出しました</span>`;

                    // Add batch events to queue
                    const added = addBatchEventsToQueue(text);

                    if (added > 0) {
                        // Go to step 2 to show the queue
                        goToStep(2);
                    }
                    return;
                }
            }

            // Single event: Parse using event-patterns.js
            const result = window.UniversalEventParser.parseEventText(text);

            // Apply to form
            window.UniversalEventParser.applyParsedData(result);

            // Show result feedback
            if (result.confidence > 30) {
                parseResult.innerHTML = `<span class="success">✓ ${result.matched.length}項目を検出しました</span>`;
                showToast('イベント情報を解析しました', 'success');

                // Switch to manual tab to show filled form
                document.querySelectorAll('.input-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.querySelector('[data-tab="manual"]')?.classList.add('active');
                document.getElementById('manual-tab')?.classList.add('active');
            } else {
                parseResult.innerHTML = `<span class="warning">⚠ 一部の項目のみ検出されました</span>`;
                showToast('一部の情報を解析しました。手動で確認してください', 'warning');
            }
        });
    }

    // Event file drop zone
    setupDropZone(DOM.eventDropZone, DOM.eventFileInput, handleEventFile);
    DOM.eventFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleEventFile(e.target.files[0]);
    });

    // Event form submission
    DOM.eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEventInfo();
        goToStep(2);
        updatePreview();
    });

    // Change event button
    DOM.changeEventBtn.addEventListener('click', () => {
        // NavigationControllerを使用してStep 1に戻る（キューを保持）
        if (navigationController) {
            navigationController.goToStep(1, { preserveQueue: true });
        } else {
            goToStep(1);
        }
    });

    // ========================================
    // Breadcrumb Navigation
    // ========================================
    const breadcrumbStep1 = document.getElementById('breadcrumb-step1');
    const breadcrumbStep2 = document.getElementById('breadcrumb-step2');

    if (breadcrumbStep1) {
        breadcrumbStep1.addEventListener('click', () => {
            if (navigationController) {
                navigationController.goToStep(1, { preserveQueue: true });
            } else {
                goToStep(1);
            }
        });
    }

    if (breadcrumbStep2) {
        breadcrumbStep2.addEventListener('click', () => {
            if (navigationController && navigationController.canNavigate(2)) {
                navigationController.goToStep(2, { preserveQueue: true });
            } else if (!navigationController) {
                goToStep(2);
            }
        });
    }

    // ========================================
    // Quick Add Drop Zone (for Post Queue)
    // ========================================

    if (DOM.quickAddDrop) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            DOM.quickAddDrop.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            DOM.quickAddDrop.addEventListener(eventName, () => {
                DOM.quickAddDrop.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            DOM.quickAddDrop.addEventListener(eventName, () => {
                DOM.quickAddDrop.classList.remove('dragover');
            });
        });

        DOM.quickAddDrop.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleMultiplePhotosForQueue(files);
            }
        });

        DOM.quickAddDrop.addEventListener('click', () => {
            DOM.photoFileInput?.click();
        });
    }

    // Photo file input (multiple files support)
    if (DOM.photoFileInput) {
        DOM.photoFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleMultiplePhotosForQueue(e.target.files);
                e.target.value = ''; // Reset for re-selection
            }
        });
    }

    // Add empty post button
    if (DOM.addEmptyBtn) {
        DOM.addEmptyBtn.addEventListener('click', () => {
            addToQueue();
            showToast('空の投稿を追加しました', 'success');
        });
    }

    // Clear all button
    if (DOM.clearAllBtn) {
        DOM.clearAllBtn.addEventListener('click', clearAllQueue);
    }

    // Send all button
    if (DOM.sendAllBtn) {
        DOM.sendAllBtn.addEventListener('click', sendAllQueue);
    }

    // Batch generate button
    const batchGenerateBtn = document.getElementById('batch-generate-btn');
    if (batchGenerateBtn) {
        batchGenerateBtn.addEventListener('click', openBatchGenerateModal);
    }

    // ========================================
    // Floating Action Bar
    // ========================================

    // FAB Batch generate button
    if (DOM.fabBatchGenerateBtn) {
        DOM.fabBatchGenerateBtn.addEventListener('click', openBatchGenerateModal);
    }

    // FAB Clear all button
    if (DOM.fabClearAllBtn) {
        DOM.fabClearAllBtn.addEventListener('click', clearAllQueue);
    }

    // FAB Send all button
    if (DOM.fabSendAllBtn) {
        DOM.fabSendAllBtn.addEventListener('click', sendAllQueue);
    }

    // FAB Toggle button (mobile)
    if (DOM.fabToggle) {
        DOM.fabToggle.addEventListener('click', toggleFloatingActionBar);
    }

    // ========================================
    // Edit Modal
    // ========================================

    // Close edit modal
    if (DOM.closeEditModal) {
        DOM.closeEditModal.addEventListener('click', closeEditModal);
    }

    if (DOM.cancelEditBtn) {
        DOM.cancelEditBtn.addEventListener('click', closeEditModal);
    }

    // Save edit
    if (DOM.saveEditBtn) {
        DOM.saveEditBtn.addEventListener('click', saveEditModal);
    }

    // Edit modal background click
    if (DOM.editPostModal) {
        DOM.editPostModal.addEventListener('click', (e) => {
            if (e.target === DOM.editPostModal) {
                closeEditModal();
            }
        });
    }

    // Edit form inputs for live preview
    const editFormInputs = [
        DOM.editBoothName, DOM.editBoothAccount, DOM.editPersonRole,
        DOM.editPersonName, DOM.editPersonAccount, DOM.editAiComment
    ];
    editFormInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', updateEditPreview);
        }
    });

    // Edit photo input
    if (DOM.editPhotoInput) {
        DOM.editPhotoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = async (ev) => {
                const compressed = await compressImage(ev.target.result);

                // Update preview in modal
                if (DOM.editImagePreview) {
                    DOM.editImagePreview.innerHTML = `<img src="${compressed}" alt="Preview">`;
                }

                // Update queue item
                const index = AppState.currentEditIndex;
                if (index !== null && index >= 0) {
                    AppState.postQueue[index].imageBase64 = compressed;
                    AppState.postQueue[index].imageFile = file;
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Edit modal tab switching
    const tabEdit = document.getElementById('tab-edit');
    const tabPreview = document.getElementById('tab-preview');

    if (tabEdit) {
        tabEdit.addEventListener('click', () => switchEditMode('edit'));
    }
    if (tabPreview) {
        tabPreview.addEventListener('click', () => switchEditMode('preview'));
    }

    // Edit comment generation
    if (DOM.editGenerateCommentBtn) {
        DOM.editGenerateCommentBtn.addEventListener('click', async () => {
            const expressionType = DOM.editExpressionType?.value || '笑顔';
            const comment = window.generateRuleBasedComment({ expressionType });
            if (DOM.editAiComment) {
                DOM.editAiComment.value = comment;
                updateEditPreview();
            }
            showToast('コメントを生成しました', 'success');
        });
    }

    // Apply booth to all button
    const applyBoothToAllBtn = document.getElementById('apply-booth-to-all-btn');
    if (applyBoothToAllBtn) {
        applyBoothToAllBtn.addEventListener('click', () => {
            if (typeof window.openBulkApplyBoothDialog === 'function') {
                window.openBulkApplyBoothDialog();
            }
        });
    }

    // Settings modal
    DOM.openSettingsBtn.addEventListener('click', () => {
        DOM.settingsModal.classList.add('active');
    });
    DOM.closeSettingsBtn.addEventListener('click', () => {
        DOM.settingsModal.classList.remove('active');
    });
    DOM.saveSettingsBtn.addEventListener('click', saveSettings);

    // Close modal on background click
    DOM.settingsModal.addEventListener('click', (e) => {
        if (e.target === DOM.settingsModal) {
            DOM.settingsModal.classList.remove('active');
        }
    });

    // ========================================
    // X Preview Modal
    // ========================================

    // Preview card click -> open X preview modal
    document.querySelectorAll('.preview-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't open modal if clicking the copy button
            if (e.target.closest('.btn-copy')) return;

            const previewId = card.querySelector('.preview-content').id;
            openXPreviewModal(previewId);
        });
    });

    // Close X preview modal
    DOM.closeXPreviewBtn?.addEventListener('click', () => {
        DOM.xPreviewModal.classList.remove('active');
    });

    DOM.xPreviewModal?.addEventListener('click', (e) => {
        if (e.target === DOM.xPreviewModal) {
            DOM.xPreviewModal.classList.remove('active');
        }
    });

    // Modal copy button
    DOM.modalCopyBtn?.addEventListener('click', async () => {
        const text = DOM.modalPostText.textContent;
        try {
            await navigator.clipboard.writeText(text);
            DOM.modalCopyBtn.textContent = '✓ コピーしました';
            setTimeout(() => {
                DOM.modalCopyBtn.textContent = '📋 テキストをコピー';
            }, 2000);
        } catch (error) {
            showToast('コピーに失敗しました', 'error');
        }
    });

    // Modal open image in new tab
    DOM.modalCopyAllBtn?.addEventListener('click', () => {
        const imageBase64 = AppState.photoData.imageBase64;
        if (imageBase64) {
            window.open(imageBase64, '_blank');
        } else {
            showToast('画像がありません', 'error');
        }
    });

    // Modal post button (same as main send button)
    DOM.modalPostBtn?.addEventListener('click', () => {
        DOM.xPreviewModal.classList.remove('active');
        sendToMake();
    });
}

// ========================================
// X Preview Modal
// ========================================

function openXPreviewModal(previewId) {
    // Get the text content from the preview
    const previewElement = document.getElementById(previewId);
    if (!previewElement) return;

    const text = previewElement.textContent;
    const imageBase64 = AppState.photoData.imageBase64;

    // Set text
    DOM.modalPostText.textContent = text;

    // Set image
    if (imageBase64) {
        DOM.modalMediaPreview.innerHTML = `<img src="${imageBase64}" alt="Preview">`;
        DOM.modalMediaPreview.classList.remove('empty');
    } else {
        DOM.modalMediaPreview.innerHTML = '';
        DOM.modalMediaPreview.classList.add('empty');
    }

    // Show modal
    DOM.xPreviewModal.classList.add('active');
}

// ========================================
// Drop Zone Setup
// ========================================

function setupDropZone(dropZone, fileInput, handler) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) handler(file);
    });

    dropZone.addEventListener('click', () => fileInput.click());
}

// ========================================
// Step Navigation
// ========================================

function goToStep(step, options = {}) {
    // NavigationControllerが初期化されている場合はそれを使用
    if (navigationController) {
        return navigationController.goToStep(step, options);
    }

    // フォールバック: 直接ステップを変更（初期化前）
    AppState.currentStep = step;

    // Update indicators
    DOM.step1Indicator.classList.toggle('active', step === 1);
    DOM.step1Indicator.classList.toggle('completed', step > 1);
    DOM.step2Indicator.classList.toggle('active', step === 2);

    // Update panels
    DOM.step1Panel.classList.toggle('active', step === 1);
    DOM.step2Panel.classList.toggle('active', step === 2);

    // Update event summary
    if (step === 2) {
        updateEventSummary();
    }

    // Update Floating Action Bar visibility
    updateFloatingActionBar();

    return true;
}

// ========================================
// Event Info Handling
// ========================================

function handleEventFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        parseEventInfo(e.target.result);
    };
    reader.readAsText(file);
}

function parseEventInfo(content) {
    const lines = content.split('\n');
    const data = {};

    lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
            const value = valueParts.join(':').trim();
            data[key.trim().toLowerCase().replace(/_/g, '')] = value;
        }
    });

    // Map parsed data to form fields
    if (data.eventen) DOM.eventEn.value = data.eventen;
    if (data.eventjp) DOM.eventJp.value = data.eventjp;
    if (data.date) DOM.eventDate.value = data.date;
    if (data.venue) DOM.eventVenue.value = data.venue;
    if (data.category) {
        const categorySelect = DOM.eventCategory;
        for (let option of categorySelect.options) {
            if (option.value === data.category) {
                categorySelect.value = data.category;
                break;
            }
        }
    }
    if (data.hashtags) DOM.eventHashtags.value = data.hashtags;

    showToast('イベント情報を読み込みました', 'success');
}

function saveEventInfo() {
    AppState.eventInfo = {
        eventEn: DOM.eventEn.value,
        eventJp: DOM.eventJp.value,
        date: DOM.eventDate.value,
        venue: DOM.eventVenue.value,
        category: DOM.eventCategory.value,
        hashtags: DOM.eventHashtags.value
    };
}

function updateEventSummary() {
    const { eventEn, eventJp, date, venue } = AppState.eventInfo;
    DOM.summaryEventName.textContent = `${eventEn} – ${eventJp}`;
    DOM.summaryEventMeta.textContent = `${date}｜${venue}`;
}

// ========================================
// Photo Handling
// ========================================

/**
 * 画像を圧縮する
 * @param {string} dataUrl - Base64形式の画像データURL
 * @param {number} maxWidth - 最大幅
 * @param {number} quality - JPEG品質 (0-1)
 * @returns {Promise<string>} 圧縮後のBase64データURL
 */
async function compressImage(dataUrl, maxWidth = 1000, quality = 0.85) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            // 圧縮が必要かチェック
            if (img.width <= maxWidth && img.height <= maxWidth) {
                resolve(dataUrl); // 既に小さい場合はそのまま
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // アスペクト比を維持してリサイズ
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
    });
}

function handlePhotoFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('画像ファイルを選択してください', 'error');
        return;
    }

    AppState.photoData.imageFile = file;

    // Create preview and compress
    const reader = new FileReader();
    reader.onload = async (e) => {
        // 大きな画像を圧縮
        const compressed = await compressImage(e.target.result);
        AppState.photoData.imageBase64 = compressed;
        DOM.photoPreview.innerHTML = `<img src="${compressed}" alt="Preview">`;

        // 圧縮情報を表示
        const originalSize = (e.target.result.length * 0.75 / 1024).toFixed(0);
        const compressedSize = (compressed.length * 0.75 / 1024).toFixed(0);
        if (compressed !== e.target.result) {
            showToast(`写真を読み込みました (${originalSize}KB → ${compressedSize}KB)`, 'success');
        } else {
            showToast('写真を読み込みました', 'success');
        }
    };
    reader.readAsDataURL(file);
}

function clearPhotoInput() {
    // Clear photo
    AppState.photoData.imageFile = null;
    AppState.photoData.imageBase64 = null;
    DOM.photoPreview.innerHTML = '<span class="photo-placeholder">写真をドロップ</span>';

    // Clear form (but keep booth info)
    DOM.personName.value = '';
    DOM.personAccount.value = '';
    DOM.aiComment.value = '';

    updatePreview();
    showToast('入力をクリアしました', 'success');
}

function nextPhoto() {
    // Clear for next photo but keep event and booth info
    AppState.photoData.imageFile = null;
    AppState.photoData.imageBase64 = null;
    DOM.photoPreview.innerHTML = '<span class="photo-placeholder">写真をドロップ</span>';

    // Clear person info
    DOM.personName.value = '';
    DOM.personAccount.value = '';
    DOM.aiComment.value = '';

    updatePreview();
    showToast('次の写真の準備ができました', 'success');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// Comment Generation (Netlify Functions + Rule-Based Fallback)
// ========================================

// API URL (Netlify Functions経由)
// ローカル開発時: netlify dev で /.netlify/functions/ が利用可能
// 本番環境: /api/ が /.netlify/functions/ にリダイレクト
const API_BASE_URL = '/.netlify/functions';

/**
 * コメントを生成（FastAPI経由でGemini APIを呼び出し）
 * APIエラー時はルールベースにフォールバック
 */
async function generateComment() {
    // 入力値を取得
    const expressionType = DOM.expressionType?.value || '笑顔';
    const focusPoint = DOM.focusPoint?.value || '表情';
    const contextMatch = DOM.contextMatch?.value || 'ブースの雰囲気';
    const role = DOM.personRole?.value || 'モデル';
    const boothName = DOM.boothName?.value || 'ブース';
    const category = AppState.eventInfo?.category || 'ブース';
    const imageBase64 = AppState.photoData?.imageBase64 || null;

    console.log('Generating comment with:', { expressionType, focusPoint, contextMatch, role });

    // ボタンを無効化
    DOM.generateCommentBtn.disabled = true;
    DOM.regenerateBtn.disabled = true;
    DOM.generateCommentBtn.innerHTML = '<span class="btn-icon">⏳</span> 生成中...';

    try {
        // FastAPI バックエンドを呼び出し
        const response = await fetch(`${API_BASE_URL}/generate-comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                booth_name: boothName,
                role: role,
                category: category,
                expression_type: expressionType,
                focus_point: focusPoint,
                context_match: contextMatch,
                image_base64: imageBase64
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        DOM.aiComment.value = data.comment;
        updatePreview();

        if (data.source === 'ai') {
            showToast('AIでコメントを生成しました', 'success');
        } else {
            showToast('ルールベースでコメントを生成しました', 'success');
        }

    } catch (error) {
        console.error('API call failed:', error);

        // フォールバック: ルールベースで生成
        const comment = window.generateRuleBasedComment({
            expressionType: expressionType,
            focusPoint: focusPoint,
            contextMatch: contextMatch,
            role: role
        });

        DOM.aiComment.value = comment;
        updatePreview();
        showToast('ルールベースでコメントを生成しました（API接続エラー）', 'warning');
    } finally {
        // ボタンを再有効化
        DOM.generateCommentBtn.disabled = false;
        DOM.regenerateBtn.disabled = false;
        DOM.generateCommentBtn.innerHTML = '<span class="btn-icon">✨</span> コメント生成';
    }
}

// ========================================
// Post Template Generation
// ========================================

function generatePostTemplates() {
    const event = AppState.eventInfo;
    const boothName = DOM.boothName.value || '';
    const boothAccount = DOM.boothAccount.value || '';
    const personRole = DOM.personRole.value || 'モデル';
    const personName = DOM.personName.value || '';
    const personAccount = DOM.personAccount.value || '';
    const aiComment = DOM.aiComment.value || '';
    const hashtags = event.hashtags || '';

    // Extract main hashtag for X2
    const hashtagsArray = hashtags.split(' ').filter(h => h.startsWith('#'));
    const mainHashtag = hashtagsArray[0] || '';

    // X Account 1 (Full template)
    const x1 = `📸 ${event.eventEn} – ${event.eventJp}
${event.date}｜${event.venue}

◼︎ ${event.category}
${boothName}${boothAccount ? `（${boothAccount}）` : ''}

◼︎ ${personRole}
${personName ? `${personName} さん` : '※お名前調査中'}
${personAccount}

${aiComment}

${hashtags}`.trim();

    // X Account 2 (Simplified)
    const x2 = `📸 ${event.eventEn}
${event.date}｜${event.venue}

${boothName}
${personName ? `${personName} さん` : ''} ${personAccount}

${aiComment}

${mainHashtag}`.trim();

    // Instagram (Visual focus, more hashtags)
    const igHashtags = hashtags + ' #portrait #ポートレート #eventphoto';
    const ig = `📸 ${event.eventEn} – ${event.eventJp}

${boothName}
${personName ? `${personName} さん` : ''}

${aiComment}

${igHashtags}`.trim();

    return { x1, x2, ig };
}

function updatePreview() {
    const templates = generatePostTemplates();
    DOM.previewX1.textContent = templates.x1;
    DOM.previewX2.textContent = templates.x2;
    DOM.previewIg.textContent = templates.ig;
}

// ========================================
// Copy to Clipboard
// ========================================

async function copyToClipboard(button) {
    const targetId = button.dataset.target;
    const content = document.getElementById(targetId).textContent;

    try {
        await navigator.clipboard.writeText(content);

        // Visual feedback
        const originalText = button.textContent;
        button.textContent = '✓ コピーしました';
        button.classList.add('copied');

        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);

    } catch (error) {
        showToast('コピーに失敗しました', 'error');
    }
}

// ========================================
// Make.com Integration
// ========================================

async function sendToMake() {
    const webhookUrl = AppState.settings.makeWebhookUrl;

    if (!webhookUrl) {
        showToast('Make.com Webhook URLを設定してください', 'error');
        DOM.settingsModal.classList.add('active');
        return;
    }

    const templates = generatePostTemplates();

    const payload = {
        timestamp: new Date().toISOString(),
        event: AppState.eventInfo,
        photo: {
            name: AppState.photoData.imageFile?.name || 'unknown',
            base64: AppState.photoData.imageBase64
        },
        person: {
            name: DOM.personName.value,
            role: DOM.personRole.value,
            account: DOM.personAccount.value
        },
        booth: {
            name: DOM.boothName.value,
            account: DOM.boothAccount.value
        },
        posts: {
            x1: templates.x1,
            x2: templates.x2,
            instagram: templates.ig
        }
    };

    DOM.sendMakeBtn.disabled = true;
    DOM.sendMakeBtn.innerHTML = '⏳ 送信中...';

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast('Make.comに送信しました！', 'success');
        } else {
            throw new Error('Webhook request failed');
        }

    } catch (error) {
        console.error('Make.com error:', error);
        showToast('送信に失敗しました。Webhook URLを確認してください', 'error');
    } finally {
        DOM.sendMakeBtn.disabled = false;
        DOM.sendMakeBtn.innerHTML = '📤 Make.comへ送信';
    }
}

// ========================================
// Toast Notifications
// ========================================

function showToast(message, type = 'info') {
    DOM.toast.textContent = message;
    DOM.toast.className = `toast show ${type}`;

    setTimeout(() => {
        DOM.toast.classList.remove('show');
    }, 3000);
}

// ========================================
// Bulk Text Parser Integration
// ========================================

let currentParseResult = null;
let navigationController = null;
let dragDropManager = null;

/**
 * Opens the bulk text parser modal with parsed results
 * @param {string} text - Text to parse
 */
function openBulkParserModal(text) {
    const result = parse(text);
    currentParseResult = result;

    // Update format badge
    const formatBadge = document.getElementById('parser-format-badge');
    if (formatBadge) {
        formatBadge.textContent = result.format;
        formatBadge.className = 'edit-status-badge';
    }

    // Show warnings if any
    const warningsSection = document.getElementById('parser-warnings');
    const warningMessages = document.getElementById('parser-warning-messages');
    if (result.warnings && result.warnings.length > 0) {
        warningsSection.style.display = 'flex';
        warningMessages.innerHTML = result.warnings
            .map(w => `<p>${w}</p>`)
            .join('');
    } else {
        warningsSection.style.display = 'none';
    }

    // Render entries
    renderParserEntries(result.entries);

    // Show modal
    const modal = document.getElementById('bulk-parser-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Renders parsed entries in the preview
 * @param {Array} entries - Parsed entries
 */
function renderParserEntries(entries) {
    const container = document.getElementById('parser-entries');
    if (!container) return;

    if (entries.length === 0) {
        container.innerHTML = '<div class="queue-empty"><p>解析結果がありません</p></div>';
        return;
    }

    container.innerHTML = entries.map((entry, index) => {
        const confidenceClass = entry.confidence >= 70 ? 'high' :
            entry.confidence >= 40 ? 'medium' : 'low';
        const entryClass = entry.confidence < 50 ? 'low-confidence' : '';

        return `
            <div class="parser-entry ${entryClass}" data-index="${index}">
                <div class="parser-entry-header">
                    <span class="parser-entry-number">投稿 ${index + 1}</span>
                    <div class="parser-confidence">
                        <span>信頼度:</span>
                        <span class="confidence-badge ${confidenceClass}">${entry.confidence}%</span>
                    </div>
                </div>
                <div class="parser-entry-fields">
                    <div class="parser-field">
                        <label class="parser-field-label">ブース名</label>
                        <input type="text" 
                               class="parser-field-input ${entry.boothName && entry.confidence < 50 ? 'low-confidence' : ''}" 
                               data-field="boothName" 
                               value="${escapeHtml(entry.boothName)}"
                               placeholder="ブース名">
                    </div>
                    <div class="parser-field">
                        <label class="parser-field-label">ブース公式@</label>
                        <input type="text" 
                               class="parser-field-input" 
                               data-field="boothAccount" 
                               value="${escapeHtml(entry.boothAccount)}"
                               placeholder="@account">
                    </div>
                    <div class="parser-field">
                        <label class="parser-field-label">名前</label>
                        <input type="text" 
                               class="parser-field-input ${entry.personName && entry.confidence < 50 ? 'low-confidence' : ''}" 
                               data-field="personName" 
                               value="${escapeHtml(entry.personName)}"
                               placeholder="名前">
                    </div>
                    <div class="parser-field">
                        <label class="parser-field-label">Xアカウント</label>
                        <input type="text" 
                               class="parser-field-input ${entry.personAccount && entry.confidence < 50 ? 'low-confidence' : ''}" 
                               data-field="personAccount" 
                               value="${escapeHtml(entry.personAccount)}"
                               placeholder="@account">
                    </div>
                    <div class="parser-field">
                        <label class="parser-field-label">役割</label>
                        <select class="parser-field-input" data-field="role">
                            <option value="モデル" ${entry.role === 'モデル' ? 'selected' : ''}>モデル</option>
                            <option value="RQ" ${entry.role === 'RQ' || entry.role === 'レースクイーン' ? 'selected' : ''}>RQ</option>
                            <option value="コンパニオン" ${entry.role === 'コンパニオン' ? 'selected' : ''}>コンパニオン</option>
                            <option value="コスプレイヤー" ${entry.role === 'コスプレイヤー' ? 'selected' : ''}>コスプレイヤー</option>
                            <option value="アンバサダー" ${entry.role === 'アンバサダー' ? 'selected' : ''}>アンバサダー</option>
                        </select>
                    </div>
                </div>
                <div class="parser-raw-text">
                    <div class="parser-raw-text-label">元のテキスト:</div>
                    <div class="parser-raw-text-content">${escapeHtml(entry.rawText)}</div>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners for field changes
    container.querySelectorAll('.parser-field-input').forEach(input => {
        input.addEventListener('input', handleParserFieldChange);
    });
}

/**
 * Handles field changes in parser preview
 * @param {Event} event - Input event
 */
function handleParserFieldChange(event) {
    const input = event.target;
    const entryElement = input.closest('.parser-entry');
    const index = parseInt(entryElement.dataset.index);
    const field = input.dataset.field;
    const value = input.value;

    if (currentParseResult && currentParseResult.entries[index]) {
        currentParseResult.entries[index][field] = value;
    }
}

/**
 * Applies parsed entries to the post queue
 */
function applyParsedEntries() {
    if (!currentParseResult || !currentParseResult.entries) {
        showToast('解析結果がありません', 'error');
        return;
    }

    const entries = currentParseResult.entries;
    const availableSlots = 10 - AppState.postQueue.length;

    if (entries.length > availableSlots) {
        showToast(`キューに空きが${availableSlots}件しかありません`, 'warning');
    }

    const entriesToAdd = entries.slice(0, availableSlots);

    entriesToAdd.forEach(entry => {
        addToQueue({
            boothName: entry.boothName || '',
            boothAccount: entry.boothAccount || '',
            personName: entry.personName || '',
            personAccount: entry.personAccount || '',
            personRole: entry.role || 'モデル',
            aiComment: ''
        });
    });

    showToast(`${entriesToAdd.length}件の投稿を追加しました`, 'success');
    closeBulkParserModal();
}

/**
 * Closes the bulk parser modal
 */
function closeBulkParserModal() {
    const modal = document.getElementById('bulk-parser-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentParseResult = null;
}

/**
 * Escapes HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// Bulk Parser Event Listeners
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Close parser modal
    const closeParserBtn = document.getElementById('close-parser-modal');
    if (closeParserBtn) {
        closeParserBtn.addEventListener('click', closeBulkParserModal);
    }

    // Cancel parser
    const cancelParserBtn = document.getElementById('cancel-parser-btn');
    if (cancelParserBtn) {
        cancelParserBtn.addEventListener('click', closeBulkParserModal);
    }

    // Apply parser results
    const applyParserBtn = document.getElementById('apply-parser-btn');
    if (applyParserBtn) {
        applyParserBtn.addEventListener('click', applyParsedEntries);
    }

    // Add button to trigger bulk parser from Step 2
    // This could be added to the quick-add section or as a separate button
    const quickAddSection = document.querySelector('.quick-add-actions');
    if (quickAddSection) {
        const bulkParseBtn = document.createElement('button');
        bulkParseBtn.className = 'btn btn-ghost';
        bulkParseBtn.id = 'bulk-parse-btn';
        bulkParseBtn.innerHTML = '📋 一括テキスト入力';
        bulkParseBtn.addEventListener('click', () => {
            const text = prompt('複数の投稿情報を貼り付けてください:\n\n例:\n①\n名前: 田中花子\n@tanaka_hanako\nブース: SEGA\n\n②\n名前: 佐藤太郎\n@sato_taro\nブース: Nintendo');
            if (text) {
                openBulkParserModal(text);
            }
        });
        quickAddSection.appendChild(bulkParseBtn);
    }
});


// ========================================
// Task 14.1: Collapsible Sections
// ========================================

/**
 * Initialize collapsible sections in edit modal
 */
function initCollapsibleSections() {
    const sections = document.querySelectorAll('.collapsible-section');

    sections.forEach(section => {
        const header = section.querySelector('.section-header');
        const toggle = section.querySelector('.section-toggle');

        if (header && toggle) {
            header.addEventListener('click', () => {
                section.classList.toggle('collapsed');

                // Save collapsed state to localStorage
                const sectionName = section.dataset.section;
                const isCollapsed = section.classList.contains('collapsed');
                localStorage.setItem(`section-${sectionName}-collapsed`, isCollapsed);
            });
        }
    });

    // Restore collapsed states from localStorage
    sections.forEach(section => {
        const sectionName = section.dataset.section;
        const wasCollapsed = localStorage.getItem(`section-${sectionName}-collapsed`) === 'true';
        if (wasCollapsed) {
            section.classList.add('collapsed');
        }
    });
}

/**
 * Update completion indicators for all sections
 */
function updateCompletionIndicators() {
    // Basic info section
    const basicComplete = checkBasicInfoComplete();
    updateIndicator('basic-completion', basicComplete);

    // Person info section
    const personComplete = checkPersonInfoComplete();
    updateIndicator('person-completion', personComplete);

    // Comment section
    const commentComplete = checkCommentComplete();
    updateIndicator('comment-completion', commentComplete);
}

/**
 * Check if basic info (booth) is complete
 */
function checkBasicInfoComplete() {
    const boothName = DOM.editBoothName?.value?.trim();
    const boothAccount = DOM.editBoothAccount?.value?.trim();
    return !!(boothName && boothAccount);
}

/**
 * Check if person info is complete
 */
function checkPersonInfoComplete() {
    const personName = DOM.editPersonName?.value?.trim();
    const personAccount = DOM.editPersonAccount?.value?.trim();
    const personRole = DOM.editPersonRole?.value?.trim();
    return !!(personName && personAccount && personRole);
}

/**
 * Check if comment is complete
 */
function checkCommentComplete() {
    const comment = DOM.editAiComment?.value?.trim();
    return !!(comment && comment.length > 10);
}

/**
 * Update a single completion indicator
 */
function updateIndicator(indicatorId, isComplete) {
    const indicator = document.getElementById(indicatorId);
    if (!indicator) return;

    if (isComplete) {
        indicator.textContent = '✓';
        indicator.classList.add('complete');
        indicator.classList.remove('incomplete');
    } else {
        indicator.textContent = '○';
        indicator.classList.remove('complete');
        indicator.classList.add('incomplete');
    }
}

// ========================================
// Task 14.2: Modal Navigation (Previous/Next)
// ========================================

/**
 * Add navigation buttons to edit modal header
 */
function addModalNavigation() {
    const header = document.querySelector('.fullscreen-title');
    if (!header) return;

    // Check if navigation already exists
    if (document.querySelector('.modal-navigation')) return;

    const navContainer = document.createElement('div');
    navContainer.className = 'modal-navigation';
    navContainer.innerHTML = `
        <button class="modal-nav-btn" id="modal-prev-btn" title="前の投稿">
            ◀ 前へ
        </button>
        <span class="modal-nav-position" id="modal-nav-position"></span>
        <button class="modal-nav-btn" id="modal-next-btn" title="次の投稿">
            次へ ▶
        </button>
    `;

    header.appendChild(navContainer);

    // Add event listeners
    const prevBtn = document.getElementById('modal-prev-btn');
    const nextBtn = document.getElementById('modal-next-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateToPreviousPost();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateToNextPost();
        });
    }
}

/**
 * Navigate to previous post in queue
 */
function navigateToPreviousPost() {
    const currentIndex = AppState.currentEditIndex;
    if (currentIndex === null || currentIndex <= 0) return;

    // Auto-save current changes
    autoSaveEditModal();

    // Open previous post
    openEditModal(currentIndex - 1);
}

/**
 * Navigate to next post in queue
 */
function navigateToNextPost() {
    const currentIndex = AppState.currentEditIndex;
    if (currentIndex === null || currentIndex >= AppState.postQueue.length - 1) return;

    // Auto-save current changes
    autoSaveEditModal();

    // Open next post
    openEditModal(currentIndex + 1);
}

/**
 * Auto-save current edit modal changes without closing
 */
function autoSaveEditModal() {
    const index = AppState.currentEditIndex;
    if (index === null || index < 0) return;

    const updates = {
        boothName: DOM.editBoothName?.value || '',
        boothAccount: DOM.editBoothAccount?.value || '',
        personRole: DOM.editPersonRole?.value || 'モデル',
        personName: DOM.editPersonName?.value || '',
        personAccount: DOM.editPersonAccount?.value || '',
        aiComment: DOM.editAiComment?.value || ''
    };

    // Update without triggering full re-render
    Object.assign(AppState.postQueue[index], updates);
}

/**
 * Update modal navigation state (enable/disable buttons, show position)
 */
function updateModalNavigation() {
    const currentIndex = AppState.currentEditIndex;
    const totalPosts = AppState.postQueue.length;

    const prevBtn = document.getElementById('modal-prev-btn');
    const nextBtn = document.getElementById('modal-next-btn');
    const position = document.getElementById('modal-nav-position');

    if (!prevBtn || !nextBtn || !position) return;

    // Update position text
    if (currentIndex !== null && currentIndex >= 0) {
        position.textContent = `${currentIndex + 1} / ${totalPosts}`;
    }

    // Enable/disable buttons
    prevBtn.disabled = currentIndex === null || currentIndex <= 0;
    nextBtn.disabled = currentIndex === null || currentIndex >= totalPosts - 1;
}

// ========================================
// Task 14.3: Real-time Preview
// ========================================

/**
 * Add real-time preview to edit modal
 */
function addRealtimePreview() {
    const formSection = document.querySelector('.fullscreen-form-section');
    if (!formSection) return;

    // Check if preview already exists
    if (document.querySelector('.realtime-preview-container')) return;

    const previewContainer = document.createElement('div');
    previewContainer.className = 'realtime-preview-container';
    previewContainer.innerHTML = `
        <div class="realtime-preview-header">
            <span>👁️</span>
            <h4>リアルタイムプレビュー</h4>
        </div>
        <div class="realtime-preview-content" id="realtime-preview-text"></div>
    `;

    formSection.appendChild(previewContainer);
}

/**
 * Update real-time preview content
 */
function updateRealtimePreview() {
    const previewElement = document.getElementById('realtime-preview-text');
    if (!previewElement) return;

    const event = AppState.eventInfo;
    const boothName = DOM.editBoothName?.value || '';
    const boothAccount = DOM.editBoothAccount?.value || '';
    const personRole = DOM.editPersonRole?.value || 'モデル';
    const personName = DOM.editPersonName?.value || '';
    const personAccount = DOM.editPersonAccount?.value || '';
    const aiComment = DOM.editAiComment?.value || '';

    const preview = `📸 ${event.eventEn} – ${event.eventJp}
${event.date}｜${event.venue}

◼︎ ${event.category}
${boothName}${boothAccount ? `（${boothAccount}）` : ''}

◼︎ ${personRole}
${personName ? `${personName} さん` : '※お名前調査中'}
${personAccount}

${aiComment}

${event.hashtags}`.trim();

    previewElement.textContent = preview;
}

// ========================================
// Enhanced openEditModal with new features
// ========================================

// Store original openEditModal
const originalOpenEditModal = openEditModal;

// Override openEditModal to include new features
function openEditModal(index) {
    // Call original function
    originalOpenEditModal(index);

    // Initialize new features if not already done
    if (!document.querySelector('.modal-navigation')) {
        addModalNavigation();
    }

    if (!document.querySelector('.realtime-preview-container')) {
        addRealtimePreview();
    }

    // Update navigation state
    updateModalNavigation();

    // Update completion indicators
    updateCompletionIndicators();

    // Update real-time preview
    updateRealtimePreview();
}

// ========================================
// Initialize Task 14 features on DOMContentLoaded
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize collapsible sections
    initCollapsibleSections();

    // Add input listeners for completion indicators and real-time preview
    const editFormInputs = [
        DOM.editBoothName, DOM.editBoothAccount, DOM.editPersonRole,
        DOM.editPersonName, DOM.editPersonAccount, DOM.editAiComment
    ];

    editFormInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                updateCompletionIndicators();
                updateRealtimePreview();
            });
        }
    });
});
