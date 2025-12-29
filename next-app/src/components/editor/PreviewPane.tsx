"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";
import { useState } from "react";
import { Smartphone, Monitor } from "lucide-react";
import Image from "next/image";

type Platform = "x" | "insta-feed" | "insta-story";

export function PreviewPane() {
    const { postQueue, currentEditIndex } = useAppStore();
    const [platform, setPlatform] = useState<Platform>("x");

    if (currentEditIndex === null || !postQueue[currentEditIndex]) return null;
    const post = postQueue[currentEditIndex];
    const imageSrc = post.imageBase64;

    return (
        <div className="flex flex-col h-full bg-[var(--bg-tertiary)] border-l border-white/10">
            {/* Tabs */}
            <div className="flex items-center p-2 gap-2 bg-[var(--bg-secondary)] border-b border-white/10 shrink-0 overflow-x-auto">
                <button
                    onClick={() => setPlatform("x")}
                    className={cn(
                        "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                        platform === "x" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/5"
                    )}
                >
                    X (Post)
                </button>
                <button
                    onClick={() => setPlatform("insta-feed")}
                    className={cn(
                        "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                        platform === "insta-feed" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/5"
                    )}
                >
                    Instagram (Feed)
                </button>
                <button
                    onClick={() => setPlatform("insta-story")}
                    className={cn(
                        "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                        platform === "insta-story" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/5"
                    )}
                >
                    Instagram (Story)
                </button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-y-auto p-4 flex justify-center">
                {/* X Preview */}
                {platform === "x" && (
                    <div className="w-full max-w-[600px] bg-black border border-[#2f3336] rounded-xl overflow-hidden p-4">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 bg-gray-600 rounded-full shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 text-[15px]">
                                    <span className="font-bold text-white">{post.boothName || "Name"}</span>
                                    <span className="text-[#71767b]">@{post.boothAccount || "handle"} · 1m</span>
                                </div>
                                <p className="text-[15px] text-white whitespace-pre-wrap mb-3 leading-normal">
                                    {post.aiComment || "Post content..."}
                                </p>
                                {imageSrc && (
                                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-[#2f3336] mt-3">
                                        <Image src={imageSrc} alt="Post" fill className="object-cover" />
                                    </div>
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
                            <span className="ml-2 text-sm font-semibold text-white">{post.boothAccount || "handle"}</span>
                        </div>
                        <div className="relative aspect-square bg-[#1a1a1a]">
                            {imageSrc && <Image src={imageSrc} alt="Post" fill className="object-cover" />}
                        </div>
                        <div className="p-3">
                            <p className="text-sm text-white">
                                <span className="font-semibold mr-2">{post.boothAccount || "handle"}</span>
                                {post.aiComment}
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
                            <span className="text-white text-sm font-semibold shadow-black drop-shadow-md">{post.boothAccount || "Your Story"}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
