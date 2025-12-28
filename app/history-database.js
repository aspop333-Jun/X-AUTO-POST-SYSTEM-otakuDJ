/**
 * History Database
 * 投稿履歴を管理するローカルデータベース
 * Requirements: 10.1, 10.2, 10.3
 */

import { storageGet, storageSet } from './storage-adapter.js';

// Storage key
const HISTORY_KEY = 'autopost_history';
const MAX_HISTORY_RECORDS = 100;

/**
 * HistoryRecord の型定義
 * @typedef {Object} HistoryRecord
 * @property {string} id - 一意のID
 * @property {string} eventId - イベントID
 * @property {string} eventName - イベント名
 * @property {Object} postData - 投稿データ（imageFileを除く）
 * @property {number} sentAt - 送信タイムスタンプ
 */

/**
 * Generate unique ID
 * @returns {string}
 */
function generateHistoryId() {
    return `history_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * HistoryDatabase クラス
 * 送信成功時の自動保存、100件上限、イベント別グループ化
 */
class HistoryDatabase {
    constructor() {
        this.records = this._load();
    }

    /**
     * Load history records from localStorage
     * @private
     * @returns {Array<HistoryRecord>}
     */
    _load() {
        if (typeof storageGet === 'function') {
            const records = storageGet(HISTORY_KEY, []);
            
            // データ検証
            if (!Array.isArray(records)) {
                console.warn('[HistoryDatabase] Invalid data format, resetting to empty array');
                return [];
            }
            
            return records;
        }
        return [];
    }

    /**
     * Save history records to localStorage
     * @private
     * @returns {boolean}
     */
    _save() {
        if (typeof storageSet === 'function') {
            return storageSet(HISTORY_KEY, this.records);
        }
        return false;
    }

    /**
     * 送信成功時に投稿を履歴に保存
     * @param {Object} post - 投稿データ
     * @param {string} post.eventId - イベントID
     * @param {string} post.eventName - イベント名
     * @param {Object} post.postData - 投稿データ（imageFileを除く）
     * @returns {HistoryRecord} - 保存された履歴レコード
     */
    add(post) {
        // 必須フィールドの検証
        if (!post.eventId || !post.eventName || !post.postData) {
            throw new Error('eventId, eventName, and postData are required');
        }

        // 新規レコードを作成
        const newRecord = {
            id: generateHistoryId(),
            eventId: post.eventId,
            eventName: post.eventName,
            postData: { ...post.postData },
            sentAt: Date.now()
        };

        // 配列の先頭に追加（最新が先頭）
        this.records.unshift(newRecord);

        // MAX_HISTORY_RECORDSを超えた場合、最も古いレコードを削除
        if (this.records.length > MAX_HISTORY_RECORDS) {
            this.records = this.records.slice(0, MAX_HISTORY_RECORDS);
        }

        this._save();
        return newRecord;
    }

    /**
     * 全ての履歴レコードを取得（最新順）
     * @returns {Array<HistoryRecord>}
     */
    getAll() {
        return [...this.records];
    }

    /**
     * イベント別にグループ化された履歴を取得
     * @returns {Object} - { eventId: { eventName, records: [] } }
     */
    getGroupedByEvent() {
        const grouped = {};

        this.records.forEach(record => {
            if (!grouped[record.eventId]) {
                grouped[record.eventId] = {
                    eventName: record.eventName,
                    records: []
                };
            }
            grouped[record.eventId].records.push(record);
        });

        return grouped;
    }

    /**
     * 特定のイベントの履歴を取得
     * @param {string} eventId - イベントID
     * @returns {Array<HistoryRecord>}
     */
    getByEvent(eventId) {
        return this.records.filter(record => record.eventId === eventId);
    }

    /**
     * IDで履歴レコードを取得
     * @param {string} id - レコードID
     * @returns {HistoryRecord|null}
     */
    getById(id) {
        return this.records.find(record => record.id === id) || null;
    }

    /**
     * 履歴レコードを削除
     * @param {string} id - レコードID
     * @returns {boolean} - 削除成功時true
     */
    delete(id) {
        const initialLength = this.records.length;
        this.records = this.records.filter(record => record.id !== id);

        if (this.records.length < initialLength) {
            this._save();
            return true;
        }

        return false;
    }

    /**
     * 特定のイベントの履歴を全て削除
     * @param {string} eventId - イベントID
     * @returns {number} - 削除されたレコード数
     */
    deleteByEvent(eventId) {
        const initialLength = this.records.length;
        this.records = this.records.filter(record => record.eventId !== eventId);
        const deletedCount = initialLength - this.records.length;

        if (deletedCount > 0) {
            this._save();
        }

        return deletedCount;
    }

    /**
     * 全ての履歴をクリア
     * @returns {boolean} - 成功時true
     */
    clear() {
        this.records = [];
        return this._save();
    }

    /**
     * 履歴レコード数を取得
     * @returns {number}
     */
    count() {
        return this.records.length;
    }

    /**
     * 最新のN件の履歴を取得
     * @param {number} limit - 取得する件数
     * @returns {Array<HistoryRecord>}
     */
    getRecent(limit) {
        return this.records.slice(0, limit);
    }
}

// Export for use in other modules
export { HistoryDatabase };
