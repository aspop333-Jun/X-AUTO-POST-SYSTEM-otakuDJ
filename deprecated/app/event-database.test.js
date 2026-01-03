/**
 * Event Database Property-Based Tests
 * Feature: photo-posting-speedup
 * 
 * Property 9: Event Auto-Restore
 * 
 * Validates: Requirements 11.1, 11.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { EventDatabase } from './event-database.js';

describe('EventDatabase - Property-Based Tests', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    /**
     * Property 9: Event Auto-Restore
     * 
     * For any EventInfo saved to localStorage, loading the application SHALL 
     * restore the event info and the restored data SHALL be equivalent to the 
     * saved data.
     * 
     * Validates: Requirements 11.1, 11.2
     */
    describe('Property 9: Event Auto-Restore', () => {
        it('should restore event info after simulated page reload', () => {
            fc.assert(
                fc.property(
                    // Generator for event info
                    fc.record({
                        eventEn: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                        eventJp: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                        date: fc.integer({ min: 2000, max: 2099 }).chain(year =>
                            fc.integer({ min: 1, max: 12 }).chain(month =>
                                fc.integer({ min: 1, max: 28 }).map(day =>
                                    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                )
                            )
                        ),
                        venue: fc.string({ minLength: 1, maxLength: 100 }),
                        category: fc.constantFrom('TGS', 'レース', '展示会', 'コスプレイベント', 'その他'),
                        hashtags: fc.array(
                            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                            { maxLength: 5 }
                        ).map(tags => tags.map(t => `#${t}`).join(' '))
                    }),
                    (eventInfo) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        // Create database and save event
                        const db1 = new EventDatabase();
                        const savedEvent = db1.saveEvent(eventInfo);

                        // Verify event was saved
                        expect(savedEvent).toBeDefined();
                        expect(savedEvent.id).toBeDefined();
                        expect(savedEvent.eventEn).toBe(eventInfo.eventEn);
                        expect(savedEvent.eventJp).toBe(eventInfo.eventJp);
                        expect(savedEvent.date).toBe(eventInfo.date);
                        expect(savedEvent.venue).toBe(eventInfo.venue);
                        expect(savedEvent.category).toBe(eventInfo.category);
                        expect(savedEvent.hashtags).toBe(eventInfo.hashtags);
                        expect(savedEvent.lastUsed).toBeDefined();

                        // Simulate page reload by creating a new database instance
                        const db2 = new EventDatabase();

                        // Restore last event
                        const restoredEvent = db2.restoreLastEvent();

                        // Verify restored event matches saved event
                        expect(restoredEvent).toBeDefined();
                        expect(restoredEvent.id).toBe(savedEvent.id);
                        expect(restoredEvent.eventEn).toBe(savedEvent.eventEn);
                        expect(restoredEvent.eventJp).toBe(savedEvent.eventJp);
                        expect(restoredEvent.date).toBe(savedEvent.date);
                        expect(restoredEvent.venue).toBe(savedEvent.venue);
                        expect(restoredEvent.category).toBe(savedEvent.category);
                        expect(restoredEvent.hashtags).toBe(savedEvent.hashtags);
                        expect(restoredEvent.lastUsed).toBe(savedEvent.lastUsed);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should restore event with only eventEn', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        eventEn: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                        date: fc.integer({ min: 2000, max: 2099 }).chain(year =>
                            fc.integer({ min: 1, max: 12 }).chain(month =>
                                fc.integer({ min: 1, max: 28 }).map(day =>
                                    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                )
                            )
                        ),
                        venue: fc.string({ maxLength: 100 }),
                        category: fc.string({ maxLength: 50 }),
                        hashtags: fc.string({ maxLength: 200 })
                    }),
                    (eventInfo) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db1 = new EventDatabase();
                        const savedEvent = db1.saveEvent({
                            ...eventInfo,
                            eventJp: '' // Empty Japanese name
                        });

                        expect(savedEvent.eventEn).toBe(eventInfo.eventEn);
                        expect(savedEvent.eventJp).toBe('');

                        // Simulate reload
                        const db2 = new EventDatabase();
                        const restoredEvent = db2.restoreLastEvent();

                        expect(restoredEvent).toBeDefined();
                        expect(restoredEvent.eventEn).toBe(savedEvent.eventEn);
                        expect(restoredEvent.eventJp).toBe('');
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should restore event with only eventJp', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        eventJp: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                        date: fc.integer({ min: 2000, max: 2099 }).chain(year =>
                            fc.integer({ min: 1, max: 12 }).chain(month =>
                                fc.integer({ min: 1, max: 28 }).map(day =>
                                    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                )
                            )
                        ),
                        venue: fc.string({ maxLength: 100 }),
                        category: fc.string({ maxLength: 50 }),
                        hashtags: fc.string({ maxLength: 200 })
                    }),
                    (eventInfo) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db1 = new EventDatabase();
                        const savedEvent = db1.saveEvent({
                            ...eventInfo,
                            eventEn: '' // Empty English name
                        });

                        expect(savedEvent.eventJp).toBe(eventInfo.eventJp);
                        expect(savedEvent.eventEn).toBe('');

                        // Simulate reload
                        const db2 = new EventDatabase();
                        const restoredEvent = db2.restoreLastEvent();

                        expect(restoredEvent).toBeDefined();
                        expect(restoredEvent.eventJp).toBe(savedEvent.eventJp);
                        expect(restoredEvent.eventEn).toBe('');
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return null when no event is saved', () => {
            fc.assert(
                fc.property(
                    fc.constant(null),
                    () => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        // Create database without saving any event
                        const db = new EventDatabase();
                        const restoredEvent = db.restoreLastEvent();

                        // Should return null when no event exists
                        expect(restoredEvent).toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle multiple save and restore cycles', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            eventEn: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                            eventJp: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                            date: fc.integer({ min: 2000, max: 2099 }).chain(year =>
                                fc.integer({ min: 1, max: 12 }).chain(month =>
                                    fc.integer({ min: 1, max: 28 }).map(day =>
                                        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    )
                                )
                            ),
                            venue: fc.string({ maxLength: 50 }),
                            category: fc.string({ maxLength: 30 }),
                            hashtags: fc.string({ maxLength: 100 })
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    (events) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        let lastSavedEvent = null;

                        // Save multiple events sequentially
                        for (const eventInfo of events) {
                            const db = new EventDatabase();
                            lastSavedEvent = db.saveEvent(eventInfo);
                        }

                        // Simulate final reload
                        const dbFinal = new EventDatabase();
                        const restoredEvent = dbFinal.restoreLastEvent();

                        // Should restore the last saved event
                        expect(restoredEvent).toBeDefined();
                        expect(restoredEvent.id).toBe(lastSavedEvent.id);
                        expect(restoredEvent.eventEn).toBe(lastSavedEvent.eventEn);
                        expect(restoredEvent.eventJp).toBe(lastSavedEvent.eventJp);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Additional property: Recent Events Management
     * Verifies that recent events list is properly maintained
     */
    describe('Additional Property: Recent Events Management', () => {
        it('should maintain up to 5 recent events', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            eventEn: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                            eventJp: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                            date: fc.integer({ min: 2000, max: 2099 }).chain(year =>
                                fc.integer({ min: 1, max: 12 }).chain(month =>
                                    fc.integer({ min: 1, max: 28 }).map(day =>
                                        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    )
                                )
                            ),
                            venue: fc.string({ maxLength: 50 }),
                            category: fc.string({ maxLength: 30 }),
                            hashtags: fc.string({ maxLength: 100 })
                        }),
                        { minLength: 6, maxLength: 15 }
                    ),
                    (events) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db = new EventDatabase();

                        // Save all events
                        for (const eventInfo of events) {
                            db.saveEvent(eventInfo);
                        }

                        // Get recent events
                        const recentEvents = db.getRecentEvents();

                        // Should have at most 5 recent events
                        expect(recentEvents.length).toBeLessThanOrEqual(5);
                        expect(recentEvents.length).toBeGreaterThan(0);

                        // Recent events should be ordered by lastUsed (most recent first)
                        for (let i = 0; i < recentEvents.length - 1; i++) {
                            expect(recentEvents[i].lastUsed).toBeGreaterThanOrEqual(recentEvents[i + 1].lastUsed);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should allow switching between recent events', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            eventEn: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                            eventJp: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                            date: fc.integer({ min: 2000, max: 2099 }).chain(year =>
                                fc.integer({ min: 1, max: 12 }).chain(month =>
                                    fc.integer({ min: 1, max: 28 }).map(day =>
                                        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    )
                                )
                            ),
                            venue: fc.string({ maxLength: 50 }),
                            category: fc.string({ maxLength: 30 }),
                            hashtags: fc.string({ maxLength: 100 })
                        }),
                        { minLength: 2, maxLength: 5 }
                    ),
                    (events) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db = new EventDatabase();
                        const savedEvents = [];

                        // Save all events
                        for (const eventInfo of events) {
                            const saved = db.saveEvent(eventInfo);
                            savedEvents.push(saved);
                        }

                        // Switch to first event
                        const firstEvent = savedEvents[0];
                        const switched = db.switchToEvent(firstEvent.id);

                        expect(switched).toBeDefined();
                        expect(switched.id).toBe(firstEvent.id);

                        // Current event should be the switched event
                        const current = db.getCurrentEvent();
                        expect(current.id).toBe(firstEvent.id);

                        // Simulate reload
                        const db2 = new EventDatabase();
                        const restored = db2.restoreLastEvent();

                        // Should restore the switched event
                        expect(restored.id).toBe(firstEvent.id);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle event validation correctly', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        eventEn: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                        eventJp: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                        date: fc.integer({ min: 2000, max: 2099 }).chain(year =>
                            fc.integer({ min: 1, max: 12 }).chain(month =>
                                fc.integer({ min: 1, max: 28 }).map(day =>
                                    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                )
                            )
                        ),
                        venue: fc.string({ maxLength: 50 }),
                        category: fc.string({ maxLength: 30 }),
                        hashtags: fc.string({ maxLength: 100 })
                    }),
                    (eventInfo) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db = new EventDatabase();

                        // Valid event should pass validation
                        expect(db.isValidEvent(eventInfo)).toBe(true);

                        // Save and retrieve
                        const saved = db.saveEvent(eventInfo);
                        expect(db.isValidEvent(saved)).toBe(true);

                        // Invalid events should fail validation
                        expect(db.isValidEvent(null)).toBe(false);
                        expect(db.isValidEvent({})).toBe(false);
                        expect(db.isValidEvent({ eventEn: '', eventJp: '' })).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Additional property: Clear Operations
     * Verifies that clear operations work correctly
     */
    describe('Additional Property: Clear Operations', () => {
        it('should clear current event correctly', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        eventEn: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                        eventJp: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                        date: fc.integer({ min: 2000, max: 2099 }).chain(year =>
                            fc.integer({ min: 1, max: 12 }).chain(month =>
                                fc.integer({ min: 1, max: 28 }).map(day =>
                                    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                )
                            )
                        ),
                        venue: fc.string({ maxLength: 50 }),
                        category: fc.string({ maxLength: 30 }),
                        hashtags: fc.string({ maxLength: 100 })
                    }),
                    (eventInfo) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db = new EventDatabase();
                        db.saveEvent(eventInfo);

                        // Verify event exists
                        expect(db.getCurrentEvent()).not.toBeNull();

                        // Clear current event
                        const cleared = db.clearCurrentEvent();
                        expect(cleared).toBe(true);

                        // Current event should be null
                        expect(db.getCurrentEvent()).toBeNull();

                        // Simulate reload
                        const db2 = new EventDatabase();
                        expect(db2.restoreLastEvent()).toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should clear all events correctly', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            eventEn: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                            eventJp: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                            date: fc.integer({ min: 2000, max: 2099 }).chain(year =>
                                fc.integer({ min: 1, max: 12 }).chain(month =>
                                    fc.integer({ min: 1, max: 28 }).map(day =>
                                        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    )
                                )
                            ),
                            venue: fc.string({ maxLength: 50 }),
                            category: fc.string({ maxLength: 30 }),
                            hashtags: fc.string({ maxLength: 100 })
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    (events) => {
                        // Clear localStorage to ensure clean state
                        localStorage.clear();
                        
                        const db = new EventDatabase();

                        // Save multiple events
                        for (const eventInfo of events) {
                            db.saveEvent(eventInfo);
                        }

                        // Verify events exist
                        expect(db.getCurrentEvent()).not.toBeNull();
                        expect(db.getRecentEvents().length).toBeGreaterThan(0);

                        // Clear all
                        const cleared = db.clearAll();
                        expect(cleared).toBe(true);

                        // Everything should be cleared
                        expect(db.getCurrentEvent()).toBeNull();
                        expect(db.getRecentEvents()).toEqual([]);

                        // Simulate reload
                        const db2 = new EventDatabase();
                        expect(db2.restoreLastEvent()).toBeNull();
                        expect(db2.getRecentEvents()).toEqual([]);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
