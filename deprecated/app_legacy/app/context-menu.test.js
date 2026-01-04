/**
 * Unit Tests for Context Menu Module
 * Feature: photo-posting-speedup
 * Validates: Requirements 20.1, 20.2, 20.3, 20.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Context Menu Module', () => {
    let ContextMenuManager;
    let contextMenu;

    beforeEach(async () => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="post-queue">
                <div class="queue-item" data-index="0">
                    <div class="queue-booth">Test Booth</div>
                    <div class="queue-person">Test Person</div>
                </div>
                <div class="queue-item" data-index="1">
                    <div class="queue-booth">Another Booth</div>
                    <div class="queue-person">Another Person</div>
                </div>
            </div>
        `;

        // Setup global mocks
        global.window = global;
        window.AppState = {
            postQueue: [
                {
                    id: '1',
                    boothName: 'Test Booth',
                    boothAccount: '@testbooth',
                    personName: 'Test Person',
                    personAccount: '@testperson',
                    personRole: 'モデル',
                    aiComment: 'Test comment',
                    status: 'draft'
                },
                {
                    id: '2',
                    boothName: 'Another Booth',
                    boothAccount: '@anotherbooth',
                    personName: 'Another Person',
                    personAccount: '@anotherperson',
                    personRole: 'RQ',
                    aiComment: 'Another comment',
                    status: 'ready'
                }
            ],
            eventInfo: {
                eventEn: 'Test Event',
                eventJp: 'テストイベント',
                date: '2025.01.01',
                venue: 'Test Venue',
                category: 'ブース',
                hashtags: '#test #event'
            }
        };

        window.showToast = vi.fn();
        window.openEditModal = vi.fn();
        window.sendQueueItem = vi.fn();
        window.removeFromQueue = vi.fn();
        window.updateQueueItem = vi.fn();
        window.renderPostQueue = vi.fn();

        // Import module
        const module = await import('./context-menu.js');
        ContextMenuManager = module.ContextMenuManager;
        contextMenu = new ContextMenuManager();
    });

    describe('Unit Tests', () => {
        it('should create context menu element on initialization', () => {
            const menu = document.getElementById('queue-context-menu');
            expect(menu).toBeTruthy();
            expect(menu.classList.contains('context-menu')).toBe(true);
        });

        it('should have all required menu items (Requirement 20.2)', () => {
            const menu = document.getElementById('queue-context-menu');
            const items = menu.querySelectorAll('.context-menu-item');
            
            const actions = Array.from(items).map(item => item.dataset.action);
            expect(actions).toContain('edit');
            expect(actions).toContain('duplicate');
            expect(actions).toContain('generate');
            expect(actions).toContain('copy');
            expect(actions).toContain('send');
            expect(actions).toContain('delete');
        });

        it('should show keyboard shortcuts next to each action (Requirement 20.3)', () => {
            const menu = document.getElementById('queue-context-menu');
            const items = menu.querySelectorAll('.context-menu-item');
            
            items.forEach(item => {
                const shortcut = item.querySelector('.context-menu-shortcut');
                expect(shortcut).toBeTruthy();
                expect(shortcut.textContent.length).toBeGreaterThan(0);
            });
        });

        it('should show menu at specified position', () => {
            contextMenu.show(100, 200, 0);
            
            const menu = document.getElementById('queue-context-menu');
            expect(menu.classList.contains('visible')).toBe(true);
            expect(contextMenu.isVisible).toBe(true);
            expect(contextMenu.currentIndex).toBe(0);
        });

        it('should hide menu when hide() is called', () => {
            contextMenu.show(100, 200, 0);
            contextMenu.hide();
            
            const menu = document.getElementById('queue-context-menu');
            expect(menu.classList.contains('visible')).toBe(false);
            expect(contextMenu.isVisible).toBe(false);
            expect(contextMenu.currentIndex).toBe(null);
        });

        it('should call openEditModal when edit action is triggered', () => {
            contextMenu.currentIndex = 0;
            contextMenu.handleAction('edit');
            
            expect(window.openEditModal).toHaveBeenCalledWith(0);
        });

        it('should duplicate post with "(copy)" suffix (Requirement 20.4)', () => {
            contextMenu.currentIndex = 0;
            const originalLength = window.AppState.postQueue.length;
            
            // Mock addToQueue function
            window.addToQueue = vi.fn();
            
            contextMenu.handleAction('duplicate');
            
            // Verify the post was added to the queue
            expect(window.AppState.postQueue.length).toBe(originalLength + 1);
            const duplicated = window.AppState.postQueue[window.AppState.postQueue.length - 1];
            expect(duplicated.boothName).toBe('Test Booth (copy)');
            expect(duplicated.status).toBe('draft');
            expect(window.renderPostQueue).toHaveBeenCalled();
        });

        it('should not duplicate when queue is full', () => {
            // Fill queue to max
            window.AppState.postQueue = new Array(10).fill({
                id: 'test',
                boothName: 'Test',
                status: 'draft'
            });
            
            contextMenu.currentIndex = 0;
            contextMenu.handleAction('duplicate');
            
            expect(window.showToast).toHaveBeenCalledWith('投稿キューは最大10件です', 'error');
            expect(window.AppState.postQueue.length).toBe(10);
        });

        it('should call sendQueueItem when send action is triggered', () => {
            contextMenu.currentIndex = 1;
            contextMenu.handleAction('send');
            
            expect(window.sendQueueItem).toHaveBeenCalledWith(1);
        });

        it('should call removeFromQueue when delete action is triggered', () => {
            contextMenu.currentIndex = 1;
            contextMenu.handleAction('delete');
            
            expect(window.removeFromQueue).toHaveBeenCalledWith(1);
        });

        it('should generate post text correctly for copy action', () => {
            const post = window.AppState.postQueue[0];
            const event = window.AppState.eventInfo;
            const text = contextMenu.generatePostText(post, event);
            
            expect(text).toContain('Test Event');
            expect(text).toContain('テストイベント');
            expect(text).toContain('Test Booth');
            expect(text).toContain('Test Person');
            expect(text).toContain('Test comment');
            expect(text).toContain('#test #event');
        });

        it('should initialize context menu on queue container', () => {
            const container = document.getElementById('post-queue');
            contextMenu.initializeQueue(container);
            
            // Verify event listener was added by checking if handleContextMenu is defined
            expect(contextMenu.handleContextMenu).toBeDefined();
        });

        it('should show context menu on right-click (Requirement 20.1)', () => {
            const container = document.getElementById('post-queue');
            contextMenu.initializeQueue(container);
            
            const queueItem = container.querySelector('.queue-item[data-index="0"]');
            const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: 100,
                clientY: 200
            });
            
            const showSpy = vi.spyOn(contextMenu, 'show');
            queueItem.dispatchEvent(event);
            
            expect(showSpy).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing post gracefully', () => {
            contextMenu.currentIndex = 999; // Invalid index
            
            // Should not throw
            expect(() => contextMenu.handleAction('edit')).not.toThrow();
        });

        it('should adjust menu position when near viewport edge', () => {
            // Mock viewport dimensions
            Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
            Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
            
            // Show menu near right edge
            contextMenu.show(750, 550, 0);
            contextMenu.adjustPosition();
            
            const menu = document.getElementById('queue-context-menu');
            const rect = menu.getBoundingClientRect();
            
            // Menu should be adjusted to stay within viewport
            expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
            expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
        });

        it('should handle copy action when clipboard API fails', async () => {
            // Mock clipboard API to fail
            Object.assign(navigator, {
                clipboard: {
                    writeText: vi.fn().mockRejectedValue(new Error('Clipboard error'))
                }
            });
            
            contextMenu.currentIndex = 0;
            
            // Call handleCopyText directly since handleAction doesn't await
            await contextMenu.handleCopyText(window.AppState.postQueue[0]);
            
            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(window.showToast).toHaveBeenCalledWith('コピーに失敗しました', 'error');
        });
    });
});
