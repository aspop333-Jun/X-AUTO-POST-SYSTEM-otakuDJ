/**
 * State Manager
 * アプリケーション状態とアンドゥ履歴を管理
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6
 */

/**
 * アンドゥアクションの型定義
 * @typedef {Object} UndoAction
 * @property {string} type - アクションタイプ
 * @property {number} timestamp - タイムスタンプ
 * @property {Object} previousState - 前の状態
 * @property {Object} newState - 新しい状態
 */

/**
 * アプリケーション状態の型定義
 * @typedef {Object} AppState
 * @property {number} currentStep - 現在のステップ (1 or 2)
 * @property {Object} eventInfo - イベント情報
 * @property {Array} postQueue - 投稿キュー
 * @property {Array<number>} selectedIndices - 選択されたインデックス
 * @property {number|null} editingIndex - 編集中のインデックス
 */

class StateManager {
    constructor() {
        // アンドゥ/リドゥスタック
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoHistory = 10;

        // 状態リスナー
        this.listeners = [];

        // 自動保存タイマー
        this.autoSaveTimer = null;
        this.autoSaveInterval = 5000; // 5秒

        // 最後の保存時刻
        this.lastSaveTime = null;

        // 現在の状態（外部から注入される）
        this.currentState = null;

        // キーボードショートカットの初期化
        this.initKeyboardShortcuts();
    }

    /**
     * 現在の状態を設定
     * @param {AppState} state - アプリケーション状態
     */
    setState(state) {
        this.currentState = state;
    }

    /**
     * 現在の状態を取得
     * @returns {AppState} - 現在の状態
     */
    getState() {
        return this.currentState;
    }

    /**
     * 状態の変更を記録してアンドゥスタックに追加
     * @param {string} actionType - アクションタイプ
     * @param {Object} previousState - 前の状態
     * @param {Object} newState - 新しい状態
     */
    pushUndo(actionType, previousState, newState) {
        const action = {
            type: actionType,
            timestamp: Date.now(),
            previousState: this.deepClone(previousState),
            newState: this.deepClone(newState)
        };

        this.undoStack.push(action);

        // スタックサイズを制限
        if (this.undoStack.length > this.maxUndoHistory) {
            this.undoStack.shift();
        }

        // 新しいアクションが追加されたらリドゥスタックをクリア
        this.redoStack = [];

        console.log(`[StateManager] Pushed undo action: ${actionType}`);
    }

    /**
     * アンドゥを実行
     * @returns {boolean} - 成功時true
     */
    undo() {
        if (!this.canUndo()) {
            console.warn('[StateManager] No actions to undo');
            return false;
        }

        const action = this.undoStack.pop();
        this.redoStack.push(action);

        // 前の状態を復元
        this.restoreState(action.previousState);

        console.log(`[StateManager] Undid action: ${action.type}`);
        return true;
    }

    /**
     * リドゥを実行
     * @returns {boolean} - 成功時true
     */
    redo() {
        if (!this.canRedo()) {
            console.warn('[StateManager] No actions to redo');
            return false;
        }

        const action = this.redoStack.pop();
        this.undoStack.push(action);

        // 新しい状態を復元
        this.restoreState(action.newState);

        console.log(`[StateManager] Redid action: ${action.type}`);
        return true;
    }

    /**
     * アンドゥ可能かチェック
     * @returns {boolean}
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * リドゥ可能かチェック
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * 状態を復元
     * @param {Object} state - 復元する状態
     */
    restoreState(state) {
        if (!this.currentState) {
            console.error('[StateManager] Current state not set');
            return;
        }

        // 状態を更新
        Object.assign(this.currentState, this.deepClone(state));

        // リスナーに通知
        this.notifyListeners();
    }

    /**
     * 状態変更リスナーを登録
     * @param {Function} listener - リスナー関数
     * @returns {Function} - リスナー解除関数
     */
    subscribe(listener) {
        this.listeners.push(listener);

        // 解除関数を返す
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * 全てのリスナーに通知
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.currentState);
            } catch (error) {
                console.error('[StateManager] Listener error:', error);
            }
        });
    }

    /**
     * 自動保存を開始
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            this.save();
        }, this.autoSaveInterval);

        console.log('[StateManager] Auto-save started');
    }

    /**
     * 自動保存を停止
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        console.log('[StateManager] Auto-save stopped');
    }

    /**
     * 状態をlocalStorageに保存
     * @returns {boolean} - 成功時true
     */
    save() {
        if (!this.currentState) {
            console.warn('[StateManager] No state to save');
            return false;
        }

        try {
            const stateToSave = {
                currentStep: this.currentState.currentStep,
                eventInfo: this.currentState.eventInfo,
                postQueue: this.currentState.postQueue,
                selectedIndices: this.currentState.selectedIndices || [],
                editingIndex: this.currentState.editingIndex,
                timestamp: Date.now()
            };

            const serialized = JSON.stringify(stateToSave);
            localStorage.setItem('autopost_app_state', serialized);

            this.lastSaveTime = Date.now();
            console.log('[StateManager] State saved');

            // 保存インジケーターを表示
            this.showSaveIndicator();

            return true;
        } catch (error) {
            console.error('[StateManager] Failed to save state:', error);
            return false;
        }
    }

    /**
     * localStorageから状態を復元
     * @returns {Object|null} - 復元された状態、または null
     */
    restore() {
        try {
            const item = localStorage.getItem('autopost_app_state');

            if (!item) {
                console.log('[StateManager] No saved state found');
                return null;
            }

            const state = JSON.parse(item);

            // タイムスタンプをチェック（24時間以上古い場合は無視）
            const age = Date.now() - (state.timestamp || 0);
            const maxAge = 24 * 60 * 60 * 1000; // 24時間

            if (age > maxAge) {
                console.log('[StateManager] Saved state is too old, ignoring');
                return null;
            }

            console.log('[StateManager] State restored');
            return state;
        } catch (error) {
            console.error('[StateManager] Failed to restore state:', error);
            return null;
        }
    }

    /**
     * 保存された状態をクリア
     */
    clearSaved() {
        try {
            localStorage.removeItem('autopost_app_state');
            console.log('[StateManager] Saved state cleared');
        } catch (error) {
            console.error('[StateManager] Failed to clear saved state:', error);
        }
    }

    /**
     * 保存インジケーターを表示
     */
    showSaveIndicator() {
        // 既存のインジケーターを削除
        const existing = document.getElementById('save-indicator');
        if (existing) {
            existing.remove();
        }

        // 新しいインジケーターを作成
        const indicator = document.createElement('div');
        indicator.id = 'save-indicator';
        indicator.className = 'save-indicator';
        indicator.textContent = '✓ 保存しました';
        document.body.appendChild(indicator);

        // アニメーション後に削除
        setTimeout(() => {
            indicator.classList.add('fade-out');
            setTimeout(() => {
                indicator.remove();
            }, 300);
        }, 2000);
    }

    /**
     * キーボードショートカットを初期化
     */
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z: アンドゥ
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (this.undo()) {
                    this.showUndoRedoToast('アンドゥしました');
                }
            }

            // Ctrl+Shift+Z または Ctrl+Y: リドゥ
            if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
                e.preventDefault();
                if (this.redo()) {
                    this.showUndoRedoToast('リドゥしました');
                }
            }
        });

        console.log('[StateManager] Keyboard shortcuts initialized');
    }

    /**
     * アンドゥ/リドゥのトーストを表示
     * @param {string} message - メッセージ
     */
    showUndoRedoToast(message) {
        // showToast関数が存在する場合は使用
        if (typeof showToast === 'function') {
            showToast(message, 'info');
        } else {
            console.log(`[StateManager] ${message}`);
        }
    }

    /**
     * オブジェクトのディープクローン
     * @param {Object} obj - クローンするオブジェクト
     * @returns {Object} - クローンされたオブジェクト
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }

        if (obj instanceof Object) {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }

        return obj;
    }

    /**
     * ブラウザ終了時の処理を設定
     */
    setupBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            // 最終保存を実行
            this.save();
        });

        console.log('[StateManager] beforeunload handler set up');
    }
}

// シングルトンインスタンスをエクスポート
const stateManager = new StateManager();

// Export for use in other modules
export { StateManager, stateManager };
