"use client";

import { useState } from "react";
import { Calendar, MapPin, Hash, FileText, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAppStore, EventInfo } from "@/store/useAppStore";
import { cn } from "@/utils/cn";

interface EventInfoPanelProps {
    className?: string;
}

export function EventInfoPanel({ className }: EventInfoPanelProps) {
    const { isEventInfoSet, currentEventInfo, setCurrentEventInfo, clearCurrentEventInfo } = useAppStore();
    const [isEditing, setIsEditing] = useState(!isEventInfoSet);
    const [inputText, setInputText] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Form state for direct editing
    const [formData, setFormData] = useState<EventInfo>({
        eventEn: currentEventInfo.eventEn || "",
        eventJp: currentEventInfo.eventJp || "",
        date: currentEventInfo.date || "",
        venue: currentEventInfo.venue || "",
        category: currentEventInfo.category || "ブース",
        hashtags: currentEventInfo.hashtags || "",
    });

    // Parse pasted text to extract event info
    const parseEventText = (text: string): Partial<EventInfo> => {
        const result: Partial<EventInfo> = {};
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

        // Dictionary for smart mapping
        const eventDictionary = [
            { keywords: ['東京ゲームショウ', 'Tokyo Game Show', 'TGS'], en: 'Tokyo Game Show', abbr: 'TGS' },
            { keywords: ['SUPER GT', 'SGT', 'SuperGT'], en: 'SUPER GT', abbr: 'SGT' },
            { keywords: ['東京オートサロン', 'Tokyo Auto Salon', 'TAS'], en: 'Tokyo Auto Salon', abbr: 'TAS' },
            { keywords: ['CP+'], en: 'CP+', abbr: 'CPPlus' },
            { keywords: ['コミックマーケット', 'コミケ', 'Comic Market'], en: 'Comic Market', abbr: 'C' },
            { keywords: ['ニコニコ超会議', 'Niconico Chokaigi'], en: 'Niconico Chokaigi', abbr: 'Chokaigi' },
            { keywords: ['ワンダーフェスティバル', 'Wonder Festival', 'ワンフェス'], en: 'Wonder Festival', abbr: 'WF' },
        ];

        // Keywords for detecting race-related events (Category determination)
        const raceKeywords = ['Super GT', 'SGT', 'Formula', 'Race', 'Racing', 'Circuit', 'D1', 'Taikyu', '8hit', 'レース', 'サーキット', '耐久'];
        let isRaceEvent = false;

        // Keywords for detecting venues
        const venueKeywords = ['幕張メッセ', 'ビッグサイト', '国際展示場', 'インテックス', '会場', 'ホール', 'センター', 'Messe', 'Big Sight', 'スピードウェイ', 'Speedway'];

        const parsedHashtags: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Date patterns: 2025.09.25 or 2025/9/26-28
            const dateMatch = line.match(/(\d{4}[.\/\-]\d{1,2}[.\/\-]\d{1,2})/);
            if (dateMatch) {
                result.date = dateMatch[1];

                // Check if venue is on the same line after the date (e.g. "2025.09.25 - 28 幕張メッセ")
                // Replace the date part and check remaining text
                const afterDate = line.replace(/.*?(\d{4}[.\/\-]\d{1,2}[.\/\-]\d{1,2}(?:[-\s]*\d{1,2})?)/, "").trim();

                if (afterDate.length > 2 && !result.venue) {
                    // If contains venue keywords or looks like a place
                    if (venueKeywords.some(k => afterDate.includes(k)) || afterDate.length < 20) {
                        result.venue = afterDate;
                    }
                }
            }

            // Explicit Venue line
            if (venueKeywords.some(k => line.includes(k)) && !result.venue) {
                // If the line IS just the keyword (e.g. "幕張メッセ"), use it.
                if (venueKeywords.some(k => line === k)) {
                    result.venue = line;
                } else {
                    // Try to strip standard prefixes "Venue: ..."
                    const clean = line.replace(/^(会場|Venue|Place)[\s：:]+/, "").trim();
                    // Heuristic: if the line was long and we just stripped a prefix, it might be the venue
                    if (clean.length < 30) {
                        result.venue = clean;
                    }
                }
            }

            // Hashtags
            const hashtagMatch = line.match(/((?:#[^\s#]+\s*)+)/);
            if (hashtagMatch) {
                const tags = hashtagMatch[1].trim().split(/\s+/);
                parsedHashtags.push(...tags);
            }

            // Event name (English)
            if (/^[A-Za-z0-9\s\-_&'".!]+$/.test(line) && line.length > 3 && !result.eventEn) {
                result.eventEn = line;
                if (raceKeywords.some(k => line.toLowerCase().includes(k.toLowerCase()))) isRaceEvent = true;
            }

            // Event name (Japanese)
            if (/[\u3040-\u30ff\u3400-\u9fff]/.test(line) && line.length > 2 && !result.eventJp) {
                // Skip if it looks like a venue/location
                if (!venueKeywords.some(k => line.includes(k))) {
                    result.eventJp = line;
                    if (raceKeywords.some(k => line.includes(k))) isRaceEvent = true;
                }
            }
        }

        // --- Smart Dictionary Matching ---
        // If we found a Japanese name but no English name, try to map it
        if (result.eventJp && !result.eventEn) {
            const match = eventDictionary.find(d => d.keywords.some(k => result.eventJp!.includes(k)));
            if (match) {
                result.eventEn = match.en;
            }
        }
        // Vice versa
        if (result.eventEn && !result.eventJp) {
            const match = eventDictionary.find(d => d.keywords.some(k => result.eventEn!.includes(k)));
            if (match) {
                // We keep eventJp empty if we can't be sure
            }
        }

        // --- Hashtag Logic ---
        // 1. Abbreviation + Year (e.g. #TGS2025)
        let abbrTag = "";

        // Try to find year from Date or Input
        let year = "2025"; // Default fallback?
        if (result.date) {
            const yMatch = result.date.match(/^(\d{4})/);
            if (yMatch) year = yMatch[1];
        } else {
            // Try to find year in any line
            const yMatch = text.match(/20\d{2}/);
            if (yMatch) year = yMatch[0];
        }

        // A. Check explicit input hashtags for something looking like Abbr+Year
        const abbrYearRegex = new RegExp(`^#[A-Za-z0-9]+${year}$`);
        const foundAbbrTag = parsedHashtags.find(t => abbrYearRegex.test(t));

        if (foundAbbrTag) {
            abbrTag = foundAbbrTag;
        } else {
            // B. Generate from Dictionary
            const combinedName = (result.eventJp || "") + " " + (result.eventEn || "");
            const dictMatch = eventDictionary.find(d => d.keywords.some(k => combinedName.includes(k)));

            if (dictMatch) {
                abbrTag = `#${dictMatch.abbr}${year}`;
            }
        }

        // 2. Category Tag
        // Check keywords again in the finalized names
        const allText = (result.eventJp || "") + (result.eventEn || "") + (result.venue || "");
        if (raceKeywords.some(k => allText.toLowerCase().includes(k.toLowerCase()))) {
            isRaceEvent = true;
        }

        const categoryTag = isRaceEvent ? "#レースクィーン" : "#イベントコンパニオン";

        const finalHashtags: string[] = [];
        if (abbrTag) finalHashtags.push(abbrTag);
        finalHashtags.push(categoryTag);

        // Verify we don't duplicate
        const uniqueTags = Array.from(new Set(finalHashtags));

        result.hashtags = uniqueTags.join(" ");

        return result;
    };

    const handlePasteAndParse = () => {
        if (!inputText.trim()) return;

        const parsed = parseEventText(inputText);
        setFormData(prev => ({
            ...prev,
            ...parsed,
        }));
        setShowAdvanced(true);
    };

    const handleConfirm = () => {
        // Validate minimum required info
        if (!formData.eventEn && !formData.eventJp) {
            return;
        }

        setCurrentEventInfo(formData);
        setIsEditing(false);
    };

    const handleEdit = () => {
        setFormData({
            eventEn: currentEventInfo.eventEn || "",
            eventJp: currentEventInfo.eventJp || "",
            date: currentEventInfo.date || "",
            venue: currentEventInfo.venue || "",
            category: currentEventInfo.category || "ブース",
            hashtags: currentEventInfo.hashtags || "",
        });
        setIsEditing(true);
    };

    const handleClear = () => {
        clearCurrentEventInfo();
        setFormData({
            eventEn: "",
            eventJp: "",
            date: "",
            venue: "",
            category: "ブース",
            hashtags: "",
        });
        setInputText("");
        setIsEditing(true);
        setShowAdvanced(false);
    };

    // Display mode - show current event info
    if (isEventInfoSet && !isEditing) {
        return (
            <div className={cn(
                "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/30",
                className
            )}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">イベント情報設定済み</h3>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleEdit}
                            className="text-sm px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            編集
                        </button>
                        <button
                            onClick={handleClear}
                            className="text-sm px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        >
                            クリア
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2">
                        <span className="text-[var(--text-muted)] text-xs">イベント名</span>
                        <p className="text-white font-medium">
                            {currentEventInfo.eventJp || currentEventInfo.eventEn || "-"}
                        </p>
                        {currentEventInfo.eventJp && currentEventInfo.eventEn && (
                            <p className="text-[var(--text-secondary)] text-xs">{currentEventInfo.eventEn}</p>
                        )}
                    </div>
                    {currentEventInfo.date && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                            <span>{currentEventInfo.date}</span>
                        </div>
                    )}
                    {currentEventInfo.venue && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                            <span>{currentEventInfo.venue}</span>
                        </div>
                    )}
                    {currentEventInfo.hashtags && (
                        <div className="col-span-2 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-[var(--accent-primary)]" />
                            <span className="text-[var(--accent-primary)]">{currentEventInfo.hashtags}</span>
                        </div>
                    )}
                </div>

                <p className="text-xs text-emerald-400 mt-4">
                    ✓ 写真をドロップできます
                </p>
            </div>
        );
    }

    // Editing mode - input form
    return (
        <div className={cn(
            "bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl p-6 border-2 border-dashed border-indigo-500/50",
            className
        )}>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">① イベント情報を入力</h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                        HPからコピペするだけでOK！
                    </p>
                </div>
            </div>

            {/* Paste area */}
            <div className="mb-4">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="イベントHPからコピーしたテキストを貼り付け...

例:
Tokyo Game Show 2025
東京ゲームショウ2025
2025/9/26-28
幕張メッセ
#TGS2025 #東京ゲームショウ"
                    className="w-full h-32 bg-[var(--bg-tertiary)] border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none text-sm"
                />
                <button
                    onClick={handlePasteAndParse}
                    disabled={!inputText.trim()}
                    className="mt-2 w-full py-2 bg-indigo-500/30 hover:bg-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                    テキストを解析
                </button>
            </div>

            {/* Manual input toggle */}
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors mb-4"
            >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                手動で入力・編集
            </button>

            {/* Manual input fields */}
            {showAdvanced && (
                <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-[var(--text-muted)] mb-1 block">イベント名（日本語）</label>
                            <input
                                type="text"
                                value={formData.eventJp}
                                onChange={(e) => setFormData(prev => ({ ...prev, eventJp: e.target.value }))}
                                placeholder="東京ゲームショウ2025"
                                className="w-full bg-[var(--bg-tertiary)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)] mb-1 block">Event Name (English)</label>
                            <input
                                type="text"
                                value={formData.eventEn}
                                onChange={(e) => setFormData(prev => ({ ...prev, eventEn: e.target.value }))}
                                placeholder="Tokyo Game Show 2025"
                                className="w-full bg-[var(--bg-tertiary)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-[var(--text-muted)] mb-1 block">日付</label>
                            <input
                                type="text"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                placeholder="2025/9/26"
                                className="w-full bg-[var(--bg-tertiary)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)] mb-1 block">会場</label>
                            <input
                                type="text"
                                value={formData.venue}
                                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                                placeholder="幕張メッセ"
                                className="w-full bg-[var(--bg-tertiary)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-[var(--text-muted)] mb-1 block">ハッシュタグ</label>
                        <input
                            type="text"
                            value={formData.hashtags}
                            onChange={(e) => setFormData(prev => ({ ...prev, hashtags: e.target.value }))}
                            placeholder="#TGS2025 #東京ゲームショウ"
                            className="w-full bg-[var(--bg-tertiary)] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        />
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleConfirm}
                    disabled={!formData.eventEn && !formData.eventJp}
                    className="flex-1 py-3 bg-[var(--accent-primary)] hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Check className="w-4 h-4" />
                    イベント情報を確定
                </button>
                {isEventInfoSet && (
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <p className="text-xs text-amber-400 mt-4 text-center">
                ⚠ イベント情報を入力してから写真を追加できます
            </p>
        </div>
    );
}
