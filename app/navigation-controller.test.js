/**
 * Navigation Controller Property-Based Tests
 * Feature: photo-posting-speedup, Property 4: Navigation State Preservation
 * Validates: Requirements 2.2, 2.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { NavigationController } from './navigation-controller.js';
import { StateManager } from './state-manager.js';

describe('NavigationController', () => {
    let stateManager;
    let navigationController;
    let appState;

    beforeEach(() => {
        // 新しいStateManagerとNavigationControllerを作成
        stateManager = new StateManager();
        navigationController = new NavigationController(stateManager);

        // テスト用のアプリケーション状態を作成
        appState = {
            currentStep: 1,
            eventInfo: {
                eventEn: 'Test Event',
                eventJp: 'テストイベント',
                date: '2025.01.01',
                venue: 'Test Venue',
                category: 'ブース',
                hashtags: '#test'
            },
            postQueue: [],
            selectedIndices: [],
            editingIndex: null
        };

        stateManager.setState(appState);
    });

    describe('Basic Navigation', () => {
        it('should navigate between steps', () => {
            expect(navigationController.getCurrentStep()).toBe(1);

            const success = navigationController.goToStep(2, { force: true });
            expect(success).toBe(true);
            expect(navigationController.getCurrentStep()).toBe(2);

            const backSuccess = navigationController.goToStep(1, { force: true });
            expect(backSuccess).toBe(true);
            expect(navigationController.getCurrentStep()).toBe(1);
        });

        it('should not navigate to the same step', () => {
            const success = navigationController.goToStep(1);
            expect(success).toBe(true);
            expect(navigationController.getCurrentStep()).toBe(1);
        });

        it('should check if navigation is possible', () => {
            expect(navigationController.canNavigate(1)).toBe(true);
            expect(navigationController.canNavigate(2)).toBe(true); // イベント情報がある

            // イベント情報をクリア
            appState.eventInfo = { eventEn: '', eventJp: '' };
            expect(navigationController.canNavigate(2)).toBe(false);
        });
    });

    describe('Property 4: Navigation State Preservation', () => {
        /**
         * Property 4: Navigation State Preservation
         * For any Post_Queue state, navigating from Step 2 to Step 1 and back to Step 2
         * SHALL preserve all queue items with identical data.
         * 
         * Validates: Requirements 2.2, 2.4
         */
        it('should preserve queue state when navigating back and forth', () => {
            fc.assert(
                fc.property(
                    // Generate random post queue
                    fc.array(
                        fc.record({
                            id: fc.string(),
                            imageFile: fc.constant(null),
                            imageBase64: fc.oneof(fc.constant(null), fc.string()),
                            boothName: fc.string(),
                            boothAccount: fc.string(),
                            personRole: fc.constantFrom('モデル', 'RQ', 'コンパニオン', 'コスプレイヤー'),
                            personName: fc.string(),
                            personAccount: fc.string(),
                            aiComment: fc.string(),
                            status: fc.constantFrom('draft', 'ready', 'sent')
                        }),
                        { minLength: 0, maxLength: 10 }
                    ),
                    (postQueue) => {
                        // Setup: Start at Step 2 with a queue
                        appState.currentStep = 2;
                        appState.postQueue = postQueue;

                        // Clone the original queue for comparison
                        const originalQueue = JSON.parse(JSON.stringify(postQueue));

                        // Action: Navigate to Step 1 (preserving queue)
                        const toStep1 = navigationController.goToStep(1, { 
                            preserveQueue: true, 
                            force: true 
                        });
                        expect(toStep1).toBe(true);
                        expect(navigationController.getCurrentStep()).toBe(1);

                        // Action: Navigate back to Step 2
                        const toStep2 = navigationController.goToStep(2, { 
                            preserveQueue: true, 
                            force: true 
                        });
                        expect(toStep2).toBe(true);
                        expect(navigationController.getCurrentStep()).toBe(2);

                        // Assertion: Queue should be identical
                        const restoredQueue = appState.postQueue;
                        expect(restoredQueue).toEqual(originalQueue);

                        // Verify all items are preserved
                        expect(restoredQueue.length).toBe(originalQueue.length);
                        
                        for (let i = 0; i < originalQueue.length; i++) {
                            expect(restoredQueue[i].id).toBe(originalQueue[i].id);
                            expect(restoredQueue[i].boothName).toBe(originalQueue[i].boothName);
                            expect(restoredQueue[i].personName).toBe(originalQueue[i].personName);
                            expect(restoredQueue[i].status).toBe(originalQueue[i].status);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should preserve selected indices when navigating', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 0, maxLength: 5 }),
                    (selectedIndices) => {
                        // Setup: Start at Step 2 with selected indices
                        appState.currentStep = 2;
                        appState.selectedIndices = [...new Set(selectedIndices)]; // Remove duplicates

                        const originalIndices = [...appState.selectedIndices];

                        // Action: Navigate to Step 1 and back
                        navigationController.goToStep(1, { preserveQueue: true, force: true });
                        navigationController.goToStep(2, { preserveQueue: true, force: true });

                        // Assertion: Selected indices should be preserved
                        expect(appState.selectedIndices).toEqual(originalIndices);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should preserve editing index when navigating', () => {
            fc.assert(
                fc.property(
                    fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 9 })),
                    (editingIndex) => {
                        // Setup: Start at Step 2 with an editing index
                        appState.currentStep = 2;
                        appState.editingIndex = editingIndex;

                        const originalEditingIndex = editingIndex;

                        // Action: Navigate to Step 1 and back
                        navigationController.goToStep(1, { preserveQueue: true, force: true });
                        navigationController.goToStep(2, { preserveQueue: true, force: true });

                        // Assertion: Editing index should be preserved
                        expect(appState.editingIndex).toBe(originalEditingIndex);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Unsaved Changes Detection', () => {
        it('should detect unsaved changes in draft posts', () => {
            appState.postQueue = [
                { status: 'draft', boothName: 'Test' }
            ];
            expect(navigationController.hasUnsavedChanges()).toBe(true);
        });

        it('should detect unsaved changes in ready posts', () => {
            appState.postQueue = [
                { status: 'ready', boothName: 'Test' }
            ];
            expect(navigationController.hasUnsavedChanges()).toBe(true);
        });

        it('should not detect unsaved changes when all posts are sent', () => {
            appState.postQueue = [
                { status: 'sent', boothName: 'Test' }
            ];
            expect(navigationController.hasUnsavedChanges()).toBe(false);
        });

        it('should not detect unsaved changes when queue is empty', () => {
            appState.postQueue = [];
            expect(navigationController.hasUnsavedChanges()).toBe(false);
        });
    });

    describe('Queue State Management', () => {
        it('should save and restore queue state', () => {
            const testQueue = [
                {
                    id: '1',
                    boothName: 'Test Booth',
                    personName: 'Test Person',
                    status: 'draft'
                }
            ];

            appState.postQueue = testQueue;
            navigationController.saveQueueState();

            // Modify the queue
            appState.postQueue = [];

            // Restore
            navigationController.restoreQueueState();

            expect(appState.postQueue).toEqual(testQueue);
        });

        it('should handle empty queue state', () => {
            appState.postQueue = [];
            navigationController.saveQueueState();

            appState.postQueue = [{ id: '1', boothName: 'Test' }];
            navigationController.restoreQueueState();

            expect(appState.postQueue).toEqual([]);
        });
    });

    describe('Edge Cases', () => {
        it('should handle navigation without preserving queue', () => {
            appState.currentStep = 2;
            appState.postQueue = [{ id: '1', boothName: 'Test' }];

            navigationController.goToStep(1, { preserveQueue: false, force: true });
            
            // Queue should not be saved
            expect(navigationController.savedQueueState).toBeNull();
        });

        it('should handle navigation when no saved state exists', () => {
            appState.currentStep = 1;
            navigationController.savedQueueState = null;

            const success = navigationController.goToStep(2, { preserveQueue: true, force: true });
            
            expect(success).toBe(true);
            expect(navigationController.getCurrentStep()).toBe(2);
        });

        it('should handle deep cloning of complex queue items', () => {
            const complexQueue = [
                {
                    id: '1',
                    boothName: 'Test',
                    eventInfo: {
                        eventEn: 'Event',
                        nested: {
                            deep: 'value'
                        }
                    },
                    tags: ['tag1', 'tag2']
                }
            ];

            appState.postQueue = complexQueue;
            navigationController.saveQueueState();

            // Modify original
            appState.postQueue[0].boothName = 'Modified';
            appState.postQueue[0].eventInfo.nested.deep = 'changed';

            // Restore
            navigationController.restoreQueueState();

            // Should be original values
            expect(appState.postQueue[0].boothName).toBe('Test');
            expect(appState.postQueue[0].eventInfo.nested.deep).toBe('value');
        });
    });
});
