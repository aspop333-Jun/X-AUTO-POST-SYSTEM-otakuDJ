/**
 * Template UI Controller
 * テンプレート選択UIの実装
 * Requirements: 5.2, 5.3
 */

import { BoothTemplateDatabase, FieldTemplateDatabase } from './template-database.js';

class TemplateUIController {
    constructor() {
        this.boothDB = new BoothTemplateDatabase();
        this.fieldDB = new FieldTemplateDatabase();
        this.currentEditingTemplateId = null;
        
        this.initializeEventListeners();
        this.loadTemplateOptions();
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Template selector change
        const templateSelect = document.getElementById('booth-template-select');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                this.applyTemplate(e.target.value);
            });
        }

        // Save template button
        const saveBtn = document.getElementById('save-booth-template-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.showSaveTemplateDialog();
            });
        }

        // Manage templates button
        const manageBtn = document.getElementById('manage-templates-btn');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => {
                this.showManageTemplatesModal();
            });
        }

        // Save template modal
        const closeSaveTemplate = document.getElementById('close-save-template');
        if (closeSaveTemplate) {
            closeSaveTemplate.addEventListener('click', () => {
                this.closeSaveTemplateDialog();
            });
        }

        const confirmSaveBtn = document.getElementById('confirm-save-template-btn');
        if (confirmSaveBtn) {
            confirmSaveBtn.addEventListener('click', () => {
                this.saveTemplate();
            });
        }

        // Manage templates modal
        const closeManageTemplates = document.getElementById('close-manage-templates');
        if (closeManageTemplates) {
            closeManageTemplates.addEventListener('click', () => {
                this.closeManageTemplatesModal();
            });
        }

        // Update preview when template name changes
        const templateNameInput = document.getElementById('template-name');
        if (templateNameInput) {
            templateNameInput.addEventListener('input', () => {
                this.updateTemplatePreview();
            });
        }
    }

    /**
     * Load template options into dropdown
     */
    loadTemplateOptions() {
        const select = document.getElementById('booth-template-select');
        if (!select) return;

        // Clear existing options except first
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Get all templates sorted by usage
        const templates = this.boothDB.getAll();

        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            
            // Add category if exists
            if (template.category) {
                option.textContent += ` [${template.category}]`;
            }
            
            select.appendChild(option);
        });
    }

    /**
     * Apply selected template to form
     * @param {string} templateId
     */
    applyTemplate(templateId) {
        if (!templateId) return;

        const template = this.boothDB.getById(templateId);
        if (!template) return;

        // Fill form fields
        const boothNameInput = document.getElementById('edit-booth-name');
        const boothAccountInput = document.getElementById('edit-booth-account');

        if (boothNameInput) boothNameInput.value = template.boothName || '';
        if (boothAccountInput) boothAccountInput.value = template.boothAccount || '';

        // Record usage
        this.boothDB.recordUsage(templateId);

        // Show toast notification
        this.showToast(`テンプレート「${template.name}」を適用しました`);
    }

    /**
     * Show save template dialog
     */
    showSaveTemplateDialog() {
        const modal = document.getElementById('save-template-modal');
        if (!modal) return;

        // Clear previous values
        const nameInput = document.getElementById('template-name');
        const categorySelect = document.getElementById('template-category');
        
        if (nameInput) nameInput.value = '';
        if (categorySelect) categorySelect.value = '';

        // Update preview
        this.updateTemplatePreview();

        modal.classList.add('active');
    }

    /**
     * Close save template dialog
     */
    closeSaveTemplateDialog() {
        const modal = document.getElementById('save-template-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Update template preview in save dialog
     */
    updateTemplatePreview() {
        const previewDiv = document.getElementById('template-preview-content');
        if (!previewDiv) return;

        const boothName = document.getElementById('edit-booth-name')?.value || '';
        const boothAccount = document.getElementById('edit-booth-account')?.value || '';

        previewDiv.innerHTML = `
            <div style="margin-top: 8px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
                <div><strong>ブース名:</strong> ${boothName || '(未入力)'}</div>
                <div><strong>ブース公式@:</strong> ${boothAccount || '(未入力)'}</div>
            </div>
        `;
    }

    /**
     * Save template
     */
    saveTemplate() {
        const nameInput = document.getElementById('template-name');
        const categorySelect = document.getElementById('template-category');
        const boothName = document.getElementById('edit-booth-name')?.value || '';
        const boothAccount = document.getElementById('edit-booth-account')?.value || '';

        if (!nameInput || !nameInput.value.trim()) {
            this.showToast('テンプレート名を入力してください', 'error');
            return;
        }

        const template = {
            name: nameInput.value.trim(),
            boothName: boothName,
            boothAccount: boothAccount,
            category: categorySelect?.value || ''
        };

        this.boothDB.save(template);
        this.loadTemplateOptions();
        this.closeSaveTemplateDialog();
        this.showToast(`テンプレート「${template.name}」を保存しました`);
    }

    /**
     * Show manage templates modal
     */
    showManageTemplatesModal() {
        const modal = document.getElementById('manage-templates-modal');
        if (!modal) return;

        this.renderTemplatesList();
        modal.classList.add('active');
    }

    /**
     * Close manage templates modal
     */
    closeManageTemplatesModal() {
        const modal = document.getElementById('manage-templates-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Render templates list in manage modal
     */
    renderTemplatesList() {
        const listDiv = document.getElementById('templates-list');
        if (!listDiv) return;

        const templates = this.boothDB.getAll();

        if (templates.length === 0) {
            listDiv.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <p>保存されたテンプレートがありません</p>
                </div>
            `;
            return;
        }

        listDiv.innerHTML = templates.map(template => `
            <div class="template-item" data-id="${template.id}">
                <div class="template-info">
                    <div class="template-name">
                        ${template.name}
                        ${template.category ? `<span class="template-category">${template.category}</span>` : ''}
                    </div>
                    <div class="template-details">
                        <div><strong>ブース:</strong> ${template.boothName || '(なし)'}</div>
                        <div><strong>アカウント:</strong> ${template.boothAccount || '(なし)'}</div>
                        <div class="template-usage">使用回数: ${template.useCount}回</div>
                    </div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-ghost btn-small" onclick="templateUI.editTemplate('${template.id}')">
                        ✏️ 編集
                    </button>
                    <button class="btn btn-ghost btn-small" onclick="templateUI.deleteTemplate('${template.id}')">
                        🗑️ 削除
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Edit template
     * @param {string} templateId
     */
    editTemplate(templateId) {
        const template = this.boothDB.getById(templateId);
        if (!template) return;

        const newName = prompt('テンプレート名を編集:', template.name);
        if (newName && newName.trim()) {
            this.boothDB.update(templateId, { name: newName.trim() });
            this.renderTemplatesList();
            this.loadTemplateOptions();
            this.showToast('テンプレートを更新しました');
        }
    }

    /**
     * Delete template
     * @param {string} templateId
     */
    deleteTemplate(templateId) {
        const template = this.boothDB.getById(templateId);
        if (!template) return;

        if (confirm(`テンプレート「${template.name}」を削除しますか？`)) {
            this.boothDB.delete(templateId);
            this.renderTemplatesList();
            this.loadTemplateOptions();
            this.showToast('テンプレートを削除しました');
        }
    }

    /**
     * Show toast notification
     * @param {string} message
     * @param {string} type - 'success' or 'error'
     */
    showToast(message, type = 'success') {
        // Use existing toast system if available
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        } else {
            console.log(`[Toast] ${message}`);
        }
    }
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.templateUI = new TemplateUIController();
    });
}

// Export for testing
export { TemplateUIController };
