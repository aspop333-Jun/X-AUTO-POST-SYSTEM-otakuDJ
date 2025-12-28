/**
 * Status Indicator Module
 * Manages status badges, completion bars, and warning indicators
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */

/**
 * Status badge color mapping
 * draft → gray, ready → blue, sent → green, failed → red
 */
const STATUS_CONFIG = {
    draft: {
        color: 'gray',
        text: '下書き',
        class: 'draft'
    },
    ready: {
        color: 'blue',
        text: '準備完了',
        class: 'ready'
    },
    sent: {
        color: 'green',
        text: '送信済',
        class: 'sent'
    },
    failed: {
        color: 'red',
        text: '失敗',
        class: 'failed'
    }
};

/**
 * Time threshold for stale drafts (5 minutes in milliseconds)
 */
const STALE_DRAFT_THRESHOLD = 5 * 60 * 1000;

/**
 * Check if a post item has all required fields
 * @param {Object} post - Post item
 * @returns {boolean} - True if all required fields are filled
 */
function hasRequiredFields(post) {
    return !!(
        post.boothName &&
        post.personName &&
        post.aiComment
    );
}

/**
 * Check if a draft post is stale (older than 5 minutes)
 * @param {Object} post - Post item
 * @returns {boolean} - True if post is a stale draft
 */
function isStaleDraft(post) {
    if (post.status !== 'draft') return false;
    
    const createdAt = post.createdAt || Date.now();
    const age = Date.now() - createdAt;
    
    return age > STALE_DRAFT_THRESHOLD;
}

/**
 * Get status badge HTML
 * @param {string} status - Status value (draft, ready, sent, failed)
 * @returns {string} - HTML string for status badge
 */
function getStatusBadgeHTML(status) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    return `<div class="queue-status ${config.class}">${config.text}</div>`;
}

/**
 * Get warning icon HTML if post is missing required fields
 * @param {Object} post - Post item
 * @returns {string} - HTML string for warning icon or empty string
 */
function getWarningIconHTML(post) {
    if (!hasRequiredFields(post)) {
        return '<div class="queue-item-warning" title="必須項目が未入力です">⚠️</div>';
    }
    return '';
}

/**
 * Calculate completion percentage for the queue
 * @param {Array} postQueue - Array of post items
 * @returns {Object} - { percentage: number, completed: number, total: number }
 */
function calculateCompletionPercentage(postQueue) {
    if (!postQueue || postQueue.length === 0) {
        return { percentage: 0, completed: 0, total: 0 };
    }

    const total = postQueue.length;
    const completed = postQueue.filter(post => 
        post.status === 'sent' || post.status === 'ready'
    ).length;

    const percentage = Math.round((completed / total) * 100);

    return { percentage, completed, total };
}

/**
 * Update the completion bar in the queue header
 * @param {Array} postQueue - Array of post items
 */
function updateCompletionBar(postQueue) {
    const completionBarFill = document.getElementById('completion-bar-fill');
    const completionPercentage = document.getElementById('completion-percentage');
    const completionBar = document.getElementById('queue-completion-bar');

    if (!completionBarFill || !completionPercentage) return;

    const { percentage, completed, total } = calculateCompletionPercentage(postQueue);

    // Update bar width
    completionBarFill.style.width = `${percentage}%`;

    // Update percentage text
    completionPercentage.textContent = `${percentage}% (${completed}/${total})`;

    // Show/hide completion bar based on queue length
    if (completionBar) {
        completionBar.style.display = total > 0 ? 'flex' : 'none';
    }
}

/**
 * Apply status-based styling to a queue item element
 * @param {HTMLElement} itemElement - Queue item DOM element
 * @param {Object} post - Post item data
 */
function applyStatusStyling(itemElement, post) {
    // Remove all status classes
    itemElement.classList.remove('draft', 'ready', 'sent', 'failed', 'stale-draft');

    // Add current status class
    if (post.status) {
        itemElement.classList.add(post.status);
    }

    // Add stale-draft class if applicable
    if (isStaleDraft(post)) {
        itemElement.classList.add('stale-draft');
    }
}

/**
 * Get status text for display
 * @param {string} status - Status value
 * @returns {string} - Display text for status
 */
function getStatusText(status) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    return config.text;
}

/**
 * Get status class for CSS
 * @param {string} status - Status value
 * @returns {string} - CSS class for status
 */
function getStatusClass(status) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    return config.class;
}

/**
 * Initialize status indicators for the queue
 * Should be called after rendering the queue
 * @param {Array} postQueue - Array of post items
 */
function initializeStatusIndicators(postQueue) {
    updateCompletionBar(postQueue);

    // Update stale draft highlighting every minute
    setInterval(() => {
        const queueItems = document.querySelectorAll('.queue-item');
        queueItems.forEach((item, index) => {
            const post = postQueue[index];
            if (post) {
                applyStatusStyling(item, post);
            }
        });
    }, 60000); // Check every minute
}

// Export functions for ES modules
export {
    STATUS_CONFIG,
    hasRequiredFields,
    isStaleDraft,
    getStatusBadgeHTML,
    getWarningIconHTML,
    calculateCompletionPercentage,
    updateCompletionBar,
    applyStatusStyling,
    getStatusText,
    getStatusClass,
    initializeStatusIndicators
};

// Make functions globally available
window.statusIndicator = {
    STATUS_CONFIG,
    hasRequiredFields,
    isStaleDraft,
    getStatusBadgeHTML,
    getWarningIconHTML,
    calculateCompletionPercentage,
    updateCompletionBar,
    applyStatusStyling,
    getStatusText,
    getStatusClass,
    initializeStatusIndicators
};
