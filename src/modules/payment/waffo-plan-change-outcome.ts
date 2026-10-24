/**
 * Apply the outcome of a Waffo hosted plan change to our records. Shared by
 * the webhook (subscription.plan_change_scheduled / _failed) and the active
 * reconciliation (billing page asks Waffo), so both are idempotent and give
 * the same result whichever arrives first.
 */
import {
  findBySubscriptionNo,
  SubscriptionStatus,
  updateBySubscriptionNo,
} from '@/modules/subscriptions/service';

import {
  CLEARED_PENDING_CHANGE,
  parseWaffoPlanChangeMarker,
  PendingChangeType,
  recentWaffoPlanChangeOrders,
  WAFFO_CONFIRMED_PREFIX,
  type PlanChangeOrderLike,
} from './plan-change';
import {
  findOrderByOrderNo,
  listRecentWaffoPlanChangeOrders,
  markWaffoPlanChangeOrdersSuperseded,
  updateWaffoPlanChangeMarker,
} from './waffo-plan-change';

export type WaffoPlanChangeOutcome = {
  state: 'scheduled' | 'failed';
  /** Waffo order id of the new subscription (ORD_xxx). */
  providerOrderId: string;
  /** Our order number (orderMerchantExternalId), when Waffo sent it. */
  orderNo?: string | null;
  /** Our user id (buyer identity) — fallback when orderNo is missing. */
  userId?: string | null;
  effectiveAt?: Date | null;
};

export type OutcomeResult =
  | 'booked'
  | 'already_booked'
  | 'failed_recorded'
  | 'not_found'
  | 'ignored';

async function findPlanChangeOrder(
  outcome: WaffoPlanChangeOutcome
): Promise<(PlanChangeOrderLike & { userId: string }) | null> {
  if (outcome.orderNo) {
    const row = await findOrderByOrderNo(outcome.orderNo);
    if (row && parseWaffoPlanChangeMarker(row.checkoutInfo)) return row;
    if (row) return null; // a normal order, not a plan change
  }
  if (!outcome.userId) return null;
  // No order number on the event: the customer's newest open attempt.
  const orders = await listRecentWaffoPlanChangeOrders(outcome.userId);
  const match = orders.find(
    (o) =>
      parseWaffoPlanChangeMarker(o.checkoutInfo) &&
      (o.status === 'created' ||
        parseWaffoPlanChangeMarker(o.checkoutInfo)?.confirmedOrderId ===
          outcome.providerOrderId)
  );
  return match ? { ...match, userId: outcome.userId } : null;
}

export async function applyWaffoPlanChangeOutcome(
  outcome: WaffoPlanChangeOutcome
): Promise<OutcomeResult> {
  const local = await findPlanChangeOrder(outcome);
  const marker = local ? parseWaffoPlanChangeMarker(local.checkoutInfo) : null;
  if (!local || !marker) return 'not_found';

  const sub = await findBySubscriptionNo(marker.fromSubscriptionNo);
  if (!sub || sub.userId !== local.userId || sub.paymentProvider !== 'waffo') {
    return 'not_found';
  }

  if (outcome.state === 'failed') {
    await updateWaffoPlanChangeMarker(local, { failed: true }, 'canceled');
    // Drop a booking that came from this change (current plan stays).
    if (
      sub.providerScheduleId === outcome.providerOrderId ||
      sub.providerScheduleId === `${WAFFO_CONFIRMED_PREFIX}${local.orderNo}`
    ) {
      await updateBySubscriptionNo(sub.subscriptionNo, CLEARED_PENDING_CHANGE);
    }
    return 'failed_recorded';
  }

  // Ended or cancelled by the user meanwhile: nothing to schedule.
  if (
    sub.status === SubscriptionStatus.CANCELED ||
    sub.status === SubscriptionStatus.EXPIRED ||
    (sub.status === SubscriptionStatus.PENDING_CANCEL &&
      sub.canceledReasonType === 'user_request')
  ) {
    return 'ignored';
  }

  // The customer may confirm a link we had already superseded (newer
  // attempt / "abandon"). Waffo's confirmation wins: reopen the order, or
  // the later plan_changed would find it canceled and never switch plans.
  const revive = local.status === 'canceled' && !!marker.superseded;
  if (!marker.confirmedOrderId || revive) {
    await updateWaffoPlanChangeMarker(
      local,
      {
        confirmedOrderId: marker.confirmedOrderId || outcome.providerOrderId,
        confirmedAt: marker.confirmedAt || new Date().toISOString(),
        ...(revive ? { superseded: false } : {}),
      },
      revive ? 'created' : undefined
    );
  }

  // Book pending_* for both timings so billing shows the scheduled change
  // and pricing blocks another attempt. Immediate upgrades still switch when
  // the new order activates (plan_changed → checkout fulfillment); period-end
  // switches at renewal. pending is cleared on fulfill/replace/failure.
  if (
    sub.pendingProductId === local.productId &&
    sub.providerScheduleId === outcome.providerOrderId
  ) {
    if (outcome.effectiveAt) {
      await updateBySubscriptionNo(sub.subscriptionNo, {
        pendingEffectiveAt: outcome.effectiveAt,
      });
    }
    return 'already_booked';
  }

  await updateBySubscriptionNo(sub.subscriptionNo, {
    pendingProductId: local.productId || null,
    // Immediate: it applies when the new order activates, not at period end.
    pendingEffectiveAt:
      outcome.effectiveAt ||
      (marker.timing === 'period_end' ? sub.currentPeriodEnd : null) ||
      null,
    pendingChangeType:
      marker.timing === 'period_end'
        ? PendingChangeType.DOWNGRADE
        : PendingChangeType.UPGRADE,
    providerScheduleId: outcome.providerOrderId,
  });

  // Other open attempts for this subscription are moot now.
  const orders = await listRecentWaffoPlanChangeOrders(local.userId);
  await markWaffoPlanChangeOrdersSuperseded(
    recentWaffoPlanChangeOrders(orders, sub.subscriptionNo).filter(
      (o) => o.status === 'created' && o.id !== local.id
    )
  );
  return 'booked';
}
