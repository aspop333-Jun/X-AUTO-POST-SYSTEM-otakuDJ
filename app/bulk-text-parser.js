/**
 * Bulk Text Parser
 * Parses various text formats to extract post information
 */

/**
 * Detects the format of the input text
 * @param {string} text - Input text to analyze
 * @returns {string} - Format type: 'circled', 'numbered', 'separated', 'paragraph', 'bullet', 'csv', 'unknown'
 */
export function detectFormat(text) {
    if (!text || typeof text !== 'string') {
        return 'unknown';
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
        return 'unknown';
    }

    // Priority 1: Circled numbers ①②③④⑤⑥⑦⑧⑨⑩
    const circledPattern = /[①②③④⑤⑥⑦⑧⑨⑩]/;
    if (circledPattern.test(text)) {
        return 'circled';
    }

    // Priority 2: Numbered lists (1. 2. 3. or (1) (2) (3))
    const numberedPattern = /^(?:\d+\.|（\d+）|\(\d+\))\s/m;
    if (numberedPattern.test(text)) {
        return 'numbered';
    }

    // Priority 3: Separator lines (--- or ===)
    const separatorPattern = /^(?:---|===)\s*$/m;
    if (separatorPattern.test(text)) {
        return 'separated';
    }

    // Priority 4: Bullet points (・ - *) - check before paragraph
    const bulletPattern = /^[・\-\*]\s/m;
    if (bulletPattern.test(text)) {
        return 'bullet';
    }

    // Priority 5: Paragraph (2+ newlines)
    const paragraphPattern = /\n\s*\n/;
    if (paragraphPattern.test(text)) {
        return 'paragraph';
    }

    // Priority 6: CSV/Tab-separated (tab or comma with multiple occurrences)
    const csvPattern = /[\t,].*[\t,]/;
    if (csvPattern.test(text)) {
        return 'csv';
    }

    return 'unknown';
}

/**
 * Splits text into blocks based on detected format
 * @param {string} text - Input text
 * @param {string} format - Detected format
 * @returns {string[]} - Array of text blocks
 */
export function splitIntoBlocks(text, format) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
        return [];
    }

    switch (format) {
        case 'circled':
            return splitByCircledNumbers(trimmedText);
        
        case 'numbered':
            return splitByNumberedList(trimmedText);
        
        case 'separated':
            return splitBySeparator(trimmedText);
        
        case 'paragraph':
            return splitByParagraph(trimmedText);
        
        case 'bullet':
            return splitByBullet(trimmedText);
        
        case 'csv':
            return splitByCsv(trimmedText);
        
        case 'unknown':
        default:
            return splitByLine(trimmedText);
    }
}

/**
 * Split by circled numbers
 */
function splitByCircledNumbers(text) {
    const pattern = /[①②③④⑤⑥⑦⑧⑨⑩]/g;
    const blocks = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (lastIndex > 0) {
            const block = text.substring(lastIndex, match.index).trim();
            if (block) {
                blocks.push(block);
            }
        }
        lastIndex = match.index + 1;
    }

    // Add the last block
    if (lastIndex < text.length) {
        const block = text.substring(lastIndex).trim();
        if (block) {
            blocks.push(block);
        }
    }

    return blocks;
}

/**
 * Split by numbered list (1. 2. 3. or (1) (2) (3))
 */
function splitByNumberedList(text) {
    const pattern = /^(?:\d+\.|（\d+）|\(\d+\))\s/gm;
    const blocks = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (lastIndex > 0) {
            const block = text.substring(lastIndex, match.index).trim();
            if (block) {
                blocks.push(block);
            }
        }
        lastIndex = match.index + match[0].length;
    }

    // Add the last block
    if (lastIndex < text.length) {
        const block = text.substring(lastIndex).trim();
        if (block) {
            blocks.push(block);
        }
    }

    return blocks;
}

/**
 * Split by separator lines (--- or ===)
 */
function splitBySeparator(text) {
    const pattern = /^(?:---|===)\s*$/gm;
    return text.split(pattern)
        .map(block => block.trim())
        .filter(block => block.length > 0);
}

/**
 * Split by paragraph (2+ newlines)
 */
function splitByParagraph(text) {
    return text.split(/\n\s*\n/)
        .map(block => block.trim())
        .filter(block => block.length > 0);
}

/**
 * Split by bullet points
 */
function splitByBullet(text) {
    const pattern = /^[・\-\*]\s/gm;
    const blocks = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (lastIndex > 0) {
            const block = text.substring(lastIndex, match.index).trim();
            if (block) {
                blocks.push(block);
            }
        }
        lastIndex = match.index + match[0].length;
    }

    // Add the last block
    if (lastIndex < text.length) {
        const block = text.substring(lastIndex).trim();
        if (block) {
            blocks.push(block);
        }
    }

    return blocks;
}

/**
 * Split by CSV/Tab
 */
function splitByCsv(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return lines.map(line => line.trim());
}

/**
 * Split by line (fallback for unknown format)
 */
function splitByLine(text) {
    return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

/**
 * Field extraction patterns
 */
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

/**
 * Validates Twitter/X account format
 * @param {string} account - Account name to validate
 * @returns {boolean} - True if valid
 */
export function validateAccount(account) {
    if (!account || typeof account !== 'string') {
        return false;
    }
    
    // Remove @ if present
    const cleanAccount = account.replace(/^@/, '');
    
    // Twitter username rules: 1-15 characters, alphanumeric and underscore only
    const accountPattern = /^[a-zA-Z0-9_]{1,15}$/;
    return accountPattern.test(cleanAccount);
}

/**
 * Extracts a field value from text using multiple patterns
 * @param {string} text - Text to search
 * @param {RegExp[]} patterns - Array of regex patterns to try
 * @returns {{value: string, confidence: number}} - Extracted value and confidence score
 */
function extractField(text, patterns) {
    for (let i = 0; i < patterns.length; i++) {
        const match = text.match(patterns[i]);
        if (match && match[1]) {
            const value = match[1].trim();
            // Higher confidence for earlier patterns (more specific)
            const confidence = 100 - (i * 20);
            return { value, confidence };
        }
    }
    return { value: '', confidence: 0 };
}

/**
 * Extracts all fields from a text block
 * @param {string} block - Text block to parse
 * @returns {Object} - Parsed entry with fields and confidence scores
 */
export function extractFields(block) {
    if (!block || typeof block !== 'string') {
        return {
            boothName: '',
            boothAccount: '',
            personName: '',
            personAccount: '',
            role: '',
            confidence: 0,
            rawText: block || ''
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

    // Calculate overall confidence (average of non-zero confidences)
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
        boothAccount: '', // Will be extracted separately if present
        personName: personName.value,
        personAccount: personAccount.value.replace(/^@/, ''), // Remove @ prefix
        role: role.value,
        confidence: overallConfidence,
        rawText: block
    };
}

/**
 * Parses text and returns structured entries
 * @param {string} text - Input text to parse
 * @returns {Object} - Parse result with entries, format, and warnings
 */
export function parse(text) {
    if (!text || typeof text !== 'string') {
        return {
            entries: [],
            format: 'unknown',
            warnings: ['Empty or invalid input']
        };
    }

    const format = detectFormat(text);
    const blocks = splitIntoBlocks(text, format);
    const warnings = [];

    if (blocks.length === 0) {
        warnings.push('No entries could be parsed from the input');
    }

    const entries = blocks.map((block, index) => {
        const entry = extractFields(block);
        
        // Add warnings for low confidence entries
        if (entry.confidence < 50 && entry.confidence > 0) {
            warnings.push(`Entry ${index + 1}: Low confidence (${entry.confidence}%)`);
        }
        
        return entry;
    });

    return {
        entries,
        format,
        warnings
    };
}
