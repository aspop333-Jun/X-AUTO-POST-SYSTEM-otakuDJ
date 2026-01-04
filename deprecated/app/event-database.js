/**
 * Event Database
 * イベント情報の自動保存と復元を管理
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

import { storageGet, storageSet } from './storage-adapter.js';

// Storage keys
const CURRENT_EVENT_KEY = 'autopost_current_event';
const RECENT_EVENTS_KEY = 'autopost_recent_events';
const MAX_RECENT_EVENTS = 5;

/**
 * EventInfo の型定義
 * @typedef {Object} EventInfo
 * @property {string} id - 一意のID
 * @property {string} eventEn - イベント名（英語）
 * @property {string} eventJp - イベント名（日本語）
 * @property {string} date - イベント日付
 * @property {string} venue - 会場
 * @property {string} category - カテゴリ
 * @property {string} hashtags - ハッシュタグ
 * @property {number} lastUsed - 最終使用タイムスタンプ
 */

/**
 * Generate unique ID for event
 * @returns {string}
 */
function generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * EventDatabase クラス
 * イベント情報の保存、復元、最近5件の管理
 */
class EventDatabase {
    constructor() {
        this.currentEvent = this._loadCurrentEvent();
        this.recentEvents = this._loadRecentEvents();
    }

    /**
     * Load current event from localStorage
     * @private
     * @returns {EventInfo|null}
     */
    _loadCurrentEvent() {
        if (typeof storageGet === 'function') {
            const event = storageGet(CURRENT_EVENT_KEY, null);
            
            // データ検証
            if (event && typeof event === 'object' && event.id) {
                return event;
            }
        }
        return null;
    }

    /**
     * Load recent events from localStorage
     * @private
     * @returns {Array<EventInfo>}
     */
    _loadRecentEvents() {
        if (typeof storageGet === 'function') {
            const events = storageGet(RECENT_EVENTS_KEY, []);
            
            // データ検証
            if (!Array.isArray(events)) {
                console.warn('[EventDatabase] Invalid recent events format, resetting to empty array');
                return [];
            }
            
            return events;
        }
        return [];
    }

    /**
     * Save current event to localStorage
     * @private
     * @returns {boolean}
     */
    _saveCurrentEvent() {
        if (typeof storageSet === 'function') {
            return storageSet(CURRENT_EVENT_KEY, this.currentEvent);
        }
        return false;
    }

    /**
     * Save recent events to localStorage
     * @private
     * @returns {boolean}
     */
    _saveRecentEvents() {
        if (typeof storageSet === 'function') {
            return storageSet(RECENT_EVENTS_KEY, this.recentEvents);
        }
        return false;
    }

    /**
     * イベント情報を確定して保存
     * @param {Object} eventInfo - イベント情報
     * @param {string} eventInfo.eventEn - イベント名（英語）
     * @param {string} eventInfo.eventJp - イベント名（日本語）
     * @param {string} eventInfo.date - イベント日付
     * @param {string} eventInfo.venue - 会場
     * @param {string} eventInfo.category - カテゴリ
     * @param {string} eventInfo.hashtags - ハッシュタグ
     * @returns {EventInfo} - 保存されたイベント情報
     */
    saveEvent(eventInfo) {
        // 必須フィールドの検証
        if (!eventInfo.eventEn && !eventInfo.eventJp) {
            throw new Error('At least one of eventEn or eventJp is required');
        }

        // IDが既に存在する場合はそれを使用、なければ新規生成
        const eventId = eventInfo.id || generateEventId();

        // イベント情報を作成
        const event = {
            id: eventId,
            eventEn: eventInfo.eventEn || '',
            eventJp: eventInfo.eventJp || '',
            date: eventInfo.date || '',
            venue: eventInfo.venue || '',
            category: eventInfo.category || '',
            hashtags: eventInfo.hashtags || '',
            lastUsed: Date.now()
        };

        // 現在のイベントとして保存
        this.currentEvent = event;
        this._saveCurrentEvent();

        // 最近のイベントリストに追加
        this._addToRecentEvents(event);

        return event;
    }

    /**
     * 最近のイベントリストに追加
     * @private
     * @param {EventInfo} event
     */
    _addToRecentEvents(event) {
        // 既存の同じIDのイベントを削除
        this.recentEvents = this.recentEvents.filter(e => e.id !== event.id);

        // 先頭に追加
        this.recentEvents.unshift(event);

        // MAX_RECENT_EVENTSを超えた場合、最も古いものを削除
        if (this.recentEvents.length > MAX_RECENT_EVENTS) {
            this.recentEvents = this.recentEvents.slice(0, MAX_RECENT_EVENTS);
        }

        this._saveRecentEvents();
    }

    /**
     * 現在のイベント情報を取得
     * @returns {EventInfo|null}
     */
    getCurrentEvent() {
        return this.currentEvent;
    }

    /**
     * 最近使用したイベントのリストを取得
     * @returns {Array<EventInfo>} - 最近使用順のイベント配列
     */
    getRecentEvents() {
        return [...this.recentEvents];
    }

    /**
     * IDでイベントを取得（現在または最近のイベントから）
     * @param {string} id - イベントID
     * @returns {EventInfo|null}
     */
    getById(id) {
        // 現在のイベントをチェック
        if (this.currentEvent && this.currentEvent.id === id) {
            return this.currentEvent;
        }

        // 最近のイベントから検索
        return this.recentEvents.find(e => e.id === id) || null;
    }

    /**
     * イベントを切り替え（最近のイベントから選択）
     * @param {string} id - イベントID
     * @returns {EventInfo|null} - 切り替えたイベント情報、見つからない場合null
     */
    switchToEvent(id) {
        const event = this.getById(id);
        
        if (!event) {
            console.warn(`[EventDatabase] Event with id "${id}" not found`);
            return null;
        }

        // lastUsedを更新
        event.lastUsed = Date.now();

        // 現在のイベントとして設定
        this.currentEvent = event;
        this._saveCurrentEvent();

        // 最近のイベントリストを更新
        this._addToRecentEvents(event);

        return event;
    }

    /**
     * 現在のイベント情報をクリア
     * @returns {boolean} - 成功時true
     */
    clearCurrentEvent() {
        this.currentEvent = null;
        return this._saveCurrentEvent();
    }

    /**
     * 特定のイベントを最近のイベントリストから削除
     * @param {string} id - イベントID
     * @returns {boolean} - 削除成功時true
     */
    deleteRecentEvent(id) {
        const initialLength = this.recentEvents.length;
        this.recentEvents = this.recentEvents.filter(e => e.id !== id);

        if (this.recentEvents.length < initialLength) {
            // 削除したイベントが現在のイベントだった場合、クリア
            if (this.currentEvent && this.currentEvent.id === id) {
                this.clearCurrentEvent();
            }

            this._saveRecentEvents();
            return true;
        }

        return false;
    }

    /**
     * 全てのイベント情報をクリア
     * @returns {boolean} - 成功時true
     */
    clearAll() {
        this.currentEvent = null;
        this.recentEvents = [];
        
        const currentSaved = this._saveCurrentEvent();
        const recentSaved = this._saveRecentEvents();
        
        return currentSaved && recentSaved;
    }

    /**
     * アプリケーション起動時に最後のイベント情報を復元
     * @returns {EventInfo|null} - 復元されたイベント情報、なければnull
     */
    restoreLastEvent() {
        return this.getCurrentEvent();
    }

    /**
     * イベント情報が有効かチェック
     * @param {EventInfo|null} event - チェックするイベント情報
     * @returns {boolean} - 有効な場合true
     */
    isValidEvent(event) {
        if (!event || typeof event !== 'object') {
            return false;
        }

        // 少なくともイベント名（英語または日本語）が必要
        return !!(event.eventEn || event.eventJp);
    }
}

// Export for use in other modules
export { EventDatabase };
