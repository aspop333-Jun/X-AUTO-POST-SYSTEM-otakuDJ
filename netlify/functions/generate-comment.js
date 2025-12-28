const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * ルールベースのフォールバック用テンプレート
 */
const FALLBACK_TEMPLATES = {
    '笑顔': [
        '爽やかな笑顔がブースの雰囲気にぴったりでした✨',
        '自然な笑顔がとても魅力的でした✨',
        '明るい笑顔が会場を華やかにしていました✨',
    ],
    'クール': [
        '凛とした表情がとても印象的でした✨',
        'クールな雰囲気がブースの世界観に合っていました✨',
        'シャープな表情が目を引きました✨',
    ],
    '柔らか': [
        '柔らかな表情がとても魅力的でした✨',
        '優しい雰囲気がブースに溶け込んでいました✨',
        '穏やかな佇まいが印象的でした✨',
    ],
    '華やか': [
        '華やかな存在感が際立っていました✨',
        '輝くような雰囲気がブースを彩っていました✨',
        '存在感のある佇まいが印象的でした✨',
    ],
    '自然': [
        '自然体の佇まいがとても魅力的でした✨',
        '落ち着いた雰囲気が会場に溶け込んでいました✨',
        '飾らない雰囲気が素敵でした✨',
    ],
    '力強い': [
        '力強い視線に引き込まれました✨',
        '堂々とした佇まいがとても印象的でした✨',
        '圧倒的な存在感が目を引きました✨',
    ],
};

/**
 * ルールベースでフォールバックコメントを生成
 */
function generateFallbackComment(expressionType) {
    const templates = FALLBACK_TEMPLATES[expressionType] || FALLBACK_TEMPLATES['笑顔'];
    return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Gemini用のプロンプトを構築（画像解析強化版）
 */
function buildPrompt(data, hasImage) {
    const imageAnalysisSection = hasImage ? `
【重要: 写真を詳細に分析してください】
あなたはプロのイベントカメラマンです。この写真を見て以下を分析してください：
- 人物の表情（笑顔の種類、目の輝き、口角の上がり具合）
- 姿勢や佇まい（堂々としている、柔らかい、凛としている等）
- 衣装やメイクの印象
- ライティングや背景の雰囲気
- 全体的な写真の印象

分析結果を踏まえて、最適な一言コメントを生成してください。
` : '';

    return `あなたはイベント写真の一言コメントを書くプロカメラマンです。
${imageAnalysisSection}
以下のルールで1行コメントを1つだけ生成してください：

【絶対ルール】
- 1行のみ（20〜35文字）
- 「〇〇が△△にぴったり/合っていた/映えていた」形式
- 最後に✨を付ける
- 固有名詞・キャラ名・作品名は絶対に入れない
- 主語を「俺」にしない
- スラング禁止（神、優勝、バチバチ等）
- 写真から読み取れる具体的な要素を含める

【使える評価軸】
笑顔、表情、視線、佇まい、雰囲気、存在感、衣装、ライティング、背景との調和

【ユーザーが選択した雰囲気】
- 表情・雰囲気: ${data.expression_type}
- 注目ポイント: ${data.focus_point}
- マッチ先: ${data.context_match}

【情報】
- カテゴリ: ${data.category}
- ブース/チーム: ${data.booth_name}
- 役割: ${data.role}

【出力形式】
コメントのみを1行で出力（説明や理由は不要）`;
}

/**
 * Netlify Function: コメント生成
 */
exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const data = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        // API未設定の場合はルールベースで生成
        if (!apiKey) {
            console.log('No API key configured, using fallback');
            const comment = generateFallbackComment(data.expression_type || '笑顔');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ comment, source: 'rule_based' }),
            };
        }

        // Gemini API呼び出し (Gemini 2.5 Flash - 最新の画像解析対応モデル)
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

        const hasImage = !!data.image_base64;
        const prompt = buildPrompt(data, hasImage);

        let response;
        if (hasImage) {
            // 画像付きリクエスト
            let imageData = data.image_base64;
            let mimeType = 'image/jpeg';

            if (imageData.startsWith('data:')) {
                const [header, base64Data] = imageData.split(',');
                mimeType = header.split(':')[1].split(';')[0];
                imageData = base64Data;
            }

            response = await model.generateContent([
                {
                    inlineData: {
                        mimeType,
                        data: imageData,
                    },
                },
                prompt,
            ]);
        } else {
            // テキストのみ
            response = await model.generateContent(prompt);
        }

        const comment = response.response.text().trim();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ comment, source: 'ai' }),
        };

    } catch (error) {
        console.error('Gemini API error:', error);

        // エラー時はフォールバック
        const data = JSON.parse(event.body || '{}');
        const comment = generateFallbackComment(data.expression_type || '笑顔');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                comment,
                source: 'rule_based',
                error: error.message
            }),
        };
    }
};
