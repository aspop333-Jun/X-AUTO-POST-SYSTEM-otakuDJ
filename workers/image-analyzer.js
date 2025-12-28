/**
 * Cloudflare Workers AI - Image Analyzer
 * 画像から特徴を抽出してJSONで返す
 */

export default {
    async fetch(request, env) {
        // CORS対応
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: corsHeaders
            });
        }

        try {
            const body = await request.json();
            const { image_base64, category = 'ブース' } = body;

            if (!image_base64) {
                return new Response(JSON.stringify({ error: 'No image provided' }), {
                    status: 400,
                    headers: corsHeaders
                });
            }

            // Base64から画像データを取得
            let imageData = image_base64;
            if (imageData.startsWith('data:')) {
                imageData = imageData.split(',')[1];
            }

            // Workers AIでLLaVAを使って画像解析
            const prompt = `この写真を見て、以下の特徴を日本語で分析してください。

1. 表情（笑顔/クール/柔らか/華やか/自然/力強い から1つ選択）
2. ポーズ（正面/斜め/見上げ/見下ろし から1つ選択）
3. ライティング（明るい/ドラマチック/ソフト から1つ選択）
4. 衣装の雰囲気（カラフル/エレガント/スポーティ/シンプル から1つ選択）
5. 全体の印象を一言（20文字以内）

JSON形式で回答してください:
{
  "expression": "選択した表情",
  "pose": "選択したポーズ",
  "lighting": "選択したライティング",
  "outfit": "選択した衣装",
  "impression": "一言印象"
}`;

            // Cloudflare Workers AI呼び出し（LLaVA）
            const aiResponse = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
                prompt: prompt,
                image: Uint8Array.from(atob(imageData), c => c.charCodeAt(0)),
                max_tokens: 512
            });

            // レスポンスからJSONを抽出
            let features = {
                expression: '笑顔',
                pose: '正面',
                lighting: '明るい',
                outfit: 'シンプル',
                impression: '',
                category: category,
                confidence: 0.5,
                raw_response: aiResponse.response || ''
            };

            // JSONパース試行
            try {
                const jsonMatch = aiResponse.response?.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    features = {
                        expression: parsed.expression || features.expression,
                        pose: parsed.pose || features.pose,
                        lighting: parsed.lighting || features.lighting,
                        outfit: parsed.outfit || features.outfit,
                        impression: parsed.impression || '',
                        category: category,
                        confidence: 0.8,
                        raw_response: aiResponse.response || ''
                    };
                }
            } catch (parseError) {
                console.log('JSON parse failed, using keyword extraction');
                // JSONパース失敗時はキーワード抽出
                const text = aiResponse.response || '';

                if (text.includes('クール') || text.includes('凛')) {
                    features.expression = 'クール';
                } else if (text.includes('柔らか') || text.includes('優し')) {
                    features.expression = '柔らか';
                } else if (text.includes('華やか') || text.includes('輝')) {
                    features.expression = '華やか';
                } else if (text.includes('自然') || text.includes('リラックス')) {
                    features.expression = '自然';
                } else if (text.includes('力強') || text.includes('迫力')) {
                    features.expression = '力強い';
                }

                features.confidence = 0.6;
            }

            // 表情の正規化
            const validExpressions = ['笑顔', 'クール', '柔らか', '華やか', '自然', '力強い'];
            if (!validExpressions.includes(features.expression)) {
                features.expression = '笑顔';
            }

            return new Response(JSON.stringify({
                success: true,
                features: features
            }), {
                headers: corsHeaders
            });

        } catch (error) {
            console.error('Image analysis error:', error);

            // エラー時はデフォルト特徴を返す
            return new Response(JSON.stringify({
                success: false,
                error: error.message,
                features: {
                    expression: '笑顔',
                    pose: '正面',
                    lighting: '明るい',
                    outfit: 'シンプル',
                    category: 'ブース',
                    confidence: 0.3
                }
            }), {
                headers: corsHeaders
            });
        }
    }
};
