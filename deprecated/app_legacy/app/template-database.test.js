/**
 * Template Database Property-Based Tests
 * Feature: photo-posting-speedup
 * Property 10: Template CRUD Consistency
 * Validates: Requirements 5.1, 5.5, 23.1, 23.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { BoothTemplateDatabase, FieldTemplateDatabase } from './template-database.js';

// Mock localStorage for testing
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

global.localStorage = localStorageMock;

// Mock storage adapter
const mockStorageAdapter = {
    storageGet: (key, defaultValue) => {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    },
    storageSet: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    }
};

// Inject mock into module
global.storageGet = mockStorageAdapter.storageGet;
global.storageSet = mockStorageAdapter.storageSet;

describe('Template Database - Property-Based Tests', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('Property 10: Template CRUD Consistency', () => {
        /**
         * Feature: photo-posting-speedup, Property 10: Template CRUD Consistency
         * For any BoothTemplate or FieldTemplate, saving it and then retrieving all templates
         * SHALL include the saved template with matching fields.
         */
        it('should maintain CRUD consistency for BoothTemplate', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        boothName: fc.string({ maxLength: 100 }),
                        boothAccount: fc.string({ maxLength: 50 }),
                        category: fc.oneof(
                            fc.constant('TGS'),
                            fc.constant('レース'),
                            fc.constant('展示会'),
                            fc.constant(''),
                        )
                    }),
                    (templateData) => {
                        const db = new BoothTemplateDatabase();
                        
                        // Save template
                        const saved = db.save(templateData);
                        
                        // Retrieve all templates
                        const allTemplates = db.getAll();
                        
                        // Find the saved template
                        const found = allTemplates.find(t => t.id === saved.id);
                        
                        // Assert: Template should exist with matching fields
                        expect(found).toBeDefined();
                        expect(found.name).toBe(templateData.name);
                        expect(found.boothName).toBe(templateData.boothName);
                        expect(found.boothAccount).toBe(templateData.boothAccount);
                        expect(found.category).toBe(templateData.category);
                        expect(found.useCount).toBe(0);
                        expect(found.lastUsed).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should maintain CRUD consistency for FieldTemplate', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        category: fc.oneof(
                            fc.constant('TGS'),
                            fc.constant('レース'),
                            fc.constant('展示会'),
                            fc.constant(''),
                        ),
                        fields: fc.record({
                            boothName: fc.string({ maxLength: 100 }),
                            boothAccount: fc.string({ maxLength: 50 }),
                            role: fc.oneof(
                                fc.constant('モデル'),
                                fc.constant('RQ'),
                                fc.constant('コンパニオン'),
                                fc.constant(''),
                            ),
                            personNamePattern: fc.string({ maxLength: 50 })
                        })
                    }),
                    (templateData) => {
                        const db = new FieldTemplateDatabase();
                        
                        // Save template
                        const saved = db.save(templateData);
                        
                        // Retrieve all templates
                        const allTemplates = db.getAll();
                        
                        // Find the saved template
                        const found = allTemplates.find(t => t.id === saved.id);
                        
                        // Assert: Template should exist with matching fields
                        expect(found).toBeDefined();
                        expect(found.name).toBe(templateData.name);
                        expect(found.category).toBe(templateData.category);
                        expect(found.fields.boothName).toBe(templateData.fields.boothName);
                        expect(found.fields.boothAccount).toBe(templateData.fields.boothAccount);
                        expect(found.fields.role).toBe(templateData.fields.role);
                        expect(found.fields.personNamePattern).toBe(templateData.fields.personNamePattern);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should persist BoothTemplate after simulated reload', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        boothName: fc.string({ maxLength: 100 }),
                        boothAccount: fc.string({ maxLength: 50 }),
                        category: fc.string({ maxLength: 20 })
                    }),
                    (templateData) => {
                        // Create first instance and save
                        const db1 = new BoothTemplateDatabase();
                        const saved = db1.save(templateData);
                        
                        // Simulate page reload by creating new instance
                        const db2 = new BoothTemplateDatabase();
                        const retrieved = db2.getById(saved.id);
                        
                        // Assert: Template should persist with matching fields
                        expect(retrieved).toBeDefined();
                        expect(retrieved.name).toBe(templateData.name);
                        expect(retrieved.boothName).toBe(templateData.boothName);
                        expect(retrieved.boothAccount).toBe(templateData.boothAccount);
                        expect(retrieved.category).toBe(templateData.category);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should delete BoothTemplate correctly', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        boothName: fc.string({ maxLength: 100 }),
                        boothAccount: fc.string({ maxLength: 50 }),
                        category: fc.string({ maxLength: 20 })
                    }),
                    (templateData) => {
                        const db = new BoothTemplateDatabase();
                        
                        // Save template
                        const saved = db.save(templateData);
                        
                        // Verify it exists
                        expect(db.getById(saved.id)).toBeDefined();
                        
                        // Delete template
                        const deleted = db.delete(saved.id);
                        
                        // Assert: Delete should succeed and template should not exist
                        expect(deleted).toBe(true);
                        expect(db.getById(saved.id)).toBeNull();
                        expect(db.getAll().find(t => t.id === saved.id)).toBeUndefined();
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should update BoothTemplate correctly', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        boothName: fc.string({ maxLength: 100 }),
                        boothAccount: fc.string({ maxLength: 50 }),
                        category: fc.string({ maxLength: 20 })
                    }),
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        boothName: fc.string({ maxLength: 100 })
                    }),
                    (originalData, updates) => {
                        const db = new BoothTemplateDatabase();
                        
                        // Save original template
                        const saved = db.save(originalData);
                        const originalId = saved.id;
                        
                        // Update template
                        const updated = db.update(originalId, updates);
                        
                        // Assert: Update should succeed and preserve ID
                        expect(updated).toBeDefined();
                        expect(updated.id).toBe(originalId);
                        expect(updated.name).toBe(updates.name);
                        expect(updated.boothName).toBe(updates.boothName);
                        
                        // Verify persistence
                        const retrieved = db.getById(originalId);
                        expect(retrieved.name).toBe(updates.name);
                        expect(retrieved.boothName).toBe(updates.boothName);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should sort BoothTemplates by usage frequency', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            name: fc.string({ minLength: 1, maxLength: 50 }),
                            boothName: fc.string({ maxLength: 100 }),
                            boothAccount: fc.string({ maxLength: 50 }),
                            category: fc.string({ maxLength: 20 })
                        }),
                        { minLength: 2, maxLength: 10 }
                    ),
                    (templatesData) => {
                        const db = new BoothTemplateDatabase();
                        
                        // Save all templates
                        const savedTemplates = templatesData.map(data => db.save(data));
                        
                        // Record different usage counts
                        savedTemplates.forEach((template, index) => {
                            for (let i = 0; i < index; i++) {
                                db.recordUsage(template.id);
                            }
                        });
                        
                        // Get sorted templates
                        const sorted = db.getAll();
                        
                        // Assert: Templates should be sorted by useCount descending
                        for (let i = 0; i < sorted.length - 1; i++) {
                            expect(sorted[i].useCount).toBeGreaterThanOrEqual(sorted[i + 1].useCount);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should apply variables to FieldTemplate patterns', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 20 }),
                    fc.integer({ min: 1, max: 100 }),
                    (name, number) => {
                        const db = new FieldTemplateDatabase();
                        
                        const pattern = '{name}さん #{number}';
                        const variables = { name, number: number.toString() };
                        
                        const result = db.applyVariables(pattern, variables);
                        
                        // Assert: Variables should be replaced correctly
                        expect(result).toBe(`${name}さん #${number}`);
                        expect(result).not.toContain('{name}');
                        expect(result).not.toContain('{number}');
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
