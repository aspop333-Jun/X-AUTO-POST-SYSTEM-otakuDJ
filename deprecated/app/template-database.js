/**
 * Template Database
 * ブース・フィールドテンプレートを管理
 * Requirements: 5.1, 5.2, 5.3, 5.4, 23.1, 23.2, 23.3, 23.4, 23.5
 */

import { storageGet, storageSet } from './storage-adapter.js';

// Storage keys
const BOOTH_TEMPLATES_KEY = 'autopost_booth_templates';
const FIELD_TEMPLATES_KEY = 'autopost_field_templates';

/**
 * Generate unique ID
 * @returns {string}
 */
function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * BoothTemplate Database
 * プリセット保存、読み込み、削除、使用頻度によるソート
 */
class BoothTemplateDatabase {
    constructor() {
        this.templates = this._load();
    }

    /**
     * Load templates from localStorage
     * @private
     * @returns {Array}
     */
    _load() {
        if (typeof storageGet === 'function') {
            return storageGet(BOOTH_TEMPLATES_KEY, []);
        }
        return [];
    }

    /**
     * Save templates to localStorage
     * @private
     */
    _save() {
        if (typeof storageSet === 'function') {
            storageSet(BOOTH_TEMPLATES_KEY, this.templates);
        }
    }

    /**
     * Get all booth templates sorted by usage frequency
     * @returns {Array<BoothTemplate>}
     */
    getAll() {
        // Sort by useCount (descending), then by lastUsed (descending)
        return [...this.templates].sort((a, b) => {
            if (b.useCount !== a.useCount) {
                return b.useCount - a.useCount;
            }
            return b.lastUsed - a.lastUsed;
        });
    }

    /**
     * Get template by ID
     * @param {string} id
     * @returns {BoothTemplate|null}
     */
    getById(id) {
        return this.templates.find(t => t.id === id) || null;
    }

    /**
     * Save a new booth template
     * @param {Object} template - { name, boothName, boothAccount, category }
     * @returns {BoothTemplate}
     */
    save(template) {
        const newTemplate = {
            id: generateId(),
            name: template.name,
            boothName: template.boothName || '',
            boothAccount: template.boothAccount || '',
            category: template.category || '',
            useCount: 0,
            lastUsed: Date.now()
        };

        this.templates.push(newTemplate);
        this._save();
        return newTemplate;
    }

    /**
     * Update an existing booth template
     * @param {string} id
     * @param {Object} updates
     * @returns {BoothTemplate|null}
     */
    update(id, updates) {
        const index = this.templates.findIndex(t => t.id === id);
        if (index === -1) {
            return null;
        }

        this.templates[index] = {
            ...this.templates[index],
            ...updates,
            id // Preserve ID
        };

        this._save();
        return this.templates[index];
    }

    /**
     * Delete a booth template
     * @param {string} id
     * @returns {boolean}
     */
    delete(id) {
        const index = this.templates.findIndex(t => t.id === id);
        if (index === -1) {
            return false;
        }

        this.templates.splice(index, 1);
        this._save();
        return true;
    }

    /**
     * Increment use count and update lastUsed timestamp
     * @param {string} id
     */
    recordUsage(id) {
        const template = this.templates.find(t => t.id === id);
        if (template) {
            template.useCount++;
            template.lastUsed = Date.now();
            this._save();
        }
    }

    /**
     * Search templates by name or booth name
     * @param {string} query
     * @returns {Array<BoothTemplate>}
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(t => 
            t.name.toLowerCase().includes(lowerQuery) ||
            t.boothName.toLowerCase().includes(lowerQuery)
        );
    }
}

/**
 * FieldTemplate Database
 * カテゴリ別テンプレート、変数サポート
 */
class FieldTemplateDatabase {
    constructor() {
        this.templates = this._load();
    }

    /**
     * Load templates from localStorage
     * @private
     * @returns {Array}
     */
    _load() {
        if (typeof storageGet === 'function') {
            return storageGet(FIELD_TEMPLATES_KEY, []);
        }
        return [];
    }

    /**
     * Save templates to localStorage
     * @private
     */
    _save() {
        if (typeof storageSet === 'function') {
            storageSet(FIELD_TEMPLATES_KEY, this.templates);
        }
    }

    /**
     * Get all field templates, optionally filtered by category
     * @param {string} [category] - Optional category filter
     * @returns {Array<FieldTemplate>}
     */
    getAll(category = null) {
        let templates = [...this.templates];
        
        if (category) {
            templates = templates.filter(t => t.category === category);
        }

        // Sort by name
        return templates.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Get template by ID
     * @param {string} id
     * @returns {FieldTemplate|null}
     */
    getById(id) {
        return this.templates.find(t => t.id === id) || null;
    }

    /**
     * Save a new field template
     * @param {Object} template - { name, category, fields }
     * @returns {FieldTemplate}
     */
    save(template) {
        const newTemplate = {
            id: generateId(),
            name: template.name,
            category: template.category || '',
            fields: {
                boothName: template.fields?.boothName || '',
                boothAccount: template.fields?.boothAccount || '',
                role: template.fields?.role || '',
                personNamePattern: template.fields?.personNamePattern || ''
            }
        };

        this.templates.push(newTemplate);
        this._save();
        return newTemplate;
    }

    /**
     * Update an existing field template
     * @param {string} id
     * @param {Object} updates
     * @returns {FieldTemplate|null}
     */
    update(id, updates) {
        const index = this.templates.findIndex(t => t.id === id);
        if (index === -1) {
            return null;
        }

        this.templates[index] = {
            ...this.templates[index],
            ...updates,
            id, // Preserve ID
            fields: {
                ...this.templates[index].fields,
                ...updates.fields
            }
        };

        this._save();
        return this.templates[index];
    }

    /**
     * Delete a field template
     * @param {string} id
     * @returns {boolean}
     */
    delete(id) {
        const index = this.templates.findIndex(t => t.id === id);
        if (index === -1) {
            return false;
        }

        this.templates.splice(index, 1);
        this._save();
        return true;
    }

    /**
     * Apply template variables to a pattern
     * @param {string} pattern - Pattern with variables like {number}, {name}
     * @param {Object} variables - Variable values
     * @returns {string}
     */
    applyVariables(pattern, variables = {}) {
        if (!pattern) return '';
        
        let result = pattern;
        
        // Replace {number}, {name}, etc.
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            // Escape $ in replacement string to prevent it from being treated as special character
            const replacement = String(variables[key]).replace(/\$/g, '$$$$');
            result = result.replace(regex, replacement);
        });
        
        return result;
    }

    /**
     * Get all unique categories
     * @returns {Array<string>}
     */
    getCategories() {
        const categories = new Set(this.templates.map(t => t.category).filter(c => c));
        return Array.from(categories).sort();
    }
}

// Export for use in other modules
export { BoothTemplateDatabase, FieldTemplateDatabase };
