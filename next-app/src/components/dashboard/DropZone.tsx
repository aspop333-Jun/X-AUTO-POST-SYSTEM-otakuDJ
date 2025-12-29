"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";
import { Upload, ImagePlus } from "lucide-react";
import { useCallback, useState } from "react";

export function DropZone() {
    const { addToQueue } = useAppStore();
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;

        Array.from(files).forEach((file) => {
            if (!file.type.startsWith("image/")) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                addToQueue({
                    imageFile: null, // We can store File object if needed, but base64 is enough for now
                    imageBase64: base64,
                    boothName: "",
                    boothAccount: "",
                    personRole: "モデル",
                    personName: "",
                    personAccount: "",
                    aiComment: "",
                    status: "draft",
                    eventInfo: {
                        eventEn: "",
                        eventJp: "",
                        date: "",
                        venue: "",
                        category: "ブース",
                        hashtags: "",
                    },
                });
            };
            reader.readAsDataURL(file);
        });
    }, [addToQueue]);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const onDragLeave = () => {
        setIsDragOver(false);
    };

    return (
        <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
                "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center text-center",
                isDragOver
                    ? "border-[var(--accent-primary)] bg-[var(--accent-glow)] scale-[1.01]"
                    : "border-white/10 bg-[var(--bg-glass)] hover:border-[var(--accent-primary)] hover:bg-white/5"
            )}
        >
            <input
                type="file"
                multiple
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ImagePlus className="w-8 h-8 text-[var(--accent-primary)]" />
            </div>

            <h3 className="text-xl font-semibold mb-2 text-white">
                Drop photos here
            </h3>
            <p className="text-[var(--text-secondary)]">
                or click to browse from your computer
            </p>
        </div>
    );
}
