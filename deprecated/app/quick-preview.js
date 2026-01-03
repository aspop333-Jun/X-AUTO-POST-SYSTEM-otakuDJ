/**
 * Quick Preview Module
 * Displays a hover tooltip with post preview after 500ms hover
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

class QuickPreview {
    constructor() {
        this.hoverTimeout = null;
        this.currentPreview = null;
        this.hoverDelay = 500; // 500ms as per requirement 9.1
        this.isPreviewVisible = false;
    }

    /**
     * Initialize quick preview for all queue items
     */
    initializeQueue(queueContainer) {
        if (!queueContainer) return;

        const items = queueContainer.querySelectorAll('.queue-item');
        items.forEach((item, index) => {
            this.attachHoverListeners(item, index);
        });
    }

    /**
     * Attach hover listeners to a queue item
     */
    attachHoverListeners(item, index) {
        // Mouse enter - start timer
        item.addEventListener('mouseenter', (e) => {
            this.startHoverTimer(item, index, e);
        });

        // Mouse leave - cancel timer and hide preview
        item.addEventListener('mouseleave', () => {
            this.cancelHoverTimer();
            this.hidePreview();
        });

        // Mouse move - update preview position if visible
        item.addEventListener('mousemove', (e) => {
            if (this.isPreviewVisible && this.currentPreview) {
                this.updatePreviewPosition(e);
            }
        });
    }

    /**
     * Start the hover timer (500ms delay)
     */
    startHoverTimer(item, index, event) {
        // Clear any existing timer
        this.cancelHoverTimer();

        // Start new timer
        this.hoverTimeout = setTimeout(() => {
            this.showPreview(item, index, event);
        }, this.hoverDelay);
    }

    /**
     * Cancel the hover timer
     */
    cancelHoverTimer() {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
    }

    /**
     * Show the quick preview tooltip
     * Requirement 9.2: Show thumbnail, booth name, person name, and first line of comment
     */
    showPreview(item, index, event) {
        // Get post data
        const post = window.AppState?.postQueue[index];
        if (!post) return;

        // Create preview element if it doesn't exist
        if (!this.currentPreview) {
            this.currentPreview = this.createPreviewElement();
            document.body.appendChild(this.currentPreview);
        }

        // Populate preview content
        this.populatePreview(post, index);

        // Position the preview
        this.updatePreviewPosition(event);

        // Show the preview
        this.currentPreview.classList.add('visible');
        this.isPreviewVisible = true;

        // Add click listener to open full edit modal (Requirement 9.3)
        this.currentPreview.addEventListener('click', () => {
            this.hidePreview();
            if (typeof window.openEditModal === 'function') {
                window.openEditModal(index);
            }
        });
    }

    /**
     * Create the preview tooltip element
     */
    createPreviewElement() {
        const preview = document.createElement('div');
        preview.className = 'quick-preview-tooltip';
        preview.innerHTML = `
            <div class="quick-preview-thumbnail"></div>
            <div class="quick-preview-content">
                <div class="quick-preview-booth"></div>
                <div class="quick-preview-person"></div>
                <div class="quick-preview-comment"></div>
            </div>
        `;
        return preview;
    }

    /**
     * Populate preview with post data
     * Requirement 9.2: thumbnail, booth name, person name, first line of comment
     */
    populatePreview(post, index) {
        if (!this.currentPreview) return;

        const QUEUE_NUMBER_EMOJIS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

        // Thumbnail
        const thumbnailEl = this.currentPreview.querySelector('.quick-preview-thumbnail');
        if (post.imageBase64) {
            thumbnailEl.innerHTML = `<img src="${post.imageBase64}" alt="Preview">`;
        } else {
            thumbnailEl.innerHTML = `<span class="preview-placeholder">📷</span>`;
        }

        // Booth name
        const boothEl = this.currentPreview.querySelector('.quick-preview-booth');
        boothEl.innerHTML = `<strong>${QUEUE_NUMBER_EMOJIS[index]} ${post.boothName || '未設定'}</strong>`;

        // Person name
        const personEl = this.currentPreview.querySelector('.quick-preview-person');
        personEl.textContent = post.personName ? `${post.personName} さん` : '名前未設定';

        // First line of comment
        const commentEl = this.currentPreview.querySelector('.quick-preview-comment');
        const firstLine = this.getFirstLine(post.aiComment);
        commentEl.textContent = firstLine || 'コメント未設定';
    }

    /**
     * Get the first line of text (up to 60 characters)
     */
    getFirstLine(text) {
        if (!text) return '';
        
        const lines = text.split('\n');
        const firstLine = lines[0].trim();
        
        // Truncate if too long
        if (firstLine.length > 60) {
            return firstLine.substring(0, 60) + '...';
        }
        
        return firstLine;
    }

    /**
     * Update preview position based on mouse position
     */
    updatePreviewPosition(event) {
        if (!this.currentPreview) return;

        const offset = 15; // Offset from cursor
        const padding = 20; // Padding from viewport edges

        let x = event.clientX + offset;
        let y = event.clientY + offset;

        // Get preview dimensions
        const rect = this.currentPreview.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Adjust if preview would go off-screen (right edge)
        if (x + rect.width + padding > viewportWidth) {
            x = event.clientX - rect.width - offset;
        }

        // Adjust if preview would go off-screen (bottom edge)
        if (y + rect.height + padding > viewportHeight) {
            y = event.clientY - rect.height - offset;
        }

        // Ensure preview doesn't go off-screen (left edge)
        if (x < padding) {
            x = padding;
        }

        // Ensure preview doesn't go off-screen (top edge)
        if (y < padding) {
            y = padding;
        }

        this.currentPreview.style.left = `${x}px`;
        this.currentPreview.style.top = `${y}px`;
    }

    /**
     * Hide the preview tooltip
     * Requirement 9.4: Preview disappears when mouse leaves
     */
    hidePreview() {
        if (this.currentPreview) {
            this.currentPreview.classList.remove('visible');
            this.isPreviewVisible = false;
        }
    }

    /**
     * Clean up and remove preview element
     */
    destroy() {
        this.cancelHoverTimer();
        if (this.currentPreview && this.currentPreview.parentNode) {
            this.currentPreview.parentNode.removeChild(this.currentPreview);
            this.currentPreview = null;
        }
        this.isPreviewVisible = false;
    }
}

// Create global instance
const quickPreview = new QuickPreview();

// Export for use in other modules
export { QuickPreview, quickPreview };

// Make available globally
window.quickPreview = quickPreview;
