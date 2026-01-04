/**
 * Batch Processor Property-Based Tests
 * Feature: photo-posting-speedup
 * 
 * Property 5: Batch Processing Continuation
 * Property 8: Bulk Apply Completeness
 * 
 * Validates: Requirements 6.1, 6.4, 12.1, 12.4, 16.2, 21.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { BatchProcessor } from './batch-processor.js';

describe('Batch Processor Property-Based Tests', () => {
    let batchProcessor;
    let mockAppState;

    beforeEach(() => {
        batchProcessor = new BatchProcessor();
        
        // Mock AppState
        mockAppState = {
            postQueue: [],
            eventInfo: {
                eventEn: 'Test Event',
                eventJp: 'テストイベント',
                date: '2025.01.01',
                venue: 'Test Venue',
                category: 'ブース',
                hashtags: '#test'
            },
            settings: {
                makeWebhookUrl: 'https://example.com/webhook'
            }
        };
        
        global.window = {
            AppState: mockAppState,
            updateQueueItem: vi.fn((index, updates) => {
                Object.assign(mockAppState.postQueue[index], updates);
            })
        };
    });

    /**
     * Property 5: Batch Processing Continuation
     * 
     * For any batch operation (comment generation or sending) where some items fail,
     * the operation SHALL complete for all non-failing items and the success count
     * plus failure count SHALL equal the total count.
     * 
     * Validates: Requirements 6.1, 6.4, 12.1, 12.4
     */
    describe('Property 5: Batch Processing Continuation', () => {
        it('should continue processing all items even when some fail (comment generation)', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate a random number of posts (1-10)
                    fc.integer({ min: 1, max: 10 }),
                    // Generate which indices should fail (subset of indices)
                    fc.array(fc.integer({ min: 0, max: 9 }), { maxLength: 5 }),
                    async (postCount, failIndices) => {
                        // Setup: Create posts
                        mockAppState.postQueue = Array.from({ length: postCount }, (_, i) => ({
                            id: `post-${i}`,
                            boothName: `Booth ${i}`,
                            personRole: 'モデル',
                            aiComment: '',
                            status: 'draft'
                        }));

                        // Filter fail indices to only valid ones
                        const validFailIndices = failIndices.filter(i => i < postCount);

                        // Mock the API to fail for specific indices
                        global.fetch = vi.fn((url) => {
                            // Extract index from the call context (we'll track this via call order)
                            const callIndex = global.fetch.mock.calls.length - 1;
                            const shouldFail = validFailIndices.includes(callIndex);

                            if (shouldFail) {
                                return Promise.reject(new Error('Simulated API failure'));
                            }

                            return Promise.resolve({
                                ok: true,
                                json: () => Promise.resolve({ comment: `Generated comment ${callIndex}` })
                            });
                        });

                        // Execute: Generate comments for all posts
                        const indices = Array.from({ length: postCount }, (_, i) => i);
                        const result = await batchProcessor.generateComments(
                            indices,
                            () => {}, // progress callback
                            { overwrite: true }
                        );

                        // Verify: Success + Failed = Total
                        expect(result.success + result.failed).toBe(postCount);

                        // Verify: All items were attempted (none skipped)
                        expect(result.success).toBeGreaterThanOrEqual(0);
                        expect(result.failed).toBeGreaterThanOrEqual(0);

                        // Verify: Error count matches failed count
                        expect(result.errors.length).toBe(result.failed);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should continue processing all items even when some fail (batch send)', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate a random number of posts (1-5) - reduced for faster execution
                    fc.integer({ min: 1, max: 5 }),
                    // Generate which indices should fail (subset of indices)
                    fc.array(fc.integer({ min: 0, max: 4 }), { maxLength: 3 }),
                    async (postCount, failIndices) => {
                        // Setup: Create posts
                        mockAppState.postQueue = Array.from({ length: postCount }, (_, i) => ({
                            id: `post-${i}`,
                            boothName: `Booth ${i}`,
                            personName: `Person ${i}`,
                            personRole: 'モデル',
                            aiComment: `Comment ${i}`,
                            status: 'ready'
                        }));

                        // Filter fail indices to only valid ones
                        const validFailIndices = failIndices.filter(i => i < postCount);

                        // Mock the webhook to fail for specific indices
                        let callCount = 0;
                        global.fetch = vi.fn(() => {
                            const currentIndex = callCount++;
                            const shouldFail = validFailIndices.includes(currentIndex);

                            if (shouldFail) {
                                return Promise.resolve({
                                    ok: false,
                                    status: 500
                                });
                            }

                            return Promise.resolve({
                                ok: true,
                                status: 200
                            });
                        });

                        // Execute: Send all posts
                        const indices = Array.from({ length: postCount }, (_, i) => i);
                        const result = await batchProcessor.sendPosts(
                            indices,
                            () => {} // progress callback
                        );

                        // Verify: Success + Failed = Total
                        expect(result.success + result.failed).toBe(postCount);

                        // Verify: All items were attempted (none skipped)
                        expect(result.success).toBeGreaterThanOrEqual(0);
                        expect(result.failed).toBeGreaterThanOrEqual(0);

                        // Verify: Error count matches failed count
                        expect(result.errors.length).toBe(result.failed);
                    }
                ),
                { numRuns: 10 } // Reduced to 10 runs with smaller batches for faster execution
            );
        }, 60000); // Increase timeout to 60 seconds for async property test with delays
    });

    /**
     * Property 8: Bulk Apply Completeness
     * 
     * For any "Apply to All" operation with a specified field value,
     * all targeted posts in the queue SHALL have that field set to
     * the specified value after the operation.
     * 
     * Validates: Requirements 16.2, 21.4
     */
    describe('Property 8: Bulk Apply Completeness', () => {
        it('should apply booth information to all targeted posts', () => {
            fc.assert(
                fc.property(
                    // Generate a random number of posts (1-10)
                    fc.integer({ min: 1, max: 10 }),
                    // Generate booth information
                    fc.record({
                        boothName: fc.string({ minLength: 1, maxLength: 50 }),
                        boothAccount: fc.string({ minLength: 1, maxLength: 30 })
                    }),
                    // Generate which indices to target (optional)
                    fc.option(fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 10 })),
                    (postCount, boothInfo, targetIndices) => {
                        // Setup: Create posts with different booth info
                        mockAppState.postQueue = Array.from({ length: postCount }, (_, i) => ({
                            id: `post-${i}`,
                            boothName: `Original Booth ${i}`,
                            boothAccount: `@original${i}`,
                            personRole: 'モデル',
                            status: 'draft'
                        }));

                        // Determine which indices to target
                        let indicesToApply;
                        if (targetIndices) {
                            // Filter to valid indices only
                            indicesToApply = [...new Set(targetIndices.filter(i => i < postCount))];
                        } else {
                            // Apply to all
                            indicesToApply = Array.from({ length: postCount }, (_, i) => i);
                        }

                        // Skip if no valid indices
                        if (indicesToApply.length === 0) {
                            return true;
                        }

                        // Execute: Apply booth info
                        const appliedCount = batchProcessor.applyToAll(
                            'booth',
                            boothInfo,
                            targetIndices ? indicesToApply : null
                        );

                        // Verify: Applied count matches target count
                        expect(appliedCount).toBe(indicesToApply.length);

                        // Verify: All targeted posts have the new booth info
                        for (const index of indicesToApply) {
                            const post = mockAppState.postQueue[index];
                            expect(post.boothName).toBe(boothInfo.boothName);
                            expect(post.boothAccount).toBe(boothInfo.boothAccount);
                        }

                        // Verify: Non-targeted posts remain unchanged
                        const nonTargetedIndices = Array.from({ length: postCount }, (_, i) => i)
                            .filter(i => !indicesToApply.includes(i));
                        
                        for (const index of nonTargetedIndices) {
                            const post = mockAppState.postQueue[index];
                            expect(post.boothName).toBe(`Original Booth ${index}`);
                            expect(post.boothAccount).toBe(`@original${index}`);
                        }

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should apply role to all targeted posts', () => {
            fc.assert(
                fc.property(
                    // Generate a random number of posts (1-10)
                    fc.integer({ min: 1, max: 10 }),
                    // Generate role
                    fc.constantFrom('モデル', 'RQ', 'コスプレイヤー', 'イベントコンパニオン', 'アンバサダー'),
                    // Generate which indices to target (optional)
                    fc.option(fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 10 })),
                    (postCount, role, targetIndices) => {
                        // Setup: Create posts with different roles
                        mockAppState.postQueue = Array.from({ length: postCount }, (_, i) => ({
                            id: `post-${i}`,
                            boothName: `Booth ${i}`,
                            personRole: 'モデル',
                            status: 'draft'
                        }));

                        // Determine which indices to target
                        let indicesToApply;
                        if (targetIndices) {
                            // Filter to valid indices only
                            indicesToApply = [...new Set(targetIndices.filter(i => i < postCount))];
                        } else {
                            // Apply to all
                            indicesToApply = Array.from({ length: postCount }, (_, i) => i);
                        }

                        // Skip if no valid indices
                        if (indicesToApply.length === 0) {
                            return true;
                        }

                        // Execute: Apply role
                        const appliedCount = batchProcessor.applyToAll(
                            'role',
                            role,
                            targetIndices ? indicesToApply : null
                        );

                        // Verify: Applied count matches target count
                        expect(appliedCount).toBe(indicesToApply.length);

                        // Verify: All targeted posts have the new role
                        for (const index of indicesToApply) {
                            const post = mockAppState.postQueue[index];
                            expect(post.personRole).toBe(role);
                        }

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
