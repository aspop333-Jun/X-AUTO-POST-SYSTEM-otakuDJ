"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { QueueItemCard } from "./QueueItemCard";
import { Ghost, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { WebhookService } from "@/utils/webhook";

export function QueueList() {
    const { postQueue, updateQueueItem, settings } = useAppStore();
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });

    const handleSendAll = async () => {
        if (!settings.makeWebhookUrl) {
            alert("Please set the Webhook URL in Settings first.");
            return;
        }

        setIsSending(true);
        const pendingPosts = postQueue.map((p, i) => ({ ...p, originalIndex: i }))
            .filter(p => p.status !== 'sent');

        setProgress({ current: 0, total: pendingPosts.length, success: 0, failed: 0 });

        const webhook = new WebhookService(settings.makeWebhookUrl);

        for (let i = 0; i < pendingPosts.length; i++) {
            const post = pendingPosts[i];
            const realIndex = post.originalIndex;

            updateQueueItem(realIndex, { status: 'sending' });
            setProgress(prev => ({ ...prev, current: i + 1 }));

            const success = await webhook.sendPost(post);

            if (success) {
                updateQueueItem(realIndex, { status: 'sent' });
                setProgress(prev => ({ ...prev, success: prev.success + 1 }));
            } else {
                updateQueueItem(realIndex, { status: 'failed' });
                setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
            }

            // Simple delay to avoid rate limits if needed, or just flow
            await new Promise(r => setTimeout(r, 500));
        }

        setIsSending(false);
    };

    if (postQueue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-glass)] rounded-2xl border-2 border-dashed border-white/10">
                <Ghost className="w-16 h-16 text-[var(--text-muted)] mb-4" />
                <p className="text-[var(--text-secondary)] text-lg">Queue is empty</p>
                <p className="text-[var(--text-muted)] text-sm">Drag photos or paste text to start</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Batch Actions */}
            <div className="flex items-center justify-between bg-[var(--bg-secondary)] p-4 rounded-xl border border-white/10 sticky top-4 z-10 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-white">Queue ({postQueue.length})</h3>
                    {isSending && (
                        <div className="flex items-center gap-2 text-sm text-[var(--accent-primary)]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending {progress.current}/{progress.total}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {!isSending && progress.total > 0 && (
                        <div className="flex items-center gap-3 mr-4 text-xs font-medium">
                            <span className="text-[var(--success)] flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {progress.success}
                            </span>
                            <span className="text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {progress.failed}
                            </span>
                        </div>
                    )}

                    <button
                        onClick={handleSendAll}
                        disabled={isSending}
                        className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        {isSending ? 'Sending...' : 'Send All'}
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {postQueue.map((post, index) => (
                    <QueueItemCard key={post.id} post={post} index={index} />
                ))}
            </div>
        </div>
    );
}
