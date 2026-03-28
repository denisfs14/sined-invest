// ─── POST /api/stripe/checkout ───────────────────────────────────────────────
// Creates a Stripe Checkout Session for subscription signup.
// Called from the frontend when user clicks "Get Simple" or "Get Advanced".
// All Stripe interaction is server-side only — no secret key in browser.

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripe, getPriceId, type BillingPlan } from '@/lib/stripe/server';
import { supabaseAdmin, updateProfileBilling } from '@/lib/stripe/supabase-admin';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    // ── 1. Authenticate the requesting user ──────────────────────────────────
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Validate request body ─────────────────────────────────────────────
    const body = await req.json();
    const { plan, yearly = false } = body as { plan: BillingPlan; yearly?: boolean };

    if (!plan || !['simple', 'advanced'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = getPriceId(plan, yearly);

    // ── 3. Get or create Stripe customer ─────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id, plan, manual_plan_override, special_access, role')
      .eq('id', user.id)
      .maybeSingle();

    // Block purchase if user already has admin/special access or is already on that plan
    if (profile?.role === 'admin' || profile?.special_access || profile?.manual_plan_override) {
      return NextResponse.json({ error: 'Your access is managed manually. Contact support.' }, { status: 400 });
    }
    if (profile?.plan === plan && profile?.plan !== 'free') {
      return NextResponse.json({ error: 'You are already on this plan.' }, { status: 400 });
    }

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      // Create a new Stripe customer linked to this user
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      // Persist immediately so we don't create duplicates
      await updateProfileBilling(user.id, { stripe_customer_id: customerId });
    }

    // ── 4. Create Checkout Session ────────────────────────────────────────────
    const session = await getStripe().checkout.sessions.create({
      mode:        'subscription',
      customer:    customerId,
      line_items:  [{ price: priceId, quantity: 1 }],
      metadata: {
        supabase_user_id: user.id,
        user_email:       user.email ?? '',
        selected_plan:    plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          selected_plan:    plan,
        },
      },
      success_url: `${APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}/upgrade?canceled=1`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
