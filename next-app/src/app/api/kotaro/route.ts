import { NextRequest, NextResponse } from 'next/server';

/**
 * Kotaro-Engine API - 22文字コメント生成
 *
 * POST /api/kotaro
 * Body: FormData { image: File, name: string, count: number }
 * Response: { success: boolean, expression: string, comments: string[] }
 */

const KOTARO_API_URL = 'http://localhost:8000/generate';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const image = formData.get('image') as File;
        const name = formData.get('name') as string || '栞';
        const count = formData.get('count') as string || '3';

        if (!image) {
            return NextResponse.json(
                { success: false, error: '画像が必要です' },
                { status: 400 }
            );
        }

        // Kotaro API サーバーに転送
        const kotaroFormData = new FormData();
        kotaroFormData.append('image', image);
        kotaroFormData.append('name', name);
        kotaroFormData.append('count', count);

        const response = await fetch(KOTARO_API_URL, {
            method: 'POST',
            body: kotaroFormData,
        });

        if (!response.ok) {
            throw new Error(`Kotaro API error: ${response.status}`);
        }

        const result = await response.json();
        return NextResponse.json(result);

    } catch (error) {
        console.error('Kotaro API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Kotaro-Engineとの通信に失敗しました' },
            { status: 500 }
        );
    }
}
