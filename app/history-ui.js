/**
 * History UI
 * 履歴パネルUIの実装
 * Requirements: 10.3, 10.4
 */

import { HistoryDatabase } from './history-database.js';

/**
 * Initialize History UI
 */
function initHistoryUI() {
    const historyBtn = document.getElementById('open-history-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryBtn = document.getElementById('close-history-modal');
    
    if (!historyBtn || !historyModal || !closeHistoryBtn) {
        console.warn('[HistoryUI] Required elements not found');
        return;
    }

    // Open history modal
    historyBtn.addEventListener('click', () => {
        openHistoryModal();
    });

    // Close history modal
    closeHistoryBtn.addEventListener('click', () => {
        historyModal.classList.remove('active');
    });

    // Close on backdrop click
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            historyModal.classList.remove('active');
        }
    });
}

/**
 * Open history modal and render history
 */
function openHistoryModal() {
    const historyModal = document.getElementById('history-modal');
    const historyDb = new HistoryDatabase();
    
    renderHistoryList(historyDb);
    historyModal.classList.add('active');
}

/**
 * Render history list grouped by event
 * @param {HistoryDatabase} historyDb
 */
function renderHistoryList(historyDb) {
    const historyList = document.getElementById('history-list');
    
    if (!historyList) {
        console.warn('[HistoryUI] history-list element not found');
        return;
    }

    const groupedHistory = historyDb.getGroupedByEvent();
    const eventIds = Object.keys(groupedHistory);

    if (eventIds.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <span class="history-empty-icon">📭</span>
                <p>履歴がありません</p>
                <p class="history-empty-hint">投稿を送信すると、ここに履歴が表示されます</p>
            </div>
        `;
        return;
    }

    // Sort events by most recent post
    eventIds.sort((a, b) => {
        const aLatest = Math.max(...groupedHistory[a].records.map(r => r.sentAt));
        const bLatest = Math.max(...groupedHistory[b].records.map(r => r.sentAt));
        return bLatest - aLatest;
    });

    let html = '';

    eventIds.forEach(eventId => {
        const eventGroup = groupedHistory[eventId];
        const records = eventGroup.records;

        html += `
            <div class="history-event-group">
                <div class="history-event-header">
                    <h3>${escapeHtml(eventGroup.eventName)}</h3>
                    <span class="history-event-count">${records.length}件</span>
                </div>
                <div class="history-items">
        `;

        records.forEach(record => {
            const postData = record.postData;
            const sentDate = new Date(record.sentAt);
            const dateStr = formatDate(sentDate);

            html += `
                <div class="history-item" data-history-id="${record.id}">
                    <div class="history-item-image">
                        ${postData.imageBase64 
                            ? `<img src="${postData.imageBase64}" alt="投稿画像">` 
                            : '<span class="photo-placeholder">📷</span>'}
                    </div>
                    <div class="history-item-content">
                        <div class="history-item-info">
                            <strong>${escapeHtml(postData.boothName || '未設定')}</strong>
                            ${postData.boothAccount ? `<span class="history-account">${escapeHtml(postData.boothAccount)}</span>` : ''}
                        </div>
                        <div class="history-item-person">
                            ${escapeHtml(postData.personName || '未設定')}
                            ${postData.personAccount ? `<span class="history-account">${escapeHtml(postData.personAccount)}</span>` : ''}
                        </div>
                        <div class="history-item-comment">
                            ${escapeHtml(postData.aiComment || '')}
                        </div>
                        <div class="history-item-meta">
                            <span class="history-date">${dateStr}</span>
                        </div>
                    </div>
                    <div class="history-item-actions">
                        <button class="btn btn-ghost btn-small history-reuse-btn" data-history-id="${record.id}">
                            🔄 再利用
                        </button>
                        <button class="btn btn-ghost btn-small history-delete-btn" data-history-id="${record.id}">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    historyList.innerHTML = html;

    // Attach event listeners
    attachHistoryEventListeners(historyDb);
}

/**
 * Attach event listeners to history items
 * @param {HistoryDatabase} historyDb
 */
function attachHistoryEventListeners(historyDb) {
    // Reuse buttons
    document.querySelectorAll('.history-reuse-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const historyId = btn.dataset.historyId;
            reuseHistoryItem(historyDb, historyId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.history-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const historyId = btn.dataset.historyId;
            deleteHistoryItem(historyDb, historyId);
        });
    });
}

/**
 * Reuse a history item by creating a new post
 * @param {HistoryDatabase} historyDb
 * @param {string} historyId
 */
function reuseHistoryItem(historyDb, historyId) {
    const record = historyDb.getById(historyId);
    
    if (!record) {
        showToast('履歴が見つかりませんでした', 'error');
        return;
    }

    // Create new post from history data
    const newPost = {
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        imageFile: null,
        imageBase64: record.postData.imageBase64 || null,
        boothName: record.postData.boothName || '',
        boothAccount: record.postData.boothAccount || '',
        personRole: record.postData.personRole || '',
        personName: record.postData.personName || '',
        personAccount: record.postData.personAccount || '',
        aiComment: record.postData.aiComment || '',
        status: 'draft',
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    // Add to queue (this assumes app.js has a global function or we dispatch an event)
    if (typeof window.addPostToQueue === 'function') {
        window.addPostToQueue(newPost);
        showToast('履歴から投稿を作成しました', 'success');
        
        // Close history modal
        const historyModal = document.getElementById('history-modal');
        if (historyModal) {
            historyModal.classList.remove('active');
        }
    } else {
        console.error('[HistoryUI] addPostToQueue function not found');
        showToast('投稿の作成に失敗しました', 'error');
    }
}

/**
 * Delete a history item
 * @param {HistoryDatabase} historyDb
 * @param {string} historyId
 */
function deleteHistoryItem(historyDb, historyId) {
    if (!confirm('この履歴を削除しますか？')) {
        return;
    }

    const success = historyDb.delete(historyId);
    
    if (success) {
        showToast('履歴を削除しました', 'success');
        renderHistoryList(historyDb);
    } else {
        showToast('履歴の削除に失敗しました', 'error');
    }
}

/**
 * Format date for display
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show toast notification
 * @param {string} message
 * @param {string} type - 'success' | 'error' | 'info'
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} active`;

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initHistoryUI,
        openHistoryModal,
        renderHistoryList
    };
}

// Initialize on DOM load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHistoryUI);
    } else {
        initHistoryUI();
    }
}
