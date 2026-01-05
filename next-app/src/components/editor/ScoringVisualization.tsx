"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { cn } from "@/utils/cn";

// 60項目の定義（kotaro_scoring.pyと同期）
const CRITERIA_DEFINITIONS: Record<string, { question: string; sub: string }> = {
    // きれい系（A01-A15）
    "A01": { question: "正面を向いている", sub: "きれい" },
    "A02": { question: "全身が映っている", sub: "きれい" },
    "A03": { question: "スタイル・曲線が美しい", sub: "きれい" },
    "A04": { question: "衣装が明るい色（白/青系）", sub: "きれい" },
    "A05": { question: "背景と馴染んでいる", sub: "きれい" },
    "A06": { question: "ポーズが決まっている", sub: "きれい" },
    "A07": { question: "体のラインがきれい", sub: "きれい" },
    "A08": { question: "透明感がある", sub: "きれい" },
    "A09": { question: "視線がまっすぐ", sub: "きれい" },
    "A10": { question: "黒目が大きく見える", sub: "きれい" },
    "A11": { question: "衣装の完成度が高い", sub: "きれい" },
    "A12": { question: "コスプレ・キャラ衣装", sub: "きれい" },
    "A13": { question: "複数人で映っている", sub: "きれい" },
    "A14": { question: "チーム衣装・お揃い", sub: "きれい" },
    "A15": { question: "写真全体のバランスが良い", sub: "きれい" },
    // かわいい系（B01-B15）
    "B01": { question: "笑顔である", sub: "かわいい" },
    "B02": { question: "にこっとしている", sub: "かわいい" },
    "B03": { question: "ピースサイン", sub: "かわいい" },
    "B04": { question: "指ハート", sub: "かわいい" },
    "B05": { question: "手を振っている", sub: "かわいい" },
    "B06": { question: "口角が上がっている", sub: "かわいい" },
    "B07": { question: "目が笑っている", sub: "かわいい" },
    "B08": { question: "ふわっとした雰囲気", sub: "かわいい" },
    "B09": { question: "何かを持っている", sub: "かわいい" },
    "B10": { question: "頬が丸い・柔らかそう", sub: "かわいい" },
    "B11": { question: "衣装がピンク・パステル系", sub: "かわいい" },
    "B12": { question: "小物・アクセサリーが可愛い", sub: "かわいい" },
    "B13": { question: "イベントで楽しそう", sub: "かわいい" },
    "B14": { question: "動きのある仕草", sub: "かわいい" },
    "B15": { question: "自然体", sub: "かわいい" },
    // クール系（C01-C15）
    "C01": { question: "表情が控えめ", sub: "クール" },
    "C02": { question: "落ち着いた雰囲気", sub: "クール" },
    "C03": { question: "大人っぽい", sub: "クール" },
    "C04": { question: "衣装が黒・ダーク系", sub: "クール" },
    "C05": { question: "クールな視線", sub: "クール" },
    "C06": { question: "余裕がある表情", sub: "クール" },
    "C07": { question: "プロっぽさ", sub: "クール" },
    "C08": { question: "決めポーズがバッチリ", sub: "クール" },
    "C09": { question: "衣装とポーズの完成度高い", sub: "クール" },
    "C10": { question: "カッコいい系の衣装", sub: "クール" },
    "C11": { question: "キリッとした表情", sub: "クール" },
    "C12": { question: "目力が強い", sub: "クール" },
    "C13": { question: "サーキット・レース背景", sub: "クール" },
    "C14": { question: "衣装と表情のギャップ", sub: "クール" },
    "C15": { question: "意外性がある", sub: "クール" },
    // 親近感系（D01-D15）
    "D01": { question: "カメラとの距離が近い", sub: "親近感" },
    "D02": { question: "安心感がある表情", sub: "親近感" },
    "D03": { question: "目線が優しい", sub: "親近感" },
    "D04": { question: "ほっとする雰囲気", sub: "親近感" },
    "D05": { question: "自然な笑顔", sub: "親近感" },
    "D06": { question: "話しかけてくれそう", sub: "親近感" },
    "D07": { question: "イベント会場の雰囲気", sub: "親近感" },
    "D08": { question: "人混み・ブース背景", sub: "親近感" },
    "D09": { question: "思い出感がある", sub: "親近感" },
    "D10": { question: "ふとした瞬間", sub: "親近感" },
    "D11": { question: "柔らかい雰囲気", sub: "親近感" },
    "D12": { question: "さすが感・安定感", sub: "親近感" },
    "D13": { question: "いつも通りの良さ", sub: "親近感" },
    "D14": { question: "グループ・仲間感", sub: "親近感" },
    "D15": { question: "癒される", sub: "親近感" },
};

// カテゴリ別の色定義
const CATEGORY_COLORS = {
    A: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
    B: { bg: "bg-pink-500/20", text: "text-pink-300", border: "border-pink-500/30" },
    C: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" },
    D: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" },
};

// サブ属性の色定義
const SUB_COLORS: Record<string, string> = {
    "きれい": "bg-blue-500",
    "かわいい": "bg-pink-500",
    "クール": "bg-purple-500",
    "親近感": "bg-emerald-500",
};

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

    // サブスコアの最大値（棒グラフのスケール用）
    const maxSubScore = Math.max(...Object.values(subScores), 1);

    // カテゴリ別に項目をグループ化
    const groupedCriteria = {
        A: Object.keys(CRITERIA_DEFINITIONS).filter(k => k.startsWith("A")),
        B: Object.keys(CRITERIA_DEFINITIONS).filter(k => k.startsWith("B")),
        C: Object.keys(CRITERIA_DEFINITIONS).filter(k => k.startsWith("C")),
        D: Object.keys(CRITERIA_DEFINITIONS).filter(k => k.startsWith("D")),
    };

    const categoryLabels = {
        A: "きれい系",
        B: "かわいい系",
        C: "クール系",
        D: "親近感系",
    };

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
