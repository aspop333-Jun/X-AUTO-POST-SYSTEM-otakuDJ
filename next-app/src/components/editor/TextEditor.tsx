"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";
import {
    Maximize2, Minimize2, Type, Hash, AtSign, Smile,
    Bold, Italic, Sparkles
} from "lucide-react";
import { useState, useRef } from "react";

export function TextEditor() {
    const { postQueue, currentEditIndex, updateQueueItem } = useAppStore();
    const [isZenMode, setIsZenMode] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Metadata handlers
    const handleMetadataChange = (key: keyof any, value: string) => {
        if (!postQueue[currentEditIndex!]) return;
        const currentEvent = postQueue[currentEditIndex!].eventInfo || {};
        updateQueueItem(currentEditIndex!, {
            eventInfo: { ...currentEvent, [key]: value }
        });
    };

    if (currentEditIndex === null || !postQueue[currentEditIndex]) return null;
    const post = postQueue[currentEditIndex];

    const toUnicodeBold = (text: string) => {
        const UP_A = 0x1D400; // 𝐁
        const LOW_A = 0x1D41A; // 𝐛
        const DIGIT_0 = 0x1D7CE; // 𝟎

        return text.split('').map(char => {
            const code = char.codePointAt(0);
            if (!code) return char;
            if (code >= 65 && code <= 90) return String.fromCodePoint(UP_A + (code - 65));
            if (code >= 97 && code <= 122) return String.fromCodePoint(LOW_A + (code - 97));
            if (code >= 48 && code <= 57) return String.fromCodePoint(DIGIT_0 + (code - 48));
            return char;
        }).join('');
    };

    const applyBold = () => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        if (start === end) return;

        const text = post.aiComment;
        const selected = text.substring(start, end);
        const bolded = toUnicodeBold(selected);

        const newText = text.substring(0, start) + bolded + text.substring(end);
        updateQueueItem(currentEditIndex!, { aiComment: newText });
    };

    const insertText = (textToInsert: string) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = post.aiComment;
        const newText = text.substring(0, start) + textToInsert + text.substring(end);
        updateQueueItem(currentEditIndex!, { aiComment: newText });
    };

    return (
        <div className={cn(
            "flex flex-col transition-all duration-500",
            isZenMode ? "fixed inset-0 z-50 bg-[var(--bg-primary)] p-0" : "h-full"
        )}>
            {/* Toolbar */}
            <div className={cn(
                "flex items-center justify-between p-4 border-b border-white/10 bg-[var(--bg-secondary)]",
                isZenMode && "px-20"
            )}>
                <div className="flex items-center gap-2">
                    <button onClick={applyBold} className="p-2 hover:bg-white/10 rounded-lg text-white" title="Bold (Unicode)">
                        <Bold className="w-4 h-4" />
                    </button>
                    {/* Placeholder for Italic */}
                    <button className="p-2 hover:bg-white/10 rounded-lg text-white opacity-50 cursor-not-allowed" title="Italic (Coming Soon)">
                        <Italic className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    {/* Emoji Logic - simplified for now */}
                    <button onClick={() => insertText('✨')} className="p-2 hover:bg-white/10 rounded-lg text-white" title="Insert Sparkles">
                        <Smile className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertText('#')} className="p-2 hover:bg-white/10 rounded-lg text-white" title="Hashtag">
                        <Hash className="w-4 h-4" />
                    </button>
                    <button onClick={() => insertText('@')} className="p-2 hover:bg-white/10 rounded-lg text-white" title="Mention">
                        <AtSign className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Metadata Toggle or Inputs */}
                    <div className="hidden md:flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        {post.eventInfo.eventEn || post.boothName}
                    </div>

                    <div className="w-px h-6 bg-white/10" />

                    <button
                        onClick={() => setIsZenMode(!isZenMode)}
                        className="p-2 hover:bg-white/10 rounded-lg text-[var(--text-secondary)]"
                        title={isZenMode ? "Exit Zen Mode" : "Zen Mode"}
                    >
                        {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Editor Area & Metadata Form */}
            <div className={cn(
                "flex-1 relative flex flex-col",
                isZenMode ? "bg-[var(--bg-primary)] overflow-y-auto items-center" : "bg-[var(--bg-card)]"
            )}>
                {!isZenMode && (
                    <div className="p-4 grid grid-cols-2 gap-4 border-b border-white/5 bg-[var(--bg-tertiary)]/30">
                        <input
                            placeholder="Event Name"
                            className="bg-transparent border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] outline-none"
                            value={post.eventInfo.eventEn}
                            onChange={(e) => handleMetadataChange('eventEn', e.target.value)}
                        />
                        <input
                            placeholder="Venue"
                            className="bg-transparent border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] outline-none"
                            value={post.eventInfo.venue}
                            onChange={(e) => handleMetadataChange('venue', e.target.value)}
                        />
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <input
                                placeholder="Date (e.g. 2023.12.30)"
                                className="bg-transparent border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] outline-none"
                                value={post.eventInfo.date}
                                onChange={(e) => handleMetadataChange('date', e.target.value)}
                            />
                            <input
                                placeholder="Booth Name"
                                className="bg-transparent border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] outline-none"
                                value={post.boothName}
                                onChange={(e) => updateQueueItem(currentEditIndex!, { boothName: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                <textarea
                    ref={textareaRef}
                    value={post.aiComment}
                    onChange={(e) => updateQueueItem(currentEditIndex!, { aiComment: e.target.value })}
                    placeholder="Write your caption here..."
                    className={cn(
                        "w-full flex-1 resize-none outline-none text-[var(--text-primary)] bg-transparent p-6 placeholder:text-[var(--text-muted)]",
                        isZenMode
                            ? "max-w-3xl text-xl leading-relaxed py-20 font-serif h-auto overflow-hidden"
                            : "text-base leading-relaxed h-full"
                    )}
                />
            </div>
        </div>
    );
}
