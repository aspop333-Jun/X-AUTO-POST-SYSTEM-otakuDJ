"use client";

import 'cropperjs/dist/cropper.css';
import { Cropper } from 'react-cropper';
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
    RotateCw, FlipHorizontal, FlipVertical, Image as ImageIcon,
    Square, RectangleHorizontal, RectangleVertical, Check,
    Plus, X as XIcon
} from "lucide-react";
import { ImageContextMenu } from "./ImageContextMenu";
import type { ScoredCandidate } from "@/utils/imageSimilarityService";
import { showToast, updateToast } from "@/components/ui/Toast";

// 遅延ロード（SSR無効）でtransformers.jsのモジュール評価問題を回避
const SimilaritySearchModal = dynamic(
    () => import("./SimilaritySearchModal").then(mod => mod.SimilaritySearchModal),
    { ssr: false, loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="text-white">Loading...</div></div> }
);

export function ImageEditor() {
    const { postQueue, currentEditIndex, updateQueueItem } = useAppStore();
    const cropperRef = useRef<HTMLImageElement>(null);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isDragOver, setIsDragOver] = useState(false);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    // Similarity search modal state
    const [showSearchModal, setShowSearchModal] = useState(false);

    if (currentEditIndex === null || !postQueue[currentEditIndex]) return null;
    const post = postQueue[currentEditIndex];

    const fileInputRef = useRef<HTMLInputElement>(null);
    const addImageInputRef = useRef<HTMLInputElement>(null);

    // Get images array (with fallback for legacy data)
    const images = post.images || (post.imageBase64 ? [post.imageBase64] : []);
    const currentImage = images[selectedImageIndex] || images[0] || null;
    const canAddMore = images.length < 4;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const newImage = event.target.result as string;
                updateQueueItem(currentEditIndex, {
                    images: [newImage],
                    imageBase64: newImage
                });
            }
        };
        reader.readAsDataURL(file);
    };

    // Add additional image (for multi-image support)
    const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !canAddMore) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const newImage = event.target.result as string;
                const newImages = [...images, newImage];
                updateQueueItem(currentEditIndex, {
                    images: newImages,
                    imageBase64: newImages[0] // Keep first image as legacy
                });
                setSelectedImageIndex(newImages.length - 1); // Select the newly added image
            }
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be selected again
        if (addImageInputRef.current) addImageInputRef.current.value = '';
    };

    // Remove an image
    const handleRemoveImage = (index: number) => {
        if (images.length <= 1) return; // Don't remove the last image
        const newImages = images.filter((_, i) => i !== index);
        updateQueueItem(currentEditIndex, {
            images: newImages,
            imageBase64: newImages[0] || null
        });
        if (selectedImageIndex >= newImages.length) {
            setSelectedImageIndex(Math.max(0, newImages.length - 1));
        }
    };

    // Drag and drop handlers for adding images
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (canAddMore) setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (!canAddMore) return;

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        // Process first valid image file only (to avoid stale closure issues)
        const file = Array.from(files).find(f => f.type.startsWith('image/'));
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const newImage = event.target.result as string;
                const newImages = [...images, newImage];
                updateQueueItem(currentEditIndex, {
                    images: newImages,
                    imageBase64: newImages[0]
                });
                setSelectedImageIndex(newImages.length - 1);
            }
        };
        reader.readAsDataURL(file);
    };

    // Right-click handler
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    // Handle account selection from similarity search
    const handleAccountSelect = (candidate: ScoredCandidate) => {
        updateQueueItem(currentEditIndex, {
            personName: candidate.accountName,
            personAccount: candidate.accountHandle
        });
        setShowSearchModal(false);
    };

    if (!currentImage) {
        return (
            <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-2xl border-2 border-dashed border-white/10 cursor-pointer hover:bg-white/5 transition-colors hover:border-[var(--accent-primary)]/50 hover:text-[var(--accent-primary)]"
            >
                <ImageIcon className="w-12 h-12 mb-2" />
                <p>Click to Upload Image</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                />
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
            // Update the selected image in the array
            const newImages = [...images];
            newImages[selectedImageIndex] = croppedBase64;
            updateQueueItem(currentEditIndex, {
                images: newImages,
                imageBase64: newImages[0] // Keep first image as legacy
            });
        }
    };

    const getFilterString = () => {
        return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    };

    return (
        <div className="flex flex-col bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-white/10">
            {/* Toolbar */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-2">
                    <button className="px-2 py-1.5 hover:bg-white/10 rounded text-xs text-white border border-white/20" title="Original" onClick={() => (cropperRef.current as any)?.cropper.setAspectRatio(NaN)}>
                        Original
                    </button>
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

            {/* Main Area - with right-click support - Fixed height to allow scrolling */}
            <div
                className="relative bg-[#1a1a1a]"
                style={{ height: '400px', minHeight: '300px' }}
                onContextMenu={handleContextMenu}
            >
                <Cropper
                    key={currentImage?.substring(0, 100)} // Force re-render on image change
                    src={currentImage || ''}
                    style={{ height: '100%', width: '100%', filter: getFilterString() } as any}
                    initialAspectRatio={NaN}
                    aspectRatio={NaN} // Force free aspect ratio
                    guides={false}
                    ref={cropperRef}
                    viewMode={0} // No restrictions on crop box
                    background={false}
                    responsive={true}
                    autoCrop={false} // ★ DISABLE automatic crop - show full image as-is
                    zoomable={true}
                    scalable={true}
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

            {/* Image Thumbnails Strip */}
            <div className="p-3 bg-[var(--bg-secondary)] border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-2">
                    <span>追加画像 ({images.length}/4)</span>
                    <span className="text-[var(--text-muted)]">同じモデルさんの写真を最大4枚まで</span>
                </div>
                <div className="flex items-center gap-2">
                    {images.map((img, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                selectedImageIndex === idx
                                    ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30"
                                    : "border-white/10 hover:border-white/30"
                            )}
                            onClick={() => setSelectedImageIndex(idx)}
                        >
                            <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                            {images.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveImage(idx);
                                    }}
                                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                                >
                                    <XIcon className="w-3 h-3 text-white" />
                                </button>
                            )}
                            <div className="absolute bottom-0.5 left-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                                {idx + 1}
                            </div>
                        </div>
                    ))}
                    {canAddMore && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => addImageInputRef.current?.click()}
                            className={cn(
                                "w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer",
                                isDragOver
                                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 scale-105"
                                    : "border-white/20 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                            )}
                        >
                            <Plus className="w-6 h-6" />
                            <span className="text-[10px]">{isDragOver ? "ドロップ" : "追加"}</span>
                        </div>
                    )}
                    <input
                        ref={addImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAddImage}
                    />
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ImageContextMenu
                    position={contextMenu}
                    onClose={() => setContextMenu(null)}
                    onSearchWithAI={async () => {
                        if (!post.imageBase64) {
                            showToast({
                                type: 'error',
                                title: '画像がありません'
                            });
                            return;
                        }

                        const toastId = showToast({
                            type: 'loading',
                            title: 'Cameko解析中...',
                            message: 'ブラウザウィンドウが開きます'
                        });

                        try {
                            console.log('[Cameko] Starting visible search...');

                            const response = await fetch('/api/cameko-search', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ imageBase64: post.imageBase64 })
                            });

                            const result = await response.json();
                            console.log('[Cameko] Result:', result);

                            if (result.success) {
                                updateToast(toastId, {
                                    type: 'success',
                                    title: 'Cameko解析完了！',
                                    message: '結果をブラウザウィンドウで確認してください'
                                });
                            } else {
                                updateToast(toastId, {
                                    type: 'error',
                                    title: '解析に失敗しました',
                                    message: result.error || '不明なエラー'
                                });
                            }

                        } catch (error: any) {
                            console.error('[Cameko] Error:', error);
                            updateToast(toastId, {
                                type: 'error',
                                title: 'エラーが発生しました',
                                message: error.message
                            });
                        }
                    }}
                    onSearchAccount={() => setShowSearchModal(true)}
                    onExtractMetadata={() => {
                        // TODO: Implement metadata extraction
                        console.log('Extract metadata');
                    }}
                    onGenerateComment={() => {
                        // TODO: Integrate with existing AI comment generation
                        console.log('Generate AI comment');
                    }}
                    onFactCheck={post.personName ? async () => {
                        const personName = post.personName;
                        if (!personName || !post.imageBase64) {
                            showToast({
                                type: 'error',
                                title: '検証に必要な情報がありません',
                                message: '先にCamekoで解析を実行してください'
                            });
                            return;
                        }

                        const toastId = showToast({
                            type: 'loading',
                            title: '検証中...',
                            message: `${personName}をGoogle画像検索で検証しています`
                        });

                        try {
                            const response = await fetch('/api/fact-check', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    personName,
                                    originalImageBase64: post.imageBase64,
                                    fetchImages: false
                                })
                            });

                            const result = await response.json();
                            console.log('[FactCheck] Result:', result);

                            if (result.success && result.matchedImages.length > 0) {
                                updateToast(toastId, {
                                    type: 'success',
                                    title: '検証完了！',
                                    message: `${result.matchedImages.length}件の関連画像が見つかりました。結果はコンソールを確認してください。`
                                });

                                // 画像URLをコンソールに出力（将来的にモーダルで表示）
                                console.log('[FactCheck] Matched images:', result.matchedImages);
                            } else if (result.success) {
                                updateToast(toastId, {
                                    type: 'info',
                                    title: '検証完了',
                                    message: '関連画像が見つかりませんでした'
                                });
                            } else {
                                updateToast(toastId, {
                                    type: 'error',
                                    title: '検証に失敗しました',
                                    message: result.error || '不明なエラー'
                                });
                            }
                        } catch (error: any) {
                            console.error('[FactCheck] Error:', error);
                            updateToast(toastId, {
                                type: 'error',
                                title: 'エラーが発生しました',
                                message: error.message
                            });
                        }
                    } : undefined}
                />
            )}

            {/* Similarity Search Modal */}
            {showSearchModal && post.imageBase64 && (
                <SimilaritySearchModal
                    imageBase64={post.imageBase64}
                    eventName={post.eventInfo?.eventJp}
                    onSelect={handleAccountSelect}
                    onClose={() => setShowSearchModal(false)}
                />
            )}
        </div>
    );
}
