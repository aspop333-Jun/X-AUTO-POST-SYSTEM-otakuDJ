"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";
import { ImagePlus, Lock } from "lucide-react";
import { useCallback, useState } from "react";

export function DropZone() {
    const { addToQueue, isEventInfoSet, currentEventInfo } = useAppStore();
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files || !isEventInfoSet) return;

        const processFile = (file: File): Promise<void> => {
            return new Promise((resolve, reject) => {
                if (!file.type.startsWith("image/")) {
                    resolve();
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    // Use the current event info for all photos
                    addToQueue({
                        imageFile: null,
                        imageBase64: base64,
                        boothName: "",
                        boothAccount: "",
                        personRole: "モデル",
                        personName: "",
                        personAccount: "",
                        aiComment: "",
                        status: "draft",
                        eventInfo: { ...currentEventInfo },
                    });
                    resolve();
                };
                reader.onerror = () => {
                    console.error("Failed to read file:", file.name);
                    reject(new Error(`Failed to read file: ${file.name}`));
                };
                reader.readAsDataURL(file);
            });
        };

        // Process files sequentially to avoid race conditions
        const processAllFiles = async () => {
            for (const file of Array.from(files)) {
                try {
                    await processFile(file);
                } catch (error) {
                    console.error("Error processing file:", error);
                }
            }
        };

        processAllFiles();
    }, [addToQueue, isEventInfoSet, currentEventInfo]);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (isEventInfoSet) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (isEventInfoSet) {
            setIsDragOver(true);
        }
    };

    const onDragLeave = () => {
        setIsDragOver(false);
    };

    // Disabled state when event info is not set
    if (!isEventInfoSet) {
        return (
            <div
                className={cn(
                    "relative rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center",
                    "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                )}
            >
                <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-[var(--text-muted)]" />
                </div>

                <h3 className="text-xl font-semibold mb-2 text-[var(--text-muted)]">
                    写真を追加できません
                </h3>
                <p className="text-[var(--text-muted)] text-sm">
                    先にイベント情報を入力してください ↑
                </p>
            </div>
        );
    }

    return (
        <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
                "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center text-center",
                isDragOver
                    ? "border-[var(--accent-primary)] bg-[var(--accent-glow)] scale-[1.01]"
                    : "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10"
            )}
        >
            <input
                type="file"
                multiple
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ImagePlus className="w-8 h-8 text-emerald-400" />
            </div>

            <h3 className="text-xl font-semibold mb-2 text-white">
                ② 写真をドロップ
            </h3>
            <p className="text-[var(--text-secondary)]">
                またはクリックしてファイルを選択
            </p>
            <p className="text-xs text-emerald-400 mt-2">
                ✓ イベント情報が自動適用されます
            </p>
        </div>
    );
}

