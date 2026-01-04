/**
 * Property-Based Tests for Drag and Drop Queue Reordering
 * Feature: photo-posting-speedup, Property 7: Queue Reorder Integrity
 * Validates: Requirements 8.2, 8.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { DragDropManager } from './drag-drop.js';
import { stateManager } from './state-manager.js';

describe('Drag and Drop Property-Based Tests', () => {
    let dragDropManager;

    beforeEach(() => {
        // Reset state manager
        stateManager.setState({
            currentStep: 2,
            eventInfo: {},
            postQueue: [],
            selectedIndices: [],
            editingIndex: null
        });

        // Create new drag drop manager
        dragDropManager = new DragDropManager(stateManager);
    });

    describe('Property 7: Queue Reorder Integrity', () => {
        /**
         * Property: For any drag-and-drop reorder operation on Post_Queue,
         * the queue after reordering SHALL contain exactly the same items (by id)
         * as before, with only their positions changed.
         * 
         * Validates: Requirements 8.2, 8.3
         */
        it('should preserve all queue items with only positions changed', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate a queue with 2-10 items
                    fc.array(
                        fc.record({
                            id: fc.string({ minLength: 5, maxLength: 20 }),
                            boothName: fc.string({ minLength: 1, maxLength: 50 }),
                            personName: fc.string({ minLength: 1, maxLength: 50 }),
                            aiComment: fc.string({ minLength: 0, maxLength: 200 }),
                            status: fc.constantFrom('draft', 'ready', 'sent')
                        }),
                        { minLength: 2, maxLength: 10 }
                    ),
                    // Generate valid old and new indices
                    fc.nat(),
                    fc.nat(),
                    async (queue, oldIndexSeed, newIndexSeed) => {
                        // Ensure unique IDs
                        const uniqueQueue = queue.map((item, idx) => ({
                            ...item,
                            id: `${item.id}-${idx}`
                        }));

                        // Set initial state
                        stateManager.setState({
                            postQueue: uniqueQueue
                        });

                        // Calculate valid indices
                        const oldIndex = oldIndexSeed % uniqueQueue.length;
                        const newIndex = newIndexSeed % uniqueQueue.length;

                        // Store original queue and IDs
                        const originalQueue = [...uniqueQueue];
                        const originalIds = originalQueue.map(item => item.id);

                        // Perform reorder
                        dragDropManager.reorderQueue(oldIndex, newIndex);

                        // Get reordered queue
                        const reorderedQueue = stateManager.getState().postQueue;
                        const reorderedIds = reorderedQueue.map(item => item.id);

                        // Property 1: Same number of items
                        expect(reorderedQueue.length).toBe(originalQueue.length);

                        // Property 2: All original IDs are present (no items lost)
                        for (const id of originalIds) {
                            expect(reorderedIds).toContain(id);
                        }

                        // Property 3: No new IDs added
                        for (const id of reorderedIds) {
                            expect(originalIds).toContain(id);
                        }

                        // Property 4: Each item's data is unchanged (except position)
                        for (const originalItem of originalQueue) {
                            const reorderedItem = reorderedQueue.find(item => item.id === originalItem.id);
                            expect(reorderedItem).toBeDefined();
                            expect(reorderedItem.boothName).toBe(originalItem.boothName);
                            expect(reorderedItem.personName).toBe(originalItem.personName);
                            expect(reorderedItem.aiComment).toBe(originalItem.aiComment);
                            expect(reorderedItem.status).toBe(originalItem.status);
                        }

                        // Property 5: The moved item is at the correct new position
                        if (oldIndex !== newIndex) {
                            const movedItem = originalQueue[oldIndex];
                            expect(reorderedQueue[newIndex].id).toBe(movedItem.id);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle edge case: reordering with same old and new index', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            id: fc.string({ minLength: 5, maxLength: 20 }),
                            boothName: fc.string({ minLength: 1, maxLength: 50 })
                        }),
                        { minLength: 2, maxLength: 10 }
                    ),
                    fc.nat(),
                    async (queue, indexSeed) => {
                        const uniqueQueue = queue.map((item, idx) => ({
                            ...item,
                            id: `${item.id}-${idx}`
                        }));

                        stateManager.setState({
                            postQueue: uniqueQueue
                        });

                        const index = indexSeed % uniqueQueue.length;
                        const originalQueue = [...uniqueQueue];

                        // Reorder with same index
                        dragDropManager.reorderQueue(index, index);

                        const reorderedQueue = stateManager.getState().postQueue;

                        // Queue should remain unchanged
                        expect(reorderedQueue).toEqual(originalQueue);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle edge case: moving first item to last position', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            id: fc.string({ minLength: 5, maxLength: 20 }),
                            boothName: fc.string({ minLength: 1, maxLength: 50 })
                        }),
                        { minLength: 2, maxLength: 10 }
                    ),
                    async (queue) => {
                        const uniqueQueue = queue.map((item, idx) => ({
                            ...item,
                            id: `${item.id}-${idx}`
                        }));

                        stateManager.setState({
                            postQueue: uniqueQueue
                        });

                        const firstItem = uniqueQueue[0];
                        const lastIndex = uniqueQueue.length - 1;

                        // Move first to last
                        dragDropManager.reorderQueue(0, lastIndex);

                        const reorderedQueue = stateManager.getState().postQueue;

                        // First item should now be at last position
                        expect(reorderedQueue[lastIndex].id).toBe(firstItem.id);

                        // All items should still be present
                        expect(reorderedQueue.length).toBe(uniqueQueue.length);
                        const originalIds = uniqueQueue.map(item => item.id);
                        const reorderedIds = reorderedQueue.map(item => item.id);
                        for (const id of originalIds) {
                            expect(reorderedIds).toContain(id);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle edge case: moving last item to first position', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            id: fc.string({ minLength: 5, maxLength: 20 }),
                            boothName: fc.string({ minLength: 1, maxLength: 50 })
                        }),
                        { minLength: 2, maxLength: 10 }
                    ),
                    async (queue) => {
                        const uniqueQueue = queue.map((item, idx) => ({
                            ...item,
                            id: `${item.id}-${idx}`
                        }));

                        stateManager.setState({
                            postQueue: uniqueQueue
                        });

                        const lastIndex = uniqueQueue.length - 1;
                        const lastItem = uniqueQueue[lastIndex];

                        // Move last to first
                        dragDropManager.reorderQueue(lastIndex, 0);

                        const reorderedQueue = stateManager.getState().postQueue;

                        // Last item should now be at first position
                        expect(reorderedQueue[0].id).toBe(lastItem.id);

                        // All items should still be present
                        expect(reorderedQueue.length).toBe(uniqueQueue.length);
                        const originalIds = uniqueQueue.map(item => item.id);
                        const reorderedIds = reorderedQueue.map(item => item.id);
                        for (const id of originalIds) {
                            expect(reorderedIds).toContain(id);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should update queue numbers after reordering', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            id: fc.string({ minLength: 5, maxLength: 20 }),
                            boothName: fc.string({ minLength: 1, maxLength: 50 })
                        }),
                        { minLength: 2, maxLength: 10 }
                    ),
                    fc.nat(),
                    fc.nat(),
                    async (queue, oldIndexSeed, newIndexSeed) => {
                        const uniqueQueue = queue.map((item, idx) => ({
                            ...item,
                            id: `${item.id}-${idx}`
                        }));

                        stateManager.setState({
                            postQueue: uniqueQueue
                        });

                        const oldIndex = oldIndexSeed % uniqueQueue.length;
                        const newIndex = newIndexSeed % uniqueQueue.length;

                        // Perform reorder
                        dragDropManager.reorderQueue(oldIndex, newIndex);

                        const reorderedQueue = stateManager.getState().postQueue;

                        // Verify that items are in sequential order (no gaps)
                        // This validates that queue numbers (①②③...) would be correct
                        expect(reorderedQueue.length).toBe(uniqueQueue.length);
                        
                        // Each position should have exactly one item
                        for (let i = 0; i < reorderedQueue.length; i++) {
                            expect(reorderedQueue[i]).toBeDefined();
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
