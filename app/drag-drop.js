/**
 * Drag and Drop Queue Reordering Module
 * Handles drag and drop functionality for reordering post queue items
 */

export class DragDropManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.draggedElement = null;
        this.draggedIndex = null;
        this.placeholder = null;
    }

    /**
     * Initialize drag and drop for all queue items
     */
    initializeQueue(queueContainer) {
        if (!queueContainer) return;

        const items = queueContainer.querySelectorAll('.queue-item');
        items.forEach((item, index) => {
            this.makeItemDraggable(item, index);
        });
    }

    /**
     * Make a single queue item draggable
     */
    makeItemDraggable(item, index) {
        item.setAttribute('draggable', 'true');
        item.dataset.index = index;

        // Remove existing listeners to avoid duplicates
        item.removeEventListener('dragstart', this.handleDragStart);
        item.removeEventListener('dragend', this.handleDragEnd);
        item.removeEventListener('dragover', this.handleDragOver);
        item.removeEventListener('drop', this.handleDrop);
        item.removeEventListener('dragenter', this.handleDragEnter);
        item.removeEventListener('dragleave', this.handleDragLeave);

        // Add event listeners
        item.addEventListener('dragstart', this.handleDragStart.bind(this));
        item.addEventListener('dragend', this.handleDragEnd.bind(this));
        item.addEventListener('dragover', this.handleDragOver.bind(this));
        item.addEventListener('drop', this.handleDrop.bind(this));
        item.addEventListener('dragenter', this.handleDragEnter.bind(this));
        item.addEventListener('dragleave', this.handleDragLeave.bind(this));
    }

    /**
     * Handle drag start event
     */
    handleDragStart(e) {
        this.draggedElement = e.currentTarget;
        this.draggedIndex = parseInt(e.currentTarget.dataset.index);

        // Add dragging class for visual feedback
        e.currentTarget.classList.add('dragging');

        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);

        // Create placeholder
        this.createPlaceholder();
    }

    /**
     * Handle drag end event
     */
    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');

        // Remove placeholder
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.parentNode.removeChild(this.placeholder);
        }

        // Remove all drag-over classes
        document.querySelectorAll('.queue-item').forEach(item => {
            item.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
        });

        this.draggedElement = null;
        this.draggedIndex = null;
        this.placeholder = null;
    }

    /**
     * Handle drag over event
     */
    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }

        e.dataTransfer.dropEffect = 'move';

        const targetItem = e.currentTarget;
        if (targetItem === this.draggedElement) {
            return false;
        }

        // Determine if we should insert before or after
        const rect = targetItem.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const isTop = e.clientY < midpoint;

        // Remove previous drag-over classes
        document.querySelectorAll('.queue-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        // Add appropriate class
        if (isTop) {
            targetItem.classList.add('drag-over-top');
        } else {
            targetItem.classList.add('drag-over-bottom');
        }

        return false;
    }

    /**
     * Handle drag enter event
     */
    handleDragEnter(e) {
        const targetItem = e.currentTarget;
        if (targetItem !== this.draggedElement) {
            targetItem.classList.add('drag-over');
        }
    }

    /**
     * Handle drag leave event
     */
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    /**
     * Handle drop event
     */
    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        const targetItem = e.currentTarget;
        const targetIndex = parseInt(targetItem.dataset.index);

        if (this.draggedIndex !== targetIndex && this.draggedIndex !== null) {
            // Determine drop position
            const rect = targetItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const isTop = e.clientY < midpoint;

            // Calculate new index
            let newIndex = targetIndex;
            if (!isTop && targetIndex >= this.draggedIndex) {
                newIndex = targetIndex;
            } else if (isTop && targetIndex > this.draggedIndex) {
                newIndex = targetIndex - 1;
            } else if (!isTop && targetIndex < this.draggedIndex) {
                newIndex = targetIndex + 1;
            } else {
                newIndex = targetIndex;
            }

            // Perform reorder
            this.reorderQueue(this.draggedIndex, newIndex);
        }

        return false;
    }

    /**
     * Reorder the queue by moving an item from oldIndex to newIndex
     */
    reorderQueue(oldIndex, newIndex) {
        const state = this.stateManager.getState();
        const queue = [...state.postQueue];

        // Validate indices
        if (oldIndex < 0 || oldIndex >= queue.length || 
            newIndex < 0 || newIndex >= queue.length ||
            oldIndex === newIndex) {
            return;
        }

        // Save previous state for undo
        const previousState = {
            postQueue: [...queue]
        };

        // Remove item from old position
        const [movedItem] = queue.splice(oldIndex, 1);

        // Insert at new position
        queue.splice(newIndex, 0, movedItem);

        // Update state
        const newState = {
            postQueue: queue
        };

        this.stateManager.pushUndo('REORDER_QUEUE', previousState, newState);
        this.stateManager.setState(newState);

        // Trigger re-render
        if (typeof window.renderPostQueue === 'function') {
            window.renderPostQueue();
        }
    }

    /**
     * Create a placeholder element
     */
    createPlaceholder() {
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'queue-item-placeholder';
        this.placeholder.style.height = this.draggedElement.offsetHeight + 'px';
    }
}

// Export singleton instance
let dragDropManager = null;

export function initDragDrop(stateManager) {
    if (!dragDropManager) {
        dragDropManager = new DragDropManager(stateManager);
    }
    return dragDropManager;
}

export function getDragDropManager() {
    return dragDropManager;
}
