import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Polyfill for pdf-parse in Node environment
if (typeof global.DOMMatrix === 'undefined') {
    // @ts-ignore
    global.DOMMatrix = class DOMMatrix { };
}

export async function POST(req: NextRequest) {
    try {
        // @ts-ignore
        const pdf = require('pdf-parse');
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log('Buffer size:', buffer.length);

        const data = await pdf(buffer);

        return NextResponse.json({ text: data.text });
    } catch (error: any) {
        console.error('PDF Parse Error:', error);
        return NextResponse.json({ error: `Failed to parse PDF: ${error.message}` }, { status: 500 });
    }
}
