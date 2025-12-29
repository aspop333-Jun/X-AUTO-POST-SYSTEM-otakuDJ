/**
 * Universal Heuristic Parser v2
 * 
 * CRITICAL FIX: Prioritized Marker Categorization
 * - Only uses ONE marker category for block splitting
 * - Priority: CIRCLED (①-㊿) > NUMBERED (1. 2.) > SYMBOLS (・-*) > EMPTY_LINES
 * 
 * This prevents over-segmentation when content contains multiple marker types.
 */

import { ParsedEntry } from './bulkTextParser';

export interface UniversalParseResult {
    entries: ParsedEntry[];
    confidence: number;
    strategyUsed: string;
    warnings: string[];
}

// --- 1. Line Classification ---

type LineType = 'EMPTY' | 'CIRCLED_MARKER' | 'NUMBERED_MARKER' | 'SYMBOL_MARKER' | 'KEYVALUE' | 'DATE' | 'TEXT';

interface LineSignature {
    index: number;
    text: string;
    type: LineType;
    indent: number;
}

// Separate regexes for each marker category
const CIRCLED_MARKER = /^[①-㊿]/;  // Circled numbers 1-50
const NUMBERED_MARKER = /^\d{1,2}\.\s/;  // "1. " or "12. " - requires space, max 2 digits to avoid years
const SYMBOL_MARKER = /^[・\-\*■◆●▼▲]/;  // Bullet symbols

const DATE_PATTERN = /\d{4}[\.\/-]\d{1,2}[\.\/-]\d{1,2}|(\d{1,2}月\d{1,2}日)/;
const KEYVALUE_PATTERN = /^[^：:]+[：:]/;

function getLineSignature(line: string, index: number): LineSignature {
    const trimmed = line.trim();
    if (!trimmed) {
        return { index, text: line, type: 'EMPTY', indent: 0 };
    }

    const indent = line.search(/\S|$/);

    // Check markers in priority order
    if (CIRCLED_MARKER.test(trimmed)) {
        return { index, text: line, type: 'CIRCLED_MARKER', indent };
    }
    if (NUMBERED_MARKER.test(trimmed)) {
        return { index, text: line, type: 'NUMBERED_MARKER', indent };
    }
    if (SYMBOL_MARKER.test(trimmed)) {
        return { index, text: line, type: 'SYMBOL_MARKER', indent };
    }

    // Non-marker classifications
    if (KEYVALUE_PATTERN.test(trimmed)) {
        return { index, text: line, type: 'KEYVALUE', indent };
    }
    if (DATE_PATTERN.test(trimmed) && trimmed.length < 25) {
        return { index, text: line, type: 'DATE', indent };
    }

    return { index, text: line, type: 'TEXT', indent };
}

// --- 2. Block Splitting with Marker Priority ---

function splitBlocksUniversal(signatures: LineSignature[]): LineSignature[][] {
    // Collect line indices for each marker category
    const circledIndices: number[] = [];
    const numberedIndices: number[] = [];
    const symbolIndices: number[] = [];

    signatures.forEach((s, idx) => {
        switch (s.type) {
            case 'CIRCLED_MARKER': circledIndices.push(idx); break;
            case 'NUMBERED_MARKER': numberedIndices.push(idx); break;
            case 'SYMBOL_MARKER': symbolIndices.push(idx); break;
        }
    });

    // Choose ONLY ONE marker type based on priority
    // CRITICAL: Don't mix marker types - this was causing over-segmentation
    let splitIndices: number[] = [];
    let strategyName = 'UNKNOWN';

    if (circledIndices.length >= 1) {
        // Circled numbers are the strongest signal (㉑, ㉒, etc.)
        splitIndices = circledIndices;
        strategyName = 'CIRCLED';
    } else if (numberedIndices.length >= 2) {
        // Numbered lists (1. 2. 3.) - require at least 2 to be considered a pattern
        splitIndices = numberedIndices;
        strategyName = 'NUMBERED';
    } else if (symbolIndices.length >= 3) {
        // Symbols require more instances to be trusted (could be coincidental)
        splitIndices = symbolIndices;
        strategyName = 'SYMBOL';
    }

    // Use marker-based splitting if we have indices
    if (splitIndices.length >= 1) {
        const blocks: LineSignature[][] = [];
        for (let i = 0; i < splitIndices.length; i++) {
            const start = splitIndices[i];
            const end = (i + 1 < splitIndices.length) ? splitIndices[i + 1] : signatures.length;

            const block = signatures.slice(start, end).filter(s => s.type !== 'EMPTY');
            if (block.length > 0) blocks.push(block);
        }
        return blocks;
    }

    // Fallback: Empty line splitting (require 2+ empty lines for robustness)
    const blocksByEmpty: LineSignature[][] = [];
    let currentBlock: LineSignature[] = [];
    let consecutiveEmptyCount = 0;

    signatures.forEach(s => {
        if (s.type === 'EMPTY') {
            consecutiveEmptyCount++;
        } else {
            // Split only on 2+ consecutive empty lines
            if (consecutiveEmptyCount >= 2 && currentBlock.length > 0) {
                blocksByEmpty.push(currentBlock);
                currentBlock = [];
            }
            currentBlock.push(s);
            consecutiveEmptyCount = 0;
        }
    });
    if (currentBlock.length > 0) blocksByEmpty.push(currentBlock);

    return blocksByEmpty;
}

// --- 3. Field Inference ---

function extractValue(text: string): string {
    return text.replace(/^[^：:]+[：:]\s*/, '').trim();
}

function guessField(line: string): { type: 'date' | 'venue' | 'account' | 'event' | 'eventJp' | 'hashtag' | 'unknown', value: string } {
    const text = line.trim();

    // Explicit Japanese Labels (highest priority)
    if (/^(日付|Date|日時)[：:]/i.test(text)) return { type: 'date', value: extractValue(text) };
    if (/^(会場|場所|Venue|会場場所)[：:]/i.test(text)) return { type: 'venue', value: extractValue(text) };
    if (/^(イベント名|Event|イベント)[：:]/i.test(text)) return { type: 'event', value: extractValue(text) };
    if (/^(日本語名|日本語)[：:]/i.test(text)) return { type: 'eventJp', value: extractValue(text) };
    if (/^(ハッシュタグ|Hashtag|タグ)[：:]/i.test(text)) return { type: 'hashtag', value: extractValue(text) };

    // Content Inference (pattern-based)
    if (DATE_PATTERN.test(text)) return { type: 'date', value: text };
    if (/@([a-zA-Z0-9_]+)/.test(text)) return { type: 'account', value: text };

    // Venue heuristics (common Japanese venue keywords)
    if (/(ホール|Hall|展示場|赤レンガ|スクエア|プラザ|ドーム|アリーナ|House|ハウス|Camp|キャンプ|マンガミュージアム|会議場|大学)/.test(text)) {
        return { type: 'venue', value: text };
    }

    return { type: 'unknown', value: text };
}

// --- Main Parser Function ---

export function parseUniversal(text: string): UniversalParseResult {
    const rawLines = text.split(/\r?\n/);
    const signatures = rawLines.map((l, i) => getLineSignature(l, i));

    const blocks = splitBlocksUniversal(signatures);

    const entries: ParsedEntry[] = blocks.map(block => {
        const entry: ParsedEntry = {
            boothName: '',
            boothAccount: '',
            personName: '',
            personAccount: '',
            role: 'モデル',
            confidence: 70,
            rawText: block.map(s => s.text).join('\n'),
            eventInfo: {
                eventEn: '',
                eventJp: '',
                date: '',
                venue: '',
                hashtags: '',
                category: 'ブース'
            }
        } as any;

        // Process each line in block
        block.forEach(lineSig => {
            // Skip marker lines (they're just delimiters)
            if (lineSig.type === 'CIRCLED_MARKER' || lineSig.type === 'NUMBERED_MARKER' || lineSig.type === 'SYMBOL_MARKER') {
                return;
            }

            const raw = lineSig.text.trim();
            const guess = guessField(raw);
            const val = guess.value;

            // Assign based on guess
            switch (guess.type) {
                case 'date':
                    (entry as any).eventInfo.date = val;
                    break;
                case 'venue':
                    (entry as any).eventInfo.venue = val;
                    break;
                case 'event':
                    (entry as any).eventInfo.eventEn = val;
                    break;
                case 'eventJp':
                    (entry as any).eventInfo.eventJp = val;
                    break;
                case 'hashtag':
                    (entry as any).eventInfo.hashtags = val;
                    break;
                case 'account':
                    const match = val.match(/@([a-zA-Z0-9_]+)/);
                    if (match && !entry.personAccount) {
                        entry.personAccount = match[1];
                    }
                    break;
                case 'unknown':
                    // Fill in empty fields in order of priority
                    if (!(entry as any).eventInfo.eventEn && !(entry as any).eventInfo.eventJp) {
                        if (/[ぁ-んァ-ヶ一-龥]/.test(val)) {
                            (entry as any).eventInfo.eventJp = val;
                        } else {
                            (entry as any).eventInfo.eventEn = val;
                        }
                    } else if (!entry.boothName) {
                        entry.boothName = val;
                    }
                    break;
            }

            // Extract any hashtags from the line
            if (raw.includes('#')) {
                const tags = raw.match(/#[a-zA-Z0-9_\u3040-\u30ff\u4e00-\u9faf]+/g);
                if (tags) {
                    const existing = (entry as any).eventInfo.hashtags;
                    (entry as any).eventInfo.hashtags = (existing ? existing + ' ' : '') + tags.join(' ');
                }
            }
        });

        // Cleanup
        (entry as any).eventInfo.hashtags = ((entry as any).eventInfo.hashtags || '').trim();

        return entry;
    });

    return {
        entries,
        confidence: 80,
        strategyUsed: 'Heuristic-Universal-v2',
        warnings: []
    };
}
