import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-01-27.acacia', // Use latest or matching version
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export const runtime = 'nodejs'; // Webhooks often need nodejs runtime for crypto/buffer

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        if (!webhookSecret) {
            console.warn('STRIPE_WEBHOOK_SECRET is not set');
            // Allowing request to proceed for testing if secret is missing (NOT SECURE for prod, but helps debug)
            // In production, this should throw.
            if (process.env.NODE_ENV === 'production') {
                throw new Error('STRIPE_WEBHOOK_SECRET is missing in production');
            }
            // Fallback for local testing without CLI forwarding
            event = JSON.parse(body);
        } else {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        }
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    console.log(`Received event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutSessionCompleted(session);
                break;
            case 'invoice.payment_succeeded':
                // Handle recurring payment success
                break;
            case 'customer.subscription.deleted':
                // Handle subscription cancellation
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error('Error handling event:', error);
        return new NextResponse('Error handling event', { status: 500 });
    }

    return new NextResponse('Received', { status: 200 });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    // Logic to grant access
    // We need user_id from client_reference_id or metadata
    const userId = session.client_reference_id || session.metadata?.user_id;

    if (!userId) {
        console.warn('No user_id found in session, cannot grant access');
        return;
    }

    // Example: Promote user to 'pro' role or add subscription record
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update user metadata to reflect Pro status
    const { error } = await supabase.auth.admin.updateUserById(userId, {
        app_metadata: { plan: 'pro' }
    });

    if (error) {
        console.error('Supabase update failed:', error);
        throw error;
    }

    console.log(`User ${userId} promoted to PRO`);
}
