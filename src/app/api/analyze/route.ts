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
                        text: z.string().describe('The specific risky sentence from the original text (repaired if possible).'),
                        risk: z.enum(['Low', 'Medium', 'High']),
                        explanation: z.string().describe('Why this specific sentence is risky.')
                    }))
                }),
                prompt: `
            You are an expert legal contract AI. 
            
            CRITICAL INSTRUCTION FOR GARBLED TEXT (MOJIBAKE):
            The input text is likely GREEK text that has been incorrectly encoded as Latin Extended characters (e.g., "OgerAtrq", "e({6:H", "EIKOEI").
            1. REPAIR: Attempt to mentally reconstruct the original Greek text. Treat this as a "noisy channel" or substitution cipher problem.
               - Example: "Tpdne(o" -> "Τράπεζα" (Bank)
               - Example: "OgerAtrq" -> "Οφειλέτης" (Borrower/Debtor)
               - Example: "Adveto" -> "Δάνειο" (Loan)
            2. ANALYZE: Once you have inferred the true meaning, analyze the contract for risks.
            3. OUTPUT: Provide the analysis in ENGLISH (unless the user asks otherwise), but when citing specific clauses in the 'text' field, provide the REPAIRED Greek text if you are confident, or the original garbled text if not.

            Task:
            Analyze the following contract text. Identify any risks, especially regarding termination, liability, payment terms, or IP rights.
            
            Text to analyze:
            "${text}"
            
            Risk Assessment Guide:
            - Low Risk: Standard/fair terms.
            - Medium Risk: Potential pitfalls or ambiguity.
            - High Risk: One-sided, unlimited liability, termination without cause, or aggressive penalties.
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
