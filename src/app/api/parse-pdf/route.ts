import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import path from 'path';
import { pathToFileURL } from 'url';

// Use pdfjs-dist v3 legacy build which supports CommonJS
// We use require() to ensure Node.js behavior
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

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

        const isPro = user.app_metadata?.plan === 'pro' || user.app_metadata?.role === 'admin';
        console.log(`[API] Parsing PDF for user ${user.id} | Pro: ${isPro}`);

        if (!isPro) {
            return NextResponse.json({ error: 'Pro plan required for PDF upload.' }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        // pdfjs requires Uint8Array
        const uint8Array = new Uint8Array(arrayBuffer);

        // Create absolute path for CMaps so Next.js can find them in production/dev
        const cMapPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/cmaps/');
        const standardFontDataPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/');

        // Convert to file:// URL for Windows/PDF.js compatibility
        // AND ensure trailing slash which is critical for directory URLs
        const cMapUrl = pathToFileURL(cMapPath).href + '/';
        const standardFontDataUrl = pathToFileURL(standardFontDataPath).href + '/';

        console.log('Using CMap URL:', cMapUrl);

        // Load document
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            cMapUrl: cMapUrl,
            cMapPacked: true,
            standardFontDataUrl: standardFontDataUrl,
            // Disable font face to avoid canvas dependency
            disableFontFace: true,
            verbosity: 5 // MAX VERBOSITY
        });

        const doc = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();

            // Join with empty string because some PDFs split characters into separate items
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join('');

            fullText += pageText + '\n\n';
        }

        return NextResponse.json({ text: fullText });
    } catch (error: any) {
        console.error('PDF Parse Error:', error);
        return NextResponse.json({ error: `Failed to parse PDF: ${error.message}` }, { status: 500 });
    }
}
