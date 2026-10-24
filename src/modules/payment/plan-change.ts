/**
 * Plan change rules shared by the server (service / webhooks) and the
 * /pricing + /settings/billing UI. Pure: no DB or provider imports, so it is
 * safe in client bundles and easy to unit test.
 *
 * Upgrades (higher tier, or monthly→yearly on the same tier) apply now with
 * proration. Downgrades (lower tier, or yearly→monthly) are booked for the
 * end of the current period: the customer keeps the current plan until then
 * and nothing is refunded.
 */
import { effectiveCancelEndAt } from '@/core/payment/period';
import {
  getPricingProduct,
  getSubscriptionTier,
  listPricingProducts,
  resolvePricingAmount,
  resolvePricingPlanAction,
  type PricingPlanAction,
  type PricingProduct,
} from '@/config/pricing';

/** subscription.pending_change_type values. */
export const PendingChangeType = {
  /** Provider switches the plan at period end (Stripe/Dodo in place, Waffo via a new order). */
  DOWNGRADE: 'downgrade',
  /** Waffo hosted upgrade/switch confirmed; applies when the new order activates. */
  UPGRADE: 'upgrade',
  /** Creem: current plan is cancelled at period end; customer then subscribes to the target. */
  RESUBSCRIBE: 'resubscribe',
} as const;
export type PendingChangeTypeValue =
  (typeof PendingChangeType)[keyof typeof PendingChangeType];

export type PlanChangeSupport = {
  /** native = switch in place; confirm = hosted confirm page; checkout = new checkout + replace. */
  immediate: 'native' | 'confirm' | 'checkout';
  /** native = provider schedules it; confirm = hosted page; cancel_then_resubscribe = scheduled cancel + prompt. */
  periodEnd: 'native' | 'confirm' | 'cancel_then_resubscribe' | 'unsupported';
  /** A booked downgrade can be undone. */
  undo: boolean;
};

export function planChangeSupport(provider?: string | null): PlanChangeSupport {
  switch (provider) {
    case 'stripe':
    case 'dodo':
      return { immediate: 'native', periodEnd: 'native', undo: true };
    case 'waffo':
      // A booking only exists once the customer confirmed on Waffo's page,
      // and Waffo cannot take it back. Before that it is merely "awaiting
      // confirmation" (see pickAwaitingWaffoPlanChange), which can be
      // discarded or reopened.
      return { immediate: 'confirm', periodEnd: 'confirm', undo: false };
    case 'creem':
      return {
        immediate: 'native',
        periodEnd: 'cancel_then_resubscribe',
        undo: false,
      };
    default:
      return { immediate: 'checkout', periodEnd: 'unsupported', undo: false };
  }
}

/**
 * Waffo rejects an immediate plan change to a plan whose billing amount is
 * the same or lower ("A downgrade or same-price change cannot take effect
 * immediately…"). A higher tier can still cost less per charge, e.g.
 * Lite yearly (106.80) → Pro monthly (19.90). Such a change has to be booked
 * for the end of the current period instead. Compares in the subscription's
 * currency; unknown amount / mismatched currency → false (unchanged).
 */
export function waffoChangeMustWaitForPeriodEnd(
  current: { amount?: number | null; currency?: string | null },
  target: PricingProduct
): boolean {
  if (current.amount == null || !current.currency) return false;
  const next = resolvePricingAmount(target, current.currency);
  if (next.currency.toLowerCase() !== current.currency.toLowerCase()) {
    return false;
  }
  return next.amount <= current.amount;
}

// ─── Intent: tier + billing interval ───────────────────────────────────────

/**
 * What a plan change means to the customer, from tier and billing interval
 * (never from the per-charge amount, which is what Waffo compares):
 *
 * | from → to                                   | intent              | timing     |
 * |---------------------------------------------|---------------------|------------|
 * | same interval, higher tier                  | upgrade             | immediate  |
 * | lower-tier monthly → higher-tier yearly     | upgrade             | immediate  |
 * | same tier, monthly → yearly                 | interval_upgrade    | immediate  |
 * | same interval, lower tier                   | downgrade           | period end |
 * | higher-tier yearly → lower-tier monthly     | downgrade           | period end |
 * | same tier, yearly → monthly                 | interval_downgrade  | period end |
 * | higher-tier monthly → lower-tier yearly     | downgrade_to_yearly | period end |
 * | lower-tier yearly → higher-tier monthly     | upgrade_to_monthly  | period end, only after the customer chose it (choice) |
 *
 * upgrade_to_monthly is never deferred silently: the UI offers the higher
 * tier's yearly plan now (suggestedProductId) or the monthly plan from the
 * end of the paid year. There is no self-serve immediate switch to monthly
 * (the unused part of the year usually exceeds a month's charge).
 */
export type PlanChangeIntent =
  | 'upgrade'
  | 'interval_upgrade'
  | 'downgrade'
  | 'interval_downgrade'
  | 'downgrade_to_yearly'
  | 'upgrade_to_monthly';

export type PlanChangeClassification =
  | { intent: 'current' | 'not_applicable'; timing: null }
  | {
      intent: PlanChangeIntent;
      timing: 'immediate' | 'period_end';
      /** Customer must pick between suggestedProductId (now) and the target at period end. */
      requiresChoice: boolean;
      /** Recommended alternative: the target tier's yearly plan (upgrade_to_monthly). */
      suggestedProductId: string | null;
    };

/** Catalog subscription plan with this tier and interval (e.g. Pro yearly). */
export function findPlanByTierInterval(
  tier: number,
  interval: 'month' | 'year'
): PricingProduct | null {
  if (!tier) return null;
  return (
    listPricingProducts().find((p) => {
      const t = getSubscriptionTier(p.productId);
      return t.tier === tier && t.interval === interval;
    }) ?? null
  );
}

export function classifyPlanChange(
  currentProductId: string | null | undefined,
  targetProductId: string | null | undefined
): PlanChangeClassification {
  if (!currentProductId || !targetProductId) {
    return { intent: 'not_applicable', timing: null };
  }
  if (currentProductId === targetProductId) {
    return { intent: 'current', timing: null };
  }
  const from = getSubscriptionTier(currentProductId);
  const to = getSubscriptionTier(targetProductId);
  if (!from.tier || !to.tier || !from.interval || !to.interval) {
    return { intent: 'not_applicable', timing: null };
  }
  const plain = (
    intent: PlanChangeIntent,
    timing: 'immediate' | 'period_end'
  ): PlanChangeClassification => ({
    intent,
    timing,
    requiresChoice: false,
    suggestedProductId: null,
  });

  if (to.tier > from.tier) {
    if (from.interval === 'year' && to.interval === 'month') {
      const yearly = findPlanByTierInterval(to.tier, 'year');
      return {
        intent: 'upgrade_to_monthly',
        timing: 'period_end',
        requiresChoice: true,
        suggestedProductId: yearly?.productId ?? null,
      };
    }
    return plain('upgrade', 'immediate');
  }
  if (to.tier < from.tier) {
    if (from.interval === 'month' && to.interval === 'year') {
      return plain('downgrade_to_yearly', 'period_end');
    }
    return plain('downgrade', 'period_end');
  }
  if (from.interval === 'month' && to.interval === 'year') {
    return plain('interval_upgrade', 'immediate');
  }
  if (from.interval === 'year' && to.interval === 'month') {
    return plain('interval_downgrade', 'period_end');
  }
  return { intent: 'current', timing: null };
}

/** Waffo: an immediate change needs at least this long before the next charge. */
export const WAFFO_IMMEDIATE_MIN_LEAD_MS = 24 * 60 * 60 * 1000;
/** Waffo: a next-period change needs at least this long before the period ends. */
export const WAFFO_PERIOD_END_MIN_LEAD_MS = 60 * 60 * 1000;

/**
 * Waffo guards checked before asking for a change link (Waffo would answer
 * 400/409). Returns the blocking reason, or null.
 */
export function waffoPlanChangeBlock(
  sub: {
    status?: string | null;
    currentPeriodEnd?: Date | string | number | null;
    currency?: string | null;
  },
  target: PricingProduct,
  timing: 'immediate' | 'period_end',
  now = Date.now()
): 'trial' | 'too_close_to_renewal' | 'currency' | null {
  if (sub.status === 'trialing') return 'trial';
  if (sub.currency) {
    const next = resolvePricingAmount(target, sub.currency);
    if (next.currency.toLowerCase() !== sub.currency.toLowerCase()) {
      return 'currency';
    }
  }
  // A period end already in the past is stale local data: let Waffo decide.
  const end = time(sub.currentPeriodEnd);
  if (end !== null && end > now) {
    const lead =
      timing === 'immediate'
        ? WAFFO_IMMEDIATE_MIN_LEAD_MS
        : WAFFO_PERIOD_END_MIN_LEAD_MS;
    if (end - now < lead) return 'too_close_to_renewal';
  }
  return null;
}

/** Providers that keep the same subscription and switch its price at renewal. */
export const IN_PLACE_RENEWAL_SWITCH_PROVIDERS: readonly string[] = [
  'stripe',
  'dodo',
];

/** Statuses a newer subscription replaces (PENDING_CANCEL ends on its own). */
export const REPLACEABLE_SUBSCRIPTION_STATUSES = [
  'active',
  'trialing',
  'paused',
] as const;

/** Provider period dates drift by seconds/minutes between events. */
export const RENEWAL_SKEW_MS = 12 * 60 * 60 * 1000;

/**
 * A plan change restarted the billing cycle (Dodo prorated_immediately,
 * Stripe interval change…): the provider's new period starts after the old
 * one began AND well before the old one would have ended. A natural renewal
 * starts at the old period end, so it never matches.
 */
export const CYCLE_RESET_MIN_MS = 60 * 60 * 1000;

function toMs(value: Date | string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function isBillingCycleReset(params: {
  previousPeriodStart?: Date | string | number | null;
  previousPeriodEnd?: Date | string | number | null;
  periodStart?: Date | string | number | null;
}): boolean {
  const start = toMs(params.periodStart);
  const prevEnd = toMs(params.previousPeriodEnd);
  if (!start || !prevEnd) return false;
  const prevStart = toMs(params.previousPeriodStart);
  if (prevStart && start <= prevStart + CYCLE_RESET_MIN_MS) return false;
  return start + CYCLE_RESET_MIN_MS < prevEnd;
}

/**
 * Credits for a plan change that restarted the billing cycle, prorated the
 * same way the provider prorates the money (Stripe / Dodo
 * prorated_immediately: unused time of the old period, by the second):
 *
 *   new plan's full grant − old plan's grant × unused share of the old period
 *
 * rounded, never below 0. Credits already in the account are not touched.
 * Example: Lite 450 → Pro 1000 on day 2 of 30 → 1000 − 450 × 28/30 = 580.
 * Unknown old period start → whole old grant counts as unused (difference).
 */
export function proratedCycleResetCredits(params: {
  newCredits: number | null | undefined;
  oldCredits: number | null | undefined;
  previousPeriodStart?: Date | string | number | null;
  previousPeriodEnd?: Date | string | number | null;
  periodStart?: Date | string | number | null;
}): number {
  const next = Math.max(0, Number(params.newCredits) || 0);
  const prev = Math.max(0, Number(params.oldCredits) || 0);
  const start = toMs(params.previousPeriodStart);
  const end = toMs(params.previousPeriodEnd);
  const at = toMs(params.periodStart);
  let unused = 1;
  if (start && end > start && at) {
    unused = Math.min(1, Math.max(0, (end - at) / (end - start)));
  }
  return Math.max(0, Math.round(next - prev * unused));
}

/**
 * Credits for an upgrade that keeps the billing cycle (Stripe same-interval
 * proration, Creem…): the provider charges the price difference for the time
 * left, so the credit difference is prorated by the same share:
 *
 *   max(0, new − old) × (period end − change time) / (period end − period start)
 *
 * rounded. Example: Lite 450 → Pro 1000 on day 2 of 30 → 550 × 28/30 = 513.
 * Unknown period, or a change time outside it (stale local dates) → the full
 * difference, same fallback as proratedCycleResetCredits.
 */
export function proratedSameCycleCredits(params: {
  newCredits: number | null | undefined;
  oldCredits: number | null | undefined;
  periodStart?: Date | string | number | null;
  periodEnd?: Date | string | number | null;
  at?: Date | string | number | null;
}): number {
  const diff = Math.max(
    0,
    (Number(params.newCredits) || 0) - (Number(params.oldCredits) || 0)
  );
  const start = toMs(params.periodStart);
  const end = toMs(params.periodEnd);
  const at = toMs(params.at);
  let remaining = 1;
  if (start && end > start && at && at < end) {
    remaining = Math.min(1, (end - at) / (end - start));
  }
  return Math.max(0, Math.round(diff * remaining));
}

type SubLike = {
  subscriptionNo?: string | null;
  productId?: string | null;
  paymentProvider?: string | null;
  status?: string | null;
  canceledEndAt?: Date | string | number | null;
  currentPeriodStart?: Date | string | number | null;
  currentPeriodEnd?: Date | string | number | null;
  interval?: string | null;
  intervalCount?: number | null;
  canceledReasonType?: string | null;
  pendingProductId?: string | null;
  pendingEffectiveAt?: Date | string | number | null;
  pendingChangeType?: string | null;
  updatedAt?: Date | string | number | null;
};

/**
 * Local row was ended by a checkout replace (`cancelReplacedSubscriptions`).
 * Provider cancel is best-effort, so a late renewal/update can still arrive
 * for the old subscriptionId — those must not grant credits or revive status.
 */
export function isReplacedByPlanChange(sub: SubLike): boolean {
  if (sub.status === 'canceled') return true;
  return sub.canceledReasonType === 'plan_change';
}

/** Provider still reports a billable status after we locally ended a replace. */
export function shouldPreservePlanChangeCancel(
  local: SubLike,
  providerStatus?: string | null
): boolean {
  if (local.canceledReasonType !== 'plan_change') return false;
  if (local.status !== 'canceled' && local.status !== 'pending_cancel') {
    return false;
  }
  return (
    providerStatus === 'active' ||
    providerStatus === 'trialing' ||
    providerStatus === 'paused'
  );
}

/**
 * Billing cancel stays put against later provider updates. Waffo reports a
 * stale live status after a cancel, so only its `subscription.uncanceled`
 * (`resumed`, from in-app reactivate or the Waffo portal) lifts it.
 * Stripe/Dodo/Creem resume in-app / dashboard: a live status means the
 * customer resumed, and keeping the cancel would end access while they
 * keep charging.
 */
export function shouldKeepUserCancel(
  local: SubLike,
  provider: string,
  providerStatus?: string | null,
  { resumed = false }: { resumed?: boolean } = {}
): boolean {
  if (local.canceledReasonType !== 'user_request') return false;
  if (provider === 'waffo') return !resumed;
  return (
    providerStatus !== 'active' &&
    providerStatus !== 'trialing' &&
    providerStatus !== 'paused'
  );
}

function time(value?: Date | string | number | null): number | null {
  if (value === null || value === undefined || value === '') return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * How long an upgrade may wait on its payment before it stops blocking
 * cancel and other plan changes. Stripe discards an unpaid pending update
 * after at most 23 h; Dodo keeps a `prevent_change` change pending without
 * an expiry; a confirmed Waffo immediate upgrade or a Creem upgrade whose
 * new product never showed up has no deadline of its own. Past this the
 * local booking is dropped (a late payment webhook still applies the plan).
 */
export const PROCESSING_UPGRADE_TTL_MS = 24 * 60 * 60 * 1000;
const PROCESSING_UPGRADE_PROVIDERS = ['stripe', 'dodo', 'creem', 'waffo'];

/**
 * An upgrade still processing after this is overdue: billing asks the
 * provider for the result (Waffo / Creem / Dodo / Stripe) and the copy
 * offers a refresh.
 */
export const PROCESSING_UPGRADE_RECHECK_MS = 30 * 60 * 1000;

/** Providers whose processing upgrade can be looked up (status API). */
export const PROCESSING_UPGRADE_QUERY_PROVIDERS = [
  'waffo',
  'creem',
  'dodo',
  'stripe',
];

/**
 * When the processing upgrade was booked (last update of the row; booking
 * writes it, later writes only move it forward = a later recheck).
 */
export function processingUpgradeSince(sub: SubLike): number | null {
  if (sub.pendingChangeType !== PendingChangeType.UPGRADE) return null;
  if (!sub.pendingProductId) return null;
  return time(sub.updatedAt);
}

/**
 * Upgrade still waiting on its payment past its deadline: pendingEffectiveAt
 * (Stripe/Dodo/Creem bookings write one), else booked/last touched + TTL.
 * Waffo's pendingEffectiveAt is when the change takes effect, not a
 * deadline, so Waffo always uses the booking time.
 */
export function isStaleProcessingUpgrade(sub: SubLike, now = Date.now()) {
  if (sub.pendingChangeType !== PendingChangeType.UPGRADE) return false;
  if (!sub.pendingProductId) return false;
  if (!PROCESSING_UPGRADE_PROVIDERS.includes(sub.paymentProvider || '')) {
    return false;
  }
  const updated = time(sub.updatedAt);
  const fromBooking =
    updated === null ? null : updated + PROCESSING_UPGRADE_TTL_MS;
  const deadline =
    sub.paymentProvider === 'waffo'
      ? fromBooking
      : (time(sub.pendingEffectiveAt) ?? fromBooking);
  return deadline !== null && deadline <= now;
}

/** Cancel API error while an upgrade is still being applied. */
export const UPGRADE_IN_PROGRESS_CANCEL_ERROR =
  'Upgrade in progress. You can cancel once it completes.';

/**
 * Upgrade booked but not applied yet: a Stripe/Dodo/Creem upgrade waiting on
 * its payment, or a confirmed Waffo immediate upgrade not active yet.
 * Canceling now would leave that charge or new order running, so cancel
 * waits for it. A booking past its deadline (TTL) no longer counts.
 */
export function isUpgradeInProgress(sub: SubLike, now = Date.now()) {
  return (
    sub.pendingChangeType === PendingChangeType.UPGRADE &&
    !!sub.pendingProductId &&
    !isStaleProcessingUpgrade(sub, now)
  );
}

/** Upgrade still in progress PROCESSING_UPGRADE_RECHECK_MS after booking. */
export function isProcessingUpgradeOverdue(sub: SubLike, now = Date.now()) {
  if (!isUpgradeInProgress(sub, now)) return false;
  const since = processingUpgradeSince(sub);
  return since !== null && now - since >= PROCESSING_UPGRADE_RECHECK_MS;
}

/**
 * Ask the provider about this processing upgrade: overdue on page load, or
 * any time the customer / an admin presses refresh (`force`).
 */
export function shouldQueryProcessingUpgrade(
  sub: SubLike,
  { force = false, now = Date.now() }: { force?: boolean; now?: number } = {}
) {
  if (!PROCESSING_UPGRADE_QUERY_PROVIDERS.includes(sub.paymentProvider || '')) {
    return false;
  }
  return force
    ? isUpgradeInProgress(sub, now)
    : isProcessingUpgradeOverdue(sub, now);
}

/**
 * Canceled at period end and still running (its paid period not over).
 * No other subscription plan can be bought meanwhile: the customer resumes
 * it, or subscribes again once it ends.
 */
export function isSubscriptionEnding(
  sub: SubLike | null | undefined,
  now = Date.now()
) {
  return (
    !!sub &&
    sub.status === 'pending_cancel' &&
    !isPendingCancelExpired(sub, now)
  );
}

/**
 * Providers with a hosted customer portal (tinyship portal.ts): manage
 * payment method / invoices, cancel and resume there; webhooks sync back.
 */
export const CUSTOMER_PORTAL_PROVIDERS = ['stripe', 'creem', 'dodo', 'waffo'];

export function hasCustomerPortal(provider?: string | null) {
  return CUSTOMER_PORTAL_PROVIDERS.includes(provider || '');
}

/**
 * Providers whose scheduled cancel we undo through their API, in-app
 * (Stripe cancel_at_period_end=false, Dodo cancel_at_next_billing_date=false,
 * Creem POST /subscriptions/{id}/resume, Waffo issueSessionToken +
 * reactivateSubscription) — mirroring how billing cancels.
 * `subscription.uncanceled` remains a webhook fallback for Waffo.
 */
export const IN_APP_RESUME_PROVIDERS = ['stripe', 'dodo', 'creem', 'waffo'];

export type ResumeMode = 'in_app' | 'portal';

/**
 * How a canceling plan (pending_cancel, period not over) can be resumed;
 * null when it can't (not canceling, or ended by a plan change / refund).
 */
export function resumeMode(
  sub: SubLike | null | undefined,
  now = Date.now()
): ResumeMode | null {
  if (!sub || !isSubscriptionEnding(sub, now)) return null;
  if (
    sub.canceledReasonType === 'plan_change' ||
    sub.canceledReasonType === 'refund'
  ) {
    return null;
  }
  const provider = sub.paymentProvider || '';
  if (IN_APP_RESUME_PROVIDERS.includes(provider)) return 'in_app';
  if (hasCustomerPortal(provider)) return 'portal';
  return null;
}

/** A canceling plan the customer can resume (in-app or in the portal). */
export function canResumeSubscription(
  sub: SubLike | null | undefined,
  now = Date.now()
) {
  return resumeMode(sub, now) !== null;
}

/** Canceling and resumable only in the provider portal (legacy path). */
export function canResumeInPortal(
  sub: SubLike | null | undefined,
  now = Date.now()
) {
  return resumeMode(sub, now) === 'portal';
}

/**
 * Paying for `product` is blocked because the current plan is ending:
 * every other subscription plan (upgrade, interval switch, downgrade).
 * Credit packs stay buyable; the same plan is handled as "current".
 */
export function isPlanPurchaseBlockedByEnding(
  product: PricingProduct,
  sub: SubLike | null | undefined,
  now = Date.now()
) {
  if (!isSubscriptionEnding(sub, now)) return false;
  const action = resolvePricingPlanAction(product, sub?.productId);
  return action !== 'buy' && action !== 'current';
}

/** PENDING_CANCEL whose paid period is over (webhook lost / PayPal local cancel). */
export function isPendingCancelExpired(sub: SubLike, now = Date.now()) {
  if (sub.status !== 'pending_cancel') return false;
  const end = effectiveCancelEndAt(sub, now);
  // No usable end → keep showing as ending (same as canceledEndAt null before).
  if (!end) return false;
  return end.getTime() <= now;
}

/** True when a booked in-place downgrade is due for a period starting at `periodStart`. */
export function isPendingChangeDue(
  sub: SubLike,
  periodStart: Date | string | number
): boolean {
  if (sub.pendingChangeType !== PendingChangeType.DOWNGRADE) return false;
  if (!sub.pendingProductId) return false;
  if (!IN_PLACE_RENEWAL_SWITCH_PROVIDERS.includes(sub.paymentProvider || '')) {
    return false;
  }
  const effective = time(sub.pendingEffectiveAt);
  const start = time(periodStart);
  if (effective === null || start === null) return false;
  return effective - RENEWAL_SKEW_MS <= start;
}

/**
 * Providers whose booked period-end change becomes a new subscription order
 * (Waffo `subscription.plan_changed`) that can be looked up when that webhook
 * is late or lost. Stripe/Dodo switch in place on the renewal payment, whose
 * webhook also carries the credits, so a status read cannot stand in for it.
 */
export const SCHEDULED_CHANGE_QUERY_PROVIDERS: readonly string[] = ['waffo'];

/** Booked period-end downgrade on a provider that books it as a new order. */
function scheduledChangeEffectiveAt(sub: SubLike): number | null {
  if (sub.pendingChangeType !== PendingChangeType.DOWNGRADE) return null;
  if (!sub.pendingProductId) return null;
  if (!SCHEDULED_CHANGE_QUERY_PROVIDERS.includes(sub.paymentProvider || '')) {
    return null;
  }
  return time(sub.pendingEffectiveAt) ?? time(sub.currentPeriodEnd);
}

/**
 * Booked period-end change whose effective time has passed but is still
 * pending locally (its webhook has not landed): billing asks the provider.
 */
export function isScheduledChangeOverdue(sub: SubLike, now = Date.now()) {
  const effective = scheduledChangeEffectiveAt(sub);
  return effective !== null && effective <= now;
}

/**
 * Providers asked about a subscription still on an ended period:
 * - a lost renewal webhook is read back (Stripe paid invoices, Dodo
 *   subscription + payments, Waffo payments of the order) and replayed
 *   through the renewal handler with the webhook's own dedupe key;
 * - a lost cancel / expire webhook is read from the subscription itself
 *   (getSubscription) and applied like that webhook.
 * Creem renewals are not replayed (no renewal lookup), only its end.
 */
export const RENEWAL_QUERY_PROVIDERS: readonly string[] = [
  'stripe',
  'dodo',
  'creem',
  'waffo',
];

/** How long after the period end billing waits before asking. */
export const RENEWAL_LAPSE_GRACE_MS = 60 * 60 * 1000;

/**
 * A live subscription still on a period that ended more than `graceMs` ago:
 * its renewal webhook is late or lost. Ending subscriptions (pending_cancel)
 * are not expected to renew.
 */
export function isRenewalLapsed(
  sub: SubLike & { subscriptionId?: string | null },
  now = Date.now(),
  graceMs = RENEWAL_LAPSE_GRACE_MS
) {
  if (!RENEWAL_QUERY_PROVIDERS.includes(sub.paymentProvider || '')) {
    return false;
  }
  if (sub.status !== 'active' && sub.status !== 'trialing') return false;
  if (!sub.subscriptionId) return false;
  const end = time(sub.currentPeriodEnd);
  return end !== null && end + graceMs <= now;
}

/**
 * A renewal of the old subscription for the period a booked change (new
 * provider order) takes over: that period belongs to the new plan, so the
 * renewal must not grant another period of the old plan.
 */
export function isRenewalCoveredByScheduledChange(
  sub: SubLike,
  periodStart: Date | string | number
): boolean {
  const effective = scheduledChangeEffectiveAt(sub);
  const start = time(periodStart);
  if (effective === null || start === null) return false;
  return effective - RENEWAL_SKEW_MS <= start;
}

/**
 * Which catalog plan a renewal is billed under.
 * - The plan the provider reports (mapped to a catalog id) wins.
 * - Without one, a booked downgrade that is due applies.
 * So the renewal grants the right credits whichever of
 * `subscription.updated` / `payment_succeeded` arrives first.
 */
export function resolveRenewalProductId(input: {
  sub: SubLike;
  reportedCatalogId?: string | null;
  periodStart: Date | string | number;
}): { productId: string | null; changed: boolean; clearPending: boolean } {
  const { sub, reportedCatalogId, periodStart } = input;
  const current = sub.productId || null;
  if (reportedCatalogId) {
    return {
      productId: reportedCatalogId,
      changed: reportedCatalogId !== current,
      clearPending:
        !!sub.pendingProductId && reportedCatalogId === sub.pendingProductId,
    };
  }
  if (isPendingChangeDue(sub, periodStart)) {
    return {
      productId: sub.pendingProductId!,
      changed: sub.pendingProductId !== current,
      clearPending: true,
    };
  }
  return { productId: current, changed: false, clearPending: false };
}

/**
 * What to do with an older subscription when a newer one was paid
 * (checkout fallback path). A lower new plan (e.g. an old checkout session
 * paid late) must not end the higher plan early: cancel it at period end.
 */
export function replacedSubscriptionAction(
  keepProductId?: string | null,
  otherProductId?: string | null
): 'cancel_now' | 'cancel_at_period_end' {
  const keep = keepProductId ? getPricingProduct(keepProductId) : null;
  if (!keep || !otherProductId) return 'cancel_now';
  // Same matrix as in-place changes: anything that would only take effect
  // at period end (downgrades, and a paid yearly plan → higher monthly plan)
  // keeps the older plan until its paid period is over.
  const change = classifyPlanChange(otherProductId, keep.productId);
  if (change.timing === 'period_end') return 'cancel_at_period_end';
  if (change.timing === 'immediate') return 'cancel_now';
  return resolvePricingPlanAction(keep, otherProductId) === 'downgrade'
    ? 'cancel_at_period_end'
    : 'cancel_now';
}

/** Subscription columns that follow the catalog plan. */
export function planFieldsFor(productId: string) {
  const product = getPricingProduct(productId);
  if (!product) return null;
  return {
    productId: product.productId,
    planName: product.planName,
    productName: product.productName,
    creditsAmount: product.credits,
    creditsValidDays: product.creditsValidDays ?? null,
    amount: product.priceInCents,
    currency: product.currency,
    interval: product.plan?.interval ?? null,
    intervalCount: product.plan?.intervalCount ?? null,
  };
}

export const CLEARED_PENDING_CHANGE = {
  pendingProductId: null,
  pendingEffectiveAt: null,
  pendingChangeType: null,
  providerScheduleId: null,
} as const;

/** Button kind for a plan card relative to the current subscription. */
export function planCardAction(
  action: PricingPlanAction,
  hasSubscription: boolean
): 'checkout' | 'change' | 'none' {
  if (action === 'current' || action === 'buy') {
    return action === 'buy' ? 'checkout' : 'none';
  }
  if (!hasSubscription || action === 'subscribe') return 'checkout';
  return 'change';
}

// ─── Waffo: hosted confirmation ────────────────────────────────────────────

/** Marker stored in order.checkoutInfo for Waffo plan-change orders. */
export type WaffoPlanChangeMarker = {
  fromSubscriptionNo: string;
  timing: 'immediate' | 'period_end';
  /** A newer attempt or "discard" replaced this order (status canceled). */
  superseded?: boolean;
  /** Waffo confirmed it (webhook or reconciliation): new provider order. */
  confirmedOrderId?: string;
  confirmedAt?: string;
  /** Waffo reported plan_change_failed for it. */
  failed?: boolean;
};

/** Waffo order Short ID (ORD_xxx); our own order numbers have no "_". */
export function isWaffoOrderId(value?: string | null): boolean {
  return typeof value === 'string' && /^ORD_[0-9A-Za-z]+$/.test(value);
}

/**
 * providerScheduleId of a confirmed Waffo change whose new order id Waffo
 * did not expose (confirmed via the origin turning `canceling`).
 */
export const WAFFO_CONFIRMED_PREFIX = 'waffo_confirmed:';

/** Booking written after Waffo confirmed the change. */
export function isConfirmedWaffoScheduleId(value?: string | null): boolean {
  return (
    isWaffoOrderId(value) ||
    (typeof value === 'string' && value.startsWith(WAFFO_CONFIRMED_PREFIX))
  );
}

/** Unconfirmed Waffo plan-change sessions older than this are ignored. */
export const WAFFO_CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;

export type PlanChangeOrderLike = {
  id: string;
  orderNo: string;
  productId?: string | null;
  planName?: string | null;
  status?: string | null;
  createdAt?: Date | string | number | null;
  checkoutInfo?: string | null;
};

export function parseWaffoPlanChangeMarker(
  checkoutInfo?: string | null
): WaffoPlanChangeMarker | null {
  try {
    const marker = JSON.parse(checkoutInfo || '{}')?.planChange;
    return marker && typeof marker.fromSubscriptionNo === 'string'
      ? (marker as WaffoPlanChangeMarker)
      : null;
  } catch {
    return null;
  }
}

/** Plan-change orders of one subscription inside the TTL, newest first. */
export function recentWaffoPlanChangeOrders<T extends PlanChangeOrderLike>(
  orders: T[],
  subscriptionNo: string,
  now = Date.now()
): T[] {
  return orders
    .filter((o) => {
      const marker = parseWaffoPlanChangeMarker(o.checkoutInfo);
      const created = time(o.createdAt);
      return (
        marker?.fromSubscriptionNo === subscriptionNo &&
        created !== null &&
        now - created <= WAFFO_CONFIRM_TTL_MS
      );
    })
    .sort((a, b) => (time(b.createdAt) ?? 0) - (time(a.createdAt) ?? 0));
}

/**
 * The plan change the customer opened on Waffo but has not confirmed yet
 * (latest live created order). None once a booking exists or the plan is
 * already ending.
 */
export function pickAwaitingWaffoPlanChange<T extends PlanChangeOrderLike>(
  orders: T[],
  sub: SubLike & { subscriptionNo: string },
  now = Date.now()
): T | null {
  if (sub.paymentProvider !== 'waffo') return null;
  if (sub.pendingProductId || sub.status === 'pending_cancel') return null;
  return (
    recentWaffoPlanChangeOrders(orders, sub.subscriptionNo, now).find(
      (o) =>
        o.status === 'created' &&
        // confirmed on Waffo: no longer waiting for the customer
        !parseWaffoPlanChangeMarker(o.checkoutInfo)?.confirmedOrderId
    ) ?? null
  );
}

/**
 * Which period-end order Waffo just confirmed (origin subscription turned
 * canceling): the latest live one, else the latest superseded one (the
 * customer confirmed an older tab after reopening or discarding).
 */
export function pickConfirmedWaffoPlanChange<T extends PlanChangeOrderLike>(
  orders: T[],
  subscriptionNo: string,
  now = Date.now()
): T | null {
  const recent = recentWaffoPlanChangeOrders(
    orders,
    subscriptionNo,
    now
  ).filter(
    (o) => parseWaffoPlanChangeMarker(o.checkoutInfo)?.timing === 'period_end'
  );
  return (
    recent.find((o) => o.status === 'created') ??
    recent.find(
      (o) =>
        o.status === 'canceled' &&
        parseWaffoPlanChangeMarker(o.checkoutInfo)?.superseded
    ) ??
    null
  );
}

/**
 * Waffo booking written before the customer confirmed (older builds wrote
 * pending_* when the confirm link was opened, with our own order number as
 * providerScheduleId). A confirmed booking carries Waffo's new order id
 * (ORD_xxx) — or, from the legacy path, a PENDING_CANCEL origin.
 */
export function isUnconfirmedWaffoBooking(
  sub: SubLike & { providerScheduleId?: string | null }
): boolean {
  return (
    sub.paymentProvider === 'waffo' &&
    sub.pendingChangeType === PendingChangeType.DOWNGRADE &&
    !!sub.pendingProductId &&
    sub.status !== 'pending_cancel' &&
    !isConfirmedWaffoScheduleId(sub.providerScheduleId)
  );
}

/**
 * Local plan-change orders worth asking Waffo about: recent ones of this
 * subscription that are still open or were superseded (the customer may
 * confirm an older tab), never failed ones. Newest first, at most `limit`.
 */
export function waffoPlanChangeCandidates<T extends PlanChangeOrderLike>(
  orders: T[],
  subscriptionNo: string,
  limit = 3,
  now = Date.now()
): T[] {
  return recentWaffoPlanChangeOrders(orders, subscriptionNo, now)
    .filter((o) => {
      const marker = parseWaffoPlanChangeMarker(o.checkoutInfo);
      if (marker?.failed) return false;
      return (
        o.status === 'created' ||
        (o.status === 'canceled' && !!marker?.superseded)
      );
    })
    .slice(0, limit);
}
