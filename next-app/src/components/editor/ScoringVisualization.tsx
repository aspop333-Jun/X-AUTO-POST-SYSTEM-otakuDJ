"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { cn } from "@/utils/cn";

interface ScoringVisualizationProps {
    pattern: {
        id: string;
        name: string;
        trigger?: string;
        attack?: string;
        sub_ranking?: string[];
    };
    subScores: Record<string, number>;
    elementScores?: Record<string, number>;  // V3.0 A-E scores
    detectedCriteria: string[];
}

export function ScoringVisualization({ pattern, subScores, elementScores, detectedCriteria }: ScoringVisualizationProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border-t border-white/5 bg-[var(--bg-tertiary)]/30">
            {/* ヘッダー（折りたたみトグル） */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    スコアリング詳細
                    <span className="text-xs text-[var(--text-muted)] font-normal">
                        ({pattern.id}: {pattern.name})
                    </span>
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isExpanded && (
                <div className="p-4 pt-0 space-y-4">
                    {/* 第一判定パネル */}
                    <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-amber-400 font-bold text-sm">🎯 第一判定</span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-mono">
                                {pattern.id}
                            </span>
                        </div>
                        <div className="text-white font-medium">{pattern.name}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                            トリガー: {pattern.attack || pattern.trigger}
                        </div>
                    </div>

                    {/* V3.0 A-E 要素スコア */}
                    <div className="space-y-3">
                        <div className="text-xs font-medium text-[var(--text-secondary)]">
                            🎯 V3.0 要素スコア (A-E)
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { key: "A", name: "表情の確定遅延", desc: "表情が完全に決まり切らず、余韻が残っている" },
                                { key: "B", name: "視線の意図未決定", desc: "視線の向き・意味が断定できない" },
                                { key: "C", name: "顔パーツ感情非同期", desc: "目・口・眉が異なる感情を語っている" },
                                { key: "D", name: "優しさ・安心 (温度)", desc: "見ていて「ほっとする」「癒される」温度感" },
                                { key: "E", name: "親近感 (距離)", desc: "被写体が「こちら側」にいると感じさせる距離" },
                            ].map(({ key, name, desc }) => {
                                // element_scores から取得（V3.0 A-E scores）
                                const score = elementScores?.[key] || 0;
                                const percentage = (score / 5) * 100;
                                const colors = {
                                    A: "bg-blue-500",
                                    B: "bg-cyan-500",
                                    C: "bg-pink-500",
                                    D: "bg-amber-500",
                                    E: "bg-emerald-500",
                                }[key] || "bg-gray-500";

                                return (
                                    <div key={key} className="p-2 rounded bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-white">{key}: {name}</span>
                                            <span className="text-xs text-[var(--text-muted)]">{score}/5</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded overflow-hidden">
                                            <div
                                                className={cn("h-full rounded transition-all", colors)}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] text-[var(--text-muted)] mt-1">{desc}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* 検出フラグ (V4) */}
                    {detectedCriteria && detectedCriteria.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-[var(--text-secondary)]">
                                🚩 検出フラグ (V4調整)
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {detectedCriteria.map(flag => (
                                    <span key={flag} className="px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-[10px] text-white">
                                        {flag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
