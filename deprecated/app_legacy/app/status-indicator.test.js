/**
 * Property-Based Tests for Status Indicator Module
 * Feature: photo-posting-speedup, Property 11: Status Badge Accuracy
 * Validates: Requirements 14.1
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Import the module
const statusIndicator = await import('./status-indicator.js');

const {
    STATUS_CONFIG,
    hasRequiredFields,
    isStaleDraft,
    getStatusText,
    getStatusClass,
    calculateCompletionPercentage
} = statusIndicator;

describe('Status Indicator Module', () => {
    describe('Unit Tests', () => {
        it('should return correct status text for each status', () => {
            expect(getStatusText('draft')).toBe('下書き');
            expect(getStatusText('ready')).toBe('準備完了');
            expect(getStatusText('sent')).toBe('送信済');
            expect(getStatusText('failed')).toBe('失敗');
        });

        it('should return correct status class for each status', () => {
            expect(getStatusClass('draft')).toBe('draft');
            expect(getStatusClass('ready')).toBe('ready');
            expect(getStatusClass('sent')).toBe('sent');
            expect(getStatusClass('failed')).toBe('failed');
        });

        it('should detect missing required fields', () => {
            const completePost = {
                boothName: 'SEGA',
                personName: '世森 響',
                aiComment: 'テストコメント'
            };
            expect(hasRequiredFields(completePost)).toBe(true);

            const incompletePost1 = {
                boothName: '',
                personName: '世森 響',
                aiComment: 'テストコメント'
            };
            expect(hasRequiredFields(incompletePost1)).toBe(false);

            const incompletePost2 = {
                boothName: 'SEGA',
                personName: '',
                aiComment: 'テストコメント'
            };
            expect(hasRequiredFields(incompletePost2)).toBe(false);

            const incompletePost3 = {
                boothName: 'SEGA',
                personName: '世森 響',
                aiComment: ''
            };
            expect(hasRequiredFields(incompletePost3)).toBe(false);
        });

        it('should detect stale drafts (older than 5 minutes)', () => {
            const now = Date.now();
            const fiveMinutesAgo = now - (5 * 60 * 1000);
            const sixMinutesAgo = now - (6 * 60 * 1000);

            const recentDraft = {
                status: 'draft',
                createdAt: fiveMinutesAgo
            };
            expect(isStaleDraft(recentDraft)).toBe(false);

            const staleDraft = {
                status: 'draft',
                createdAt: sixMinutesAgo
            };
            expect(isStaleDraft(staleDraft)).toBe(true);

            const readyPost = {
                status: 'ready',
                createdAt: sixMinutesAgo
            };
            expect(isStaleDraft(readyPost)).toBe(false);
        });

        it('should calculate completion percentage correctly', () => {
            const queue1 = [
                { status: 'draft' },
                { status: 'ready' },
                { status: 'sent' },
                { status: 'draft' }
            ];
            const result1 = calculateCompletionPercentage(queue1);
            expect(result1.total).toBe(4);
            expect(result1.completed).toBe(2); // ready + sent
            expect(result1.percentage).toBe(50);

            const queue2 = [
                { status: 'sent' },
                { status: 'sent' },
                { status: 'sent' }
            ];
            const result2 = calculateCompletionPercentage(queue2);
            expect(result2.total).toBe(3);
            expect(result2.completed).toBe(3);
            expect(result2.percentage).toBe(100);

            const queue3 = [];
            const result3 = calculateCompletionPercentage(queue3);
            expect(result3.total).toBe(0);
            expect(result3.completed).toBe(0);
            expect(result3.percentage).toBe(0);
        });
    });

    describe('Property-Based Tests', () => {
        /**
         * Property 11: Status Badge Accuracy
         * For any PostItem in the queue, the displayed status badge color SHALL match 
         * the item's status field according to the mapping: 
         * draft→gray, ready→blue, sent→green, failed→red.
         * 
         * Validates: Requirements 14.1
         */
        it('Property 11: Status badge class matches status field mapping', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('draft', 'ready', 'sent', 'failed'),
                    (status) => {
                        // Get the status class
                        const statusClass = getStatusClass(status);

                        // Verify the class matches the status
                        expect(statusClass).toBe(status);

                        // Verify the status config exists and has correct mapping
                        const config = STATUS_CONFIG[status];
                        expect(config).toBeDefined();
                        expect(config.class).toBe(status);

                        // Verify color mapping
                        const expectedColors = {
                            draft: 'gray',
                            ready: 'blue',
                            sent: 'green',
                            failed: 'red'
                        };
                        expect(config.color).toBe(expectedColors[status]);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('Property: Status text is always defined for valid statuses', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('draft', 'ready', 'sent', 'failed'),
                    (status) => {
                        const text = getStatusText(status);
                        
                        // Status text should never be empty
                        expect(text).toBeTruthy();
                        expect(typeof text).toBe('string');
                        expect(text.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('Property: Required fields check is consistent', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        boothName: fc.string(),
                        personName: fc.string(),
                        aiComment: fc.string()
                    }),
                    (post) => {
                        const hasFields = hasRequiredFields(post);
                        
                        // Should return true only if all fields are non-empty
                        const expected = !!(post.boothName && post.personName && post.aiComment);
                        expect(hasFields).toBe(expected);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('Property: Completion percentage is always between 0 and 100', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            status: fc.constantFrom('draft', 'ready', 'sent', 'failed')
                        }),
                        { minLength: 0, maxLength: 10 }
                    ),
                    (queue) => {
                        const result = calculateCompletionPercentage(queue);
                        
                        // Percentage should always be between 0 and 100
                        expect(result.percentage).toBeGreaterThanOrEqual(0);
                        expect(result.percentage).toBeLessThanOrEqual(100);
                        
                        // Total should match queue length
                        expect(result.total).toBe(queue.length);
                        
                        // Completed should be <= total
                        expect(result.completed).toBeLessThanOrEqual(result.total);
                        
                        // Completed should match count of ready/sent items
                        const expectedCompleted = queue.filter(
                            p => p.status === 'ready' || p.status === 'sent'
                        ).length;
                        expect(result.completed).toBe(expectedCompleted);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('Property: Stale draft detection is time-based', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('draft', 'ready', 'sent', 'failed'),
                    fc.integer({ min: 0, max: 10 * 60 * 1000 }), // 0 to 10 minutes
                    (status, ageMs) => {
                        const now = Date.now();
                        const post = {
                            status: status,
                            createdAt: now - ageMs
                        };
                        
                        const isStale = isStaleDraft(post);
                        
                        // Should only be stale if status is draft AND age > 5 minutes
                        const expectedStale = status === 'draft' && ageMs > (5 * 60 * 1000);
                        expect(isStale).toBe(expectedStale);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
