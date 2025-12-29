"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Settings, X, Save, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const { settings, setSettings } = useAppStore();
    const [webhookUrl, setWebhookUrl] = useState(settings.makeWebhookUrl);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    // Sync with store when modal opens
    useEffect(() => {
        if (isOpen) {
            setWebhookUrl(settings.makeWebhookUrl);
            setHasChanges(false);
            setTestStatus('idle');
            setTestMessage('');
        }
    }, [isOpen, settings.makeWebhookUrl]);

    // Track changes
    useEffect(() => {
        setHasChanges(webhookUrl !== settings.makeWebhookUrl);
    }, [webhookUrl, settings.makeWebhookUrl]);

    const handleSave = () => {
        setSettings({ makeWebhookUrl: webhookUrl.trim() });
        setHasChanges(false);
        onClose();
    };

    const handleTest = async () => {
        if (!webhookUrl.trim()) {
            setTestStatus('error');
            setTestMessage('Webhook URLを入力してください');
            return;
        }

        // Validate URL format
        try {
            new URL(webhookUrl);
        } catch {
            setTestStatus('error');
            setTestMessage('無効なURL形式です');
            return;
        }

        setTestStatus('testing');
        setTestMessage('テスト送信中...');

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'no-cors', // Make.com webhooks may not have CORS headers
                body: JSON.stringify({
                    test: true,
                    message: 'X Auto-Post System テスト接続',
                    timestamp: new Date().toISOString()
                })
            });

            // no-cors mode always returns opaque response, so we can't check status
            // We'll assume success if no error was thrown
            setTestStatus('success');
            setTestMessage('テスト送信完了！Make.comで受信を確認してください');
        } catch (error: any) {
            setTestStatus('error');
            setTestMessage(`送信エラー: ${error.message}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[var(--bg-secondary)] rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--accent-primary)]/20 rounded-lg">
                            <Settings className="w-5 h-5 text-[var(--accent-primary)]" />
                        </div>
                        <h2 className="text-xl font-bold">設定</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Make.com Webhook URL Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">
                                Make.com Webhook URL
                            </label>
                            <a
                                href="https://www.make.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1"
                            >
                                Make.comを開く
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        <input
                            type="url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://hook.us1.make.com/..."
                            className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-white/10 rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
                        />

                        <p className="text-xs text-[var(--text-muted)]">
                            Make.comでWebhookモジュールを作成し、URLをここに貼り付けてください。
                            <br />
                            詳しくは「Make.com連携設定ガイド.md」を参照してください。
                        </p>

                        {/* Test Connection Button */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleTest}
                                disabled={!webhookUrl.trim() || testStatus === 'testing'}
                                className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                            >
                                {testStatus === 'testing' ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        テスト中...
                                    </>
                                ) : (
                                    'テスト送信'
                                )}
                            </button>

                            {/* Test Status */}
                            {testStatus === 'success' && (
                                <div className="flex items-center gap-2 text-sm text-green-400">
                                    <CheckCircle className="w-4 h-4" />
                                    {testMessage}
                                </div>
                            )}
                            {testStatus === 'error' && (
                                <div className="flex items-center gap-2 text-sm text-red-400">
                                    <AlertCircle className="w-4 h-4" />
                                    {testMessage}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/10" />

                    {/* Current Status */}
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl">
                        <h3 className="text-sm font-medium mb-2">接続状態</h3>
                        <div className="flex items-center gap-2">
                            {settings.makeWebhookUrl ? (
                                <>
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-sm text-green-400">設定済み</span>
                                    <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                                        ({settings.makeWebhookUrl.substring(0, 40)}...)
                                    </span>
                                </>
                            ) : (
                                <>
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                                    <span className="text-sm text-yellow-400">未設定</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-[var(--bg-tertiary)]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition-all"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className="px-6 py-2 bg-[var(--accent-primary)] hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
}
