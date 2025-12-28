/**
 * LocalStorage Adapter
 * localStorage操作のラッパー関数を提供
 * JSON シリアライズ/デシリアライズ、エラーハンドリングを含む
 */

/**
 * localStorageにデータを保存
 * @param {string} key - 保存キー
 * @param {any} value - 保存する値（自動的にJSONシリアライズされる）
 * @returns {boolean} - 成功時true、失敗時false
 */
function storageSet(key, value) {
    try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        console.error(`[StorageAdapter] Failed to set key "${key}":`, error);
        
        // QuotaExceededError の場合は特別な処理
        if (error.name === 'QuotaExceededError') {
            console.warn('[StorageAdapter] localStorage quota exceeded');
        }
        
        return false;
    }
}

/**
 * localStorageからデータを取得
 * @param {string} key - 取得キー
 * @param {any} defaultValue - キーが存在しない場合のデフォルト値
 * @returns {any} - デシリアライズされた値、またはデフォルト値
 */
function storageGet(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        
        if (item === null) {
            return defaultValue;
        }
        
        return JSON.parse(item);
    } catch (error) {
        console.error(`[StorageAdapter] Failed to get key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * localStorageからデータを削除
 * @param {string} key - 削除キー
 * @returns {boolean} - 成功時true、失敗時false
 */
function storageRemove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`[StorageAdapter] Failed to remove key "${key}":`, error);
        return false;
    }
}

/**
 * localStorageをクリア
 * @returns {boolean} - 成功時true、失敗時false
 */
function storageClear() {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('[StorageAdapter] Failed to clear storage:', error);
        return false;
    }
}

/**
 * 指定されたキーが存在するかチェック
 * @param {string} key - チェックするキー
 * @returns {boolean} - 存在する場合true
 */
function storageHas(key) {
    try {
        return localStorage.getItem(key) !== null;
    } catch (error) {
        console.error(`[StorageAdapter] Failed to check key "${key}":`, error);
        return false;
    }
}

/**
 * 全てのキーを取得
 * @returns {string[]} - キーの配列
 */
function storageKeys() {
    try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key !== null) {
                keys.push(key);
            }
        }
        return keys;
    } catch (error) {
        console.error('[StorageAdapter] Failed to get keys:', error);
        return [];
    }
}

/**
 * localStorage の使用可能容量をチェック
 * @returns {Object} - { available: boolean, used: number, total: number }
 */
function storageCheckQuota() {
    try {
        // 概算の使用量を計算
        let used = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                used += localStorage[key].length + key.length;
            }
        }
        
        // 一般的なlocalStorageの制限は5MB
        const total = 5 * 1024 * 1024; // 5MB in bytes
        const available = used < total * 0.9; // 90%以下なら利用可能
        
        return {
            available,
            used,
            total,
            percentage: (used / total * 100).toFixed(2)
        };
    } catch (error) {
        console.error('[StorageAdapter] Failed to check quota:', error);
        return {
            available: false,
            used: 0,
            total: 0,
            percentage: 0
        };
    }
}

// Export functions for use in other modules
export {
    storageSet,
    storageGet,
    storageRemove,
    storageClear,
    storageHas,
    storageKeys,
    storageCheckQuota
};
