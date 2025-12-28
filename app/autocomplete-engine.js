/**
 * Auto Complete Engine
 * 入力に基づく候補表示、100ms以内のレスポンス
 * 選択時の関連フィールド自動入力
 * Requirements: 4.1, 4.2
 */

import { PersonDatabase } from './person-database.js';

/**
 * Suggestion の型定義
 * @typedef {Object} Suggestion
 * @property {string} value - 候補の値
 * @property {string} label - 表示ラベル
 * @property {string} [secondary] - 補助情報（例：アカウント）
 * @property {'person'|'booth'|'history'} source - データソース
 * @property {number} confidence - 信頼度スコア（0-100）
 * @property {Object} [metadata] - 追加メタデータ
 */

/**
 * FieldValues の型定義
 * @typedef {Object} FieldValues
 * @property {string} [personName] - 人物名
 * @property {string} [personAccount] - 人物アカウント
 * @property {string} [role] - 役割
 * @property {string} [boothName] - ブース名
 * @property {string} [boothAccount] - ブースアカウント
 */

/**
 * AutoCompleteEngine クラス
 * 入力補完を提供
 */
class AutoCompleteEngine {
    /**
     * @param {PersonDatabase} personDatabase - 人物データベースのインスタンス
     */
    constructor(personDatabase) {
        if (!personDatabase) {
            throw new Error('PersonDatabase instance is required');
        }
        this.personDatabase = personDatabase;
        
        // パフォーマンス測定用
        this.lastQueryTime = 0;
    }

    /**
     * 入力に基づいて候補を取得
     * @param {'personName'|'boothName'|'account'} field - フィールドタイプ
     * @param {string} query - 検索クエリ
     * @param {number} [limit=10] - 返す候補の最大数
     * @returns {Suggestion[]} - 候補の配列
     */
    getSuggestions(field, query, limit = 10) {
        const startTime = performance.now();
        
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return [];
        }

        const normalizedQuery = query.trim();
        let suggestions = [];

        switch (field) {
            case 'personName':
                suggestions = this._getPersonNameSuggestions(normalizedQuery, limit);
                break;
            case 'account':
                suggestions = this._getAccountSuggestions(normalizedQuery, limit);
                break;
            case 'boothName':
                // ブース名の候補は将来的にTemplate Databaseから取得
                // 現時点では空配列を返す
                suggestions = [];
                break;
            default:
                console.warn(`[AutoCompleteEngine] Unknown field type: ${field}`);
                suggestions = [];
        }

        const endTime = performance.now();
        this.lastQueryTime = endTime - startTime;

        // 100ms以内のレスポンスを確認（開発時のログ）
        if (this.lastQueryTime > 100) {
            console.warn(`[AutoCompleteEngine] Query took ${this.lastQueryTime.toFixed(2)}ms (>100ms)`);
        }

        return suggestions;
    }

    /**
     * 人物名の候補を取得
     * @private
     * @param {string} query - 検索クエリ
     * @param {number} limit - 最大件数
     * @returns {Suggestion[]}
     */
    _getPersonNameSuggestions(query, limit) {
        const persons = this.personDatabase.search(query, limit);
        
        return persons.map(person => ({
            value: person.name,
            label: person.name,
            secondary: person.account ? `@${person.account}` : '',
            source: 'person',
            confidence: this._calculateConfidence(query, person.name, person.useCount),
            metadata: {
                id: person.id,
                account: person.account,
                role: person.role,
                lastUsed: person.lastUsed
            }
        }));
    }

    /**
     * アカウント名の候補を取得
     * @private
     * @param {string} query - 検索クエリ
     * @param {number} limit - 最大件数
     * @returns {Suggestion[]}
     */
    _getAccountSuggestions(query, limit) {
        // @を除去して検索
        const cleanQuery = query.replace(/^@/, '');
        const persons = this.personDatabase.search(cleanQuery, limit);
        
        return persons.map(person => ({
            value: person.account,
            label: `@${person.account}`,
            secondary: person.name,
            source: 'person',
            confidence: this._calculateConfidence(cleanQuery, person.account, person.useCount),
            metadata: {
                id: person.id,
                name: person.name,
                role: person.role,
                lastUsed: person.lastUsed
            }
        }));
    }

    /**
     * 信頼度スコアを計算
     * @private
     * @param {string} query - 検索クエリ
     * @param {string} target - 対象文字列
     * @param {number} useCount - 使用回数
     * @returns {number} - 0-100のスコア
     */
    _calculateConfidence(query, target, useCount) {
        const normalizedQuery = query.toLowerCase();
        const normalizedTarget = target.toLowerCase();
        
        // 完全一致: 100点
        if (normalizedQuery === normalizedTarget) {
            return 100;
        }
        
        // 前方一致: 80-95点
        if (normalizedTarget.startsWith(normalizedQuery)) {
            const matchRatio = normalizedQuery.length / normalizedTarget.length;
            return Math.floor(80 + matchRatio * 15);
        }
        
        // 部分一致: 50-79点
        if (normalizedTarget.includes(normalizedQuery)) {
            const matchRatio = normalizedQuery.length / normalizedTarget.length;
            const baseScore = 50 + matchRatio * 20;
            
            // 使用回数によるボーナス（最大+9点）
            const useBonus = Math.min(useCount, 10) * 0.9;
            
            return Math.floor(baseScore + useBonus);
        }
        
        // マッチしない場合: 0点
        return 0;
    }

    /**
     * 候補選択時に関連フィールドの値を返す
     * @param {Suggestion} suggestion - 選択された候補
     * @returns {FieldValues} - 自動入力するフィールド値
     */
    onSelect(suggestion) {
        if (!suggestion || !suggestion.metadata) {
            return {};
        }

        const fieldValues = {};

        // 人物データベースからの候補の場合
        if (suggestion.source === 'person') {
            if (suggestion.metadata.name) {
                fieldValues.personName = suggestion.metadata.name;
            }
            if (suggestion.metadata.account) {
                fieldValues.personAccount = suggestion.metadata.account;
            }
            if (suggestion.metadata.role) {
                fieldValues.role = suggestion.metadata.role;
            }

            // 選択された人物の使用回数と最終使用日時を更新
            if (suggestion.metadata.id) {
                this.personDatabase.update(suggestion.metadata.id, {
                    lastUsed: Date.now(),
                    useCount: (suggestion.metadata.useCount || 0) + 1
                });
            }
        }

        return fieldValues;
    }

    /**
     * 最後のクエリ実行時間を取得（パフォーマンス測定用）
     * @returns {number} - ミリ秒
     */
    getLastQueryTime() {
        return this.lastQueryTime;
    }

    /**
     * 候補を信頼度順にソート
     * @param {Suggestion[]} suggestions - 候補配列
     * @returns {Suggestion[]} - ソート済み候補配列
     */
    sortByConfidence(suggestions) {
        return [...suggestions].sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * 重複する候補を除去
     * @param {Suggestion[]} suggestions - 候補配列
     * @returns {Suggestion[]} - 重複除去済み候補配列
     */
    deduplicateSuggestions(suggestions) {
        const seen = new Set();
        return suggestions.filter(suggestion => {
            const key = `${suggestion.value}_${suggestion.source}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Export for use in other modules
export { AutoCompleteEngine };
