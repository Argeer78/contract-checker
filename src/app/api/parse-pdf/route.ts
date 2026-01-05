import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    // @ts-ignore
    const pdf = require('pdf-parse');
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const data = await pdf(buffer);

        return NextResponse.json({ text: data.text });
    } catch (error) {
        console.error('PDF Parse Error:', error);
        return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 });
    }
}
