import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { currency = 'usd', interval = 'monthly' } = await req.json();

        let priceId;
        const key = `STRIPE_PRICE_ID_${currency.toUpperCase()}_${interval.toUpperCase()}`;
        priceId = process.env[key];

        if (!priceId) {
            console.warn(`Price not found for ${key}, falling back to USD Monthly`);
            priceId = process.env.STRIPE_PRICE_ID_USD_MONTHLY;
        }

        // Get authenticated user
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // Ignored
                        }
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            client_reference_id: user?.id,
            metadata: {
                user_id: user?.id || null, // Ensure string or null
            },
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error('Stripe Checkout Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
