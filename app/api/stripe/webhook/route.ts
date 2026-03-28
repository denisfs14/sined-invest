// ─── POST /api/stripe/webhook ─────────────────────────────────────────────────
// Source of truth for all billing state changes.
// Signature-verified — only genuine Stripe events are processed here.
//
// User identification strategy for checkout.session.completed:
//   STEP 1 — metadata.user_id      (set by our checkout route — primary)
//   STEP 2 — session.customer_email (also set by our route — email fallback)
//   STEP 3 — customer lookup        (stripe_customer_id in user_profiles)
//   STEP 4 — log CRITICAL and stop  (no silent failures)

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, planFromPriceId } from '@/lib/stripe/server';
import {
  updateProfileBilling,
  updateProfileBillingByEmail,
  getProfileById,
  getProfileByEmail,
  getProfileByStripeCustomer,
} from '@/lib/stripe/supabase-admin';

export async function POST(req: NextRequest) {
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

      // ─────────────────────────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        // ── Log everything available for debugging ────────────────────────
        const userId         = session.metadata?.user_id   ?? null;
        const metadataEmail  = session.metadata?.user_email ?? null;
        const sessionEmail   = (session as unknown as { customer_email?: string }).customer_email ?? null;
        const email          = metadataEmail || sessionEmail;
        const selectedPlan   = session.metadata?.selected_plan as 'simple' | 'advanced' | undefined;
        const customerId     = session.customer as string | null;
        const subId          = session.subscription as string | null;

        console.log('[webhook] checkout.session.completed —', JSON.stringify({
          sessionId:    session.id,
          userId,
          email,
          selectedPlan,
          customerId,
          subId,
          allMetadata:  session.metadata,
        }));

        if (!selectedPlan) {
          console.error('[webhook] CRITICAL: selected_plan missing from metadata — cannot determine plan');
          break;
        }

        // ── Get subscription period end ───────────────────────────────────
        let periodEnd = '';
        if (subId) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sub = await getStripe().subscriptions.retrieve(subId) as any;
            periodEnd = new Date((sub.current_period_end ?? 0) * 1000).toISOString();
          } catch (e) {
            console.warn('[webhook] Could not retrieve subscription:', e);
          }
        }

        const billingFields = {
          plan:                   selectedPlan,
          billing_status:         'active' as const,
          stripe_customer_id:     customerId ?? undefined,
          stripe_subscription_id: subId ?? undefined,
          access_expires_at:      periodEnd || undefined,
          is_active:              true,
        };

        // ── STEP 1: Try user_id from metadata ────────────────────────────
        if (userId) {
          const profile = await getProfileById(userId);
          if (profile) {
            if (profile.role === 'admin' || profile.manual_plan_override || profile.special_access) {
              console.log(`[webhook] Skipping — user=${userId} has manual override`);
              break;
            }
            const result = await updateProfileBilling(userId, billingFields);
            if (result.updated) {
              console.log(`[webhook] ✓ STEP1 success: user_id=${userId} plan=${selectedPlan}`);
              break;
            }
            // updated=false means 0 rows matched — shouldn't happen if profile exists
            console.error(`[webhook] STEP1: updateProfileBilling returned 0 rows for id=${userId}`);
          } else {
            console.warn(`[webhook] STEP1: getProfileById returned null for user_id=${userId}`);
          }
        } else {
          console.warn('[webhook] STEP1: user_id not in metadata — trying email fallback');
        }

        // ── STEP 2: Try email fallback ────────────────────────────────────
        if (email) {
          console.log(`[webhook] STEP2: trying email fallback for email=${email}`);
          const profileByEmail = await getProfileByEmail(email);
          if (profileByEmail) {
            if (profileByEmail.role === 'admin' || profileByEmail.manual_plan_override || profileByEmail.special_access) {
              console.log(`[webhook] Skipping — email=${email} has manual override`);
              break;
            }
            const result = await updateProfileBillingByEmail(email, billingFields);
            if (result.updated) {
              console.log(`[webhook] ✓ STEP2 success: email=${email} userId=${result.userId} plan=${selectedPlan}`);
              break;
            }
            console.error(`[webhook] STEP2: updateProfileBillingByEmail returned 0 rows for email=${email}`);
          } else {
            console.warn(`[webhook] STEP2: no profile found for email=${email}`);
          }
        } else {
          console.warn('[webhook] STEP2: email not available in session');
        }

        // ── STEP 3: Try customer id lookup ────────────────────────────────
        if (customerId) {
          console.log(`[webhook] STEP3: trying customer id lookup for customerId=${customerId}`);
          const profileByCust = await getProfileByStripeCustomer(customerId);
          if (profileByCust) {
            if (profileByCust.role === 'admin' || profileByCust.manual_plan_override || profileByCust.special_access) {
              console.log(`[webhook] Skipping — customer=${customerId} has manual override`);
              break;
            }
            const result = await updateProfileBilling(profileByCust.id, billingFields);
            if (result.updated) {
              console.log(`[webhook] ✓ STEP3 success: customerId=${customerId} userId=${profileByCust.id} plan=${selectedPlan}`);
              break;
            }
          } else {
            console.warn(`[webhook] STEP3: no profile found for customerId=${customerId}`);
          }
        }

        // ── STEP 4: All paths exhausted — log critical, do not throw ──────
        console.error('[webhook] CRITICAL: All user identification steps failed.', JSON.stringify({
          userId, email, customerId, selectedPlan, sessionId: session.id,
        }));
        // Do NOT throw — return 200 so Stripe stops retrying a session we can't resolve
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice    = event.data.object as any;
        const customerId = invoice.customer as string;

        if (invoice.billing_reason === 'subscription_create') {
          console.log('[webhook] Skipping invoice.payment_succeeded for subscription_create');
          break;
        }

        const subId = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
        if (!customerId || !subId) {
          console.error('[webhook] invoice.payment_succeeded: missing customerId or subId', { customerId, subId });
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
          billing_status: 'active',
          stripe_subscription_id: subId,
          access_expires_at: periodEnd,
          is_active: true,
          ...(plan ? { plan } : {}),
        });

        console.log(`[webhook] ✓ invoice.payment_succeeded: user=${profile.id} updated=${result.updated} plan=${plan ?? 'unchanged'}`);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub        = event.data.object as any;
        const customerId = sub.customer as string;

        const profile = await getProfileByStripeCustomer(customerId);
        if (!profile) { console.warn(`[webhook] subscription.updated: no profile for ${customerId}`); break; }
        if (profile.role === 'admin' || profile.manual_plan_override || profile.special_access) break;

        const priceId   = sub.items?.data?.[0]?.price?.id;
        const plan      = priceId ? planFromPriceId(priceId) : null;
        const periodEnd = new Date((sub.current_period_end ?? 0) * 1000).toISOString();

        const statusMap: Record<string, 'active'|'inactive'|'trial'|'canceled'|'past_due'> = {
          active: 'active', trialing: 'trial', past_due: 'past_due',
          canceled: 'canceled', incomplete: 'inactive', incomplete_expired: 'inactive',
          unpaid: 'past_due', paused: 'inactive',
        };
        const billing_status = statusMap[sub.status] ?? 'inactive';

        const result = await updateProfileBilling(profile.id, {
          billing_status,
          stripe_subscription_id: sub.id,
          access_expires_at: periodEnd,
          is_active: ['active', 'trialing'].includes(sub.status),
          ...(plan ? { plan } : {}),
        });

        console.log(`[webhook] ✓ subscription.updated: user=${profile.id} updated=${result.updated} status=${billing_status} plan=${plan ?? 'unchanged'}`);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub        = event.data.object as any;
        const customerId = sub.customer as string;

        const profile = await getProfileByStripeCustomer(customerId);
        if (!profile) { console.warn(`[webhook] subscription.deleted: no profile for ${customerId}`); break; }
        if (profile.role === 'admin' || profile.manual_plan_override || profile.special_access) break;

        const result = await updateProfileBilling(profile.id, {
          plan: 'free', billing_status: 'canceled',
          access_expires_at: null, is_active: true,
        });

        console.log(`[webhook] ✓ subscription.deleted: user=${profile.id} updated=${result.updated} → free`);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice    = event.data.object as any;
        const customerId = invoice.customer as string;

        const profile = await getProfileByStripeCustomer(customerId);
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
    // Return 200 — prevents Stripe from infinite-retrying our logic errors.
    return NextResponse.json({ received: true, warning: 'Handler error — check logs' });
  }
}
