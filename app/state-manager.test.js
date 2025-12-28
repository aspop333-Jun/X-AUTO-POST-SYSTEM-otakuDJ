/**
 * Property-Based Tests for State Manager
 * Feature: photo-posting-speedup
 * 
 * Tests undo/redo consistency and state persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { StateManager } from './state-manager.js';

describe('State Manager', () => {
  let stateManager;
  let mockState;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Create a fresh StateManager instance
    stateManager = new StateManager();

    // Create a mock state
    mockState = {
      currentStep: 1,
      eventInfo: {
        eventEn: 'Test Event',
        eventJp: 'テストイベント',
        date: '2024-01-01',
        venue: 'Test Venue',
        category: 'ブース',
        hashtags: '#test'
      },
      postQueue: [],
      selectedIndices: [],
      editingIndex: null
    };

    // Set the state
    stateManager.setState(mockState);
  });

  afterEach(() => {
    // Stop auto-save to prevent interference
    stateManager.stopAutoSave();
  });

  describe('Basic Undo/Redo Operations', () => {
    it('should push undo actions', () => {
      const previousState = { postQueue: [] };
      const newState = { postQueue: [{ id: '1', name: 'Test' }] };

      stateManager.pushUndo('ADD_ITEM', previousState, newState);

      expect(stateManager.canUndo()).toBe(true);
      expect(stateManager.canRedo()).toBe(false);
    });

    it('should undo an action', () => {
      const previousState = { postQueue: [] };
      const newState = { postQueue: [{ id: '1', name: 'Test' }] };

      mockState.postQueue = [{ id: '1', name: 'Test' }];
      stateManager.pushUndo('ADD_ITEM', previousState, newState);

      const result = stateManager.undo();

      expect(result).toBe(true);
      expect(mockState.postQueue).toEqual([]);
      expect(stateManager.canRedo()).toBe(true);
    });

    it('should redo an action', () => {
      const previousState = { postQueue: [] };
      const newState = { postQueue: [{ id: '1', name: 'Test' }] };

      mockState.postQueue = [{ id: '1', name: 'Test' }];
      stateManager.pushUndo('ADD_ITEM', previousState, newState);
      stateManager.undo();

      const result = stateManager.redo();

      expect(result).toBe(true);
      expect(mockState.postQueue).toEqual([{ id: '1', name: 'Test' }]);
    });

    it('should clear redo stack when new action is pushed', () => {
      const previousState1 = { postQueue: [] };
      const newState1 = { postQueue: [{ id: '1' }] };
      const previousState2 = { postQueue: [{ id: '1' }] };
      const newState2 = { postQueue: [{ id: '1' }, { id: '2' }] };

      stateManager.pushUndo('ADD_ITEM', previousState1, newState1);
      stateManager.undo();

      expect(stateManager.canRedo()).toBe(true);

      stateManager.pushUndo('ADD_ITEM', previousState2, newState2);

      expect(stateManager.canRedo()).toBe(false);
    });

    it('should limit undo stack size', () => {
      // Push more than maxUndoHistory actions
      for (let i = 0; i < 15; i++) {
        const previousState = { postQueue: Array(i).fill({ id: i }) };
        const newState = { postQueue: Array(i + 1).fill({ id: i + 1 }) };
        stateManager.pushUndo(`ACTION_${i}`, previousState, newState);
      }

      // Stack should be limited to maxUndoHistory (10)
      expect(stateManager.undoStack.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Property 6: Undo/Redo Consistency', () => {
    /**
     * Feature: photo-posting-speedup, Property 6: Undo/Redo Consistency
     * Validates: Requirements 22.3, 22.4
     * 
     * For any sequence of state changes followed by undo operations,
     * the state after N undos SHALL match the state before the last N changes.
     */
    it('should maintain consistency after arbitrary undo/redo sequences', () => {
      fc.assert(
        fc.property(
          // Generate a sequence of state changes (array of post queue modifications)
          fc.array(
            fc.record({
              action: fc.constantFrom('ADD', 'REMOVE', 'UPDATE'),
              item: fc.record({
                id: fc.uuid(),
                boothName: fc.string({ maxLength: 50 }),
                personName: fc.string({ maxLength: 50 }),
                status: fc.constantFrom('draft', 'ready', 'sent', 'failed')
              })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (actions) => {
            // Reset state
            mockState.postQueue = [];
            const initialQueue = [];

            // Apply all actions and record states
            const states = [[]]; // Initial state

            actions.forEach((action, index) => {
              const previousQueue = [...mockState.postQueue];

              if (action.action === 'ADD') {
                mockState.postQueue.push(action.item);
              } else if (action.action === 'REMOVE' && mockState.postQueue.length > 0) {
                mockState.postQueue.pop();
              } else if (action.action === 'UPDATE' && mockState.postQueue.length > 0) {
                const lastIndex = mockState.postQueue.length - 1;
                mockState.postQueue[lastIndex] = { ...mockState.postQueue[lastIndex], ...action.item };
              }

              const newQueue = [...mockState.postQueue];

              // Push to undo stack
              stateManager.pushUndo(
                `ACTION_${index}`,
                { postQueue: previousQueue },
                { postQueue: newQueue }
              );

              states.push([...newQueue]);
            });

            // Now undo all actions
            const numActions = actions.length;
            for (let i = 0; i < numActions; i++) {
              stateManager.undo();
            }

            // After undoing all actions, state should match initial state
            expect(mockState.postQueue).toEqual(initialQueue);

            // Redo all actions
            for (let i = 0; i < numActions; i++) {
              stateManager.redo();
            }

            // After redoing all actions, state should match final state
            expect(mockState.postQueue).toEqual(states[states.length - 1]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency with partial undo sequences', () => {
      fc.assert(
        fc.property(
          // Generate actions and number of undos
          fc.tuple(
            fc.array(
              fc.record({
                id: fc.uuid(),
                name: fc.string({ maxLength: 30 })
              }),
              { minLength: 2, maxLength: 10 }
            ),
            fc.integer({ min: 1, max: 5 })
          ),
          ([items, numUndos]) => {
            // Reset state
            mockState.postQueue = [];
            const states = [[]];

            // Add items one by one
            items.forEach((item, index) => {
              const previousQueue = [...mockState.postQueue];
              mockState.postQueue.push(item);
              const newQueue = [...mockState.postQueue];

              stateManager.pushUndo(
                `ADD_${index}`,
                { postQueue: previousQueue },
                { postQueue: newQueue }
              );

              states.push([...newQueue]);
            });

            // Undo N times (but not more than available)
            const actualUndos = Math.min(numUndos, items.length);
            for (let i = 0; i < actualUndos; i++) {
              stateManager.undo();
            }

            // State should match the state before the last N actions
            const expectedStateIndex = items.length - actualUndos;
            expect(mockState.postQueue).toEqual(states[expectedStateIndex]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle undo/redo with complex state objects', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              currentStep: fc.constantFrom(1, 2),
              eventInfo: fc.record({
                eventEn: fc.string({ maxLength: 50 }),
                eventJp: fc.string({ maxLength: 50 }),
                date: fc.string({ maxLength: 20 }),
                venue: fc.string({ maxLength: 50 })
              }),
              postQueue: fc.array(
                fc.record({
                  id: fc.uuid(),
                  boothName: fc.string({ maxLength: 30 }),
                  personName: fc.string({ maxLength: 30 })
                }),
                { maxLength: 5 }
              )
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (stateSequence) => {
            // Apply state changes
            stateSequence.forEach((state, index) => {
              const previousState = stateManager.deepClone(mockState);
              Object.assign(mockState, state);
              const newState = stateManager.deepClone(mockState);

              stateManager.pushUndo(`STATE_${index}`, previousState, newState);
            });

            // Undo all
            const numChanges = stateSequence.length;
            for (let i = 0; i < numChanges; i++) {
              stateManager.undo();
            }

            // Redo all
            for (let i = 0; i < numChanges; i++) {
              stateManager.redo();
            }

            // Final state should match last state in sequence
            const lastState = stateSequence[stateSequence.length - 1];
            expect(mockState.currentStep).toBe(lastState.currentStep);
            expect(mockState.eventInfo).toEqual(lastState.eventInfo);
            expect(mockState.postQueue).toEqual(lastState.postQueue);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('State Persistence', () => {
    it('should save state to localStorage', () => {
      mockState.postQueue = [{ id: '1', name: 'Test' }];

      const result = stateManager.save();

      expect(result).toBe(true);
      expect(localStorage.getItem('autopost_app_state')).not.toBe(null);
    });

    it('should restore state from localStorage', () => {
      const savedState = {
        currentStep: 2,
        eventInfo: {
          eventEn: 'Saved Event',
          eventJp: '保存イベント',
          date: '2024-02-01',
          venue: 'Saved Venue',
          category: 'ブース',
          hashtags: '#saved'
        },
        postQueue: [{ id: '1', name: 'Saved Item' }],
        selectedIndices: [0],
        editingIndex: 0,
        timestamp: Date.now()
      };

      localStorage.setItem('autopost_app_state', JSON.stringify(savedState));

      const restored = stateManager.restore();

      expect(restored).not.toBe(null);
      expect(restored.currentStep).toBe(2);
      expect(restored.eventInfo.eventEn).toBe('Saved Event');
      expect(restored.postQueue).toEqual([{ id: '1', name: 'Saved Item' }]);
    });

    it('should ignore old saved states', () => {
      const oldState = {
        currentStep: 2,
        eventInfo: {},
        postQueue: [],
        selectedIndices: [],
        editingIndex: null,
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      };

      localStorage.setItem('autopost_app_state', JSON.stringify(oldState));

      const restored = stateManager.restore();

      expect(restored).toBe(null);
    });

    it('should handle corrupted saved state', () => {
      localStorage.setItem('autopost_app_state', '{invalid json}');

      const restored = stateManager.restore();

      expect(restored).toBe(null);
    });

    it('should clear saved state', () => {
      stateManager.save();
      expect(localStorage.getItem('autopost_app_state')).not.toBe(null);

      stateManager.clearSaved();
      expect(localStorage.getItem('autopost_app_state')).toBe(null);
    });
  });

  describe('Auto-save', () => {
    it('should start and stop auto-save', () => {
      stateManager.startAutoSave();
      expect(stateManager.autoSaveTimer).not.toBe(null);

      stateManager.stopAutoSave();
      expect(stateManager.autoSaveTimer).toBe(null);
    });

    it('should auto-save at intervals', async () => {
      vi.useFakeTimers();

      const saveSpy = vi.spyOn(stateManager, 'save');

      stateManager.startAutoSave();

      // Fast-forward time by 5 seconds
      vi.advanceTimersByTime(5000);

      expect(saveSpy).toHaveBeenCalledTimes(1);

      // Fast-forward another 5 seconds
      vi.advanceTimersByTime(5000);

      expect(saveSpy).toHaveBeenCalledTimes(2);

      stateManager.stopAutoSave();
      vi.useRealTimers();
    });
  });

  describe('State Listeners', () => {
    it('should notify listeners on state change', () => {
      const listener = vi.fn();
      stateManager.subscribe(listener);

      stateManager.notifyListeners();

      expect(listener).toHaveBeenCalledWith(mockState);
    });

    it('should unsubscribe listeners', () => {
      const listener = vi.fn();
      const unsubscribe = stateManager.subscribe(listener);

      unsubscribe();
      stateManager.notifyListeners();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      stateManager.subscribe(errorListener);
      stateManager.subscribe(normalListener);

      // Should not throw
      expect(() => stateManager.notifyListeners()).not.toThrow();

      // Normal listener should still be called
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('Deep Clone', () => {
    it('should deep clone objects', () => {
      const original = {
        a: 1,
        b: { c: 2, d: [3, 4] },
        e: new Date('2024-01-01')
      };

      const cloned = stateManager.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.b.d).not.toBe(original.b.d);
    });

    it('should handle null and primitives', () => {
      expect(stateManager.deepClone(null)).toBe(null);
      expect(stateManager.deepClone(42)).toBe(42);
      expect(stateManager.deepClone('test')).toBe('test');
      expect(stateManager.deepClone(true)).toBe(true);
    });
  });
});
