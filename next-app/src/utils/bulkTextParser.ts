/**
 * Bulk Text Parser
 * Parses various text formats to extract post information
 * Ported from legacy bulk-text-parser.js
 */

export interface ParsedEntry {
    boothName: string;
    boothAccount: string;
    personName: string;
    personAccount: string;
    role: string;
    confidence: number;
    rawText: string;
    eventInfo?: {
        eventEn: string;
        eventJp: string;
        date: string;
        venue: string;
        hashtags: string;
        category: string;
    };
}

export interface ParseResult {
    entries: ParsedEntry[];
    format: string;
    warnings: string[];
}

/**
 * Detects the format of the input text
 */
export function detectFormat(text: string): string {
    if (!text) return 'unknown';

    const trimmedText = text.trim();
    if (trimmedText.length === 0) return 'unknown';

    // Priority 1: Circled numbers ①②③④⑤⑥⑦⑧⑨⑩
    const circledPattern = /[①②③④⑤⑥⑦⑧⑨⑩]/;
    if (circledPattern.test(text)) return 'circled';

    // Priority 2: Numbered lists (1. 2. 3. or (1) (2) (3))
    const numberedPattern = /^(?:\d+\.|（\d+）|\(\d+\))\s/m;
    if (numberedPattern.test(text)) return 'numbered';

    // Priority 3: Separator lines (--- or ===)
    const separatorPattern = /^(?:---|===)\s*$/m;
    if (separatorPattern.test(text)) return 'separated';

    // Priority 4: Bullet points (・ - *)
    const bulletPattern = /^[・\-\*]\s/m;
    if (bulletPattern.test(text)) return 'bullet';

    // Priority 5: Paragraph (2+ newlines)
    const paragraphPattern = /\n\s*\n/;
    if (paragraphPattern.test(text)) return 'paragraph';

    // Priority 6: CSV/Tab-separated
    const csvPattern = /[\t,].*[\t,]/;
    if (csvPattern.test(text)) return 'csv';

    return 'unknown';
}

/**
 * Splits text into blocks based on detected format
 */
export function splitIntoBlocks(text: string, format: string): string[] {
    if (!text) return [];

    const trimmedText = text.trim();
    if (trimmedText.length === 0) return [];

    switch (format) {
        case 'circled': return splitByCircledNumbers(trimmedText);
        case 'numbered': return splitByNumberedList(trimmedText);
        case 'separated': return splitBySeparator(trimmedText);
        case 'paragraph': return splitByParagraph(trimmedText);
        case 'bullet': return splitByBullet(trimmedText);
        case 'csv': return splitByCsv(trimmedText);
        case 'unknown':
        default: return splitByLine(trimmedText);
    }
}

function splitByCircledNumbers(text: string): string[] {
    const pattern = /[①②③④⑤⑥⑦⑧⑨⑩]/g;
    const blocks: string[] = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (lastIndex > 0) {
            const block = text.substring(lastIndex, match.index).trim();
            if (block) blocks.push(block);
        }
        lastIndex = match.index + 1; // +1 because circled number is 1 char
    }

    if (lastIndex < text.length) {
        const block = text.substring(lastIndex).trim();
        if (block) blocks.push(block);
    }

    return blocks;
}

function splitByNumberedList(text: string): string[] {
    const pattern = /^(?:\d+\.|（\d+）|\(\d+\))\s/gm;
    const blocks: string[] = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (lastIndex > 0) {
            const block = text.substring(lastIndex, match.index).trim();
            if (block) blocks.push(block);
        }
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        const block = text.substring(lastIndex).trim();
        if (block) blocks.push(block);
    }

    return blocks;
}

function splitBySeparator(text: string): string[] {
    const pattern = /^(?:---|===)\s*$/gm;
    return text.split(pattern).map(b => b.trim()).filter(b => b.length > 0);
}

function splitByParagraph(text: string): string[] {
    return text.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 0);
}

function splitByBullet(text: string): string[] {
    const pattern = /^[・\-\*]\s/gm;
    const blocks: string[] = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (lastIndex > 0) {
            const block = text.substring(lastIndex, match.index).trim();
            if (block) blocks.push(block);
        }
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        const block = text.substring(lastIndex).trim();
        if (block) blocks.push(block);
    }

    return blocks;
}

function splitByCsv(text: string): string[] {
    return text.split('\n').filter(line => line.trim().length > 0).map(line => line.trim());
}

function splitByLine(text: string): string[] {
    return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
}

const FIELD_PATTERNS = {
    personName: [
        /(?:名前|Name|氏名)[：:]\s*(.+)/i,
        /(.+?)さん(?:\s|$)/,
        /^([^\s@#]+)(?=\s*@)/m
    ],
    personAccount: [
        /@([a-zA-Z0-9_]+)/,
        /(?:Twitter|X|アカウント)[：:]\s*@?([a-zA-Z0-9_]+)/i
    ],
    boothName: [
        /(?:ブース|Booth|企業|チーム|Team)[：:]\s*(.+)/i,
        /(?:◼︎|■)\s*(?:ブース|チーム)\s*\n(.+)/
    ],
    role: [
        /(?:役割|Role)[：:]\s*(.+)/i,
        /(モデル|RQ|レースクイーン|コンパニオン|コスプレイヤー|アンバサダー)/
    ]
};

export function validateAccount(account: string): boolean {
    if (!account) return false;
    const cleanAccount = account.replace(/^@/, '');
    const accountPattern = /^[a-zA-Z0-9_]{1,15}$/;
    return accountPattern.test(cleanAccount);
}

function extractField(text: string, patterns: RegExp[]): { value: string; confidence: number } {
    for (let i = 0; i < patterns.length; i++) {
        const match = text.match(patterns[i]);
        if (match && match[1]) {
            return {
                value: match[1].trim(),
                confidence: 100 - (i * 20)
            };
        }
    }
    return { value: '', confidence: 0 };
}

export function extractFields(block: string): ParsedEntry {
    if (!block) {
        return {
            boothName: '', boothAccount: '', personName: '', personAccount: '',
            role: '', confidence: 0, rawText: ''
        };
    }

    const personName = extractField(block, FIELD_PATTERNS.personName);
    const personAccount = extractField(block, FIELD_PATTERNS.personAccount);
    const boothName = extractField(block, FIELD_PATTERNS.boothName);
    const role = extractField(block, FIELD_PATTERNS.role);

    // Validate account if found
    let accountConfidence = personAccount.confidence;
    if (personAccount.value && !validateAccount(personAccount.value)) {
        accountConfidence = Math.max(0, accountConfidence - 30);
    }

    // Calculate overall confidence
    const confidences = [
        personName.confidence,
        accountConfidence,
        boothName.confidence,
        role.confidence
    ].filter(c => c > 0);

    const overallConfidence = confidences.length > 0
        ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
        : 0;

    return {
        boothName: boothName.value,
        boothAccount: '',
        personName: personName.value,
        personAccount: personAccount.value.replace(/^@/, ''),
        role: role.value,
        confidence: overallConfidence,
        rawText: block
    };
}

export function parse(text: string): ParseResult {
    if (!text) {
        return { entries: [], format: 'unknown', warnings: ['Empty input'] };
    }

    const format = detectFormat(text);
    const blocks = splitIntoBlocks(text, format);
    const warnings: string[] = [];

    if (blocks.length === 0) {
        warnings.push('No entries parsed');
    }

    const entries = blocks.map((block, index) => {
        const entry = extractFields(block);
        if (entry.confidence < 50 && entry.confidence > 0) {
            warnings.push(`Entry ${index + 1}: Low confidence (${entry.confidence}%)`);
        }
        return entry;
    });

    return { entries, format, warnings };
}
