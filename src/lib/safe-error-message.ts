/** Our own plan-change messages (PLAN_CHANGE_ERRORS), passed through as-is. */
const PLAN_CHANGE_OWN_MESSAGES = [
  'Choose how to switch: upgrade to the yearly plan now, or switch to the monthly plan when your current yearly period ends.',
  'Plan changes are not available during a trial.',
  'Your plan renews within 24 hours. Please try again after the renewal.',
  'The new plan is billed in a different currency.',
  'This subscription already has a plan change or cancellation in progress at the payment provider. Check Billing for its status.',
];

/**
 * Messages an API route may show to users. Our own errors (listed below,
 * translated by apiErrorMessage on the client) pass through; anything else
 * — typically a raw payment-provider response such as
 * "422 Only full_immediately proration mode is allowed…" — is replaced by a
 * generic message. Callers log the raw error first.
 */
const OWN_MESSAGES = new Set([
  'Unauthorized',
  'Forbidden',
  'Subscription not found',
  'Cancellation not supported for this provider',
  'Missing product_id',
  'Unknown product',
  'Checkout failed',
  'Plan change failed',
  'Cancellation failed',
  'Resume failed',
  'This subscription cannot be resumed.',
  'Upgrade in progress. You can cancel once it completes.',
  'Payment product mapping not configured',
  'This payment method does not support the selected currency',
  'Alipay and WeChat Pay are only available for one-time credit packs',
  'An active subscription is required to buy credits',
  ...PLAN_CHANGE_OWN_MESSAGES,
]);

/**
 * Waffo plan-change guards (docs.waffo.ai/features/subscriptions). Mapped
 * to localized copy by apiErrorMessage.
 */
export const WAFFO_PLAN_CHANGE_ERROR_PATTERNS = {
  // lower/same-price plan change requested as immediate (400)
  notImmediate:
    /downgrade or same-price change cannot take effect immediately/i,
  // immediate < 24h / next_period < 1h before the next charge (400)
  tooClose:
    /at least (24 hours|1 hour) before (the )?(next charge|period ends?)/i,
  // subscription is in a trial (409)
  trial: /\b(during|in) (a |the |its )?trial\b/i,
  // a confirmed change already exists (409)
  confirmedPending:
    /already has a confirmed (plan )?change|confirmed plan change/i,
  // target plan in another currency (400)
  currency: /different currency|cross-currency/i,
  // origin is canceling/ended on Waffo, e.g. a change confirmed there (409)
  notActive: /only an active subscription can change plan/i,
  // target plan is the current plan (400)
  samePlan: /target plan is the current plan/i,
} as const;

/** Raw provider messages the client already maps to a friendly text. */
const MAPPED_PATTERNS = [
  /Invalid productId: expected Product Short ID format/i,
  /expected Product Short ID format \(PROD_xxx\)/i,
  /\bProduct\s+\S+\s+does not exist\b/i,
  /^Payment provider '.+' is not configured$/,
  ...Object.values(WAFFO_PLAN_CHANGE_ERROR_PATTERNS),
];

export function safeErrorMessage(error: unknown, fallback: string): string {
  const message = String(
    (error as { message?: unknown } | null)?.message ?? ''
  ).trim();
  if (!message) return fallback;
  if (OWN_MESSAGES.has(message)) return message;
  if (MAPPED_PATTERNS.some((p) => p.test(message))) return message;
  return fallback;
}
