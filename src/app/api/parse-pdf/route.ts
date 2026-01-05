import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Configure PDF.js worker
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is Pro or Admin
        const isPro = user.app_metadata?.plan === 'pro' || user.app_metadata?.role === 'admin';

        if (!isPro) {
            return NextResponse.json({ error: 'Pro plan required for PDF upload.' }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        // pdfjs-dist requires explicit Uint8Array or ArrayBuffer
        const uint8Array = new Uint8Array(arrayBuffer);

        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const doc = await loadingTask.promise;

        let fullText = '';

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();

            // Concatenate text items
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += pageText + '\n\n';
        }

        return NextResponse.json({ text: fullText });
    } catch (error: any) {
        console.error('PDF Parse Error:', error);
        return NextResponse.json({ error: `Failed to parse PDF: ${error.message}` }, { status: 500 });
    }
}
