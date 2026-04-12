// ─── app/api/stripe/webhook/route.ts ─────────────────────────────────────────
// Handles incoming Stripe webhook events.
// Uses stripe_mode from app_config to validate with the correct webhook secret.
//
// IMPORTANT: Add this URL in Stripe Dashboard → Webhooks:
//   https://your-domain.com/api/stripe/webhook
//
// Events handled:
//   checkout.session.completed   → activate subscription
//   customer.subscription.updated → sync plan changes
//   customer.subscription.deleted → deactivate subscription
//   invoice.payment_failed        → mark past_due

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/stripe-config';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function updateUserProfile(
  userId: string,
  updates: Record<string, unknown>
) {
  const sb = getServiceSupabase();
  const { error } = await sb.from('user_profiles').update(updates).eq('id', userId);
  if (error) console.error('[webhook] Failed to update user_profiles:', error.message);
}

function planFromMetadata(metadata: Record<string, string>): 'simple' | 'advanced' {
  return metadata?.planKey === 'advanced' ? 'advanced' : 'simple';
}

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  const cfg = await getStripeConfig();

  if (!cfg.secretKey || !cfg.webhookSecret) {
    console.error(`[webhook] Stripe ${cfg.mode} keys not configured`);
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(cfg.secretKey, { apiVersion: '2024-12-18.acacia' });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, cfg.webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webhook] Signature verification failed:', msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  console.log(`[webhook] Received ${event.type} (${cfg.mode} mode)`);

  try {
    switch (event.type) {
      // ── Checkout completed ─────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session  = event.data.object as Stripe.CheckoutSession;
        const userId   = session.metadata?.userId;
        const planKey  = planFromMetadata(session.metadata ?? {});
        if (!userId) break;

        await updateUserProfile(userId, {
          plan:                  planKey,
          billing_status:        'active',
          is_active:             true,
          stripe_customer_id:    session.customer as string,
          stripe_subscription_id: session.subscription as string,
          manual_plan_override:  false,
        });
        console.log(`[webhook] Activated plan=${planKey} for user=${userId}`);
        break;
      }

      // ── Subscription updated ───────────────────────────────────────────────
      case 'customer.subscription.updated': {
        const sub    = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        const planKey = planFromMetadata(sub.metadata ?? {});
        const status  = sub.status === 'active' ? 'active'
          : sub.status === 'trialing'  ? 'trial'
          : sub.status === 'past_due'  ? 'past_due'
          : sub.status === 'canceled'  ? 'canceled'
          : 'inactive';

        await updateUserProfile(userId, {
          plan:           planKey,
          billing_status: status,
          is_active:      ['active', 'trial'].includes(status),
        });
        break;
      }

      // ── Subscription deleted / canceled ────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub    = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await updateUserProfile(userId, {
          billing_status: 'canceled',
          is_active:      false,
          plan:           'free',
        });
        console.log(`[webhook] Subscription canceled for user=${userId}`);
        break;
      }

      // ── Payment failed ─────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // invoice.subscription_details?.metadata or look up customer
        const customerId = invoice.customer as string;
        if (!customerId) break;

        const sb = getServiceSupabase();
        const { data } = await sb
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (data?.id) {
          await updateUserProfile(data.id, { billing_status: 'past_due' });
          console.log(`[webhook] Payment failed for customer=${customerId}`);
        }
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
