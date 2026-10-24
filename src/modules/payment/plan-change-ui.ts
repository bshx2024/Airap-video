/**
 * Client-side decisions for the plan-change dialogs (pure, unit tested).
 * pricing.tsx / billing.tsx only map these to toasts and state.
 */
import type { PlanChangeSupport } from './plan-change';
import type { PlanChangeOutcome } from './plan-change-service';

export type PlanChangeStep =
  /** Leave for the provider's page; keep the dialog busy until unload. */
  | { kind: 'redirect'; url: string }
  /** No in-place change: close the dialog and run the normal checkout. */
  | { kind: 'checkout' }
  /** Done here: close the dialog, toast, refresh. */
  | {
      kind: 'done';
      toast:
        | 'applied'
        | 'processing'
        | 'downgrade_scheduled'
        | 'change_scheduled'
        | 'resubscribe_scheduled';
      effectiveAt?: string | null;
    }
  /** Unexpected response: keep the dialog open with an error. */
  | { kind: 'invalid' };

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

export function planChangeStep(
  outcome: PlanChangeOutcome | null | undefined
): PlanChangeStep {
  switch (outcome?.mode) {
    case 'confirm':
      return isHttpUrl(outcome.confirm_url)
        ? { kind: 'redirect', url: outcome.confirm_url }
        : { kind: 'invalid' };
    case 'checkout':
      return { kind: 'checkout' };
    case 'applied':
      return { kind: 'done', toast: 'applied' };
    case 'processing':
      return { kind: 'done', toast: 'processing' };
    case 'scheduled':
      return {
        kind: 'done',
        toast:
          outcome.kind === 'resubscribe'
            ? 'resubscribe_scheduled'
            : // yearly → higher monthly at period end is not a "downgrade"
              outcome.intent === 'upgrade_to_monthly'
              ? 'change_scheduled'
              : 'downgrade_scheduled',
        effectiveAt: outcome.effective_at,
      };
    default:
      return { kind: 'invalid' };
  }
}

/** True when confirming sends the customer to the provider's own page. */
export function opensProviderPage(
  support: PlanChangeSupport,
  action: string | null | undefined
): boolean {
  if (action === 'downgrade') return support.periodEnd === 'confirm';
  if (action === 'upgrade') return support.immediate === 'confirm';
  return false;
}

const PROVIDER_NAMES: Record<string, string> = {
  stripe: 'Stripe',
  creem: 'Creem',
  dodo: 'Dodo Payments',
  waffo: 'Waffo',
  paypal: 'PayPal',
  alipay: 'Alipay',
  wechat: 'WeChat Pay',
};

export function providerDisplayName(provider?: string | null): string {
  const key = (provider || '').toLowerCase();
  return PROVIDER_NAMES[key] || provider || '';
}

/** Billing page polling after returning from the provider's confirm page. */
export const PLAN_CHANGE_SYNC_INTERVAL_MS = 2000;
export const PLAN_CHANGE_SYNC_MAX_ATTEMPTS = 10; // ≈ 20s

export type PlanChangeSyncResult =
  | 'idle'
  | 'confirmed'
  | 'pending'
  | 'failed'
  | 'unavailable'
  /** processing upgrade: applied now */
  | 'applied'
  /** processing upgrade: asked under a minute ago */
  | 'throttled'
  /** processing upgrade: provider has no status lookup */
  | 'unsupported';

/** Stop polling once the outcome is known (or nothing is awaiting). */
export function isPlanChangeSyncSettled(
  sync: PlanChangeSyncResult | null | undefined
): boolean {
  return (
    sync === 'confirmed' ||
    sync === 'applied' ||
    sync === 'failed' ||
    sync === 'idle'
  );
}

export type ProcessingUpgradeRefreshToast =
  | { kind: 'success'; key: 'applied' | 'updated' }
  | { kind: 'error'; key: 'failed' }
  | { kind: 'info'; key: 'pending' | 'throttled' | 'unsupported' }
  | { kind: 'error'; key: 'unavailable' };

/** "Refresh status" on a processing upgrade: which toast to show. */
export function processingUpgradeRefreshToast(
  sync: PlanChangeSyncResult | null | undefined
): ProcessingUpgradeRefreshToast {
  switch (sync) {
    case 'applied':
      return { kind: 'success', key: 'applied' };
    case 'confirmed':
    case 'idle': // settled meanwhile (webhook / deadline): just refreshed
      return { kind: 'success', key: 'updated' };
    case 'failed':
      return { kind: 'error', key: 'failed' };
    case 'throttled':
      return { kind: 'info', key: 'throttled' };
    case 'unsupported':
      return { kind: 'info', key: 'unsupported' };
    case 'pending':
      return { kind: 'info', key: 'pending' };
    default:
      return { kind: 'error', key: 'unavailable' };
  }
}
