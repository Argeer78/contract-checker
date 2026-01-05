import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

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

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
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
