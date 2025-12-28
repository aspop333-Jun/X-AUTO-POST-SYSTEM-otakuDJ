/**
 * Universal Event Parser
 *
 * Goal: Accept "any" input shape (string / object / array / browser Event / DOM element / FormData / etc.)
 * and robustly extract event metadata (title, date, venue, hashtags, category, round, series).
 *
 * This file is an upgraded, backward-compatible version of the original "parseEventText" engine.
 */

/* eslint-disable no-use-before-define */

const EventPatterns = {
    // ------------------------------------------------------------------------
    // 1. Regex patterns (domain-specific + generic fallbacks)
    // ------------------------------------------------------------------------
    fieldPatterns: {
        eventEn: [
            /(?:Event|EVENT|Title|Name)[（(]?En[)）]?[：:>\-]\s*(.+)/i,
            /(?:English|英語名|英語タイトル|Title\s*\(EN\))[：:>\-]\s*(.+)/i,
            /\b([A-Z\d][A-Z\d\s\-_/]{3,}(?:19\d{2}|20\d{2})?)\b/m,
            /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,})\b/m,
        ],
        eventJp: [
            /(?:イベント名|タイトル|名称)[（(]?日本語[)）]?[：:>\-]\s*(.+)/i,
            /(?:Japanese|日本語|日本語名|和名|Title\s*\(JP\))[：:>\-]\s*(.+)/i,
            /【\s*(.+?)\s*】/m,
            /「\s*(.+?)\s*」/m,
            /『\s*(.+?)\s*』/m,
        ],
        date: [
            // key: value forms
            /(?:日付|開催日|Date|日程|期間|Time|When|日時|開催期間)[：:>\-]\s*(.+)/i,

            // ISO-ish: 2025-01-02, 2025/01/02, 2025.1.2, 2025-01-02 10:00
            /(\b(19\d{2}|20\d{2})[.\/\-](0?\d|1[0-2])[.\/\-](0?\d|[12]\d|3[01])(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?(?:\s*(?:-|~|〜|–|—|to)\s*(?:\d{1,2}:\d{2}(?::\d{2})?)?)?\b)/,

            // Range: 2025/01/02-2025/01/04
            /(\b(19\d{2}|20\d{2})[.\/\-](0?\d|1[0-2])[.\/\-](0?\d|[12]\d|3[01])\s*(?:-|~|〜|–|—|to)\s*(19\d{2}|20\d{2})[.\/\-](0?\d|1[0-2])[.\/\-](0?\d|[12]\d|3[01])\b)/,

            // JP: 1月2日〜4日, 2025年1月2日
            /(\b(0?\d|1[0-2])月(0?\d|[12]\d|3[01])日(?:\s*(?:-|~|〜|–|—|to)\s*(0?\d|[12]\d|3[01])日)?\b)/,
            /(\b(19\d{2}|20\d{2})年(0?\d|1[0-2])月(0?\d|[12]\d|3[01])日(?:\s*(?:-|~|〜|–|—|to)\s*(0?\d|[12]\d|3[01])日)?\b)/,

            // Words: today/tomorrow (kept as raw)
            /(\b(?:today|tomorrow|yesterday|本日|今日|明日|昨日)\b)/i,

            // Round hint
            /(?:Rd|Round)\.?\s*(\d+)/i,
        ],
        venue: [
            /(?:会場|場所|Venue|Place|開催地|Circuit|Where|会場名|開催場所)[：:>\-]\s*(.+)/i,
            /(?:at|＠|@)\s*([^\n#]+?)(?=\s*(?:\n|#|$))/i,
            /(?:in)\s+([^\n#]+?)(?=\s*(?:\n|#|$))/i,
        ],
        hashtags: [
            /(?:ハッシュタグ|Hashtags?|Tags?)[：:>\-]\s*(.+)/i,
            /((?:#[^\s#]+\s*){1,})/,
        ],
        url: [
            /(https?:\/\/[^\s)\]}]+)|\b(www\.[^\s)\]}]+)\b/i,
        ],
    },

    // ------------------------------------------------------------------------
    // 2. Series database (extendable)
    // ------------------------------------------------------------------------
    series: {
        // Motorsports
        'SUPER GT': { jp: 'スーパーGT', cat: 'サーキット', tags: '#SUPERGT #SGT #GTカメラ部' },
        'Super Formula': { jp: 'スーパーフォーミュラ', cat: 'サーキット', tags: '#SuperFormula #SF #SFカメラ部' },
        'Super Taikyu': { jp: 'スーパー耐久', cat: 'サーキット', tags: '#S耐 #SuperTaikyu' },
        'スーパー耐久': { en: 'Super Taikyu', cat: 'サーキット', tags: '#S耐 #SuperTaikyu' },
        'S耐': { en: 'Super Taikyu', jp: 'スーパー耐久', cat: 'サーキット', tags: '#S耐 #SuperTaikyu' },
        'D1 Grand Prix': { jp: 'D1グランプリ', cat: 'サーキット', tags: '#D1GP #D1' },
        'D1GP': { en: 'D1 Grand Prix', jp: 'D1グランプリ', cat: 'サーキット', tags: '#D1GP #D1' },
        'MotoGP': { jp: 'モトGP', cat: 'サーキット', tags: '#MotoGP' },
        'F1': { jp: 'F1世界選手権', cat: 'サーキット', tags: '#F1JP #JapaneseGP' },
        '8耐': { en: 'Suzuka 8 Hours', jp: '鈴鹿8時間耐久ロードレース', cat: 'サーキット', tags: '#鈴鹿8耐' },
        '鈴鹿8耐': { en: 'Suzuka 8 Hours', cat: 'サーキット', tags: '#鈴鹿8耐' },
        'TCR Japan': { jp: 'TCRジャパン', cat: 'サーキット', tags: '#TCRJapan' },
        'Porsche Carrera Cup': { jp: 'ポルシェカレラカップ', cat: 'サーキット', tags: '#PCCJ' },
        'PCCJ': { en: 'Porsche Carrera Cup Japan', jp: 'ポルシェカレラカップジャパン', cat: 'サーキット', tags: '#PCCJ' },

        // Game/Anime
        'Tokyo Game Show': { jp: '東京ゲームショウ', abbr: 'TGS', cat: 'ブース', tags: '#TGS #東京ゲームショウ #イベントコンパニオン' },
        TGS: { en: 'Tokyo Game Show', jp: '東京ゲームショウ', cat: 'ブース', tags: '#TGS #東京ゲームショウ' },
        東京ゲームショウ: { en: 'Tokyo Game Show', abbr: 'TGS', cat: 'ブース', tags: '#TGS' },
        AnimeJapan: { jp: 'アニメジャパン', cat: '展示会', tags: '#AnimeJapan #AJ' },
        アニメジャパン: { en: 'AnimeJapan', cat: '展示会', tags: '#AnimeJapan #AJ' },
        'Comic Market': { jp: 'コミックマーケット', abbr: 'C', cat: 'ブース', tags: '#コミケ' },
        コミケ: { en: 'Comic Market', cat: 'ブース', tags: '#コミケ' },

        // Auto
        'Tokyo Auto Salon': { jp: '東京オートサロン', abbr: 'TAS', cat: 'ブース', tags: '#オートサロン #TAS' },
        オートサロン: { en: 'Tokyo Auto Salon', cat: 'ブース', tags: '#オートサロン #TAS' },
        'Osaka Auto Messe': { jp: '大阪オートメッセ', abbr: 'OAM', cat: 'ブース', tags: '#オートメッセ #OAM' },
        オートメッセ: { en: 'Osaka Auto Messe', cat: 'ブース', tags: '#オートメッセ #OAM' },
        'Japan Mobility Show': { jp: 'ジャパンモビリティショー', cat: 'ブース', tags: '#JMS #モビリティショー' },
        モビリティショー: { en: 'Japan Mobility Show', cat: 'ブース', tags: '#JMS #モビリティショー' },

        // Camera
        'CP+': { jp: 'シーピープラス', cat: '展示会', tags: '#cpplus #カメラ好きな人と繋がりたい' },
        PHOTONEXT: { jp: 'フォトネクスト', cat: '展示会', tags: '#PHOTONEXT' },
    },

    // ------------------------------------------------------------------------
    // 3. Venue database (extendable)
    // ------------------------------------------------------------------------
    venues: {
        // Circuits
        鈴鹿: { name: '鈴鹿サーキット', pref: '三重県', en: 'Suzuka Circuit', cat: 'サーキット' },
        SUZUKA: { name: '鈴鹿サーキット', pref: '三重県', cat: 'サーキット' },
        富士: { name: '富士スピードウェイ', pref: '静岡県', en: 'Fuji Speedway', abbr: 'FSW', cat: 'サーキット' },
        FSW: { name: '富士スピードウェイ', pref: '静岡県', cat: 'サーキット' },
        もてぎ: { name: 'モビリティリゾートもてぎ', pref: '栃木県', en: 'Mobility Resort Motegi', cat: 'サーキット' },
        ツインリンク: { name: 'モビリティリゾートもてぎ', pref: '栃木県', cat: 'サーキット' },
        MOTEGI: { name: 'モビリティリゾートもてぎ', pref: '栃木県', cat: 'サーキット' },
        SUGO: { name: 'スポーツランドSUGO', pref: '宮城県', en: 'Sportsland SUGO', cat: 'サーキット' },
        菅生: { name: 'スポーツランドSUGO', pref: '宮城県', cat: 'サーキット' },
        オートポリス: { name: 'オートポリス', pref: '大分県', en: 'Autopolis', abbr: 'AP', cat: 'サーキット' },
        AP: { name: 'オートポリス', pref: '大分県', cat: 'サーキット' },
        岡山国際: { name: '岡山国際サーキット', pref: '岡山県', en: 'Okayama International Circuit', abbr: 'OIC', cat: 'サーキット' },
        OIC: { name: '岡山国際サーキット', pref: '岡山県', cat: 'サーキット' },
        OKAYAMA: { name: '岡山国際サーキット', pref: '岡山県', cat: 'サーキット' },
        筑波: { name: '筑波サーキット', pref: '茨城県', cat: 'サーキット' },
        TC2000: { name: '筑波サーキット', pref: '茨城県', cat: 'サーキット' },
        エビス: { name: 'エビスサーキット', pref: '福島県', cat: 'サーキット' },
        十勝: { name: '十勝スピードウェイ', pref: '北海道', cat: 'サーキット' },
        セントラル: { name: 'セントラルサーキット', pref: '兵庫県', cat: 'サーキット' },
        袖ヶ浦: { name: '袖ヶ浦フォレストレースウェイ', pref: '千葉県', cat: 'サーキット' },

        // Expo
        ビッグサイト: { name: '東京ビッグサイト', pref: '東京都', en: 'Tokyo Big Sight', cat: 'ブース' },
        東京ビッグサイト: { name: '東京ビッグサイト', pref: '東京都', cat: 'ブース' },
        幕張: { name: '幕張メッセ', pref: '千葉県', en: 'Makuhari Messe', cat: 'ブース' },
        幕張メッセ: { name: '幕張メッセ', pref: '千葉県', cat: 'ブース' },
        パシフィコ: { name: 'パシフィコ横浜', pref: '神奈川県', en: 'Pacifico Yokohama', cat: '展示会' },
        インテックス: { name: 'インテックス大阪', pref: '大阪府', en: 'INTEX Osaka', cat: 'ブース' },
        ポートメッセ: { name: 'ポートメッセなごや', pref: '愛知県', cat: 'ブース' },
        夢メッセ: { name: '夢メッセみやぎ', pref: '宮城県', cat: 'ブース' },
        'Aichi Sky Expo': { name: 'Aichi Sky Expo', pref: '愛知県', cat: 'ブース' },
    },

    // ------------------------------------------------------------------------
    // 4. Category keywords
    // ------------------------------------------------------------------------
    categoryKeywords: {
        サーキット: [
            'レースクイーン',
            'RQ',
            'ピットウォーク',
            'グリッドウォーク',
            '流し撮り',
            'コーナー',
            'ヘアピン',
            'パドック',
            'Rd.',
            'Round',
            '予選',
            '決勝',
            'ポールポジション',
            'チェッカー',
            'サーキット',
            'Circuit',
            'Paddock',
            'Qualifying',
            'Race',
        ],
        ブース: ['コンパニオン', 'モデル', '展示車両', '説明員', '受付', 'ラインナップ', 'ブース', '出展', 'Booth', 'Exhibitor'],
        展示会: ['セミナー', '機材', 'レンズ', '体験', 'ワークショップ', 'カメラ', '新製品', 'Expo', 'Exhibition', 'Conference', 'Summit'],
        撮影会: ['スタジオ', '団体撮影', '個人撮影', '野外撮影', 'セッション', 'シェアスタジオ', '撮影会', 'Photo session'],
    },

    // ------------------------------------------------------------------------
    // 5. Round patterns
    // ------------------------------------------------------------------------
    roundPatterns: [/Rd\.?\s*(\d+)/i, /Round\s*(\d+)/i, /第(\d+)戦/, /第(\d+)ラウンド/, /(\d+)戦/],
};

/**
 * @typedef {Object} ParsedEvent
 * @property {string} eventEn
 * @property {string} eventJp
 * @property {string} date
 * @property {string} venue
 * @property {string} category
 * @property {string} hashtags
 * @property {{series: string, round: string, location: string}} details
 * @property {number} confidence
 * @property {string[]} matched
 * @property {{
 *   sourceText: string,
 *   normalizedDateStart?: string,
 *   normalizedDateEnd?: string,
 *   urls?: string[],
 *   rawInputType?: string
 * }} [meta]
 */

/**
 * Universal entry point.
 *
 * Accepts:
 *  - string
 *  - object (structured fields)
 *  - array (joined)
 *  - browser Event (input/change/paste/drop/etc.)
 *  - HTMLElement (value/text)
 *  - FormData / URLSearchParams
 *
 * @param {any} input
 * @param {{
 *   patterns?: typeof EventPatterns,
 *   defaultYear?: number,
 *   maxTextLength?: number,
 *   guessYearFromNow?: boolean,
 *   keepHtml?: boolean,
 * }} [options]
 * @returns {ParsedEvent}
 */
function parseEvent(input, options = {}) {
    const patterns = options.patterns || EventPatterns;

    const normalized = normalizeInputToText(input, {
        maxTextLength: options.maxTextLength,
        keepHtml: options.keepHtml,
    });

    const res = parseEventText(normalized.text, {
        patterns,
        defaultYear: options.defaultYear,
        guessYearFromNow: options.guessYearFromNow,
    });

    // Attach meta
    res.meta = {
        sourceText: normalized.text,
        rawInputType: normalized.type,
        urls: normalized.urls,
        normalizedDateStart: res.meta?.normalizedDateStart,
        normalizedDateEnd: res.meta?.normalizedDateEnd,
    };

    return res;
}

/**
 * Backward compatible API.
 * @param {string} text
 * @param {{patterns?: typeof EventPatterns, defaultYear?: number, guessYearFromNow?: boolean}} [options]
 * @returns {ParsedEvent}
 */
function parseEventText(text, options = {}) {
    const patterns = options.patterns || EventPatterns;

    /** @type {ParsedEvent} */
    const result = {
        eventEn: '',
        eventJp: '',
        date: '',
        venue: '',
        category: 'ブース',
        hashtags: '',
        details: {
            series: '',
            round: '',
            location: '',
        },
        confidence: 0,
        matched: [],
        meta: {
            sourceText: '',
            urls: [],
        },
    };

    if (!text) return result;

    const clean = sanitizeText(String(text));
    result.meta.sourceText = clean;
    result.meta.urls = extractUrls(clean);

    // 0) Structured content hints: try parse JSON snippets
    const structured = tryParseStructured(clean);
    if (structured) {
        const structuredText = structuredToText(structured);
        if (structuredText) {
            result.matched.push('Structured: parsed');
            // Merge into clean for extraction, but preserve order by putting title-ish first
            text = `${structuredText}\n${clean}`;
        } else {
            text = clean;
        }
    } else {
        text = clean;
    }

    // --- A. Series detection (DB + loose heuristics) ---
    detectSeries(text, patterns, result);

    // --- B. Venue detection (DB + loose heuristics) ---
    detectVenue(text, patterns, result);

    // --- C. Regex extraction (generic) ---
    for (const [field, regexList] of Object.entries(patterns.fieldPatterns)) {
        if (field !== 'date' && result[field] && String(result[field]).length > 5) continue;

        for (const re of regexList) {
            const m = text.match(re);
            if (m && m[1]) {
                const val = String(m[1]).trim();

                if (field === 'hashtags') {
                    const combined = mergeHashtags(result.hashtags, val);
                    if (combined && combined !== result.hashtags) {
                        result.hashtags = combined;
                        result.confidence += 8;
                        result.matched.push('hashtags: pattern match');
                    }
                } else if (field === 'url') {
                    // handled via extractUrls
                } else if (field === 'date') {
                    // avoid overwriting a richer date with a weaker one
                    if (!result.date || val.length > result.date.length) {
                        result.date = val;
                        result.confidence += 10;
                        result.matched.push('date: pattern match');
                    }
                } else if (!result[field]) {
                    result[field] = val;
                    result.confidence += 10;
                    result.matched.push(`${field}: pattern match`);
                }
                break;
            }
        }
    }

    // --- D. Round number extraction ---
    for (const re of patterns.roundPatterns) {
        const m = text.match(re);
        if (m && m[1]) {
            result.details.round = `Rd.${m[1]}`;
            result.confidence += 15;
            result.matched.push(`Round: ${m[1]}`);
            break;
        }
    }

    // --- E. Category inference (keywords) ---
    inferCategory(text, patterns, result);

    // --- F. Final shaping (motorsports hints, but safe for others) ---
    if (result.details.series && result.details.round) {
        if (result.eventEn && !result.eventEn.includes(result.details.round)) {
            result.eventEn = `${result.eventEn} ${result.details.round}`;
        }

        const roundNum = result.details.round.match(/\d+/);
        if (roundNum && result.eventJp && !result.eventJp.includes('戦')) {
            result.eventJp = `${result.eventJp} 第${roundNum[0]}戦`;
        }
    }

    // --- G. Year completion / title fallback (critical for "any event") ---
    const defaultYear = resolveDefaultYear(text, options);
    if (result.eventEn && !/\b\d{4}\b/.test(result.eventEn)) {
        result.eventEn = `${result.eventEn} ${defaultYear}`;
        result.confidence += 3;
        result.matched.push('Year: appended to eventEn');
    }
    if (result.eventJp && !/\b\d{4}\b/.test(result.eventJp)) {
        result.eventJp = `${result.eventJp}${defaultYear}`;
        result.confidence += 3;
        result.matched.push('Year: appended to eventJp');
    }

    // Title fallback when neither series nor explicit title exists
    if (!result.eventEn && !result.eventJp) {
        const guess = guessTitle(text);
        if (guess) {
            // If guess has Japanese characters, treat as JP
            if (/[\u3040-\u30ff\u3400-\u9fff]/.test(guess)) {
                result.eventJp = guess;
            } else {
                result.eventEn = guess;
            }
            result.confidence += 12;
            result.matched.push('Title: guessed from text');
        }
    }

    // Venue fallback via loose "at/in" if still missing
    if (!result.venue) {
        const v = guessVenue(text);
        if (v) {
            result.venue = v;
            result.confidence += 8;
            result.matched.push('Venue: guessed from text');
        }
    }

    // Hashtags fallback from raw text
    if (!result.hashtags) {
        const h = mergeHashtags('', extractHashtagBlock(text));
        if (h) {
            result.hashtags = h;
            result.confidence += 5;
            result.matched.push('hashtags: extracted from text');
        }
    }

    // Date normalization (adds meta.normalizedDateStart/End when parseable)
    const normalizedDate = normalizeDateRange(result.date, defaultYear);
    if (normalizedDate) {
        result.meta.normalizedDateStart = normalizedDate.start;
        if (normalizedDate.end) result.meta.normalizedDateEnd = normalizedDate.end;
        result.matched.push('Date: normalized');
        result.confidence += 5;
    }

    // Clamp confidence
    result.confidence = Math.max(0, Math.min(100, result.confidence));

    return result;
}

/**
 * Apply parsed data to a form (browser only). Safe no-op in Node.
 *
 * @param {ParsedEvent} data
 * @param {{
 *   root?: Document|HTMLElement,
 *   map?: {
 *     eventEn?: string,
 *     eventJp?: string,
 *     date?: string,
 *     venue?: string,
 *     hashtags?: string,
 *     category?: string,
 *   },
 *   setValue?: (el: any, value: string) => void,
 * }} [options]
 */
function applyParsedData(data, options = {}) {
    if (typeof document === 'undefined') return;

    const root = options.root || document;
    const map = {
        eventEn: 'event-en',
        eventJp: 'event-jp',
        date: 'event-date',
        venue: 'event-venue',
        hashtags: 'event-hashtags',
        category: 'event-category',
        ...(options.map || {}),
    };

    const setValue =
        options.setValue ||
        ((el, value) => {
            if (!el) return;
            if ('value' in el) el.value = value;
            else el.textContent = value;
        });

    const getByIdOrSelector = (idOrSel) => {
        if (!idOrSel) return null;
        // Try id
        const byId = typeof idOrSel === 'string' ? root.getElementById?.(idOrSel) : null;
        if (byId) return byId;
        // Try selector
        if (typeof idOrSel === 'string' && root.querySelector) {
            return root.querySelector(idOrSel);
        }
        return null;
    };

    const elEn = getByIdOrSelector(map.eventEn);
    const elJp = getByIdOrSelector(map.eventJp);
    const elDate = getByIdOrSelector(map.date);
    const elVenue = getByIdOrSelector(map.venue);
    const elTags = getByIdOrSelector(map.hashtags);

    if (elEn && data.eventEn) setValue(elEn, data.eventEn);
    if (elJp && data.eventJp) setValue(elJp, data.eventJp);
    if (elDate && data.date) setValue(elDate, data.date);
    if (elVenue && data.venue) setValue(elVenue, data.venue);
    if (elTags && data.hashtags) setValue(elTags, data.hashtags);

    // Category select
    const categoryEl = getByIdOrSelector(map.category);
    if (categoryEl && data.category) {
        if (categoryEl.tagName === 'SELECT' && categoryEl.options) {
            for (const opt of categoryEl.options) {
                if (opt.value === data.category) {
                    categoryEl.value = data.category;
                    break;
                }
            }
        } else {
            setValue(categoryEl, data.category);
        }
    }
}

// -----------------------------------------------------------------------------
// Registry helpers (so you can extend without editing the engine)
// -----------------------------------------------------------------------------

/** @param {string} key @param {any} data */
function registerSeries(key, data) {
    if (!key) return;
    EventPatterns.series[String(key)] = data || {};
}

/** @param {string} key @param {any} data */
function registerVenue(key, data) {
    if (!key) return;
    EventPatterns.venues[String(key)] = data || {};
}

/** @param {string} field @param {RegExp} re */
function registerFieldPattern(field, re) {
    if (!field || !(re instanceof RegExp)) return;
    if (!EventPatterns.fieldPatterns[field]) EventPatterns.fieldPatterns[field] = [];
    EventPatterns.fieldPatterns[field].unshift(re);
}

// -----------------------------------------------------------------------------
// Input normalization
// -----------------------------------------------------------------------------

/**
 * Normalize arbitrary input into a text blob.
 * @param {any} input
 * @param {{maxTextLength?: number, keepHtml?: boolean}} [options]
 * @returns {{text: string, type: string, urls: string[]}}
 */
function normalizeInputToText(input, options = {}) {
    const maxLen = typeof options.maxTextLength === 'number' ? options.maxTextLength : 20000;

    const type = detectType(input);
    let text = '';

    try {
        if (input == null) {
            text = '';
        } else if (typeof input === 'string') {
            text = input;
        } else if (typeof input === 'number' || typeof input === 'boolean' || typeof input === 'bigint') {
            text = String(input);
        } else if (Array.isArray(input)) {
            text = input.map((x) => normalizeInputToText(x, options).text).filter(Boolean).join('\n');
        } else if (isBrowserEvent(input)) {
            // Common event types: input/change/paste/drop/submit
            const parts = [];
            parts.push(`[event:${input.type || 'unknown'}]`);

            const target = input.target || input.currentTarget;
            if (target) {
                const extracted = extractTextFromElement(target);
                if (extracted) parts.push(extracted);

                // Try DataTransfer (drop)
                if (input.dataTransfer && input.dataTransfer.getData) {
                    const dtText = input.dataTransfer.getData('text') || input.dataTransfer.getData('text/plain');
                    if (dtText) parts.push(dtText);
                }

                // Clipboard (paste)
                if (input.clipboardData && input.clipboardData.getData) {
                    const cb = input.clipboardData.getData('text') || input.clipboardData.getData('text/plain');
                    if (cb) parts.push(cb);
                }
            }

            // Some frameworks put payload in detail
            if (input.detail != null) {
                const detailText = normalizeInputToText(input.detail, options).text;
                if (detailText) parts.push(detailText);
            }

            text = parts.filter(Boolean).join('\n');
        } else if (isFormData(input)) {
            const parts = [];
            // eslint-disable-next-line no-restricted-syntax
            for (const [k, v] of input.entries()) {
                if (typeof v === 'string') parts.push(`${k}: ${v}`);
            }
            text = parts.join('\n');
        } else if (isURLSearchParams(input)) {
            text = input.toString();
        } else if (isHTMLElement(input)) {
            text = extractTextFromElement(input);
        } else if (typeof input === 'object') {
            // Common structured shapes
            const candidates = extractStructuredCandidates(input);
            if (candidates.length) {
                text = candidates.join('\n');
            } else {
                // Fallback: JSON
                try {
                    text = JSON.stringify(input, null, 2);
                } catch {
                    text = String(input);
                }
            }
        } else {
            text = String(input);
        }
    } catch {
        try {
            text = String(input);
        } catch {
            text = '';
        }
    }

    if (!options.keepHtml) text = stripHtml(text);
    text = sanitizeText(text);

    if (text.length > maxLen) text = `${text.slice(0, maxLen)}\n…(truncated)`;

    return { text, type, urls: extractUrls(text) };
}

function detectType(input) {
    if (input == null) return 'null';
    if (typeof input === 'string') return 'string';
    if (Array.isArray(input)) return 'array';
    if (typeof input === 'object') {
        if (isBrowserEvent(input)) return 'event';
        if (isFormData(input)) return 'formdata';
        if (isURLSearchParams(input)) return 'urlsearchparams';
        if (isHTMLElement(input)) return 'element';
        return 'object';
    }
    return typeof input;
}

function isBrowserEvent(x) {
    return !!x && typeof x === 'object' && ('type' in x || 'target' in x || 'currentTarget' in x) && !Array.isArray(x);
}

function isHTMLElement(x) {
    return !!x && typeof x === 'object' && (x.nodeType === 1 || x.nodeType === 9) && typeof x.tagName === 'string';
}

function isFormData(x) {
    return !!x && typeof x === 'object' && typeof x.entries === 'function' && typeof x.append === 'function';
}

function isURLSearchParams(x) {
    return !!x && typeof x === 'object' && typeof x.toString === 'function' && typeof x.get === 'function' && typeof x.set === 'function';
}

function extractTextFromElement(el) {
    try {
        if (!el) return '';
        if (typeof el.value === 'string' && el.value.trim()) return el.value;
        if (typeof el.textContent === 'string' && el.textContent.trim()) return el.textContent;
        if (typeof el.innerText === 'string' && el.innerText.trim()) return el.innerText;
        return '';
    } catch {
        return '';
    }
}

function extractStructuredCandidates(obj) {
    const out = [];

    // Common keys that often contain event info
    const commonKeys = [
        'text',
        'title',
        'name',
        'subject',
        'message',
        'body',
        'content',
        'description',
        'desc',
        'event',
        'eventEn',
        'eventJp',
        'date',
        'when',
        'time',
        'period',
        'venue',
        'place',
        'where',
        'location',
        'hashtags',
        'tags',
        'series',
        'round',
        'url',
        'link',
    ];

    // Include nested payloads commonly used by frameworks
    const nestedKeys = ['detail', 'data', 'payload', 'params', 'meta'];

    const pushKV = (k, v) => {
        if (v == null) return;
        if (typeof v === 'string') {
            const s = v.trim();
            if (s) out.push(`${k}: ${s}`);
            return;
        }
        if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') {
            out.push(`${k}: ${String(v)}`);
            return;
        }
        if (Array.isArray(v)) {
            const joined = v.map((x) => (typeof x === 'string' ? x : safeToString(x))).filter(Boolean).join(' / ');
            if (joined) out.push(`${k}: ${joined}`);
            return;
        }
        if (typeof v === 'object') {
            // Prevent too deep recursion: only stringify shallowly
            const shallow = shallowPick(v, commonKeys);
            if (Object.keys(shallow).length) {
                out.push(`${k}: ${safeToString(shallow)}`);
            } else {
                out.push(`${k}: ${safeToString(v)}`);
            }
        }
    };

    // pick common keys
    for (const k of commonKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) pushKV(k, obj[k]);
    }

    // nested
    for (const k of nestedKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] && typeof obj[k] === 'object') {
            const nested = obj[k];
            for (const ck of commonKeys) {
                if (Object.prototype.hasOwnProperty.call(nested, ck)) pushKV(`${k}.${ck}`, nested[ck]);
            }
        }
    }

    // if still empty, try to include all shallow string fields
    if (!out.length) {
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string' && v.trim()) out.push(`${k}: ${v.trim()}`);
        }
    }

    // Deduplicate
    return Array.from(new Set(out));
}

function shallowPick(obj, keys) {
    const out = {};
    for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    }
    return out;
}

function safeToString(x) {
    try {
        return typeof x === 'string' ? x : JSON.stringify(x);
    } catch {
        try {
            return String(x);
        } catch {
            return '';
        }
    }
}

// -----------------------------------------------------------------------------
// Core detection helpers
// -----------------------------------------------------------------------------

function detectSeries(text, patterns, result) {
    const tLower = text.toLowerCase();

    // Exact / includes matches
    for (const [key, data] of Object.entries(patterns.series)) {
        const keyLower = String(key).toLowerCase();

        const hit =
            tLower.includes(keyLower) ||
            (data?.jp && text.includes(data.jp)) ||
            (data?.abbr && text.toUpperCase().includes(String(data.abbr).toUpperCase()));

        if (hit) {
            result.eventEn = data.en || key;
            result.eventJp = data.jp || '';
            result.category = data.cat || result.category || 'ブース';
            result.hashtags = mergeHashtags(result.hashtags, data.tags || '');
            result.details.series = key;
            result.confidence += 40;
            result.matched.push(`Series: ${key}`);
            return;
        }
    }

    // Loose heuristic: find e.g. "SUPER GT" like uppercase phrases
    const m = text.match(/\b([A-Z][A-Z0-9]{1,}(?:\s+[A-Z0-9]{2,}){1,5})\b/);
    if (m && m[1]) {
        const candidate = m[1].trim();
        // Avoid picking common noise
        if (!/^(HTTP|HTTPS|WWW|EVENT|TITLE|NAME|DATE|TIME|VENUE|PLACE)$/i.test(candidate)) {
            result.details.series = candidate;
            if (!result.eventEn) result.eventEn = candidate;
            result.confidence += 10;
            result.matched.push(`Series: guessed (${candidate})`);
        }
    }
}

function detectVenue(text, patterns, result) {
    // DB match
    for (const [key, data] of Object.entries(patterns.venues)) {
        if (text.includes(key) || (data?.abbr && text.toUpperCase().includes(String(data.abbr).toUpperCase()))) {
            result.venue = data.name;
            result.details.location = data.pref || '';
            if (!result.category || result.category === 'ブース') result.category = data.cat || result.category;
            result.confidence += 30;
            result.matched.push(`Venue: ${data.name}`);
            return;
        }
    }

    // No DB hit; keep empty and fallback later
}

function inferCategory(text, patterns, result) {
    for (const [cat, keywords] of Object.entries(patterns.categoryKeywords)) {
        if (keywords.some((kw) => text.includes(kw))) {
            result.category = cat;
            result.matched.push(`Category inferred: ${cat}`);
            result.confidence += 5;
            return;
        }
    }
}

// -----------------------------------------------------------------------------
// Text utilities
// -----------------------------------------------------------------------------

function sanitizeText(s) {
    let text = String(s);

    // Normalize common full-width punctuation and dashes
    text = text
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[：]/g, ':')
        .replace(/[（]/g, '(')
        .replace(/[）]/g, ')')
        .replace(/[［]/g, '[')
        .replace(/[］]/g, ']')
        .replace(/[【]/g, '【')
        .replace(/[】]/g, '】')
        .replace(/[〜～]/g, '〜')
        .replace(/[–—−]/g, '-')
        .replace(/\t/g, ' ')
        .replace(/[ ]{2,}/g, ' ');

    // Decode a few common HTML entities (without external libs)
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    // Trim but keep line breaks
    text = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n');

    return text;
}

function stripHtml(html) {
    // Simple, safe-ish stripper; keep newlines for <br> and block separators
    return String(html)
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/p\s*>/gi, '\n')
        .replace(/<\s*\/div\s*>/gi, '\n')
        .replace(/<\s*\/li\s*>/gi, '\n')
        .replace(/<[^>]*>/g, ' ');
}

function extractUrls(text) {
    const urls = [];
    const re = /(https?:\/\/[^\s)\]}]+)|\b(www\.[^\s)\]}]+)\b/gi;
    let m;
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(text))) {
        const u = m[0];
        if (u) urls.push(u);
    }
    return Array.from(new Set(urls));
}

function extractHashtagBlock(text) {
    const re = /((?:#[^\s#]+\s*){1,})/g;
    const blocks = [];
    let m;
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(text))) {
        if (m[1]) blocks.push(m[1]);
    }
    return blocks.join(' ');
}

function normalizeHashtags(s) {
    const tags = String(s)
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : `#${t}`))
        .map((t) => t.replace(/^##+/, '#'))
        .filter((t) => t.length > 1);
    return Array.from(new Set(tags)).join(' ');
}

function mergeHashtags(a, b) {
    const merged = `${a || ''} ${b || ''}`.trim();
    return merged ? normalizeHashtags(merged) : '';
}

function guessTitle(text) {
    const lines = String(text)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

    for (const line of lines) {
        // Skip lines that are mostly hashtags or URLs or key:value metadata
        if (/^(#\S+\s*)+$/.test(line)) continue;
        if (/https?:\/\//i.test(line) || /^www\./i.test(line)) continue;
        if (/^(date|time|when|venue|place|where|event|title|name)\s*:/i.test(line)) continue;
        if (/^(日付|開催日|日程|期間|会場|場所|イベント名|タイトル)\s*:/i.test(line)) continue;

        // Remove leading bullet/emoji-like
        const cleaned = line.replace(/^[•\-・▶️\*]+\s*/g, '').trim();

        // Avoid pure date line
        if (looksLikeDateLine(cleaned)) continue;

        // Reasonable length
        if (cleaned.length >= 4) return cleaned.slice(0, 120);
    }

    return '';
}

function looksLikeDateLine(s) {
    return /(19\d{2}|20\d{2})[.\/\-](0?\d|1[0-2])[.\/\-](0?\d|[12]\d|3[01])/.test(s) || /(0?\d|1[0-2])月(0?\d|[12]\d|3[01])日/.test(s);
}

function guessVenue(text) {
    const m = text.match(/(?:会場|場所|Venue|Place|開催地|Circuit|Where)\s*[:\-]\s*([^\n#]+)/i);
    if (m && m[1]) return m[1].trim();

    const m2 = text.match(/(?:at|＠|@)\s*([^\n#]+?)(?=\s*(?:\n|#|$))/i);
    if (m2 && m2[1]) return m2[1].trim();

    const m3 = text.match(/\b(in)\s+([^\n#]+?)(?=\s*(?:\n|#|$))/i);
    if (m3 && m3[2]) return m3[2].trim();

    return '';
}

// -----------------------------------------------------------------------------
// Date normalization helpers
// -----------------------------------------------------------------------------

function resolveDefaultYear(text, options) {
    const yearMatch = String(text).match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) return Number(yearMatch[1]);

    if (typeof options.defaultYear === 'number') return options.defaultYear;

    const now = new Date();
    return now.getFullYear();
}

/**
 * Convert known date formats into ISO yyyy-mm-dd (and optional end date).
 * Returns null when it cannot parse.
 *
 * @param {string} raw
 * @param {number} defaultYear
 * @returns {{start: string, end?: string}|null}
 */
function normalizeDateRange(raw, defaultYear) {
    if (!raw) return null;

    const s = String(raw).trim();

    // Range: yyyy/mm/dd - yyyy/mm/dd
    let m = s.match(/\b(19\d{2}|20\d{2})[.\/\-](0?\d|1[0-2])[.\/\-](0?\d|[12]\d|3[01])\s*(?:-|~|〜|–|—|to)\s*(19\d{2}|20\d{2})[.\/\-](0?\d|1[0-2])[.\/\-](0?\d|[12]\d|3[01])\b/);
    if (m) {
        const start = toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
        const end = toIsoDate(Number(m[4]), Number(m[5]), Number(m[6]));
        if (start && end) return { start, end };
    }

    // Single: yyyy/mm/dd
    m = s.match(/\b(19\d{2}|20\d{2})[.\/\-](0?\d|1[0-2])[.\/\-](0?\d|[12]\d|3[01])\b/);
    if (m) {
        const start = toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
        if (start) return { start };
    }

    // JP full: yyyy年m月d日 (optional range to d日)
    m = s.match(/\b(19\d{2}|20\d{2})年(0?\d|1[0-2])月(0?\d|[12]\d|3[01])日(?:\s*(?:-|~|〜|–|—|to)\s*(0?\d|[12]\d|3[01])日)?\b/);
    if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d1 = Number(m[3]);
        const start = toIsoDate(y, mo, d1);
        if (!start) return null;
        if (m[4]) {
            const d2 = Number(m[4]);
            const end = toIsoDate(y, mo, d2);
            return end ? { start, end } : { start };
        }
        return { start };
    }

    // JP short: m月d日 (optional range to d日)
    m = s.match(/\b(0?\d|1[0-2])月(0?\d|[12]\d|3[01])日(?:\s*(?:-|~|〜|–|—|to)\s*(0?\d|[12]\d|3[01])日)?\b/);
    if (m) {
        const mo = Number(m[1]);
        const d1 = Number(m[2]);
        const start = toIsoDate(defaultYear, mo, d1);
        if (!start) return null;
        if (m[3]) {
            const d2 = Number(m[3]);
            const end = toIsoDate(defaultYear, mo, d2);
            return end ? { start, end } : { start };
        }
        return { start };
    }

    return null;
}

function toIsoDate(y, m, d) {
    if (!y || !m || !d) return '';
    if (m < 1 || m > 12) return '';
    if (d < 1 || d > 31) return '';
    const dt = new Date(Date.UTC(y, m - 1, d));
    // Guard against invalid rollovers
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return '';
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
}

// -----------------------------------------------------------------------------
// Structured parsing helpers (JSON/YAML-ish)
// -----------------------------------------------------------------------------

function tryParseStructured(text) {
    // Try entire text JSON
    const whole = tryParseJson(text);
    if (whole) return whole;

    // Try fenced code blocks ```json ...```
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
        const inner = tryParseJson(fenced[1]);
        if (inner) return inner;
    }

    // Try to locate the first {...} substring (best-effort)
    const brace = extractFirstJsonObject(text);
    if (brace) {
        const inner = tryParseJson(brace);
        if (inner) return inner;
    }

    return null;
}

function tryParseJson(s) {
    try {
        const t = String(s).trim();
        if (!t) return null;
        if (!(t.startsWith('{') || t.startsWith('['))) return null;
        return JSON.parse(t);
    } catch {
        return null;
    }
}

function extractFirstJsonObject(text) {
    const s = String(text);
    const start = s.indexOf('{');
    if (start < 0) return '';
    let depth = 0;
    for (let i = start; i < s.length; i += 1) {
        const ch = s[i];
        if (ch === '{') depth += 1;
        if (ch === '}') {
            depth -= 1;
            if (depth === 0) return s.slice(start, i + 1);
        }
    }
    return '';
}

function structuredToText(obj) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) return obj.map((x) => structuredToText(x)).filter(Boolean).join('\n');

    if (typeof obj !== 'object') return String(obj);

    // Prefer well-known fields
    const lines = [];
    const push = (k, v) => {
        if (v == null) return;
        if (typeof v === 'string' && v.trim()) lines.push(`${k}: ${v.trim()}`);
        else if (typeof v === 'number' || typeof v === 'boolean') lines.push(`${k}: ${String(v)}`);
        else if (Array.isArray(v) && v.length) lines.push(`${k}: ${v.map((x) => (typeof x === 'string' ? x : safeToString(x))).join(' / ')}`);
    };

    push('title', obj.title || obj.name || obj.event || obj.eventName || obj.summary);
    push('eventEn', obj.eventEn);
    push('eventJp', obj.eventJp);
    push('date', obj.date || obj.when || obj.time || obj.startDate);
    push('venue', obj.venue || obj.place || obj.where || obj.location);
    push('hashtags', obj.hashtags || obj.tags);
    push('url', obj.url || obj.link);

    if (obj.details && typeof obj.details === 'object') {
        push('series', obj.details.series);
        push('round', obj.details.round);
        push('location', obj.details.location);
    }

    // If nothing matched, stringify shallow object
    if (!lines.length) {
        try {
            return JSON.stringify(obj, null, 2);
        } catch {
            return '';
        }
    }

    return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Exports (Node + Browser)
// -----------------------------------------------------------------------------

const UniversalEventParser = {
    EventPatterns,
    parseEvent,
    parseEventText,
    applyParsedData,
    registerSeries,
    registerVenue,
    registerFieldPattern,
};

// Node/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalEventParser;
}

// Browser global
if (typeof window !== 'undefined') {
    window.UniversalEventParser = UniversalEventParser;
}
