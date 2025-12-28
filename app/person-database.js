/**
 * Person Database
 * 人物情報を管理するローカルデータベース
 * Requirements: 4.3, 4.4, 4.5
 */

import { storageGet, storageSet } from './storage-adapter.js';

const STORAGE_KEY = 'autopost_persons';
const MAX_RECORDS = 500;

/**
 * PersonRecord の型定義
 * @typedef {Object} PersonRecord
 * @property {string} id - 一意のID
 * @property {string} name - 人物名
 * @property {string} account - アカウント名（@なし）
 * @property {string} role - 役割（モデル、RQ等）
 * @property {number} lastUsed - 最終使用タイムスタンプ
 * @property {number} useCount - 使用回数
 * @property {string[]} events - 登場したイベントIDの配列
 */

/**
 * PersonDatabase クラス
 * CRUD操作、検索、最近使用順ソートを提供
 */
class PersonDatabase {
    constructor() {
        this.records = this._loadRecords();
    }

    /**
     * localStorageからレコードを読み込み
     * @private
     * @returns {PersonRecord[]}
     */
    _loadRecords() {
        const records = storageGet(STORAGE_KEY, []);
        
        // データ検証
        if (!Array.isArray(records)) {
            console.warn('[PersonDatabase] Invalid data format, resetting to empty array');
            return [];
        }
        
        return records;
    }

    /**
     * localStorageにレコードを保存
     * @private
     * @returns {boolean}
     */
    _saveRecords() {
        return storageSet(STORAGE_KEY, this.records);
    }

    /**
     * 新しいIDを生成
     * @private
     * @returns {string}
     */
    _generateId() {
        return `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * クエリに基づいて人物を検索
     * @param {string} query - 検索クエリ（名前またはアカウント）
     * @param {number} [limit=10] - 返す結果の最大数
     * @returns {PersonRecord[]} - マッチした人物レコードの配列（最近使用順）
     */
    search(query, limit = 10) {
        if (!query || typeof query !== 'string') {
            return [];
        }

        const normalizedQuery = query.toLowerCase().trim();
        
        // 名前またはアカウントに部分一致する人物を検索
        const matches = this.records.filter(record => {
            const nameMatch = record.name.toLowerCase().includes(normalizedQuery);
            const accountMatch = record.account.toLowerCase().includes(normalizedQuery);
            return nameMatch || accountMatch;
        });

        // 最近使用順にソート（lastUsed降順）
        matches.sort((a, b) => b.lastUsed - a.lastUsed);

        return matches.slice(0, limit);
    }

    /**
     * 新しい人物を追加
     * @param {Object} person - 人物情報
     * @param {string} person.name - 人物名
     * @param {string} person.account - アカウント名
     * @param {string} person.role - 役割
     * @param {string[]} [person.events=[]] - イベントID配列
     * @returns {PersonRecord} - 追加された人物レコード
     */
    add(person) {
        // 必須フィールドの検証
        if (!person.name || !person.account) {
            throw new Error('Name and account are required');
        }

        // 既存の同一人物をチェック（名前とアカウントが完全一致）
        const existing = this.records.find(
            r => r.name === person.name && r.account === person.account
        );

        if (existing) {
            // 既存レコードを更新
            existing.role = person.role || existing.role;
            existing.lastUsed = Date.now();
            existing.useCount += 1;
            
            // イベントIDを追加（重複なし）
            if (person.events) {
                person.events.forEach(eventId => {
                    if (!existing.events.includes(eventId)) {
                        existing.events.push(eventId);
                    }
                });
            }
            
            this._saveRecords();
            return existing;
        }

        // 新規レコードを作成
        const newRecord = {
            id: this._generateId(),
            name: person.name,
            account: person.account,
            role: person.role || '',
            lastUsed: Date.now(),
            useCount: 1,
            events: person.events || []
        };

        this.records.push(newRecord);

        // MAX_RECORDSを超えた場合、最も古いレコードを削除
        if (this.records.length > MAX_RECORDS) {
            // useCountとlastUsedの組み合わせでスコアリング
            this.records.sort((a, b) => {
                const scoreA = a.useCount * 0.3 + (a.lastUsed / 1000000) * 0.7;
                const scoreB = b.useCount * 0.3 + (b.lastUsed / 1000000) * 0.7;
                return scoreA - scoreB;
            });
            
            // 最もスコアの低いレコードを削除
            this.records.shift();
        }

        this._saveRecords();
        return newRecord;
    }

    /**
     * 人物レコードを更新
     * @param {string} id - レコードID
     * @param {Partial<PersonRecord>} updates - 更新する内容
     * @returns {PersonRecord|null} - 更新されたレコード、見つからない場合null
     */
    update(id, updates) {
        const record = this.records.find(r => r.id === id);
        
        if (!record) {
            console.warn(`[PersonDatabase] Record with id "${id}" not found`);
            return null;
        }

        // 更新可能なフィールドのみ更新
        if (updates.name !== undefined) record.name = updates.name;
        if (updates.account !== undefined) record.account = updates.account;
        if (updates.role !== undefined) record.role = updates.role;
        if (updates.lastUsed !== undefined) record.lastUsed = updates.lastUsed;
        if (updates.useCount !== undefined) record.useCount = updates.useCount;
        if (updates.events !== undefined) record.events = updates.events;

        this._saveRecords();
        return record;
    }

    /**
     * 人物レコードを削除
     * @param {string} id - レコードID
     * @returns {boolean} - 削除成功時true
     */
    delete(id) {
        const initialLength = this.records.length;
        this.records = this.records.filter(r => r.id !== id);
        
        if (this.records.length < initialLength) {
            this._saveRecords();
            return true;
        }
        
        return false;
    }

    /**
     * 最近使用した人物を取得
     * @param {number} limit - 取得する件数
     * @returns {PersonRecord[]} - 最近使用順の人物レコード配列
     */
    getRecent(limit) {
        const sorted = [...this.records].sort((a, b) => b.lastUsed - a.lastUsed);
        return sorted.slice(0, limit);
    }

    /**
     * 全ての人物レコードを取得
     * @returns {PersonRecord[]} - 全レコード
     */
    getAll() {
        return [...this.records];
    }

    /**
     * IDで人物レコードを取得
     * @param {string} id - レコードID
     * @returns {PersonRecord|null} - 見つかったレコード、なければnull
     */
    getById(id) {
        return this.records.find(r => r.id === id) || null;
    }

    /**
     * データベースをクリア
     * @returns {boolean} - 成功時true
     */
    clear() {
        this.records = [];
        return this._saveRecords();
    }

    /**
     * レコード数を取得
     * @returns {number}
     */
    count() {
        return this.records.length;
    }
}

// Export for use in other modules
export { PersonDatabase };
