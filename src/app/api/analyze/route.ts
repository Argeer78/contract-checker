import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 60;

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
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
            return new Response('Unauthorized: Please sign in.', { status: 401 });
        }

        const { text } = await req.json();
        if (!text || text.length < 10) {
            return new Response('Text too short', { status: 400 });
        }

        try {
            const { object } = await generateObject({
                model: openai('gpt-4o-mini'),
                schema: z.object({
                    riskLevel: z.enum(['Low', 'Medium', 'High']),
                    summary: z.string().describe('A plain English explanation of the clause, 2-3 sentences max.'),
                    clauses: z.array(z.object({
                        text: z.string().describe('The specific risky sentence from the original text.'),
                        risk: z.enum(['Low', 'Medium', 'High']),
                        explanation: z.string().describe('Why this specific sentence is risky.')
                    }))
                }),
                prompt: `
            You are an expert contract analyst. Your job is to explain legal clauses to non-lawyers.
            Analyze the following contract text. Identify any risks, especially regarding termination, liability, payment terms, or IP rights.

            IMPORTANT: If the input text is in a language other than English, you MUST provide your entire response (summary, clause explanations, etc.) in that SAME language. Do not translate back to English unless the input was English.
            
            Text to analyze:
            "${text}"
            
            Be conservative. If a clause seems standard/fair, it is Low Risk. If it has potential pitfalls, Medium. If it is clearly one-sided or dangerous (e.g. termination without cause, unlimited liability), High Risk.
          `,
            });
            return Response.json(object);
        } catch (aiError: any) {
            console.error('AI Processing Error:', aiError);
            if (aiError.cause) console.error('Cause:', aiError.cause);
            throw aiError; // Re-throw to be caught by outer catch
        }

    } catch (error: any) {
        console.error('Analysis failed:', error);
        // Log environment variable status (do not log the key itself)
        console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
        return new Response(JSON.stringify({ error: error.message || 'Analysis failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
