// ─── Stripe checkout helpers (client-safe) ───────────────────────────────────
// These functions call OUR API endpoints, which in turn talk to Stripe.
// No secret key is ever needed here — all secrets live server-side.

export type CheckoutPlan = 'simple' | 'advanced';

export interface CheckoutOptions {
  plan:    CheckoutPlan;
  yearly?: boolean;
}

/**
 * Redirect user to Stripe Checkout for a subscription.
 * Returns an error string if the redirect fails.
 */
export async function redirectToCheckout(opts: CheckoutOptions): Promise<string | null> {
  try {
    const res = await fetch('/api/stripe/checkout', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(opts),
    });

    const data = await res.json();

    if (!res.ok) {
      return data.error ?? 'Failed to start checkout';
    }

    if (data.url) {
      window.location.href = data.url;
      return null; // redirect happening
    }

    return 'No checkout URL returned';
  } catch {
    return 'Network error — please try again';
  }
}

/**
 * Redirect user to Stripe Customer Portal to manage their subscription.
 */
export async function redirectToPortal(): Promise<string | null> {
  try {
    const res  = await fetch('/api/stripe/portal', { method: 'POST' });
    const data = await res.json();

    if (!res.ok) return data.error ?? 'Failed to open portal';
    if (data.url) { window.location.href = data.url; return null; }
    return 'No portal URL returned';
  } catch {
    return 'Network error — please try again';
  }
}
