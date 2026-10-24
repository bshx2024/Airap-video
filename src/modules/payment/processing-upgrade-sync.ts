/**
 * Reconcile an upgrade that is still "processing" (booked, not applied)
 * when its webhook is late or lost: ask the provider and apply the answer
 * through the same code paths the webhooks use (all idempotent).
 *
 * - Waffo: getPlanChangeStatus (GraphQL payments / subscriptionOrder).
 *   applied → fulfill the plan-change order like `subscription.plan_changed`
 *   (handlePaymentCallback → handleCheckoutSuccess); failed → drop the
 *   booking like `subscription.plan_change_failed`.
 * - Creem: GET /v1/subscriptions → handleSubscriptionUpdated, like the
 *   `subscription.update` webhook (applies the new product when it shows).
 * - Dodo: GET /subscriptions/{id} → handleSubscriptionUpdated, like
 *   `subscription.plan_changed` (prorated charge paid → product switched).
 * - Stripe: GET /v1/subscriptions/{id} → handleSubscriptionUpdated, like
 *   `customer.subscription.updated`. The new price shows once the prorated
 *   invoice is paid; while unpaid Stripe holds it in `pending_update`. No
 *   pending_update and still the old price = Stripe dropped the update
 *   (invoice voided / expired): the booking is cleared as failed.
 *
 * Still unknown: nothing changes; past PROCESSING_UPGRADE_TTL_MS the booking
 * is stale and stops blocking cancel (isStaleProcessingUpgrade).
 *
 * syncScheduledPlanChange does the same for a booked period-end downgrade
 * (Waffo) whose effective time has passed without `subscription.plan_changed`:
 * applied → the plan-change order is fulfilled exactly like that webhook
 * (claim-first, so a later webhook or a concurrent page load grants nothing
 * more); scheduled / none → nothing changes and the notice stays.
 */
import {
  findBySubscriptionNo,
  updateBySubscriptionNo,
} from '@/modules/subscriptions/service';

import {
  CLEARED_PENDING_CHANGE,
  isRenewalLapsed,
  isScheduledChangeOverdue,
  isUpgradeInProgress,
  PendingChangeType,
  PROCESSING_UPGRADE_QUERY_PROVIDERS,
  SCHEDULED_CHANGE_QUERY_PROVIDERS,
  shouldQueryProcessingUpgrade,
} from './plan-change';
import {
  getPaymentManager,
  handlePaymentCallback,
  handleSubscriptionCanceled,
  handleSubscriptionRenewal,
  handleSubscriptionUpdated,
} from './service';
import {
  findSubscriptionOriginOrderNo,
  findWaffoPlanChangeOrderForBooking,
} from './waffo-plan-change';
import { applyWaffoPlanChangeOutcome } from './waffo-plan-change-outcome';

export type ProcessingUpgradeSyncState =
  /** nothing to ask (no processing upgrade, or not overdue yet) */
  | 'idle'
  /** the provider has the new plan: applied locally */
  | 'applied'
  /** the provider reports the upgrade did not go through: booking dropped */
  | 'failed'
  /** asked, no final answer yet */
  | 'pending'
  /** asked this subscription less than a minute ago */
  | 'throttled'
  /** this provider has no status lookup */
  | 'unsupported'
  /** provider not configured / unreachable / booking not traceable */
  | 'unavailable';

export type ProcessingUpgradeSub = {
  userId: string;
  subscriptionNo: string;
  subscriptionId?: string | null;
  paymentProvider?: string | null;
  productId?: string | null;
  status?: string | null;
  pendingProductId?: string | null;
  pendingEffectiveAt?: Date | string | null;
  pendingChangeType?: string | null;
  providerScheduleId?: string | null;
  currentPeriodEnd?: Date | string | null;
  updatedAt?: Date | string | null;
};

/** At most one provider lookup per subscription per minute (per isolate). */
export const PROCESSING_UPGRADE_SYNC_INTERVAL_MS = 60_000;
const lastSync = new Map<string, number>();

/** Test hook: forget the per-subscription throttle. */
export function resetProcessingUpgradeThrottle() {
  lastSync.clear();
}

export async function syncProcessingUpgrade(
  sub: ProcessingUpgradeSub,
  { force = false, now = Date.now() }: { force?: boolean; now?: number } = {}
): Promise<{ state: ProcessingUpgradeSyncState; detail?: string }> {
  if (!PROCESSING_UPGRADE_QUERY_PROVIDERS.includes(sub.paymentProvider || '')) {
    return { state: isUpgradeInProgress(sub, now) ? 'unsupported' : 'idle' };
  }
  if (!shouldQueryProcessingUpgrade(sub, { force, now })) {
    return { state: 'idle' };
  }
  if (throttled(sub.subscriptionNo, now)) return { state: 'throttled' };

  try {
    const result =
      sub.paymentProvider === 'waffo'
        ? await syncWaffo(sub)
        : await syncBySubscription(sub);
    console.log('[payment] processing upgrade sync', {
      subscriptionNo: sub.subscriptionNo,
      provider: sub.paymentProvider,
      ...result,
    });
    return result;
  } catch (error) {
    console.error('[payment] processing upgrade sync failed', {
      subscriptionNo: sub.subscriptionNo,
      provider: sub.paymentProvider,
      error: (error as Error)?.message || String(error),
    });
    return { state: 'unavailable' };
  }
}

/** Per-subscription throttle shared by both lookups; true = asked too recently. */
function throttled(subscriptionNo: string, now: number): boolean {
  const last = lastSync.get(subscriptionNo) || 0;
  if (now - last < PROCESSING_UPGRADE_SYNC_INTERVAL_MS) return true;
  lastSync.set(subscriptionNo, now);
  if (lastSync.size > 5000) lastSync.clear();
  return false;
}

/**
 * Booked period-end change past its effective time, still pending locally:
 * ask the provider and apply the answer like its webhook. Billing load asks
 * at most once a minute per subscription; `force` (a renewal webhook of the
 * old subscription) skips the throttle and the effective-time gate.
 */
export async function syncScheduledPlanChange(
  sub: ProcessingUpgradeSub,
  { force = false, now = Date.now() }: { force?: boolean; now?: number } = {}
): Promise<{ state: ProcessingUpgradeSyncState; detail?: string }> {
  if (!SCHEDULED_CHANGE_QUERY_PROVIDERS.includes(sub.paymentProvider || '')) {
    return { state: 'idle' };
  }
  if (
    !sub.pendingProductId ||
    sub.pendingChangeType !== PendingChangeType.DOWNGRADE
  ) {
    return { state: 'idle' };
  }
  if (!force && !isScheduledChangeOverdue(sub, now)) return { state: 'idle' };
  if (!force && throttled(sub.subscriptionNo, now)) {
    return { state: 'throttled' };
  }
  try {
    const result = await syncWaffo(sub);
    console.log('[payment] scheduled plan change sync', {
      subscriptionNo: sub.subscriptionNo,
      provider: sub.paymentProvider,
      ...result,
    });
    return result;
  } catch (error) {
    console.error('[payment] scheduled plan change sync failed', {
      subscriptionNo: sub.subscriptionNo,
      provider: sub.paymentProvider,
      error: (error as Error)?.message || String(error),
    });
    return { state: 'unavailable' };
  }
}

/**
 * Live subscription still on a period that ended (plus a grace): its
 * renewal or its cancel webhook is late or lost. Ask the provider:
 * - paid renewal → handleSubscriptionRenewal with the webhook's own dedupe
 *   key (Stripe invoice id, Dodo subscription + period start), so a late
 *   webhook or a concurrent load records nothing more; a booked downgrade
 *   applies on that renewal like it does for the webhook;
 * - not renewed and ended / unpaid at the provider → applied like the
 *   cancel / update webhook (syncProviderEnd); never grants credits.
 * Billing load asks at most once a minute per subscription; `force` (daily
 * reconcile) skips the throttle.
 */
export async function syncLapsedRenewal(
  sub: ProcessingUpgradeSub,
  {
    force = false,
    now = Date.now(),
    graceMs,
  }: { force?: boolean; now?: number; graceMs?: number } = {}
): Promise<{ state: ProcessingUpgradeSyncState; detail?: string }> {
  if (!isRenewalLapsed(sub, now, graceMs)) return { state: 'idle' };
  if (!force && throttled(sub.subscriptionNo, now)) {
    return { state: 'throttled' };
  }
  const name = sub.paymentProvider || '';
  try {
    const pm = await getPaymentManager();
    const provider = pm.getProvider(name);
    if (
      provider?.name !== name ||
      (!provider.getRenewalSession && !provider.getSubscription)
    ) {
      return { state: 'unavailable', detail: 'provider_unavailable' };
    }
    const periodEnd = new Date(sub.currentPeriodEnd as Date | string);
    const orderRef =
      name === 'waffo'
        ? (await findSubscriptionOriginOrderNo(sub.subscriptionNo)) || undefined
        : undefined;
    const session = provider.getRenewalSession
      ? await provider.getRenewalSession({
          subscriptionId: sub.subscriptionId as string,
          after: periodEnd,
          orderRef,
        })
      : null;
    let result: { state: ProcessingUpgradeSyncState; detail?: string };
    if (session) {
      await handleSubscriptionRenewal(session, name);
      const fresh = await findBySubscriptionNo(sub.subscriptionNo);
      const freshEnd = fresh?.currentPeriodEnd
        ? new Date(fresh.currentPeriodEnd).getTime()
        : 0;
      result =
        freshEnd > periodEnd.getTime()
          ? { state: 'applied' }
          : { state: 'pending', detail: 'not_applied' };
    } else {
      result = (provider.getSubscription &&
        (await syncProviderEnd(sub, provider, name, now))) || {
        state: 'pending',
        detail: 'not_renewed',
      };
    }
    console.log('[payment] lapsed renewal sync', {
      subscriptionNo: sub.subscriptionNo,
      provider: name,
      ...result,
    });
    return result;
  } catch (error) {
    console.error('[payment] lapsed renewal sync failed', {
      subscriptionNo: sub.subscriptionNo,
      provider: name,
      error: (error as Error)?.message || String(error),
    });
    return { state: 'unavailable' };
  }
}

/** Provider statuses that end a subscription (cancel / expire webhook). */
const ENDED_STATUSES = ['canceled', 'expired'];
/** No service until paid (Stripe unpaid, Dodo on_hold, Creem past_due). */
const UNPAID_STATUS = 'paused';

/**
 * Not renewed: did the provider end it (its cancel / expire webhook lost)?
 * Ended → handleSubscriptionCanceled, like that webhook; unpaid → the
 * status-only part of handleSubscriptionUpdated (no plan, so no plan switch
 * and no credits). Still live at the provider → null (keep waiting).
 */
async function syncProviderEnd(
  sub: ProcessingUpgradeSub,
  provider: {
    getSubscription?: (p: { subscriptionId: string }) => Promise<any>;
  },
  name: string,
  now: number
): Promise<{ state: ProcessingUpgradeSyncState; detail?: string } | null> {
  // Waffo ends the old order when a booked change takes over (new order):
  // that is the plan change (syncScheduledPlanChange), not a cancel.
  if (name === 'waffo' && sub.pendingProductId) return null;
  const current = await provider.getSubscription!({
    subscriptionId: sub.subscriptionId as string,
  });
  const info = current?.subscriptionInfo;
  const status = String(info?.status || '');
  if (ENDED_STATUSES.includes(status)) {
    const endedAt = info.canceledEndAt || info.canceledAt || new Date(now);
    await handleSubscriptionCanceled(
      {
        ...current,
        subscriptionId: current.subscriptionId || sub.subscriptionId,
        subscriptionInfo: {
          ...info,
          canceledAt: info.canceledAt || endedAt,
          canceledEndAt: endedAt,
        },
      },
      name
    );
  } else if (status === UNPAID_STATUS) {
    const { productId: _productId, planId: _planId, ...rest } = info;
    await handleSubscriptionUpdated(
      {
        ...current,
        subscriptionId: current.subscriptionId || sub.subscriptionId,
        subscriptionInfo: rest,
      },
      name
    );
  } else {
    return null;
  }
  const fresh = await findBySubscriptionNo(sub.subscriptionNo);
  return fresh && fresh.status !== sub.status
    ? {
        state: 'applied',
        detail: status === UNPAID_STATUS ? 'unpaid' : 'ended',
      }
    : { state: 'pending', detail: 'not_applied' };
}

async function syncWaffo(
  sub: ProcessingUpgradeSub
): Promise<{ state: ProcessingUpgradeSyncState; detail?: string }> {
  const local = await findWaffoPlanChangeOrderForBooking(sub);
  if (!local) return { state: 'unavailable', detail: 'order_not_found' };
  const pm = await getPaymentManager();
  const provider = pm.getProvider('waffo');
  if (provider?.name !== 'waffo' || !provider.getPlanChangeStatus) {
    return { state: 'unavailable', detail: 'provider_unavailable' };
  }
  const status = await provider.getPlanChangeStatus({
    orderNo: local.orderNo,
    originOrderId: sub.subscriptionId,
  });

  if (status.state === 'applied') {
    // Same as plan_changed: fulfill the plan-change order (creates the new
    // subscription, replaces this one and clears its booking).
    await handlePaymentCallback(local.orderNo, { attempts: 1 });
    const fresh = await findBySubscriptionNo(sub.subscriptionNo);
    return fresh?.pendingProductId
      ? { state: 'pending', detail: 'payment_not_settled' }
      : { state: 'applied' };
  }
  if (status.state === 'failed' && status.providerOrderId) {
    await applyWaffoPlanChangeOutcome({
      state: 'failed',
      providerOrderId: status.providerOrderId,
      orderNo: local.orderNo,
    });
    const fresh = await findBySubscriptionNo(sub.subscriptionNo);
    if (
      fresh?.pendingProductId &&
      fresh.providerScheduleId === sub.providerScheduleId
    ) {
      // Same booking, recorded under the other id form: drop it too.
      await updateBySubscriptionNo(sub.subscriptionNo, CLEARED_PENDING_CHANGE);
    }
    return { state: 'failed' };
  }
  return { state: 'pending', detail: status.state };
}

/**
 * Creem / Dodo / Stripe: read the subscription and apply it like its update
 * webhook.
 */
async function syncBySubscription(
  sub: ProcessingUpgradeSub
): Promise<{ state: ProcessingUpgradeSyncState; detail?: string }> {
  if (!sub.subscriptionId) {
    return { state: 'unavailable', detail: 'no_subscription_id' };
  }
  const name = sub.paymentProvider || '';
  const pm = await getPaymentManager();
  const provider = pm.getProvider(name);
  // getProvider falls back to the default provider for unknown names.
  if (provider?.name !== name || !provider.getSubscription) {
    return { state: 'unavailable', detail: 'provider_unavailable' };
  }
  const session = await provider.getSubscription({
    subscriptionId: sub.subscriptionId,
  });
  // Same as the subscription update webhook: applies the new product when
  // the provider reports it, drops a booking past its deadline.
  await handleSubscriptionUpdated(session, name);
  const fresh = await findBySubscriptionNo(sub.subscriptionNo);
  if (fresh?.productId === sub.pendingProductId) return { state: 'applied' };
  if (!fresh?.pendingProductId) return { state: 'failed' };
  if (
    name === 'stripe' &&
    session.subscriptionResult &&
    !session.subscriptionResult.pending_update &&
    fresh.pendingProductId === sub.pendingProductId &&
    fresh.providerScheduleId === sub.providerScheduleId
  ) {
    // Stripe applies a paid update right away and keeps an unpaid one in
    // pending_update; neither is there, so this upgrade will not land.
    await updateBySubscriptionNo(sub.subscriptionNo, CLEARED_PENDING_CHANGE);
    return { state: 'failed', detail: 'no_pending_update' };
  }
  return { state: 'pending' };
}
