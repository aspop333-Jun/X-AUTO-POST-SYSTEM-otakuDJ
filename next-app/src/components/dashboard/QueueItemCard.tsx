"use client";

import { PostItem, useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";
import { Pencil, Trash2, Send, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface QueueItemProps {
    post: PostItem;
    index: number;
}

export function QueueItemCard({ post, index }: QueueItemProps) {
    const { removeFromQueue, setCurrentEditIndex, setStep } = useAppStore();

    const handleEdit = () => {
        setCurrentEditIndex(index);
        setStep(2); // Go to editor
    };

    const statusColors = {
        draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
        ready: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        sent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        failed: "bg-red-500/10 text-red-400 border-red-500/20",
    };

    return (
        <div className="group relative bg-[var(--bg-card)] border border-white/10 rounded-xl p-4 transition-all hover:border-[var(--accent-primary)] hover:shadow-lg hover:shadow-indigo-500/10">
            <div className="flex items-center gap-4">
                {/* Number Badge */}
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] font-bold text-[var(--accent-primary)] shrink-0">
                    {index + 1}
                </div>

                {/* Thumbnail */}
                <div className="relative w-20 h-16 bg-[var(--bg-tertiary)] rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-white/5">
                    {post.imageBase64 ? (
                        <Image src={post.imageBase64} alt="Thumbnail" fill className="object-cover" />
                    ) : (
                        <ImageIcon className="text-[var(--text-muted)] w-8 h-8" />
                    )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate text-white">{post.boothName || "未設定"}</h4>
                    <p className="text-sm text-[var(--text-secondary)] truncate">
                        {post.personName ? `${post.personName} さん` : "名前未設定"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", statusColors[post.status])}>
                            {post.status}
                        </span>
                        {post.aiComment && (
                            <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                                {post.aiComment}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleEdit}
                        className="p-2 hover:bg-white/10 rounded-lg text-[var(--text-secondary)] hover:text-white transition-colors"
                        title="Edit"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => removeFromQueue(index)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
