import { NextRequest, NextResponse } from 'next/server';
import PDFParser from 'pdf2json';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
        const buffer = Buffer.from(arrayBuffer);

        console.log('Buffer size:', buffer.length);

        const parsedText = await new Promise<string>((resolve, reject) => {
            // @ts-ignore
            const pdfParser = new PDFParser(null, 1); // 1 = text only

            pdfParser.on("pdfParser_dataError", (errData: any) => {
                console.error('PDFParser Error:', errData.parserError);
                reject(new Error(errData.parserError));
            });

            pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
                // pdf2json returns raw text content often URL encoded
                // rawTextContent is usually the plain text
                try {
                    const rawText = pdfParser.getRawTextContent();
                    resolve(rawText);
                } catch (e) {
                    reject(e);
                }
            });

            pdfParser.parseBuffer(buffer);
        });

        return NextResponse.json({ text: parsedText });
    } catch (error: any) {
        console.error('PDF Parse Error:', error);
        return NextResponse.json({ error: `Failed to parse PDF: ${error.message}` }, { status: 500 });
    }
}
