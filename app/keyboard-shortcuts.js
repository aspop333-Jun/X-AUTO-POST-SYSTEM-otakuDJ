/**
 * Keyboard Shortcuts Manager
 * Handles global and modal-specific keyboard shortcuts
 */

class KeyboardShortcutsManager {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this.helpPanelVisible = false;
        this.init();
    }

    /**
     * Initialize keyboard shortcuts
     */
    init() {
        // Register global shortcuts
        this.registerGlobalShortcuts();
        
        // Register modal shortcuts
        this.registerModalShortcuts();
        
        // Set up event listener
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        console.log('[KeyboardShortcuts] Initialized');
    }

    /**
     * Register global shortcuts (Requirements 7.1, 7.2, 7.3, 7.5)
     */
    registerGlobalShortcuts() {
        // Ctrl+Shift+N: Add new empty post to queue
        this.register('Ctrl+Shift+N', {
            description: '新規投稿を追加',
            handler: () => {
                if (window.AppState && window.AppState.currentStep === 2) {
                    if (typeof window.addToQueue === 'function') {
                        window.addToQueue();
                        window.showToast('空の投稿を追加しました', 'success');
                    }
                }
            },
            global: true
        });

        // Ctrl+Shift+S: Batch send
        this.register('Ctrl+Shift+S', {
            description: '一括送信',
            handler: () => {
                if (window.AppState && window.AppState.currentStep === 2) {
                    if (typeof window.sendAllQueue === 'function') {
                        window.sendAllQueue();
                    }
                }
            },
            global: true
        });

        // Escape: Close any open modal
        this.register('Escape', {
            description: 'モーダルを閉じる',
            handler: () => {
                // Close edit modal
                const editModal = document.getElementById('edit-post-modal');
                if (editModal && editModal.classList.contains('active')) {
                    if (typeof window.closeEditModal === 'function') {
                        window.closeEditModal();
                    }
                    return;
                }

                // Close settings modal
                const settingsModal = document.getElementById('settings-modal');
                if (settingsModal && settingsModal.classList.contains('active')) {
                    settingsModal.classList.remove('active');
                    return;
                }

                // Close bulk parser modal
                const parserModal = document.getElementById('bulk-parser-modal');
                if (parserModal && parserModal.classList.contains('active')) {
                    if (typeof window.closeBulkParserModal === 'function') {
                        window.closeBulkParserModal();
                    }
                    return;
                }

                // Close batch generate modal
                const batchGenerateModal = document.getElementById('batch-generate-modal');
                if (batchGenerateModal && batchGenerateModal.classList.contains('active')) {
                    batchGenerateModal.classList.remove('active');
                    return;
                }

                // Close batch send modal
                const batchSendModal = document.getElementById('batch-send-modal');
                if (batchSendModal && batchSendModal.classList.contains('active')) {
                    batchSendModal.classList.remove('active');
                    return;
                }

                // Close help panel
                if (this.helpPanelVisible) {
                    this.hideHelpPanel();
                }
            },
            global: true
        });

        // ?: Show help panel (Requirement 7.6)
        this.register('?', {
            description: 'ショートカット一覧を表示',
            handler: () => {
                this.toggleHelpPanel();
            },
            global: true
        });
    }

    /**
     * Register modal-specific shortcuts
     */
    registerModalShortcuts() {
        // Ctrl+Enter: Save and close modal (Requirement 7.1)
        this.register('Ctrl+Enter', {
            description: '保存して閉じる',
            handler: () => {
                const editModal = document.getElementById('edit-post-modal');
                if (editModal && editModal.classList.contains('active')) {
                    if (typeof window.saveEditModal === 'function') {
                        window.saveEditModal();
                        // Close after saving
                        setTimeout(() => {
                            if (typeof window.closeEditModal === 'function') {
                                window.closeEditModal();
                            }
                        }, 100);
                    }
                }
            },
            modal: true
        });

        // Ctrl+G: Generate comment in modal (Requirement 7.4)
        this.register('Ctrl+G', {
            description: 'コメント生成',
            handler: () => {
                const editModal = document.getElementById('edit-post-modal');
                if (editModal && editModal.classList.contains('active')) {
                    const generateBtn = document.getElementById('edit-generate-comment-btn');
                    if (generateBtn) {
                        generateBtn.click();
                    }
                }
            },
            modal: true
        });
    }

    /**
     * Register a keyboard shortcut
     * @param {string} key - Key combination (e.g., 'Ctrl+S', 'Escape')
     * @param {Object} config - Configuration object
     */
    register(key, config) {
        this.shortcuts.set(key, config);
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event
     */
    handleKeyDown(event) {
        if (!this.enabled) return;

        // Build key combination string
        const key = this.getKeyString(event);

        // Check if this shortcut is registered
        const shortcut = this.shortcuts.get(key);
        if (!shortcut) return;

        // Check if we should handle this shortcut
        if (!this.shouldHandleShortcut(event, shortcut)) return;

        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();

        // Execute handler
        try {
            shortcut.handler(event);
        } catch (error) {
            console.error('[KeyboardShortcuts] Error executing shortcut:', key, error);
        }
    }

    /**
     * Get key string from event
     * @param {KeyboardEvent} event
     * @returns {string}
     */
    getKeyString(event) {
        const parts = [];

        if (event.ctrlKey) parts.push('Ctrl');
        if (event.shiftKey) parts.push('Shift');
        if (event.altKey) parts.push('Alt');
        if (event.metaKey) parts.push('Meta');

        // Add the main key
        let mainKey = event.key;

        // Normalize key names
        if (mainKey === ' ') mainKey = 'Space';
        if (mainKey === 'Escape') mainKey = 'Escape';
        if (mainKey === 'Enter') mainKey = 'Enter';

        // Don't add modifier keys as main key
        if (!['Control', 'Shift', 'Alt', 'Meta'].includes(mainKey)) {
            parts.push(mainKey);
        }

        return parts.join('+');
    }

    /**
     * Check if shortcut should be handled
     * @param {KeyboardEvent} event
     * @param {Object} shortcut
     * @returns {boolean}
     */
    shouldHandleShortcut(event, shortcut) {
        // Don't handle if typing in input/textarea (except for specific shortcuts)
        const target = event.target;
        const isInput = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable;

        // Allow Escape and Ctrl+Enter even in inputs
        const key = this.getKeyString(event);
        const allowedInInputs = ['Escape', 'Ctrl+Enter', 'Ctrl+G'];

        if (isInput && !allowedInInputs.includes(key)) {
            return false;
        }

        return true;
    }

    /**
     * Toggle help panel visibility
     */
    toggleHelpPanel() {
        if (this.helpPanelVisible) {
            this.hideHelpPanel();
        } else {
            this.showHelpPanel();
        }
    }

    /**
     * Show help panel (Requirement 7.6)
     */
    showHelpPanel() {
        // Check if help panel already exists
        let helpPanel = document.getElementById('keyboard-shortcuts-help');

        if (!helpPanel) {
            helpPanel = this.createHelpPanel();
            document.body.appendChild(helpPanel);
        }

        helpPanel.classList.add('active');
        this.helpPanelVisible = true;
    }

    /**
     * Hide help panel
     */
    hideHelpPanel() {
        const helpPanel = document.getElementById('keyboard-shortcuts-help');
        if (helpPanel) {
            helpPanel.classList.remove('active');
        }
        this.helpPanelVisible = false;
    }

    /**
     * Create help panel HTML
     * @returns {HTMLElement}
     */
    createHelpPanel() {
        const panel = document.createElement('div');
        panel.id = 'keyboard-shortcuts-help';
        panel.className = 'keyboard-shortcuts-help';

        const shortcuts = Array.from(this.shortcuts.entries());

        panel.innerHTML = `
            <div class="shortcuts-help-overlay"></div>
            <div class="shortcuts-help-content">
                <div class="shortcuts-help-header">
                    <h2>⌨️ キーボードショートカット</h2>
                    <button class="shortcuts-help-close" id="shortcuts-help-close">✕</button>
                </div>
                <div class="shortcuts-help-body">
                    <div class="shortcuts-section">
                        <h3>グローバル</h3>
                        <div class="shortcuts-list">
                            ${shortcuts
                                .filter(([_, config]) => config.global)
                                .map(([key, config]) => `
                                    <div class="shortcut-item">
                                        <kbd class="shortcut-key">${this.formatKeyForDisplay(key)}</kbd>
                                        <span class="shortcut-description">${config.description}</span>
                                    </div>
                                `)
                                .join('')}
                        </div>
                    </div>
                    <div class="shortcuts-section">
                        <h3>編集モーダル内</h3>
                        <div class="shortcuts-list">
                            ${shortcuts
                                .filter(([_, config]) => config.modal)
                                .map(([key, config]) => `
                                    <div class="shortcut-item">
                                        <kbd class="shortcut-key">${this.formatKeyForDisplay(key)}</kbd>
                                        <span class="shortcut-description">${config.description}</span>
                                    </div>
                                `)
                                .join('')}
                        </div>
                    </div>
                </div>
                <div class="shortcuts-help-footer">
                    <p>もう一度 <kbd>?</kbd> を押すか、<kbd>Escape</kbd> で閉じる</p>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = panel.querySelector('#shortcuts-help-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideHelpPanel());
        }

        const overlay = panel.querySelector('.shortcuts-help-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.hideHelpPanel());
        }

        return panel;
    }

    /**
     * Format key combination for display
     * @param {string} key
     * @returns {string}
     */
    formatKeyForDisplay(key) {
        return key
            .split('+')
            .map(part => {
                // Use symbols for common keys
                if (part === 'Ctrl') return '⌃';
                if (part === 'Shift') return '⇧';
                if (part === 'Alt') return '⌥';
                if (part === 'Meta') return '⌘';
                if (part === 'Enter') return '↵';
                if (part === 'Escape') return 'Esc';
                return part;
            })
            .join(' + ');
    }

    /**
     * Enable shortcuts
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable shortcuts
     */
    disable() {
        this.enabled = false;
    }
}

// Create global instance
const keyboardShortcuts = new KeyboardShortcutsManager();

// Export for use in other modules
export { keyboardShortcuts, KeyboardShortcutsManager };
