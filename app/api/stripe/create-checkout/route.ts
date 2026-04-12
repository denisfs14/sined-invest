// ─── app/api/stripe/create-checkout/route.ts ─────────────────────────────────
// POST /api/stripe/create-checkout
// Body: { priceId: 'simple' | 'advanced', userId: string, userEmail: string }
//
// Returns: { url: string } — the Stripe Checkout session URL
//
// SECURITY:
// - Secret key NEVER leaves the server
// - Uses stripe_mode from app_config to choose Test vs Live keys
// - Validates session before creating checkout

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/stripe-config';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.planKey || !['simple', 'advanced'].includes(body.planKey)) {
    return NextResponse.json({ error: 'planKey must be simple or advanced' }, { status: 400 });
  }

  const cfg = await getStripeConfig();

  if (!cfg.secretKey) {
    return NextResponse.json(
      { error: `Stripe ${cfg.mode} secret key is not configured in environment variables` },
      { status: 500 }
    );
  }

  const priceId = body.planKey === 'advanced' ? cfg.priceIdAdvanced : cfg.priceIdSimple;
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price ID for ${body.planKey} (${cfg.mode} mode) is not configured` },
      { status: 500 }
    );
  }

  const stripe = new Stripe(cfg.secretKey, { apiVersion: '2024-12-18.acacia' });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      metadata: { userId: user.id, planKey: body.planKey, stripeMode: cfg.mode },
      success_url: `${appUrl}/upgrade?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/upgrade?canceled=1`,
      subscription_data: {
        metadata: { userId: user.id, planKey: body.planKey },
      },
    });

    console.log(`[checkout] Created ${cfg.mode} session for user ${user.id} plan=${body.planKey}`);
    return NextResponse.json({ url: session.url });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[checkout] Stripe error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
