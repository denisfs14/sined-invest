// ─── POST /api/stripe/webhook ─────────────────────────────────────────────────
// Receives Stripe webhook events and updates user_profiles accordingly.
// This is the ONLY place billing state is changed — never from the frontend.
// Signature verification ensures the request is genuinely from Stripe.

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, planFromPriceId } from '@/lib/stripe/server';
import { updateProfileBilling, getProfileByStripeCustomer } from '@/lib/stripe/supabase-admin';

// Next.js App Router: raw body is read via req.text() — no config needed
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // ── Verify Stripe signature ───────────────────────────────────────────────
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[webhook] Received: ${event.type} (${event.id})`);

  try {
    switch (event.type) {

      // ── Checkout completed → subscription created and paid ──────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const userId      = session.metadata?.supabase_user_id;
        const selectedPlan = session.metadata?.selected_plan as 'simple' | 'advanced' | undefined;

        if (!userId || !selectedPlan) {
          console.error('[webhook] checkout.session.completed: missing metadata', session.metadata);
          break;
        }

        // Get the subscription to find price and current period end
        const subId = session.subscription as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub       = await getStripe().subscriptions.retrieve(subId) as any;
        const periodEnd = new Date((sub.current_period_end ?? 0) * 1000).toISOString();

        await updateProfileBilling(userId, {
          plan:                   selectedPlan,
          billing_status:         'active',
          stripe_customer_id:     session.customer as string,
          stripe_subscription_id: subId,
          access_expires_at:      periodEnd,
          is_active:              true,
        });

        console.log(`[webhook] ✓ Checkout complete: user=${userId} plan=${selectedPlan}`);
        break;
      }

      // ── Invoice paid → renewal or first payment ──────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice    = event.data.object as Stripe.Invoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceAny = invoice as any;
        if (invoice.billing_reason === 'subscription_create') {
          // Already handled by checkout.session.completed
          break;
        }

        const customerId = invoice.customer as string;
        const subId      = (invoiceAny.subscription ?? invoiceAny.parent?.subscription_details?.subscription) as string | undefined;

        if (!customerId || !subId) break;

        // Look up user by Stripe customer ID
        const profile = await getProfileByStripeCustomer(customerId);
        if (!profile) {
          console.warn('[webhook] invoice.payment_succeeded: no profile for customer', customerId);
          break;
        }

        // Do not override admin/manual/special access
        if (profile.role === 'admin' || profile.manual_plan_override || profile.special_access) {
          console.log('[webhook] Skipping billing update — user has manual override');
          break;
        }

        // Find plan from subscription price
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub       = await getStripe().subscriptions.retrieve(subId) as any;
        const priceId   = sub.items?.data?.[0]?.price?.id;
        const plan      = priceId ? planFromPriceId(priceId) : null;
        const periodEnd = new Date((sub.current_period_end ?? 0) * 1000).toISOString();

        await updateProfileBilling(profile.id, {
          billing_status:         'active',
          stripe_subscription_id: subId,
          access_expires_at:      periodEnd,
          is_active:              true,
          ...(plan ? { plan } : {}),
        });

        console.log(`[webhook] ✓ Payment renewed: user=${profile.id} plan=${plan ?? 'unchanged'}`);
        break;
      }

      // ── Subscription updated (plan change, status change) ────────────────
      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub        = event.data.object as any;
        const customerId = sub.customer as string;

        const profile = await getProfileByStripeCustomer(customerId);
        if (!profile) {
          console.warn('[webhook] subscription.updated: no profile for customer', customerId);
          break;
        }

        if (profile.role === 'admin' || profile.manual_plan_override || profile.special_access) {
          console.log('[webhook] Skipping update — user has manual override');
          break;
        }

        const priceId    = sub.items.data[0]?.price.id;
        const plan       = priceId ? planFromPriceId(priceId) : null;
        const periodEnd  = new Date((sub.current_period_end ?? 0) * 1000).toISOString();

        // Map Stripe sub status to our billing_status
        const statusMap: Record<string, 'active' | 'inactive' | 'trial' | 'canceled' | 'past_due'> = {
          active:           'active',
          trialing:         'trial',
          past_due:         'past_due',
          canceled:         'canceled',
          incomplete:       'inactive',
          incomplete_expired: 'inactive',
          unpaid:           'past_due',
          paused:           'inactive',
        };
        const billing_status = statusMap[sub.status] ?? 'inactive';

        await updateProfileBilling(profile.id, {
          billing_status,
          access_expires_at: periodEnd,
          stripe_subscription_id: sub.id,
          ...(plan ? { plan } : {}),
          // Only mark inactive if truly canceled/incomplete
          is_active: ['active', 'trialing'].includes(sub.status),
        });

        console.log(`[webhook] ✓ Subscription updated: user=${profile.id} status=${billing_status} plan=${plan ?? 'unchanged'}`);
        break;
      }

      // ── Subscription deleted/canceled ────────────────────────────────────
      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub        = event.data.object as any;
        const customerId = sub.customer as string;

        const profile = await getProfileByStripeCustomer(customerId);
        if (!profile) {
          console.warn('[webhook] subscription.deleted: no profile for customer', customerId);
          break;
        }

        // Never remove admin/manual/special access via webhook
        if (profile.role === 'admin' || profile.manual_plan_override || profile.special_access) {
          console.log('[webhook] Skipping cancellation — user has manual override');
          break;
        }

        await updateProfileBilling(profile.id, {
          plan:             'free',
          billing_status:   'canceled',
          access_expires_at: null,
          is_active:        true,  // account stays active, just downgraded to free
        });

        console.log(`[webhook] ✓ Subscription canceled: user=${profile.id} → free`);
        break;
      }

      // ── Invoice payment failed ────────────────────────────────────────────
      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice    = event.data.object as any;
        const customerId = invoice.customer as string;

        const profile = await getProfileByStripeCustomer(customerId);
        if (!profile || profile.role === 'admin' || profile.manual_plan_override || profile.special_access) break;

        await updateProfileBilling(profile.id, {
          billing_status: 'past_due',
        });

        console.log(`[webhook] ✓ Payment failed: user=${profile.id} → past_due`);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] Handler error:', err);
    // Return 200 to prevent Stripe retries for logic errors
    // Return 500 only for infrastructure failures
    return NextResponse.json({ received: true, warning: 'Handler error — check logs' });
  }
}
