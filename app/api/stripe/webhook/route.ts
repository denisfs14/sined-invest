// ─── POST /api/stripe/webhook ─────────────────────────────────────────────────
// The ONLY place billing state changes in this app.
// Signature-verified — only genuine Stripe events are processed.
//
// User identification for checkout.session.completed (3-step fallback):
//   1. session.metadata.user_id  (set by our checkout route)
//   2. session customer_email    (also set by our route)
//   3. stripe_customer_id lookup in user_profiles

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, planFromPriceId } from '@/lib/stripe/server';
import {
  updateProfileBilling,
  updateProfileBillingByEmail,
  getProfileById,
  getProfileByEmail,
  getProfileByStripeCustomer,
  extractStripeId,
} from '@/lib/stripe/supabase-admin';

export async function POST(req: NextRequest) {
  // ── Entry log — confirms Stripe reached this handler (not a redirect) ────
  console.log('[webhook] ▶ POST /api/stripe/webhook received', {
    method:       req.method,
    url:          req.url,
    hasSignature: !!req.headers.get('stripe-signature'),
    contentType:  req.headers.get('content-type'),
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook] FATAL: STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    console.error('[webhook] Missing stripe-signature header');
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

  console.log(`[webhook] ▶ ${event.type} id=${event.id}`);

  try {
    switch (event.type) {

      // ── checkout.session.completed ──────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') {
          console.log('[webhook] Skipping non-subscription checkout');
          break;
        }

        // ── Extract all identifying fields ────────────────────────────────
        const userId       = session.metadata?.user_id       ?? null;
        const metaEmail    = session.metadata?.user_email     ?? null;
        // customer_email is a top-level field on CheckoutSession
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionEmail = (session as any).customer_email  ?? null;
        const email        = metaEmail || sessionEmail;
        const selectedPlan = session.metadata?.selected_plan as 'simple' | 'advanced' | null ?? null;

        // FIX: session.subscription is typed as string | Stripe.Subscription | null
        // Use extractStripeId() to safely get the string ID in either case
        const customerId = extractStripeId(session.customer);
        const subId      = extractStripeId(session.subscription);

        // Full diagnostic log — print everything for debugging
        console.log('[webhook] checkout.session.completed —', JSON.stringify({
          sessionId:    session.id,
          userId,
          email,
          selectedPlan,
          customerId,
          subId,
          rawSubscription: typeof session.subscription,
          rawCustomer:     typeof session.customer,
          allMetadata:  session.metadata,
        }));

        // selected_plan is essential — we cannot update the plan without it
        if (!selectedPlan) {
          console.error('[webhook] CRITICAL: selected_plan missing from session.metadata for', session.id);
          break;
        }

        // subId must be present — it's the stripe_subscription_id we store
        if (!subId) {
          console.error('[webhook] CRITICAL: session.subscription is null/missing for', session.id);
          break;
        }

        // ── Retrieve subscription to get period_end ───────────────────────
        let periodEnd = '';
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sub = await getStripe().subscriptions.retrieve(subId) as any;
          periodEnd = new Date((sub.current_period_end ?? 0) * 1000).toISOString();
          console.log(`[webhook] Subscription retrieved: ${subId} period_end=${periodEnd}`);
        } catch (e) {
          // Not fatal — we still update plan/status without access expiry
          console.warn(`[webhook] Could not retrieve subscription ${subId}:`, e);
        }

        // ── Build the update payload ──────────────────────────────────────
        const billingFields = {
          plan:                   selectedPlan,           // 'simple' or 'advanced'
          billing_status:         'active' as const,
          stripe_customer_id:     customerId ?? undefined,
          stripe_subscription_id: subId,                  // guaranteed string here
          access_expires_at:      periodEnd || undefined,
          is_active:              true,
        };

        console.log('[webhook] About to update with:', JSON.stringify(billingFields));

        // ── STEP 1: user_id from metadata ─────────────────────────────────
        if (userId) {
          const profile = await getProfileById(userId);
          if (profile) {
            if (profile.role === 'admin' || profile.manual_plan_override || profile.special_access) {
              console.log(`[webhook] Skipping — user=${userId} has manual override`);
              break;
            }
            const result = await updateProfileBilling(userId, billingFields);
            if (result.updated) {
              console.log(`[webhook] ✓ STEP1 success: userId=${userId} plan=${selectedPlan} subId=${subId}`);
              break;
            }
            console.error(`[webhook] STEP1 failed: updateProfileBilling returned updated=false for id=${userId}`);
          } else {
            console.warn(`[webhook] STEP1: no profile found for userId=${userId}`);
          }
        } else {
          console.warn('[webhook] STEP1: user_id not in metadata');
        }

        // ── STEP 2: email fallback ────────────────────────────────────────
        if (email) {
          console.log(`[webhook] STEP2: email fallback for ${email}`);
          const profileByEmail = await getProfileByEmail(email);
          if (profileByEmail) {
            if (profileByEmail.role === 'admin' || profileByEmail.manual_plan_override || profileByEmail.special_access) {
              console.log(`[webhook] Skipping STEP2 — email=${email} has manual override`);
              break;
            }
            const result = await updateProfileBillingByEmail(email, billingFields);
            if (result.updated) {
              console.log(`[webhook] ✓ STEP2 success: email=${email} userId=${result.userId} plan=${selectedPlan}`);
              break;
            }
            console.error(`[webhook] STEP2 failed: updateProfileBillingByEmail returned updated=false for email=${email}`);
          } else {
            console.warn(`[webhook] STEP2: no profile found for email=${email}`);
          }
        } else {
          console.warn('[webhook] STEP2: no email available in session');
        }

        // ── STEP 3: Stripe customer id lookup ─────────────────────────────
        if (customerId) {
          console.log(`[webhook] STEP3: customer id lookup for ${customerId}`);
          const profileByCust = await getProfileByStripeCustomer(customerId);
          if (profileByCust) {
            if (profileByCust.role === 'admin' || profileByCust.manual_plan_override || profileByCust.special_access) {
              console.log(`[webhook] Skipping STEP3 — customer=${customerId} has manual override`);
              break;
            }
            const result = await updateProfileBilling(profileByCust.id, billingFields);
            if (result.updated) {
              console.log(`[webhook] ✓ STEP3 success: customerId=${customerId} userId=${profileByCust.id} plan=${selectedPlan}`);
              break;
            }
            console.error(`[webhook] STEP3 failed: updateProfileBilling returned updated=false for id=${profileByCust.id}`);
          } else {
            console.warn(`[webhook] STEP3: no profile found for customerId=${customerId}`);
          }
        }

        // All paths exhausted
        console.error('[webhook] CRITICAL: All identification steps failed for session:', session.id,
          JSON.stringify({ userId, email, customerId, selectedPlan, subId }));
        break;
      }

      // ── invoice.payment_succeeded ─────────────────────────────────────
      case 'invoice.payment_succeeded': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice    = event.data.object as any;
        const customerId = extractStripeId(invoice.customer);

        // Skip first payment — already handled by checkout.session.completed
        if (invoice.billing_reason === 'subscription_create') {
          console.log('[webhook] Skipping invoice.payment_succeeded for subscription_create (handled by checkout)');
          break;
        }

        const subId = extractStripeId(
          invoice.subscription ?? invoice.parent?.subscription_details?.subscription
        );

        console.log(`[webhook] invoice.payment_succeeded: customerId=${customerId} subId=${subId}`);

        if (!customerId || !subId) {
          console.error('[webhook] invoice.payment_succeeded: missing customerId or subId');
          break;
        }

        const profile = await getProfileByStripeCustomer(customerId);
        if (!profile) {
          console.warn(`[webhook] invoice.payment_succeeded: no profile for customerId=${customerId}`);
          break;
        }
        if (profile.role === 'admin' || profile.manual_plan_override || profile.special_access) break;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub       = await getStripe().subscriptions.retrieve(subId) as any;
        const priceId   = sub.items?.data?.[0]?.price?.id;
        const plan      = priceId ? planFromPriceId(priceId) : null;
        const periodEnd = new Date((sub.current_period_end ?? 0) * 1000).toISOString();

        const result = await updateProfileBilling(profile.id, {
          billing_status:         'active',
          stripe_subscription_id: subId,
          access_expires_at:      periodEnd,
          is_active:              true,
          ...(plan ? { plan } : {}),
        });

        console.log(`[webhook] ✓ invoice.payment_succeeded: user=${profile.id} updated=${result.updated} plan=${plan ?? 'unchanged'}`);
        break;
      }

      // ── customer.subscription.updated ─────────────────────────────────
      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub        = event.data.object as any;
        const customerId = extractStripeId(sub.customer);

        console.log(`[webhook] subscription.updated: customerId=${customerId} status=${sub.status}`);

        const profile = await getProfileByStripeCustomer(customerId ?? '');
        if (!profile) { console.warn('[webhook] subscription.updated: no profile'); break; }
        if (profile.role === 'admin' || profile.manual_plan_override || profile.special_access) break;

        const priceId   = sub.items?.data?.[0]?.price?.id;
        const plan      = priceId ? planFromPriceId(priceId) : null;
        const periodEnd = new Date((sub.current_period_end ?? 0) * 1000).toISOString();

        const statusMap: Record<string, 'active' | 'inactive' | 'trial' | 'canceled' | 'past_due'> = {
          active: 'active', trialing: 'trial', past_due: 'past_due',
          canceled: 'canceled', incomplete: 'inactive', incomplete_expired: 'inactive',
          unpaid: 'past_due', paused: 'inactive',
        };
        const billing_status = statusMap[sub.status] ?? 'inactive';

        const result = await updateProfileBilling(profile.id, {
          billing_status,
          stripe_subscription_id: extractStripeId(sub.id) ?? sub.id,
          access_expires_at:      periodEnd,
          is_active:              ['active', 'trialing'].includes(sub.status),
          ...(plan ? { plan } : {}),
        });

        console.log(`[webhook] ✓ subscription.updated: user=${profile.id} updated=${result.updated} status=${billing_status}`);
        break;
      }

      // ── customer.subscription.deleted ─────────────────────────────────
      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub        = event.data.object as any;
        const customerId = extractStripeId(sub.customer);

        console.log(`[webhook] subscription.deleted: customerId=${customerId}`);

        const profile = await getProfileByStripeCustomer(customerId ?? '');
        if (!profile) { console.warn('[webhook] subscription.deleted: no profile'); break; }
        if (profile.role === 'admin' || profile.manual_plan_override || profile.special_access) break;

        const result = await updateProfileBilling(profile.id, {
          plan: 'free', billing_status: 'canceled',
          access_expires_at: null, is_active: true,
        });

        console.log(`[webhook] ✓ subscription.deleted: user=${profile.id} updated=${result.updated} → free`);
        break;
      }

      // ── invoice.payment_failed ────────────────────────────────────────
      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice    = event.data.object as any;
        const customerId = extractStripeId(invoice.customer);

        const profile = await getProfileByStripeCustomer(customerId ?? '');
        if (!profile || profile.role === 'admin' || profile.manual_plan_override || profile.special_access) break;

        const result = await updateProfileBilling(profile.id, { billing_status: 'past_due' });
        console.log(`[webhook] ✓ invoice.payment_failed: user=${profile.id} updated=${result.updated} → past_due`);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    console.error('[webhook] Handler error:', err);
    return NextResponse.json({ received: true, warning: 'Handler error — check logs' });
  }
}
