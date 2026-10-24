/**
 * Provider customer portal for the signed-in user's current subscription
 * (ported from tinyship apps/tanstack-app/src/routes/api/subscription/portal.ts
 * + its provider portal methods). Resume is in-app for Stripe / Dodo / Creem /
 * Waffo (resumeUserSubscription); the portal remains for payment method /
 * invoices. Cancel stays in-app for all. Provider webhooks sync the result
 * back (subscription update → handleSubscriptionUpdated).
 *
 * - Stripe: billingPortal.sessions.create({ customer, return_url })
 * - Creem:  POST /v1/customers/billing { customer_id }
 * - Dodo:   customers.customerPortal.create(customer_id, { return_url })
 * - Waffo:  fixed magic-link consumer portal (no per-customer session)
 *
 * The customer id is read from the stored provider subscription, else from
 * the provider (getSubscription). Ownership: only the caller's own current
 * subscription is used; the client picks neither provider nor customer.
 */
import { WAFFO_CONSUMER_PORTAL_URL } from '@/core/payment/waffo';

import { hasCustomerPortal } from './plan-change';
import { getCurrentSubscriptionView } from './plan-change-service';
import { getPaymentManager } from './service';

export const PORTAL_NO_SUBSCRIPTION_ERROR = 'No active subscription';
export const PORTAL_UNSUPPORTED_ERROR =
  'Subscription management is not available for this payment method.';
export const PORTAL_FAILED_ERROR =
  'Could not open subscription management. Please try again.';

export class CustomerPortalError extends Error {
  constructor(
    message: string,
    readonly code: 'no_subscription' | 'portal_unsupported' | 'portal_failed'
  ) {
    super(message);
  }
}

const idOf = (value: unknown): string | null => {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const id = v.customer_id ?? v.id;
    if (typeof id === 'string' && id) return id;
  }
  return null;
};

/** Customer id inside a provider subscription object (Stripe / Creem / Dodo). */
export function portalCustomerId(raw: unknown): string | null {
  let value: any = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  return idOf(value.customer) ?? idOf(value.customer_id);
}

export async function createCustomerPortalUrl(
  userId: string,
  returnUrl: string
): Promise<{ url: string; provider: string }> {
  const sub = await getCurrentSubscriptionView(userId);
  if (!sub || sub.userId !== userId) {
    throw new CustomerPortalError(
      PORTAL_NO_SUBSCRIPTION_ERROR,
      'no_subscription'
    );
  }
  const name = sub.paymentProvider || '';
  if (!hasCustomerPortal(name)) {
    throw new CustomerPortalError(
      PORTAL_UNSUPPORTED_ERROR,
      'portal_unsupported'
    );
  }
  if (name === 'waffo') {
    return { url: WAFFO_CONSUMER_PORTAL_URL, provider: name };
  }

  const pm = await getPaymentManager();
  const provider = pm.getProvider(name);
  // getProvider falls back to the default provider for unknown names.
  if (!provider || provider.name !== name || !provider.getPaymentBilling) {
    throw new CustomerPortalError(
      PORTAL_UNSUPPORTED_ERROR,
      'portal_unsupported'
    );
  }

  try {
    let customerId = portalCustomerId(sub.subscriptionResult);
    if (!customerId && provider.getSubscription && sub.subscriptionId) {
      const fresh = await provider.getSubscription({
        subscriptionId: sub.subscriptionId,
      });
      customerId = portalCustomerId(fresh.subscriptionResult);
    }
    if (!customerId) throw new Error('customer id not found');
    const billing = await provider.getPaymentBilling({
      customerId,
      returnUrl,
    });
    if (!billing?.billingUrl) throw new Error('no portal url');
    return { url: billing.billingUrl, provider: name };
  } catch (error) {
    console.error('[payment] customer portal failed', {
      provider: name,
      subscriptionNo: sub.subscriptionNo,
      error: (error as Error)?.message || String(error),
    });
    throw new CustomerPortalError(PORTAL_FAILED_ERROR, 'portal_failed');
  }
}
