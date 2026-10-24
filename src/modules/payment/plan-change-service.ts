/**
 * User-initiated plan changes on an existing subscription
 * (POST /api/user/subscriptions/change and /change/cancel).
 *
 * | provider | upgrade (now, prorated)        | downgrade (period end)              | undo |
 * |----------|--------------------------------|-------------------------------------|------|
 * | stripe   | subscriptions.update           | Subscription Schedule (2nd phase)   | yes  |
 * | dodo     | change-plan immediately        | change-plan next_billing_date       | yes  |
 * | waffo    | hosted confirm page            | hosted confirm page (next_period)   | no   |
 * (Waffo books nothing until the customer confirms; until then the change is
 * "awaiting confirmation" and can be reopened or discarded.)
 * | creem    | /upgrade                       | scheduled cancel → resubscribe      | no   |
 * Timing comes from classifyPlanChange (tier + interval); lower-tier yearly →
 * higher-tier monthly needs the customer's explicit choice (acceptPeriodEnd).
 * | others   | checkout fallback              | not supported                       | —    |
 */
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { effectiveCancelEndAt, isStalePeriodEnd } from '@/core/payment/period';
import { PaymentType, type PaymentProvider } from '@/core/payment/types';
import { order, subscription } from '@/config/db/schema';
import {
  getPricingProduct,
  parseProductIdsMapping,
  resolveMappedProviderProductId,
} from '@/config/pricing';
import { getAllConfigs } from '@/modules/config/service';
import {
  findBySubscriptionNo,
  getCurrentSubscription,
  SubscriptionStatus,
  updateBySubscriptionNo,
} from '@/modules/subscriptions/service';
import { getUniSeq, getUuid } from '@/lib/hash';
import { WAFFO_PLAN_CHANGE_ERROR_PATTERNS } from '@/lib/safe-error-message';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

import { stripUrlFragment, withoutCustomerToken } from './checkout-storage';
import {
  classifyPlanChange,
  CLEARED_PENDING_CHANGE,
  isRenewalLapsed,
  isScheduledChangeOverdue,
  isStaleProcessingUpgrade,
  isUnconfirmedWaffoBooking,
  isUpgradeInProgress,
  parseWaffoPlanChangeMarker,
  PendingChangeType,
  pickAwaitingWaffoPlanChange,
  planChangeSupport,
  PROCESSING_UPGRADE_TTL_MS,
  recentWaffoPlanChangeOrders,
  WAFFO_CONFIRMED_PREFIX,
  waffoChangeMustWaitForPeriodEnd,
  waffoPlanChangeBlock,
  waffoPlanChangeCandidates,
  type PlanChangeIntent,
  type PlanChangeOrderLike,
  type WaffoPlanChangeMarker,
} from './plan-change';
import {
  syncLapsedRenewal,
  syncProcessingUpgrade,
  syncScheduledPlanChange,
} from './processing-upgrade-sync';
import { applySubscriptionPlan, getPaymentManager } from './service';
import {
  listRecentWaffoPlanChangeOrders,
  markWaffoPlanChangeOrdersSuperseded,
  updateWaffoPlanChangeMarker,
} from './waffo-plan-change';
import { applyWaffoPlanChangeOutcome } from './waffo-plan-change-outcome';

/** API error with a machine-readable code (respJson data.code). */
export class PlanChangeError extends Error {
  constructor(
    public code: string,
    message: string,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PlanChangeError';
  }
}

// Mapped to localized copy in src/lib/api-error-message.ts.
export const PLAN_CHANGE_ERRORS = {
  pending: 'A plan change is already scheduled. Undo it first.',
  pendingLocked:
    'A plan change is already scheduled and cannot be undone. It takes effect at the end of the current period.',
  endingSoon:
    'Your current plan is ending. You can subscribe to a lower plan after it ends.',
  subscriptionEnding:
    'Your current plan is canceled and ends at the end of this period. You can subscribe to another plan after it ends.',
  unsupported: 'Plan changes are not supported for this payment method.',
  notUndoable: 'This plan change cannot be undone.',
  nothingPending: 'No scheduled plan change.',
  samePlan: 'You already have this plan. Manage it in Billing.',
  mapping: 'Payment product mapping not configured',
  useChange: 'Downgrades are scheduled from the pricing page.',
  notActive:
    'This subscription already has a plan change or cancellation in progress at the payment provider. Check Billing for its status.',
  choiceRequired:
    'Choose how to switch: upgrade to the yearly plan now, or switch to the monthly plan when your current yearly period ends.',
  trial: 'Plan changes are not available during a trial.',
  tooCloseToRenewal:
    'Your plan renews within 24 hours. Please try again after the renewal.',
  currency: 'The new plan is billed in a different currency.',
  previousIncomplete:
    'Your last upgrade did not complete. You can upgrade again.',
} as const;

export type PlanChangeOutcome =
  /** No in-place change possible: continue with /api/payment/checkout. */
  | { mode: 'checkout' }
  | { mode: 'applied'; intent?: PlanChangeIntent }
  | { mode: 'processing'; intent?: PlanChangeIntent }
  | {
      mode: 'scheduled';
      kind: 'switch' | 'resubscribe';
      effective_at: string | null;
      intent?: PlanChangeIntent;
    }
  | {
      mode: 'confirm';
      confirm_url: string;
      timing: 'immediate' | 'period_end';
      /** period_end: when the switch is expected (current period end). */
      effective_at?: string | null;
      intent?: PlanChangeIntent;
    };

/** Provider product id (Stripe: Price id) for a catalog plan, or null. */
function providerProductIdFor(
  provider: string,
  catalogId: string,
  configs: Record<string, string>
): string | null {
  const key =
    provider === 'stripe'
      ? 'stripe_price_ids_mapping'
      : `${provider}_product_ids_mapping`;
  const mapped = resolveMappedProviderProductId(
    parseProductIdsMapping(configs[key]),
    catalogId
  );
  return mapped && mapped !== catalogId ? mapped : null;
}

function iso(value?: Date | string | number | null): string | null {
  if (value === null || value === undefined) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function changeUserSubscriptionPlan(params: {
  userId: string;
  userEmail?: string | null;
  productId: string;
  locale?: string | null;
  /**
   * The customer explicitly chose "switch at the end of the current period"
   * for a change that needs a choice (lower-tier yearly → higher-tier monthly).
   */
  acceptPeriodEnd?: boolean;
}): Promise<PlanChangeOutcome> {
  const product = getPricingProduct(params.productId);
  if (!product || product.type !== PaymentType.SUBSCRIPTION) {
    throw new PlanChangeError('unknown_product', 'Unknown product');
  }

  // Independent reads: run together (each is a DB round trip; on D1 the
  // config read is never cached).
  const [current, configs] = await Promise.all([
    getCurrentSubscription(params.userId),
    getAllConfigs(),
  ]);
  if (!current) return { mode: 'checkout' };
  if (current.userId !== params.userId) {
    throw new PlanChangeError('forbidden', 'Forbidden');
  }
  let sub = await clearStaleProcessingUpgrade(
    await healUnconfirmedWaffoBooking(current)
  );

  // Waffo: a change opened earlier may already be confirmed on Waffo's page
  // while its webhook never arrived (localhost, lost delivery). Waffo then
  // keeps the origin in `canceling` and rejects any new change with 409
  // ("Only an active subscription can change plan"). Ask Waffo first and
  // record the booking, so the customer sees the scheduled change instead.
  if (sub.paymentProvider === 'waffo' && !sub.pendingProductId) {
    const reconciled = await reconcileAwaitingWaffoChange(params.userId, sub);
    if (reconciled) sub = reconciled;
  }

  // Intent from tier + interval (see classifyPlanChange for the matrix).
  const change = classifyPlanChange(sub.productId, product.productId);
  if (change.intent === 'current') {
    throw new PlanChangeError('current_plan', PLAN_CHANGE_ERRORS.samePlan);
  }
  if (change.timing === null) return { mode: 'checkout' };
  const intent = change.intent;
  let timing = change.timing;

  // Only a real (confirmed) booking blocks; a Waffo change that is merely
  // awaiting confirmation is replaced by the new attempt below.
  if (sub.pendingProductId) {
    throw new PlanChangeError('plan_change_pending', pendingErrorFor(sub), {
      pending_product_id: sub.pendingProductId,
      effective_at: iso(sub.pendingEffectiveAt),
    });
  }
  if (sub.status === SubscriptionStatus.PENDING_CANCEL) {
    // Already ending: no other plan until it ends (no second subscription
    // next to the canceled one; resume comes first).
    if (timing === 'immediate') {
      throw new PlanChangeError(
        'subscription_ending',
        PLAN_CHANGE_ERRORS.subscriptionEnding,
        { ends_at: iso(sub.canceledEndAt || sub.currentPeriodEnd) }
      );
    }
    throw new PlanChangeError(
      'downgrade_after_period_end',
      PLAN_CHANGE_ERRORS.endingSoon,
      { ends_at: iso(sub.canceledEndAt || sub.currentPeriodEnd) }
    );
  }

  const support = planChangeSupport(sub.paymentProvider);

  // No plan change during a trial on any provider: Waffo rejects it (409),
  // Stripe would keep the trial and grant the upgrade credits for free, Dodo
  // ends the trial and charges at once.
  if (sub.status === SubscriptionStatus.TRIALING) {
    throw new PlanChangeError('plan_change_trial', PLAN_CHANGE_ERRORS.trial);
  }

  // Lower-tier yearly → higher-tier monthly: never deferred silently. The
  // customer picks "yearly plan now" (suggested) or "monthly at period end".
  if (change.requiresChoice && !params.acceptPeriodEnd) {
    throw new PlanChangeError(
      'plan_change_choice_required',
      PLAN_CHANGE_ERRORS.choiceRequired,
      {
        intent,
        effective_at: iso(sub.currentPeriodEnd),
        suggested_product_id: change.suggestedProductId,
        period_end_supported: support.periodEnd !== 'unsupported',
      }
    );
  }

  // Backstop: Waffo only applies a change immediately when the new plan
  // charges more per period than the current one; otherwise book it for
  // period end (see helper). The intent matrix above already avoids this
  // for the catalog plans.
  if (
    timing === 'immediate' &&
    sub.paymentProvider === 'waffo' &&
    waffoChangeMustWaitForPeriodEnd(sub, product)
  ) {
    timing = 'period_end';
  }

  // Waffo answers these with 400/409 before the customer sees a page.
  if (sub.paymentProvider === 'waffo') {
    const block = waffoPlanChangeBlock(sub, product, timing);
    if (block === 'trial') {
      throw new PlanChangeError('plan_change_trial', PLAN_CHANGE_ERRORS.trial);
    }
    if (block === 'currency') {
      throw new PlanChangeError(
        'plan_change_currency',
        PLAN_CHANGE_ERRORS.currency
      );
    }
    if (block === 'too_close_to_renewal') {
      throw new PlanChangeError(
        'plan_change_too_close_to_renewal',
        PLAN_CHANGE_ERRORS.tooCloseToRenewal,
        { renews_at: iso(sub.currentPeriodEnd) }
      );
    }
  }

  const pm = await getPaymentManager(configs);
  const provider = pm.getProvider(sub.paymentProvider);
  // getProvider falls back to the default provider for unknown names.
  const sameProvider = provider?.name === sub.paymentProvider;
  const providerProductId = providerProductIdFor(
    sub.paymentProvider,
    product.productId,
    configs
  );

  if (timing === 'immediate') {
    if (
      support.immediate === 'checkout' ||
      !sameProvider ||
      !provider?.changeSubscriptionPlan ||
      !providerProductId
    ) {
      return { mode: 'checkout' };
    }
    if (support.immediate === 'confirm') {
      return openConfirmPlanChange({
        sub,
        provider,
        productId: product.productId,
        providerProductId,
        timing,
        intent,
        locale: params.locale,
        userEmail: params.userEmail,
        configs,
      });
    }
    const result = await provider.changeSubscriptionPlan({
      subscriptionId: sub.subscriptionId,
      productId: providerProductId,
      timing,
      customer: { id: params.userId, email: params.userEmail || undefined },
      currency: sub.currency || product.currency,
      locale: params.locale || undefined,
    });
    // Dodo 409: the earlier upgrade's payment failed. Nothing is booked
    // locally (a booking would have blocked above), so the customer retries.
    if (result.status === 'failed') {
      throw new PlanChangeError(
        'plan_change_previous_incomplete',
        PLAN_CHANGE_ERRORS.previousIncomplete
      );
    }
    // Payment not confirmed yet (Dodo product still the old one, Stripe
    // pending_if_incomplete). Book it like a Waffo confirm so billing shows
    // "changes to {plan} on {date}" until the webhook applies the plan.
    if (result.status !== 'applied') {
      // Immediate: it applies once the payment confirms, not at period end.
      // Not shown; past it an unpaid upgrade counts as dropped
      // (isStaleProcessingUpgrade) and stops blocking plan changes.
      const effectiveAt =
        result.effectiveAt || new Date(Date.now() + PROCESSING_UPGRADE_TTL_MS);
      await updateBySubscriptionNo(sub.subscriptionNo, {
        pendingProductId: product.productId,
        pendingEffectiveAt: effectiveAt,
        pendingChangeType: PendingChangeType.UPGRADE,
        providerScheduleId: result.scheduleId || null,
      });
      return { mode: 'processing', intent };
    }
    const info = result.subscriptionInfo;
    const hasPeriod = !!(info?.currentPeriodStart && info?.currentPeriodEnd);
    // Period is written with the plan (same claim) so a cycle restart grants
    // the new plan's full credits instead of the difference.
    await applySubscriptionPlan({
      subscriptionNo: sub.subscriptionNo,
      productId: product.productId,
      currentPeriodStart: hasPeriod ? info!.currentPeriodStart : null,
      currentPeriodEnd: hasPeriod ? info!.currentPeriodEnd : null,
      previousPeriodStart: sub.currentPeriodStart,
      previousPeriodEnd: sub.currentPeriodEnd,
    });
    if (hasPeriod) {
      // A webhook may have applied the plan first; keep the dates current.
      await updateBySubscriptionNo(sub.subscriptionNo, {
        currentPeriodStart: info!.currentPeriodStart,
        currentPeriodEnd: info!.currentPeriodEnd,
      });
    }
    return { mode: 'applied', intent };
  }

  // ── period end ──
  if (support.periodEnd === 'unsupported' || !sameProvider || !provider) {
    throw new PlanChangeError('unsupported', PLAN_CHANGE_ERRORS.unsupported);
  }

  if (support.periodEnd === 'cancel_then_resubscribe') {
    // Creem cannot switch at period end: end the current plan then, and
    // offer the lower plan once it has ended (a gap is accepted).
    if (!provider.cancelSubscription) {
      throw new PlanChangeError('unsupported', PLAN_CHANGE_ERRORS.unsupported);
    }
    const canceled = await provider.cancelSubscription({
      subscriptionId: sub.subscriptionId,
    });
    const info = canceled.subscriptionInfo;
    const endsAt = effectiveCancelEndAt({
      canceledEndAt: info?.canceledEndAt,
      currentPeriodEnd: info?.currentPeriodEnd || sub.currentPeriodEnd,
      currentPeriodStart: sub.currentPeriodStart,
      interval: sub.interval,
      intervalCount: sub.intervalCount,
    });
    await updateBySubscriptionNo(sub.subscriptionNo, {
      status: info?.status || SubscriptionStatus.PENDING_CANCEL,
      canceledAt: info?.canceledAt || new Date(),
      canceledEndAt: endsAt,
      canceledReason: 'Downgrade: plan ends at period end',
      canceledReasonType: 'plan_change',
      pendingProductId: product.productId,
      pendingEffectiveAt: endsAt,
      pendingChangeType: PendingChangeType.RESUBSCRIBE,
      providerScheduleId: null,
    });
    return {
      mode: 'scheduled',
      kind: 'resubscribe',
      effective_at: iso(endsAt),
      intent,
    };
  }

  if (!providerProductId) {
    throw new PlanChangeError('mapping_missing', PLAN_CHANGE_ERRORS.mapping);
  }
  if (support.periodEnd === 'confirm') {
    return openConfirmPlanChange({
      sub,
      provider,
      productId: product.productId,
      providerProductId,
      timing,
      intent,
      locale: params.locale,
      userEmail: params.userEmail,
      configs,
    });
  }
  if (!provider.changeSubscriptionPlan) {
    throw new PlanChangeError('unsupported', PLAN_CHANGE_ERRORS.unsupported);
  }
  const result = await provider.changeSubscriptionPlan({
    subscriptionId: sub.subscriptionId,
    productId: providerProductId,
    timing,
    customer: { id: params.userId, email: params.userEmail || undefined },
    metadata: { subscription_no: sub.subscriptionNo },
  });
  const effectiveAt = result.effectiveAt || sub.currentPeriodEnd || null;
  await updateBySubscriptionNo(sub.subscriptionNo, {
    pendingProductId: product.productId,
    pendingEffectiveAt: effectiveAt,
    pendingChangeType: PendingChangeType.DOWNGRADE,
    providerScheduleId: result.scheduleId || null,
  });
  return {
    mode: 'scheduled',
    kind: 'switch',
    effective_at: iso(effectiveAt),
    intent,
  };
}

/**
 * Waffo change awaiting confirmation → ask Waffo whether it was confirmed
 * (same path as the billing page sync). Returns the fresh subscription when
 * a booking was recorded, else null. Never throws: a failed lookup just
 * leaves the normal flow (and the 409 mapping below) in charge.
 */
async function reconcileAwaitingWaffoChange<
  T extends {
    userId: string;
    subscriptionNo: string;
    paymentProvider?: string | null;
    status?: string | null;
    pendingProductId?: string | null;
  },
>(userId: string, sub: T): Promise<T | null> {
  try {
    if (!(await getAwaitingConfirmation(sub))) return null;
    const { view, sync } = await syncAwaitingPlanChange(userId);
    if (sync !== 'confirmed' || !view?.pendingProductId) return null;
    return { ...sub, ...view };
  } catch (error) {
    console.error('[payment] waffo plan change reconcile failed', error);
    return null;
  }
}

/** Waffo 409: the origin subscription is no longer `active` on Waffo. */
export const WAFFO_NOT_ACTIVE_PATTERN =
  WAFFO_PLAN_CHANGE_ERROR_PATTERNS.notActive;

/** Message for "a booking already exists" (undoable or not). */
export function pendingErrorFor(sub: {
  paymentProvider?: string | null;
  pendingChangeType?: string | null;
}): string {
  return sub.pendingChangeType === PendingChangeType.DOWNGRADE &&
    planChangeSupport(sub.paymentProvider).undo
    ? PLAN_CHANGE_ERRORS.pending
    : PLAN_CHANGE_ERRORS.pendingLocked;
}

/**
 * Older builds booked Waffo downgrades when the confirm link was opened.
 * Such a row (not PENDING_CANCEL = never confirmed) is cleared so it shows
 * as "awaiting confirmation" instead of a booking that blocks everything.
 */
export async function healUnconfirmedWaffoBooking<
  T extends {
    subscriptionNo: string;
    paymentProvider?: string | null;
    status?: string | null;
    pendingProductId?: string | null;
    pendingChangeType?: string | null;
    providerScheduleId?: string | null;
  },
>(sub: T): Promise<T> {
  if (!isUnconfirmedWaffoBooking(sub)) return sub;
  await updateBySubscriptionNo(sub.subscriptionNo, CLEARED_PENDING_CHANGE);
  return { ...sub, ...CLEARED_PENDING_CHANGE };
}

/**
 * A Stripe/Dodo upgrade whose payment never completed (Stripe expired the
 * pending update, or the customer never paid): drop the booking so billing
 * stops showing it and it no longer blocks plan changes.
 */
export async function clearStaleProcessingUpgrade<
  T extends {
    subscriptionNo: string;
    paymentProvider?: string | null;
    pendingProductId?: string | null;
    pendingChangeType?: string | null;
    pendingEffectiveAt?: Date | string | null;
    updatedAt?: Date | string | null;
  },
>(sub: T): Promise<T> {
  if (!isStaleProcessingUpgrade(sub)) return sub;
  await updateBySubscriptionNo(sub.subscriptionNo, CLEARED_PENDING_CHANGE);
  return { ...sub, ...CLEARED_PENDING_CHANGE };
}

/** Unconfirmed (status created) plan-change orders of one subscription. */
function awaitingOrdersOf<T extends PlanChangeOrderLike>(
  orders: T[],
  subscriptionNo: string
): T[] {
  return orders.filter(
    (o) =>
      o.status === 'created' &&
      parseWaffoPlanChangeMarker(o.checkoutInfo)?.fromSubscriptionNo ===
        subscriptionNo
  );
}

/** Supersede this subscription's unconfirmed Waffo plan-change orders. */
async function supersedeAwaitingWaffoPlanChanges(
  sub: { userId: string; subscriptionNo: string },
  preloaded?: Promise<PlanChangeOrderLike[]>
) {
  const orders = await (preloaded ??
    listRecentWaffoPlanChangeOrders(sub.userId));
  await markWaffoPlanChangeOrdersSuperseded(
    awaitingOrdersOf(orders, sub.subscriptionNo)
  );
}

export type AwaitingConfirmation = {
  product_id: string;
  plan_name: string | null;
  timing: 'immediate' | 'period_end';
  order_no: string;
  created_at: string | null;
};

/** Waffo change opened but not confirmed yet (null for other providers). */
export async function getAwaitingConfirmation(sub: {
  userId: string;
  subscriptionNo: string;
  paymentProvider?: string | null;
  status?: string | null;
  pendingProductId?: string | null;
}): Promise<AwaitingConfirmation | null> {
  if (sub.paymentProvider !== 'waffo') return null;
  const orders = await listRecentWaffoPlanChangeOrders(sub.userId);
  const awaiting = pickAwaitingWaffoPlanChange(orders, sub);
  if (!awaiting?.productId) return null;
  return {
    product_id: awaiting.productId,
    plan_name: awaiting.planName || null,
    timing:
      parseWaffoPlanChangeMarker(awaiting.checkoutInfo)?.timing || 'period_end',
    order_no: awaiting.orderNo,
    created_at: iso(awaiting.createdAt),
  };
}

/**
 * Older builds marked Waffo immediate upgrades confirmed without writing
 * pending_*. Re-book from the confirmed open order so billing/pricing show
 * the scheduled change (and block another upgrade attempt).
 */
export async function healConfirmedUnbookedWaffoPlanChange<
  T extends {
    userId: string;
    subscriptionNo: string;
    paymentProvider?: string | null;
    status?: string | null;
    canceledReasonType?: string | null;
    currentPeriodEnd?: Date | string | null;
    pendingProductId?: string | null;
  },
>(sub: T): Promise<T> {
  if (sub.paymentProvider !== 'waffo') return sub;
  // A billing cancel already dropped the change. Older rows were booked
  // again after that cancel; drop the booking the next time billing loads.
  if (sub.canceledReasonType === 'user_request') {
    if (!sub.pendingProductId) return sub;
    const orders = await listRecentWaffoPlanChangeOrders(sub.userId);
    const open = recentWaffoPlanChangeOrders(orders, sub.subscriptionNo).filter(
      (o) => o.status === 'created'
    );
    await Promise.all(
      open.map((o) =>
        updateWaffoPlanChangeMarker(o, { failed: true }, 'canceled')
      )
    );
    await updateBySubscriptionNo(sub.subscriptionNo, CLEARED_PENDING_CHANGE);
    return { ...sub, ...CLEARED_PENDING_CHANGE };
  }
  if (sub.pendingProductId) return sub;
  if (
    sub.status === SubscriptionStatus.CANCELED ||
    sub.status === SubscriptionStatus.EXPIRED
  ) {
    return sub;
  }
  const orders = await listRecentWaffoPlanChangeOrders(sub.userId);
  const confirmed = recentWaffoPlanChangeOrders(
    orders,
    sub.subscriptionNo
  ).find((o) => {
    if (o.status !== 'created') return false;
    const marker = parseWaffoPlanChangeMarker(o.checkoutInfo);
    return !!marker?.confirmedOrderId && !marker.failed;
  });
  if (!confirmed?.productId) return sub;
  const marker = parseWaffoPlanChangeMarker(confirmed.checkoutInfo)!;
  const booking = {
    pendingProductId: confirmed.productId,
    // Immediate: it applies when the new order activates, not at period end.
    pendingEffectiveAt:
      marker.timing === 'period_end' && sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd)
        : null,
    pendingChangeType:
      marker.timing === 'period_end'
        ? PendingChangeType.DOWNGRADE
        : PendingChangeType.UPGRADE,
    providerScheduleId: marker.confirmedOrderId!,
  };
  await updateBySubscriptionNo(sub.subscriptionNo, booking);
  return { ...sub, ...booking };
}

/**
 * Drop a local pending change without calling the provider.
 * Waffo confirmed orders are marked failed, or the next billing load
 * (healConfirmedUnbookedWaffoPlanChange) books them again and resets the
 * upgrade deadline that blocks cancel.
 */
export async function clearLocalPendingChange(sub: {
  userId: string;
  subscriptionNo: string;
  paymentProvider?: string | null;
}) {
  if (sub.paymentProvider === 'waffo') {
    const orders = await listRecentWaffoPlanChangeOrders(sub.userId);
    const open = recentWaffoPlanChangeOrders(orders, sub.subscriptionNo).filter(
      (o) => o.status === 'created'
    );
    await Promise.all(
      open.map((o) =>
        updateWaffoPlanChangeMarker(o, { failed: true }, 'canceled')
      )
    );
  }
  return updateBySubscriptionNo(sub.subscriptionNo, CLEARED_PENDING_CHANGE);
}

/** Persist inferred period end when cancel wrote "now" for both ends. */
async function healStalePendingCancelPeriod<
  T extends {
    subscriptionNo: string;
    status?: string | null;
    canceledEndAt?: Date | string | null;
    currentPeriodStart?: Date | string | null;
    currentPeriodEnd?: Date | string | null;
    interval?: string | null;
    intervalCount?: number | null;
  },
>(sub: T | null | undefined): Promise<T | null | undefined> {
  if (!sub || sub.status !== SubscriptionStatus.PENDING_CANCEL) return sub;
  const end = effectiveCancelEndAt(sub);
  if (!end) return sub;
  const needCancel =
    isStalePeriodEnd({
      end: sub.canceledEndAt,
      start: sub.currentPeriodStart,
    }) && end.getTime() > Date.now();
  const needPeriod = isStalePeriodEnd({
    end: sub.currentPeriodEnd,
    start: sub.currentPeriodStart,
  });
  if (!needCancel && !needPeriod) return sub;
  const patch = {
    ...(needCancel ? { canceledEndAt: end } : {}),
    ...(needPeriod ? { currentPeriodEnd: end } : {}),
  };
  const updated = await updateBySubscriptionNo(sub.subscriptionNo, patch);
  return (updated as T) || { ...sub, ...patch };
}

async function loadHealedSubscription(userId: string) {
  const current = await getCurrentSubscription(userId);
  if (!current) return null;
  const healedPeriod = await healStalePendingCancelPeriod(current);
  return healConfirmedUnbookedWaffoPlanChange(
    await clearStaleProcessingUpgrade(
      await healUnconfirmedWaffoBooking(healedPeriod)
    )
  );
}

/** GET /api/user/subscriptions/current: subscription + awaiting state. */
export async function getCurrentSubscriptionView(userId: string) {
  let sub = await loadHealedSubscription(userId);
  // Booked period-end change past its effective time without its webhook
  // (Waffo plan_changed lost): ask the provider; applied → the new plan's
  // subscription is current now, so load again.
  if (sub && isScheduledChangeOverdue(sub)) {
    const { state } = await syncScheduledPlanChange(sub);
    if (state === 'applied' || state === 'failed') {
      sub = await loadHealedSubscription(userId);
    }
  }
  // Stripe / Dodo still on an ended period (renewal webhook lost): replay
  // the paid renewal from the provider, then load the renewed view.
  if (sub && isRenewalLapsed(sub)) {
    const { state } = await syncLapsedRenewal(sub);
    if (state === 'applied') sub = await loadHealedSubscription(userId);
  }
  if (!sub) return null;
  return {
    ...sub,
    awaiting_confirmation: await getAwaitingConfirmation(sub),
  };
}

export type PlanChangeSyncState =
  /** nothing to check (no awaiting Waffo change / processing upgrade) */
  | 'idle'
  /** processing upgrade: the provider has the new plan, applied now */
  | 'applied'
  /** processing upgrade: asked under a minute ago, try again later */
  | 'throttled'
  /** processing upgrade: this provider has no status lookup */
  | 'unsupported'
  /** Waffo confirmed: booked (pending_*) or switching now */
  | 'confirmed'
  /** asked Waffo, not confirmed yet */
  | 'pending'
  /** Waffo reported the change failed */
  | 'failed'
  /** could not reach Waffo (timeout / error) */
  | 'unavailable';

// Per-isolate throttle: a polling billing page must not hammer Waffo.
const SYNC_MIN_INTERVAL_MS = 1500;
const lastSync = new Map<string, number>();

/**
 * Billing page / return from Waffo: actively ask Waffo whether the awaiting
 * plan change was confirmed and record it (same code path as the webhook,
 * idempotent). A booked upgrade still processing (Waffo / Creem / Dodo /
 * Stripe) is looked
 * up once it is overdue, or right away with `force` (refresh button).
 * Returns the fresh subscription view + what was found.
 */
export async function syncAwaitingPlanChange(
  userId: string,
  { force = false }: { force?: boolean } = {}
) {
  const view = await getCurrentSubscriptionView(userId);
  if (view && isUpgradeInProgress(view)) {
    const { state, detail } = await syncProcessingUpgrade(view, { force });
    const sync: PlanChangeSyncState = state;
    const report = detail ? [{ state, detail }] : [];
    if (sync !== 'applied' && sync !== 'failed') {
      return { view, sync, report };
    }
    return { view: await getCurrentSubscriptionView(userId), sync, report };
  }
  if (
    !view ||
    view.paymentProvider !== 'waffo' ||
    view.pendingProductId ||
    !view.awaiting_confirmation
  ) {
    return { view, sync: 'idle' as PlanChangeSyncState, report: [] };
  }

  const now = Date.now();
  if (now - (lastSync.get(userId) || 0) < SYNC_MIN_INTERVAL_MS) {
    return { view, sync: 'pending' as PlanChangeSyncState, report: [] };
  }
  lastSync.set(userId, now);
  if (lastSync.size > 5000) lastSync.clear();

  const [pm, orders] = await Promise.all([
    getPaymentManager(),
    listRecentWaffoPlanChangeOrders(userId),
  ]);
  const provider = pm.getProvider('waffo');
  if (provider?.name !== 'waffo' || !provider.getPlanChangeStatus) {
    return { view, sync: 'unavailable' as PlanChangeSyncState, report: [] };
  }
  const candidates = waffoPlanChangeCandidates(orders, view.subscriptionNo);
  const checks = await Promise.all(
    candidates.map(async (o) => {
      try {
        const status = await provider.getPlanChangeStatus!({
          orderNo: o.orderNo,
          originOrderId: view.subscriptionId,
        });
        return { order: o, status, error: null as string | null };
      } catch (error) {
        return {
          order: o,
          status: null,
          error: (error as Error)?.message || String(error),
        };
      }
    })
  );
  const report = checks.map((c) => ({
    orderNo: c.order.orderNo,
    state: c.status?.state ?? null,
    providerOrderId: c.status?.providerOrderId ?? null,
    originStatus: c.status?.originStatus ?? null,
    error: c.error,
    raw: c.status?.debug ?? null,
  }));
  console.log('[payment] waffo plan change sync', {
    userId,
    subscriptionNo: view.subscriptionNo,
    candidates: candidates.length,
    report: JSON.stringify(report),
  });

  let sync: PlanChangeSyncState =
    !candidates.length || checks.every((c) => !c.status)
      ? 'unavailable'
      : 'pending';
  const isConfirmed = (c: (typeof checks)[number]) =>
    c.status?.state === 'scheduled' || c.status?.state === 'applied';
  // Exact match (payment carries our order number) first; otherwise the
  // origin is parked in `canceling`, which only says "a change was
  // confirmed": take the newest open attempt (one change at a time).
  const confirmed =
    checks.find((c) => isConfirmed(c) && c.status?.providerOrderId) ??
    (checks.some(isConfirmed)
      ? (checks.find((c) => c.order.status === 'created') ?? checks[0])
      : undefined);
  if (confirmed) {
    await applyWaffoPlanChangeOutcome({
      state: 'scheduled',
      providerOrderId:
        confirmed.status?.providerOrderId ||
        `${WAFFO_CONFIRMED_PREFIX}${confirmed.order.orderNo}`,
      orderNo: confirmed.order.orderNo,
      effectiveAt: confirmed.status?.effectiveAt || null,
    });
    sync = 'confirmed';
  } else {
    for (const c of checks) {
      if (c.status?.state === 'failed' && c.status.providerOrderId) {
        await applyWaffoPlanChangeOutcome({
          state: 'failed',
          providerOrderId: c.status.providerOrderId,
          orderNo: c.order.orderNo,
        });
        if (c.order.id === candidates[0]?.id) sync = 'failed';
      }
    }
  }
  if (sync === 'pending' || sync === 'unavailable') {
    return { view, sync, report };
  }
  return { view: await getCurrentSubscriptionView(userId), sync, report };
}

/** "Discard": drop the unconfirmed Waffo change (no provider call). */
export async function discardAwaitingPlanChange(params: { userId: string }) {
  // Both reads only need the user id: run them together.
  const orders = listRecentWaffoPlanChangeOrders(params.userId);
  orders.catch(() => {}); // awaited below; avoid an unhandled rejection
  const sub = await getCurrentSubscription(params.userId);
  if (!sub) throw new PlanChangeError('not_found', 'Subscription not found');
  if (sub.userId !== params.userId) {
    throw new PlanChangeError('forbidden', 'Forbidden');
  }
  if (sub.paymentProvider !== 'waffo') return { discarded: false };
  await supersedeAwaitingWaffoPlanChanges(sub, orders);
  return { discarded: true };
}

/**
 * Waffo: open the hosted confirmation page. A local order (status created)
 * carries our order number into the new Waffo order, so its activation
 * webhook creates the new subscription like a normal checkout.
 * Nothing is booked here: pending_* is written only when Waffo reports the
 * confirmation (recordConfirmedWaffoPlanChange). Opening again replaces the
 * previous unconfirmed attempt.
 */
async function openConfirmPlanChange(params: {
  sub: NonNullable<Awaited<ReturnType<typeof getCurrentSubscription>>>;
  /** Already resolved by the caller (no second manager/config load). */
  provider: PaymentProvider;
  productId: string;
  providerProductId: string;
  timing: 'immediate' | 'period_end';
  intent?: PlanChangeIntent;
  locale?: string | null;
  userEmail?: string | null;
  configs: Record<string, string>;
}): Promise<PlanChangeOutcome> {
  const { sub, timing, configs, provider } = params;
  const product = getPricingProduct(params.productId)!;
  if (!provider.changeSubscriptionPlan) {
    throw new PlanChangeError('unsupported', PLAN_CHANGE_ERRORS.unsupported);
  }
  // Load earlier attempts while Waffo creates the session (independent);
  // they are only superseded once the new link exists.
  const previousOrders = listRecentWaffoPlanChangeOrders(sub.userId);
  previousOrders.catch(() => {}); // awaited below; avoid unhandled rejection
  const orderNo = getUniSeq('ORD');
  const appUrl = configs.app_url || 'http://localhost:3000';
  // Keep the user's language on the way back from Waffo (same as checkout).
  const returnLocale =
    params.locale && locales.includes(params.locale as any)
      ? params.locale
      : baseLocale;
  const successUrl = localizeUrl(`${appUrl}/settings/billing?plan_change=1`, {
    locale: returnLocale as typeof baseLocale,
  }).href;
  const result = await provider
    .changeSubscriptionPlan({
      subscriptionId: sub.subscriptionId,
      productId: params.providerProductId,
      timing,
      orderNo,
      customer: { id: sub.userId, email: params.userEmail || undefined },
      currency: sub.currency || product.currency,
      locale: params.locale || undefined,
      // Cashier redirects here after confirm. Checkout already sends
      // http://localhost; dropping a non-https URL leaves the success page
      // with nowhere to return.
      successUrl,
      metadata: { userId: sub.userId, order_no: orderNo },
    })
    .catch(async (error: unknown) => {
      if (!WAFFO_NOT_ACTIVE_PATTERN.test(String((error as Error)?.message))) {
        throw error;
      }
      // Origin is canceling/ended on Waffo (confirmed change or cancel we
      // never heard about). Record a confirmed change if Waffo has one.
      console.error('[payment] waffo origin not active for plan change', {
        subscriptionNo: sub.subscriptionNo,
        message: (error as Error)?.message,
      });
      const booked = await reconcileAwaitingWaffoChange(sub.userId, sub);
      if (booked?.pendingProductId) {
        throw new PlanChangeError(
          'plan_change_pending',
          pendingErrorFor(booked),
          {
            pending_product_id: booked.pendingProductId,
            effective_at: iso(
              (booked as { pendingEffectiveAt?: Date | string | null })
                .pendingEffectiveAt
            ),
          }
        );
      }
      throw new PlanChangeError(
        'subscription_not_active',
        PLAN_CHANGE_ERRORS.notActive
      );
    });
  if (!result.confirmUrl) throw new Error('Plan change link not returned');

  const marker: WaffoPlanChangeMarker = {
    fromSubscriptionNo: sub.subscriptionNo,
    timing,
  };
  // Never persist the customer token (#token=…) that rides on confirmUrl.
  const storedUrl = stripUrlFragment(result.confirmUrl);
  const insertOrder = db()
    .insert(order)
    .values({
      id: getUuid(),
      orderNo,
      userId: sub.userId,
      userEmail: sub.userEmail || params.userEmail || '',
      status: 'created',
      amount: product.priceInCents,
      currency: sub.currency || product.currency,
      productId: product.productId,
      productName: product.productName,
      planName: product.planName,
      creditsAmount: product.credits,
      creditsValidDays: product.creditsValidDays ?? null,
      paymentType: PaymentType.SUBSCRIPTION,
      paymentProvider: sub.paymentProvider,
      paymentSessionId: result.sessionId || orderNo,
      checkoutInfo: JSON.stringify({
        sessionId: result.sessionId,
        checkoutUrl: storedUrl,
        planChange: marker,
      }),
      checkoutResult: JSON.stringify(withoutCustomerToken(result.raw)),
      checkoutUrl: storedUrl,
      description: `Plan change: ${sub.productId || ''} → ${product.productId}`,
    });
  // Superseding old rows and inserting the new one touch different rows.
  await Promise.all([
    supersedeAwaitingWaffoPlanChanges(sub, previousOrders),
    insertOrder,
  ]);

  return {
    mode: 'confirm',
    confirm_url: result.confirmUrl,
    timing,
    // Explicit next_period: Waffo also accepts it for a price increase
    // (e.g. Pro monthly → Lite yearly), so nothing is charged now.
    effective_at: timing === 'period_end' ? iso(sub.currentPeriodEnd) : null,
    intent: params.intent,
  };
}

export { withoutCustomerToken } from './checkout-storage';

/** Undo a booked downgrade (Stripe release schedule / Dodo cancel scheduled change). */
export async function cancelUserPlanChange(params: {
  userId: string;
  subscriptionNo?: string | null;
}) {
  // Load provider config while the row is read (independent); awaited only
  // after the checks below so their errors keep priority.
  const pmPromise = getPaymentManager();
  pmPromise.catch(() => {});
  const sub = params.subscriptionNo
    ? await findBySubscriptionNo(params.subscriptionNo)
    : await getCurrentSubscription(params.userId);
  if (!sub) {
    throw new PlanChangeError('not_found', 'Subscription not found');
  }
  if (sub.userId !== params.userId) {
    throw new PlanChangeError('forbidden', 'Forbidden');
  }
  if (!sub.pendingProductId) {
    throw new PlanChangeError(
      'nothing_pending',
      PLAN_CHANGE_ERRORS.nothingPending
    );
  }
  if (sub.pendingChangeType !== PendingChangeType.DOWNGRADE) {
    throw new PlanChangeError('not_undoable', PLAN_CHANGE_ERRORS.notUndoable);
  }
  // Waffo: a booking exists only after the customer confirmed on Waffo's
  // page, and Waffo cannot take it back.
  if (sub.paymentProvider === 'waffo') {
    throw new PlanChangeError('not_undoable', PLAN_CHANGE_ERRORS.notUndoable);
  }
  const support = planChangeSupport(sub.paymentProvider);
  if (!support.undo) {
    throw new PlanChangeError('not_undoable', PLAN_CHANGE_ERRORS.notUndoable);
  }
  const pm = await pmPromise;
  const provider = pm.getProvider(sub.paymentProvider);
  if (
    !provider ||
    provider.name !== sub.paymentProvider ||
    !provider.cancelScheduledPlanChange
  ) {
    throw new PlanChangeError('not_undoable', PLAN_CHANGE_ERRORS.notUndoable);
  }
  await provider.cancelScheduledPlanChange({
    subscriptionId: sub.subscriptionId,
    scheduleId: sub.providerScheduleId,
  });
  return updateBySubscriptionNo(sub.subscriptionNo, CLEARED_PENDING_CHANGE);
}

/**
 * After a Creem "cancel then resubscribe" downgrade has ended (and the user
 * has no subscription), suggest the plan they picked.
 */
export async function getResubscribeSuggestion(userId: string) {
  const current = await getCurrentSubscription(userId);
  if (current) return null;
  const [last] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        eq(subscription.pendingChangeType, PendingChangeType.RESUBSCRIBE),
        inArray(subscription.status, [
          SubscriptionStatus.CANCELED,
          SubscriptionStatus.EXPIRED,
          SubscriptionStatus.PENDING_CANCEL,
        ]),
        isNull(subscription.deletedAt)
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(1);
  if (!last?.pendingProductId) return null;
  const endedAt = last.canceledEndAt || last.currentPeriodEnd || null;
  // Stale after 60 days.
  if (
    endedAt &&
    Date.now() - new Date(endedAt).getTime() > 60 * 24 * 60 * 60 * 1000
  ) {
    return null;
  }
  return {
    product_id: last.pendingProductId,
    previous_product_id: last.productId,
    ended_at: iso(endedAt),
  };
}
