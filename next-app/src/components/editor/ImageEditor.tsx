"use client";

import 'cropperjs/dist/cropper.css';
import { Cropper } from 'react-cropper';
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";
import { useRef, useState } from "react";
import {
    RotateCw, FlipHorizontal, FlipVertical, Image as ImageIcon,
    Square, RectangleHorizontal, RectangleVertical, Check
} from "lucide-react";

export function ImageEditor() {
    const { postQueue, currentEditIndex, updateQueueItem } = useAppStore();
    const cropperRef = useRef<HTMLImageElement>(null);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);

    if (currentEditIndex === null || !postQueue[currentEditIndex]) return null;
    const post = postQueue[currentEditIndex];

    if (!post.imageBase64) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-2xl border-2 border-dashed border-white/10">
                <ImageIcon className="w-12 h-12 mb-2" />
                <p>No Image</p>
            </div>
        );
    }

    const onCropCheck = () => {
        const imageElement: any = cropperRef?.current;
        const cropper: any = imageElement?.cropper;
        if (cropper) {
            const croppedCanvas = cropper.getCroppedCanvas();
            // Only for final save, but here we might just want to track crop data
            // For now, we will just apply to CSS for display or something?
            // Actually we should save crop data.
            // But react-cropper is mainly for generating new images.
        }
    };

    const handleSaveCrop = () => {
        const imageElement: any = cropperRef?.current;
        const cropper: any = imageElement?.cropper;
        if (cropper) {
            const croppedCanvas = cropper.getCroppedCanvas();
            const croppedBase64 = croppedCanvas.toDataURL();
            updateQueueItem(currentEditIndex, { imageBase64: croppedBase64 });
        }
    };

    const getFilterString = () => {
        return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-white/10">
            {/* Toolbar */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white/10 rounded" title="1:1" onClick={() => (cropperRef.current as any)?.cropper.setAspectRatio(1)}>
                        <Square className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded" title="4:5" onClick={() => (cropperRef.current as any)?.cropper.setAspectRatio(4 / 5)}>
                        <RectangleVertical className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded" title="16:9" onClick={() => (cropperRef.current as any)?.cropper.setAspectRatio(16 / 9)}>
                        <RectangleHorizontal className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSaveCrop}
                        className="px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-indigo-500 rounded text-xs font-medium transition-colors flex items-center gap-1"
                    >
                        <Check className="w-3 h-3" />
                        Apply Crop
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded" onClick={() => (cropperRef.current as any)?.cropper.rotate(90)}>
                        <RotateCw className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded" onClick={() => (cropperRef.current as any)?.cropper.scaleX(-1)}>
                        <FlipHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 relative bg-[#1a1a1a]">
                <Cropper
                    src={post.imageBase64}
                    style={{ height: '100%', width: '100%', filter: getFilterString() } as any}
                    initialAspectRatio={1}
                    guides={true}
                    ref={cropperRef}
                    viewMode={1}
                    background={false}
                    responsive={true}
                />
            </div>

            {/* Filter Sliders */}
            <div className="p-4 bg-[var(--bg-secondary)] border-t border-white/10 grid grid-cols-3 gap-4">
                <label className="text-xs">
                    Brightness
                    <input
                        type="range" min="50" max="150" value={brightness}
                        onChange={e => setBrightness(Number(e.target.value))}
                        className="w-full mt-1 accent-[var(--accent-primary)]"
                    />
                </label>
                <label className="text-xs">
                    Contrast
                    <input
                        type="range" min="50" max="150" value={contrast}
                        onChange={e => setContrast(Number(e.target.value))}
                        className="w-full mt-1 accent-[var(--accent-primary)]"
                    />
                </label>
                <label className="text-xs">
                    Saturation
                    <input
                        type="range" min="0" max="200" value={saturation}
                        onChange={e => setSaturation(Number(e.target.value))}
                        className="w-full mt-1 accent-[var(--accent-primary)]"
                    />
                </label>
            </div>
        </div>
    );
}
