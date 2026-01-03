/**
 * Touch Gestures Module
 * Implements swipe actions and touch-based drag-and-drop for mobile devices
 * Requirements: 15.3, 18.1, 18.2, 18.3, 18.4
 */

class TouchGestureManager {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.activeElement = null;
        this.swipeThreshold = 50; // Minimum distance for swipe
        this.swipeTimeout = 300; // Maximum time for swipe (ms)
        this.currentSwipedItem = null;
        
        // Touch drag-and-drop state
        this.isDragging = false;
        this.dragElement = null;
        this.dragClone = null;
        this.dragStartY = 0;
        this.dragCurrentY = 0;
        this.dropTargetIndex = null;
    }

    /**
     * Initialize touch gesture handlers
     */
    init() {
        // Only initialize on touch devices
        if (!('ontouchstart' in window)) {
            return;
        }

        this.initSwipeGestures();
        this.initTouchDragDrop();
        
        console.log('Touch gestures initialized');
    }

    /**
     * Initialize swipe gesture handlers for queue items
     * Requirements: 18.1, 18.2, 18.3, 18.4
     */
    initSwipeGestures() {
        const queueContainer = document.getElementById('post-queue');
        if (!queueContainer) return;

        // Use event delegation for dynamically added queue items
        queueContainer.addEventListener('touchstart', (e) => {
            const queueItem = e.target.closest('.queue-item');
            if (!queueItem) return;

            this.handleSwipeStart(e, queueItem);
        }, { passive: true });

        queueContainer.addEventListener('touchmove', (e) => {
            if (!this.activeElement) return;
            this.handleSwipeMove(e);
        }, { passive: false });

        queueContainer.addEventListener('touchend', (e) => {
            if (!this.activeElement) return;
            this.handleSwipeEnd(e);
        }, { passive: true });

        queueContainer.addEventListener('touchcancel', () => {
            this.resetSwipe();
        }, { passive: true });
    }

    /**
     * Handle swipe start
     */
    handleSwipeStart(e, element) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
        this.activeElement = element;
    }

    /**
     * Handle swipe move
     */
    handleSwipeMove(e) {
        if (!this.activeElement) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;

        // Only handle horizontal swipes (ignore vertical scrolling)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            e.preventDefault(); // Prevent scrolling during swipe

            // Apply transform to show swipe
            this.activeElement.style.transform = `translateX(${deltaX}px)`;
            this.activeElement.style.transition = 'none';

            // Show swipe indicators
            if (deltaX < -30) {
                this.activeElement.classList.add('swiping-left');
                this.activeElement.classList.remove('swiping-right');
            } else if (deltaX > 30) {
                this.activeElement.classList.add('swiping-right');
                this.activeElement.classList.remove('swiping-left');
            } else {
                this.activeElement.classList.remove('swiping-left', 'swiping-right');
            }
        }
    }

    /**
     * Handle swipe end
     */
    handleSwipeEnd(e) {
        if (!this.activeElement) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const deltaTime = Date.now() - this.touchStartTime;

        // Check if it's a valid swipe (horizontal, fast enough, long enough)
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
        const isFastEnough = deltaTime < this.swipeTimeout;
        const isLongEnough = Math.abs(deltaX) > this.swipeThreshold;

        if (isHorizontalSwipe && isFastEnough && isLongEnough) {
            if (deltaX < 0) {
                // Swipe left - show action buttons
                this.handleSwipeLeft(this.activeElement);
            } else {
                // Swipe right - toggle status
                this.handleSwipeRight(this.activeElement);
            }
        } else {
            // Not a valid swipe, reset
            this.resetSwipe();
        }
    }

    /**
     * Handle swipe left - reveal action buttons
     * Requirement: 18.1
     */
    handleSwipeLeft(element) {
        // Close any other swiped items
        if (this.currentSwipedItem && this.currentSwipedItem !== element) {
            this.closeSwipeActions(this.currentSwipedItem);
        }

        // Add swipe actions if not already present
        if (!element.querySelector('.swipe-actions')) {
            this.addSwipeActions(element);
        }

        // Animate to reveal actions
        element.style.transition = 'transform 0.3s ease';
        element.style.transform = 'translateX(-180px)';
        element.classList.add('swiped-left');
        element.classList.remove('swiping-left', 'swiping-right');

        // Haptic feedback if available
        this.triggerHaptic();

        this.currentSwipedItem = element;
        this.activeElement = null;

        // Close swipe actions when clicking outside
        setTimeout(() => {
            document.addEventListener('touchstart', this.handleOutsideTouch.bind(this), { once: true });
        }, 100);
    }

    /**
     * Handle swipe right - toggle status
     * Requirement: 18.2
     */
    handleSwipeRight(element) {
        const index = parseInt(element.dataset.index);
        if (isNaN(index)) {
            this.resetSwipe();
            return;
        }

        // Get current post
        const post = window.postQueue[index];
        if (!post) {
            this.resetSwipe();
            return;
        }

        // Toggle status: draft <-> ready
        const newStatus = post.status === 'draft' ? 'ready' : 'draft';
        post.status = newStatus;

        // Update UI
        window.renderQueue();

        // Show feedback
        this.showSwipeFeedback(element, newStatus === 'ready' ? '✓ Ready' : '○ Draft');

        // Haptic feedback
        this.triggerHaptic();

        // Reset
        this.resetSwipe();
    }

    /**
     * Add swipe action buttons to element
     */
    addSwipeActions(element) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'swipe-actions';
        actionsDiv.innerHTML = `
            <button class="swipe-action-btn swipe-edit" data-action="edit">
                <span class="swipe-action-icon">✏️</span>
                <span class="swipe-action-label">Edit</span>
            </button>
            <button class="swipe-action-btn swipe-delete" data-action="delete">
                <span class="swipe-action-icon">🗑️</span>
                <span class="swipe-action-label">Delete</span>
            </button>
            <button class="swipe-action-btn swipe-send" data-action="send">
                <span class="swipe-action-icon">📤</span>
                <span class="swipe-action-label">Send</span>
            </button>
        `;

        element.appendChild(actionsDiv);

        // Add event listeners to action buttons
        actionsDiv.querySelectorAll('.swipe-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const index = parseInt(element.dataset.index);
                this.handleSwipeAction(action, index);
            });
        });
    }

    /**
     * Handle swipe action button click
     */
    handleSwipeAction(action, index) {
        switch (action) {
            case 'edit':
                window.openEditModal(index);
                break;
            case 'delete':
                if (confirm('この投稿を削除しますか？')) {
                    window.postQueue.splice(index, 1);
                    window.renderQueue();
                }
                break;
            case 'send':
                // Trigger send for this post
                if (window.sendPost) {
                    window.sendPost(index);
                }
                break;
        }

        this.closeSwipeActions(this.currentSwipedItem);
    }

    /**
     * Close swipe actions
     */
    closeSwipeActions(element) {
        if (!element) return;

        element.style.transition = 'transform 0.3s ease';
        element.style.transform = 'translateX(0)';
        element.classList.remove('swiped-left');

        // Remove swipe actions after animation
        setTimeout(() => {
            const actions = element.querySelector('.swipe-actions');
            if (actions) {
                actions.remove();
            }
        }, 300);

        if (this.currentSwipedItem === element) {
            this.currentSwipedItem = null;
        }
    }

    /**
     * Handle touch outside swiped item
     */
    handleOutsideTouch(e) {
        if (this.currentSwipedItem && !this.currentSwipedItem.contains(e.target)) {
            this.closeSwipeActions(this.currentSwipedItem);
        }
    }

    /**
     * Reset swipe state
     */
    resetSwipe() {
        if (this.activeElement) {
            this.activeElement.style.transition = 'transform 0.3s ease';
            this.activeElement.style.transform = 'translateX(0)';
            this.activeElement.classList.remove('swiping-left', 'swiping-right');
            this.activeElement = null;
        }
    }

    /**
     * Show swipe feedback
     */
    showSwipeFeedback(element, message) {
        const feedback = document.createElement('div');
        feedback.className = 'swipe-feedback';
        feedback.textContent = message;
        element.appendChild(feedback);

        setTimeout(() => {
            feedback.classList.add('show');
        }, 10);

        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => feedback.remove(), 300);
        }, 1500);
    }

    /**
     * Initialize touch-based drag and drop
     * Requirement: 15.3
     */
    initTouchDragDrop() {
        const queueContainer = document.getElementById('post-queue');
        if (!queueContainer) return;

        queueContainer.addEventListener('touchstart', (e) => {
            const queueItem = e.target.closest('.queue-item');
            if (!queueItem || queueItem.classList.contains('swiped-left')) return;

            // Check if touch is on drag handle area (left side)
            const touch = e.touches[0];
            const rect = queueItem.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;

            // Only start drag if touching the left 80px (number + thumbnail area)
            if (touchX < 80) {
                this.handleDragStart(e, queueItem);
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                this.handleDragMove(e);
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (this.isDragging) {
                this.handleDragEnd(e);
            }
        }, { passive: true });

        document.addEventListener('touchcancel', () => {
            if (this.isDragging) {
                this.cancelDrag();
            }
        }, { passive: true });
    }

    /**
     * Handle drag start
     */
    handleDragStart(e, element) {
        // Prevent if already swiped
        if (element.classList.contains('swiped-left')) return;

        const touch = e.touches[0];
        this.dragStartY = touch.clientY;
        this.dragCurrentY = touch.clientY;
        this.dragElement = element;

        // Wait a bit to distinguish between tap and drag
        this.dragTimeout = setTimeout(() => {
            this.isDragging = true;
            this.createDragClone(element, touch);
            element.classList.add('dragging-touch');
            this.triggerHaptic();
        }, 200);
    }

    /**
     * Create visual clone for dragging
     */
    createDragClone(element, touch) {
        this.dragClone = element.cloneNode(true);
        this.dragClone.classList.add('drag-clone-touch');
        this.dragClone.style.position = 'fixed';
        this.dragClone.style.width = element.offsetWidth + 'px';
        this.dragClone.style.left = element.getBoundingClientRect().left + 'px';
        this.dragClone.style.top = touch.clientY - (element.offsetHeight / 2) + 'px';
        this.dragClone.style.zIndex = '10000';
        this.dragClone.style.opacity = '0.9';
        this.dragClone.style.pointerEvents = 'none';
        document.body.appendChild(this.dragClone);
    }

    /**
     * Handle drag move
     */
    handleDragMove(e) {
        if (!this.isDragging) {
            // Check if moved enough to start drag
            const touch = e.touches[0];
            const deltaY = Math.abs(touch.clientY - this.dragStartY);
            if (deltaY > 10) {
                clearTimeout(this.dragTimeout);
            }
            return;
        }

        e.preventDefault();

        const touch = e.touches[0];
        this.dragCurrentY = touch.clientY;

        // Update clone position
        if (this.dragClone) {
            const elementHeight = this.dragElement.offsetHeight;
            this.dragClone.style.top = (touch.clientY - elementHeight / 2) + 'px';
        }

        // Find drop target
        this.updateDropTarget(touch.clientY);
    }

    /**
     * Update drop target indicator
     */
    updateDropTarget(clientY) {
        const queueItems = Array.from(document.querySelectorAll('.queue-item:not(.dragging-touch)'));
        let closestItem = null;
        let closestDistance = Infinity;
        let insertBefore = true;

        queueItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            const itemCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(clientY - itemCenterY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestItem = item;
                insertBefore = clientY < itemCenterY;
            }
        });

        // Remove previous indicators
        document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        // Add new indicator
        if (closestItem) {
            if (insertBefore) {
                closestItem.classList.add('drag-over-top');
            } else {
                closestItem.classList.add('drag-over-bottom');
            }
            this.dropTargetIndex = parseInt(closestItem.dataset.index);
            if (!insertBefore) {
                this.dropTargetIndex++;
            }
        }
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        clearTimeout(this.dragTimeout);

        if (!this.isDragging) {
            return;
        }

        // Perform reorder
        if (this.dropTargetIndex !== null && this.dragElement) {
            const fromIndex = parseInt(this.dragElement.dataset.index);
            if (!isNaN(fromIndex) && fromIndex !== this.dropTargetIndex) {
                this.reorderQueue(fromIndex, this.dropTargetIndex);
                this.triggerHaptic();
            }
        }

        this.cancelDrag();
    }

    /**
     * Cancel drag operation
     */
    cancelDrag() {
        this.isDragging = false;

        if (this.dragElement) {
            this.dragElement.classList.remove('dragging-touch');
            this.dragElement = null;
        }

        if (this.dragClone) {
            this.dragClone.remove();
            this.dragClone = null;
        }

        // Remove drop indicators
        document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        this.dropTargetIndex = null;
        this.dragStartY = 0;
        this.dragCurrentY = 0;
    }

    /**
     * Reorder queue items
     */
    reorderQueue(fromIndex, toIndex) {
        if (!window.postQueue) return;

        // Adjust toIndex if moving down
        if (toIndex > fromIndex) {
            toIndex--;
        }

        // Perform reorder
        const item = window.postQueue.splice(fromIndex, 1)[0];
        window.postQueue.splice(toIndex, 0, item);

        // Re-render queue
        if (window.renderQueue) {
            window.renderQueue();
        }

        // Save state
        if (window.stateManager && window.stateManager.save) {
            window.stateManager.save();
        }
    }

    /**
     * Trigger haptic feedback if available
     * Requirement: 18.3
     */
    triggerHaptic() {
        if (navigator.vibrate) {
            navigator.vibrate(10); // Short vibration
        }
    }

    /**
     * Cleanup - remove all event listeners
     */
    destroy() {
        if (this.currentSwipedItem) {
            this.closeSwipeActions(this.currentSwipedItem);
        }
        if (this.isDragging) {
            this.cancelDrag();
        }
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.touchGestureManager = new TouchGestureManager();
        window.touchGestureManager.init();
    });
} else {
    window.touchGestureManager = new TouchGestureManager();
    window.touchGestureManager.init();
}
