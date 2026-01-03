/**
 * History Database Property-Based Tests
 * Feature: photo-posting-speedup
 * 
 * Property 12: History Storage Limit
 * 
 * Validates: Requirements 10.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { HistoryDatabase } from './history-database.js';

describe('HistoryDatabase - Property-Based Tests', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    /**
     * Property 12: History Storage Limit
     * 
     * For any sequence of successful post sends, the History_Database SHALL 
     * contain at most 100 records, with the oldest records being removed when 
     * the limit is exceeded.
     * 
     * Validates: Requirements 10.2
     */
    describe('Property 12: History Storage Limit', () => {
        it('should maintain at most 100 records and remove oldest when limit exceeded', () => {
            fc.assert(
                fc.property(
                    // Generator for history records (more than 100 to test limit)
                    fc.array(
                        fc.record({
                            eventId: fc.string({ minLength: 1, maxLength: 20 }),
                            eventName: fc.string({ minLength: 1, maxLength: 50 }),
                            postData: fc.record({
                                boothName: fc.string({ maxLength: 50 }),
                                boothAccount: fc.string({ maxLength: 30 }),
                                personName: fc.string({ maxLength: 50 }),
                                personAccount: fc.string({ maxLength: 30 }),
                                personRole: fc.constantFrom('モデル', 'RQ', 'コスプレイヤー', 'イベントコンパニオン'),
                                aiComment: fc.string({ maxLength: 200 }),
                                imageBase64: fc.option(fc.string({ maxLength: 100 }), { nil: null })
                            })
                        }),
                        { minLength: 101, maxLength: 150 } // Generate more than 100 to test limit
                    ),
                    (historyRecords) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        // Create database
                        const db = new HistoryDatabase();

                        // Add all records
                        const addedRecords = [];
                        for (const record of historyRecords) {
                            const added = db.add(record);
                            addedRecords.push(added);
                        }

                        // Verify the database contains at most 100 records
                        const count = db.count();
                        expect(count).toBeLessThanOrEqual(100);

                        // Verify the database contains exactly 100 records (since we added more than 100)
                        expect(count).toBe(100);

                        // Get all records
                        const allRecords = db.getAll();
                        expect(allRecords.length).toBe(100);

                        // Verify that the most recent 100 records are kept
                        // The first record in the array should be the most recent (last added)
                        const mostRecentAdded = addedRecords.slice(-100);
                        
                        // Check that all records in the database are from the most recent 100
                        for (const dbRecord of allRecords) {
                            const found = mostRecentAdded.find(r => r.id === dbRecord.id);
                            expect(found).toBeDefined();
                        }

                        // Verify that the oldest records (first added) are not in the database
                        const oldestRecords = addedRecords.slice(0, addedRecords.length - 100);
                        for (const oldRecord of oldestRecords) {
                            const found = allRecords.find(r => r.id === oldRecord.id);
                            expect(found).toBeUndefined();
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should maintain correct order with most recent first', () => {
            fc.assert(
                fc.property(
                    // Generator for a smaller set to test ordering
                    fc.array(
                        fc.record({
                            eventId: fc.string({ minLength: 1, maxLength: 20 }),
                            eventName: fc.string({ minLength: 1, maxLength: 50 }),
                            postData: fc.record({
                                boothName: fc.string({ maxLength: 50 }),
                                personName: fc.string({ maxLength: 50 })
                            })
                        }),
                        { minLength: 5, maxLength: 50 }
                    ),
                    (historyRecords) => {
                        // Clear localStorage
                        localStorage.clear();
                        
                        const db = new HistoryDatabase();

                        // Add records with small delays to ensure different timestamps
                        const addedRecords = [];
                        for (let i = 0; i < historyRecords.length; i++) {
                            const added = db.add(historyRecords[i]);
                            addedRecords.push(added);
                        }

                        // Get all records
                        const allRecords = db.getAll();

                        // Verify records are in descending order by sentAt (most recent first)
                        for (let i = 0; i < allRecords.length - 1; i++) {
                            expect(allRecords[i].sentAt).toBeGreaterThanOrEqual(allRecords[i + 1].sentAt);
                        }

                        // Verify the first record is the most recently added
                        if (allRecords.length > 0 && addedRecords.length > 0) {
                            const lastAdded = addedRecords[addedRecords.length - 1];
                            expect(allRecords[0].id).toBe(lastAdded.id);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle exactly 100 records without removing any', () => {
            fc.assert(
                fc.property(
                    // Generator for exactly 100 records
                    fc.array(
                        fc.record({
                            eventId: fc.string({ minLength: 1, maxLength: 20 }),
                            eventName: fc.string({ minLength: 1, maxLength: 50 }),
                            postData: fc.record({
                                boothName: fc.string({ maxLength: 50 })
                            })
                        }),
                        { minLength: 100, maxLength: 100 }
                    ),
                    (historyRecords) => {
                        // Clear localStorage
                        localStorage.clear();
                        
                        const db = new HistoryDatabase();

                        // Add exactly 100 records
                        const addedRecords = [];
                        for (const record of historyRecords) {
                            const added = db.add(record);
                            addedRecords.push(added);
                        }

                        // Verify the database contains exactly 100 records
                        expect(db.count()).toBe(100);

                        // Verify all added records are present
                        const allRecords = db.getAll();
                        expect(allRecords.length).toBe(100);

                        for (const added of addedRecords) {
                            const found = allRecords.find(r => r.id === added.id);
                            expect(found).toBeDefined();
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle fewer than 100 records without issues', () => {
            fc.assert(
                fc.property(
                    // Generator for fewer than 100 records
                    fc.array(
                        fc.record({
                            eventId: fc.string({ minLength: 1, maxLength: 20 }),
                            eventName: fc.string({ minLength: 1, maxLength: 50 }),
                            postData: fc.record({
                                boothName: fc.string({ maxLength: 50 })
                            })
                        }),
                        { minLength: 1, maxLength: 99 }
                    ),
                    (historyRecords) => {
                        // Clear localStorage
                        localStorage.clear();
                        
                        const db = new HistoryDatabase();

                        // Add records
                        const addedRecords = [];
                        for (const record of historyRecords) {
                            const added = db.add(record);
                            addedRecords.push(added);
                        }

                        // Verify the database contains all added records
                        expect(db.count()).toBe(historyRecords.length);

                        // Verify all added records are present
                        const allRecords = db.getAll();
                        expect(allRecords.length).toBe(historyRecords.length);

                        for (const added of addedRecords) {
                            const found = allRecords.find(r => r.id === added.id);
                            expect(found).toBeDefined();
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Additional unit tests for basic functionality
     */
    describe('Basic Functionality', () => {
        it('should add a history record successfully', () => {
            const db = new HistoryDatabase();
            
            const record = db.add({
                eventId: 'event1',
                eventName: 'Test Event',
                postData: {
                    boothName: 'Test Booth',
                    personName: 'Test Person'
                }
            });

            expect(record).toHaveProperty('id');
            expect(record.eventId).toBe('event1');
            expect(record.eventName).toBe('Test Event');
            expect(db.count()).toBe(1);
        });

        it('should group records by event', () => {
            const db = new HistoryDatabase();
            
            db.add({
                eventId: 'event1',
                eventName: 'Event 1',
                postData: { boothName: 'Booth A' }
            });
            
            db.add({
                eventId: 'event1',
                eventName: 'Event 1',
                postData: { boothName: 'Booth B' }
            });
            
            db.add({
                eventId: 'event2',
                eventName: 'Event 2',
                postData: { boothName: 'Booth C' }
            });

            const grouped = db.getGroupedByEvent();
            
            expect(Object.keys(grouped)).toHaveLength(2);
            expect(grouped['event1'].records).toHaveLength(2);
            expect(grouped['event2'].records).toHaveLength(1);
        });

        it('should delete a record by id', () => {
            const db = new HistoryDatabase();
            
            const record = db.add({
                eventId: 'event1',
                eventName: 'Test Event',
                postData: { boothName: 'Test' }
            });

            expect(db.count()).toBe(1);
            
            const deleted = db.delete(record.id);
            expect(deleted).toBe(true);
            expect(db.count()).toBe(0);
        });

        it('should clear all records', () => {
            const db = new HistoryDatabase();
            
            db.add({
                eventId: 'event1',
                eventName: 'Event 1',
                postData: { boothName: 'Booth A' }
            });
            
            db.add({
                eventId: 'event2',
                eventName: 'Event 2',
                postData: { boothName: 'Booth B' }
            });

            expect(db.count()).toBe(2);
            
            db.clear();
            expect(db.count()).toBe(0);
        });
    });
});
