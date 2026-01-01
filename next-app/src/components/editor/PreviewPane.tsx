"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";
import { useState } from "react";
import { Smartphone, Monitor, Copy, Check } from "lucide-react";
import Image from "next/image";

type Platform = "x1" | "x2" | "insta-feed" | "insta-story";

/**
 * Generate post templates based on event and person info
 * Ported from Vanilla JS generatePostTemplates()
 */
function generatePostTemplates(post: any) {
    const event = post.eventInfo || {};
    const boothName = post.boothName || '';
    const boothAccount = post.boothAccount || '';
    const personRole = post.personRole || 'モデル';
    const personName = post.personName || '';
    const personAccount = post.personAccount || '';
    const aiComment = post.aiComment || '';
    const hashtags = event.hashtags || '';
    const eventEn = event.eventEn || '';
    const eventJp = event.eventJp || '';
    const date = event.date || '';
    const venue = event.venue || '';
    const category = event.category || 'ブース';

    // Extract main hashtag for X2
    const hashtagsArray = hashtags.split(' ').filter((h: string) => h.startsWith('#'));
    const mainHashtag = hashtagsArray[0] || '';

    // X Account 1 (Full template)
    const x1Parts = [];
    if (eventEn || eventJp) {
        x1Parts.push(`📸 ${eventEn}${eventJp ? ` – ${eventJp}` : ''}`);
    }
    if (date || venue) {
        x1Parts.push(`${date}${venue ? `｜${venue}` : ''}`);
    }
    x1Parts.push('');
    if (boothName) {
        x1Parts.push(`◼︎ ${category}`);
        x1Parts.push(`${boothName}${boothAccount ? `（${boothAccount}）` : ''}`);
        x1Parts.push('');
    }
    if (personName || personAccount) {
        x1Parts.push(`◼︎ ${personRole}`);
        x1Parts.push(`${personName ? `${personName} さん` : '※お名前調査中'}`);
        if (personAccount) x1Parts.push(personAccount);
        x1Parts.push('');
    }
    if (aiComment) {
        x1Parts.push(aiComment);
        x1Parts.push('');
    }
    if (hashtags) {
        x1Parts.push(hashtags);
    }
    const x1 = x1Parts.join('\n').trim();

    // X Account 2 (Simplified)
    const x2Parts = [];
    if (eventEn) {
        x2Parts.push(`📸 ${eventEn}`);
    }
    if (date || venue) {
        x2Parts.push(`${date}${venue ? `｜${venue}` : ''}`);
    }
    x2Parts.push('');
    if (boothName) {
        x2Parts.push(boothName);
    }
    if (personName || personAccount) {
        if (personAccount) {
            x2Parts.push(`${personName ? `${personName} さん` : ''} ${personAccount}`.trim());
        } else {
            x2Parts.push(personName || '');
        }
    }
    x2Parts.push('');
    if (aiComment) {
        x2Parts.push(aiComment);
        x2Parts.push('');
    }
    if (mainHashtag) {
        x2Parts.push(mainHashtag);
    }
    const x2 = x2Parts.join('\n').trim();

    // Instagram (Visual focus, more hashtags)
    const igHashtags = hashtags ? `${hashtags} #portrait #ポートレート #eventphoto` : '#portrait #ポートレート #eventphoto';
    const igParts = [];
    if (eventEn || eventJp) {
        igParts.push(`📸 ${eventEn}${eventJp ? ` – ${eventJp}` : ''}`);
    }
    igParts.push('');
    if (boothName) {
        igParts.push(boothName);
    }
    if (personName) {
        igParts.push(`${personName} さん`);
    }
    igParts.push('');
    if (aiComment) {
        igParts.push(aiComment);
        igParts.push('');
    }
    igParts.push(igHashtags);
    const ig = igParts.join('\n').trim();

    return { x1, x2, ig };
}

/**
 * Multi-image preview component with X/Twitter-style layouts
 * Matches the actual X/Twitter image grid layouts
 */
function MultiImagePreview({ images }: { images: string[] }) {
    if (!images || images.length === 0) return null;

    // Common styles for the container
    const containerClass = "mt-3 rounded-2xl overflow-hidden border border-[#2f3336]";

    // 1 image: Full width, original aspect ratio (max 16:9 width)
    if (images.length === 1) {
        return (
            <div className={containerClass}>
                <img
                    src={images[0]}
                    alt="Post"
                    className="w-full h-auto object-contain max-h-[510px] bg-black"
                />
            </div>
        );
    }

    // 2 images: Side by side with 2px gap, 16:9 aspect ratio each
    if (images.length === 2) {
        return (
            <div className={`${containerClass} flex gap-[2px] bg-[#2f3336]`}>
                {images.map((img, idx) => (
                    <div key={idx} className="flex-1 aspect-[4/5] relative">
                        <img src={img} alt={`Image ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                ))}
            </div>
        );
    }

    // 3 images: Left 4:5, Right side 16:9 ratio (2 stacked)
    if (images.length === 3) {
        return (
            <div className={`${containerClass} flex gap-[2px] bg-[#2f3336]`}>
                <div className="w-1/2 aspect-[4/5] relative">
                    <img src={images[0]} alt="Image 1" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="w-1/2 flex flex-col gap-[2px]">
                    <div className="flex-1 aspect-[16/9] relative">
                        <img src={images[1]} alt="Image 2" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 aspect-[16/9] relative">
                        <img src={images[2]} alt="Image 3" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                </div>
            </div>
        );
    }

    // 4 images: 2x2 grid with 16:9 overall aspect ratio
    return (
        <div className={`${containerClass} grid grid-cols-2 gap-[2px] bg-[#2f3336]`} style={{ aspectRatio: '16/9' }}>
            {images.map((img, idx) => (
                <div key={idx} className="relative">
                    <img src={img} alt={`Image ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                </div>
            ))}
        </div>
    );
}

export function PreviewPane() {
    const { postQueue, currentEditIndex } = useAppStore();
    const [platform, setPlatform] = useState<Platform>("x1");
    const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

    if (currentEditIndex === null || !postQueue[currentEditIndex]) return null;
    const post = postQueue[currentEditIndex];

    // Get images array (with fallback for legacy data)
    const images = post.images || (post.imageBase64 ? [post.imageBase64] : []);
    const imageSrc = images[0] || null; // Legacy compatibility

    const templates = generatePostTemplates(post);

    const getCurrentText = () => {
        switch (platform) {
            case "x1": return templates.x1;
            case "x2": return templates.x2;
            case "insta-feed": return templates.ig;
            case "insta-story": return templates.ig;
            default: return templates.x1;
        }
    };

    const handleCopy = async () => {
        const text = getCurrentText();
        try {
            await navigator.clipboard.writeText(text);
            setCopiedPlatform(platform);
            setTimeout(() => setCopiedPlatform(null), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-tertiary)] border-l border-white/10">
            {/* Tabs */}
            <div className="flex items-center p-2 gap-2 bg-[var(--bg-secondary)] border-b border-white/10 shrink-0 overflow-x-auto">
                <button
                    onClick={() => setPlatform("x1")}
                    className={cn(
                        "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                        platform === "x1" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/5"
                    )}
                >
                    X (詳細)
                </button>
                <button
                    onClick={() => setPlatform("x2")}
                    className={cn(
                        "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                        platform === "x2" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/5"
                    )}
                >
                    X (簡略)
                </button>
                <button
                    onClick={() => setPlatform("insta-feed")}
                    className={cn(
                        "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                        platform === "insta-feed" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/5"
                    )}
                >
                    Instagram
                </button>
                <button
                    onClick={() => setPlatform("insta-story")}
                    className={cn(
                        "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                        platform === "insta-story" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/5"
                    )}
                >
                    Story
                </button>

                {/* Copy Button */}
                <button
                    onClick={handleCopy}
                    className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] flex items-center gap-1.5 transition-colors"
                >
                    {copiedPlatform === platform ? (
                        <>
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-y-auto p-4 flex justify-center">
                {/* X1/X2 Preview */}
                {(platform === "x1" || platform === "x2") && (
                    <div className="w-full max-w-[600px] bg-black border border-[#2f3336] rounded-xl overflow-hidden p-4">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 bg-gray-600 rounded-full shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 text-[15px]">
                                    <span className="font-bold text-white">{post.boothName || post.personName || "Name"}</span>
                                    <span className="text-[#71767b]">@{post.boothAccount || post.personAccount || "handle"} · 1m</span>
                                </div>
                                <p className="text-[15px] text-white whitespace-pre-wrap mb-3 leading-normal">
                                    {platform === "x1" ? templates.x1 : templates.x2}
                                </p>
                                {images.length > 0 && (
                                    <MultiImagePreview images={images} />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Insta Feed Preview */}
                {platform === "insta-feed" && (
                    <div className="w-[375px] bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="h-12 flex items-center px-4 border-b border-white/10">
                            <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 to-purple-600 rounded-full p-[2px]">
                                <div className="w-full h-full bg-black rounded-full border-2 border-black" />
                            </div>
                            <span className="ml-2 text-sm font-semibold text-white">{post.boothAccount || post.personAccount || "handle"}</span>
                        </div>
                        <div className="relative aspect-square bg-[#1a1a1a]">
                            {imageSrc && <Image src={imageSrc} alt="Post" fill className="object-cover" />}
                        </div>
                        <div className="p-3">
                            <p className="text-sm text-white whitespace-pre-wrap">
                                <span className="font-semibold mr-2">{post.boothAccount || post.personAccount || "handle"}</span>
                                {templates.ig}
                            </p>
                        </div>
                    </div>
                )}

                {/* Insta Story Preview */}
                {platform === "insta-story" && (
                    <div className="w-[375px] h-[667px] bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                        {imageSrc && <Image src={imageSrc} alt="Story" fill className="object-cover" />}

                        {/* Safe Area Overlay */}
                        <div className="absolute inset-0 pointer-events-none border-y-[100px] border-transparent bg-black/20">
                            <div className="w-full h-full border-2 border-dashed border-red-500/30 flex items-center justify-center">
                                <span className="text-red-500/50 text-xs font-bold bg-black/50 px-2 rounded">Safe Area</span>
                            </div>
                        </div>

                        {/* UI Elements */}
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-500 border border-white" />
                            <span className="text-white text-sm font-semibold shadow-black drop-shadow-md">{post.boothAccount || post.personAccount || "Your Story"}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Text Preview Panel */}
            <div className="border-t border-white/10 bg-[var(--bg-secondary)] p-3 max-h-[200px] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--text-muted)]">生成テキスト</span>
                    <span className="text-xs text-[var(--text-muted)]">{getCurrentText().length} 文字</span>
                </div>
                <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono bg-[var(--bg-tertiary)] p-2 rounded-lg">
                    {getCurrentText() || "（テキストなし）"}
                </pre>
            </div>
        </div>
    );
}
