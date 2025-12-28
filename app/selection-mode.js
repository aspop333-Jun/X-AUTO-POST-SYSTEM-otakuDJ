/**
 * Selection Mode Manager
 * 一括編集モードの管理
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5
 */

class SelectionModeManager {
    constructor() {
        this.isSelectionMode = false;
        this.selectedIndices = new Set();
        this.bulkActionBar = null;
        this.selectModeToggle = null;
    }

    /**
     * Initialize selection mode UI
     */
    initialize() {
        this.createSelectModeToggle();
        this.createBulkActionBar();
        this.attachEventListeners();
    }

    /**
     * Create the "Select Mode" toggle button in queue header
     */
    createSelectModeToggle() {
        const queueHeader = document.querySelector('.queue-header');
        if (!queueHeader) return;

        // Check if toggle already exists
        if (document.getElementById('select-mode-toggle')) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'select-mode-toggle';
        toggleBtn.className = 'btn btn-ghost btn-small';
        toggleBtn.innerHTML = '☑️ 選択モード';
        toggleBtn.title = '複数選択して一括操作';

        // Insert before the queue actions
        const queueActions = queueHeader.querySelector('.queue-actions-header');
        if (queueActions) {
            queueActions.insertBefore(toggleBtn, queueActions.firstChild);
        } else {
            queueHeader.appendChild(toggleBtn);
        }

        this.selectModeToggle = toggleBtn;
    }

    /**
     * Create the bulk action bar (hidden by default)
     */
    createBulkActionBar() {
        // Check if bar already exists
        if (document.getElementById('bulk-action-bar')) return;

        const bar = document.createElement('div');
        bar.id = 'bulk-action-bar';
        bar.className = 'bulk-action-bar';
        bar.style.display = 'none';

        bar.innerHTML = `
            <div class="bulk-action-info">
                <span id="bulk-selected-count">0</span> 件選択中
            </div>
            <div class="bulk-action-buttons">
                <button class="btn btn-ghost btn-small" id="bulk-apply-booth-btn">
                    🏢 ブース適用
                </button>
                <button class="btn btn-ghost btn-small" id="bulk-apply-role-btn">
                    👤 役割適用
                </button>
                <button class="btn btn-ghost btn-small" id="bulk-generate-comments-btn">
                    ✨ コメント生成
                </button>
                <button class="btn btn-danger btn-small" id="bulk-delete-btn">
                    🗑️ 削除
                </button>
            </div>
        `;

        // Insert after queue header
        const queueSection = document.querySelector('.post-queue-section');
        const queueContainer = document.getElementById('post-queue');
        if (queueSection && queueContainer) {
            queueSection.insertBefore(bar, queueContainer);
        }

        this.bulkActionBar = bar;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Toggle selection mode
        if (this.selectModeToggle) {
            this.selectModeToggle.addEventListener('click', () => {
                this.toggleSelectionMode();
            });
        }

        // Bulk action buttons
        const bulkApplyBoothBtn = document.getElementById('bulk-apply-booth-btn');
        const bulkApplyRoleBtn = document.getElementById('bulk-apply-role-btn');
        const bulkGenerateCommentsBtn = document.getElementById('bulk-generate-comments-btn');
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

        if (bulkApplyBoothBtn) {
            bulkApplyBoothBtn.addEventListener('click', () => this.handleBulkApplyBooth());
        }

        if (bulkApplyRoleBtn) {
            bulkApplyRoleBtn.addEventListener('click', () => this.handleBulkApplyRole());
        }

        if (bulkGenerateCommentsBtn) {
            bulkGenerateCommentsBtn.addEventListener('click', () => this.handleBulkGenerateComments());
        }

        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => this.handleBulkDelete());
        }
    }

    /**
     * Toggle selection mode on/off
     */
    toggleSelectionMode() {
        this.isSelectionMode = !this.isSelectionMode;

        if (this.isSelectionMode) {
            this.enterSelectionMode();
        } else {
            this.exitSelectionMode();
        }
    }

    /**
     * Enter selection mode
     */
    enterSelectionMode() {
        this.isSelectionMode = true;
        this.selectedIndices.clear();

        // Update toggle button
        if (this.selectModeToggle) {
            this.selectModeToggle.classList.add('active');
            this.selectModeToggle.innerHTML = '✖️ 選択解除';
        }

        // Show bulk action bar
        if (this.bulkActionBar) {
            this.bulkActionBar.style.display = 'flex';
        }

        // Re-render queue to show checkboxes
        if (typeof window.renderPostQueue === 'function') {
            window.renderPostQueue();
        }

        this.updateBulkActionBar();
    }

    /**
     * Exit selection mode
     */
    exitSelectionMode() {
        this.isSelectionMode = false;
        this.selectedIndices.clear();

        // Update toggle button
        if (this.selectModeToggle) {
            this.selectModeToggle.classList.remove('active');
            this.selectModeToggle.innerHTML = '☑️ 選択モード';
        }

        // Hide bulk action bar
        if (this.bulkActionBar) {
            this.bulkActionBar.style.display = 'none';
        }

        // Re-render queue to hide checkboxes
        if (typeof window.renderPostQueue === 'function') {
            window.renderPostQueue();
        }
    }

    /**
     * Toggle selection for a specific index
     */
    toggleSelection(index) {
        if (this.selectedIndices.has(index)) {
            this.selectedIndices.delete(index);
        } else {
            this.selectedIndices.add(index);
        }

        this.updateBulkActionBar();
        this.updateCheckboxUI(index);
    }

    /**
     * Check if an index is selected
     */
    isSelected(index) {
        return this.selectedIndices.has(index);
    }

    /**
     * Update the bulk action bar with selected count
     */
    updateBulkActionBar() {
        const countElement = document.getElementById('bulk-selected-count');
        if (countElement) {
            countElement.textContent = this.selectedIndices.size;
        }

        // Enable/disable bulk action buttons based on selection
        const buttons = this.bulkActionBar?.querySelectorAll('button');
        if (buttons) {
            buttons.forEach(btn => {
                btn.disabled = this.selectedIndices.size === 0;
            });
        }
    }

    /**
     * Update checkbox UI for a specific item
     */
    updateCheckboxUI(index) {
        const queueItem = document.querySelector(`.queue-item[data-index="${index}"]`);
        if (!queueItem) return;

        const checkbox = queueItem.querySelector('.queue-checkbox input');
        if (checkbox) {
            checkbox.checked = this.isSelected(index);
        }
    }

    /**
     * Get array of selected indices
     */
    getSelectedIndices() {
        return Array.from(this.selectedIndices).sort((a, b) => a - b);
    }

    /**
     * Handle bulk apply booth
     */
    handleBulkApplyBooth() {
        if (this.selectedIndices.size === 0) {
            window.showToast('投稿を選択してください', 'warning');
            return;
        }

        // Prompt for booth info
        const boothName = prompt('ブース名を入力してください:');
        if (!boothName) return;

        const boothAccount = prompt('ブースアカウントを入力してください (オプション):');

        const indices = this.getSelectedIndices();
        const confirmMsg = `${indices.length}件の投稿にブース情報を適用しますか？\n\nブース名: ${boothName}\nアカウント: ${boothAccount || '(なし)'}`;

        if (!confirm(confirmMsg)) return;

        // Apply to selected items
        indices.forEach(index => {
            if (window.AppState && window.AppState.postQueue[index]) {
                window.updateQueueItem(index, {
                    boothName: boothName,
                    boothAccount: boothAccount || ''
                });
            }
        });

        window.showToast(`${indices.length}件にブース情報を適用しました`, 'success');
        this.exitSelectionMode();
    }

    /**
     * Handle bulk apply role
     */
    handleBulkApplyRole() {
        if (this.selectedIndices.size === 0) {
            window.showToast('投稿を選択してください', 'warning');
            return;
        }

        // Prompt for role
        const role = prompt('役割を入力してください (例: モデル, RQ, コンパニオン):');
        if (!role) return;

        const indices = this.getSelectedIndices();
        const confirmMsg = `${indices.length}件の投稿に役割「${role}」を適用しますか？`;

        if (!confirm(confirmMsg)) return;

        // Apply to selected items
        indices.forEach(index => {
            if (window.AppState && window.AppState.postQueue[index]) {
                window.updateQueueItem(index, {
                    personRole: role
                });
            }
        });

        window.showToast(`${indices.length}件に役割を適用しました`, 'success');
        this.exitSelectionMode();
    }

    /**
     * Handle bulk generate comments
     */
    async handleBulkGenerateComments() {
        if (this.selectedIndices.size === 0) {
            window.showToast('投稿を選択してください', 'warning');
            return;
        }

        const indices = this.getSelectedIndices();

        if (!confirm(`${indices.length}件の投稿のコメントを生成しますか？`)) {
            return;
        }

        // Use batch processor if available
        if (window.batchProcessor) {
            window.batchProcessor.generateComments(indices, (progress) => {
                // Progress callback handled by batch processor modal
            });
        } else {
            window.showToast('バッチ処理機能が利用できません', 'error');
        }

        this.exitSelectionMode();
    }

    /**
     * Handle bulk delete
     */
    handleBulkDelete() {
        if (this.selectedIndices.size === 0) {
            window.showToast('投稿を選択してください', 'warning');
            return;
        }

        const indices = this.getSelectedIndices();

        if (!confirm(`${indices.length}件の投稿を削除しますか？この操作は取り消せません。`)) {
            return;
        }

        // Delete in reverse order to maintain indices
        indices.reverse().forEach(index => {
            if (window.removeFromQueue) {
                window.removeFromQueue(index);
            }
        });

        window.showToast(`${indices.length}件を削除しました`, 'success');
        this.exitSelectionMode();
    }

    /**
     * Initialize checkboxes for queue items
     */
    initializeQueueItem(queueItem, index) {
        if (!this.isSelectionMode) return;

        // Add checkbox if not already present
        let checkboxContainer = queueItem.querySelector('.queue-checkbox');
        if (!checkboxContainer) {
            checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'queue-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.isSelected(index);

            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleSelection(index);
            });

            checkboxContainer.appendChild(checkbox);

            // Insert at the beginning of queue item
            queueItem.insertBefore(checkboxContainer, queueItem.firstChild);
        }
    }
}

// Create global instance
window.selectionModeManager = new SelectionModeManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.selectionModeManager.initialize();
    });
} else {
    window.selectionModeManager.initialize();
}
