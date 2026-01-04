/**
 * Batch UI
 * バッチ処理のUI統合
 * Requirements: 6.1, 6.2, 6.3, 6.4, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { batchProcessor } from './batch-processor.js';

/**
 * バッチコメント生成モーダルを開く
 */
export function openBatchGenerateModal() {
    // 未送信の投稿を取得
    const unsentIndices = window.AppState.postQueue
        .map((post, index) => ({ post, index }))
        .filter(({ post }) => !post.aiComment || post.aiComment.trim() === '')
        .map(({ index }) => index);

    if (unsentIndices.length === 0) {
        if (typeof window.showToast === 'function') {
            window.showToast('全ての投稿にコメントが設定されています', 'info');
        }
        return;
    }

    // 確認ダイアログ
    const confirmed = confirm(`${unsentIndices.length}件の投稿のコメントを生成しますか？`);
    if (!confirmed) return;

    // モーダルを表示
    showBatchProgressModal('コメント生成中...', unsentIndices.length);

    // バッチ処理を開始
    batchProcessor.generateComments(
        unsentIndices,
        (progress) => {
            updateBatchProgress(progress);
        },
        {
            expressionType: '笑顔',
            focusPoint: '表情',
            contextMatch: 'ブースの雰囲気'
        }
    ).then((result) => {
        // 完了
        showBatchResult('コメント生成完了', result);
    }).catch((error) => {
        console.error('[BatchUI] Generate comments error:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('コメント生成中にエラーが発生しました', 'error');
        }
        closeBatchProgressModal();
    });
}

/**
 * バッチ送信モーダルを開く
 */
export function openBatchSendModal() {
    // 未送信の投稿を取得
    const unsentIndices = window.AppState.postQueue
        .map((post, index) => ({ post, index }))
        .filter(({ post }) => post.status !== 'sent')
        .map(({ index }) => index);

    if (unsentIndices.length === 0) {
        if (typeof window.showToast === 'function') {
            window.showToast('送信する投稿がありません', 'info');
        }
        return;
    }

    // 確認ダイアログ
    const confirmed = confirm(`${unsentIndices.length}件の投稿を送信しますか？`);
    if (!confirmed) return;

    // モーダルを表示
    showBatchProgressModal('一括送信中...', unsentIndices.length);

    // バッチ処理を開始
    batchProcessor.sendPosts(
        unsentIndices,
        (progress) => {
            updateBatchProgress(progress);
        }
    ).then((result) => {
        // 完了
        showBatchResult('一括送信完了', result);
    }).catch((error) => {
        console.error('[BatchUI] Batch send error:', error);
        if (typeof window.showToast === 'function') {
            window.showToast(error.message || '送信中にエラーが発生しました', 'error');
        }
        closeBatchProgressModal();
    });
}

/**
 * 一括ブース適用ダイアログを開く
 */
export function openBulkApplyBoothDialog() {
    // 現在編集中の投稿からブース情報を取得
    const currentIndex = window.AppState.currentEditIndex;
    if (currentIndex === null || currentIndex < 0) {
        if (typeof window.showToast === 'function') {
            window.showToast('編集中の投稿がありません', 'error');
        }
        return;
    }

    const currentPost = window.AppState.postQueue[currentIndex];
    if (!currentPost) return;

    const boothName = currentPost.boothName || '';
    const boothAccount = currentPost.boothAccount || '';

    if (!boothName && !boothAccount) {
        if (typeof window.showToast === 'function') {
            window.showToast('ブース情報が設定されていません', 'error');
        }
        return;
    }

    // 確認ダイアログ
    const message = `以下のブース情報を全ての投稿に適用しますか？\n\nブース名: ${boothName}\nアカウント: ${boothAccount}`;
    const confirmed = confirm(message);
    if (!confirmed) return;

    // 一括適用
    try {
        const count = batchProcessor.applyToAll('booth', {
            boothName,
            boothAccount
        });

        if (typeof window.showToast === 'function') {
            window.showToast(`${count}件の投稿にブース情報を適用しました`, 'success');
        }
    } catch (error) {
        console.error('[BatchUI] Bulk apply error:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('一括適用中にエラーが発生しました', 'error');
        }
    }
}

/**
 * バッチ進捗モーダルを表示
 * @param {string} title - タイトル
 * @param {number} total - 総数
 */
function showBatchProgressModal(title, total) {
    const modal = document.getElementById('batch-progress-modal');
    const titleEl = document.getElementById('batch-progress-title');
    const progressText = document.getElementById('batch-progress-text');
    const successCount = document.getElementById('batch-success-count');
    const failedCount = document.getElementById('batch-failed-count');
    const progressBar = document.getElementById('batch-progress-bar');
    const currentItem = document.getElementById('batch-current-item');
    const errorsSection = document.getElementById('batch-errors');
    const cancelBtn = document.getElementById('batch-cancel-btn');
    const closeBtn = document.getElementById('batch-close-btn');

    if (!modal) return;

    // 初期化
    if (titleEl) titleEl.textContent = title;
    if (progressText) progressText.textContent = `0 / ${total}`;
    if (successCount) successCount.textContent = '0';
    if (failedCount) failedCount.textContent = '0';
    if (progressBar) progressBar.style.width = '0%';
    if (currentItem) currentItem.textContent = '';
    if (errorsSection) errorsSection.style.display = 'none';
    if (cancelBtn) {
        cancelBtn.style.display = 'block';
        cancelBtn.disabled = false;
    }
    if (closeBtn) closeBtn.style.display = 'none';

    // モーダルを表示
    modal.classList.add('active');
}

/**
 * バッチ進捗を更新
 * @param {Object} progress - 進捗情報
 */
function updateBatchProgress(progress) {
    const progressText = document.getElementById('batch-progress-text');
    const successCount = document.getElementById('batch-success-count');
    const failedCount = document.getElementById('batch-failed-count');
    const progressBar = document.getElementById('batch-progress-bar');
    const currentItem = document.getElementById('batch-current-item');

    const completed = progress.completed;
    const total = progress.total;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    if (progressText) progressText.textContent = `${completed} / ${total}`;
    if (successCount) successCount.textContent = (completed - progress.failed).toString();
    if (failedCount) failedCount.textContent = progress.failed.toString();
    if (progressBar) progressBar.style.width = `${percentage}%`;

    if (currentItem) {
        if (progress.current >= 0) {
            const QUEUE_NUMBER_EMOJIS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
            currentItem.textContent = `処理中: ${QUEUE_NUMBER_EMOJIS[progress.current] || progress.current + 1}`;
        } else {
            currentItem.textContent = '';
        }
    }
}

/**
 * バッチ結果を表示
 * @param {string} title - タイトル
 * @param {Object} result - 結果
 */
function showBatchResult(title, result) {
    const titleEl = document.getElementById('batch-progress-title');
    const currentItem = document.getElementById('batch-current-item');
    const errorsSection = document.getElementById('batch-errors');
    const errorList = document.getElementById('batch-error-list');
    const cancelBtn = document.getElementById('batch-cancel-btn');
    const closeBtn = document.getElementById('batch-close-btn');

    if (titleEl) titleEl.textContent = title;
    if (currentItem) currentItem.textContent = `成功: ${result.success}件、失敗: ${result.failed}件`;

    // エラーがある場合は表示
    if (result.errors && result.errors.length > 0) {
        if (errorsSection) errorsSection.style.display = 'block';
        if (errorList) {
            errorList.innerHTML = result.errors
                .map(err => {
                    const QUEUE_NUMBER_EMOJIS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
                    const label = QUEUE_NUMBER_EMOJIS[err.index] || `投稿 ${err.index + 1}`;
                    return `<li>${label}: ${err.error}</li>`;
                })
                .join('');
        }
    }

    // ボタンを切り替え
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'block';

    // トーストを表示
    if (typeof window.showToast === 'function') {
        if (result.failed === 0) {
            window.showToast(`${title}: ${result.success}件完了`, 'success');
        } else {
            window.showToast(`${title}: ${result.success}件成功、${result.failed}件失敗`, 'warning');
        }
    }
}

/**
 * バッチ進捗モーダルを閉じる
 */
function closeBatchProgressModal() {
    const modal = document.getElementById('batch-progress-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * イベントリスナーを初期化
 */
export function initBatchUI() {
    // キャンセルボタン
    const cancelBtn = document.getElementById('batch-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            batchProcessor.cancel();
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'キャンセル中...';
        });
    }

    // 閉じるボタン
    const closeBtn = document.getElementById('batch-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeBatchProgressModal);
    }

    // モーダル背景クリック
    const modal = document.getElementById('batch-progress-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && !batchProcessor.canCancel()) {
                closeBatchProgressModal();
            }
        });
    }

    console.log('[BatchUI] Initialized');
}

// グローバルに公開
if (typeof window !== 'undefined') {
    window.openBatchGenerateModal = openBatchGenerateModal;
    window.openBatchSendModal = openBatchSendModal;
    window.openBulkApplyBoothDialog = openBulkApplyBoothDialog;
}
