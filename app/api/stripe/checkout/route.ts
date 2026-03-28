// ─── POST /api/stripe/checkout ───────────────────────────────────────────────
// Creates a Stripe Checkout Session for subscription signup.
// STRIPE_SECRET_KEY lives server-side only — never reaches the browser.

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripe, getPriceId, type BillingPlan } from '@/lib/stripe/server';
import { getAdmin, updateProfileBilling } from '@/lib/stripe/supabase-admin';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    // ── 1. Authenticate ───────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()    { return cookieStore.getAll(); },
          setAll(list){ list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[checkout] Auth failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── VALIDATE: both user.id and user.email must be present ─────────────────
    // Without user.id the webhook cannot identify the row to update.
    // Without user.email we cannot use the email fallback path.
    if (!user.id) {
      console.error('[checkout] CRITICAL: user.id is missing — cannot create checkout session');
      return NextResponse.json({ error: 'Account error: missing user ID' }, { status: 400 });
    }
    if (!user.email) {
      console.error(`[checkout] CRITICAL: user.email is missing for user.id=${user.id}`);
      return NextResponse.json({ error: 'Account error: missing email address' }, { status: 400 });
    }

    console.log(`[checkout] Request: user_id=${user.id} email=${user.email}`);

    // ── 2. Validate plan ──────────────────────────────────────────────────────
    const body = await req.json();
    const { plan, yearly = false } = body as { plan: BillingPlan; yearly?: boolean };

    if (!plan || !['simple', 'advanced'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan. Must be "simple" or "advanced".' }, { status: 400 });
    }

    const priceId = getPriceId(plan, yearly);
    console.log(`[checkout] Plan=${plan} yearly=${yearly} priceId=${priceId}`);

    // ── 3. Load user profile ──────────────────────────────────────────────────
    const { data: profile, error: profileErr } = await getAdmin()
      .from('user_profiles')
      .select('stripe_customer_id, plan, manual_plan_override, special_access, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('[checkout] Failed to load profile:', profileErr.message);
      return NextResponse.json({ error: 'Could not load your account. Try again.' }, { status: 500 });
    }

    if (profile?.role === 'admin' || profile?.special_access || profile?.manual_plan_override) {
      return NextResponse.json({ error: 'Your access is managed manually. Contact support.' }, { status: 400 });
    }
    if (profile?.plan === plan && profile?.plan !== 'free') {
      return NextResponse.json({ error: `You are already on the ${plan} plan.` }, { status: 400 });
    }

    // ── 4. Get or create Stripe customer ──────────────────────────────────────
    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      console.log(`[checkout] Creating Stripe customer for user_id=${user.id}`);
      const customer = await getStripe().customers.create({
        email:    user.email,
        metadata: { user_id: user.id },  // on the Customer object for fallback
      });
      customerId = customer.id;
      await updateProfileBilling(user.id, { stripe_customer_id: customerId });
      console.log(`[checkout] Customer created: ${customerId}`);
    } else {
      console.log(`[checkout] Reusing customer: ${customerId}`);
    }

    // ── 5. Create Checkout Session ────────────────────────────────────────────
    // Stripe rule: customer and customer_email are mutually exclusive.
    // - Existing customer → send only `customer` (Stripe already has their email)
    // - New customer      → send only `customer_email` (no customer object yet)
    // Email fallback for webhook is covered by metadata.user_email in both cases.
    const sessionParams = customerId
      ? { customer: customerId }                         // existing — no customer_email
      : { customer_email: user.email } as const;         // new — no customer object

    const session = await getStripe().checkout.sessions.create({
      mode:       'subscription',
      ...sessionParams,
      line_items: [{ price: priceId, quantity: 1 }],

      metadata: {
        user_id:       user.id,     // PRIMARY — webhook reads this first
        user_email:    user.email,  // BACKUP  — webhook email fallback
        selected_plan: plan,
      },

      subscription_data: {
        metadata: {
          user_id:       user.id,
          selected_plan: plan,
        },
      },

      success_url: `${APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}/upgrade?canceled=1`,
      allow_promotion_codes: true,
    });

    console.log(`[checkout] ✓ Session created: ${session.id} for user_id=${user.id} plan=${plan}`);
    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error('[checkout] Unexpected error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
