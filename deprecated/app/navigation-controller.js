/**
 * Navigation Controller
 * ステップ間のナビゲーションとUI状態を管理
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

/**
 * NavigationController クラス
 * ステップ間の移動、未保存変更の確認、状態保持を管理
 */
class NavigationController {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.unsavedChanges = false;
        this.savedQueueState = null;
    }

    /**
     * 現在のステップを取得
     * @returns {number} - 現在のステップ (1 or 2)
     */
    getCurrentStep() {
        const state = this.stateManager.getState();
        return state ? state.currentStep : 1;
    }

    /**
     * 指定されたステップに移動
     * @param {number} step - 移動先のステップ (1 or 2)
     * @param {Object} options - オプション
     * @param {boolean} options.preserveQueue - キューを保持するか (デフォルト: true)
     * @param {boolean} options.force - 確認ダイアログをスキップするか (デフォルト: false)
     * @returns {boolean} - 移動が成功したか
     */
    goToStep(step, options = {}) {
        const { preserveQueue = true, force = false } = options;
        const currentStep = this.getCurrentStep();

        // 同じステップへの移動は何もしない
        if (currentStep === step) {
            return true;
        }

        // Step 2 から Step 1 への移動時、未保存変更があれば確認
        if (currentStep === 2 && step === 1 && !force) {
            if (this.hasUnsavedChanges()) {
                const confirmed = this.showUnsavedChangesDialog();
                if (!confirmed) {
                    return false;
                }
            }
        }

        // Step 2 から Step 1 への移動時、キューを保存
        if (currentStep === 2 && step === 1 && preserveQueue) {
            this.saveQueueState();
        }

        // Step 1 から Step 2 への移動時、保存されたキューを復元
        if (currentStep === 1 && step === 2 && preserveQueue && this.savedQueueState) {
            this.restoreQueueState();
        }

        // ステップを更新
        this.updateStep(step);

        return true;
    }

    /**
     * 指定されたステップに移動可能かチェック
     * @param {number} to - 移動先のステップ
     * @returns {boolean} - 移動可能か
     */
    canNavigate(to) {
        const state = this.stateManager.getState();
        if (!state) return false;

        // Step 2 に移動する場合、イベント情報が必要
        if (to === 2) {
            const eventInfo = state.eventInfo;
            return !!(eventInfo && (eventInfo.eventEn || eventInfo.eventJp));
        }

        // Step 1 には常に移動可能
        return true;
    }

    /**
     * 未保存の変更があるかチェック
     * @returns {boolean} - 未保存の変更があるか
     */
    hasUnsavedChanges() {
        const state = this.stateManager.getState();
        if (!state || !state.postQueue) return false;

        // キューに下書きまたは準備完了の投稿がある場合は未保存とみなす
        return state.postQueue.some(post => 
            post.status === 'draft' || post.status === 'ready'
        );
    }

    /**
     * 未保存変更の確認ダイアログを表示
     * @returns {boolean} - ユーザーが続行を選択したか
     */
    showUnsavedChangesDialog() {
        return confirm(
            '未保存の投稿があります。\n' +
            'イベント設定画面に戻りますか？\n' +
            '（投稿キューは保持されます）'
        );
    }

    /**
     * キューの状態を保存
     */
    saveQueueState() {
        const state = this.stateManager.getState();
        if (!state) return;

        this.savedQueueState = {
            postQueue: this.deepClone(state.postQueue || []),
            selectedIndices: this.deepClone(state.selectedIndices || []),
            editingIndex: state.editingIndex
        };

        console.log('[NavigationController] Queue state saved');
    }

    /**
     * キューの状態を復元
     */
    restoreQueueState() {
        if (!this.savedQueueState) return;

        const state = this.stateManager.getState();
        if (!state) return;

        // 前の状態を保存（アンドゥ用）
        const previousState = {
            postQueue: this.deepClone(state.postQueue || []),
            selectedIndices: this.deepClone(state.selectedIndices || []),
            editingIndex: state.editingIndex
        };

        // 状態を復元
        state.postQueue = this.deepClone(this.savedQueueState.postQueue);
        state.selectedIndices = this.deepClone(this.savedQueueState.selectedIndices);
        state.editingIndex = this.savedQueueState.editingIndex;

        // アンドゥスタックに追加
        const newState = {
            postQueue: this.deepClone(state.postQueue),
            selectedIndices: this.deepClone(state.selectedIndices),
            editingIndex: state.editingIndex
        };
        this.stateManager.pushUndo('RESTORE_QUEUE', previousState, newState);

        console.log('[NavigationController] Queue state restored');
    }

    /**
     * ステップを更新してUIを反映
     * @param {number} step - 新しいステップ
     */
    updateStep(step) {
        const state = this.stateManager.getState();
        if (!state) return;

        // 前の状態を保存（アンドゥ用）
        const previousState = {
            currentStep: state.currentStep
        };

        // ステップを更新
        state.currentStep = step;

        // アンドゥスタックに追加
        const newState = {
            currentStep: state.currentStep
        };
        this.stateManager.pushUndo('CHANGE_STEP', previousState, newState);

        // UIを更新
        this.updateStepUI(step);

        // リスナーに通知
        this.stateManager.notifyListeners();

        console.log(`[NavigationController] Moved to step ${step}`);
    }

    /**
     * ステップUIを更新
     * @param {number} step - 現在のステップ
     */
    updateStepUI(step) {
        // ステップインジケーターを更新
        const step1Indicator = document.getElementById('step1-indicator');
        const step2Indicator = document.getElementById('step2-indicator');

        if (step1Indicator) {
            step1Indicator.classList.toggle('active', step === 1);
            step1Indicator.classList.toggle('completed', step > 1);
        }

        if (step2Indicator) {
            step2Indicator.classList.toggle('active', step === 2);
        }

        // パネルを更新
        const step1Panel = document.getElementById('step1-panel');
        const step2Panel = document.getElementById('step2-panel');

        if (step1Panel) {
            step1Panel.classList.toggle('active', step === 1);
        }

        if (step2Panel) {
            step2Panel.classList.toggle('active', step === 2);
        }

        // パンくずナビゲーションを更新
        this.updateBreadcrumb(step);

        // Step 2 の場合、イベントサマリーを更新
        if (step === 2) {
            this.updateEventSummary();
        }
    }

    /**
     * パンくずナビゲーションを更新
     * @param {number} currentStep - 現在のステップ
     */
    updateBreadcrumb(currentStep) {
        const breadcrumbStep1 = document.getElementById('breadcrumb-step1');
        const breadcrumbStep2 = document.getElementById('breadcrumb-step2');

        if (breadcrumbStep1) {
            breadcrumbStep1.classList.toggle('active', currentStep === 1);
            breadcrumbStep1.disabled = false; // Step 1 は常にクリック可能
        }

        if (breadcrumbStep2) {
            breadcrumbStep2.classList.toggle('active', currentStep === 2);
            // Step 2 はイベント情報がある場合のみクリック可能
            breadcrumbStep2.disabled = !this.canNavigate(2);
        }
    }

    /**
     * イベントサマリーを更新
     */
    updateEventSummary() {
        const state = this.stateManager.getState();
        if (!state || !state.eventInfo) return;

        const { eventEn, eventJp, date, venue } = state.eventInfo;

        const summaryEventName = document.getElementById('summary-event-name');
        const summaryEventMeta = document.getElementById('summary-event-meta');

        if (summaryEventName) {
            summaryEventName.textContent = `${eventEn} – ${eventJp}`;
        }

        if (summaryEventMeta) {
            summaryEventMeta.textContent = `${date}｜${venue}`;
        }
    }

    /**
     * オブジェクトのディープクローン
     * @param {*} obj - クローンするオブジェクト
     * @returns {*} - クローンされたオブジェクト
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
}

// Export for use in other modules
export { NavigationController };
