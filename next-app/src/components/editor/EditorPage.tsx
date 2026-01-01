"use client";

import { useAppStore } from "@/store/useAppStore";
import { ImageEditor } from "@/components/editor/ImageEditor";
import { TextEditor } from "@/components/editor/TextEditor";
import { PreviewPane } from "@/components/editor/PreviewPane";
import { ArrowLeft, Save, Eye, Edit3 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/utils/cn";

export default function EditorPage() {
    const { setStep, currentEditIndex } = useAppStore();
    const [rightPanelMode, setRightPanelMode] = useState<"write" | "preview">("write");

    useEffect(() => {
        if (currentEditIndex === null) {
            setStep(1);
        }
    }, [currentEditIndex, setStep]);

    if (currentEditIndex === null) {
        return null; // Return null while redirecting
    }

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <header className="h-16 border-b border-white/10 bg-[var(--bg-secondary)] flex items-center justify-between px-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setStep(1)}
                        className="p-2 hover:bg-white/10 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-semibold text-lg">Edit Post</h1>
                </div>

                <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-lg border border-white/10">
                    <button
                        onClick={() => setRightPanelMode("write")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all",
                            rightPanelMode === "write" ? "bg-[var(--accent-primary)] text-white" : "hover:bg-white/5 text-[var(--text-secondary)]"
                        )}
                    >
                        <Edit3 className="w-4 h-4" />
                        Write
                    </button>
                    <button
                        onClick={() => setRightPanelMode("preview")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all",
                            rightPanelMode === "preview" ? "bg-[var(--accent-primary)] text-white" : "hover:bg-white/5 text-[var(--text-secondary)]"
                        )}
                    >
                        <Eye className="w-4 h-4" />
                        Preview
                    </button>
                </div>

                <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-indigo-500 transition-colors"
                >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Image Editor */}
                <div className="w-1/2 p-6 bg-[var(--bg-primary)] border-r border-white/10 relative z-0 overflow-y-auto">
                    <ImageEditor />
                </div>

                {/* Right: Text Editor or Preview */}
                <div className="w-1/2 bg-[var(--bg-primary)] relative z-0">
                    {rightPanelMode === "write" ? <TextEditor /> : <PreviewPane />}
                </div>
            </div>
        </div>
    );
}
