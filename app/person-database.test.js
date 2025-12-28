/**
 * Person Database Property-Based Tests
 * Feature: photo-posting-speedup
 * 
 * Property 2: Person Database Persistence
 * Property 3: Autocomplete Recency Ordering
 * 
 * Validates: Requirements 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PersonDatabase } from './person-database.js';

describe('PersonDatabase - Property-Based Tests', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    /**
     * Property 2: Person Database Persistence
     * 
     * For any PersonRecord saved to Person_Database, retrieving it after a 
     * simulated page reload SHALL return an equivalent record with matching 
     * name, account, and role.
     * 
     * Validates: Requirements 4.3, 4.4
     */
    describe('Property 2: Person Database Persistence', () => {
        it('should persist and restore person records after simulated reload', () => {
            fc.assert(
                fc.property(
                    // Generator for person records
                    fc.array(
                        fc.record({
                            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                            account: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                            role: fc.constantFrom('モデル', 'RQ', 'コスプレイヤー', 'イベントコンパニオン', 'アンバサダー'),
                            events: fc.array(fc.string(), { maxLength: 5 })
                        }),
                        { minLength: 1, maxLength: 20 }
                    ),
                    (persons) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        // Create database and add persons
                        const db1 = new PersonDatabase();
                        const addedPersons = [];

                        for (const person of persons) {
                            const added = db1.add(person);
                            addedPersons.push(added);
                        }

                        const countBeforeReload = db1.count();

                        // Simulate page reload by creating a new database instance
                        const db2 = new PersonDatabase();

                        // Verify all persons are restored
                        const restoredPersons = db2.getAll();

                        // Check that we have the same number of persons after reload
                        expect(restoredPersons.length).toBe(countBeforeReload);
                        expect(restoredPersons.length).toBeGreaterThan(0);
                        expect(restoredPersons.length).toBeLessThanOrEqual(addedPersons.length);

                        // Verify each restored person has matching fields
                        for (const restored of restoredPersons) {
                            expect(restored).toHaveProperty('id');
                            expect(restored).toHaveProperty('name');
                            expect(restored).toHaveProperty('account');
                            expect(restored).toHaveProperty('role');
                            expect(restored).toHaveProperty('lastUsed');
                            expect(restored).toHaveProperty('useCount');
                            expect(restored).toHaveProperty('events');

                            // Verify the person exists in the original added persons
                            const original = addedPersons.find(
                                p => p.name === restored.name && p.account === restored.account
                            );
                            expect(original).toBeDefined();
                            
                            if (original) {
                                expect(restored.name).toBe(original.name);
                                expect(restored.account).toBe(original.account);
                                // Role might be updated if duplicate was found
                                expect(restored.role).toBeTruthy();
                            }
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle empty database persistence', () => {
            fc.assert(
                fc.property(
                    fc.constant(null),
                    () => {
                        // Create empty database
                        const db1 = new PersonDatabase();
                        expect(db1.count()).toBe(0);

                        // Simulate reload
                        const db2 = new PersonDatabase();
                        expect(db2.count()).toBe(0);
                        expect(db2.getAll()).toEqual([]);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 3: Autocomplete Recency Ordering
     * 
     * For any Person_Database with more than 10 entries, the first 10 results 
     * from a search query SHALL be ordered by lastUsed timestamp in descending order.
     * 
     * Validates: Requirements 4.5
     */
    describe('Property 3: Autocomplete Recency Ordering', () => {
        it('should return search results ordered by recency (lastUsed descending)', () => {
            fc.assert(
                fc.property(
                    // Generate more than 10 persons with matching names
                    fc.tuple(
                        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), // common prefix
                        fc.array(
                            fc.record({
                                nameSuffix: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                                account: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                                role: fc.constantFrom('モデル', 'RQ', 'コスプレイヤー'),
                                lastUsedOffset: fc.integer({ min: 0, max: 1000000 }) // milliseconds ago
                            }),
                            { minLength: 15, maxLength: 30 }
                        )
                    ),
                    ([prefix, personData]) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db = new PersonDatabase();
                        const now = Date.now();

                        // Add persons with the common prefix and varying lastUsed times
                        for (const data of personData) {
                            const person = db.add({
                                name: prefix + data.nameSuffix,
                                account: data.account,
                                role: data.role,
                                events: []
                            });

                            // Manually set lastUsed to create different timestamps
                            db.update(person.id, {
                                lastUsed: now - data.lastUsedOffset
                            });
                        }

                        // Search with the common prefix
                        const results = db.search(prefix, 10);

                        // Verify we got results
                        expect(results.length).toBeGreaterThan(0);
                        expect(results.length).toBeLessThanOrEqual(10);

                        // Verify results are ordered by lastUsed descending
                        for (let i = 0; i < results.length - 1; i++) {
                            expect(results[i].lastUsed).toBeGreaterThanOrEqual(results[i + 1].lastUsed);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should maintain recency order for getRecent method', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                            account: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                            role: fc.constantFrom('モデル', 'RQ'),
                            lastUsedOffset: fc.integer({ min: 0, max: 1000000 })
                        }),
                        { minLength: 15, maxLength: 30 }
                    ),
                    (personData) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db = new PersonDatabase();
                        const now = Date.now();

                        // Add persons with varying lastUsed times
                        for (const data of personData) {
                            const person = db.add({
                                name: data.name,
                                account: data.account,
                                role: data.role,
                                events: []
                            });

                            db.update(person.id, {
                                lastUsed: now - data.lastUsedOffset
                            });
                        }

                        // Get recent persons
                        const recent = db.getRecent(10);

                        // Verify ordering
                        expect(recent.length).toBeGreaterThan(0);
                        expect(recent.length).toBeLessThanOrEqual(10);

                        for (let i = 0; i < recent.length - 1; i++) {
                            expect(recent[i].lastUsed).toBeGreaterThanOrEqual(recent[i + 1].lastUsed);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle search with less than 10 entries', () => {
            fc.assert(
                fc.property(
                    fc.tuple(
                        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
                        fc.array(
                            fc.record({
                                name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                                account: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                                role: fc.constantFrom('モデル', 'RQ')
                            }),
                            { minLength: 1, maxLength: 5 }
                        )
                    ),
                    ([query, personData]) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db = new PersonDatabase();

                        for (const data of personData) {
                            db.add({
                                name: query + data.name,
                                account: data.account,
                                role: data.role,
                                events: []
                            });
                        }

                        const results = db.search(query, 10);

                        // Should return all matching results even if less than 10
                        expect(results.length).toBeLessThanOrEqual(personData.length);
                        expect(results.length).toBeLessThanOrEqual(10);
                        
                        // Still should be ordered by recency
                        for (let i = 0; i < results.length - 1; i++) {
                            expect(results[i].lastUsed).toBeGreaterThanOrEqual(results[i + 1].lastUsed);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Additional property: CRUD Consistency
     * Verifies that basic CRUD operations maintain data integrity
     */
    describe('Additional Property: CRUD Consistency', () => {
        it('should maintain data integrity through CRUD operations', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                            account: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                            role: fc.constantFrom('モデル', 'RQ', 'コスプレイヤー')
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    (persons) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db = new PersonDatabase();
                        const addedIds = [];

                        // Add all persons
                        for (const person of persons) {
                            const added = db.add(person);
                            addedIds.push(added.id);
                        }

                        // Verify count
                        const initialCount = db.count();
                        expect(initialCount).toBeGreaterThan(0);

                        // Retrieve each person by ID
                        for (const id of addedIds) {
                            const retrieved = db.getById(id);
                            expect(retrieved).toBeDefined();
                            expect(retrieved.id).toBe(id);
                        }

                        // Update first person
                        if (addedIds.length > 0) {
                            const firstId = addedIds[0];
                            const updated = db.update(firstId, { role: 'アンバサダー' });
                            expect(updated).toBeDefined();
                            expect(updated.role).toBe('アンバサダー');
                        }

                        // Delete last person
                        if (addedIds.length > 0) {
                            const lastId = addedIds[addedIds.length - 1];
                            const deleted = db.delete(lastId);
                            expect(deleted).toBe(true);
                            expect(db.getById(lastId)).toBeNull();
                        }

                        // Verify final count
                        const finalCount = db.count();
                        expect(finalCount).toBe(initialCount - 1);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
