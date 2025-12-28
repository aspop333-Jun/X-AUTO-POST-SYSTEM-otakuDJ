/**
 * 一言コメント生成ルール（完全ルールベース版）
 * ai一言コメント.md の安全仕様に完全準拠
 * API呼び出しなし - 入力に基づいてコメントを組み立て
 */

const CommentRules = {
    // ========================================
    // 表情・雰囲気タイプ別の形容詞
    // ========================================

    expressionTypes: {
        '笑顔': [
            '爽やかな笑顔',
            '自然な笑顔',
            '柔らかな笑顔',
            '優しい笑顔',
            '明るい笑顔',
            'はじけるような笑顔',
            '素敵な笑顔',
            '印象的な笑顔'
        ],
        'クール': [
            '凛とした表情',
            'クールな表情',
            'キリッとした表情',
            'シャープな表情',
            '澄んだ表情',
            '芯のある表情',
            'キレのある表情',
            '凛とした佇まい'
        ],
        '柔らか': [
            '柔らかな表情',
            '穏やかな表情',
            '優しい雰囲気',
            '柔らかな雰囲気',
            '温かみのある表情',
            'ふんわりとした雰囲気',
            '優しい眼差し',
            '穏やかな佇まい'
        ],
        '華やか': [
            '華やかな佇まい',
            '存在感のある雰囲気',
            '華やかな雰囲気',
            '際立つ存在感',
            '輝くような雰囲気',
            '目を引く華やかさ',
            '印象的な存在感',
            '艶やかな雰囲気'
        ],
        '自然': [
            '自然体の佇まい',
            '落ち着いた雰囲気',
            '自然な表情',
            'リラックスした雰囲気',
            '飾らない雰囲気',
            '等身大の魅力',
            '自然な佇まい',
            '落ち着いた表情'
        ],
        '力強い': [
            '力強い視線',
            '印象的な眼差し',
            '強い存在感',
            '堂々とした佇まい',
            '迫力のある表情',
            'パワフルな雰囲気',
            '引き込まれる視線',
            '圧倒的な存在感'
        ]
    },

    // ========================================
    // 注目ポイント別のフレーズ
    // ========================================

    focusPoints: {
        '表情': [
            '表情',
            '表情の作り方',
            '表情の切り替え',
            '豊かな表情'
        ],
        '佇まい': [
            '佇まい',
            '立ち姿',
            '全体の佇まい',
            '姿勢'
        ],
        '視線': [
            '視線',
            '眼差し',
            '目力',
            '視線の強さ'
        ],
        '衣装': [
            '衣装の存在感',
            '衣装との相性',
            '衣装の華やかさ',
            'スタイリング'
        ],
        '雰囲気': [
            '雰囲気',
            '全体の雰囲気',
            '醸し出す雰囲気',
            '独特の雰囲気'
        ],
        '全体': [
            '全体のバランス',
            'トータルの印象',
            '全体の仕上がり',
            'バランスの良さ'
        ]
    },

    // ========================================
    // マッチ先（〇〇に）
    // ========================================

    contexts: {
        'ブースの雰囲気': [
            'ブースの雰囲気',
            'ブースの世界観',
            'ブースの空気感'
        ],
        '会場の空気': [
            '会場の空気',
            '会場の雰囲気',
            'イベントの空気'
        ],
        'ライティング': [
            'ライティング',
            'そのライト',
            '照明'
        ],
        '世界観': [
            '世界観',
            'その世界観',
            '作品の雰囲気'
        ],
        'その場': [
            'その場の空気感',
            'その場の雰囲気',
            '現場の空気'
        ]
    },

    // ========================================
    // 動詞パターン
    // ========================================

    matchVerbs: [
        'ぴったりでした',
        'よく合っていました',
        'マッチしていました',
        '溶け込んでいました',
        '映えていました',
        '調和していました',
        '際立っていました'
    ],

    impressionVerbs: [
        'とても印象的でした',
        'とても素敵でした',
        'とても魅力的でした',
        '目を引きました',
        '引き込まれました',
        '印象に残りました'
    ],

    // ========================================
    // 役割別の追加テンプレート
    // ========================================

    roleTemplates: {
        'モデル': [
            'プロの佇まいがとても印象的でした✨',
            '表情の作り方がとても魅力的でした✨',
            'ポージングの完成度が素晴らしかったです✨',
            '撮影慣れした安定感が印象的でした✨',
            'カメラへの意識がとても自然でした✨'
        ],
        'コスプレイヤー': [
            '衣装への愛が伝わってきました✨',
            '表情の作り込みがとても印象的でした✨',
            '衣装のディテールが素晴らしかったです✨',
            '完成度の高さに目を引かれました✨',
            '作品への理解が感じられました✨'
        ],
        'イベントコンパニオン': [
            'ブースを明るくする笑顔が素敵でした✨',
            'プロとしての佇まいがとても印象的でした✨',
            '接客の合間の自然な表情が素敵でした✨',
            'ブースの顔として輝いていました✨',
            '華やかな存在感がブースを彩っていました✨'
        ],
        'RQ': [
            'レースクイーンとしての華やかさが際立っていました✨',
            '凛とした佇まいがとても印象的でした✨',
            'チームカラーとの相性がぴったりでした✨',
            'ピット前の雰囲気にマッチしていました✨',
            'サーキットの空気に溶け込む存在感でした✨'
        ],
        'アンバサダー': [
            'ブランドの世界観を体現していました✨',
            '製品との相性がぴったりでした✨',
            '説明する姿がとても様になっていました✨',
            '親しみやすい雰囲気が素敵でした✨',
            'ブランドの顔として輝いていました✨'
        ]
    }
};

/**
 * 入力パラメータに基づいてコメントを生成
 * @param {object} params - 生成パラメータ
 * @param {string} params.expressionType - 表情・雰囲気タイプ
 * @param {string} params.focusPoint - 注目ポイント
 * @param {string} params.contextMatch - マッチ先
 * @param {string} params.role - 役割
 * @returns {string} 生成されたコメント
 */
function generateRuleBasedComment(params = {}) {
    const {
        expressionType = '笑顔',
        focusPoint = '表情',
        contextMatch = 'ブースの雰囲気',
        role = 'モデル'
    } = params;

    // ランダム選択ヘルパー
    const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // 生成パターンをランダムに選択（5パターン）
    const patternType = Math.floor(Math.random() * 5);

    let comment = '';

    switch (patternType) {
        case 0:
            // パターン1: {表情タイプの形容詞}が{マッチ先}に{動詞}✨
            const expr1 = randomPick(CommentRules.expressionTypes[expressionType] || CommentRules.expressionTypes['笑顔']);
            const ctx1 = randomPick(CommentRules.contexts[contextMatch] || CommentRules.contexts['ブースの雰囲気']);
            const verb1 = randomPick(CommentRules.matchVerbs);
            comment = `${expr1}が${ctx1}に${verb1}✨`;
            break;

        case 1:
            // パターン2: {表情タイプの形容詞}が{印象動詞}✨
            const expr2 = randomPick(CommentRules.expressionTypes[expressionType] || CommentRules.expressionTypes['笑顔']);
            const verb2 = randomPick(CommentRules.impressionVerbs);
            comment = `${expr2}が${verb2}✨`;
            break;

        case 2:
            // パターン3: {注目ポイント}が{マッチ先}に{動詞}✨
            const focus3 = randomPick(CommentRules.focusPoints[focusPoint] || CommentRules.focusPoints['表情']);
            const ctx3 = randomPick(CommentRules.contexts[contextMatch] || CommentRules.contexts['ブースの雰囲気']);
            const verb3 = randomPick(CommentRules.matchVerbs);
            comment = `${focus3}が${ctx3}に${verb3}✨`;
            break;

        case 3:
            // パターン4: {表情タイプの形容詞}と{注目ポイント}が{印象動詞}✨
            const expr4 = randomPick(CommentRules.expressionTypes[expressionType] || CommentRules.expressionTypes['笑顔']);
            const focus4 = randomPick(CommentRules.focusPoints[focusPoint] || CommentRules.focusPoints['表情']);
            const verb4 = randomPick(CommentRules.impressionVerbs);
            // 重複を避ける
            if (expr4.includes(focus4)) {
                comment = `${expr4}が${verb4}✨`;
            } else {
                comment = `${expr4}と${focus4}が${verb4}✨`;
            }
            break;

        case 4:
            // パターン5: 役割別テンプレート
            const roleComments = CommentRules.roleTemplates[role] || CommentRules.roleTemplates['モデル'];
            comment = randomPick(roleComments);
            break;
    }

    return comment;
}

/**
 * 完全ランダムでコメントを生成（フォールバック用）
 * @returns {string} 生成されたコメント
 */
function generateRandomComment() {
    const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // ランダムなパラメータで生成
    const expressionTypes = Object.keys(CommentRules.expressionTypes);
    const focusPoints = Object.keys(CommentRules.focusPoints);
    const contexts = Object.keys(CommentRules.contexts);
    const roles = Object.keys(CommentRules.roleTemplates);

    return generateRuleBasedComment({
        expressionType: randomPick(expressionTypes),
        focusPoint: randomPick(focusPoints),
        contextMatch: randomPick(contexts),
        role: randomPick(roles)
    });
}

// エクスポート（モジュール使用時）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommentRules, generateRuleBasedComment, generateRandomComment };
}
