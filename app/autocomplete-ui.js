/**
 * Autocomplete UI Component
 * ドロップダウン候補リスト、キーボードナビゲーション
 * 編集モーダルへの統合
 * Requirements: 4.1, 4.2
 */

import { AutoCompleteEngine } from './autocomplete-engine.js';

/**
 * AutocompleteUI クラス
 * オートコンプリートのUI表示とインタラクションを管理
 */
class AutocompleteUI {
    /**
     * @param {AutoCompleteEngine} engine - オートコンプリートエンジン
     */
    constructor(engine) {
        if (!engine) {
            throw new Error('AutoCompleteEngine instance is required');
        }
        
        this.engine = engine;
        this.activeInput = null;
        this.dropdown = null;
        this.suggestions = [];
        this.selectedIndex = -1;
        this.debounceTimer = null;
        this.debounceDelay = 150; // ms
        
        this._createDropdown();
        this._setupEventListeners();
    }

    /**
     * ドロップダウン要素を作成
     * @private
     */
    _createDropdown() {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'autocomplete-dropdown';
        this.dropdown.style.display = 'none';
        document.body.appendChild(this.dropdown);
    }

    /**
     * グローバルイベントリスナーをセットアップ
     * @private
     */
    _setupEventListeners() {
        // ドキュメントクリックでドロップダウンを閉じる
        document.addEventListener('click', (e) => {
            if (this.dropdown && !this.dropdown.contains(e.target) && e.target !== this.activeInput) {
                this.hide();
            }
        });

        // ウィンドウリサイズ時にドロップダウン位置を更新
        window.addEventListener('resize', () => {
            if (this.dropdown.style.display !== 'none' && this.activeInput) {
                this._positionDropdown();
            }
        });
    }

    /**
     * 入力フィールドにオートコンプリートを適用
     * @param {HTMLInputElement} inputElement - 対象の入力フィールド
     * @param {'personName'|'account'|'boothName'} fieldType - フィールドタイプ
     * @param {Function} [onSelect] - 候補選択時のコールバック
     */
    attach(inputElement, fieldType, onSelect) {
        if (!inputElement || !(inputElement instanceof HTMLInputElement)) {
            console.error('[AutocompleteUI] Invalid input element');
            return;
        }

        // データ属性を設定
        inputElement.dataset.autocompleteField = fieldType;
        inputElement.dataset.autocompleteEnabled = 'true';

        // 入力イベント
        inputElement.addEventListener('input', (e) => {
            this._handleInput(e.target, fieldType, onSelect);
        });

        // キーボードイベント
        inputElement.addEventListener('keydown', (e) => {
            this._handleKeydown(e, onSelect);
        });

        // フォーカスイベント
        inputElement.addEventListener('focus', (e) => {
            if (e.target.value.trim().length > 0) {
                this._handleInput(e.target, fieldType, onSelect);
            }
        });
    }

    /**
     * 入力イベントを処理
     * @private
     * @param {HTMLInputElement} input - 入力フィールド
     * @param {string} fieldType - フィールドタイプ
     * @param {Function} onSelect - 選択時のコールバック
     */
    _handleInput(input, fieldType, onSelect) {
        const query = input.value.trim();

        // デバウンス処理
        clearTimeout(this.debounceTimer);

        if (query.length === 0) {
            this.hide();
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.activeInput = input;
            this.suggestions = this.engine.getSuggestions(fieldType, query);
            
            if (this.suggestions.length > 0) {
                this._renderSuggestions(this.suggestions, onSelect);
                this._positionDropdown();
                this.show();
            } else {
                this.hide();
            }
        }, this.debounceDelay);
    }

    /**
     * キーボードイベントを処理
     * @private
     * @param {KeyboardEvent} e - キーボードイベント
     * @param {Function} onSelect - 選択時のコールバック
     */
    _handleKeydown(e, onSelect) {
        if (this.dropdown.style.display === 'none') {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this._selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this._selectPrevious();
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
                    this._selectSuggestion(this.suggestions[this.selectedIndex], onSelect);
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.hide();
                break;
        }
    }

    /**
     * 候補リストをレンダリング
     * @private
     * @param {Array} suggestions - 候補配列
     * @param {Function} onSelect - 選択時のコールバック
     */
    _renderSuggestions(suggestions, onSelect) {
        this.dropdown.innerHTML = '';
        this.selectedIndex = -1;

        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            
            // メインラベル
            const label = document.createElement('div');
            label.className = 'autocomplete-label';
            label.textContent = suggestion.label;
            item.appendChild(label);

            // セカンダリ情報
            if (suggestion.secondary) {
                const secondary = document.createElement('div');
                secondary.className = 'autocomplete-secondary';
                secondary.textContent = suggestion.secondary;
                item.appendChild(secondary);
            }

            // 信頼度インジケーター（開発用、本番では非表示可）
            if (suggestion.confidence < 70) {
                const confidence = document.createElement('div');
                confidence.className = 'autocomplete-confidence';
                confidence.textContent = `${suggestion.confidence}%`;
                item.appendChild(confidence);
            }

            // クリックイベント
            item.addEventListener('click', () => {
                this._selectSuggestion(suggestion, onSelect);
            });

            // ホバーイベント
            item.addEventListener('mouseenter', () => {
                this._setSelectedIndex(index);
            });

            this.dropdown.appendChild(item);
        });
    }

    /**
     * ドロップダウンの位置を設定
     * @private
     */
    _positionDropdown() {
        if (!this.activeInput) return;

        const rect = this.activeInput.getBoundingClientRect();
        const dropdownHeight = this.dropdown.offsetHeight;
        const viewportHeight = window.innerHeight;

        // 入力フィールドの下に表示
        let top = rect.bottom + window.scrollY;
        
        // 画面下部に収まらない場合は上に表示
        if (rect.bottom + dropdownHeight > viewportHeight) {
            top = rect.top + window.scrollY - dropdownHeight;
        }

        this.dropdown.style.position = 'absolute';
        this.dropdown.style.left = `${rect.left + window.scrollX}px`;
        this.dropdown.style.top = `${top}px`;
        this.dropdown.style.width = `${rect.width}px`;
        this.dropdown.style.maxHeight = '300px';
    }

    /**
     * 候補を選択
     * @private
     * @param {Object} suggestion - 選択された候補
     * @param {Function} onSelect - 選択時のコールバック
     */
    _selectSuggestion(suggestion, onSelect) {
        if (!this.activeInput) return;

        // 入力フィールドに値を設定
        this.activeInput.value = suggestion.value;

        // エンジンのonSelectを呼び出して関連フィールドを取得
        const fieldValues = this.engine.onSelect(suggestion);

        // コールバックを実行
        if (onSelect && typeof onSelect === 'function') {
            onSelect(suggestion, fieldValues);
        }

        // ドロップダウンを非表示
        this.hide();

        // カスタムイベントを発火
        const event = new CustomEvent('autocomplete:select', {
            detail: { suggestion, fieldValues }
        });
        this.activeInput.dispatchEvent(event);
    }

    /**
     * 次の候補を選択
     * @private
     */
    _selectNext() {
        if (this.suggestions.length === 0) return;
        
        const newIndex = (this.selectedIndex + 1) % this.suggestions.length;
        this._setSelectedIndex(newIndex);
    }

    /**
     * 前の候補を選択
     * @private
     */
    _selectPrevious() {
        if (this.suggestions.length === 0) return;
        
        const newIndex = this.selectedIndex <= 0 
            ? this.suggestions.length - 1 
            : this.selectedIndex - 1;
        this._setSelectedIndex(newIndex);
    }

    /**
     * 選択インデックスを設定
     * @private
     * @param {number} index - 新しいインデックス
     */
    _setSelectedIndex(index) {
        // 前の選択を解除
        const items = this.dropdown.querySelectorAll('.autocomplete-item');
        items.forEach(item => item.classList.remove('selected'));

        // 新しい選択を設定
        this.selectedIndex = index;
        if (items[index]) {
            items[index].classList.add('selected');
            items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    /**
     * ドロップダウンを表示
     */
    show() {
        if (this.dropdown) {
            this.dropdown.style.display = 'block';
        }
    }

    /**
     * ドロップダウンを非表示
     */
    hide() {
        if (this.dropdown) {
            this.dropdown.style.display = 'none';
            this.selectedIndex = -1;
            this.activeInput = null;
        }
    }

    /**
     * 特定の入力フィールドからオートコンプリートを削除
     * @param {HTMLInputElement} inputElement - 対象の入力フィールド
     */
    detach(inputElement) {
        if (inputElement) {
            delete inputElement.dataset.autocompleteField;
            delete inputElement.dataset.autocompleteEnabled;
        }
    }

    /**
     * クリーンアップ
     */
    destroy() {
        if (this.dropdown && this.dropdown.parentNode) {
            this.dropdown.parentNode.removeChild(this.dropdown);
        }
        this.dropdown = null;
        this.activeInput = null;
        this.suggestions = [];
    }
}

// Export for use in other modules
export { AutocompleteUI };
